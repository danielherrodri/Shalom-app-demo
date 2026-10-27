"use strict";
// Versículo del día de YouVersion, compartido por Inicio y Kids. Solo muestra lo que devuelve la API del mismo
// sitio; sin API (por ejemplo en GitHub Pages) la tarjeta ofrece el enlace a YouVersion y nunca inventa un texto.
import { sanitizeBibleHTML, validateVerseImage, installBibleStyles } from './bible-reader.js';

export const YOUVERSION_URL = 'https://www.bible.com/es/verse-of-the-day';

export function scriptureDate() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type).value).join('-');
}

// «2026-10-27» → «27 de octubre de 2026», como el resto de fechas de Shalom.
const humanDate = value => new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`));

export async function loadVerse(signal) {
  const response = await fetch('/api/v1/scripture/verse-of-day/', { credentials: 'omit', cache: 'no-store', signal });
  const data = await response.json();
  if (!response.ok || data.available !== true || data.date !== scriptureDate() ||
      ![data.text, data.reference, data.version, data.attribution].every(value => typeof value === 'string' && value.trim()) ||
      typeof data.chapter_url !== 'string' || !/^https:\/\/www\.bible\.com\/bible\/[1-9]\d*\/[A-Z0-9]{3}\.\d+$/.test(data.chapter_url)) throw new Error('Unavailable');
  return data;
}

export function verseNodes(data) {
  const nodes = [];
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
    figure.append(image, caption); nodes.push(figure);
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
  nodes.push(passage);
  for (const [tag, value] of [['small', `${humanDate(data.date)} · YouVersion`], ['h3', data.reference], ['p', data.version], ['small', data.attribution]]) {
    const element = document.createElement(tag); element.textContent = value; nodes.push(element);
  }
  return nodes;
}

// Inicio vuelve a dibujar la página en cada cambio de estado: el resultado se guarda por día y la tarjeta
// [data-daily-verse] se rellena desde ahí, sin repetir la consulta.
let result = null, pending = null;
function fill(card) {
  const content = card.querySelector('[data-verse-content]'), link = card.querySelector('[data-verse-link]'), retry = card.querySelector('[data-verse-retry]');
  const notice = document.createElement('p');
  retry.hidden = true; link.href = YOUVERSION_URL; link.firstChild.textContent = 'Abrir en YouVersion ';
  if (!result || pending) { notice.textContent = 'Consultando el versículo…'; content.replaceChildren(notice); return; }
  if (result.data) {
    content.replaceChildren(...verseNodes(result.data));
    link.href = result.data.chapter_url; link.firstChild.textContent = 'Leer el capítulo en YouVersion ';
    return;
  }
  notice.textContent = 'El versículo de hoy está disponible en YouVersion.';
  content.replaceChildren(notice); retry.hidden = false;
}
function refresh(force) {
  const day = scriptureDate();
  if (!force && (pending || result?.day === day)) return;
  pending = loadVerse().then(data => ({ day, data }), () => ({ day, data: null }))
    .then(value => { result = value; pending = null; document.querySelectorAll('[data-daily-verse]').forEach(fill); });
  document.querySelectorAll('[data-daily-verse]').forEach(fill);
}
export function mountDailyVerse() {
  document.querySelectorAll('[data-daily-verse]').forEach(fill);
  refresh(false);
}
document.addEventListener('click', event => { if (event.target.closest('[data-verse-retry]')) refresh(true); });
document.addEventListener('visibilitychange', () => { if (document.querySelector('[data-daily-verse]')) refresh(false); });
