"use strict";
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const files = [['dist/purify.es.mjs', 'purify.es.mjs'], ['LICENSE', 'DOMPurify-LICENSE.txt']];
for (const [source, destination] of files) {
  const original = fs.readFileSync(path.join(root, 'node_modules/dompurify', source));
  const target = path.join(root, 'assets/vendor', destination);
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(target) || !original.equals(fs.readFileSync(target))) {
      throw new Error('El filtro HTML local no coincide con la dependencia fijada. Ejecuta el script de sincronización.');
    }
  } else {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, original);
  }
}
console.log(process.argv.includes('--check') ? 'Filtro HTML y licencia verificados.' : 'Filtro HTML y licencia sincronizados.');
