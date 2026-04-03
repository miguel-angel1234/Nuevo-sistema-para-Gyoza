/* ═══════════════════════════════════════════════
   GYOZA HOUSE — logic/historial.js
   Historial de ventas, edición y exportación.
   ═══════════════════════════════════════════════ */

let editId = null;

// ══ RENDER HISTORIAL ══

function renderHistorial() {
  const hoy  = new Date().toISOString().split('T')[0];
  const mes  = hoy.slice(0, 7);
  const vHoy = ventas.filter(v => v.fecha === hoy);
  const tHoy = vHoy.reduce((s, v) => s + v.total, 0);
  const tMes = ventas.filter(v => v.fecha.startsWith(mes)).reduce((s, v) => s + v.total, 0);
  const tAll = ventas.reduce((s, v) => s + v.total, 0);

  document.getElementById('stats-grid').innerHTML = `${extraStats()}
    <div class="stat"><div class="stat-label">Hoy</div><div class="stat-value">${fmt(tHoy)}</div><div class="stat-sub">${vHoy.length} venta${vHoy.length !== 1 ? 's' : ''}</div></div>
    <div class="stat"><div class="stat-label">Este mes</div><div class="stat-value">${fmt(tMes)}</div></div>
    <div class="stat"><div class="stat-label">Total histórico</div><div class="stat-value">${fmt(tAll)}</div></div>
    <div class="stat"><div class="stat-label">Transacciones</div><div class="stat-value">${ventas.length}</div></div>`;

  const lista = document.getElementById('historial-lista');
  if (!ventas.length) {
    lista.innerHTML = '<div class="empty"><div class="empty-icon">🍜</div><div class="empty-text">Aún no hay ventas registradas</div></div>';
    return;
  }

  const byDate = {};
  ventas.forEach(v => { (byDate[v.fecha] = byDate[v.fecha] || []).push(v); });
  const fechas = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  lista.innerHTML = fechas.map((f, i) => {
    const vs  = byDate[f];
    const tot = vs.reduce((s, v) => s + v.total, 0);
    return `<div class="dia-block">
      <div class="dia-toggle ${i === 0 ? 'open' : ''}" onclick="toggleDia('d${i}',this)">
        <span>📅</span>
        <span class="dia-fecha">${fechaLinda(f)}</span>
        <span class="dia-count">${vs.length} venta${vs.length > 1 ? 's' : ''}</span>
        <span class="dia-total">${fmt(tot)}</span>
        <button class="btn btn-danger btn-sm" style="margin-left:4px" onclick="event.stopPropagation();borrarDia('${f}')">Borrar día</button>
        <span class="dia-chevron">▶</span>
      </div>
      <div class="dia-ventas ${i === 0 ? 'open' : ''}" id="d${i}">
        <div class="table-wrap" style="margin-top:8px">
          <table>
            <thead><tr><th>Hora</th><th>Productos</th><th>Total</th><th>Recibido</th><th>Cambio</th><th></th></tr></thead>
            <tbody>${vs.map(v => `<tr>
              <td style="color:var(--muted)">${v.hora}</td>
              <td style="font-size:12px;color:var(--muted)">${v.items.map(i => i.nombre + ' ×' + i.qty).join(' · ')}</td>
              <td class="td-price">${fmt(v.total)}</td>
              <td>${v.pago ? fmt(v.pago) : '—'}</td>
              <td style="color:var(--green-light)">${v.cambio != null ? fmt(v.cambio) : '—'}</td>
              <td>
                <button class="btn btn-ghost btn-sm" onclick="abrirModal('${v.id}')">✏️ Editar</button>
                <button class="btn btn-ghost btn-sm" style="margin-left:4px" onclick="reabrirTicket('${v.id}')">🖨️</button>
              </td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
      </div>
    </div>`;
  }).join('');
}

function toggleDia(id, el) {
  document.getElementById(id).classList.toggle('open');
  el.classList.toggle('open');
}

function borrarDia(fecha) {
  if (!confirm(`¿Borrar todas las ventas del ${fechaLinda(fecha)}?`)) return;
  ventas = ventas.filter(v => v.fecha !== fecha);
  save();
  renderHistorial();
}

function borrarHistorial() {
  if (!confirm('¿Borrar TODO el historial? No se puede deshacer.')) return;
  ventas = [];
  save();
  renderHistorial();
}

// ══ STATS EXTRA ══

function extraStats() {
  if (!ventas.length) return '';
  const promedio  = ventas.reduce((s, v) => s + v.total, 0) / ventas.length;
  const productos = {};
  ventas.forEach(v => { v.items.forEach(i => { productos[i.nombre] = (productos[i.nombre] || 0) + i.qty; }); });
  const top = Object.entries(productos).sort((a, b) => b[1] - a[1])[0];
  const dias = {};
  ventas.forEach(v => { dias[v.fecha] = (dias[v.fecha] || 0) + v.total; });
  const mejorDia = Object.entries(dias).sort((a, b) => b[1] - a[1])[0];
  return `
    <div class="stat"><div class="stat-label">Promedio venta</div><div class="stat-value">${fmt(promedio)}</div></div>
    <div class="stat"><div class="stat-label">Producto top</div><div class="stat-value" style="font-size:14px">${top ? top[0] : '-'}</div></div>
    <div class="stat"><div class="stat-label">Mejor día</div><div class="stat-value">${mejorDia ? fmt(mejorDia[1]) : '-'}</div></div>
  `;
}

// ══ MODAL EDITAR VENTA ══

function abrirModal(id) {
  const v = ventas.find(x => x.id === id);
  if (!v) return;
  editId = id;
  document.getElementById('modal-sub').textContent = `${fechaLinda(v.fecha)} · ${v.hora}`;
  renderModalItems(v);
  document.getElementById('modal-bg').style.display = 'flex';
}

function renderModalItems(v) {
  document.getElementById('modal-items').innerHTML = v.items.map((item, idx) => `
    <div class="modal-row">
      <span class="modal-item-name">${item.nombre}</span>
      <input type="number" value="${item.qty}" min="0" id="mq${idx}" oninput="recalcModal()" style="padding:7px 10px">
      <input type="number" value="${item.precio}" min="0" id="mp${idx}" oninput="recalcModal()" style="padding:7px 10px">
      <span style="color:#ff6666;cursor:pointer;font-size:18px;text-align:center" onclick="this.parentElement.remove();recalcModal()">✕</span>
    </div>`).join('');
  recalcModal();
}

function recalcModal() {
  const rows = document.querySelectorAll('.modal-row');
  let total  = 0;
  rows.forEach((_, idx) => {
    const q = parseFloat(document.getElementById('mq' + idx)?.value) || 0;
    const p = parseFloat(document.getElementById('mp' + idx)?.value) || 0;
    total += q * p;
  });
  document.getElementById('modal-total').textContent = fmt(total);
}

function guardarEdicion() {
  const v = ventas.find(x => x.id === editId);
  if (!v) return;
  const rows  = document.querySelectorAll('.modal-row');
  const items = [];
  rows.forEach((_, idx) => {
    const q    = parseFloat(document.getElementById('mq' + idx)?.value) || 0;
    const p    = parseFloat(document.getElementById('mp' + idx)?.value) || 0;
    const name = document.querySelector('.modal-row:nth-child(' + (idx + 1) + ') .modal-item-name')?.textContent || '';
    if (q > 0) items.push({ id: v.items[idx]?.id || 0, nombre: name, precio: p, qty: q });
  });
  v.items = items;
  v.total = items.reduce((s, i) => s + i.precio * i.qty, 0);
  save();
  cerrarModal();
  renderHistorial();
}

function eliminarVenta() {
  if (!confirm('¿Eliminar esta venta del historial?')) return;
  ventas = ventas.filter(x => x.id !== editId);
  save();
  cerrarModal();
  renderHistorial();
}

function cerrarModal(e) {
  if (e && e.target !== document.getElementById('modal-bg')) return;
  document.getElementById('modal-bg').style.display = 'none';
  editId = null;
}

// ══ EXPORTAR CSV ══

function exportCSV() {
  if (!ventas.length) { alert('No hay ventas para exportar'); return; }
  let csv = 'Fecha,Hora,Total,Pago,Cambio\n';
  ventas.forEach(v => { csv += `${v.fecha},${v.hora},${v.total},${v.pago || ''},${v.cambio || ''}\n`; });
  const blob = new Blob([csv], { type: 'text/csv' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = 'ventas_gyoza_house.csv';
  a.click();
}
