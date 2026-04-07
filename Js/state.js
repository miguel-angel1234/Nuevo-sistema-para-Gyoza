/* ═══════════════════════════════════════════════
   GYOZA HOUSE — state.js
   Estado global + sincronización Firestore (principal)
   con fallback localStorage de compatibilidad.
   ═══════════════════════════════════════════════ */

// ══ ESTADO EN MEMORIA ══
let prods = [];
let ventas = [];

let contadorCuenta = 1;
let cuentas = [{ id: 'c1', nombre: 'Mesa 1', items: [], pago: null }];
let cuentaActiva = 'c1';
let catActiva = '';

let insumos = [];
let recetas = [];
let consumoLog = [];

let cajaActual = null;
let cajaHistorial = [];
let cajaAbierta = false;

let egresos = [];

let proveedores = [];
let comprasProveedor = [];
let pagosProveedor = [];

// ══ CONSTANTES ══
const EGRESO_CATS = {
  insumos:     { label: 'Insumos',    emoji: '🥢', cls: 'egreso-cat-insumos' },
  personal:    { label: 'Personal',   emoji: '👤', cls: 'egreso-cat-personal' },
  servicios:   { label: 'Servicios',  emoji: '🔧', cls: 'egreso-cat-servicios' },
  domicilio:   { label: 'Domicilio',  emoji: '🛵', cls: 'egreso-cat-domicilio' },
  proveedores: { label: 'Proveedor',  emoji: '🏷️', cls: 'egreso-cat-insumos' },
  otros:       { label: 'Otros',      emoji: '📌', cls: 'egreso-cat-otros' }
};

// ══ CARGA INICIAL (FIRESTORE + FALLBACK) ══
let _saveTimer = null;
let _pendingCloudKeys = new Set();

function resolveBootstrapValue(key, localValue, localUpdatedAt, cloudRecord) {
  // Firestore siempre tiene prioridad si existe.
  // El localStorage solo se usa como fallback offline.
  if (!cloudRecord?.exists) {
    return { value: localValue, updatedAt: localUpdatedAt || 0 };
  }

  const cloudValue = cloudRecord.payload;
  const cloudUpdatedAt = cloudRecord.updatedAt || 0;

  return {
    value: cloudValue !== null ? cloudValue : localValue,
    updatedAt: cloudUpdatedAt || localUpdatedAt || 0
  };
}

function getBundleFromState() {
  return {
    products: prods,
    sales: ventas,
    supplies: insumos,
    recipes: recetas,
    inventoryMovements: consumoLog,
    cashCurrent: cajaActual,
    cashHistory: cajaHistorial,
    expenses: egresos,
    suppliers: proveedores,
    supplierPurchases: comprasProveedor,
    supplierPayments: pagosProveedor,
    tables: cuentas
  };
}

function hydrateBundle(bundle) {
  prods = bundle.products || [];
  ventas = bundle.sales || [];
  insumos = bundle.supplies || [];
  recetas = bundle.recipes || [];
  consumoLog = bundle.inventoryMovements || [];
  cajaActual = bundle.cashCurrent || null;
  cajaHistorial = bundle.cashHistory || [];
  egresos = bundle.expenses || [];
  proveedores = bundle.suppliers || [];
  comprasProveedor = bundle.supplierPurchases || [];
  pagosProveedor = bundle.supplierPayments || [];
  cuentas = bundle.tables || [{ id: 'c1', nombre: 'Mesa 1', items: [], pago: null }];
  if (!cuentas.length) cuentas = [{ id: 'c1', nombre: 'Mesa 1', items: [], pago: null }];
  cuentaActiva = cuentas[0].id;
  cajaAbierta = !!cajaActual;
}

async function bootstrapState() {
  const keys = Object.keys(getBundleFromState());
  const fromLocal = {};
  const fromLocalMeta = {};

  keys.forEach(k => {
    fromLocal[k] = GHDB.readLocal(k, k === 'cashCurrent' ? null : []);
    fromLocalMeta[k] = GHDB.readLocalUpdatedAt(k);
  });

  if (!window.GHFirebase?.ready) {
    hydrateBundle(fromLocal);
    return;
  }

  try {
    const cloudReads = await Promise.all(keys.map(k => GHDB.readCloudRecord(k)));
    const hasCloudData = cloudReads.some(v => v?.exists);

    if (!hasCloudData) {
      await GHDB.seedIfEmpty(fromLocal);
      hydrateBundle(fromLocal);
      return;
    }

    const hydrated = {};
    const hydratedMeta = {};
    keys.forEach((k, idx) => {
      const resolved = resolveBootstrapValue(k, fromLocal[k], fromLocalMeta[k], cloudReads[idx]);
      hydrated[k] = resolved.value;
      hydratedMeta[k] = resolved.updatedAt;
    });

    hydrateBundle(hydrated);

    // espejo local para arranques offline
    keys.forEach(k => GHDB.writeLocal(k, hydrated[k], hydratedMeta[k] || Date.now()));
  } catch (err) {
    console.error('[Gyoza] Error cargando Firestore, usando local.', err);
    hydrateBundle(fromLocal);
  }
}

