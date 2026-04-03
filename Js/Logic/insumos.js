/* ═══════════════════════════════════════════════
   GYOZA HOUSE — logic/insumos.js
   Insumos, recetas y trazabilidad de consumo.
   ═══════════════════════════════════════════════ */

let editandoRecetaProdId = null;

// ══ RENDER PRINCIPAL ══

function renderInsumos() {
  renderInsumosAlertas();
  renderInsumosStats();
  renderInsumosTabla();
  renderRecetas();
  renderHistorialConsumo();
  const opts = insumos.map(i => `<option value="${i.id}">${i.nombre} (${i.unidad})</option>`).join('');
  document.getElementById('ins-ent-prod').innerHTML = opts || '<option>Sin insumos</option>';
  document.getElementById('ins-adj-prod').innerHTML = opts || '<option>Sin insumos</option>';
  const fp    = document.getElementById('receta-filtro-prod');
  const curVal = fp.value;
  fp.innerHTML = '<option value="">Todos los productos</option>' +
    prods.map(p => `<option value="${p.id}" ${curVal == p.id ? 'selected' : ''}>${p.nombre}</option>`).join('');
}

function renderInsumosAlertas() {
  const wrap  = document.getElementById('insumos-alertas-wrap');
  const bajos = insumos.filter(i => i.minimo > 0 && i.stock <= i.minimo);
  if (!bajos.length) { wrap.innerHTML = ''; return; }
  wrap.innerHTML = `<div class="ins-alert-bar">
    <span class="ial-title">⚠️ Stock bajo</span>
    ${bajos.map(i => `<span class="ins-alert-chip">🥢 ${i.nombre}: <b>${i.stock} ${i.unidad}</b></span>`).join('')}
  </div>`;
}

function renderInsumosStats() {
  const total    = insumos.length;
  const bajos    = insumos.filter(i => i.minimo > 0 && i.stock <= i.minimo).length;
  const agotados = insumos.filter(i => i.stock <= 0).length;
  const entradas = consumoLog.filter(l => l.tipo === 'entrada').length;
  document.getElementById('insumos-stats').innerHTML = `
    <div class="stat"><div class="stat-label">Total insumos</div><div class="stat-value">${total}</div></div>
    <div class="stat"><div class="stat-label">Stock bajo</div><div class="stat-value" style="color:${bajos ? '#e8a040' : 'inherit'}">${bajos}</div><div class="stat-sub">Por debajo del mínimo</div></div>
    <div class="stat"><div class="stat-label">Agotados</div><div class="stat-value" style="color:${agotados ? '#ff6666' : 'inherit'}">${agotados}</div></div>
    <div class="stat"><div class="stat-label">Entradas registradas</div><div class="stat-value">${entradas}</div></div>`;
}

function renderInsumosTabla() {
  const tbody = document.getElementById('ins-tbody');
  if (!insumos.length) {
    tbody.innerHTML = '<tr><td colspan="7"><div class="ins-empty">🥢 Sin insumos registrados aún</div></td></tr>';
    return;
  }
  tbody.innerHTML = insumos.map(ins => {
    const tag = ins.stock <= 0 ? '<span class="tag tag-bad">Agotado</span>'
              : (ins.minimo > 0 && ins.stock <= ins.minimo) ? '<span class="tag tag-warn">Bajo</span>'
              : '<span class="tag tag-ok">OK</span>';
    return `<tr>
      <td class="td-name">${ins.nombre}</td>
      <td style="color:var(--muted)">${ins.cat || '—'}</td>
      <td><b>${+ins.stock.toFixed(3)}</b></td>
      <td style="color:var(--muted)">${ins.unidad}</td>
      <td style="color:var(--muted)">${ins.minimo || '—'}</td>
      <td>${tag}</td>
      <td><button class="btn btn-danger btn-sm" onclick="eliminarInsumo(${ins.id})">Eliminar</button></td>
    </tr>`;
  }).join('');
}

// ══ CRUD INSUMOS ══

function guardarInsumo() {
  const nombre = document.getElementById('ins-nombre').value.trim();
  const unidad = document.getElementById('ins-unidad').value;
  const cat    = document.getElementById('ins-cat').value.trim();
  const stock  = parseFloat(document.getElementById('ins-stock').value) || 0;
  const minimo = parseFloat(document.getElementById('ins-minimo').value) || 0;
  if (!nombre) { showAlert('alert-insumos', 'err', 'El nombre del insumo es obligatorio.'); return; }
  insumos.push({ id: Date.now(), nombre, unidad, cat, stock, minimo });
  saveInsumos();
  showAlert('alert-insumos', 'ok', `✅ Insumo "${nombre}" guardado.`);
  ['ins-nombre', 'ins-stock', 'ins-minimo', 'ins-cat'].forEach(id => document.getElementById(id).value = '');
  renderInsumos();
}

