/* ═══════════════════════════════════════════════
   GYOZA HOUSE — dashboard-fix.js
   Reemplaza completamente ui/dashboard.js

   CAMBIO RESPECTO AL ORIGINAL:
   renderDashboard() ahora llama primero a
   renderBannerRecuperacion() (definida en
   caja-fix.js) para mostrar el aviso naranja
   cuando el navegador se reinicia con caja abierta.
   ═══════════════════════════════════════════════ */

let _dashChartSemana = null;
let _dashChartHoras  = null;

function renderDashboard() {
  renderBannerRecuperacion();   // ← NUEVO: aviso de sesión recuperada
  renderDashCajaBanner();
  renderDashStats();
  renderDashChartSemana();
  renderDashTopProds();
  renderDashChartHoras();
  renderDashInsumosCriticos();
  renderDashUltimoCierre();
  renderEgresosTurno();
}

function renderDashCajaBanner() {
  const wrap = document.getElementById('dash-caja-banner');
  const now  = new Date();
  if (cajaActual) {
    const vsTurno    = ventasDelTurno();
    const totalTurno = vsTurno.reduce((s, v) => s + v.total, 0);
    wrap.className = 'dash-caja-banner abierta';
    wrap.innerHTML = `
      <div class="dcb-info">
        <span class="dcb-estado ok">✅ Caja abierta</span>
        <span class="dcb-detalle">👤 ${cajaActual.cajero} · desde ${cajaActual.fechaApertura === now.toISOString().split('T')[0] ? 'hoy' : fechaLinda(cajaActual.fechaApertura)} ${cajaActual.horaApertura}</span>
        <span class="dcb-detalle" style="margin-top:2px">Apertura: ${fmt(cajaActual.montoApertura)} · <span style="color:var(--green-light);font-weight:600">${vsTurno.length} ventas · +${fmt(totalTurno)}</span></span>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">
        <span class="dcb-monto">${fmt(cajaActual.montoApertura + totalTurno - egresosDelTurno().reduce((s, e) => s + e.monto, 0))}</span>
        <div class="dcb-actions">
          <button class="btn btn-danger btn-sm" onclick="abrirModalCierre()">🔒 Cerrar caja</button>
          <button class="btn btn-sm" style="background:rgba(200,16,46,.18);color:#ff8888;border:1px solid rgba(200,16,46,.35)" onclick="abrirModalEgreso()">💸 Registrar egreso</button>
        </div>
      </div>`;
    setTimeout(renderEgresosTurno, 0);
  } else {
    const ultimo = cajaHistorial[0];
    wrap.className = 'dash-caja-banner cerrada';
    wrap.innerHTML = `
      <div class="dcb-info">
        <span class="dcb-estado bad">🔴 Caja cerrada</span>
        <span class="dcb-detalle">${ultimo ? 'Último cierre: ' + fechaLinda(ultimo.fechaCierre) + ' ' + ultimo.horaCierre + ' · ' + ultimo.cajero : 'Sin historial de caja aún'}</span>
        ${ultimo ? `<span class="dcb-detalle" style="margin-top:2px">Contado: ${fmt(ultimo.efectivoContado)} · Diferencia: <span style="color:${ultimo.diferencia === 0 ? '#52b788' : ultimo.diferencia > 0 ? '#8ab4f8' : '#ff6666'};font-weight:600">${ultimo.diferencia >= 0 ? '+' : ''}${fmt(ultimo.diferencia)}</span></span>` : ''}
      </div>
      <div class="dcb-actions">
        <button class="btn btn-red" onclick="abrirModalApertura()">🏮 Abrir caja</button>
      </div>`;
  }
}

function renderDashStats() {
  const hoy   = new Date().toISOString().split('T')[0];
  const mes   = hoy.slice(0, 7);
  const vHoy  = ventas.filter(v => v.fecha === hoy);
  const vMes  = ventas.filter(v => v.fecha.startsWith(mes));
  const tHoy  = vHoy.reduce((s, v) => s + v.total, 0);
  const tMes  = vMes.reduce((s, v) => s + v.total, 0);
  const promHoy = vHoy.length ? tHoy / vHoy.length : 0;

  let vsTurnoLen = 0, tTurno = 0;
  if (cajaActual) {
    const vsTurno = ventasDelTurno();
    vsTurnoLen = vsTurno.length;
    tTurno     = vsTurno.reduce((s, v) => s + v.total, 0);
  }

  document.getElementById('dash-stats').innerHTML = `
    <div class="stat">
      <div class="stat-label">Ventas hoy</div>
      <div class="stat-value">${fmt(tHoy)}</div>
      <div class="stat-sub">${vHoy.length} transacciones</div>
    </div>
    <div class="stat">
      <div class="stat-label">Este mes</div>
      <div class="stat-value">${fmt(tMes)}</div>
      <div class="stat-sub">${vMes.length} ventas</div>
    </div>
    <div class="stat">
      <div class="stat-label">Turno actual</div>
      <div class="stat-value">${cajaActual ? fmt(tTurno) : '—'}</div>
      <div class="stat-sub">${cajaActual ? vsTurnoLen + ' ventas' : 'Caja cerrada'}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Ticket promedio</div>
      <div class="stat-value">${vHoy.length ? fmt(promHoy) : '—'}</div>
      <div class="stat-sub">Promedio del día</div>
    </div>`;
}

