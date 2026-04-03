/* ═══════════════════════════════════════════════
   GYOZA HOUSE — logic/inventario.js
   Lógica de inventario de productos.
   ═══════════════════════════════════════════════ */

function renderInv() {
  document.getElementById('ent-prod').innerHTML =
    prods.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');

  const tbody = document.getElementById('inv-tbody');
  if (!prods.length) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty">Sin productos registrados</div></td></tr>';
    return;
  }
  tbody.innerHTML = prods.map(p => {
    const tag = p.stock === 0 ? '<span class="tag tag-bad">Agotado</span>'
              : p.stock <= 5  ? '<span class="tag tag-warn">Bajo</span>'
              :                  '<span class="tag tag-ok">Disponible</span>';
    return `<tr>
      <td class="td-name">${p.nombre}</td>
      <td style="color:var(--muted)">${p.cat || '—'}</td>
      <td class="td-price">${fmt(p.precio)}</td>
      <td><b>${p.stock}</b></td>
      <td>${tag}</td>
      <td><button class="btn btn-danger btn-sm" onclick="eliminarProd(${p.id})">Eliminar</button></td>
    </tr>`;
  }).join('');
}

function guardarProd() {
  const nombre = document.getElementById('inv-nombre').value.trim();
  const precio = parseFloat(document.getElementById('inv-precio').value);
  const stock  = parseInt(document.getElementById('inv-stock').value) || 0;
  const cat    = document.getElementById('inv-cat').value.trim();
  if (!nombre || isNaN(precio)) {
    showAlert('alert-inv', 'err', 'Nombre y precio son obligatorios.');
    return;
  }
  prods.push({ id: Date.now(), nombre, precio, stock, cat });
  save();
  showAlert('alert-inv', 'ok', 'Producto guardado correctamente.');
  ['inv-nombre', 'inv-precio', 'inv-stock', 'inv-cat'].forEach(id => document.getElementById(id).value = '');
  renderInv();
}

function registrarEntrada() {
  const pid = parseInt(document.getElementById('ent-prod').value);
  const qty = parseInt(document.getElementById('ent-qty').value) || 0;
  if (!qty) { showAlert('alert-inv', 'err', 'Indica la cantidad que ingresó.'); return; }
  const p = prods.find(x => x.id === pid);
  if (p) {
    p.stock += qty;
    save();
    showAlert('alert-inv', 'ok', `+${qty} unidades agregadas a "${p.nombre}".`);
    renderInv();
  }
}

function eliminarProd(pid) {
  if (!confirm('¿Eliminar este producto?')) return;
  prods = prods.filter(x => x.id !== pid);
  save();
  renderInv();
}
