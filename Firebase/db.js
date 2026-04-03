/* Firebase/db.js
   Repositorios Firestore + fallback local.
*/
(function dbModule(global) {
  const gh = global.GHFirebase;
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
    supplierPayments: 'gh_pagos_prov'
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
    supplierPayments: 'supplier_payments'
  };

  function readLocal(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(KEYS[key]) || JSON.stringify(fallback));
    } catch (_) {
      return fallback;
    }
  }

  function writeLocal(key, value) {
    localStorage.setItem(KEYS[key], JSON.stringify(value));
  }

  async function readCloud(key) {
    if (!gh?.ready || !gh.db) return null;
    const snap = await gh.db.collection('app_state').doc(DOCS[key]).get();
    if (!snap.exists) return null;
    return snap.data()?.payload ?? null;
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

  global.GHDB = {
    KEYS,
    readLocal,
    writeLocal,
    readCloud,
    writeCloud,
    seedIfEmpty
  };
})(window);