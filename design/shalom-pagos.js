"use strict";
addDemoView('pagos', 'Pagos y aportaciones', 'heart', 'CADA APORTACIÓN, EN SU LUGAR', 'Compartir también <em>construye.</em>', 'Libros de Kids, costos de recuperación de eventos y diezmos con Mercado Pago.', `
<div class="grid"><section class="card"><span class="icon-box sand">${icon('heart')}</span><h2>Elige el destino</h2><form id="payment-demo-form"><label for="payment-purpose">¿Qué deseas pagar o aportar?</label><select id="payment-purpose"><option value="book">Libro y material de Kids</option><option value="event">Cooperación de evento · costo de recuperación</option><option value="tithe">Diezmo voluntario</option></select><div id="fixed-payment-info" class="planning-line"><strong id="payment-subject">Menor de ejemplo A · libro de ejemplo</strong><p id="payment-fixed-amount">Importe ficticio: $150.00 MXN</p></div><div id="tithe-fields" hidden><label for="tithe-amount">Monto que deseas aportar · MXN</label><input id="tithe-amount" type="number" min="1" max="100000" step="0.01" inputmode="decimal"><p class="muted">Aportación voluntaria, sin porcentaje calculado ni cobro recurrente. No pedimos tus ingresos.</p></div><label for="payment-channel">Forma de pago</label><select id="payment-channel"><option value="mercadopago">En línea con Mercado Pago</option><option id="payment-desk-option" value="desk">Con la coordinadora · libros Kids</option></select><button class="button primary" type="submit">Revisar pago de ejemplo</button><p class="muted">Importes de ejemplo, no tarifas de Shalom. Las comisiones y condiciones reales se confirmarán antes de habilitar cobros.</p></form></section><section class="card preparation"><span class="view-label">RESUMEN ANTES DE PAGAR</span><h2>Revisa con calma.</h2><p id="payment-summary" role="status">Selecciona el concepto y revisa su importe.</p><div id="payment-review" hidden><span class="badge">No se ha iniciado ningún cobro</span><p>El pago en línea se realizará en una página alojada por Mercado Pago. Shalom no pedirá número de tarjeta ni CVV.</p><button class="button" disabled>Mercado Pago · conexión pendiente</button></div><div class="planning-line"><strong>Confirmación verificada</strong><p>Volver de Mercado Pago o mostrar una captura no confirma el pago. La app esperará la validación del proveedor.</p></div><div class="planning-line"><strong>Tu aportación es privada</strong><p>No habrá listas públicas de diezmos ni acceso del equipo de Kids al historial de aportaciones.</p></div></section></div>
<div class="subheading"><h2>Estados de ejemplo</h2><span>Registros ficticios independientes</span></div><div class="quick-actions payment-samples"><article class="quick-action"><span class="icon-box sand">${icon('book')}</span><strong>Libro Kids · $150 MXN</strong><span>Pago confirmado de ejemplo · recogida pendiente</span></article><article class="quick-action"><span class="icon-box lilac">${icon('calendar')}</span><strong>Evento · $80 MXN</strong><span>Costo de recuperación · pago pendiente</span></article><article class="quick-action"><span class="icon-box">${icon('heart')}</span><strong>Diezmo voluntario</strong><span>Sin monto preseleccionado · sin cargo automático</span></article></div><div class="soft-banner">${icon('shield')}<div><strong>Un pago tiene un destino concreto.</strong><p>Pagar el libro no registra su entrega. Cooperar para un evento no asigna tareas ni crea una reserva por sí solo. Una aportación no concede permisos ni es una factura fiscal automática.</p></div></div>`);
const paymentPurpose = document.getElementById('payment-purpose');
const paymentChannel = document.getElementById('payment-channel');
const titheAmount = document.getElementById('tithe-amount');
function resetPaymentReview() {
  document.getElementById('payment-review').hidden = true;
  document.getElementById('payment-summary').textContent = 'Selecciona el concepto y revisa su importe.';
}
function changePaymentPurpose() {
  const purpose = paymentPurpose.value;
  const tithe = purpose === 'tithe';
  document.getElementById('fixed-payment-info').hidden = tithe;
  document.getElementById('tithe-fields').hidden = !tithe;
  titheAmount.required = tithe;
  titheAmount.disabled = !tithe;
  document.getElementById('payment-desk-option').hidden = purpose !== 'book';
  document.getElementById('payment-desk-option').disabled = purpose !== 'book';
  paymentChannel.value = 'mercadopago';
  document.getElementById('payment-subject').textContent = purpose === 'book' ? 'Menor de ejemplo A · libro de ejemplo' : 'Un día para crecer · participante de ejemplo A';
  document.getElementById('payment-fixed-amount').textContent = purpose === 'book' ? 'Importe ficticio: $150.00 MXN' : 'Costo de recuperación ficticio: $80.00 MXN';
  resetPaymentReview();
}
paymentPurpose.addEventListener('change', changePaymentPurpose);
paymentChannel.addEventListener('change', resetPaymentReview);
titheAmount.addEventListener('input', resetPaymentReview);
document.getElementById('payment-demo-form').addEventListener('submit', event => {
  event.preventDefault();
  const purpose = paymentPurpose.value;
  const amount = purpose === 'book' ? '150.00' : purpose === 'event' ? '80.00' : Number(titheAmount.value).toFixed(2);
  const title = { book: 'Libro y material Kids', event: 'Cooperación de evento', tithe: 'Diezmo voluntario' }[purpose];
  const desk = paymentChannel.value === 'desk';
  document.getElementById('payment-summary').textContent = `${title} · $${amount} MXN · ${desk ? 'Pago con coordinación; permanece pendiente hasta verificar recepción.' : 'Mercado Pago; revisión de ejemplo, sin envío ni cobro.'}`;
  document.getElementById('payment-review').hidden = desk;
});
changePaymentPurpose();
function openPaymentPurpose(purpose) {
  paymentPurpose.value = purpose;
  changePaymentPurpose();
  showView('pagos', true);
}
const onlineBook = document.getElementById('online-book');
const onlineReplacement = onlineBook.cloneNode(true);
onlineReplacement.textContent = 'Pagar libro en línea';
onlineReplacement.addEventListener('click', () => openPaymentPurpose('book'));
onlineBook.replaceWith(onlineReplacement);
const eventPayment = document.createElement('button');
eventPayment.className = 'button';
eventPayment.type = 'button';
eventPayment.textContent = 'Ver cooperación del evento';
eventPayment.addEventListener('click', () => openPaymentPurpose('event'));
document.querySelector('#eventos .hero').after(eventPayment);
if (location.hash === '#pagos') showView('pagos');
