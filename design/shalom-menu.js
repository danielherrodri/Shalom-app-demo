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

const selector = document.createElement('div');
selector.className = 'perfil-switch';
selector.innerHTML = `<span id="perfil-titulo">Ver como</span><div role="group" aria-labelledby="perfil-titulo">${Object.entries(PERFILES).map(([id, nombre]) => `<button type="button" class="button" data-perfil="${id}">${nombre}</button>`).join('')}</div><span id="perfil-aviso" role="status"></span>`;
document.querySelector('.topline').after(selector);

function cambiaPerfil(nuevo, moveFocus = false) {
  perfil = nuevo;
  selector.querySelectorAll('[data-perfil]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.perfil === perfil)));
  const url = new URL(location.href);
  if (perfil === 'admin') url.searchParams.set('perfil', 'admin'); else url.searchParams.delete('perfil');
  history.replaceState(null, '', url);
  window.ShalomKidsRol.setPerfil(perfil);
  window.dispatchEvent(new CustomEvent('shalom-kids-perfil', { detail: perfil }));
  ordenaMenu();
  const actual = location.hash.slice(1);
  showView(vistasDe(perfil).includes(actual) ? actual : 'inicio', moveFocus);
}
selector.addEventListener('click', event => {
  const boton = event.target.closest('[data-perfil]');
  if (boton && boton.dataset.perfil !== perfil) cambiaPerfil(boton.dataset.perfil, true);
});

cambiaPerfil(perfil);
const vistaDelEnlace = location.hash.slice(1);
if (document.getElementById(vistaDelEnlace)?.classList.contains('panel')) showView(vistaDelEnlace);
