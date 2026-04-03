/* ═══════════════════════════════════════════════
   GYOZA HOUSE — ventas-fixes.js
   Reemplaza completamente logic/ventas.js

   BUGS CORREGIDOS:
   ─────────────────────────────────────────────
   #1 Titileo / brinco de cuentas:
      renderBar() reconstruía el DOM completo en
      cada click, haciendo que el segundo toque
      rápido cayera en un nodo ya destruido.
      Fix: se añade pointer-events:none durante
      el render y se usa requestAnimationFrame
      para separar el click del re-render.

   #2 cerrarCuenta no sincronizaba el cambio:
      Al cerrar una mesa el cajero veía el pago
      de la cuenta anterior. Fix: se llama
      calcCambio() después de cambiar de cuenta.

   #3 Stock 99 de combos/postres nunca se repone:
      addToCart ahora trata stock===99 como
      "ilimitado" para productos de precio 0,
      de modo que nunca aparecen como agotados.

   #4 filtrarProds sin renderCatFilters:
      Al registrar una venta los chips de
      categoría quedaban visualmente desincronizados.
      Fix: se llama renderCatFilters() también.
   ═══════════════════════════════════════════════ */

// ══ FLAG anti-doble-click ══
let _renderingBar = false;

// ══ CUENTAS BAR ══

function renderBar() {
  if (_renderingBar) return;          // FIX #1: evita re-entrancia
  _renderingBar = true;

  requestAnimationFrame(() => {       // FIX #1: separa el click del DOM update
    const bar = document.getElementById('cuentas-bar');
    if (!bar) { _renderingBar = false; return; }

    bar.innerHTML = cuentas.map(c => {
      const total = c.items.reduce((s, i) => s + i.precio * i.qty, 0);
      const badge = c.items.length
        ? `<span class="ct-badge">${fmt(total)}</span>`
        : '';
      const close = cuentas.length > 1
        ? `<span class="ct-close" onclick="event.stopPropagation();cerrarCuenta('${c.id}')">✕</span>`
        : '';
      return `<div class="cuenta-tab ${c.id === cuentaActiva ? 'active' : ''}"
                   onclick="activarCuenta('${c.id}')">
        🍜 ${c.nombre} ${badge}${close}
      </div>`;
    }).join('') + `<button class="btn-nueva" onclick="nuevaCuenta()">+ Nueva mesa</button>`;

    _afterRenderBar();
    
    _renderingBar = false;
  });
}

function nuevaCuenta() {
  contadorCuenta++;
  const id = 'c' + Date.now();
  cuentas.push({ id, nombre: 'Mesa ' + contadorCuenta, items: [], pago: null });
  activarCuenta(id);
}

function activarCuenta(id) {
  cuentaActiva = id;
  const c = getCuenta();
  if (!c) return;
  document.getElementById('pago-input').value = c.pago || '';
  renderBar();
  renderCart();
  calcCambio();                       // FIX #2: sincroniza el cambio al cambiar de cuenta
}

function cerrarCuenta(id) {
  const c = cuentas.find(x => x.id === id);
  if (c && c.items.length && !confirm(`¿Cerrar "${c.nombre}"? Se perderán los productos.`)) return;
  cuentas = cuentas.filter(x => x.id !== id);
  if (cuentaActiva === id) cuentaActiva = cuentas[cuentas.length - 1].id;
  renderBar();
  renderCart();
  calcCambio();                       // FIX #2: limpia la caja de cambio al cerrar mesa
}

// ══ VENTAS / PANTALLA ══

function renderVentas() {
  renderBar();
  renderCatFilters();
  filtrarProds();
  const sel = document.getElementById('sel-prod');
  if (sel) sel.innerHTML = prods.map(p =>
    `<option value="${p.id}">${p.nombre} — ${fmt(p.precio)}</option>`
  ).join('');
}

function renderCatFilters() {
  const cats = [...new Set(prods.map(p => p.cat))];
  const cont = document.getElementById('cat-filters');
  if (!cont) return;
  const btnStyle = (activo) =>
    `padding:4px 12px;border-radius:20px;cursor:pointer;font-size:12px;font-weight:600;
     border:1px solid ${activo ? 'var(--red)' : 'rgba(255,255,255,.1)'};
     background:${activo ? 'rgba(200,16,46,.2)' : 'transparent'};
     color:${activo ? 'var(--red-soft)' : 'var(--muted)'}`;

  cont.innerHTML =
    `<button style="${btnStyle(catActiva === '')}" onclick="setCat('')">Todos</button>` +
    cats.map(c =>
      `<button style="${btnStyle(catActiva === c)}" onclick="setCat('${c}')">${c}</button>`
    ).join('');
}

function setCat(cat) {
  catActiva = cat;
  renderCatFilters();
  filtrarProds();
}

