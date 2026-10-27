"use strict";
// Interacciones efímeras para revisar las vistas. Sin persistencia ni servicios externos.
const demoNote = '<p class="module-demo">Solo pruebas con datos ficticios. Los cambios se reinician al recargar y no se envían al servidor.</p>';
function addDemoView(id, label, iconName, eyebrow, title, description, content) {
  const section = document.createElement('section');
  section.id = id;
  section.className = 'panel module-view';
  section.hidden = true;
  section.setAttribute('aria-labelledby', `titulo-${id}`);
  section.innerHTML = `<p class="muted">${eyebrow}</p><h1 id="titulo-${id}">${title}</h1><p>${description}</p>${demoNote}${content}`;
  document.getElementById('alcance').before(section);
  const link = document.createElement('a');
  link.href = `#${id}`;
  link.innerHTML = `${icon(iconName)} ${label}`;
  link.addEventListener('click', event => { event.preventDefault(); showView(id, true); });
  nav.querySelector('[href="#alcance"]').before(link);
  return section;
}

const kitchen = addDemoView('cocina', 'Plan de cocina', 'bag', 'UN MES BIEN ORGANIZADO', 'A la mesa, <em>juntos.</em>', 'Planea el menú, reparte tareas y prepara lo necesario con tiempo.', `
<div class="module-toolbar"><div><label for="kitchen-month">Mes del plan</label><input type="month" id="kitchen-month" value="2026-11" min="2020-01" max="2040-12" required></div><span class="badge">Borrador de ejemplo · vista interna</span></div>
<div class="menu-layout"><section aria-labelledby="menu-title"><div class="subheading"><h2 id="menu-title">Menú del mes</h2><span id="service-count" role="status"></span></div><div id="menu-days" class="menu-days"></div></section><section class="card preparation"><span class="icon-box sand">${icon('calendar')}</span><h2>Planear un servicio</h2><form id="menu-form"><label for="service-date">Fecha</label><select id="service-date"></select><label for="meal-name">Platillo</label><input id="meal-name" maxlength="100" value="Tostadas de ejemplo" required><label for="meal-portions">Porciones previstas</label><input id="meal-portions" type="number" min="1" max="1000" step="1" value="60" required><label for="meal-team">Equipo responsable</label><select id="meal-team"><option>Equipo de ejemplo A</option><option>Equipo de ejemplo B</option></select><button class="button primary" type="submit">Actualizar borrador de prueba</button><p id="menu-status" class="form-status" role="status"></p></form></section></div>
<div class="subheading"><h2>Compras y preparación</h2><span>Servicio de ejemplo · 1 de noviembre</span></div><div class="grid"><section class="card"><h3>Ingredientes por recibir</h3><p class="muted">Muestra independiente del menú editable. Marcar recepción no registra una compra.</p><label class="checkline"><input type="checkbox"> Tostadas · 120 piezas · equipo A</label><label class="checkline"><input type="checkbox">Verduras · 5 kg · equipo B</label><label class="checkline"><input type="checkbox">Servilletas · 100 piezas · equipo A</label></section><section class="card"><h3>Quién hace qué</h3><div class="planning-line"><strong>Preparación · equipo A</strong><p>Revisar ingredientes y organizar porciones.</p></div><div class="planning-line"><strong>Servicio y limpieza · equipo B</strong><p>Preparar el área y coordinar el cierre.</p></div><p class="muted">Porciones previstas no son existencias. Precios, alérgenos y disponibilidad requieren confirmación.</p></section></div>`);
const menuPlans = new Map();
const monthInput = document.getElementById('kitchen-month');
const dateSelect = document.getElementById('service-date');
const mealInput = document.getElementById('meal-name');
const portionsInput = document.getElementById('meal-portions');
const mealTeam = document.getElementById('meal-team');
function monthServices(value) {
  if (!/^\d{4}-\d{2}$/.test(value)) return [];
  const [year, month] = value.split('-').map(Number);
  if (year < 2020 || year > 2040 || month < 1 || month > 12) return [];
  const days = [];
  for (let day = 1; day <= new Date(year, month, 0).getDate(); day++) {
    if (new Date(year, month - 1, day).getDay() === 0) days.push(`${value}-${String(day).padStart(2, '0')}`);
  }
  return days;
}
function readMeal() {
  const meal = menuPlans.get(dateSelect.value);
  mealInput.value = meal?.name || '';
  portionsInput.value = meal?.portions || '60';
  mealTeam.value = meal?.team || 'Equipo de ejemplo A';
}
function renderMenu() {
  const container = document.getElementById('menu-days');
  container.replaceChildren();
  for (const date of monthServices(monthInput.value)) {
    const meal = menuPlans.get(date);
    const card = document.createElement('article');
    card.className = 'menu-day';
    const day = document.createElement('span');
    day.className = 'menu-date';
    day.textContent = date.slice(8);
    const copy = document.createElement('div');
    const heading = document.createElement('h3');
    heading.textContent = meal?.name || 'Menú por definir';
    const description = document.createElement('p');
    description.textContent = meal ? `${meal.portions} porciones previstas · ${meal.team}` : 'Sin platillo asignado todavía';
    const when = document.createElement('small');
    when.textContent = `Domingo · ${date}`;
    copy.append(when, heading, description);
    const edit = document.createElement('button');
    edit.className = 'button'; edit.type = 'button';
    edit.textContent = 'Editar'; edit.setAttribute('aria-label', `Editar menú del ${date}`);
    edit.addEventListener('click', () => { dateSelect.value = date; readMeal(); mealInput.focus(); });
    card.append(day, copy, edit); container.append(card);
  }
}
function changeMonth() {
  const dates = monthServices(monthInput.value);
  dateSelect.replaceChildren(...dates.map(date => { const option = document.createElement('option'); option.value = date; option.textContent = date; return option; }));
  document.getElementById('service-count').textContent = `${dates.length} domingos de ejemplo`;
  document.getElementById('menu-status').textContent = '';
  renderMenu(); readMeal();
}
['Tostadas de ejemplo','Enchiladas de ejemplo','Sopa y guisado de ejemplo','Tacos de ejemplo','Menú por acordar'].forEach((name, index) => {
  const date = monthServices('2026-11')[index];
  menuPlans.set(date, { name, portions: 60, team: `Equipo de ejemplo ${index % 2 ? 'B' : 'A'}` });
});
monthInput.addEventListener('change', changeMonth);
dateSelect.addEventListener('change', readMeal);
document.getElementById('menu-form').addEventListener('submit', event => {
  event.preventDefault();
  if (!monthServices(monthInput.value).includes(dateSelect.value) || !mealInput.value.trim()) return;
  menuPlans.set(dateSelect.value, { name: mealInput.value.trim(), portions: Number(portionsInput.value), team: mealTeam.value });
  renderMenu();
  document.getElementById('menu-status').textContent = 'Borrador de prueba actualizado. No se publicó el menú ni se modificaron existencias.';
});
changeMonth();

