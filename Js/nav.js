/* ═══════════════════════════════════════════════
   GYOZA HOUSE — nav.js
   Lógica de navegación entre secciones.
   ═══════════════════════════════════════════════ */

function goTo(tab) {
  ['dashboard', 'ventas', 'inventario', 'historial', 'insumos', 'proveedores', 'reportes'].forEach(t => {
    const sec   = document.getElementById('sec-' + t);
    const tabEl = document.getElementById('tab-' + t);
    if (sec)   sec.classList.toggle('active', t === tab);
    if (tabEl) tabEl.classList.toggle('active', t === tab);
  });

  // insumos está fuera del <main>
  const ins = document.getElementById('sec-insumos');
  if (ins) ins.style.display = tab === 'insumos' ? 'block' : 'none';

  if (tab === 'dashboard')  renderDashboard();
  if (tab === 'ventas')     renderVentas();
  if (tab === 'inventario') renderInv();
  if (tab === 'historial')  renderHistorial();
  if (tab === 'insumos')    renderInsumos();
  if (tab === 'proveedores') renderProveedores();
  if (tab === 'reportes') renderReportes();
}