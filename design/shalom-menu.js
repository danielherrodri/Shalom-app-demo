"use strict";
// Se carga al final, cuando ya existen todas las vistas: ordena el menú por perfil y abre la vista del enlace (#rol, #pagos…).
// Perfil de ejemplo elegido en pantalla. En la app real lo asigna el servidor según la sesión y valida cada operación.
const COMUNIDAD = ['Comunidad', ['equipo', 'reuniones', 'cocina', 'acompanamiento', 'pagos', 'buzon']];
const MENU_POR_PERFIL = {
  docente: [
    ['', ['inicio']],
    ['Docente', ['maestro', 'agenda', 'lista', 'rol', 'lecciones', 'reservas']],
    COMUNIDAD,
  ],
  admin: [
    ['', ['inicio']],
    ['Administración Kids', ['coordinacion', 'rol', 'asistencia', 'alumnos', 'maestros', 'lecciones', 'reservas', 'incidencias', 'recogida', 'libros', 'eventos', 'familias', 'configuracion']],
    COMUNIDAD,
  ],
};
const PERFILES = { docente: 'Docente', admin: 'Administración' };
const finalMenu = nav.querySelector('[href="../index.html"]');
const alcance = nav.querySelector('[href="#alcance"]');
const vistasDe = perfil => MENU_POR_PERFIL[perfil].flatMap(([, vistas]) => vistas);
let perfil = new URLSearchParams(location.search).get('perfil') === 'admin' ? 'admin' : 'docente';

function ordenaMenu() {
  nav.querySelectorAll('.nav-grupo').forEach(rotulo => rotulo.remove());
  nav.querySelectorAll('a[href^="#"]:not([href="#alcance"])').forEach(a => a.classList.add('kids-oculta'));
  MENU_POR_PERFIL[perfil].forEach(([titulo, vistas]) => {
    const enlaces = vistas.map(id => nav.querySelector(`a[href="#${id}"]`)).filter(Boolean);
    if (!enlaces.length) return;
    if (titulo) {
      const rotulo = document.createElement('p');
      rotulo.className = 'nav-grupo';
      rotulo.textContent = titulo;
      finalMenu.before(rotulo);
    }
    enlaces.forEach(a => { a.classList.remove('kids-oculta'); finalMenu.before(a); });
  });
  // «Inicio Shalom» y «Alcance» cierran el menú, separados del resto.
  const otros = document.createElement('p');
  otros.className = 'nav-grupo';
  otros.textContent = 'Más';
  finalMenu.before(otros);
  alcance.before(finalMenu);
}

// Una vista de otro perfil no se abre: se vuelve a Inicio y se avisa.
const mostrarVista = showView;
showView = (name, moveFocus = false) => {
  const permitida = name === 'alcance' || vistasDe(perfil).includes(name);
  document.getElementById('perfil-aviso').textContent = permitida ? '' : `Esa vista no está disponible para el perfil ${PERFILES[perfil]}.`;
  mostrarVista(permitida ? name : 'inicio', moveFocus);
};

// Sesión de ejemplo: el perfil se elige como en un inicio de sesión, no con un «Ver como».
const sesionBarra = document.createElement('div');
sesionBarra.className = 'perfil-sesion';
sesionBarra.innerHTML = `<span class="perfil-etiqueta">Sesión de ejemplo</span><strong id="perfil-nombre"></strong><button type="button" class="button" id="perfil-cambiar" aria-haspopup="dialog" aria-controls="perfil-dialogo">Cambiar perfil</button><span id="perfil-aviso" role="status"></span>`;
document.querySelector('.topline').after(sesionBarra);
const dialogo = document.createElement('dialog');
dialogo.id = 'perfil-dialogo';
dialogo.setAttribute('aria-labelledby', 'perfil-dialogo-titulo');
dialogo.innerHTML = `<h2 id="perfil-dialogo-titulo">Entrar con un perfil de ejemplo</h2><p>En la versión real entrarás con tu cuenta y verás solo lo que te corresponde. Aquí no hay contraseñas: elige un perfil para probarlo.</p>
<ul class="perfil-opciones">
<li><a class="perfil-opcion" href="../index.html#login"><strong>Congregante</strong><span>Inicio, tu familia y la asistencia de tus hijos en Kids</span></a></li>
<li><a class="perfil-opcion" href="../index.html#login"><strong>Voluntario</strong><span>Tu agenda de servicio y estacionamiento</span></a></li>
${Object.entries(PERFILES).map(([id, nombre]) => `<li><button type="button" class="perfil-opcion" data-perfil="${id}"><strong>${nombre}</strong><span>${id === 'admin' ? 'Coordinación de Kids: rol, asistencia, alumnos y docentes' : 'Tu grupo, tu agenda, el rol y las lecciones'}</span></button></li>`).join('')}
</ul><p class="perfil-nota">Congregante y Voluntario se abren en el inicio de sesión de Shalom.</p><button type="button" class="button" id="perfil-cerrar">Cerrar</button>`;
document.body.append(dialogo);

function cambiaPerfil(nuevo, moveFocus = false) {
  perfil = nuevo;
  document.getElementById('perfil-nombre').textContent = PERFILES[perfil];
  dialogo.querySelectorAll('[data-perfil]').forEach(b => b.setAttribute('aria-current', String(b.dataset.perfil === perfil)));
  const url = new URL(location.href);
  if (perfil === 'admin') url.searchParams.set('perfil', 'admin'); else url.searchParams.delete('perfil');
  history.replaceState(null, '', url);
  window.ShalomKidsRol.setPerfil(perfil);
  window.dispatchEvent(new CustomEvent('shalom-kids-perfil', { detail: perfil }));
  ordenaMenu();
  const actual = location.hash.slice(1);
  showView(vistasDe(perfil).includes(actual) ? actual : 'inicio', moveFocus);
}
document.getElementById('perfil-cambiar').addEventListener('click', () => dialogo.showModal());
document.getElementById('perfil-cerrar').addEventListener('click', () => dialogo.close());
dialogo.addEventListener('click', event => {
  const boton = event.target.closest('[data-perfil]');
  if (!boton) return;
  dialogo.close();
  if (boton.dataset.perfil !== perfil) cambiaPerfil(boton.dataset.perfil, true);
});

cambiaPerfil(perfil);
const vistaDelEnlace = location.hash.slice(1);
if (document.getElementById(vistaDelEnlace)?.classList.contains('panel')) showView(vistaDelEnlace);
