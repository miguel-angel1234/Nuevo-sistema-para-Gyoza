/* ═══════════════════════════════════════════════
   GYOZA HOUSE — logic/ventas.js
   Lógica de cuentas, carrito y registro de ventas.
   ═══════════════════════════════════════════════ */

// ══ CUENTAS BAR ══

function renderBar() {
  const bar = document.getElementById('cuentas-bar');
  bar.innerHTML = cuentas.map(c => {
    const total = c.items.reduce((s, i) => s + i.precio * i.qty, 0);
    const badge = c.items.length ? `<span class="ct-badge">${fmt(total)}</span>` : '';
    const close = cuentas.length > 1
      ? `<span class="ct-close" onclick="event.stopPropagation();cerrarCuenta('${c.id}')">✕</span>`
      : '';
    return `<div class="cuenta-tab ${c.id === cuentaActiva ? 'active' : ''}" onclick="activarCuenta('${c.id}')">
      🍜 ${c.nombre} ${badge}${close}
    </div>`;
  }).join('') + `<button class="btn-nueva" onclick="nuevaCuenta()">+ Nueva mesa</button>`;
}

function nuevaCuenta() {
  const numerosEnUso = cuentas.map(c => {
    const match = c.nombre.match(/^Mesa (\d+)$/);
    return match ? parseInt(match[1]) : null;
  }).filter(n => n !== null);

  let numero = 1;
  while (numerosEnUso.includes(numero)) numero++;

  const id = 'c' + Date.now();
  contadorCuenta = numero;
  cuentas.push({ id, nombre: 'Mesa ' + numero, items: [], pago: null });
  saveCuentas();
  activarCuenta(id);
}

function activarCuenta(id) {
  cuentaActiva = id;
  const c = getCuenta();
  document.getElementById('pago-input').value = c.pago || '';
  renderBar();
  renderCart();
  calcCambio();
}

function cerrarCuenta(id) {
  const c = cuentas.find(x => x.id === id);
  if (c && c.items.length && !confirm(`¿Cerrar "${c.nombre}"? Se perderán los productos.`)) return;
  cuentas = cuentas.filter(x => x.id !== id);
  if (cuentaActiva === id) cuentaActiva = cuentas[cuentas.length - 1].id;
  saveCuentas();
  renderBar();
  renderCart();
}

// ══ VENTAS / PANTALLA ══

function renderVentas() {
  renderBar();
  renderCatFilters();
  filtrarProds();
  const sel = document.getElementById('sel-prod');
  sel.innerHTML = prods.map(p => `<option value="${p.id}">${p.nombre} — ${fmt(p.precio)}</option>`).join('');
}

function renderCatFilters() {
  const cats = [...new Set(prods.map(p => p.cat))];
  const cont = document.getElementById('cat-filters');
  cont.innerHTML =
    `<button style="padding:4px 12px;border-radius:20px;border:1px solid ${catActiva === '' ? 'var(--red)' : 'rgba(255,255,255,.1)'};background:${catActiva === '' ? 'rgba(200,16,46,.2)' : 'transparent'};color:${catActiva === '' ? 'var(--red-soft)' : 'var(--muted)'};font-size:12px;font-weight:600;cursor:pointer" onclick="setCat('')">Todos</button>`
    + cats.map(c =>
      `<button style="padding:4px 12px;border-radius:20px;border:1px solid ${catActiva === c ? 'var(--red)' : 'rgba(255,255,255,.1)'};background:${catActiva === c ? 'rgba(200,16,46,.2)' : 'transparent'};color:${catActiva === c ? 'var(--red-soft)' : 'var(--muted)'};font-size:12px;font-weight:600;cursor:pointer" onclick="setCat('${c}')">${c}</button>`
    ).join('');
}

function setCat(cat) {
  catActiva = cat;
  renderCatFilters();
  filtrarProds();
}

function filtrarProds() {
  const q    = document.getElementById('buscar').value.toLowerCase();
  const grid = document.getElementById('prod-grid');
  let lista  = prods;
  if (catActiva) lista = lista.filter(p => p.cat === catActiva);
  if (q)         lista = lista.filter(p => p.nombre.toLowerCase().includes(q) || (p.cat || '').toLowerCase().includes(q));
  if (!lista.length) {
    grid.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:12px 0;grid-column:1/-1">Sin resultados</div>';
    return;
  }
  grid.innerHTML = lista.map(p => `
    <div class="prod-chip${p.stock <= 0 ? ' prod-chip-agot' : ''}" onclick="${p.stock > 0 ? 'addToCart(' + p.id + ')' : 'void(0)'}">
      <div class="prod-chip-name">${p.nombre}</div>
      <div class="prod-chip-price">${p.precio > 0 ? fmt(p.precio) : 'Incluido'}</div>
      <div class="prod-chip-cat" style="color:rgba(200,16,46,.6)">${p.cat}</div>
      <div class="prod-chip-stock">${p.stock > 0 ? 'Stock: ' + p.stock : 'Agotado'}</div>
    </div>`).join('');
}

// ══ CARRITO ══