function eliminarInsumo(id) {
  if (!confirm('¿Eliminar este insumo? También se eliminarán sus recetas.')) return;
  insumos = insumos.filter(i => i.id !== id);
  recetas = recetas.filter(r => !r.ingredientes.some(ig => ig.insumoId === id));
  saveInsumos();
  renderInsumos();
}

function registrarEntradaInsumo() {
  const id    = parseInt(document.getElementById('ins-ent-prod').value);
  const qty   = parseFloat(document.getElementById('ins-ent-qty').value) || 0;
  const costo = parseFloat(document.getElementById('ins-ent-costo').value) || null;
  const nota  = document.getElementById('ins-ent-nota').value.trim();
  if (!qty) { showAlert('alert-insumos', 'err', 'Indica la cantidad que ingresó.'); return; }
  const ins = insumos.find(i => i.id === id);
  if (!ins) return;
  ins.stock += qty;
  const now = new Date();
  consumoLog.unshift({
    tipo: 'entrada',
    fecha: now.toISOString().split('T')[0],
    hora:  now.toTimeString().slice(0, 5),
    desc:  `+${qty} ${ins.unidad} de "${ins.nombre}"${costo ? ' — $' + Math.round(costo).toLocaleString('es-CO') + '/' + ins.unidad : ''}${nota ? ' · ' + nota : ''}`,
    insumoId: id
  });
  saveInsumos();
  showAlert('alert-insumos', 'ok', `✅ +${qty} ${ins.unidad} agregados a "${ins.nombre}".`);
  document.getElementById('ins-ent-qty').value   = '';
  document.getElementById('ins-ent-costo').value = '';
  document.getElementById('ins-ent-nota').value  = '';
  renderInsumos();
}

function ajustarStockInsumo() {
  const id  = parseInt(document.getElementById('ins-adj-prod').value);
  const qty = parseFloat(document.getElementById('ins-adj-qty').value);
  if (isNaN(qty)) { showAlert('alert-insumos', 'err', 'Indica el nuevo stock.'); return; }
  const ins = insumos.find(i => i.id === id);
  if (!ins) return;
  const anterior = ins.stock;
  ins.stock = qty;
  const now = new Date();
  consumoLog.unshift({
    tipo: 'ajuste',
    fecha: now.toISOString().split('T')[0],
    hora:  now.toTimeString().slice(0, 5),
    desc:  `Ajuste "${ins.nombre}": ${anterior} → ${qty} ${ins.unidad}`,
    insumoId: id
  });
  saveInsumos();
  showAlert('alert-insumos', 'ok', `✅ Stock de "${ins.nombre}" ajustado a ${qty} ${ins.unidad}.`);
  document.getElementById('ins-adj-qty').value = '';
  renderInsumos();
}

// ══ RECETAS ══

function abrirModalReceta(prodId = null) {
  const sel = document.getElementById('receta-prod-sel');
  sel.innerHTML = prods.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
  if (prodId) sel.value = prodId;
  document.getElementById('receta-ingredientes').innerHTML = '';
  if (prodId) {
    const r = recetas.find(r => r.prodId == prodId);
    if (r) r.ingredientes.forEach(ig => addIngredienteRow(ig.insumoId, ig.cantidad));
    else addIngredienteRow();
  } else {
    addIngredienteRow();
  }
  editandoRecetaProdId = prodId;
  document.getElementById('modal-receta-bg').style.display = 'flex';
}

function cerrarModalReceta(e) {
  if (e && e.target !== document.getElementById('modal-receta-bg')) return;
  document.getElementById('modal-receta-bg').style.display = 'none';
}

function addIngredienteRow(insumoId = null, cantidad = null) {
  const cont = document.getElementById('receta-ingredientes');
  const idx  = cont.children.length;
  const opts = insumos.map(i => `<option value="${i.id}" ${insumoId == i.id ? 'selected' : ''}>${i.nombre} (${i.unidad})</option>`).join('');
  const div  = document.createElement('div');
  div.className = 'receta-row';
  div.innerHTML = `
    <select>${opts || '<option>Sin insumos</option>'}</select>
    <input type="number" placeholder="Cantidad" value="${cantidad ?? ''}" min="0" step="any" style="padding:8px 10px">
    <span style="font-size:11px;color:var(--muted)" id="rr-unidad-${idx}"></span>
    <span style="color:#ff6666;cursor:pointer;font-size:18px;text-align:center" onclick="this.parentElement.remove()">✕</span>`;
  const selEl = div.querySelector('select');
  const updateUnidad = () => {
    const ins = insumos.find(i => i.id == selEl.value);
    div.querySelector(`#rr-unidad-${idx}`).textContent = ins ? ins.unidad : '';
  };
  selEl.addEventListener('change', updateUnidad);
  cont.appendChild(div);
  updateUnidad();
}

