/* ═══════════════════════════════════════════════
   GYOZA HOUSE — logic/caja.js
   Lógica de apertura, cierre de caja y egresos.
   ═══════════════════════════════════════════════ */

// ══ APERTURA ══

function abrirModalApertura() {
  document.getElementById('modal-apertura-bg').style.display = 'flex';
}

function abrirCaja() {
  const cajero = document.getElementById('ap-cajero').value.trim();
  const monto  = parseFloat(document.getElementById('ap-monto').value) || 0;
  const nota   = document.getElementById('ap-nota').value.trim();
  if (!cajero) { showAlert('alert-caja', 'err', 'Escribe el nombre del cajero o turno.'); return; }
  const now = new Date();
  cajaActual = {
    id:             'cj' + Date.now(),
    cajero, nota,
    montoApertura:  monto,
    fechaApertura:  now.toISOString().split('T')[0],
    horaApertura:   now.toTimeString().slice(0, 5),
    ventasIds:      []
  };
  cajaAbierta = true;
  saveCaja();
  document.getElementById('modal-apertura-bg').style.display = 'none';
  ['ap-cajero', 'ap-monto', 'ap-nota'].forEach(id => document.getElementById(id).value = '');
  renderDashboard();
}

// ══ CIERRE ══

function abrirModalCierre() {
  if (!cajaActual) return;
  const vsTurno          = ventasDelTurno();
  const totalVentas      = vsTurno.reduce((s, v) => s + v.total, 0);
  const egresosTurno     = egresosDelTurno();
  const totalEgresos     = egresosTurno.reduce((s, e) => s + e.monto, 0);
  const efectivoEsperado = cajaActual.montoApertura + totalVentas - totalEgresos;
  const fechaA           = fechaLinda(cajaActual.fechaApertura);
  document.getElementById('cierre-sub').textContent = `${cajaActual.cajero} · desde ${fechaA} ${cajaActual.horaApertura}`;
  document.getElementById('cierre-resumen').innerHTML = `
    <div class="historial-cierre-card" style="margin:0 0 4px">
      <div class="cierre-linea"><span class="cl-lbl">Apertura de caja</span><span class="cl-val">${fmt(cajaActual.montoApertura)}</span></div>
      <div class="cierre-linea"><span class="cl-lbl">Ventas del turno</span><span class="cl-val green">${fmt(totalVentas)}</span></div>
      <div class="cierre-linea"><span class="cl-lbl">Transacciones</span><span class="cl-val">${vsTurno.length}</span></div>
      <div class="cierre-linea"><span class="cl-lbl">Egresos del turno</span><span class="cl-val red">-${fmt(totalEgresos)}</span></div>
      <div class="cierre-linea big"><span class="cl-lbl">Efectivo esperado en caja</span><span class="cl-val gold">${fmt(efectivoEsperado)}</span></div>
    </div>`;
  document.getElementById('cierre-contado').value       = '';
  document.getElementById('cierre-diferencia').innerHTML = '';
  document.getElementById('modal-cierre-bg').style.display = 'flex';
}

function recalcCierre() {
  if (!cajaActual) return;
  const vsTurno          = ventasDelTurno();
  const totalVentas      = vsTurno.reduce((s, v) => s + v.total, 0);
  const totalEgresos     = egresosDelTurno().reduce((s, e) => s + e.monto, 0);
  const efectivoEsperado = cajaActual.montoApertura + totalVentas - totalEgresos;
  const contado          = parseFloat(document.getElementById('cierre-contado').value);
  if (isNaN(contado)) { document.getElementById('cierre-diferencia').innerHTML = ''; return; }
  const dif   = contado - efectivoEsperado;
  const color = dif === 0 ? '#52b788' : dif > 0 ? '#8ab4f8' : '#ff6666';
  const label = dif === 0 ? '✅ Caja cuadra perfectamente'
              : dif > 0   ? `📈 Sobrante de ${fmt(Math.abs(dif))}`
              :              `📉 Faltante de ${fmt(Math.abs(dif))}`;
  document.getElementById('cierre-diferencia').innerHTML =
    `<div style="background:${color}18;border:1px solid ${color}44;border-radius:10px;padding:12px 16px;font-size:14px;font-weight:700;color:${color};text-align:center">${label}</div>`;
}

