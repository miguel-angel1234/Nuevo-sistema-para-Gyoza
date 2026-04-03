/* ═══════════════════════════════════════════════
   GYOZA HOUSE — ui/pedidos.js
   Sistema de seguimiento de pedidos por mesa.

   CÓMO FUNCIONA:
   - Cada mesa tiene una lista de ítems con estado
     'pendiente' o 'listo'.
   - El botón 🍳 en la barra de cuentas abre el
     panel de pedidos de esa mesa.
   - La cocina marca ítems como listos.
   - El cajero ve qué falta por entregar.
   - Al registrar la venta, el estado se limpia.
   ═══════════════════════════════════════════════ */

// ══ ESTADO DE PEDIDOS ══
// pedidosEstado = { [cuentaId]: { [itemId+idx]: 'pendiente'|'listo' } }
let pedidosEstado = {};

// ══ INYECTAR BOTÓN EN LA BARRA DE CUENTAS ══
// Se llama desde renderBar() — añade el botón 🍳
// después de que el DOM de la barra esté listo.
function renderBtnPedidos() {
  const bar = document.getElementById('cuentas-bar');
  if (!bar) return;
  // Insertar el botón antes del btn-nueva si no existe
  if (!document.getElementById('btn-ver-pedidos')) {
    const btn = document.createElement('button');
    btn.id        = 'btn-ver-pedidos';
    btn.className = 'btn-pedidos-toggle';
    btn.innerHTML = '🍳 Ver pedidos';
    btn.onclick   = () => abrirPanelPedidos();
    bar.appendChild(btn);
  }
}

// ══ ABRIR PANEL ══
function abrirPanelPedidos(cuentaId) {
  const id = cuentaId || cuentaActiva;
  const c  = cuentas.find(x => x.id === id);
  if (!c) return;

  // Inicializar estado si no existe
  if (!pedidosEstado[id]) pedidosEstado[id] = {};

  // Asignar estado a ítems nuevos
  c.items.forEach((item, idx) => {
    const key = `${item.id}_${idx}`;
    if (!pedidosEstado[id][key]) pedidosEstado[id][key] = 'pendiente';
  });

  // Remover panel anterior si existe
  const anterior = document.getElementById('panel-pedidos-backdrop');
  if (anterior) anterior.remove();

  const pendientes = c.items.filter((item, idx) =>
    (pedidosEstado[id][`${item.id}_${idx}`] || 'pendiente') === 'pendiente'
  );
  const listos = c.items.filter((item, idx) =>
    pedidosEstado[id][`${item.id}_${idx}`] === 'listo'
  );

  const backdrop = document.createElement('div');
  backdrop.id        = 'panel-pedidos-backdrop';
  backdrop.className = 'pedidos-backdrop';
  backdrop.onclick   = (e) => { if (e.target === backdrop) cerrarPanelPedidos(); };

  backdrop.innerHTML = `
    <div class="pedidos-panel">

      <!-- HEADER -->
      <div class="pedidos-header">
        <div class="pedidos-header-left">
          <span class="pedidos-mesa-icon">🍜</span>
          <div>
            <div class="pedidos-mesa-nombre">${c.nombre}</div>
            <div class="pedidos-mesa-sub">${c.items.reduce((s,i)=>s+i.qty,0)} productos · ${fmt(c.items.reduce((s,i)=>s+i.precio*i.qty,0))}</div>
          </div>
        </div>
        <button class="pedidos-close" onclick="cerrarPanelPedidos()">✕</button>
      </div>

      <!-- CUENTAS SELECTOR (cambiar de mesa sin cerrar) -->
      <div class="pedidos-mesas-bar">
        ${cuentas.map(m => {
          const pend = Object.entries(pedidosEstado[m.id] || {}).filter(([,v]) => v === 'pendiente').length;
          return `<div class="pedidos-mesa-chip ${m.id === id ? 'active' : ''}"
                       onclick="abrirPanelPedidos('${m.id}')">
            🍜 ${m.nombre}
            ${pend > 0 ? `<span class="pedidos-pend-badge">${pend}</span>` : ''}
          </div>`;
        }).join('')}
      </div>

      <!-- COLUMNAS -->
      <div class="pedidos-columnas">

        <!-- POR PREPARAR -->
        <div class="pedidos-col">
          <div class="pedidos-col-header pendiente-header">
            <span class="pedidos-col-icon">⏳</span>
            <span class="pedidos-col-title">Por preparar</span>
            <span class="pedidos-col-count">${pendientes.reduce((s,i)=>s+i.qty,0)}</span>
          </div>
          <div class="pedidos-col-body" id="col-pendiente">
            ${pendientes.length === 0
              ? `<div class="pedidos-empty">
                   <span style="font-size:28px">✅</span>
                   <span>Todo listo</span>
                 </div>`
              : c.items.map((item, idx) => {
                  const key    = `${item.id}_${idx}`;
                  const estado = pedidosEstado[id][key] || 'pendiente';
                  if (estado !== 'pendiente') return '';
                  return `
                    <div class="pedidos-item" id="pitem-${id}-${idx}">
                      <div class="pedidos-item-info">
                        <span class="pedidos-item-qty">×${item.qty}</span>
                        <span class="pedidos-item-nombre">${item.nombre}</span>
                      </div>
                      <button class="pedidos-btn-listo"
                              onclick="marcarListo('${id}', ${idx})">
                        Listo ✓
                      </button>
                    </div>`;
                }).join('')
            }
          </div>
        </div>

        <!-- LISTOS PARA ENTREGAR -->
        <div class="pedidos-col">
          <div class="pedidos-col-header listo-header">
            <span class="pedidos-col-icon">🍱</span>
            <span class="pedidos-col-title">Listo para entregar</span>
            <span class="pedidos-col-count">${listos.reduce((s,i)=>s+i.qty,0)}</span>
          </div>
          <div class="pedidos-col-body" id="col-listo">
            ${listos.length === 0
              ? `<div class="pedidos-empty">
                   <span style="font-size:28px">🍳</span>
                   <span>Nada listo aún</span>
                 </div>`
              : c.items.map((item, idx) => {
                  const key    = `${item.id}_${idx}`;
                  const estado = pedidosEstado[id][key] || 'pendiente';
                  if (estado !== 'listo') return '';
                  return `
                    <div class="pedidos-item listo">
                      <div class="pedidos-item-info">
                        <span class="pedidos-item-qty listo">×${item.qty}</span>
                        <span class="pedidos-item-nombre listo">${item.nombre}</span>
                      </div>
                      <button class="pedidos-btn-revertir"
                              onclick="revertirPendiente('${id}', ${idx})">
                        ↩
                      </button>
                    </div>`;
                }).join('')
            }
          </div>
        </div>

      </div>

      <!-- FOOTER -->
      <div class="pedidos-footer">
        <div class="pedidos-footer-info">
          <span class="pedidos-footer-pend">${pendientes.reduce((s,i)=>s+i.qty,0)} pendiente${pendientes.reduce((s,i)=>s+i.qty,0)!==1?'s':''}</span>
          <span class="pedidos-footer-sep">·</span>
          <span class="pedidos-footer-list">${listos.reduce((s,i)=>s+i.qty,0)} listo${listos.reduce((s,i)=>s+i.qty,0)!==1?'s':''}</span>
        </div>
        <button class="pedidos-btn-todo-listo"
                onclick="marcarTodoListo('${id}')"
                ${pendientes.length === 0 ? 'disabled' : ''}>
          ✓ Marcar todo listo
        </button>
      </div>

    </div>`;

  document.body.appendChild(backdrop);
  requestAnimationFrame(() => backdrop.classList.add('visible'));
}

