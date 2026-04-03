/* ═══════════════════════════════════════════════
   GYOZA HOUSE — state.js
   Fuente única de verdad para todos los datos.
   Aquí se centraliza la lectura y escritura de
   localStorage. Cuando llegue Firebase, solo este
   archivo cambia.
   ═══════════════════════════════════════════════ */

// ══ PRODUCTOS & VENTAS ══
let prods  = JSON.parse(localStorage.getItem('gh_prods')  || '[]');
let ventas = JSON.parse(localStorage.getItem('gh_ventas') || '[]');

// ══ CUENTAS (mesas activas en pantalla) ══
let contadorCuenta = 1;
let cuentas       = [{ id: 'c1', nombre: 'Mesa 1', items: [], pago: null }];
let cuentaActiva  = 'c1';
let catActiva     = '';

// ══ INSUMOS, RECETAS, CONSUMO ══
let insumos    = JSON.parse(localStorage.getItem('gh_insumos') || '[]');
let recetas    = JSON.parse(localStorage.getItem('gh_recetas') || '[]');
let consumoLog = JSON.parse(localStorage.getItem('gh_consumo') || '[]');

// ══ CAJA ══
let cajaActual    = JSON.parse(localStorage.getItem('gh_caja_actual') || 'null');
let cajaHistorial = JSON.parse(localStorage.getItem('gh_caja_hist')   || '[]');
let cajaAbierta   = !!cajaActual;

// ══ EGRESOS ══
let egresos = JSON.parse(localStorage.getItem('gh_egresos') || '[]');

// ══ CONSTANTES ══
const EGRESO_CATS = {
  insumos:   { label: 'Insumos',    emoji: '🥢', cls: 'egreso-cat-insumos'   },
  personal:  { label: 'Personal',   emoji: '👤', cls: 'egreso-cat-personal'  },
  servicios: { label: 'Servicios',  emoji: '🔧', cls: 'egreso-cat-servicios' },
  domicilio: { label: 'Domicilio',  emoji: '🛵', cls: 'egreso-cat-domicilio' },
  otros:     { label: 'Otros',      emoji: '📌', cls: 'egreso-cat-otros'     },
};

// ══ FUNCIONES DE PERSISTENCIA ══
// Nota para Firebase: reemplaza estas funciones
// por llamadas a Firestore (setDoc, updateDoc, etc.)

function save() {
  localStorage.setItem('gh_prods',  JSON.stringify(prods));
  localStorage.setItem('gh_ventas', JSON.stringify(ventas));
}

function saveInsumos() {
  localStorage.setItem('gh_insumos', JSON.stringify(insumos));
  localStorage.setItem('gh_recetas', JSON.stringify(recetas));
  localStorage.setItem('gh_consumo', JSON.stringify(consumoLog));
}

function saveCaja() {
  localStorage.setItem('gh_caja_actual', JSON.stringify(cajaActual));
  localStorage.setItem('gh_caja_hist',   JSON.stringify(cajaHistorial));
}

function saveEgresos() {
  localStorage.setItem('gh_egresos', JSON.stringify(egresos));
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

// ══ MENÚ INICIAL (solo se carga si no hay prods guardados) ══
function cargarMenuInicial() {
  prods = [
    // RAMEN
    {id:1,  nombre:'Ramen Cerdo',        precio:36000, stock:50, cat:'Ramen'},
    {id:2,  nombre:'Ramen Pollo',        precio:36000, stock:50, cat:'Ramen'},
    {id:3,  nombre:'Ramen Vegetariano',  precio:36000, stock:30, cat:'Ramen'},
    // GYOZAS
    {id:4,  nombre:'Gyozas Cerdo (x5)',        precio:20000, stock:50, cat:'Gyozas'},
    {id:5,  nombre:'Gyozas Pollo (x5)',        precio:20000, stock:50, cat:'Gyozas'},
    {id:6,  nombre:'Gyozas Res (x5)',          precio:20000, stock:50, cat:'Gyozas'},
    {id:7,  nombre:'Gyozas Vegetarianas (x5)', precio:20000, stock:30, cat:'Gyozas'},
    {id:8,  nombre:'Gyozas Camarón (x5)',      precio:25000, stock:30, cat:'Gyozas'},
    // COMBOS
    {id:9,  nombre:'Combo 1 (Gyozas+2Ramen+2Bebidas+2Mochis)',         precio:0, stock:99, cat:'Combos'},
    {id:10, nombre:'Combo 2 (Gyozas+2Ramen+2Bebidas+Brownie+Blondie)', precio:0, stock:99, cat:'Combos'},
    // LATAS
    {id:11, nombre:'Lata Piña',    precio:7500, stock:30, cat:'Bebidas'},
    {id:12, nombre:'Lata Fresa',   precio:7500, stock:30, cat:'Bebidas'},
    {id:13, nombre:'Lata Granada', precio:7500, stock:30, cat:'Bebidas'},
    {id:14, nombre:'Lata Aloe',    precio:7500, stock:30, cat:'Bebidas'},
    // JUGOS CAJA
    {id:15, nombre:'Jugo Crisantemo',   precio:5000, stock:20, cat:'Bebidas'},
    {id:16, nombre:'Jugo Naranja Miel', precio:5000, stock:20, cat:'Bebidas'},
    {id:17, nombre:'Jugo Pera Miel',    precio:5000, stock:20, cat:'Bebidas'},
    // OTRAS BEBIDAS
    {id:18, nombre:'Coca Cola', precio:5000, stock:30, cat:'Bebidas'},
    {id:19, nombre:'Agua',      precio:5000, stock:30, cat:'Bebidas'},
    // KOMBUCHAS
    {id:20, nombre:'Kombucha Lulo',         precio:10000, stock:15, cat:'Kombuchas'},
    {id:21, nombre:'Kombucha Café',         precio:10000, stock:15, cat:'Kombuchas'},
    {id:22, nombre:'Kombucha Jengibre',     precio:10000, stock:15, cat:'Kombuchas'},
    {id:23, nombre:'Kombucha Natural',      precio:10000, stock:15, cat:'Kombuchas'},
    {id:24, nombre:'Kombucha Hierbabuena',  precio:10000, stock:15, cat:'Kombuchas'},
    {id:25, nombre:'Kombucha Maracuyá',     precio:10000, stock:15, cat:'Kombuchas'},
    {id:26, nombre:'Kombucha Kombu Chai',   precio:10000, stock:15, cat:'Kombuchas'},
    {id:27, nombre:'Kombucha Flor Jamaica', precio:10000, stock:15, cat:'Kombuchas'},
    {id:28, nombre:'Kombucha Piña',         precio:10000, stock:15, cat:'Kombuchas'},
    {id:29, nombre:'Kombucha Maíz',         precio:10000, stock:15, cat:'Kombuchas'},
    // CERVEZAS CLUB COLOMBIA
    {id:30, nombre:'Club Colombia Verde',  precio:5000, stock:20, cat:'Cervezas'},
    {id:31, nombre:'Club Colombia Roja',   precio:5000, stock:20, cat:'Cervezas'},
    {id:32, nombre:'Club Colombia Dorada', precio:5000, stock:20, cat:'Cervezas'},
    // POSTRES / MOCHIS
    {id:33, nombre:'Mochi',   precio:0, stock:50, cat:'Postres'},
    {id:34, nombre:'Brownie', precio:0, stock:20, cat:'Postres'},
    {id:35, nombre:'Blondie', precio:0, stock:20, cat:'Postres'},
  ];
  save();
}