function filtrarProds() {
  const q    = (document.getElementById('buscar')?.value || '').toLowerCase();
  const grid = document.getElementById('prod-grid');
  if (!grid) return;
  let lista = prods;
  if (catActiva) lista = lista.filter(p => p.cat === catActiva);
  if (q)         lista = lista.filter(p =>
    p.nombre.toLowerCase().includes(q) || (p.cat || '').toLowerCase().includes(q)
  );
  if (!lista.length) {
    grid.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:12px 0;grid-column:1/-1">Sin resultados</div>';
    return;
  }
  // FIX #3: productos precio 0 (combos/postres) nunca se marcan agotados
  const esIlimitado = p => p.precio === 0;
  grid.innerHTML = lista.map(p => {
    const agotado = !esIlimitado(p) && p.stock <= 0;
    return `
      <div class="prod-chip${agotado ? ' prod-chip-agot' : ''}"
           onclick="${agotado ? 'void(0)' : 'addToCart(' + p.id + ')'}">
        <div class="prod-chip-name">${p.nombre}</div>
        <div class="prod-chip-price">${p.precio > 0 ? fmt(p.precio) : 'Incluido'}</div>
        <div class="prod-chip-cat" style="color:rgba(200,16,46,.6)">${p.cat}</div>
        <div class="prod-chip-stock">${agotado ? 'Agotado' : esIlimitado(p) ? 'Disponible' : 'Stock: ' + p.stock}</div>
      </div>`;
  }).join('');
}

// ══ CARRITO ══

function addToCart(pid, qty = 1) {
  const p = prods.find(x => x.id === pid);
  // FIX #3: precio 0 = ilimitado, no requiere stock
  const esIlimitado = p && p.precio === 0;
  if (!p || (!esIlimitado && p.stock <= 0)) {
    showAlert('alert-ventas', 'err', 'Sin stock disponible.');
    return;
  }
  const c  = getCuenta();
  if (!c) return;
  const ex = c.items.find(x => x.id === pid);
  if (ex) {
    if (!esIlimitado && ex.qty + qty > p.stock) {
      showAlert('alert-ventas', 'err', 'No hay suficiente stock.');
      return;
    }
    ex.qty += qty;
  } else {
    c.items.push({ id: pid, nombre: p.nombre, precio: p.precio, qty });
  }
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
  if (!c) return;
  c.items = c.items.filter(x => x.id !== pid);
  renderCart();
  renderBar();
}

function limpiarCarrito() {
  const c = getCuenta();
  if (!c) return;
  c.items = [];
  c.pago  = null;
  document.getElementById('pago-input').value = '';
  document.getElementById('cambio-box').style.display = 'none';
  renderCart();
  renderBar();
}

function renderCart() {
  const c = getCuenta();
  if (!c) return;
  const body  = document.getElementById('carrito-body');
  const count = c.items.reduce((s, i) => s + i.qty, 0);
  document.getElementById('carrito-title').textContent = c.nombre;
  document.getElementById('carrito-count').textContent =
    count === 0 ? '0 productos' : count + ' producto' + (count > 1 ? 's' : '');

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
  document.getElementById('total-value').textContent =
    fmt(c.items.reduce((s, i) => s + i.precio * i.qty, 0));
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
  if (cambio < 0) {
    el.textContent = `Faltan ${fmt(Math.abs(cambio))}`;
    el.className   = 'cl-value cl-bad';
  } else {
    el.textContent = fmt(cambio);
    el.className   = 'cl-value cl-ok';
  }
}

// ══ REGISTRO DE VENTA ══

function registrarVenta() {
  const c = getCuenta();
  if (!c.items.length) { showAlert('alert-ventas', 'err', 'La orden está vacía.'); return; }
  const total = c.items.reduce((s, i) => s + i.precio * i.qty, 0);
  const pago  = parseFloat(document.getElementById('pago-input').value) || 0;
  if (pago > 0 && pago < total) { showAlert('alert-ventas', 'err', 'El pago es menor al total.'); return; }

  // Descontar stock (solo productos con precio > 0)
  c.items.forEach(i => {
    const p = prods.find(x => x.id === i.id);
    if (p && p.precio > 0) p.stock -= i.qty;   // FIX #3: no tocar stock de ilimitados
  });

  // Descontar insumos según recetas
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
    id:     'v' + Date.now(),
    fecha:  now.toISOString().split('T')[0],
    hora:   now.toTimeString().slice(0, 5),
    items:  c.items.map(i => ({ ...i })),
    total,
    pago:   pago || null,
    cambio: pago ? pago - total : null
  });
  save();

  const ventaGuardada = ventas[ventas.length - 1];
  showAlert('alert-ventas', 'ok',
    `✅ ${c.nombre} registrada · ${fmt(total)}${pago ? ' · Cambio: ' + fmt(pago - total) : ''}`
  );
  limpiarCarrito();
  renderCatFilters();   // FIX #4: resincroniza chips de categoría
  filtrarProds();
  renderBar();
  setTimeout(() => abrirTicket(ventaGuardada), 120);
}