function renderDashChartSemana() {
  const ctx = document.getElementById('dash-chart-semana')?.getContext('2d');
  if (!ctx) return;
  if (_dashChartSemana) { _dashChartSemana.destroy(); _dashChartSemana = null; }
  const dias = [], labels = [];
  for (let i = 6; i >= 0; i--) {
    const d   = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const lbl = d.toLocaleDateString('es-CO', { weekday: 'short' });
    dias.push(ventas.filter(v => v.fecha === key).reduce((s, v) => s + v.total, 0));
    labels.push(lbl);
  }
  const max = Math.max(...dias);
  _dashChartSemana = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: dias,
        backgroundColor: dias.map(v => v === max && max > 0 ? 'rgba(200,16,46,0.85)' : 'rgba(200,16,46,0.25)'),
        borderRadius: 5, borderWidth: 0
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ' ' + fmt(c.raw) } } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#888', font: { size: 10 } } },
        y: { display: false, beginAtZero: true }
      }
    }
  });
}

function renderDashTopProds() {
  const cont = document.getElementById('dash-top-prods');
  const map  = {};
  ventas.forEach(v => {
    v.items.forEach(i => {
      if (!map[i.nombre]) map[i.nombre] = { qty: 0, total: 0 };
      map[i.nombre].qty   += i.qty;
      map[i.nombre].total += i.precio * i.qty;
    });
  });
  const top = Object.entries(map).sort((a, b) => b[1].qty - a[1].qty).slice(0, 5);
  if (!top.length) {
    cont.innerHTML = '<div style="color:var(--muted);font-size:13px;font-style:italic;padding:8px 0">Sin ventas aún</div>';
    return;
  }
  cont.innerHTML = top.map(([nombre, d], i) => `
    <div class="top-prod-row">
      <span class="tpr-rank">${i + 1}</span>
      <span class="tpr-name">${nombre}</span>
      <span class="tpr-qty">${d.qty} uds</span>
      <span class="tpr-total">${fmt(d.total)}</span>
    </div>`).join('');
}

function renderDashChartHoras() {
  const ctx2 = document.getElementById('dash-chart-horas')?.getContext('2d');
  if (!ctx2) return;
  if (_dashChartHoras) { _dashChartHoras.destroy(); _dashChartHoras = null; }
  const horasMap = {};
  ventas.forEach(v => {
    const h = (v.hora || '00:00').split(':')[0] + ':00';
    horasMap[h] = (horasMap[h] || 0) + v.total;
  });
  const labelsH = Object.keys(horasMap).sort();
  const horas   = labelsH.map(h => horasMap[h]);
  const max     = Math.max(...horas);
  _dashChartHoras = new Chart(ctx2, {
    type: 'bar',
    data: {
      labels: labelsH,
      datasets: [{
        data: horas,
        backgroundColor: horas.map(v => v === max && max > 0 ? 'rgba(200,16,46,0.85)' : 'rgba(200,16,46,0.18)'),
        borderRadius: 3, borderWidth: 0
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ' ' + fmt(c.raw) } } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#888', font: { size: 9 }, maxRotation: 0 } },
        y: { display: false, beginAtZero: true }
      }
    }
  });
}

function renderDashInsumosCriticos() {
  const cont     = document.getElementById('dash-insumos-criticos');
  const criticos = insumos
    .filter(i => i.stock <= 0 || (i.minimo > 0 && i.stock <= i.minimo))
    .sort((a, b) => (a.stock / Math.max(a.minimo, 1)) - (b.stock / Math.max(b.minimo, 1)));
  if (!criticos.length) {
    cont.innerHTML = '<div style="display:flex;align-items:center;gap:10px;padding:10px 0"><span style="font-size:24px">✅</span><span style="color:var(--green-light);font-size:13px;font-weight:600">Todos los insumos en nivel seguro</span></div>';
    return;
  }
  cont.innerHTML = criticos.slice(0, 6).map(i => {
    const pct   = i.minimo > 0 ? Math.round((i.stock / i.minimo) * 100) : 0;
    const color = i.stock <= 0 ? '#ff6666' : '#e8a040';
    return `<div style="padding:7px 0;border-bottom:1px solid rgba(255,255,255,.05)">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:12px;font-weight:600;color:var(--white)">${i.nombre}</span>
        <span style="font-size:12px;color:${color};font-weight:700">${i.stock <= 0 ? 'AGOTADO' : i.stock + ' ' + i.unidad}</span>
      </div>
      <div style="height:4px;background:rgba(255,255,255,.08);border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${Math.min(pct, 100)}%;background:${color};border-radius:4px;transition:width .4s"></div>
      </div>
    </div>`;
  }).join('');
}

