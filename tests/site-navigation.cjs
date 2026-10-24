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
assert.equal(nav.attributes['aria-label'],'Áreas de Shalom');
const list=nav.children[1].children;
assert.equal(list.length,5);
assert.deepEqual(list.map(x=>x.textContent).join('|'),'Inicio|Shalom Kids|Cafetería|Avisos|Tu opinión');
assert.equal(list[2].attributes['aria-current'],'page');
assert.ok(list[4].href.endsWith('/Shalom-app-demo/feedback.html?service=cafe'));
window.ShalomNavigation.mount(host,{service:'kids'});
assert.equal(host.children[0].children[1].children[4].href.includes('service=kids'),true);
assert.equal(host.children.length,1,'rerenders do not duplicate navigation');
document.body.dataset.shalomSpace='feedback';
const opinion=element('header');
window.ShalomNavigation.mount(opinion);
assert.equal(opinion.children[0].children[1].children[4].attributes['aria-current'],'page');
assert.equal(opinion.children[0].children[1].children[0].href,'https://danielherrodri.github.io/Shalom-app-demo/index.html');
console.log('PASS: cinco areas, rutas, contextos de opinion, tema y navegacion no duplicada');