addDemoView('eventos', 'Eventos Kids', 'grid', 'CADA EQUIPO APORTA ALGO', 'Nos organizamos <em>para compartir.</em>', 'Equipos, tareas y materiales en un mismo lugar.', `
<div class="hero"><div><span class="hero-label">${icon('sun')} EVENTO FICTICIO</span><h2>Un día para crecer</h2><p>22 de noviembre de 2026 · equipos de ejemplo</p><small>Coordinación por confirmar</small></div><div class="hero-art" aria-hidden="true">${icon('grid')}</div></div>
<div class="subheading"><h2>Compromisos del equipo</h2><span>Asignar no equivale a aceptar</span></div><div class="grid"><section class="card"><span class="badge">Dinámicas · equipo A</span><h2>Preparar la actividad</h2><p>Responsable de ejemplo A · fecha límite: 20 nov</p><p id="task-state" role="status">Pendiente de aceptación</p><button id="accept-task" class="button primary">Aceptar tarea de prueba</button><button id="complete-task" class="button" hidden>Marcar tarea de prueba como completada</button></section><section class="card preparation"><span class="icon-box sand">${icon('bag')}</span><h2>Vasos para el evento</h2><div class="material-counts"><div><strong>100</strong>Requeridos</div><div><strong>60</strong>Comprometidos</div><div><strong id="received-count">20</strong>Recibidos</div></div><p>Equipo B · ejemplo de aportación en especie.</p><button id="receive-material" class="button">Probar recepción de 10 vasos</button><p id="material-status" class="form-status" role="status">Faltan compromisos para 40 vasos.</p></section></div>`);
document.getElementById('accept-task').addEventListener('click', event => { event.currentTarget.hidden = true; document.getElementById('complete-task').hidden = false; document.getElementById('task-state').textContent = 'Aceptada en esta prueba · realización pendiente'; });
document.getElementById('complete-task').addEventListener('click', event => { event.currentTarget.hidden = true; document.getElementById('task-state').textContent = 'Completada en esta prueba local'; });
let received = 20;
document.getElementById('receive-material').addEventListener('click', event => {
  received = Math.min(60, received + 10);
  document.getElementById('received-count').textContent = String(received);
  document.getElementById('material-status').textContent = `${received} de 60 vasos comprometidos recibidos en esta prueba. Faltan compromisos para otros 40.`;
  if (received === 60) event.currentTarget.disabled = true;
});