function queueCloudSync(keys) {
  const snapshot = getBundleFromState();
  const updatedAt = Date.now();

  keys.forEach(k => {
    _pendingCloudKeys.add(k);
    GHDB.writeLocal(k, snapshot[k], updatedAt);
  });

  if (_saveTimer) clearTimeout(_saveTimer);

  _saveTimer = setTimeout(async () => {
    const batchKeys = [..._pendingCloudKeys];
    _pendingCloudKeys.clear();
    _saveTimer = null;

    const bundle = getBundleFromState();

    if (!window.GHFirebase?.ready) return;

    try {
      await Promise.all(batchKeys.map(k => GHDB.writeCloud(k, bundle[k])));
    } catch (err) {
      console.error('[Gyoza] Error guardando en Firestore', err);
    }
  }, 140);
}

// ══ FUNCIONES DE GUARDADO ══
function save() {
  queueCloudSync(['products', 'sales']);
}

function saveInsumos() {
  queueCloudSync(['supplies', 'recipes', 'inventoryMovements']);
}

function saveCaja() {
  queueCloudSync(['cashCurrent', 'cashHistory']);
}

function saveEgresos() {
  queueCloudSync(['expenses']);
}

function saveProveedores() {
  queueCloudSync(['suppliers', 'supplierPurchases', 'supplierPayments']);
}

function saveCuentas() {
  queueCloudSync(['tables']);
}

// ══ HELPERS DE ACCESO AL ESTADO ══
function getCuenta() {
  return cuentas.find(c => c.id === cuentaActiva);
}

function ventasDelTurno() {
  if (!cajaActual) return [];

  const desde = cajaActual.fechaApertura + 'T' + cajaActual.horaApertura;

  return ventas.filter(v => {
    const ts = v.fecha + 'T' + (v.hora || '00:00');
    return ts >= desde;
  });
}

function egresosDelTurno() {
  if (!cajaActual) return [];

  const desde = cajaActual.fechaApertura + 'T' + cajaActual.horaApertura;

  return egresos.filter(e => {
    const ts = e.fecha + 'T' + (e.hora || '00:00');
    return ts >= desde;
  });
}

// ══ MENÚ INICIAL ══
function cargarMenuInicial() {
  prods = [
    { id: 1, nombre: 'Ramen Cerdo', precio: 36000, stock: 50, cat: 'Ramen' },
    { id: 2, nombre: 'Ramen Pollo', precio: 36000, stock: 50, cat: 'Ramen' },
    { id: 3, nombre: 'Ramen Vegetariano', precio: 36000, stock: 30, cat: 'Ramen' },
    { id: 4, nombre: 'Gyozas Cerdo (x5)', precio: 20000, stock: 50, cat: 'Gyozas' },
    { id: 5, nombre: 'Gyozas Pollo (x5)', precio: 20000, stock: 50, cat: 'Gyozas' },
    { id: 6, nombre: 'Gyozas Res (x5)', precio: 20000, stock: 50, cat: 'Gyozas' },
    { id: 7, nombre: 'Gyozas Vegetarianas (x5)', precio: 20000, stock: 30, cat: 'Gyozas' },
    { id: 8, nombre: 'Gyozas Camarón (x5)', precio: 25000, stock: 30, cat: 'Gyozas' },
    { id: 9, nombre: 'Combo 1 (Gyozas+2Ramen+2Bebidas+2Mochis)', precio: 0, stock: 99, cat: 'Combos' },
    { id: 10, nombre: 'Combo 2 (Gyozas+2Ramen+2Bebidas+Brownie+Blondie)', precio: 0, stock: 99, cat: 'Combos' },
    { id: 11, nombre: 'Lata Piña', precio: 7500, stock: 30, cat: 'Bebidas' },
    { id: 12, nombre: 'Lata Fresa', precio: 7500, stock: 30, cat: 'Bebidas' },
    { id: 13, nombre: 'Lata Granada', precio: 7500, stock: 30, cat: 'Bebidas' },
    { id: 14, nombre: 'Lata Aloe', precio: 7500, stock: 30, cat: 'Bebidas' },
    { id: 15, nombre: 'Jugo Crisantemo', precio: 5000, stock: 20, cat: 'Bebidas' },
    { id: 16, nombre: 'Jugo Naranja Miel', precio: 5000, stock: 20, cat: 'Bebidas' },
    { id: 17, nombre: 'Jugo Pera Miel', precio: 5000, stock: 20, cat: 'Bebidas' },
    { id: 18, nombre: 'Coca Cola', precio: 5000, stock: 30, cat: 'Bebidas' },
    { id: 19, nombre: 'Agua', precio: 5000, stock: 30, cat: 'Bebidas' },
    { id: 20, nombre: 'Kombucha Lulo', precio: 10000, stock: 15, cat: 'Kombuchas' },
    { id: 21, nombre: 'Kombucha Café', precio: 10000, stock: 15, cat: 'Kombuchas' },
    { id: 22, nombre: 'Kombucha Jengibre', precio: 10000, stock: 15, cat: 'Kombuchas' },
    { id: 23, nombre: 'Kombucha Natural', precio: 10000, stock: 15, cat: 'Kombuchas' },
    { id: 24, nombre: 'Kombucha Hierbabuena', precio: 10000, stock: 15, cat: 'Kombuchas' },
    { id: 25, nombre: 'Kombucha Maracuyá', precio: 10000, stock: 15, cat: 'Kombuchas' },
    { id: 26, nombre: 'Kombucha Kombu Chai', precio: 10000, stock: 15, cat: 'Kombuchas' },
    { id: 27, nombre: 'Kombucha Flor Jamaica', precio: 10000, stock: 15, cat: 'Kombuchas' },
    { id: 28, nombre: 'Kombucha Piña', precio: 10000, stock: 15, cat: 'Kombuchas' },
    { id: 29, nombre: 'Kombucha Maíz', precio: 10000, stock: 15, cat: 'Kombuchas' },
    { id: 30, nombre: 'Club Colombia Verde', precio: 5000, stock: 20, cat: 'Cervezas' },
    { id: 31, nombre: 'Club Colombia Roja', precio: 5000, stock: 20, cat: 'Cervezas' },
    { id: 32, nombre: 'Club Colombia Dorada', precio: 5000, stock: 20, cat: 'Cervezas' },
    { id: 33, nombre: 'Mochi', precio: 0, stock: 50, cat: 'Postres' },
    { id: 34, nombre: 'Brownie', precio: 0, stock: 20, cat: 'Postres' },
    { id: 35, nombre: 'Blondie', precio: 0, stock: 20, cat: 'Postres' }
  ];

  save();
}