function cerrarCaja() {
  if (!cajaActual) return;
  const contado = parseFloat(document.getElementById('cierre-contado').value);
  if (isNaN(contado) || document.getElementById('cierre-contado').value === '') {
    alert('Ingresa el efectivo contado en caja.');
    return;
  }
  const nota             = document.getElementById('cierre-nota').value.trim();
  const vsTurno          = ventasDelTurno();
  const egresosTurno     = egresosDelTurno();
  const totalVentas      = vsTurno.reduce((s, v) => s + v.total, 0);
  const totalEgresos     = egresosTurno.reduce((s, e) => s + e.monto, 0);
  const efectivoEsperado = cajaActual.montoApertura + totalVentas - totalEgresos;
  const now = new Date();
  const cierre = {
    ...cajaActual,
    fechaCierre:      now.toISOString().split('T')[0],
    horaCierre:       now.toTimeString().slice(0, 5),
    totalVentas, totalEgresos,
    transacciones:    vsTurno.length,
    efectivoEsperado, efectivoContado: contado,
    diferencia:       contado - efectivoEsperado,
    notaCierre:       nota
  };
  cajaHistorial.unshift(cierre);
  cajaActual  = null;
  cajaAbierta = false;
  saveCaja();
  document.getElementById('modal-cierre-bg').style.display = 'none';
  renderDashboard();
}

// ══ EGRESOS ══

function abrirModalEgreso() {
  if (!cajaActual) { alert('Primero debes abrir la caja.'); return; }
  ['eg-monto', 'eg-desc', 'eg-cajero'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('eg-cat').value    = 'insumos';
  document.getElementById('eg-cajero').value = cajaActual.cajero || '';
  actualizarSaldoEgreso();
  document.getElementById('modal-egreso-bg').style.display = 'flex';
}

function actualizarSaldoEgreso() {
  if (!cajaActual) return;
  const vsTurno     = ventasDelTurno();
  const totalVentas = vsTurno.reduce((s, v) => s + v.total, 0);
  const totalEgr    = egresosDelTurno().reduce((s, e) => s + e.monto, 0);
  const saldoActual = cajaActual.montoApertura + totalVentas - totalEgr;
  const el = document.getElementById('eg-saldo-actual');
  if (el) el.textContent = fmt(saldoActual);
}

function registrarEgreso() {
  const monto  = parseFloat(document.getElementById('eg-monto').value);
  const cat    = document.getElementById('eg-cat').value;
  const desc   = document.getElementById('eg-desc').value.trim();
  const cajero = document.getElementById('eg-cajero').value.trim();
  if (!monto || monto <= 0) { showAlertEgreso('err', 'Ingresa un monto válido.'); return; }
  if (!desc)                { showAlertEgreso('err', 'Describe el gasto brevemente.'); return; }
  if (!cajero)              { showAlertEgreso('err', 'Indica quién registra el egreso.'); return; }
  const vsTurno     = ventasDelTurno();
  const totalVentas = vsTurno.reduce((s, v) => s + v.total, 0);
  const totalEgr    = egresosDelTurno().reduce((s, e) => s + e.monto, 0);
  const saldo       = cajaActual.montoApertura + totalVentas - totalEgr;
  if (monto > saldo) { showAlertEgreso('err', `Saldo insuficiente. Disponible: ${fmt(saldo)}`); return; }
  const now = new Date();
  egresos.push({
    id:     'eg' + Date.now(),
    cajaId: cajaActual.id,
    fecha:  now.toISOString().split('T')[0],
    hora:   now.toTimeString().slice(0, 5),
    monto, cat, desc, cajero
  });
  saveEgresos();
  document.getElementById('modal-egreso-bg').style.display = 'none';
  renderDashboard();
  showAlert('alert-ventas', 'ok', `💸 Egreso registrado — ${fmt(monto)} · ${desc}`);
}

function eliminarEgreso(id) {
  if (!confirm('¿Eliminar este egreso?')) return;
  egresos = egresos.filter(e => e.id !== id);
  saveEgresos();
  renderDashboard();
}