function addToCart(pid, qty = 1) {
  const p = prods.find(x => x.id === pid);
  if (!p || p.stock <= 0) { showAlert('alert-ventas', 'err', 'Sin stock disponible.'); return; }
  const c  = getCuenta();
  const ex = c.items.find(x => x.id === pid);
  if (ex) {
    if (ex.qty + qty > p.stock) { showAlert('alert-ventas', 'err', 'No hay suficiente stock.'); return; }
    ex.qty += qty;
  } else {
    c.items.push({ id: pid, nombre: p.nombre, precio: p.precio, qty });
  }
  saveCuentas();
  renderCart();
  renderBar();
}

function addFromSel() {
  const pid = parseInt(document.getElementById('sel-prod').value);
  const qty = parseInt(document.getElementById('sel-qty').value) || 1;
  addToCart(pid, qty);
}

function removeFromCart(pid) {
  const c = getCuenta();
  c.items = c.items.filter(x => x.id !== pid);
  saveCuentas();
  renderCart();
  renderBar();
}

function limpiarCarrito() {
  const c = getCuenta();
  c.items = [];
  c.pago  = null;
  document.getElementById('pago-input').value = '';
  document.getElementById('cambio-box').style.display = 'none';
  saveCuentas();
  renderCart();
  renderBar();
}

function renderCart() {
  const c = getCuenta();
  if (!c) return;
  const body  = document.getElementById('carrito-body');
  const count = c.items.reduce((s, i) => s + i.qty, 0);
  document.getElementById('carrito-title').textContent  = c.nombre;
  document.getElementById('carrito-count').textContent  = count === 0 ? '0 productos' : count + ' producto' + (count > 1 ? 's' : '');
  if (!c.items.length) {
    body.innerHTML = '<div class="empty" style="padding:30px"><div class="empty-icon">🥢</div><div class="empty-text">Agrega productos</div></div>';
    document.getElementById('total-value').textContent = '$0';
    document.getElementById('cambio-box').style.display = 'none';
    return;
  }
  body.innerHTML = c.items.map(i => `
    <div class="carrito-item">
      <span class="ci-name">${i.nombre}</span>
      <span class="ci-qty">×${i.qty}</span>
      <span class="ci-price">${fmt(i.precio * i.qty)}</span>
      <span class="ci-del" onclick="removeFromCart(${i.id})">✕</span>
    </div>`).join('');
  document.getElementById('total-value').textContent = fmt(c.items.reduce((s, i) => s + i.precio * i.qty, 0));
  calcCambio();
}

function calcCambio() {
  const c = getCuenta();
  if (!c) return;
  const total = c.items.reduce((s, i) => s + i.precio * i.qty, 0);
  const pago  = parseFloat(document.getElementById('pago-input').value) || 0;
  c.pago = pago || null;
  const box = document.getElementById('cambio-box');
  if (!pago) { box.style.display = 'none'; return; }
  box.style.display = 'block';
  const cambio = pago - total;
  document.getElementById('c-total').textContent = fmt(total);
  document.getElementById('c-pago').textContent  = fmt(pago);
  const el = document.getElementById('c-cambio');
  if (cambio < 0) { el.textContent = `Faltan ${fmt(Math.abs(cambio))}`; el.className = 'cl-value cl-bad'; }
  else            { el.textContent = fmt(cambio); el.className = 'cl-value cl-ok'; }
}

// ══ REGISTRO DE VENTA ══

function registrarVenta() {
  const c = getCuenta();
  if (!c.items.length) { showAlert('alert-ventas', 'err', 'La orden está vacía.'); return; }
  const total = c.items.reduce((s, i) => s + i.precio * i.qty, 0);
  const pago  = parseFloat(document.getElementById('pago-input').value) || 0;
  if (pago > 0 && pago < total) { showAlert('alert-ventas', 'err', 'El pago es menor al total.'); return; }

  // Descontar stock de productos
  c.items.forEach(i => { const p = prods.find(x => x.id === i.id); if (p) p.stock -= i.qty; });

  // Descontar insumos automáticamente según recetas
  const now2     = new Date();
  const fechaLog = now2.toISOString().split('T')[0];
  const horaLog  = now2.toTimeString().slice(0, 5);
  c.items.forEach(item => {
    const receta = recetas.find(r => r.prodId === item.id);
    if (!receta) return;
    receta.ingredientes.forEach(ig => {
      const ins = insumos.find(i => i.id === ig.insumoId);
      if (!ins) return;
      const consumido = ig.cantidad * item.qty;
      ins.stock = Math.max(0, ins.stock - consumido);
      consumoLog.unshift({
        tipo: 'consumo', fecha: fechaLog, hora: horaLog,
        desc: `-${consumido} ${ins.unidad} de "${ins.nombre}" por ${item.qty}× ${item.nombre}`,
        insumoId: ins.id
      });
    });
  });
  saveInsumos();

  const now = new Date();
  ventas.push({
    id:    'v' + Date.now(),
    fecha: now.toISOString().split('T')[0],
    hora:  now.toTimeString().slice(0, 5),
    items: c.items.map(i => ({ ...i })),
    total,
    pago:  pago || null,
    cambio: pago ? pago - total : null
  });
  save();

  const ventaGuardada = ventas[ventas.length - 1];
  showAlert('alert-ventas', 'ok',
    `✅ ${c.nombre} registrada · ${fmt(total)}${pago ? ' · Cambio: ' + fmt(pago - total) : ''}`);
  limpiarCarrito();
  filtrarProds();
  renderBar();
  setTimeout(() => abrirTicket(ventaGuardada), 120);
}
