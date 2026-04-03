/* ═══════════════════════════════════════════════
   GYOZA HOUSE — ui/ticket.js
   Lógica del ticket térmico / factura.
   ═══════════════════════════════════════════════ */

let _ticketVentaData = null;
let _ticketNumero    = parseInt(localStorage.getItem('gh_ticket_num') || '0');

function abrirTicket(ventaData) {
  _ticketNumero++;
  localStorage.setItem('gh_ticket_num', _ticketNumero);
  _ticketVentaData = ventaData;

  const [y, m, d] = ventaData.fecha.split('-');
  const M = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const fechaStr  = `${parseInt(d)} de ${M[parseInt(m) - 1]}, ${y}  ·  ${ventaData.hora}`;
  const fmtT      = n => '$' + Math.round(n).toLocaleString('es-CO');

  document.getElementById('tk-fecha').textContent = fechaStr;
  document.getElementById('tk-num').textContent   = `Pedido #${String(_ticketNumero).padStart(4, '0')}`;

  document.getElementById('tk-items').innerHTML = ventaData.items.map(i => {
    const sub    = i.precio * i.qty;
    const nombre = i.nombre.length > 22 ? i.nombre.slice(0, 21) + '…' : i.nombre;
    return `<div style="display:flex;font-size:11px;color:#222;padding:3px 0;line-height:1.4;border-bottom:1px dotted #eee;">
      <span style="flex:1;padding-right:4px">${nombre}</span>
      <span style="width:30px;text-align:center;color:#666">${i.qty}</span>
      <span style="width:70px;text-align:right;color:#555">${fmtT(i.precio)}</span>
      <span style="width:72px;text-align:right;font-weight:700">${fmtT(sub)}</span>
    </div>`;
  }).join('');

  const cambio   = ventaData.cambio != null ? ventaData.cambio : null;
  const totalRow = (label, val, bold = false, big = false, color = '#222') =>
    `<div style="display:flex;justify-content:space-between;align-items:baseline;padding:${big ? '5px' : '2px'} 0;${bold ? 'font-weight:700;' : ''}font-size:${big ? '14px' : '11px'};color:${color};">
      <span style="letter-spacing:.04em">${label}</span><span>${fmtT(val)}</span>
    </div>`;

  let totalesHTML = totalRow('Subtotal', ventaData.total);
  totalesHTML    += `<div style="border-top:1px solid #ddd;margin:5px 0;"></div>`;
  totalesHTML    += totalRow('TOTAL', ventaData.total, true, true, '#0d0d0d');

  if (ventaData.pago) {
    totalesHTML += `<div style="margin-top:6px;padding-top:4px;border-top:1px dashed #eee;">`;
    totalesHTML += totalRow('Recibido', ventaData.pago, false, false, '#555');
    if (cambio !== null) {
      const cambioColor = cambio >= 0 ? '#2d6b2d' : '#c8102e';
      const cambioLabel = cambio >= 0 ? 'Cambio' : 'Falta';
      totalesHTML += totalRow(cambioLabel, Math.abs(cambio), true, false, cambioColor);
    }
    totalesHTML += `</div>`;
  }

  document.getElementById('tk-totales').innerHTML = totalesHTML;

  const bd = document.getElementById('ticket-backdrop');
  bd.style.display   = 'flex';
  bd.style.animation = 'none';
  requestAnimationFrame(() => { bd.style.animation = ''; });
}

function cerrarTicket(e) {
  if (e && e.target !== document.getElementById('ticket-backdrop')) return;
  document.getElementById('ticket-backdrop').style.display = 'none';
  _ticketVentaData = null;
}

function imprimirTicket() {
  const ctrl = document.getElementById('ticket-controls');
  ctrl.style.display = 'none';
  window.print();
  setTimeout(() => { ctrl.style.display = 'flex'; }, 500);
}

function descargarTicketPDF() {
  const ctrl = document.getElementById('ticket-controls');
  ctrl.style.display = 'none';
  setTimeout(() => {
    window.print();
    setTimeout(() => { ctrl.style.display = 'flex'; }, 600);
  }, 80);
}

function reabrirTicket(ventaId) {
  const v = ventas.find(x => x.id === ventaId);
  if (v) abrirTicket(v);
}