addDemoView('libros', 'Libros Kids', 'book', 'SU MATERIAL, EN ORDEN', 'Aprender empieza <em>con una historia.</em>', 'Consulta el libro de cada niño y cómo recogerlo con coordinación.', `
<div class="grid"><section class="card"><span class="icon-box sand">${icon('book')}</span><h2>Libro de ejemplo · ciclo Kids</h2><p>Menor de ejemplo A · edición por definir</p><p><span class="badge">Pago pendiente</span></p><p>Importe y disponibilidad por confirmar.</p><button class="button primary" id="online-book">Ver pago en línea</button><button class="button" id="desk-book">Ver pago con coordinación</button><p id="book-status" class="form-status" role="status">No hay cobros reales en este boceto.</p></section><section class="card preparation"><h2>Listo para recoger</h2><p>Menor de ejemplo B · libro de ejemplo</p><span class="badge">Pago de ejemplo confirmado</span><div class="planning-line"><strong>Entrega física pendiente</strong><p>Coordinación confirma ejemplar disponible y receptor antes de registrar la entrega.</p></div><button class="button" id="book-collection">Ver pasos de recogida</button><p id="collection-status" class="form-status" role="status"></p></section></div>`);
document.getElementById('online-book').addEventListener('click', () => { document.getElementById('book-status').textContent = 'Pago en línea previsto. Proveedor e importe aún por definir; no se solicita tarjeta ni se inicia un cobro.'; });
document.getElementById('desk-book').addEventListener('click', () => { document.getElementById('book-status').textContent = 'Puedes consultar el pago con coordinación. Elegir este canal no marca el libro como pagado.'; });
document.getElementById('book-collection').addEventListener('click', () => { document.getElementById('collection-status').textContent = 'Revisar solicitud, pago, ejemplar disponible y receptor autorizado. Esta vista no registra la entrega del libro ni autoriza la salida del menor.'; });

