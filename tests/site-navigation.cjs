'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const pages = [
  ['index.html', 'main'],
  ['design/kids-paneles.html', 'kids'],
  ['cafeteria.html', 'cafe'],
  ['comunicaciones.html', 'comms'],
  ['feedback.html', 'feedback']
];
for (const [file, id] of pages) {
  const src = read(file);
  const prefix = id === 'kids' ? '../assets/' : 'assets/';
  assert.ok(src.includes(prefix+'shalom-navigation.js'),file+' loads common navigation');
  assert.ok(src.includes(prefix+'shalom-navigation.css'),file+' loads navigation styles');
  assert.ok(src.includes('data-shalom-space="'+id+'"'),file+' identifies current area');
  assert.ok(src.includes('ShalomNavigation.mount('),file+' mounts navigation');
  assert.ok(src.includes(prefix+'shalom-theme.js'),file+' loads theme preference');
}
assert.ok(!read('index.html').includes('Explorar nuevos mockups'),'remove misleading generic mockups CTA');
assert.ok(!read('design/kids-paneles.html').includes('<title>Shalom · Mockups'),'use a functional title for Kids');
assert.ok(!read('feedback.html').includes('Boceto'),'feedback is a clear area, not a mockup');
assert.ok(read('feedback.html').includes('data-shalom-theme-toggle'),'opinion offers theme switch');
assert.ok(read('assets/feedback.js').includes('if (!app) return;'),'feedback logic only executes in its own area');

function element(tag) {
  return {
    tag, children:[], attributes:{}, className:'', textContent:'', href:'',
    setAttribute(k,v){this.attributes[k]=v;},
    getAttribute(k){return this.attributes[k]??null;},
    addEventListener(k,fn){this.events||={};this.events[k]=fn;},
    append(...items){for(const item of items){item.parent=this;this.children.push(item);}},
    prepend(item){item.parent=this;this.children.unshift(item);},
    remove(){ if(this.parent) this.parent.children=this.parent.children.filter(item=>item!==this); },
    querySelector(sel) {
      if (sel === '.shalom-area-nav') return this.children.find(n=>n.className === 'shalom-area-nav') || null;
      if (sel === '.topbar') return this.children.find(n=>n.className === 'topbar') || null;
      return null;
    },
    insertAdjacentElement(where,el){ if(where==='afterend')this.childAfter=el;}
  };
}
const document = {
  body:{dataset:{shalomSpace:'cafe'}},
  currentScript:{src:'https://danielherrodri.github.io/Shalom-app-demo/assets/shalom-navigation.js'},
  createElement:element
};
const window = {};
vm.runInNewContext(read('assets/shalom-navigation.js'),{document,window,URL});
const host=element('main');
window.ShalomNavigation.mount(host,{service:'cafe'});
assert.equal(host.children.length,1);
const nav=host.children[0];
assert.equal(nav.attributes['aria-label'],'Más áreas de Shalom');
const list=nav.children[1].children[0].children;
assert.equal(list.length,4);
assert.equal(list.map(x=>x.textContent).join('|'),'Inicio|Shalom Kids|Avisos|Tu opinión');
assert.equal(nav.children[0].className,'shalom-area-top');
assert.equal(nav.children[0].children[1].className,'shalom-area-actions');
assert.equal(nav.children[1].className,'shalom-area-panel');
const quickText=nav.children[0].children[1].children[0];
assert.equal(quickText.className,'shalom-text-toggle shalom-text-quick');
assert.equal(quickText.attributes['data-large-text'],'');
const toggle=nav.children[0].children[1].children[1];
assert.equal(toggle.className,'shalom-areas-toggle');
assert.equal(toggle.attributes['aria-expanded'],'false');
assert.equal(nav.attributes['data-mobile-open'],'false');
toggle.events.click();
assert.equal(toggle.attributes['aria-expanded'],'true');
assert.equal(nav.attributes['data-mobile-open'],'true');
const navCss=read('assets/shalom-navigation.css');
assert.match(navCss,/display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
assert.doesNotMatch(navCss,/overflow-x:auto/,'areas must not use a horizontal carousel on phones');
const notificationsCss=read('assets/notifications.css');
assert.match(notificationsCss,/#notification-entry\s*\{position:static/);
assert.doesNotMatch(notificationsCss,/#notification-entry\s*\{position:fixed/);
assert.match(read('comunicaciones.html'),/class="dialog-dismiss" data-action="close" aria-label="Cerrar ventana"/);
assert.ok(list[3].href.endsWith('/Shalom-app-demo/feedback.html?service=cafe'));
window.ShalomNavigation.mount(host,{service:'kids'});
assert.equal(host.children[0].children[1].children[0].children[3].href.includes('service=kids'),true);
assert.equal(host.children[0].attributes['data-mobile-open'],'true','open navigation survives a render');
assert.equal(host.children.length,1,'rerenders do not duplicate navigation');
document.body.dataset.shalomSpace='main';
const home=element('main');
window.ShalomNavigation.mount(home,{noticesInLocalNav:true});
const mainLinks=home.children[0].children[1].children[0].children;
assert.equal(mainLinks.length,3,'main omits destinations already in bottom navigation');
assert.equal(mainLinks.map(x=>x.textContent).join('|'),'Shalom Kids|Cafetería|Tu opinión');
window.ShalomNavigation.mount(home,{noticesInLocalNav:false});
assert.equal(home.children[0].children[1].children[0].children.length,4,'Avisos is available when no local shortcut exists');
document.body.dataset.shalomSpace='feedback';
const opinion=element('header');
window.ShalomNavigation.mount(opinion);
assert.equal(opinion.children[0].children[1].children[0].children.length,4);
assert.equal(opinion.children[0].children[1].children[0].children[0].href,'https://danielherrodri.github.io/Shalom-app-demo/index.html');
console.log('PASS: secciones complementarias por area, tipografia accesible y sin duplicados');

const accessible=read('assets/shalom-accessibility.css');
assert.match(accessible,/\.kids-context\s*>\s*\.grid\s*\{[\s\S]*?grid-template-columns:minmax\(0,1fr\)/);
assert.doesNotMatch(accessible,/\.mobile-bottom\s*\{flex-wrap:wrap;position:static\}/);
assert.match(accessible,/body\[data-shalom-space="main"\]\s+\.mobile-bottom\s*\{[\s\S]*?position:fixed/);
assert.match(navCss,/\.shalom-area-panel\s*\{\s*display:none;/);
assert.match(navCss,/\[data-mobile-open="true"\]\s+\.shalom-area-panel/);
// Visitante (sin sesión de prueba): sin barra de áreas, solo «Ampliar texto».
const visitorHost=element('main');
window.ShalomNavigation.mount(visitorHost,{service:'cafe',visitor:true});
assert.equal(visitorHost.children.length,1);
assert.equal(visitorHost.children[0].className,'shalom-area-nav shalom-area-visitor');
assert.equal(visitorHost.children[0].children.map(x=>x.textContent).join('|'),'Ampliar texto');
assert.ok(read('index.html').includes('visitor:!state.session'),'Inicio oculta la barra de áreas a visitantes');