function guardarReceta() {
  const prodId = parseInt(document.getElementById('receta-prod-sel').value);
  const rows   = document.getElementById('receta-ingredientes').children;
  const ingredientes = [];
  for (const row of rows) {
    const sel     = row.querySelector('select');
    const inp     = row.querySelector('input');
    const insumoId = parseInt(sel?.value);
    const cantidad = parseFloat(inp?.value) || 0;
    if (!insumoId || !cantidad) continue;
    ingredientes.push({ insumoId, cantidad });
  }
  if (!ingredientes.length) { alert('Agrega al menos un ingrediente con cantidad.'); return; }
  const idx = recetas.findIndex(r => r.prodId === prodId);
  if (idx >= 0) recetas[idx] = { prodId, ingredientes };
  else          recetas.push({ prodId, ingredientes });
  saveInsumos();
  document.getElementById('modal-receta-bg').style.display = 'none';
  renderInsumos();
  showAlert('alert-insumos', 'ok', '✅ Receta guardada correctamente.');
}

function renderRecetas() {
  const lista   = document.getElementById('recetas-lista');
  const filtro  = parseInt(document.getElementById('receta-filtro-prod').value) || null;
  const lista_r = filtro ? recetas.filter(r => r.prodId === filtro) : recetas;
  if (!lista_r.length) {
    lista.innerHTML = `<div class="ins-empty">Sin recetas configuradas aún · <button class="btn btn-ghost btn-sm" onclick="abrirModalReceta()" style="margin-left:8px">+ Crear primera receta</button></div>`;
    return;
  }
  lista.innerHTML = lista_r.map(r => {
    const prod = prods.find(p => p.id === r.prodId);
    const tags = r.ingredientes.map(ig => {
      const ins = insumos.find(i => i.id === ig.insumoId);
      return `<span class="receta-tag">🥢 ${ins ? ins.nombre : '?'} · ${ig.cantidad} ${ins ? ins.unidad : ''}</span>`;
    }).join('');
    return `<div class="receta-card">
      <div style="flex:1;min-width:160px">
        <div class="receta-card-title">🍜 ${prod ? prod.nombre : 'Producto eliminado'}</div>
        <div class="receta-tags">${tags || '<span style="color:var(--muted);font-size:12px">Sin ingredientes</span>'}</div>
      </div>
      <div class="receta-actions">
        <button class="btn btn-ghost btn-sm" onclick="abrirModalReceta(${r.prodId})">✏️ Editar</button>
        <button class="btn btn-danger btn-sm" onclick="eliminarReceta(${r.prodId})">Eliminar</button>
      </div>
    </div>`;
  }).join('');
}

function eliminarReceta(prodId) {
  if (!confirm('¿Eliminar esta receta?')) return;
  recetas = recetas.filter(r => r.prodId !== prodId);
  saveInsumos();
  renderInsumos();
}

// ══ HISTORIAL DE CONSUMO ══

function renderHistorialConsumo() {
  const lista = document.getElementById('consumo-lista');
  if (!consumoLog.length) {
    lista.innerHTML = '<div class="ins-empty">Sin movimientos registrados aún</div>';
    return;
  }
  lista.innerHTML = consumoLog.slice(0, 80).map(l => {
    const cls = l.tipo === 'entrada' ? 'ci-tipo-entrada' : l.tipo === 'ajuste' ? 'ci-tipo-ajuste' : 'ci-tipo-consumo';
    const lbl = l.tipo === 'entrada' ? '↑ Entrada'       : l.tipo === 'ajuste' ? '↕ Ajuste'       : '↓ Consumo';
    return `<div class="consumo-item">
      <span class="ci-fecha">📅 ${fechaLinda(l.fecha)} · ${l.hora || ''}</span>
      <span class="ci-desc">${l.desc}</span>
      <span class="ci-tipo ${cls}">${lbl}</span>
    </div>`;
  }).join('');
}

// ══ EXPORTAR CSV INSUMOS ══

function exportInsumosCSV() {
  if (!insumos.length) { alert('No hay insumos para exportar.'); return; }
  let csv = 'Nombre,Categoría,Stock,Unidad,Mínimo\n';
  insumos.forEach(i => { csv += `${i.nombre},${i.cat || ''},${i.stock},${i.unidad},${i.minimo || ''}\n`; });
  const blob = new Blob([csv], { type: 'text/csv' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = 'insumos_gyoza_house.csv';
  a.click();
}