addDemoView('familias', 'Avisos a familias', 'heart', 'ACOMPAÑAR, JUNTOS', 'Familias y Kids, <em>en equipo.</em>', 'Acuerdos de convivencia y comunicación durante la clase.', `
<div class="grid"><section class="card"><h2>Ayúdanos a cuidar la convivencia</h2><div class="planning-line"><strong>Los juguetes se quedan en casa</strong><p>Salvo que el equipo los solicite. Si necesita un objeto de apoyo, acuerda su uso con coordinación.</p></div><div class="planning-line"><strong>Educamos junto con ustedes</strong><p>Nuestra labor complementa la responsabilidad de madres, padres y tutores; no la sustituye.</p></div><div class="planning-line"><strong>Respeto para todos</strong><p>No se permiten insultos, burlas, amenazas ni agresiones. Intervendremos con calma y podremos solicitar tu acompañamiento. Cada niño merece dignidad, sin humillaciones ni castigos físicos.</p></div><label class="checkline"><input id="read-agreement" type="checkbox"> He leído estos acuerdos de ejemplo</label><p id="agreement-status" class="form-status" role="status">Leer estos acuerdos no concede otras autorizaciones.</p></section><section class="card preparation"><span class="icon-box amber">${icon('bell')}</span><h2>Acércate a Kids</h2><p>Ejemplo de aviso al responsable de Menor de ejemplo B.</p><span class="badge" id="parent-notice-state">Respuesta pendiente · ejemplo</span><button id="on-my-way" class="button primary">Probar «Voy en camino»</button><p id="parent-notice-status" class="form-status" role="status">No se ha enviado una notificación. No se garantiza vibración; depende del teléfono y sus ajustes.</p><p>Coordinación tendrá una alternativa presencial. Una emergencia requiere atención inmediata.</p></section></div>`);
document.getElementById('read-agreement').addEventListener('change', event => { document.getElementById('agreement-status').textContent = event.target.checked ? 'Lectura marcada únicamente en esta prueba local.' : 'Lectura sin marcar. No se guardó una aceptación real.'; });
document.getElementById('on-my-way').addEventListener('click', event => { event.currentTarget.disabled = true; document.getElementById('parent-notice-state').textContent = 'Voy en camino · respuesta de prueba'; document.getElementById('parent-notice-status').textContent = 'La respuesta de prueba no significa que el adulto ya llegó ni autoriza la salida del niño.'; });

addDemoView('incidencias', 'Seguimiento', 'shield', 'CUIDADO Y SEGUIMIENTO', 'Escuchar, atender <em>y acompañar.</em>', 'Vista interna propuesta para registrar hechos y dar seguimiento con respeto.', `
<div class="grid"><section class="card"><h2>Registrar una incidencia de prueba</h2><p class="muted">Usa solo situaciones inventadas. No escribas datos reales ni diagnósticos.</p><form id="incident-form"><label for="incident-child">Niño de ejemplo</label><select id="incident-child"><option>Menor de ejemplo A · Semillas</option><option>Menor de ejemplo B · Semillas</option></select><label for="incident-category">Categoría</label><select id="incident-category"><option>Convivencia</option><option>Seguridad</option><option>Otra</option></select><label for="incident-facts">¿Qué ocurrió?</label><textarea id="incident-facts" maxlength="1000" rows="3" required></textarea><label for="incident-action">¿Cómo se atendió?</label><textarea id="incident-action" maxlength="1000" rows="3" required></textarea><button class="button primary" type="submit">Probar registro</button><p id="incident-status" class="form-status" role="status"></p></form></section><section class="card preparation"><span class="icon-box lilac">${icon('heart')}</span><h2>Un seguimiento con cuidado</h2><div class="planning-line"><strong>Hechos, sin etiquetas</strong><p>Describir lo ocurrido y la intervención; no calificar al niño ni aplicar sanciones automáticas.</p></div><div class="planning-line"><strong>Información restringida</strong><p>Las notas internas y los datos de terceros no se muestran a otras familias ni en notificaciones.</p></div><p>Este boceto permite revisar el formulario; todavía no implementa autenticación ni un expediente real.</p></section></div>`);
document.getElementById('incident-form').addEventListener('submit', event => { event.preventDefault(); event.currentTarget.reset(); document.getElementById('incident-status').textContent = 'Formulario de prueba revisado y limpiado. No se creó una incidencia ni se envió información.'; });

