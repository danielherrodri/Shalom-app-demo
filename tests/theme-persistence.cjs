'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const themeSource = fs.readFileSync(path.join(root, 'assets/shalom-theme.js'), 'utf8');
const read = filename => fs.readFileSync(path.join(root, filename), 'utf8');
const KEY = 'shalom-ui-theme-v1';

function boot(space, storage, blocked = false) {
  const classes = new Set();
  const events = new Map();
  const page = { dataset: {}, classList: { toggle(name, yes) { if (yes) classes.add(name); else classes.delete(name); } } };
  const html = { dataset: {} };
  const button = { textContent: '', attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } };
  const meta = { attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } };
  page.dataset.shalomSpace = space;
  const document = {
    readyState: 'complete', body: page, documentElement: html,
    querySelector() { return meta; },
    querySelectorAll() { return [button]; },
    addEventListener(k, fn) { if (!events.has(k)) events.set(k, []); events.get(k).push(fn); },
    dispatchEvent(ev) { (events.get(ev.type) || []).forEach(fn => fn(ev)); }
  };
  const windowEvents = new Map();
  const window = { addEventListener(k, fn) { windowEvents.set(k, fn); } };
  const localStorage = {
    getItem(k) { if (blocked) throw new Error('blocked'); return storage.has(k) ? storage.get(k) : null; },
    setItem(k, val) { if (blocked) throw new Error('blocked'); storage.set(k, val); }
  };
  class CustomEvent {
    constructor(type, props) { this.type = type; this.detail = props.detail; }
  }
  vm.runInNewContext(themeSource, { window, document, localStorage, CustomEvent });
  return {
    api: window.ShalomTheme, html, classes, button, meta,
    storageEvent(ev) { windowEvents.get('storage')(ev); }
  };
}

const storage = new Map([['shalom-demo-v03', JSON.stringify({ version: 3, theme: 'cream', otherFictitiousValue: 42 })]]);
const main = boot('main', storage);
assert.equal(main.api.get(), 'cream', 'migrates former main theme');
assert.equal(main.html.dataset.shalomTheme, 'cream');
assert.ok(main.classes.has('theme-cream'));
assert.ok(!storage.has(KEY), 'reading legacy preference is not an unrelated data write');
main.api.set('night');
assert.equal(storage.get(KEY), 'night', 'persists chosen theme to a dedicated key');
assert.ok(main.classes.has('theme-night'));
assert.equal(main.meta.attrs.content, '#1a1a1a');
assert.equal(main.button.attrs['aria-label'], 'Cambiar a tema Crema');
main.api.set('cream');
assert.equal(storage.get(KEY), 'cream');
for (const name of ['cafe', 'kids', 'comms', 'feedback']) {
  const page = boot(name, storage);
  assert.equal(page.api.get(), 'cream', name + ' remembers light selection');
  assert.equal(page.html.dataset.shalomTheme, 'cream');
  assert.equal(page.button.textContent, 'Tema Noche');
  if (name === 'comms') assert.equal(page.classes.has('night'), false);
  else assert.ok(page.classes.has('theme-cream'));
}
const communications = boot('comms', storage);
communications.api.toggle();
assert.equal(storage.get(KEY), 'night');
assert.ok(communications.classes.has('night'));
const cafe = boot('cafe', storage);
assert.ok(cafe.classes.has('theme-night'));
storage.set(KEY, 'cream');
cafe.storageEvent({ key: KEY });
assert.ok(cafe.classes.has('theme-cream'), 'storage events sync another tab');
assert.ok(!cafe.classes.has('theme-night'));
assert.equal(storage.get('shalom-demo-v03'), JSON.stringify({ version: 3, theme: 'cream', otherFictitiousValue: 42 }), 'does not overwrite unrelated state');
storage.set(KEY, 'unexpected');
assert.equal(boot('kids', storage).api.get(), 'cream', 'invalid shared value falls back to legacy or default');
assert.equal(boot('cafe', new Map(), true).api.get(), 'night', 'storage blocked still uses a safe default');

const required = [
  ['index.html', 'assets/shalom-theme.js'],
  ['cafeteria.html', 'assets/shalom-theme.js'],
  ['comunicaciones.html', 'assets/shalom-theme.js'],
  ['design/kids-paneles.html', '../assets/shalom-theme.js'],
  ['feedback.html', 'assets/shalom-theme.js'],
];
for (const [file, script] of required) {
  const page = read(file);
  assert.ok(page.includes(script), file + ' loads theme engine');
  assert.ok(page.includes('shalom-theme.css'), file + ' loads light/dark CSS');
}
assert.match(read('cafeteria.html'), /data-shalom-theme-toggle/);
assert.match(read('design/kids-paneles.html'), /data-shalom-theme-toggle/);
assert.match(read('feedback.html'), /data-shalom-theme-toggle/);
assert.ok(read('design/kids-paneles.js').includes('a[href^="#"]'), 'Kids external Inicio link is not intercepted');
assert.match(read('index.html'), /state\.theme=window\.ShalomTheme\.get\(\)/);
assert.match(read('assets/comunicaciones.js'), /window\.ShalomTheme\.toggle\(\)/);
console.log('Tema compartido: migración, guardado, 4 módulos, sincronización y modo privado correctos.');
