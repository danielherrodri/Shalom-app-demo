// Guardarraíles del Manual de identidad visual Shalom 2026 (págs. 12–14) en el prototipo.
// Revisa el código sin abrir un navegador; las capturas en 360 px siguen siendo necesarias.
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const PAGES = ["index.html", "cafeteria.html", "comunicaciones.html", "feedback.html", "design/kids-paneles.html"];
const STYLE_FILES = [
  ...fs.readdirSync(path.join(root, "assets")).filter((f) => /\.(css|js)$/.test(f) && f !== "email-catalog.js" && f !== "font-source.css").map((f) => "assets/" + f),
  ...fs.readdirSync(path.join(root, "design")).filter((f) => /\.(css|js|html)$/.test(f)).map((f) => "design/" + f),
  "index.html", "cafeteria.html", "comunicaciones.html", "feedback.html",
];

let ok = 0;
const check = (name, fn) => { fn(); ok++; };

check("la hoja de reglas para celular se carga al final en las cinco áreas", () => {
  for (const page of PAGES) {
    const html = read(page);
    const visual = html.indexOf("shalom-visual-2026.css"), celular = html.indexOf("shalom-celular-2026.css");
    assert(celular > visual && visual > 0, page + ": shalom-celular-2026.css después de shalom-visual-2026.css");
  }
});

check("radios: 24 tarjetas, 16 campos y avisos, píldora en botones", () => {
  const allowed = /^(0|16px|24px|999px|50%|100%|var\(--[\w-]+\)|0 16px 16px 0|24px 24px 0 0|16px 16px 0 0)$/;
  for (const f of STYLE_FILES) {
    for (const m of read(f).matchAll(/border-radius:\s*([^;}"`\n]+?)\s*(?:!important)?\s*[;}"`\n]/g)) {
      assert(allowed.test(m[1].trim()), `${f}: radio «${m[1].trim()}»`);
    }
  }
});

check("sin sombras, tampoco en barras fijas", () => {
  for (const f of STYLE_FILES) {
    for (const m of read(f).matchAll(/box-shadow:\s*([^;}"`\n]+)/g)) {
      const v = m[1].trim().replace(/\s*!important$/, "");
      assert(v === "none" || v.startsWith("inset") || v.startsWith("var("), `${f}: sombra «${v}»`);
    }
  }
});

check("nada por debajo de 12 px", () => {
  for (const f of STYLE_FILES) {
    for (const m of read(f).matchAll(/font(?:-size)?:\s*(?:\d{3}\s+)?(\d*\.?\d+)(px|rem)\b/g)) {
      const px = Number(m[1]) * (m[2] === "rem" ? 16 : 1);
      assert(px >= 12, `${f}: ${m[0]}`);
    }
  }
});

