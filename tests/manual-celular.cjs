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
  // Barra común: 5 destinos con ícono y texto; los accesos del perfil van a «Más».
  const marco = read("assets/shalom-navigation.js");
  assert(/const inner = `\$\{svg\(ICONS\[id\]\)\}<span>\$\{label\}<\/span>`/.test(marco) && /aria-current="page"/.test(marco), "ícono, texto y aria-current");
  assert(/window\.ShalomNavigation\.setLocal\(mobileNav\(\)/.test(html), "Inicio pasa sus accesos de perfil a «Más»");
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
  assert(!/addDemoView\('incidencias', 'Acompañamiento'/.test(read("design/shalom-vistas.js")), "«Acompañamiento» es solo el espiritual; la vista interna se llama Seguimiento");
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
  // Horas escritas a mano en textos visibles: siempre con AM/PM.
  for (const f of ["design/kids-paneles.html", "design/kids-paneles.js", "assets/shalom-family-service.js"])
    for (const m of read(f).matchAll(/(?:· |–|<strong>\d+ \w+ · )(\d{1,2}:\d{2})(?! ?[AP]M)/g)) assert.fail(`${f}: hora ${m[1]} sin AM/PM`);
});

check("rol de clases de Kids: mismo cálculo que el sistema (permutas simples e intercambios)", () => {
  assert(/<script src="shalom-rol\.js" defer><\/script>/.test(read("design/kids-paneles.html")), "kids-paneles carga shalom-rol.js");
  const rol = read("design/shalom-rol.js");
  assert(/function quienDa\(/.test(rol) && /p\.devuelve && clave\(p\.grupo, p\.devuelve, p\.servicioDevuelve, p\.cubre\)/.test(rol), "aplica el turno devuelto de un intercambio");
  assert(!/localStorage|fetch\(/.test(rol), "datos ficticios en memoria: no guarda ni envía nada");
});

check("menú de Kids agrupado por público y enlaces directos a cada vista", () => {
  const html = read("design/kids-paneles.html"), menu = read("design/shalom-menu.js");
  assert(html.indexOf('<script src="shalom-menu.js" type="module"></script>') > html.indexOf('<script src="shalom-inicio.js" type="module"></script>'), "el menú se ordena después de crear todas las vistas");
  const vistas = ["maestro", "reservas", "coordinacion", "equipo"];
  for (const f of ["shalom-vistas.js", "shalom-pagos.js", "shalom-reuniones.js", "shalom-acompanamiento.js", "shalom-rol.js", "shalom-kids-perfil.js", "shalom-inicio.js"])
    for (const m of read("design/" + f).matchAll(/addDemoView\(\s*'([a-z]+)'/g)) vistas.push(m[1]);
  for (const id of vistas) assert(menu.includes(`'${id}'`), `la vista ${id} tiene grupo en el menú`);
  assert(/if \(document\.getElementById\(vistaDelEnlace\)\?\.classList\.contains\('panel'\)\) showView\(vistaDelEnlace\)/.test(menu), "#rol, #pagos… abren su vista");
});

check("enlaces sueltos con área táctil de 44 px", () => {
  assert(/\.row > a, \.list-actions > a, \.panel > a:not\(\.btn\):not\(\.button\), \.preview > a,\s*\.shalom-feedback-heading > a \{[^}]*min-height: 44px/.test(read("assets/shalom-celular-2026.css")));
});

check("casillas con etiqueta táctil de 44 px", () => {
  const css = read("assets/shalom-celular-2026.css");
  assert(/label:has\(> input\[type="checkbox"\]\)[^{]*\{[^}]*min-height: 44px/.test(css));
  assert(/input\[type="checkbox"\], input\[type="radio"\] \{ width: 24px; height: 24px;/.test(css));
  assert(/\.external-link \{[^}]*min-height: 44px/.test(css));
});

check("contenido de prueba con la voz de Shalom: datos pendientes entre corchetes, sin lorem ipsum", () => {
  for (const f of ["index.html", "feedback.html"]) {
    assert(!/lorem|ipsum/i.test(read(f)), f + " sin lorem ipsum");
    assert(/\[fecha\]/.test(read(f)), f + " marca los datos pendientes entre corchetes");
  }
  assert(!/prueba\/kids\.svg/.test(read("index.html")), "el Inicio de Iglesia no usa ilustraciones de Kids");
});

check("Inicio sin repeticiones: una ilustración por tema, con versión Noche, y enlaces que dicen a dónde llevan", () => {
  const html = read("index.html");
  const used = [...html.matchAll(/art\('([\w-]+)'\)|\['[^']+','([\w-]+)','[^']*\[(?:fecha|lugar)\]/g)].map((m) => m[1] || m[2]);
  assert.equal(new Set(used).size, used.length, "ilustraciones repetidas en el Inicio: " + used);
  for (const name of used)
    for (const f of [name, name + "-noche"])
      assert(fs.existsSync(path.join(root, "assets/prueba", f + ".svg")), "falta assets/prueba/" + f + ".svg");
  assert(!/Abrir comunicaciones/.test(html), "cada aviso tiene un enlace con su propio nombre");
  assert(/aria-label="Leer aviso: \$\{X\(n\.title\)\}">Leer aviso</.test(html), "el nombre accesible empieza con el texto visible");
  assert.equal((html.match(/DEMOSTRACIÓN · SIN PAGOS/g) || []).length, 1, "una sola etiqueta Demostración");
  assert.equal((html.match(/data-action="theme"/g) || []).length, 2, "tema en la barra superior y en Mi perfil, no en la lateral");
});

check("una franja de demostración con el botón Aa, igual en todas las áreas", () => {
  const nav = read("assets/shalom-navigation.css"), js = read("assets/shalom-navigation.js"), a11y = read("assets/shalom-accessibility.js");
  assert(/Versión de demostración · datos de ejemplo<\/span><button type="button" class="shalom-text-toggle shalom-frame-aa" data-large-text>Aa<\/button>/.test(js), "la franja lleva el aviso y Aa");
  assert(/\['false', 'Normal'\], \['true', 'Grande'\], \['max', 'Máximo'\]/.test(a11y) && /Reducir movimiento/.test(a11y), "Aa reúne tema, 3 tamaños y reducir movimiento");
  assert(/@media\(max-width:560px\)[\s\S]*\.shalom-area-caption \{ display:none; \}/.test(nav), "en celular la barra no repite «Más áreas de Shalom»");
});

check("Inicio en orden: bienvenida, reuniones, eventos, accesos rápidos, novedades y versículo al final", () => {
  const html = read("index.html"), body = html.slice(html.indexOf("function home(){"), html.indexOf("function parking(){"));
  const order = ['class="home-welcome"', 'class="home-meetings"', 'class="home-events"', 'class="home-priorities"', 'class="home-announcements"', "${versiculo()}"].map((m) => body.indexOf(m));
  assert(order.every((n, i) => n > 0 && (i === 0 || n > order[i - 1])), "orden de secciones: " + order);
  assert(/data-action="visit">Soy nuevo</.test(body) && /data-action="online">Ver reunión en línea</.test(body) && /data-action="directions">Cómo llegar</.test(body), "acciones de quien visita por primera vez");
  assert(/MEETINGS=\[\['Domingo','\[hora\]'\]/.test(html), "horarios pendientes entre corchetes, no inventados");
});

check("versículo del día en Inicio: solo YouVersion, sin texto bíblico propio", () => {
  const html = read("index.html"), mod = read("assets/versiculo-del-dia.js");
  assert(html.includes("data-daily-verse"), "Inicio muestra la tarjeta del versículo");
  assert(html.includes('<script type="importmap">{"imports":{"dompurify":"./assets/vendor/purify.es.mjs"}}</script>') && html.includes('from "./assets/versiculo-del-dia.js"'), "Inicio carga el módulo compartido con DOMPurify");
  assert(/from '\.\.\/assets\/versiculo-del-dia\.js'/.test(read("design/shalom-inicio.js")), "Kids usa el mismo módulo");
  assert(/fetch\('\/api\/v1\/scripture\/verse-of-day\/'/.test(mod) && !/blockquote>|textContent = '[^']*(Señor|Dios|Jesús)/.test(mod), "el texto solo llega de la API");
});

check("demo lista para enviar: títulos, idioma, regreso al Inicio, enlaces a documentos y horas", () => {
  const pages = ["index.html", "cafeteria.html", "comunicaciones.html", "feedback.html", "design/kids-paneles.html"];
  for (const f of pages) {
    const html = read(f);
    assert(/<html lang="es-MX">/.test(html), f + " declara es-MX");
    assert(/<title>[^<]+ · Shalom<\/title>/.test(html), f + " usa el título «Sección · Shalom»");
    assert(!/Inicio Shalom|Shalom App/.test(html), f + " nombra el regreso como «Inicio de Shalom»");
  }
  assert(/\}\[r\] \+ " · Shalom";/.test(read("assets/comunicaciones.js")), "Avisos cambia el título sin versión");
  for (const f of ["comunicaciones.html", "assets/comunicaciones.js", "design/kids-paneles.html"])
    assert(!/href="(?:\.\.\/)?docs\/(?!aviso-privacidad-DEMO)[\w-]+\.md"/.test(read(f)), f + " enlaza la versión HTML de los documentos (GitHub Pages)");
  assert(/if\(!deep\|\|!headerTitle\[deep\]\)return false;[\s\S]*addEventListener\('hashchange',openDeepLink\)/.test(read("index.html")), "index.html#agenda abre la pantalla pedida");
  assert(/fechaHora\(get\('meeting-date'\)\.value,get\('meeting-time'\)\.value\)/.test(read("design/shalom-reuniones.js")), "Reuniones muestra horas en formato 7:00 PM");
  assert(/class="skip-link"/.test(read("design/kids-paneles.html")) && /\.skip-link:focus\{top:16px\}/.test(read("design/kids-paneles.css")), "Kids oculta «Saltar al contenido» hasta recibir el foco");
  const theme = read("assets/shalom-theme.css");
  assert(/theme-cream\[data-shalom-space="cafe"\] \.chip\.on/.test(theme) && /theme-cream\[data-shalom-space="kids"\] :is\(\.sidebar-bottom/.test(theme), "Crema sin textos claros de Noche en Cafetería y Kids");
  for (const f of ["design/kids-paneles.html", "design/shalom-vistas.js", "design/shalom-reuniones.js"])
    assert(!/<aside/.test(read(f)), f + " no anida regiones complementarias dentro del contenido");
});

console.log(`PASS manual celular 2026: ${ok} grupos de reglas`);