function renderDashUltimoCierre() {
  const cont = document.getElementById('dash-ultimo-cierre');
  if (!cajaHistorial.length) {
    cont.innerHTML = '<div class="ins-empty" style="padding:20px 0">Sin cierres registrados aún · <button class="btn btn-red btn-sm" onclick="abrirModalApertura()" style="margin-left:8px">Abrir primera caja</button></div>';
    return;
  }
  const c        = cajaHistorial[0];
  const difColor = c.diferencia === 0 ? '#52b788' : c.diferencia > 0 ? '#8ab4f8' : '#ff6666';
  const difLabel = c.diferencia === 0 ? 'Cuadra ✅'
                 : c.diferencia > 0   ? `Sobrante ${fmt(c.diferencia)} 📈`
                 :                      `Faltante ${fmt(Math.abs(c.diferencia))} 📉`;
  cont.innerHTML = `
    <div class="historial-cierre-card">
      <div class="hcc-header">
        <div>
          <div class="hcc-fecha">${fechaLinda(c.fechaCierre)} · ${c.horaCierre}</div>
          <div class="hcc-cajero">👤 ${c.cajero}${c.notaCierre ? ' · ' + c.notaCierre : ''}</div>
        </div>
        <div class="hcc-total">${fmt(c.totalVentas)}</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:4px">
        <div style="text-align:center;padding:10px;background:rgba(200,16,46,.06);border-radius:10px;border:1px solid rgba(200,16,46,.12)">
          <div style="font-size:10px;color:var(--muted);letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px">Apertura</div>
          <div style="font-size:15px;font-weight:700;color:var(--white)">${fmt(c.montoApertura)}</div>
        </div>
        <div style="text-align:center;padding:10px;background:rgba(45,106,79,.08);border-radius:10px;border:1px solid rgba(45,106,79,.2)">
          <div style="font-size:10px;color:var(--muted);letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px">Ventas</div>
          <div style="font-size:15px;font-weight:700;color:var(--green-light)">${fmt(c.totalVentas)}</div>
        </div>
        <div style="text-align:center;padding:10px;background:${difColor}11;border-radius:10px;border:1px solid ${difColor}33">
          <div style="font-size:10px;color:var(--muted);letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px">Diferencia</div>
          <div style="font-size:13px;font-weight:700;color:${difColor}">${difLabel}</div>
        </div>
      </div>
    </div>
    ${cajaHistorial.length > 1 ? `<div style="margin-top:4px;font-size:12px;color:var(--muted);text-align:right">+${cajaHistorial.length - 1} cierre${cajaHistorial.length > 2 ? 's' : ''} anterior${cajaHistorial.length > 2 ? 'es' : ''} en historial</div>` : ''}`;
}

function renderEgresosTurno() {
  const cont = document.getElementById('dash-egresos-turno');
  if (!cont) return;
  const lista = egresosDelTurno();
  if (!lista.length) {
    cont.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:12px 0;font-style:italic">Sin egresos en este turno</div>';
    return;
  }
  const total = lista.reduce((s, e) => s + e.monto, 0);
  cont.innerHTML = lista.map(e => {
    const cat = EGRESO_CATS[e.cat] || EGRESO_CATS.otros;
    return `<div class="egreso-item">
      <span class="egreso-cat ${cat.cls}">${cat.emoji} ${cat.label}</span>
      <span class="egreso-desc">${e.desc} <span style="color:var(--muted);font-size:11px">· ${e.cajero}</span></span>
      <span class="egreso-hora">${e.hora}</span>
      <span class="egreso-monto">-${fmt(e.monto)}</span>
      <span style="color:#ff6666;cursor:pointer;font-size:14px;opacity:.6"
            onclick="eliminarEgreso('${e.id}')" title="Eliminar">✕</span>
    </div>`;
  }).join('') +
    `<div style="display:flex;justify-content:flex-end;padding:10px 16px 4px;
      font-size:13px;font-weight:700;color:#ff6666">
      Total egresos: -${fmt(total)}
    </div>`;
}
