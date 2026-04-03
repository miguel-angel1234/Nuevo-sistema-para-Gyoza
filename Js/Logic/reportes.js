/* Reportes administrativos */

function parseDateRange() {
  const d1 = document.getElementById('rep-desde').value;
  const d2 = document.getElementById('rep-hasta').value;
  return { d1, d2 };
}

function inRange(fecha, d1, d2) {
  if (!d1 && !d2) return true;
  if (d1 && fecha < d1) return false;
  if (d2 && fecha > d2) return false;
  return true;
}

function renderReportes() {
  const { d1, d2 } = parseDateRange();
  const vs = ventas.filter(v => inRange(v.fecha, d1, d2));
  const gs = egresos.filter(e => inRange(e.fecha, d1, d2));
  const cs = comprasProveedor.filter(c => inRange(c.fecha, d1, d2));

  const ingresos = vs.reduce((s, v) => s + v.total, 0);
  const egTot = gs.reduce((s, e) => s + e.monto, 0);
  const compras = cs.reduce((s, c) => s + c.total, 0);
  const ticket = vs.length ? ingresos / vs.length : 0;

  document.getElementById('rep-stats').innerHTML = `
    <div class="stat"><div class="stat-label">Ingresos</div><div class="stat-value">${fmt(ingresos)}</div></div>
    <div class="stat"><div class="stat-label">Egresos</div><div class="stat-value">${fmt(egTot)}</div></div>
    <div class="stat"><div class="stat-label">Compras proveedor</div><div class="stat-value">${fmt(compras)}</div></div>
    <div class="stat"><div class="stat-label">Ticket promedio</div><div class="stat-value">${fmt(ticket)}</div><div class="stat-sub">${vs.length} transacciones</div></div>`;

  const byProd = {};
  const byCat = {};
  vs.forEach(v => v.items.forEach(i => {
    byProd[i.nombre] = (byProd[i.nombre] || 0) + i.qty;
    const p = prods.find(x => x.id === i.id);
    const cat = p?.cat || 'Sin categoría';
    byCat[cat] = (byCat[cat] || 0) + i.precio * i.qty;
  }));

  document.getElementById('rep-top-productos').innerHTML = Object.entries(byProd)
    .sort((a,b)=>b[1]-a[1]).slice(0,8)
    .map(([n,q])=>`<div class="kpi-line"><span>${n}</span><b>${q} uds</b></div>`).join('') || '<div class="ins-empty">Sin datos</div>';

  document.getElementById('rep-ventas-cat').innerHTML = Object.entries(byCat)
    .sort((a,b)=>b[1]-a[1]).map(([n,t])=>`<div class="kpi-line"><span>${n}</span><b>${fmt(t)}</b></div>`).join('') || '<div class="ins-empty">Sin datos</div>';

  const gastosCat = {};
  gs.forEach(g => gastosCat[g.cat] = (gastosCat[g.cat] || 0) + g.monto);
  document.getElementById('rep-gastos-cat').innerHTML = Object.entries(gastosCat)
    .sort((a,b)=>b[1]-a[1]).map(([n,t])=>`<div class="kpi-line"><span>${n}</span><b>${fmt(t)}</b></div>`).join('') || '<div class="ins-empty">Sin gastos</div>';

  const comprasProv = {};
  cs.forEach(c => {
    const p = proveedores.find(x => x.id === c.proveedorId);
    const n = p?.nombre || 'Sin proveedor';
    comprasProv[n] = (comprasProv[n] || 0) + c.total;
  });
  document.getElementById('rep-compras-prov').innerHTML = Object.entries(comprasProv)
    .sort((a,b)=>b[1]-a[1]).map(([n,t])=>`<div class="kpi-line"><span>${n}</span><b>${fmt(t)}</b></div>`).join('') || '<div class="ins-empty">Sin compras</div>';
}