check("Inter 400/600/700/800 con respaldo Arial", () => {
  for (const f of STYLE_FILES) {
    const t = read(f);
    assert(!/Inter,\s*system-ui/.test(t), f + ": respaldo system-ui en lugar de Arial");
    for (const m of t.matchAll(/font-weight:\s*(\d{3})(?!\s+\d)/g)) assert(["400", "600", "700", "800"].includes(m[1]), `${f}: peso ${m[1]}`);
  }
  for (const page of ["index.html", "cafeteria.html"]) assert(!/wght@[^"&]*500/.test(read(page)), page + ": carga el peso 500");
});

check("escala tipográfica del celular y de la web", () => {
  const css = read("assets/shalom-celular-2026.css");
  const mobile = css.slice(css.indexOf("@media (max-width: 599px)"));
  const web = css.slice(css.indexOf("@media (min-width: 600px)"), css.indexOf("@media (min-width: 600px) and"));
  assert(/main h1[^{]*\{ font-size: 32px !important; font-weight: 800/.test(mobile), "H1 32/800");
  assert(/main h2[^{]*\{ font-size: 24px !important; font-weight: 700/.test(mobile), "H2 24/700");
  assert(/main h3[^{]*\{ font-size: 18px !important; font-weight: 700/.test(mobile), "H3 18/700");
  assert(/font-size: 48px !important; font-weight: 800/.test(web) && /font-size: 40px/.test(web) && /font-size: 20px !important/.test(web), "escala web 48/40/20");
  assert(/grid-template-columns: minmax\(0, 1fr\) !important/.test(mobile), "una columna hasta 599 px");
  assert(/padding-left: 16px !important; padding-right: 16px !important/.test(mobile), "margen lateral de 16 px");
});

check("foco de 2 px en cobre-500, separado 2 px", () => {
  const css = read("assets/shalom-celular-2026.css");
  assert(/outline: 2px solid var\(--sh-focus\) !important;\s*outline-offset: 2px !important;/.test(css));
  assert(/--sh-focus: #c8956c/.test(css));
  for (const f of STYLE_FILES) assert(!/outline(?:-width)?:\s*3px|outline-offset:\s*[34]px/.test(read(f)), f + ": foco de 3 px");
});

check("rojo «live» reservado: los errores no usan rojo", () => {
  for (const f of STYLE_FILES) {
    const t = read(f).replace(/--live:#[0-9a-f]{6}/gi, "");
    assert(!/#(f87171|b91c1c|9b3830|ffb4aa|ffb4ab|a12222|9c342a)\b/i.test(t), f + ": rojo fuera de «En línea»");
  }
});

check("barra inferior: máximo 5 destinos, ícono y texto, sin iniciar sesión", () => {
  const html = read("index.html");
  const nav = html.match(/const mobileNav=\(\)=>([^\n]+)/)[1];
  for (const group of nav.split(/:state\.role===|\]:\[/)) {
    const n = (group.match(/navItem\(/g) || []).length;
    assert(n <= 5, "más de 5 destinos: " + group.slice(0, 60));
  }
  assert(!/navItem\('login'/.test(nav), "iniciar sesión debe vivir solo en el encabezado");
  assert(/aria-current="\$\{state\.screen===id\?'page':'false'\}" data-action="goto" data-id="\$\{id\}">\$\{I\(ic\)\}<span>/.test(html), "ícono, texto y aria-current");
});

check("un nombre por concepto, en español", () => {
  const html = read("index.html");
  assert(/parking:'Estacionamiento'/.test(html) && /kids:'Shalom Kids'/.test(html) && /login:'Iniciar sesión'/.test(html));
  for (const viejo of ["'parking','Cupo'", "'Ingresar'", "Resumen Kids", "'Estacionar'", "'Admin'", "Pedido demo", "Salir de la demo", "Cerrar sesión demo"]) {
    assert(!html.includes(viejo), "nombre duplicado o en inglés: " + viejo);
  }
  const roleNav = html.match(/const roleNav=\(\)=>\{if\(!state\.session\)return ([^;]+);/)[1];
  assert(!/'login'/.test(roleNav), "el menú lateral no repite iniciar sesión");
  assert(!/Tema: /.test(read("assets/shalom-theme.js")), "el tema se llama Noche o Crema");
});

check("filtros avanzados detrás de «Filtros»; administración oculta a las familias", () => {
  const lt = read("assets/list-tools.js");
  assert(/filtros-toggle" data-list="toggle" aria-expanded="false"/.test(lt) && /data-list="panel" hidden/.test(lt));
  const cm = read("assets/comunicaciones.js");
  assert(/<details class="filtros"/.test(cm), "Avisos por página detrás de «Filtros»");
  assert(/a\.hidden = !esAdmin;/.test(cm), "Procesamiento y Administrar ocultos sin rol de administración");
});

check("errores bajo el campo con ícono; estados vacíos que dicen qué pasa", () => {
  const a11y = read("assets/shalom-accessibility.js");
  assert(/document\.addEventListener\('invalid'/.test(a11y) && /className = 'campo-error'/.test(a11y));
  assert(/\.campo-error::before/.test(read("assets/shalom-celular-2026.css")));
  assert(!/>No hay (movimientos|asistencias visibles)\.</.test(read("index.html")));
});

check("horas en formato 9:00 AM", () => {
  assert(/hour12:true/.test(read("cafeteria.html")) && /hour12:true/.test(read("assets/notifications.js")));
  assert(/const h12=/.test(read("design/shalom-acompanamiento.js")) && !/time\+'–'\+time/.test(read("design/shalom-acompanamiento.js")));
});

console.log(`PASS manual celular 2026: ${ok} grupos de reglas`);