// ══ LISTENERS EN TIEMPO REAL ══
// Se activan después de bootstrapState para recibir cambios de otros usuarios.
let _unsubscribers = [];

function activarListenersTiempoReal() {
  if (!window.GHFirebase?.ready) return;

  // Cancela suscripciones previas si las hay
  _unsubscribers.forEach(unsub => unsub());
  _unsubscribers = [];

  // Mapa: clave de estado → función que actualiza la variable en memoria y redibuja
  const handlers = {
    products: (val) => {
      prods = val || [];
      GHDB.writeLocal('products', prods);
      if (typeof renderInv === 'function') renderInv();
      if (typeof renderVentas === 'function') renderVentas();
      if (typeof filtrarProds === 'function') filtrarProds();
    },
    sales: (val) => {
      ventas = val || [];
      GHDB.writeLocal('sales', ventas);
      if (typeof renderDashboard === 'function') renderDashboard();
    },
    supplies: (val) => {
      insumos = val || [];
      GHDB.writeLocal('supplies', insumos);
      if (typeof renderInsumos === 'function') renderInsumos();
    },
    recipes: (val) => {
      recetas = val || [];
      GHDB.writeLocal('recipes', recetas);
    },
    inventoryMovements: (val) => {
      consumoLog = val || [];
      GHDB.writeLocal('inventoryMovements', consumoLog);
    },
    cashCurrent: (val) => {
      cajaActual = val || null;
      cajaAbierta = !!cajaActual;
      GHDB.writeLocal('cashCurrent', cajaActual);
      if (typeof renderDashboard === 'function') renderDashboard();
    },
    cashHistory: (val) => {
      cajaHistorial = val || [];
      GHDB.writeLocal('cashHistory', cajaHistorial);
    },
    expenses: (val) => {
      egresos = val || [];
      GHDB.writeLocal('expenses', egresos);
      if (typeof renderDashboard === 'function') renderDashboard();
    },
    suppliers: (val) => {
      proveedores = val || [];
      GHDB.writeLocal('suppliers', proveedores);
      if (typeof renderProveedores === 'function') renderProveedores();
    },
    supplierPurchases: (val) => {
      comprasProveedor = val || [];
      GHDB.writeLocal('supplierPurchases', comprasProveedor);
    },
    supplierPayments: (val) => {
      pagosProveedor = val || [];
      GHDB.writeLocal('supplierPayments', pagosProveedor);
    },
    tables: (val) => {
      if (!val || !val.length) return;
      cuentas = val;
      // Asegura que cuentaActiva sea válida
      if (!cuentas.find(c => c.id === cuentaActiva)) {
        cuentaActiva = cuentas[0].id;
      }
      GHDB.writeLocal('tables', cuentas);
      if (typeof renderBar === 'function') renderBar();
      if (typeof renderCart === 'function') renderCart();
    }
  };

  // Marca de tiempo del arranque para ignorar el disparo inicial de onSnapshot
  // (que devuelve los datos que ya cargamos en bootstrapState)
  const arranque = Date.now();
  const UMBRAL_MS = 3000; // ignora eventos en los primeros 3 seg

  Object.entries(handlers).forEach(([key, handler]) => {
    const unsub = GHDB.subscribeToKey(key, (payload) => {
      // Evita reprocesar el snapshot inicial que Firestore dispara al suscribirse
      if (Date.now() - arranque < UMBRAL_MS) return;
      handler(payload);
    });
    _unsubscribers.push(unsub);
  });
}

window.bootstrapState = bootstrapState;
window.activarListenersTiempoReal = activarListenersTiempoReal;
