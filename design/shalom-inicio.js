"use strict";
import { YOUVERSION_URL, scriptureDate, loadVerse, verseNodes } from '../assets/versiculo-del-dia.js';
const home = addDemoView('inicio', 'Inicio', 'sun', 'BIENVENIDO A CASA', 'Una comunidad <em>para crecer.</em>', 'Un espacio para encontrarnos, servir y compartir cada semana.', `
<section class="daily-scripture" aria-labelledby="daily-title"><div class="scripture-heading"><span class="icon-box sand">${icon('book')}</span><span class="view-label">UNA PALABRA PARA HOY · YOUVERSION</span></div><h2 id="daily-title">Versículo del día</h2><div id="daily-content" aria-live="polite"><p>Consultando el versículo…</p></div><div class="scripture-actions"><a class="button" id="daily-link" href="https://www.bible.com/es/verse-of-the-day" target="_blank" rel="noopener noreferrer">Abrir en YouVersion ${icon('arrow')}</a><button type="button" class="button" id="daily-retry" hidden>Volver a intentar</button></div></section>
<div class="subheading"><h2>¿Qué hacemos hoy?</h2><span>Encuentra tu espacio</span></div><div class="quick-actions"><button class="quick-action" data-home-view="reservas"><span class="icon-box">${icon('sprout')}</span><strong>Nos vemos en Kids</strong><span>Conoce a los maestros y reserva lugar.</span></button><button class="quick-action" data-home-view="cocina"><span class="icon-box sand">${icon('bag')}</span><strong>A la mesa, juntos</strong><span>Consulta y prepara el menú del mes.</span></button><button class="quick-action" data-home-view="equipo"><span class="icon-box lilac">${icon('users')}</span><strong>Conoce a nuestro equipo</strong><span>Las personas que hacen comunidad.</span></button></div>`);
nav.prepend(nav.querySelector('[href="#inicio"]'));
const careAction = document.createElement('button');
careAction.type = 'button'; careAction.className = 'quick-action'; careAction.dataset.homeView = 'acompanamiento';
careAction.innerHTML = '<span class="icon-box">'+icon('heart')+'</span><strong>Quiero conversar con alguien</strong><span>Solicita acompañamiento espiritual y consulta horarios de ejemplo.</span>';
home.querySelector('.quick-actions').append(careAction);
home.querySelectorAll('[data-home-view]').forEach(button => button.addEventListener('click', () => showView(button.dataset.homeView, true)));
const dailyContent = document.getElementById('daily-content');
const dailyLink = document.getElementById('daily-link');
const dailyRetry = document.getElementById('daily-retry');
let scriptureDay = scriptureDate();
let scriptureController;
async function refreshScripture() {
  scriptureController?.abort();
  scriptureController = new AbortController();
  const signal = scriptureController.signal;
  dailyContent.replaceChildren();
  const notice = document.createElement('p'); notice.textContent = 'Consultando el versículo…'; dailyContent.append(notice);
  dailyRetry.hidden = true; dailyLink.href = YOUVERSION_URL;
  try {
    const data = await loadVerse(signal);
    if (signal.aborted) return;
    dailyContent.replaceChildren(...verseNodes(data));
    dailyLink.href = data.chapter_url;
    dailyLink.replaceChildren(document.createTextNode('Leer el capítulo en YouVersion'));
  } catch {
    if (signal.aborted) return;
    dailyContent.replaceChildren();
    notice.textContent = 'No pudimos cargar el versículo del día. Puedes leerlo en YouVersion.';
    dailyContent.append(notice); dailyRetry.hidden = false;
    dailyLink.replaceChildren(document.createTextNode('Abrir en YouVersion'));
  }
}
dailyRetry.addEventListener('click', refreshScripture);
function checkScriptureDay() { const today = scriptureDate(); if (today !== scriptureDay) { scriptureDay = today; void refreshScripture(); } }
setInterval(checkScriptureDay, 30_000);
document.addEventListener('visibilitychange', checkScriptureDay);
void refreshScripture();
if (!location.hash || location.hash === '#inicio') { showView('inicio'); nav.scrollLeft = 0; }