// ══ MARCAR LISTO ══
function marcarListo(cuentaId, idx) {
  const c = cuentas.find(x => x.id === cuentaId);
  if (!c) return;
  const item = c.items[idx];
  if (!item) return;
  const key = `${item.id}_${idx}`;
  if (!pedidosEstado[cuentaId]) pedidosEstado[cuentaId] = {};
  pedidosEstado[cuentaId][key] = 'listo';
  abrirPanelPedidos(cuentaId); // re-render del panel
  actualizarBadgePedidos();
}

// ══ REVERTIR A PENDIENTE ══
function revertirPendiente(cuentaId, idx) {
  const c = cuentas.find(x => x.id === cuentaId);
  if (!c) return;
  const item = c.items[idx];
  if (!item) return;
  const key = `${item.id}_${idx}`;
  if (pedidosEstado[cuentaId]) pedidosEstado[cuentaId][key] = 'pendiente';
  abrirPanelPedidos(cuentaId);
  actualizarBadgePedidos();
}

// ══ MARCAR TODO LISTO ══
function marcarTodoListo(cuentaId) {
  const c = cuentas.find(x => x.id === cuentaId);
  if (!c) return;
  if (!pedidosEstado[cuentaId]) pedidosEstado[cuentaId] = {};
  c.items.forEach((item, idx) => {
    pedidosEstado[cuentaId][`${item.id}_${idx}`] = 'listo';
  });
  abrirPanelPedidos(cuentaId);
  actualizarBadgePedidos();
}

// ══ CERRAR PANEL ══
function cerrarPanelPedidos() {
  const panel = document.getElementById('panel-pedidos-backdrop');
  if (!panel) return;
  panel.classList.remove('visible');
  setTimeout(() => panel.remove(), 220);
}

// ══ BADGE DE PENDIENTES EN EL BOTÓN ══
function actualizarBadgePedidos() {
  const btn = document.getElementById('btn-ver-pedidos');
  if (!btn) return;
  let total = 0;
  cuentas.forEach(c => {
    const est = pedidosEstado[c.id] || {};
    c.items.forEach((item, idx) => {
      const key = `${item.id}_${idx}`;
      if ((est[key] || 'pendiente') === 'pendiente' && c.items.length > 0) total++;
    });
  });
  btn.innerHTML = total > 0
    ? `🍳 Ver pedidos <span class="pedidos-global-badge">${total}</span>`
    : '🍳 Ver pedidos';
}

// ══ LIMPIAR ESTADO AL REGISTRAR VENTA ══
// Llama esto desde registrarVenta() después de limpiarCarrito()
function limpiarEstadoPedidos(cuentaId) {
  if (pedidosEstado[cuentaId]) delete pedidosEstado[cuentaId];
  actualizarBadgePedidos();
}

// ══ HOOK: conectar con renderBar original ══
// Se llama al final de renderBar() para inyectar
// el botón y actualizar el badge.
function _afterRenderBar() {
  renderBtnPedidos();
  actualizarBadgePedidos();
}
