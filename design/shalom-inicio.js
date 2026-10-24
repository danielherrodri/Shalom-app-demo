"use strict";
import { sanitizeBibleHTML, validateVerseImage, installBibleStyles } from '../assets/bible-reader.js';
const home = addDemoView('inicio', 'Inicio', 'sun', 'BIENVENIDO A CASA', 'Una comunidad <em>para crecer.</em>', 'Un espacio para encontrarnos, servir y compartir cada semana.', `
<section class="daily-scripture" aria-labelledby="daily-title"><div class="scripture-heading"><span class="icon-box sand">${icon('book')}</span><span class="view-label">UNA PALABRA PARA HOY · YOUVERSION</span></div><h2 id="daily-title">Versículo del día</h2><div id="daily-content" aria-live="polite"><p>Consultando el versículo…</p></div><div class="scripture-actions"><a class="button" id="daily-link" href="https://www.bible.com/es/verse-of-the-day" target="_blank" rel="noopener noreferrer">Abrir en YouVersion ${icon('arrow')}</a><button type="button" class="button" id="daily-retry" hidden>Volver a intentar</button></div></section>
<div class="subheading"><h2>¿Qué hacemos hoy?</h2><span>Encuentra tu espacio</span></div><div class="quick-actions"><button class="quick-action" data-home-view="reservas"><span class="icon-box">${icon('sprout')}</span><strong>Nos vemos en Kids</strong><span>Conoce a los maestros y reserva lugar.</span></button><button class="quick-action" data-home-view="cocina"><span class="icon-box sand">${icon('bag')}</span><strong>A la mesa, juntos</strong><span>Consulta y prepara el menú del mes.</span></button><button class="quick-action" data-home-view="equipo"><span class="icon-box lilac">${icon('users')}</span><strong>Conoce a nuestro equipo</strong><span>Las personas que hacen comunidad.</span></button></div>`);
nav.prepend(nav.querySelector('[href="#inicio"]'));
home.querySelectorAll('[data-home-view]').forEach(button => button.addEventListener('click', () => showView(button.dataset.homeView, true)));
const dailyContent = document.getElementById('daily-content');
const dailyLink = document.getElementById('daily-link');
const dailyRetry = document.getElementById('daily-retry');
function localScriptureDate() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type).value).join('-');
}
let scriptureDay = localScriptureDate();
let scriptureController;
async function refreshScripture() {
  scriptureController?.abort();
  scriptureController = new AbortController();
  const signal = scriptureController.signal;
  dailyContent.replaceChildren();
  const notice = document.createElement('p'); notice.textContent = 'Consultando el versículo…'; dailyContent.append(notice);
  dailyRetry.hidden = true; dailyLink.href = 'https://www.bible.com/es/verse-of-the-day';
  try {
    const response = await fetch('/api/v1/scripture/verse-of-day/', { credentials: 'omit', cache: 'no-store', signal });
    const data = await response.json();
    if (signal.aborted) return;
    if (!response.ok || data.available !== true || data.date !== localScriptureDate() ||
        ![data.text, data.reference, data.version, data.attribution].every(value => typeof value === 'string' && value.trim()) ||
        typeof data.chapter_url !== 'string' || !/^https:\/\/www\.bible\.com\/bible\/[1-9]\d*\/[A-Z0-9]{3}\.\d+$/.test(data.chapter_url)) throw new Error('Unavailable');
    dailyContent.replaceChildren();
    const art = validateVerseImage(data.image);
    if (art) {
      const figure = document.createElement('figure');
      figure.className = 'daily-verse-art';
      const image = document.createElement('img');
      image.src = art.url; image.width = art.width; image.height = art.height;
      image.alt = `Imagen del versículo: ${data.reference}`;
      image.loading = 'lazy'; image.decoding = 'async'; image.referrerPolicy = 'no-referrer';
      image.addEventListener('error', () => figure.remove(), { once: true });
      const caption = document.createElement('figcaption'); caption.textContent = art.attribution;
      figure.append(image, caption); dailyContent.append(figure);
    }
    const html = sanitizeBibleHTML(data.html);
    const passage = document.createElement(html ? 'article' : 'blockquote');
    if (html) {
      installBibleStyles();
      passage.setAttribute('data-yv-sdk', ''); passage.setAttribute('data-slot', 'yv-bible-renderer');
      passage.className = 'shalom-bible-content';
      passage.setAttribute('aria-label', `Pasaje: ${data.reference}`);
      passage.innerHTML = html; // Only DOMPurify output, never raw provider/user HTML.
    } else passage.textContent = data.text;
    dailyContent.append(passage);
    for (const [tag, value] of [['small', `${data.date} · YouVersion`], ['h3', data.reference], ['p', data.version], ['small', data.attribution]]) {
      const element = document.createElement(tag); element.textContent = value; dailyContent.append(element);
    }
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
function checkScriptureDay() { const today = localScriptureDate(); if (today !== scriptureDay) { scriptureDay = today; void refreshScripture(); } }
setInterval(checkScriptureDay, 30_000);
document.addEventListener('visibilitychange', checkScriptureDay);
void refreshScripture();
if (!location.hash || location.hash === '#inicio') { showView('inicio'); nav.scrollLeft = 0; }
