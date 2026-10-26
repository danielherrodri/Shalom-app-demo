"use strict";
const icons = {
  menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2"/>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
  sprout:'<path d="M12 21V11M12 15C4 15 3 10 3 7c6 0 9 2 9 8Zm0-4c0-6 3-8 9-8 0 5-2 8-9 8ZM7 21h10"/>',
  users:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m3 10v-3a6 6 0 0 0-2-4"/>',
  check:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  bell:'<path d="M6 9a6 6 0 0 1 12 0c0 7 3 7 3 8H3c0-1 3-1 3-8Zm4 12h4M12 1v2"/>',
  bag:'<path d="M4 8h16l1 13H3L4 8Zm4 0V6a4 4 0 0 1 8 0v2M8 12v1m8-1v1"/>',
  shield:'<path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6l8-4Z"/><path d="m8 12 3 3 5-6"/>',
  heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  book:'<path d="M12 5C9 3 6 3 3 4v16c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v16"/>'
};
// Solo geometría y textos estáticos del boceto; nunca contenido introducido por usuarios.
const icon = (name) => `<i aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false">${icons[name]}</svg></i>`;
const maestro = document.getElementById('maestro');
const coordinator = document.getElementById('coordinacion');
document.getElementById('titulo-maestro').innerHTML = 'Un lugar para <em>crecer.</em>';
document.getElementById('titulo-coordinacion').innerHTML = 'Kids, en <em>armonía.</em>';
maestro.querySelector('h1 + p').textContent = 'Todo listo para acompañar a tu grupo, un pequeño paso a la vez.';
maestro.querySelector('.notice').insertAdjacentHTML('beforebegin', `<div class="hero"><div><span class="hero-label">${icon('sprout')} TU GRUPO DE HOY</span><h2>Semillas</h2><p>Aprendemos, compartimos y crecemos juntos.</p><small>Sesión ficticia · Domingo · 10:00–12:00</small></div><div class="hero-art" aria-hidden="true">${icon('sprout')}</div></div>`);
document.querySelector('main').insertAdjacentHTML('afterbegin', '<div class="topline"><span>Shalom / Kids</span><span class="demo-pill">● Boceto interactivo · datos ficticios</span></div>');
const nav = document.querySelector('header nav');
// Celular (pág. 14 del manual): las vistas quedan detrás de un botón «Menú», en una sola columna.
nav.id = 'kids-vistas';
const menuToggle = document.createElement('button');
menuToggle.type = 'button'; menuToggle.className = 'kids-menu-toggle';
menuToggle.setAttribute('aria-controls', nav.id); menuToggle.setAttribute('aria-expanded', 'false');
menuToggle.innerHTML = `${icon('menu')} <span>Menú</span>`;
nav.before(menuToggle);
const setMenu = open => { menuToggle.setAttribute('aria-expanded', String(open)); nav.classList.toggle('abierto', open); };
menuToggle.addEventListener('click', () => setMenu(menuToggle.getAttribute('aria-expanded') !== 'true'));
nav.addEventListener('click', event => { if (event.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && nav.classList.contains('abierto')) { setMenu(false); menuToggle.focus(); } });
nav.querySelector('[href="#maestro"]').innerHTML = `${icon('sun')} Mi clase`;
nav.querySelector('[href="#coordinacion"]').innerHTML = `${icon('grid')} Coordinación`;
nav.querySelector('[href="#coordinacion"]').insertAdjacentHTML('beforebegin', `<a href="#reservas">${icon('calendar')} Reservar lugar</a>`);
document.querySelector('header').insertAdjacentHTML('beforeend', `<div class="sidebar-story">${icon('sprout')}<div>Pequeños pasos.<br>Grandes historias.</div><small>Un espacio para aprender,<br>convivir y sentirse en casa.</small></div><div class="sidebar-bottom">Equipo Kids · Vista de demostración</div>`);
const statIcons = ['users','check','bell','calendar'];
document.querySelectorAll('.stats').forEach(group => group.querySelectorAll('.stat').forEach((stat,index) => stat.insertAdjacentHTML('beforeend', `<span class="icon-box ${['','sand','amber','lilac'][index]}">${icon(statIcons[index])}</span>`)));
document.querySelectorAll('.action').forEach(link => link.insertAdjacentHTML('beforeend', icon('arrow')));
maestro.querySelector('.grid').insertAdjacentHTML('afterend', `<div class="subheading"><h2>Que alcance para todos.</h2><span>Preparar con cariño</span></div><div class="quick-actions"><button class="quick-action" data-switch="reservas"><span class="icon-box sand">${icon('bag')}</span><strong>Preparar la próxima clase</strong><span>Reservas, materiales y dulces.</span></button><button class="quick-action" data-detail="notice"><span class="icon-box amber">${icon('bell')}</span><strong>Pedir acompañamiento</strong><span>Un aviso discreto al responsable.</span></button><button class="quick-action" data-detail="incident"><span class="icon-box lilac">${icon('heart')}</span><strong>Incidencias y seguimiento</strong><span>Registrar hechos y acompañar.</span></button></div>`);
coordinator.querySelector('.grid').insertAdjacentHTML('afterend', `<div class="subheading"><h2>Preparar la próxima clase</h2><span>Organización por grupo</span></div><div class="quick-actions"><button class="quick-action" data-switch="reservas"><span class="icon-box sand">${icon('bag')}</span><strong>Reservas y preparación</strong><span>Cuántos esperamos por clase.</span></button><button class="quick-action" data-detail="books"><span class="icon-box">${icon('book')}</span><strong>Libros y recogidas</strong><span>Pago y entrega por separado.</span></button><button class="quick-action" data-detail="events"><span class="icon-box lilac">${icon('grid')}</span><strong>Eventos y equipos</strong><span>Actividades y compromisos.</span></button></div>`);
const booking = document.createElement('section');
booking.className = 'panel'; booking.id = 'reservas'; booking.setAttribute('aria-labelledby','titulo-reservas');
booking.innerHTML = `<p class="muted">NOS PREPARAMOS PARA RECIBIRLOS</p><h1 id="titulo-reservas">Aquí hay un lugar <em>para ti.</em></h1><p>Avísanos quién viene y prepararemos mejor cada clase.</p><div class="grid"><section class="card booking"><span class="icon-box">${icon('sprout')}</span><h2>Reservar para mi niño</h2><p>Una reserva por niño y por sesión. La entrada se registra al llegar.</p><form id="booking-form"><label for="booking-child">Niño</label><select id="booking-child" required><option value="">Selecciona un niño de ejemplo</option><option value="a">Menor de ejemplo A</option><option value="b">Menor de ejemplo B</option></select><label for="booking-session">Clase</label><select id="booking-session"><option>Semillas · domingo · 10:00–12:00</option></select><div class="booking-note">${icon('bag')}<p>La reserva ayuda a preparar materiales y dulces. No es un registro de asistencia ni autorización de recogida.</p></div><button class="button primary" type="submit">${icon('calendar')} Probar reserva</button><button class="button" id="cancel-booking" type="button" hidden>Cancelar reserva de prueba</button><p id="booking-status" role="status">Demostración local. No se envían ni guardan reservas reales.</p></form></section><aside class="card preparation"><span class="view-label">VISTA DEL EQUIPO</span><h2>Que alcance para todos.</h2><div class="prep-count"><strong id="reservation-count">16</strong><span>reservas ficticias<br>para Semillas</span></div><div class="planning-line"><strong>Materiales por participante</strong><p>Usar las reservas como base y añadir un margen por acordar para quienes lleguen sin reservar.</p></div><div class="planning-line"><strong>Dulces con cuidado</strong><p>La reserva no confirma que un alimento sea adecuado para cada niño. Revisar restricciones por el canal autorizado.</p></div><div class="planning-line"><strong>¿Llegaron sin reservar?</strong><p>Recepción revisa disponibilidad y registra su entrada. No se rechazan automáticamente.</p></div><span class="badge">Cupo y hora límite por definir</span></aside></div><div class="soft-banner">${icon('heart')}<div><strong>Si cambian tus planes, avísanos.</strong><p>Cancelar libera el lugar y ayuda a ajustar la preparación. En la aplicación real podrás hacerlo desde tus reservas.</p></div></div>`;
coordinator.before(booking);
// Perfiles ficticios: los espacios de foto no representan personas reales.
function teacherSection() {
  return `<section class="teacher-section" aria-label="Equipo y próximas clases"><div class="subheading"><h2>¿Quién nos acompaña?</h2><span>Equipo de esta clase · ejemplo</span></div><div class="teacher-grid"><article class="teacher-card"><div class="teacher-portrait sand" aria-hidden="true">${icon('users')}<span>Espacio para foto</span></div><div class="teacher-copy"><span class="teacher-role">MAESTRA DE CLASE</span><h3>Maestra de ejemplo A</h3><p>Semillas · clase del domingo</p><span class="badge">Asignación de ejemplo</span></div></article><article class="teacher-card"><div class="teacher-portrait lilac" aria-hidden="true">${icon('users')}<span>Espacio para foto</span></div><div class="teacher-copy"><span class="teacher-role">MAESTRO DE APOYO</span><h3>Maestro de ejemplo B</h3><p>Compartimos y aprendemos juntos.</p><span class="badge">Asignación de ejemplo</span></div></article></div><div class="teacher-next"><span class="icon-box">${icon('calendar')}</span><div><h3>¿Cuándo les toca otra vez?</h3><p>Próximas participaciones de ejemplo en Semillas</p><ul><li><strong>1 nov · 10:00</strong><span>Maestra A y maestro B</span></li><li><strong>8 nov · 10:00</strong><span>Maestra A · apoyo por confirmar</span></li></ul><small>Fechas ficticias de 2026. En la app se mostrarán solo asignaciones publicadas; pueden cambiar.</small></div></div><p class="teacher-footnote">Aquí irán las fotos y los nombres para reconocer al equipo. Si no hay foto, se mostrará un avatar. No se publican teléfonos ni datos de contacto.</p></section>`;
}
maestro.querySelector('.hero').insertAdjacentHTML('afterend', teacherSection());
booking.querySelector('.grid').insertAdjacentHTML('beforebegin', teacherSection());
const team = document.createElement('section');
team.id = 'equipo';
team.className = 'panel';
team.setAttribute('aria-labelledby', 'titulo-equipo');
// Áreas indicadas por Shalom; solo los perfiles siguen siendo ficticios.
const teamAreas = [
  { id: 'cocina', name: 'Cocina', tone: 'sand' },
  { id: 'video', name: 'Video', tone: 'lilac' },
  { id: 'audio', name: 'Audio', tone: '' },
  { id: 'kids', name: 'Kids', tone: 'sand' },
  { id: 'materno', name: 'Materno', tone: 'lilac' },
];
team.innerHTML = `<p class="muted">LAS PERSONAS QUE HACEN COMUNIDAD</p><h1 id="titulo-equipo">Conoce al equipo <em>de Shalom.</em></h1><p>Conoce quiénes somos, a qué nos dedicamos y en qué área servimos.</p><div class="hero"><div><span class="hero-label">${icon('heart')} SERVIMOS JUNTOS</span><h2>Cerca de ti.</h2><p>Una cara conocida. Una historia que compartir.</p><small>Cocina · Video · Audio · Kids · Materno</small></div><div class="hero-art" aria-hidden="true">${icon('users')}</div></div><div class="team-filter"><label for="team-area">Explorar por área</label><select id="team-area"><option value="all">Todas las áreas</option>${teamAreas.map(area => `<option value="${area.id}">${area.name}</option>`).join('')}</select><p id="team-results" role="status">5 perfiles de ejemplo</p></div><div class="teacher-grid directory-grid">${teamAreas.map((area, index) => `<article class="teacher-card" data-area="${area.id}"><div class="teacher-portrait ${area.tone}" aria-hidden="true">${icon('users')}<span>Espacio para foto</span></div><div class="teacher-copy"><span class="teacher-role">${area.name}</span><h2>Persona de ejemplo ${String.fromCharCode(65 + index)}</h2><p>Servicio y función por completar.</p><span class="badge">Perfil de ejemplo</span></div></article>`).join('')}</div><div class="soft-banner">${icon('heart')}<div><strong>Cada persona tiene una historia.</strong><p>Foto y presentación opcionales, compartidas con su autorización. Los perfiles de este boceto están por completar.</p></div></div>`;
coordinator.after(team);
nav.querySelector('[href="#alcance"]').insertAdjacentHTML('beforebegin', `<a href="#equipo">${icon('users')} Nuestro equipo</a>`);
document.getElementById('team-area').addEventListener('change', (event) => {
  let count = 0;
  team.querySelectorAll('[data-area]').forEach((card) => {
    card.hidden = event.target.value !== 'all' && card.dataset.area !== event.target.value;
    if (!card.hidden) count++;
  });
  document.getElementById('team-results').textContent = `${count} ${count === 1 ? 'perfil de ejemplo' : 'perfiles de ejemplo'}`;
});
document.querySelectorAll('.teacher-copy').forEach((profile) => {
  const bio = document.createElement('dl');
  bio.className = 'teacher-bio';
  bio.innerHTML = '<dt>Quién soy</dt><dd>Una breve presentación, con mis propias palabras.</dd><dt>A qué me dedico</dt><dd>Mi ocupación o actividad, si deseo compartirla.</dd><dt>Lo que disfruto en Kids</dt><dd>Qué me gusta enseñar o compartir con los niños.</dd>';
  profile.append(bio);
});
team.querySelectorAll('.teacher-bio').forEach((bio) => {
  bio.querySelector('dt:last-of-type').textContent = 'Por qué me gusta servir';
  bio.querySelector('dd:last-of-type').textContent = 'Lo que disfruto aportar a la comunidad de Shalom.';
});
document.querySelectorAll('.teacher-footnote').forEach((note) => {
  note.textContent = 'Presentaciones por completar por cada maestro. Foto, nombre, ocupación y descripción serán revisados antes de mostrarse a las familias del grupo. No se publican teléfonos ni datos de contacto.';
});
function showView(name, moveFocus = false) {
  if (moveFocus) history.replaceState(null, '', `#${name}`);
  document.querySelectorAll('.panel').forEach(panel => { panel.hidden = panel.id !== name; });
  nav.querySelectorAll('a').forEach(link => { if(link.hash === `#${name}`) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current'); });
  const current = nav.querySelector('[aria-current=page]');
  menuToggle.querySelector('span').textContent = current ? `Menú · ${current.textContent.trim()}` : 'Menú';
  if(moveFocus){const heading = document.querySelector(`#${name} h1`); heading.tabIndex=-1; heading.focus({preventScroll:true}); window.scrollTo({top:0,behavior:'instant'});}
}
nav.querySelectorAll('a[href^="#"]:not([href="#alcance"])').forEach(link => link.addEventListener('click', event => {event.preventDefault(); showView(link.hash.slice(1),true);}));
document.querySelectorAll('[data-switch]').forEach(button => button.addEventListener('click',() => showView(button.dataset.switch,true)));
showView(document.getElementById(location.hash.slice(1))?.classList.contains('panel') ? location.hash.slice(1) : 'maestro');
window.addEventListener('hashchange', () => {
  const name = location.hash.slice(1);
  if (document.getElementById(name)?.classList.contains('panel')) showView(name, true);
});
const dialog = document.createElement('dialog');
dialog.setAttribute('aria-labelledby','detail-title');
dialog.innerHTML = `<span class="view-label">VISTA PREVIA · ACCIÓN PROPUESTA</span><h2 id="detail-title"></h2><p id="detail-copy"></p><p class="notice">La aplicación real requerirá autenticación, permisos y confirmación del servidor.</p><button class="button primary" type="button">Entendido</button>`;
document.body.append(dialog);
dialog.querySelector('button').addEventListener('click',() => dialog.close());
const details = {
  notice:['Un aviso discreto, con seguimiento','El adulto podrá responder «Voy en camino». Un envío no equivale a lectura. La vibración depende del teléfono y sus ajustes; coordinación tendrá una alternativa presencial.'],
  incident:['Incidencias y acompañamiento','Registrar hechos, intervención y seguimiento con acceso restringido. No mostrar detalles sensibles en listas ni notificaciones y no aplicar sanciones automáticas.'],
  books:['Su libro, listo para recoger','Se contemplan pago en línea y pago con coordinación. El pago confirmado y la entrega física tienen estados separados. Recoger el libro no autoriza la recogida del menor.'],
  events:['Organizarnos para compartir','Los eventos tendrán equipos, tareas y compromisos. Material comprometido y material recibido se registrarán por separado.']
};
document.querySelectorAll('[data-detail]').forEach(button => button.addEventListener('click',() => {const [title,copy] = details[button.dataset.detail]; dialog.querySelector('h2').textContent=title; dialog.querySelector('#detail-copy').textContent=copy; dialog.showModal();}));
// Estado efímero de demostración, sin persistencia ni peticiones de red.
const reservations = new Set();
const child = document.getElementById('booking-child');
const status = document.getElementById('booking-status');
const cancel = document.getElementById('cancel-booking');
function updateBooking(){document.getElementById('reservation-count').textContent=String(16+reservations.size); cancel.hidden=!reservations.has(child.value);}
child.addEventListener('change',() => {updateBooking(); status.textContent=reservations.has(child.value)?'Este niño ya tiene una reserva de prueba para esta sesión.':'Demostración local. No se envían ni guardan reservas reales.';});
document.getElementById('booking-form').addEventListener('submit',event => {event.preventDefault(); if(!child.value)return; if(reservations.has(child.value)){status.textContent='Este niño ya tiene una reserva de prueba. No se duplicó el lugar.';return;} reservations.add(child.value); updateBooking(); status.textContent='Reserva de prueba añadida al conteo local. La asistencia se registraría al llegar. No se envió al servidor.';});
cancel.addEventListener('click',() => {reservations.delete(child.value); updateBooking(); status.textContent='Reserva de prueba cancelada. Se ajustó el conteo local.';});

const teacherAgendaLink=document.createElement('a');teacherAgendaLink.className='button';teacherAgendaLink.href='../index.html#agenda';teacherAgendaLink.textContent='Mi agenda docente y asistencia';maestro.prepend(teacherAgendaLink);
