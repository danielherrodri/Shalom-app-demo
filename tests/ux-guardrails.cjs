'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const css = read('assets/ux-unificado.css');
const pages = [
  ['index.html', 'main'],
  ['cafeteria.html', 'cafe'],
  ['comunicaciones.html', 'comms'],
  ['design/kids-paneles.html', 'kids'],
];
for (const [file, space] of pages) {
  const source = read(file);
  assert.match(source, new RegExp('data-shalom-space="' + space + '"'), file + ' must have a scoped body');
  assert.ok(source.includes('ux-unificado.css'), file + ' must load shared UX styles');
  assert.ok(css.includes('data-shalom-space="' + space + '"'), space + ' must have styling');
}
const cafeteria = read('cafeteria.html');
assert.match(cafeteria, /class="mobile-return" href="\.\/index\.html"/);
assert.match(cafeteria, /\['seguimiento','Seguimiento','track'\]\]/, 'only three operational tabs must be prominent');
assert.doesNotMatch(cafeteria, /\['propuesta','Propuesta','plan'\]/, 'roadmap must not be in operational navigation');
const communications = read('comunicaciones.html');
const mobileNav = communications.match(/<nav class="mobile-nav"[^>]*>([\s\S]*?)<\/nav>/);
assert.ok(mobileNav, 'communications must have mobile navigation');
assert.equal((mobileNav[1].match(/data-route=/g) || []).length, 3, 'community mobile nav must expose 3 destinations');
assert.doesNotMatch(mobileNav[1], /procesamiento|admin/, 'technical routes must not be on community mobile nav');
assert.match(read('design/kids-paneles.html'), /href="\.\.\/index\.html">Inicio Shalom/);
assert.match(css, /\.mobile-bottom button[\s\S]*?font-size:\s*\.8125rem/);
assert.match(css, /\.mobile-nav a[\s\S]*?font-size:\s*var\(--shalom-text-nav\)/);
const shell = read('frontend/src/ui/AppShell.tsx');
const attendance = read('frontend/src/main.tsx');
assert.match(shell, /aria-current=/);
assert.match(shell, /shalom-mobile-nav/);
assert.match(shell, /profileName \?/, 'do not expose Kids navigation before authentication');
assert.match(attendance, /visiblePeople/);
assert.match(attendance, /g\.results\.length === 1/, 'single group should be automatically selected');
assert.match(attendance, /aria-live="polite"/);
const accessibility = read('assets/shalom-accessibility.css');
assert.match(accessibility, /\.kids-context\s*>\s*\.grid\s*\{[\s\S]*?grid-template-columns:minmax\(0,1fr\)/, 'Kids cards need full width on phones');
assert.match(accessibility, /data-shalom-large-text="true"[\s\S]*?\.mobile-bottom\s*\{[\s\S]*?position:fixed/, 'large text must preserve mobile bottom navigation');
console.log('UX guardrails: responsive Kids cards, persistent mobile nav, areas and accessibility passed.');

const kidsCss=read('design/kids-paneles.css');
assert.match(kidsCss,/header nav\s*\{[\s\S]*?grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/, 'Kids uses grid without horizontal nav scrolling');
assert.match(kidsCss,/scroll-snap-type:none/, 'Kids does not use a swipe-only menu');
const main=read('index.html');
assert.match(main,/const priorities=isAdmin/, 'home has contextual priorities');
assert.match(main,/home-priorities/, 'home exposes secondary tasks deliberately');
assert.match(main,/service-grid/, 'other modules remain available');
const family=read('assets/shalom-family-service.js');
assert.match(family,/Resumen de inscripción familiar/, 'family enrollment has confirmation summary');
assert.match(family,/Corregir selección/, 'family summary allows correction');
const visual=read('assets/shalom-visual-2026.css');
assert.match(visual,/--sh-status:var\(--sh-attention\)/, 'pending is not coral community');
assert.match(visual,/quick-action\[data-detail="incident"\]/, 'incidents have distinct attention semantics');
console.log('PASS: SPARK main priorities, Kids reflow, accessible typography and family summary');
