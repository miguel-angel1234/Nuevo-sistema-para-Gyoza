/* Proveedores, compras y pagos */

function renderProveedorOptions(selectId, withEmpty = false) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = `${withEmpty ? '<option value="">Sin proveedor</option>' : ''}` +
    proveedores.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
}

function renderProveedores() {
  renderProveedorOptions('prov-compra-proveedor');
  renderProveedorOptions('prov-pago-proveedor');

  const q = (document.getElementById('prov-buscar').value || '').toLowerCase();
  const tbody = document.getElementById('prov-tbody');
  const lista = proveedores.filter(p => p.nombre.toLowerCase().includes(q));

  if (!lista.length) {
    tbody.innerHTML = '<tr><td colspan="5"><div class="empty">Sin proveedores</div></td></tr>';
  } else {
    tbody.innerHTML = lista.map(p => {
      const compras = comprasProveedor.filter(c => c.proveedorId === p.id).reduce((s, c) => s + c.total, 0);
      const pagos = pagosProveedor.filter(x => x.proveedorId === p.id).reduce((s, x) => s + x.monto, 0);
      const saldo = compras - pagos;
      return `<tr>
        <td class="td-name">${p.nombre}</td>
        <td>${p.telefono || '—'}</td>
        <td>${fmt(compras)}</td>
        <td>${fmt(pagos)}</td>
        <td style="color:${saldo > 0 ? '#ff8888' : '#52b788'}">${fmt(saldo)}</td>
      </tr>`;
    }).join('');
  }

  renderComprasProveedor();
  renderPagosProveedor();
}

function crearProveedor() {
  const nombre = document.getElementById('prov-nombre').value.trim();
  const tel = document.getElementById('prov-tel').value.trim();
  const contacto = document.getElementById('prov-contacto').value.trim();
  if (!nombre) return showAlert('alert-proveedores', 'err', 'Nombre obligatorio');
  proveedores.unshift({ id: 'prv' + Date.now(), nombre, telefono: tel, contacto, createdAt: new Date().toISOString() });
  saveProveedores();
  ['prov-nombre', 'prov-tel', 'prov-contacto'].forEach(id => document.getElementById(id).value = '');
  showAlert('alert-proveedores', 'ok', 'Proveedor guardado');
  renderProveedores();
}

function registrarCompraProveedor() {
  const proveedorId = document.getElementById('prov-compra-proveedor').value;
  const concepto = document.getElementById('prov-compra-concepto').value.trim();
  const monto = parseFloat(document.getElementById('prov-compra-monto').value) || 0;
  const fecha = document.getElementById('prov-compra-fecha').value || new Date().toISOString().split('T')[0];
  if (!proveedorId || !concepto || !monto) return showAlert('alert-proveedores', 'err', 'Completa compra (proveedor, concepto, monto).');
  comprasProveedor.unshift({ id: 'cp' + Date.now(), proveedorId, concepto, total: monto, fecha });
  saveProveedores();
  ['prov-compra-concepto', 'prov-compra-monto'].forEach(id => document.getElementById(id).value = '');
  renderProveedores();
}

function registrarPagoProveedor() {
  const proveedorId = document.getElementById('prov-pago-proveedor').value;
  const monto = parseFloat(document.getElementById('prov-pago-monto').value) || 0;
  const tipo = document.getElementById('prov-pago-tipo').value;
  const fecha = document.getElementById('prov-pago-fecha').value || new Date().toISOString().split('T')[0];
  const nota = document.getElementById('prov-pago-nota').value.trim();
  if (!proveedorId || !monto) return showAlert('alert-proveedores', 'err', 'Completa proveedor y monto para registrar pago/abono');
  pagosProveedor.unshift({ id: 'pg' + Date.now(), proveedorId, monto, tipo, fecha, nota });
  saveProveedores();
  ['prov-pago-monto', 'prov-pago-nota'].forEach(id => document.getElementById(id).value = '');
  renderProveedores();
}

function renderComprasProveedor() {
  const tb = document.getElementById('prov-compras-tbody');
  tb.innerHTML = comprasProveedor.slice(0, 60).map(c => {
    const p = proveedores.find(x => x.id === c.proveedorId);
    return `<tr><td>${c.fecha}</td><td>${p?.nombre || '—'}</td><td>${c.concepto}</td><td>${fmt(c.total)}</td></tr>`;
  }).join('') || '<tr><td colspan="4">Sin compras</td></tr>';
}

function renderPagosProveedor() {
  const tb = document.getElementById('prov-pagos-tbody');
  tb.innerHTML = pagosProveedor.slice(0, 60).map(c => {
    const p = proveedores.find(x => x.id === c.proveedorId);
    return `<tr><td>${c.fecha}</td><td>${p?.nombre || '—'}</td><td>${c.tipo}</td><td>${fmt(c.monto)}</td></tr>`;
  }).join('') || '<tr><td colspan="4">Sin pagos</td></tr>';
}