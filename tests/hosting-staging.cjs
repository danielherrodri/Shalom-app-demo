"use strict";
// Imita Firebase Hosting delante de Django para revisar lo que el emulador oficial no reproduce:
// las cabeceras de firebase.json (CSP incluida) sobre la compilación real del frontend, el regreso
// a index.html y que solo la cookie __session llegue a la API, como hace Hosting con Cloud Run.
// Solo datos ficticios en una base *_e2e. Requiere `npm run build --prefix frontend`.
const localBrowserPath = require("node:path").resolve(__dirname, "../.pw-browsers");
if (require("node:fs").existsSync(localBrowserPath)) process.env.PLAYWRIGHT_BROWSERS_PATH ||= localBrowserPath;
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { spawn, execFileSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "frontend/dist");
const python = process.env.PYTHON || path.join(root, ".venv/bin/python");
if (!/_e2e$/.test(process.env.PGDATABASE || "")) throw new Error("PGDATABASE debe terminar en _e2e: esta prueba vacía la base.");
if (!fs.existsSync(path.join(dist, "index.html"))) throw new Error("Falta frontend/dist: ejecuta npm run build --prefix frontend.");
const password = crypto.randomBytes(18).toString("base64url");
const env = { ...process.env, SHALOM_ENV: "development", SHALOM_E2E_PASSWORD: password };
const manage = (...args) => execFileSync(python, [path.join(root, "backend/manage.py"), ...args], { env, stdio: ["ignore", "pipe", "inherit"] });
const hosting = JSON.parse(fs.readFileSync(path.join(root, "firebase.json"), "utf8")).hosting;
const API = 8001, SITE = 5174;

const glob = source => new RegExp("^" + source.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*\*/g, "\0").replace(/\*/g, "[^/]*").replace(/\0/g, ".*") + "$");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".woff2": "font/woff2", ".svg": "image/svg+xml" };

function headersFor(pathname) {
  const result = {};
  for (const rule of hosting.headers) if (glob(rule.source).test(pathname)) for (const { key, value } of rule.headers) result[key] = value;
  return result;
}

function site(request, response) {
  const pathname = new URL(request.url, "http://localhost").pathname;
  const rewrite = hosting.rewrites.find(rule => glob(rule.source).test(pathname));
  if (rewrite && rewrite.run) {
    // Hosting drops every cookie except __session before calling Cloud Run.
    const cookies = (request.headers.cookie || "").split(";").map(c => c.trim()).filter(c => c.startsWith("__session="));
    const headers = { ...request.headers, cookie: cookies.join("; ") };
    if (!headers.cookie) delete headers.cookie;
    const upstream = http.request({ host: "127.0.0.1", port: API, path: request.url, method: request.method, headers }, answer => {
      response.writeHead(answer.statusCode, answer.headers);
      answer.pipe(response);
    });
    request.pipe(upstream);
    return;
  }
  let file = path.join(dist, path.normalize(pathname));
  if (!file.startsWith(dist) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dist, "index.html");
  response.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream", ...headersFor(pathname) });
  fs.createReadStream(file).pipe(response);
}

async function start(command, args, options, url) {
  const child = spawn(command, args, { ...options, stdio: ["ignore", "ignore", "inherit"] });
  for (const deadline = Date.now() + 30000; Date.now() < deadline;) {
    try { await fetch(url); return child; } catch { await new Promise(r => setTimeout(r, 300)); }
  }
  child.kill();
  throw new Error(command + " no arrancó");
}

(async () => {
  manage("migrate", "--noinput");
  manage("flush", "--noinput");
  manage("shell", "-c", "import os; from core.models import User; User.objects.create_user(username='hosting-e2e', password=os.environ['SHALOM_E2E_PASSWORD'])");
  const django = await start(python, [path.join(root, "backend/manage.py"), "runserver", `127.0.0.1:${API}`, "--noreload"], { env }, `http://127.0.0.1:${API}/api/v1/auth/providers/`);
  const server = http.createServer(site).listen(SITE, "127.0.0.1");
  const browser = await chromium.launch();
  let passed = 0;
  const check = async (name, fn) => { await fn(); passed++; console.log("✓ " + name); };
  try {
    const context = await browser.newContext();
    const base = `http://127.0.0.1:${SITE}`;
    // A cookie the API must never see, like any other cookie Hosting strips.
    await context.addCookies([{ name: "ajena", value: "x", url: base }]);
    const page = await context.newPage();
    const violations = [];
    await page.exposeFunction("reportViolation", v => violations.push(v));
    await page.addInitScript(() => document.addEventListener("securitypolicyviolation", e => window.reportViolation(`${e.violatedDirective} ${e.blockedURI}`)));
    const failed = [];
    page.on("response", r => { if (r.status() >= 400 && !new URL(r.url()).pathname.startsWith("/api/")) failed.push(`${r.status()} ${r.url()}`); });

    await check("la app compilada carga con la CSP de firebase.json, sin violaciones", async () => {
      const response = await page.goto(`${base}/`);
      assert.match(response.headers()["content-security-policy"], /default-src 'self'/);
      assert.equal(response.headers()["x-frame-options"], "DENY");
      await page.waitForLoadState("networkidle");
      assert.ok((await page.innerText("body")).trim().length > 0, "la app pinta contenido");
      assert.deepEqual(violations, []);
      assert.deepEqual(failed, []);
    });

    await check("las rutas de la app regresan index.html y los recursos se guardan como inmutables", async () => {
      const response = await page.goto(`${base}/entrar`);
      assert.equal(response.status(), 200);
      assert.equal(response.headers()["cache-control"], "no-cache");
      const asset = fs.readdirSync(path.join(dist, "assets")).find(name => name.endsWith(".js"));
      const cached = await page.request.get(`${base}/assets/${asset}`);
      assert.equal(cached.headers()["cache-control"], "public, max-age=31536000, immutable");
      assert.deepEqual(violations, []);
    });

    await check("la sesión y el CSRF viajan solo en __session", async () => {
      const result = await page.evaluate(async credentials => {
        const csrf = async () => (await (await fetch("/api/v1/auth/csrf/", { cache: "no-store" })).json()).csrfToken;
        const post = async (url, body, token) => (await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { "X-CSRFToken": token } : {}) }, body: JSON.stringify(body) })).status;
        const withoutToken = await post("/api/v1/auth/login/", credentials);
        const login = await post("/api/v1/auth/login/", credentials, await csrf());
        const me = (await fetch("/api/v1/auth/me/")).status;
        return { withoutToken, login, me };
      }, { username: "hosting-e2e", password });
      assert.deepEqual(result, { withoutToken: 403, login: 200, me: 200 });
      // No csrftoken cookie: it would be stripped, so the token lives in the session.
      assert.deepEqual((await context.cookies(base)).map(c => c.name).sort(), ["__session", "ajena"]);
    });
  } finally {
    await browser.close();
    server.close();
    django.kill();
  }
  console.log(`Hosting de staging: ${passed} revisiones aprobadas.`);
})().catch(error => { console.error(error); process.exit(1); });
