/* ═══════════════════════════════════════════════
   GYOZA HOUSE — utils.js
   Funciones de utilidad reutilizables en todo
   el proyecto.
   ═══════════════════════════════════════════════ */

/** Formatea un número como moneda colombiana */
const fmt = n => '$' + Math.round(n).toLocaleString('es-CO');

/** Convierte '2024-03-15' en '15 de Marzo, 2024' */
function fechaLinda(s) {
  const [y, m, d] = s.split('-');
  const M = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
              'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return `${parseInt(d)} de ${M[parseInt(m) - 1]}, ${y}`;
}

/** Muestra una alerta temporal en un contenedor del DOM */
function showAlert(id, type, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = `<div class="alert alert-${type}">${msg}</div>`;
  setTimeout(() => { if (el) el.innerHTML = ''; }, 4500);
}

/** Muestra alerta en el modal de egresos */
function showAlertEgreso(type, msg) {
  const el = document.getElementById('alert-egreso');
  el.innerHTML = `<div class="alert alert-${type}">${msg}</div>`;
  setTimeout(() => { if (el) el.innerHTML = ''; }, 4000);
}