addDemoView('buzon', 'Buzón', 'heart', 'TU EXPERIENCIA NOS AYUDA', 'Te queremos <em>escuchar.</em>', 'Comentarios sobre la comida, la atención y cómo podemos mejorar.', `
<div class="grid"><section class="card"><h2>Cuéntanos tu experiencia</h2><p class="muted">Prueba con un comentario ficticio. Evita nombres de menores, datos de salud o información bancaria.</p><form id="feedback-form"><label for="feedback-category">Sobre qué quieres comentar</label><select id="feedback-category"><option>Comida</option><option>Atención</option><option>Tiempo de espera</option><option>Limpieza</option><option>Otra</option></select><label for="feedback-message">Tu comentario</label><textarea id="feedback-message" rows="5" maxlength="2000" required></textarea><label for="feedback-rating">Valoración opcional</label><select id="feedback-rating"><option value="">Prefiero no calificar</option><option>1 de 5</option><option>2 de 5</option><option>3 de 5</option><option>4 de 5</option><option>5 de 5</option></select><button class="button primary" type="submit">Probar envío</button><p id="feedback-status" class="form-status" role="status">No se enviará un comentario real.</p></form></section><section class="card preparation"><span class="icon-box sand">${icon('heart')}</span><h2>Un buzón privado</h2><p>La propuesta es que el equipo responsable reciba y dé seguimiento; los comentarios no se publican en un muro.</p><div class="planning-line"><strong>Sin promesas de anonimato</strong><p>La modalidad de identidad y respuesta está pendiente de acordar. Este formulario no recopila contacto.</p></div><p>No es un canal de atención inmediata. Si necesitas ayuda urgente, acércate al responsable presencial.</p></section></div>`);
document.getElementById('feedback-form').addEventListener('submit', event => { event.preventDefault(); event.currentTarget.reset(); document.getElementById('feedback-status').textContent = 'Gracias por probar el buzón. El texto se limpió y no se envió ni se generó un folio real.'; });

addDemoView('recogida', 'Recogida Kids', 'shield', 'UNA ENTREGA CON CUIDADO', 'De vuelta <em>con su familia.</em>', 'Recorrido de revisión para el personal autorizado de Kids.', `
<div class="grid"><section class="card"><h2>Revisar recogida · ejemplo</h2><p>Menor de ejemplo A · Semillas · dentro de clase</p><form id="pickup-form"><label for="pickup-adult">Adulto receptor</label><select id="pickup-adult" required><option value="">Selecciona una opción</option><option value="authorized">Adulto de ejemplo A · autorización ficticia vigente</option><option value="unknown">Adulto sin verificar</option></select><label class="checkline"><input id="pickup-recognized" type="checkbox"> Reconozco personalmente a este adulto</label><p class="muted">El reconocimiento del niño apoya, pero no sustituye la autorización.</p><button class="button primary" type="submit">Revisar entrega de prueba</button><p id="pickup-status" class="form-status" role="status"></p></form></section><section class="card preparation"><span class="icon-box">${icon('shield')}</span><h2>Si hay dudas, coordinación</h2><p>Si no conoces al adulto, solicita apoyo. La entrega permanece pendiente hasta verificar identidad y autorización.</p><p>La aplicación real volverá a comprobar permiso y vigencia al confirmar. Este boceto no registra salidas ni valida identidad.</p></section></div>`);
document.getElementById('pickup-form').addEventListener('submit', event => {
  event.preventDefault();
  const verified = document.getElementById('pickup-adult').value === 'authorized' && document.getElementById('pickup-recognized').checked;
  document.getElementById('pickup-status').textContent = verified ? 'Revisión de prueba completa. En la app real seguiría una confirmación explícita con validación del servidor. No se registró salida.' : 'Revisión pendiente: solicitar apoyo de coordinación. No se autoriza ni registra una entrega.';
});

// Convertir accesos anteriores de explicación en navegación a las nuevas vistas.
const detailRoutes = { books: 'libros', events: 'eventos', incident: 'incidencias', notice: 'familias' };
document.querySelectorAll('[data-detail]').forEach(button => {
  const destination = detailRoutes[button.dataset.detail];
  if (!destination) return;
  const replacement = button.cloneNode(true);
  replacement.removeAttribute('data-detail');
  replacement.addEventListener('click', () => showView(destination, true));
  button.replaceWith(replacement);
});
document.querySelector('header > strong').textContent = 'SHALOM';
document.querySelector('.sidebar-bottom').textContent = 'Comunidad Shalom · Demostración';
document.querySelector('.topline > span').textContent = 'Shalom / Comunidad';
document.querySelector('#alcance > p').textContent = 'Vistas de Kids, equipo, cocina, eventos, libros, familias, acompañamiento, buzón y recogida. Cambios de prueba en memoria, sin autenticación ni operaciones reales. No ingreses información personal. Todo se reinicia al recargar.';
const initialView = location.hash.slice(1);
if (document.getElementById(initialView)?.classList.contains('panel')) showView(initialView);
