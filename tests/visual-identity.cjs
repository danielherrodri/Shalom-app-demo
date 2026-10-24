'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const css = read('assets/shalom-visual-2026.css');
const spaces = [
  ['index.html','assets/shalom-visual-2026.css','main'],
  ['design/kids-paneles.html','../assets/shalom-visual-2026.css','kids'],
  ['cafeteria.html','assets/shalom-visual-2026.css','cafe'],
  ['comunicaciones.html','assets/shalom-visual-2026.css','comms'],
  ['feedback.html','assets/shalom-visual-2026.css','feedback']
];
for(const [file,stylesheet,space] of spaces) {
  const page=read(file);
  assert.ok(page.includes('href="'+stylesheet+'"'),file+' loads proposed visual tokens');
  assert.ok(page.includes('data-shalom-space="'+space+'"'),file+' retains its identity');
  assert.ok(page.indexOf(stylesheet)>page.indexOf('shalom-theme.css'),file+' loads tokens after theme');
  assert.ok(page.includes('shalom-accessibility.css'),file+' retains text enlargement');
}
const index=read('index.html');
assert.ok(index.includes('data-shalom-category="${X(screen)}"'),'main dashboard has semantic tile colors');
assert.ok(index.includes('data-kids-status="${m.verified?'),'Kids demo retains status as structured data');
assert.ok(index.includes('data-kids-module="attendance"'),'Kids demo attendance is distinct');
assert.match(css,/--sh-fire:#b84810/,'official Kids fire is primary');
assert.match(css,/--sh-fire-ink:#8f360c/,'official Kids fire ink');
assert.match(css,/--sh-forest:#24483e/,'proposed forest token');
assert.match(css,/--sh-turquoise:#14635a/,'proposed attendance token');
assert.match(css,/data-kids-status="verified"/);
assert.match(css,/data-kids-status="pending"/);
assert.match(css,/quick-action\[data-home-view="reservas"\]/);
assert.ok(!css.includes('filter:grayscale'), 'do not change the logo colors');
function luminance(hex) {
  const channels=hex.replace('#','').match(/.{2}/g).map(v=>parseInt(v,16)/255)
    .map(v=>v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4));
  return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;
}
function contrast(a,b) {
  const x=luminance(a),y=luminance(b);
  return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
for(const [text,bg] of [
  ['#82552f','#faf7f2'], ['#c8956c','#1a1a1a'],
  ['#ffffff','#b84810'], ['#8f360c','#fff0e7'],
  ['#24483e','#e4f0e7'], ['#244f65','#e8f3f7'],
  ['#6e3d62','#f5e9f1'], ['#5a5b28','#f2f0da'],
  ['#14635a','#d9f5ee'], ['#2e4f88','#e8f0ff'],
  ['#5f3c90','#f1e9ff'], ['#3b651c','#edf6df'],
  ['#973d38','#fdece8']
]) assert.ok(contrast(text,bg)>=4.5, text+' over '+bg+' must reach 4.5:1');
const doc=read('docs/identidad-visual-propuesta-2026.md');
assert.match(doc,/no oficiales/i,'secondary palettes remain proposals');
assert.match(doc,/no modifica/i,'no claim of operational changes');
console.log('PASS: visual identity, 5 areas, official accents, color contrast and proposal status');
