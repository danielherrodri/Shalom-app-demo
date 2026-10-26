"use strict";
// Se carga al final, cuando ya existen todas las vistas: ordena el menú por público y abre la vista del enlace (#rol, #pagos…).
const GRUPOS_MENU = [
  ['', ['inicio']],
  ['Docentes', ['maestro', 'rol', 'reservas']],
  ['Coordinación Kids', ['coordinacion', 'incidencias', 'recogida', 'libros', 'eventos', 'familias']],
  ['Comunidad', ['equipo', 'reuniones', 'cocina', 'acompanamiento', 'pagos', 'buzon']],
];
const finalMenu = nav.querySelector('[href="../index.html"]');
GRUPOS_MENU.forEach(([titulo, vistas]) => {
  const enlaces = vistas.map(id => nav.querySelector(`a[href="#${id}"]`)).filter(Boolean);
  if (!enlaces.length) return;
  if (titulo) {
    const rotulo = document.createElement('p');
    rotulo.className = 'nav-grupo';
    rotulo.textContent = titulo;
    finalMenu.before(rotulo);
  }
  enlaces.forEach(a => finalMenu.before(a));
});
// «Inicio Shalom» y «Alcance» cierran el menú, separados del resto.
const otros = document.createElement('p');
otros.className = 'nav-grupo';
otros.textContent = 'Más';
finalMenu.before(otros);
nav.querySelector('[href="#alcance"]').before(finalMenu);

const vistaDelEnlace = location.hash.slice(1);
if (document.getElementById(vistaDelEnlace)?.classList.contains('panel')) showView(vistaDelEnlace);
