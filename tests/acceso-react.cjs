"use strict";
// Recorrido de extremo a extremo de la interfaz de acceso y administración (fases 1 y 2)
// contra Django real, PostgreSQL y Vite. Solo crea datos ficticios en una base *_e2e.
//
// Requiere: PGDATABASE terminada en _e2e (se vacía), PGUSER/PGPASSWORD/PGHOST y backend/requirements.txt
// instalados en PYTHON (por defecto .venv/bin/python). Uso: node tests/acceso-react.cjs
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
// PYTHONUNBUFFERED: runserver writes its ready line to a pipe, which Python would otherwise buffer.
const env = { ...process.env, PYTHONUNBUFFERED: "1", SHALOM_ENV: "development", SHALOM_E2E_PASSWORD: crypto.randomBytes(18).toString("base64url") };
const manage = (...args) => execFileSync(python, [path.join(root, "backend/manage.py"), ...args], { env, stdio: ["ignore", "pipe", "inherit"] }).toString();

// Fixtures are synthetic; link tokens are created here because emails stay in the server's memory.
const tokens = { adult: crypto.randomBytes(32).toString("base64url"), minor: crypto.randomBytes(32).toString("base64url") };
const seed = `
import hashlib, os
from datetime import timedelta
from django.utils import timezone
from core.models import *
pw = os.environ['SHALOM_E2E_PASSWORD']
admin = User.objects.create_user(username='admin-e2e', password=pw)
other = User.objects.create_user(username='admin-e2e-2', password=pw)
RoleGrant.objects.create(user=admin, role=Role.ADMINISTRACION, granted_by=admin, confirmed_by=admin)
RoleGrant.objects.create(user=other, role=Role.ADMINISTRACION, granted_by=admin, confirmed_by=other)
ConsentText.objects.create(kind='aviso', version='e2e-1', body='Aviso de privacidad ficticio para pruebas.')
ConsentText.objects.create(kind='dato_sensible', version='e2e-1', body='Consentimiento ficticio de dato sensible.')
for email, token in ((('adulta@example.invalid', '${tokens.adult}'), ('menor@example.invalid', '${tokens.minor}'))):
    LoginLink.objects.create(email=email, verifier=hashlib.sha256(token.encode()).hexdigest(), expires_at=timezone.now() + timedelta(minutes=15))
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

function start(command, args, options, ready) {
  const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error(command + " no arrancó")); }, 30000);
    const watch = data => { if (ready.test(data.toString())) { clearTimeout(timer); resolve(child); } };
    child.stdout.on("data", watch); child.stderr.on("data", watch);
    child.on("exit", code => reject(new Error(command + " terminó con " + code)));
  });
}

async function axe(page, label) {
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  const result = await page.evaluate(() => axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa"] }));
  assert.deepEqual(result.violations.map(v => v.id + ": " + v.nodes.length), [], label + " sin violaciones de accesibilidad");
}

(async () => {
  manage("migrate", "--noinput");
  manage("flush", "--noinput");
  manage("shell", "-c", seed);
  const django = await start(python, [path.join(root, "backend/manage.py"), "runserver", "127.0.0.1:8000", "--noreload"], { env }, /Quit the server|Starting development server/);
  const vite = await start(path.join(root, "frontend/node_modules/.bin/vite"), ["--host", "127.0.0.1", "--port", "5173"], { cwd: path.join(root, "frontend"), env }, /Local:/);
  const browser = await chromium.launch();
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
    const context = await browser.newContext({ viewport: { width: 360, height: 780 } });
    page = await context.newPage();
    page.on("response", r => { if (r.status() >= 400 && process.env.SHALOM_E2E_DEBUG) console.error(`[${r.status()}] ${new URL(r.url()).pathname}`); });
    const base = "http://127.0.0.1:5173";

    await check("enlace de menor: no crea cuenta y no deja el token en la URL", async () => {
      await page.goto(`${base}/entrar#${tokens.minor}`);
      await page.getByRole("heading", { name: "Completa tu perfil" }).waitFor();
      assert.equal(new URL(page.url()).hash, "");
      await axe(page, "Completa tu perfil");
      if (shots) await page.screenshot({ path: path.join(shots, "perfil-360.png"), fullPage: true });
      await page.getByLabel("¿Cómo quieres que te llamemos?").fill("Menor ficticio");
      const year = new Date().getFullYear() - 15;
      await page.getByLabel("Fecha de nacimiento").fill(`${year}-01-01`);
      await page.getByLabel(/Leí el aviso/).check();
      await page.getByLabel(/Autorizo expresamente/).check();
      await page.getByRole("button", { name: "Crear mi cuenta" }).click();
      await page.getByText(/tutor debe solicitarla/).waitFor();
      await page.getByRole("button", { name: "Volver al inicio" }).click();
      await page.getByRole("heading", { name: "Entrar a Shalom" }).waitFor();
    });

    await check("enlace usado: mensaje único", async () => {
      await page.goto(`${base}/entrar#${tokens.minor}`);
      await page.getByText("Este enlace ya no es válido. Pide uno nuevo.").waitFor();
    });

    await check("adulto completa su perfil con ambos consentimientos", async () => {
      await page.goto(`${base}/entrar#${tokens.adult}`);
      await page.getByLabel("¿Cómo quieres que te llamemos?").fill("Persona ficticia");
      await page.getByLabel("Fecha de nacimiento").fill("1990-05-01");
      await page.getByLabel(/Leí el aviso/).check();
      await page.getByRole("button", { name: "Crear mi cuenta" }).click();
      // The browser blocks submission until the sensitive-data box is checked.
      assert.equal(await page.getByRole("heading", { name: "Completa tu perfil" }).count(), 1);
      await page.getByLabel(/Autorizo expresamente/).check();
      await page.getByRole("button", { name: "Crear mi cuenta" }).click();
      await page.getByRole("heading", { name: "Hola, Persona ficticia" }).waitFor();
      await page.getByText(/Administración te asignará los perfiles/).waitFor();
      await axe(page, "Inicio");
    });

    await check("cerrar sesión en todos los dispositivos", async () => {
      await page.getByRole("navigation", { name: "Navegación móvil" }).getByRole("button", { name: "Cuenta" }).click();
      await page.getByRole("button", { name: "Cerrar todas mis sesiones" }).click();
      await axe(page, "Seguridad");
      await page.getByRole("button", { name: "Sí, cerrar todas" }).click();
      await page.getByText("Cerramos tu sesión en todos los dispositivos.").waitFor();
      await axe(page, "Entrar a Shalom");
      if (shots) await page.screenshot({ path: path.join(shots, "entrar-360.png"), fullPage: true });
    });

    await check("solicitar enlace responde sin revelar si existe la cuenta", async () => {
      await page.getByLabel("Correo electrónico").fill("nadie@example.invalid");
      await page.getByRole("button", { name: "Enviarme el enlace" }).click();
      await page.getByRole("heading", { name: "Revisa tu correo" }).waitFor();
      await page.getByRole("button", { name: "Usar otro correo" }).click();
    });

    await check("administración activa la verificación en dos pasos antes de ver el panel", async () => {
      await page.getByText("Acceso de desarrollo (equipo compartido de Kids)").click();
      await page.getByLabel("Usuario").fill("admin-e2e");
      await page.getByLabel("Contraseña").fill(env.SHALOM_E2E_PASSWORD);
      await page.getByRole("button", { name: "Iniciar sesión" }).click();
      await page.getByRole("heading", { name: "Activa la verificación en dos pasos" }).waitFor();
      assert.equal(await page.getByRole("button", { name: "Administración" }).count(), 0);
      await page.getByRole("button", { name: "Generar mi clave" }).click();
      const secret = await page.getByLabel("Clave de configuración").innerText();
      await axe(page, "Verificación en dos pasos");
      await page.getByLabel("Código de 6 dígitos").fill("000000" === totp(secret) ? "111111" : "000000");
      await page.getByRole("button", { name: "Activar" }).click();
      await page.getByText("El código no es correcto.").waitFor();
      await page.getByLabel("Código de 6 dígitos").fill(totp(secret));
      await page.getByRole("button", { name: "Activar" }).click();
      await page.getByRole("heading", { name: /^Hola,/ }).waitFor();
      assert.ok(!(await page.innerText("body")).includes(secret), "la clave desaparece al confirmar");
    });

    await check("administración asigna perfiles e invita", async () => {
      await page.getByRole("button", { name: "Abrir administración" }).click();
      await page.getByRole("heading", { name: "Administración" }).waitFor();
      const person = page.getByRole("listitem").filter({ has: page.getByText("Persona ficticia", { exact: true }) }).filter({ has: page.getByLabel("Asignar perfil") });
      await person.getByLabel("Asignar perfil").selectOption("docente");
      await person.getByRole("button", { name: "Asignar" }).click();
      await page.getByText("Perfil asignado.").waitFor();
      await person.getByLabel("Asignar perfil").selectOption("finanzas");
      await person.getByRole("button", { name: "Asignar" }).click();
      await page.getByText("Perfil asignado; falta la confirmación de otra persona.").waitFor();
      await page.getByText("Debe confirmarlo otra persona").waitFor();
      assert.equal(await page.getByRole("checkbox", { name: "Joven" }).count(), 0);
      await page.getByLabel("Correo de la persona").fill("invitada@example.invalid");
      await page.getByRole("checkbox", { name: "Voluntario" }).check();
      await page.getByRole("button", { name: "Enviar invitación" }).click();
      await page.getByText("Invitación enviada. Vence en 7 días.").waitFor();
      await page.getByText("invitada@example.invalid").waitFor();
      assert.equal(await page.evaluate(() => document.activeElement.getAttribute("role")), "status", "el foco queda junto al resultado");
      await axe(page, "Administración");
      if (shots) await page.screenshot({ path: path.join(shots, "admin-360.png"), fullPage: true });
      await page.getByRole("listitem").filter({ hasText: "invitada@example.invalid" }).getByRole("button", { name: "Cancelar" }).click();
      await page.getByText("No hay invitaciones pendientes.").waitFor();
    });

    await check("la segunda persona de administración confirma el perfil privilegiado", async () => {
      await page.getByRole("button", { name: "Cerrar sesión" }).click();
      await page.getByText("Acceso de desarrollo (equipo compartido de Kids)").click();
      await page.getByLabel("Usuario").fill("admin-e2e-2");
      await page.getByLabel("Contraseña").fill(env.SHALOM_E2E_PASSWORD);
      await page.getByRole("button", { name: "Iniciar sesión" }).click();
      await page.getByRole("button", { name: "Generar mi clave" }).click();
      const secret = await page.getByLabel("Clave de configuración").innerText();
      await page.getByLabel("Código de 6 dígitos").fill(totp(secret));
      await page.getByRole("button", { name: "Activar" }).click();
      await page.getByRole("button", { name: "Abrir administración" }).click();
      await page.getByRole("button", { name: "Confirmar" }).click();
      await page.getByText("Perfil confirmado.").waitFor();
      await page.getByText("No hay perfiles esperando confirmación.").waitFor();
    });
  } finally {
    await browser.close();
    vite.kill(); django.kill();
  }
  console.log(`Acceso React: ${passed} recorridos aprobados.`);
})().catch(error => { console.error(error); process.exit(1); });
