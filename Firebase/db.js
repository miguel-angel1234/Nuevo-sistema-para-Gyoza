/* Firebase/db.js
   Repositorios Firestore + fallback local.
*/
(function dbModule(global) {
  const gh = global.GHFirebase;
  const META_KEY = 'gh_state_meta';
  const APP_VERSION = 'v3'; // Cambia esto cada vez que hagas cambios que requieran limpiar cache

  // Si la versión guardada no coincide, limpia todo el localStorage
  try {
    const savedVersion = localStorage.getItem('gh_app_version');
    if (savedVersion !== APP_VERSION) {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('gh_')) keysToRemove.push(k);
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      localStorage.setItem('gh_app_version', APP_VERSION);
      console.log('[Gyoza] Cache limpiado por nueva versión:', APP_VERSION);
    }
  } catch (_) {}
  const KEYS = {
    products: 'gh_prods',
    sales: 'gh_ventas',
    supplies: 'gh_insumos',
    recipes: 'gh_recetas',
    inventoryMovements: 'gh_consumo',
    cashCurrent: 'gh_caja_actual',
    cashHistory: 'gh_caja_hist',
    expenses: 'gh_egresos',
    suppliers: 'gh_proveedores',
    supplierPurchases: 'gh_compras_prov',
    supplierPayments: 'gh_pagos_prov',
    tables: 'gh_tables'
  };

  const DOCS = {
    products: 'products',
    sales: 'sales',
    supplies: 'supplies',
    recipes: 'recipes',
    inventoryMovements: 'inventory_movements',
    cashCurrent: 'cash_current',
    cashHistory: 'cash_history',
    expenses: 'expenses',
    suppliers: 'suppliers',
    supplierPurchases: 'supplier_purchases',
    supplierPayments: 'supplier_payments',
    tables: 'tables'
  };

  // Almacenamiento en memoria como fallback cuando localStorage no está disponible
  // (modo privado de Edge/Firefox bloquea localStorage)
  const _memStore = {};
  const _memMeta = {};

  function _localStorageDisponible() {
    try {
      localStorage.setItem('__gh_test__', '1');
      localStorage.removeItem('__gh_test__');
      return true;
    } catch (_) {
      return false;
    }
  }
  const _useLS = _localStorageDisponible();

  function readLocal(key, fallback) {
    try {
      if (_useLS) {
        return JSON.parse(localStorage.getItem(KEYS[key]) || JSON.stringify(fallback));
      }
      return _memStore[key] !== undefined ? _memStore[key] : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function readLocalMeta() {
    try {
      if (_useLS) {
        return JSON.parse(localStorage.getItem(META_KEY) || '{}');
      }
      return _memMeta;
    } catch (_) {
      return {};
    }
  }

  function readLocalUpdatedAt(key) {
    const meta = readLocalMeta();
    return Number(meta[key]) || 0;
  }

  function writeLocal(key, value, updatedAt = Date.now()) {
    if (_useLS) {
      try {
        localStorage.setItem(KEYS[key], JSON.stringify(value));
        const meta = readLocalMeta();
        meta[key] = Number(updatedAt) || Date.now();
        localStorage.setItem(META_KEY, JSON.stringify(meta));
      } catch (_) {}
    } else {
      _memStore[key] = value;
      _memMeta[key] = Number(updatedAt) || Date.now();
    }
  }

  async function readCloud(key) {
    const record = await readCloudRecord(key);
    return record.exists ? record.payload : null;
  }

  async function readCloudRecord(key) {
    if (!gh?.ready || !gh.db) return { exists: false, payload: null, updatedAt: 0 };
    const snap = await gh.db.collection('app_state').doc(DOCS[key]).get();
    if (!snap.exists) return { exists: false, payload: null, updatedAt: 0 };
    const data = snap.data() || {};
    return {
      exists: true,
      payload: data.payload ?? null,
      updatedAt: typeof data.updatedAt?.toMillis === 'function' ? data.updatedAt.toMillis() : 0
    };
  }

  async function writeCloud(key, value) {
    if (!gh?.ready || !gh.db) return;
    await gh.db.collection('app_state').doc(DOCS[key]).set({
      payload: value,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }

  async function seedIfEmpty(bundle) {
    if (!gh?.ready || !gh.db) return;
    const ref = gh.db.collection('app_state').doc('metadata');
    const snap = await ref.get();
    if (snap.exists) return;

    const batch = gh.db.batch();
    Object.entries(bundle).forEach(([k, v]) => {
      batch.set(gh.db.collection('app_state').doc(DOCS[k]), {
        payload: v,
        seededAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    });
    batch.set(ref, {
      version: 2,
      seededAt: firebase.firestore.FieldValue.serverTimestamp(),
      schema: {
        products: 'productos',
        sales: 'ventas',
        supplies: 'insumos',
        recipes: 'recetas',
        inventoryMovements: 'movimientos inventario',
        cashCurrent: 'caja actual',
        cashHistory: 'historial caja',
        expenses: 'egresos',
        suppliers: 'proveedores',
        supplierPurchases: 'compras a proveedor',
        supplierPayments: 'pagos/abonos/adelantos'
      }
    }, { merge: true });
    await batch.commit();
  }

  // Suscripción en tiempo real a un documento de Firestore.
  // Llama a callback(payload) cada vez que otro usuario guarda cambios.
  // Devuelve una función para cancelar la suscripción.
  function subscribeToKey(key, callback) {
    if (!gh?.ready || !gh.db) return () => {};
    return gh.db.collection('app_state').doc(DOCS[key]).onSnapshot(snap => {
      if (!snap.exists) return;
      const data = snap.data() || {};
      if (data.payload !== undefined) callback(data.payload);
    }, err => {
      console.error('[Gyoza] onSnapshot error en', key, err);
    });
  }

  global.GHDB = {
    KEYS,
    readLocal,
    readLocalUpdatedAt,
    writeLocal,
    readCloud,
    readCloudRecord,
    writeCloud,
    seedIfEmpty,
    subscribeToKey
  };
})(window);
