"use strict";
// Recorrido de extremo a extremo de Coordinación Kids (solo datos de adultos) contra Django real,
// PostgreSQL y Vite. Coordinación configura, arma el rol, registra la lección y un evento; la docente
// ve su agenda y acepta su tarea. Solo crea datos ficticios en una base *_e2e.
//
// Requiere: PGDATABASE terminada en _e2e (se vacía). Uso: node tests/coordinacion-react.cjs
const localBrowserPath = require("node:path").resolve(__dirname, "../.pw-browsers");
if (require("node:fs").existsSync(localBrowserPath)) process.env.PLAYWRIGHT_BROWSERS_PATH ||= localBrowserPath;
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const path = require("node:path");
const { spawn, execFileSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const python = process.env.PYTHON || path.join(root, ".venv/bin/python");
const shots = process.env.SHALOM_SHOTS || "";
if (!/_e2e$/.test(process.env.PGDATABASE || "")) throw new Error("PGDATABASE debe terminar en _e2e: esta prueba vacía la base.");
const TZ = "America/Mexico_City";
const env = { ...process.env, TZ, SHALOM_ENV: "development", SHALOM_E2E_PASSWORD: crypto.randomBytes(18).toString("base64url") };
const manage = (...args) => execFileSync(python, [path.join(root, "backend/manage.py"), ...args], { env, stdio: ["ignore", "pipe", "inherit"] }).toString();
// Same ports as acceso-react.cjs: Vite forwards /api to 8000 (frontend/vite.config.ts).
const API = 8000, SITE = 5173;

const seed = `
import os
from django.utils import timezone
from core.models import *
pw = os.environ['SHALOM_E2E_PASSWORD']
def account(username, name, role):
    user = User.objects.create_user(username=username, password=pw)
    AccountProfile.objects.create(user=user, display_name=name, adult_declared_at=timezone.now())
    RoleGrant.objects.create(user=user, role=role, granted_by=user, confirmed_by=user)
    return user
account('coordinacion-e2e', 'Coordinación Ficticia', Role.COORDINACION_KIDS)
teacher = account('docente-e2e', 'Docente Ficticia', Role.DOCENTE)
EmailIdentity.objects.create(user=teacher, email='docente-e2e@example.invalid', verified_at=timezone.now())
`;

function totp(secret) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of secret.replace(/\s/g, "")) bits += alphabet.indexOf(c).toString(2).padStart(5, "0");
  const key = Buffer.from(bits.match(/.{8}/g).map(b => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const mac = crypto.createHmac("sha1", key).update(counter).digest();
  const offset = mac[19] & 15;
  return String((mac.readUInt32BE(offset) & 0x7fffffff) % 1e6).padStart(6, "0");
}

// The next Sunday (today when it is Sunday) in the church's time zone, as YYYY-MM-DD.
function nextSunday() {
  const [y, m, d] = new Date().toLocaleDateString("en-CA", { timeZone: TZ }).split("-").map(Number);
  const day = new Date(Date.UTC(y, m - 1, d));
  day.setUTCDate(day.getUTCDate() + (7 - day.getUTCDay()) % 7);
  return day.toISOString().slice(0, 10);
}

async function start(command, args, options, url) {
  const child = spawn(command, args, { ...options, stdio: ["ignore", "ignore", "inherit"] });
  let exited = null;
  child.on("exit", code => { exited = code; });
  for (const deadline = Date.now() + 30000; Date.now() < deadline;) {
    if (exited !== null) throw new Error(command + " terminó con " + exited);
    try { await fetch(url); return child; } catch { await new Promise(r => setTimeout(r, 300)); }
  }
  child.kill();
  throw new Error(command + " no arrancó");
}

async function axe(page, label) {
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  const result = await page.evaluate(() => axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa"] }));
  assert.deepEqual(result.violations.map(v => v.id + ": " + v.nodes.length), [], label + " sin violaciones de accesibilidad");
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(width <= 360, `${label}: sin desplazamiento horizontal a 360 px (${width})`);
  if (shots) await page.screenshot({ path: path.join(shots, `kids-${label.toLowerCase().replace(/[^a-z]+/g, "-")}-360.png`), fullPage: true });
}

async function signIn(page, username) {
  await page.getByText("Acceso de desarrollo (equipo compartido de Kids)").click();
  await page.getByLabel("Usuario").fill(username);
  await page.getByLabel("Contraseña").fill(env.SHALOM_E2E_PASSWORD);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
}

(async () => {
  manage("migrate", "--noinput");
  manage("flush", "--noinput");
  manage("shell", "-c", seed);
  const django = await start(python, [path.join(root, "backend/manage.py"), "runserver", `127.0.0.1:${API}`, "--noreload"], { env }, `http://127.0.0.1:${API}/api/v1/auth/providers/`);
  const vite = await start(path.join(root, "frontend/node_modules/.bin/vite"), ["--host", "127.0.0.1", "--port", String(SITE)], { cwd: path.join(root, "frontend"), env }, `http://127.0.0.1:${SITE}/`);
  const browser = await chromium.launch();
  const sunday = nextSunday();
  let passed = 0;
  let page;
  const check = async (name, fn) => {
    try { await fn(); } catch (error) {
      console.error("✗ " + name + "\n--- página ---\n" + (await page.innerText("body").catch(() => "")).slice(0, 1500));
      throw error;
    }
    passed++; console.log("✓ " + name);
  };
  try {
    const context = await browser.newContext({ viewport: { width: 360, height: 780 }, timezoneId: TZ });
    page = await context.newPage();
    const base = `http://127.0.0.1:${SITE}`;
    const tab = name => page.getByRole("navigation", { name: "Secciones de Shalom Kids" }).getByRole("button", { name });

    await check("coordinación entra con segundo factor y ve sus secciones", async () => {
      await page.goto(base);
      await signIn(page, "coordinacion-e2e");
      await page.getByRole("button", { name: "Generar mi clave" }).click();
      const secret = await page.getByLabel("Clave de configuración").innerText();
      await page.getByLabel("Código de 6 dígitos").fill(totp(secret));
      await page.getByRole("button", { name: "Activar" }).click();
      await page.getByRole("button", { name: "Abrir Shalom Kids" }).click();
      for (const name of ["Mi clase de hoy", "Mi agenda", "Lecciones", "Rol de clases", "Maestros", "Eventos Kids", "Configuración", "Bitácora"]) await tab(name).waitFor();
    });

    await check("configuración: grupo por rango de edad y servicio con horario", async () => {
      await tab("Configuración").click();
      await page.getByRole("heading", { name: "Configuración" }).waitFor();
      const group = page.getByRole("form", { name: "Nuevo grupo" });
      await group.getByLabel("Nombre del grupo").fill("Tesoros (ficticio)");
      await group.getByLabel("Edad mínima").fill("6");
      await group.getByLabel("Edad máxima").fill("4");
      await group.getByRole("button", { name: "Agregar grupo" }).click();
      await page.getByRole("alert").filter({ hasText: "La edad mínima no puede ser mayor que la máxima." }).waitFor();
      await group.getByLabel("Edad mínima").fill("4");
      await group.getByLabel("Edad máxima").fill("6");
      await group.getByRole("button", { name: "Agregar grupo" }).click();
      await page.getByText("Grupo «Tesoros (ficticio)» creado.").waitFor();
      const service = page.getByRole("form", { name: "Nuevo servicio" });
      await service.getByLabel("Nombre del servicio").fill("1er servicio");
      await service.getByLabel("Inicio").fill("09:00");
      await service.getByLabel("Fin").fill("10:30");
      await service.getByRole("button", { name: "Agregar servicio" }).click();
      await page.getByText("Servicio «1er servicio» creado.").waitFor();
      await page.getByText("Domingo · 09:00 a 10:30").waitFor();
      await axe(page, "Configuracion");
    });

    await check("lecciones: coordinación registra la del domingo", async () => {
      await tab("Lecciones").click();
      await page.getByLabel("Fecha").fill(sunday);
      await page.getByLabel("Grupo").selectOption({ label: "Tesoros (ficticio) · 4 a 6 años" });
      await page.getByLabel("Título").fill("Lección ficticia de prueba");
      await page.getByLabel("Página del manual (opcional)").fill("12");
      await page.getByRole("button", { name: "Registrar lección" }).click();
      await page.getByText("Lección registrada.").waitFor();
      await page.getByText("Lección ficticia de prueba", { exact: true }).waitFor();
      await axe(page, "Lecciones");
    });

    await check("rol de clases: asigna a la docente en el próximo domingo", async () => {
      await tab("Rol de clases").click();
      await page.getByRole("heading", { name: "1er servicio · 09:00 a 10:30" }).waitFor();
      assert.equal(await page.getByLabel("Fecha").inputValue(), sunday);
      await page.getByLabel("Docente para Tesoros (ficticio), 1er servicio").selectOption({ label: "Docente Ficticia" });
      await page.getByRole("button", { name: "Asignar" }).click();
      await page.getByText("Docente asignado a Tesoros (ficticio), 1er servicio.").waitFor();
      await page.getByRole("list", { name: "Docentes de Tesoros (ficticio), 1er servicio" }).getByText("Docente Ficticia").waitFor();
      await axe(page, "Rol de clases");
    });

    await check("maestros: la docente aparece con su próxima clase y sin datos de contacto", async () => {
      await tab("Maestros").click();
      const row = page.getByRole("listitem").filter({ hasText: "Docente Ficticia" });
      await row.getByText("1 clase · próxima:").waitFor();
      assert.ok(!(await page.innerText("body")).includes("example.invalid"));
      await axe(page, "Maestros");
    });

    await check("eventos: crea un evento y asigna una tarea a la docente", async () => {
      await tab("Eventos Kids").click();
      await page.getByLabel("Nombre del evento").fill("Convivencia ficticia");
      await page.getByLabel("Fecha", { exact: true }).fill(sunday);
      await page.getByRole("button", { name: "Crear evento" }).click();
      await page.getByText("Evento creado.").waitFor();
      const form = page.getByRole("form", { name: "Agregar a Convivencia ficticia" });
      await form.getByLabel("Qué hace falta").fill("Preparar la dinámica");
      await form.getByLabel("Responsable (opcional)").selectOption({ label: "Docente Ficticia" });
      await form.getByRole("button", { name: "Agregar" }).click();
      await page.getByText("Tarea agregada.").waitFor();
      await page.getByText("Docente Ficticia · Pendiente de aceptar").waitFor();
      await axe(page, "Eventos");
    });

    await check("bitácora: registra cada cambio con quién lo hizo", async () => {
      await tab("Bitácora").click();
      await page.getByText("Coordinación Ficticia creó clase del rol").waitFor();
      await page.getByText("Coordinación Ficticia creó lección").waitFor();
      await axe(page, "Bitacora");
    });

    await check("la docente ve su agenda con la lección, acepta y completa su tarea", async () => {
      await page.getByRole("button", { name: "Cerrar sesión" }).click();
      await signIn(page, "docente-e2e");
      await page.getByRole("button", { name: "Abrir Shalom Kids" }).click();
      await page.getByRole("heading", { name: "Mi agenda" }).waitFor();
      for (const name of ["Rol de clases", "Maestros", "Eventos Kids", "Configuración", "Bitácora"]) assert.equal(await tab(name).count(), 0, `sin ${name}`);
      await page.getByText("Lección ficticia de prueba", { exact: true }).waitFor();
      await page.getByText("1er servicio · 09:00 a 10:30").waitFor();
      await axe(page, "Mi agenda");
      await page.getByRole("button", { name: "Aceptar «Preparar la dinámica»" }).click();
      await page.getByText("Tarea aceptada.").waitFor();
      await page.getByRole("button", { name: "Marcar «Preparar la dinámica» como completada" }).click();
      await page.getByText("Tarea completada. ¡Gracias!").waitFor();
      await page.getByText("No tienes tareas pendientes.").waitFor();
    });

    await check("el servidor niega a la docente lo que la interfaz no muestra", async () => {
      const status = await page.evaluate(async () => (await Promise.all(["roster", "team", "events", "audit"].map(p => fetch(`/api/v1/kids/${p}/`)))).map(r => r.status));
      assert.deepEqual(status, [403, 403, 403, 403]);
    });
  } finally {
    await browser.close();
    vite.kill(); django.kill();
  }
  console.log(`Coordinación Kids: ${passed} recorridos aprobados.`);
})().catch(error => { console.error(error); process.exit(1); });
