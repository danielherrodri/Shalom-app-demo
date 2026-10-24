"use strict";
const localBrowserPath = require("node:path").resolve(
  __dirname,
  "../.pw-browsers",
);
if (require("node:fs").existsSync(localBrowserPath))
  process.env.PLAYWRIGHT_BROWSERS_PATH ||= localBrowserPath;
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const server = require("./server.cjs");
const axePath = require.resolve("axe-core/axe.min.js");
const root = path.resolve(__dirname, ".."),
  out = path.join(root, "test-results");
fs.mkdirSync(out, { recursive: true });
let browser;
const report = {
  date: "2026-10-23",
  checks: [],
  accessibility: [],
  baseline: [],
  errors: [],
};
const ok = (name, value = true) => {
  assert(value, name);
  report.checks.push(name);
  console.log("PASS", name);
};
(async () => {
  await new Promise((r) => server.listen(4174, "127.0.0.1", r));
  browser = await chromium.launch({
    headless: true,
    downloadsPath: path.join(out, "downloads"),
  });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 950 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const base = "http://127.0.0.1:4174";
  await page.goto(base + "/comunicaciones.html");
  await page.waitForSelector("h1");
  await page.locator("input[type=search]").fill("");
  ok(
    "Visitante: solo tres avisos públicos, sin borradores ni vencidos",
    (await page.locator("#results article").count()) === 2,
  );
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  ok(
    "Paginación pública: siguiente página",
    (await page.locator("#results article").count()) === 1,
  );
  await page.getByRole("button", { name: "Anterior", exact: true }).click();
  await page
    .getByRole("button", { name: "Solicitar CSV por correo", exact: true })
    .click();
  const requested = await page.evaluate(
    () => ShalomProcessing.snapshot().jobs[0],
  );
  ok(
    "Solicitud pública contiene todos los resultados filtrados de todas las páginas",
    requested.count === 3 && requested.kind === "exportación",
  );
  await page.locator("#processing-dialog [data-process=close]").click();
  await page.getByLabel("Buscar un aviso").fill("mesa");
  ok(
    "Búsqueda de avisos",
    (await page.locator("#results article").count()) === 1,
  );
  await page.getByLabel("Categoría", { exact: true }).selectOption("Kids");
  ok(
    "Estado vacío por filtros",
    await page
      .getByRole("heading", { name: "No hay avisos para esta selección" })
      .isVisible(),
  );
  await page.getByRole("button", { name: "Limpiar filtros" }).click();
  await page.getByLabel("Experiencia simulada").selectOption("Familias");
  await page.getByLabel("Ministerio de prueba").selectOption("Kids");
  await page.getByLabel("Categoría", { exact: true }).selectOption("Kids");
  ok(
    "Segmentación de familias y ministerio",
    await page
      .getByRole("heading", { name: "Acompañamos su crecimiento" })
      .isVisible(),
  );
  await page.goto(base + "/comunicaciones.html#preferencias");
  ok(
    "Optativos desmarcados inicialmente",
    (await page.locator("#preferences input:checked").count()) === 0,
  );
  await page.locator("[name=general]").check();
  await page
    .getByRole("button", { name: "Aplicar en esta demo", exact: true })
    .click();
  ok(
    "Alta optativa exige decisión explícita",
    await page
      .locator("#pref-error")
      .textContent()
      .then((x) => x.includes("confirma")),
  );
  await page.locator("[name=confirm]").check();
  await page
    .getByRole("button", { name: "Aplicar en esta demo", exact: true })
    .click();
  ok(
    "Alta optativa solo del tema seleccionado",
    (await page.locator("[name=general]").isChecked()) &&
      !(await page.locator("[name=kids]").isChecked()),
  );
  await page.locator("[name=general]").uncheck();
  await page
    .getByRole("button", { name: "Aplicar en esta demo", exact: true })
    .click();
  ok(
    "Baja no exige nuevo consentimiento",
    !(await page.locator("[name=general]").isChecked()),
  );
  await page.locator("[name=kids]").check();
  await page.locator("[name=confirm]").check();
  await page
    .getByRole("button", { name: "Aplicar en esta demo", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Revocar todos los optativos" })
    .click();
  ok(
    "Revocación general",
    (await page.locator("#preferences input:checked").count()) === 0,
  );
  await page.goto(base + "/comunicaciones.html#privacidad");
  await page.locator("[name=internal]").check();
  await page
    .getByRole("button", { name: "Aplicar autorización de ejemplo" })
    .click();
  ok(
    "Nueva finalidad de imagen exige tutor ficticio",
    await page
      .locator("#image-error")
      .textContent()
      .then((x) => x.includes("Confirma")),
  );
  await page.locator("[name=guardian]").check();
  await page
    .getByRole("button", { name: "Aplicar autorización de ejemplo" })
    .click();
  ok(
    "Uso interno no concede difusión",
    (await page.locator("[name=internal]").isChecked()) &&
      !(await page.locator("[name=public]").isChecked()),
  );
  await page.getByRole("button", { name: "Revocar ambas finalidades" }).click();
  ok(
    "Revocación de imágenes independiente",
    !(await page.locator("[name=internal]").isChecked()),
  );
  await page
    .getByRole("button", { name: "Marcar como leído en la demo" })
    .click();
  ok(
    "Lectura del aviso no concede autorizaciones",
    !(await page.locator("[name=public]").isChecked()),
  );
  for (const type of ["exportación", "eliminación"]) {
    await page
      .getByRole("button", { name: "Solicitar " + type, exact: true })
      .click();
    await page
      .getByRole("button", { name: "Crear solicitud simulada" })
      .click();
    if (type === "exportación")
      await page.locator("#processing-dialog [data-process=close]").click();
  }
  ok(
    "Solicitudes con folio ficticio y sin ejecutar eliminación",
    await page
      .locator("#requests")
      .textContent()
      .then((x) => x.includes("DEMO-002") && x.includes("Sin enviar")),
  );
  const writes = [];
  page.on("request", (r) => {
    if (r.method() !== "GET") writes.push(r.url());
  });
  await page.goto(base + "/comunicaciones.html#admin");
  await page.getByRole("button", { name: "Crear aviso", exact: true }).click();
  await page.getByLabel("Título", { exact: true }).fill("=SUM(1,2)");
  await page
    .getByLabel("Mensaje", { exact: true })
    .fill("<img src=x onerror=alert(1)> Ejemplo de prueba");
  await page.getByLabel("Estado", { exact: true }).selectOption("programado");
  await page
    .getByLabel("Inicio de vigencia", { exact: true })
    .fill("2026-10-28");
  await page
    .getByLabel("Fin de vigencia · incluido", { exact: true })
    .fill("2026-10-27");
  await page.getByRole("button", { name: "Guardar ejemplo" }).click();
  ok(
    "Validación de rango de fechas",
    await page
      .locator("#post-error")
      .textContent()
      .then((x) => x.includes("posterior")),
  );
  await page
    .getByLabel("Fin de vigencia · incluido", { exact: true })
    .fill("2026-10-29");
  await page.getByRole("button", { name: "Guardar ejemplo" }).click();
  ok(
    "Programación guardada solo en memoria",
    !(await page.locator("#dialog").isVisible()),
  );
  await page.getByLabel("Buscar por texto, audiencia o ministerio").fill("SUM");
  ok(
    "Búsqueda administrativa y escape de HTML",
    (await page.locator("#admin-results article").count()) === 1 &&
      !(await page.locator("#admin-results img").count()),
  );
  await page
    .getByRole("button", { name: "Solicitar CSV por correo", exact: true })
    .click();
  ok(
    "Solicitud administrativa conserva filtros sin crear archivo",
    await page.evaluate(
      () => ShalomProcessing.snapshot().jobs.at(-1).filters.search === "SUM",
    ),
  );
  await page.locator("#processing-dialog [data-process=close]").click();
  await page.getByLabel("Fecha simulada · Ciudad de México").fill("2026-10-28");
  await page.getByLabel("Fecha simulada · Ciudad de México").press("Tab");
  await page.getByRole("button", { name: "Publicado", exact: true }).click();
  ok(
    "Programación se vuelve vigente con reloj simulado",
    (await page.locator("#admin-results article").count()) === 1,
  );
  await page.getByLabel("Fecha simulada · Ciudad de México").fill("2026-10-30");
  await page.getByLabel("Fecha simulada · Ciudad de México").press("Tab");
  await page.getByRole("button", { name: "Vencido", exact: true }).click();
  ok(
    "Fin de vigencia excluye aviso después del día final",
    (await page.locator("#admin-results article").count()) === 1,
  );
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await page.getByLabel("Título", { exact: true }).fill("Aviso editado");
  await page.getByRole("button", { name: "Guardar ejemplo" }).click();
  ok(
    "Edición conserva validación de programación vencida",
    await page
      .locator("#post-error")
      .textContent()
      .then((x) => x.includes("posterior")),
  );
  await page.getByLabel("Estado", { exact: true }).selectOption("borrador");
  await page.getByRole("button", { name: "Guardar ejemplo" }).click();
  await page
    .getByLabel("Buscar por texto, audiencia o ministerio")
    .fill("Aviso editado");
  await page.getByRole("button", { name: "Archivar", exact: true }).click();
  await page.getByRole("button", { name: "Todos", exact: true }).click();
  ok(
    "Archivo reversible",
    await page.getByRole("button", { name: "Restaurar borrador" }).isVisible(),
  );
  await page.getByRole("button", { name: "Restaurar borrador" }).click();
  ok(
    "Restaurar devuelve borrador",
    await page
      .locator("#admin-results .meta")
      .textContent()
      .then((x) => x.includes("borrador")),
  );
  await page.reload();
  ok(
    "Nada del módulo persiste en localStorage/sessionStorage",
    await page.evaluate(
      () => localStorage.length === 0 && sessionStorage.length === 0,
    ),
  );
  await page.goto(base + "/comunicaciones.html#preferencias");
  ok(
    "Recargar descarta decisiones",
    (await page.locator("#preferences input:checked").count()) === 0,
  );
  ok("Ningún formulario realiza solicitudes de red", writes.length === 0);
  await page.goto(base + "/comunicaciones.html#avisos");
  await page.getByLabel("Buscar un aviso").fill("Lo que viene");
  await page.getByRole("button", { name: "Ver video de ejemplo" }).click();
  ok(
    "Video no inicia automáticamente",
    await page.locator("video").evaluate((v) => v.paused && !v.autoplay),
  );
  await page.locator("video").evaluate((v) => v.play());
  await page.waitForFunction(
    () => document.querySelector("video").currentTime > 0,
  );
  ok(
    "Reproducción real del clip local con pista y transcripción",
    (await page.locator("track").count()) === 1,
  );
  await page.keyboard.press("Escape");
  ok(
    "Escape cierra el modal y restaura foco",
    !(await page.locator("#dialog").isVisible()) &&
      (await page
        .getByRole("button", { name: "Ver video de ejemplo" })
        .evaluate((b) => b === document.activeElement)),
  );
  await page.reload();
  await page.getByLabel("Buscar un aviso").fill("");
  for (const width of [320, 390, 810, 1366]) {
    await page.setViewportSize({ width, height: 950 });
    for (const theme of ["night", "cream"]) {
      await page.evaluate(
        (t) => document.body.classList.toggle("night", t === "night"),
        theme,
      );
      for (const route of [
        "avisos",
        "preferencias",
        "privacidad",
        "admin",
        "procesamiento",
      ]) {
        await page.goto(base + "/comunicaciones.html#" + route);
        await page.waitForFunction(
          (r) =>
            document.querySelector("[data-route=" + r + "][aria-current=page]"),
          route,
        );
        await page.evaluate(
          (t) => document.body.classList.toggle("night", t === "night"),
          theme,
        );
        await page.addScriptTag({ path: axePath });
        const result = await page.evaluate(() =>
          axe.run(document, {
            runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
          }),
        );
        report.accessibility.push({
          width,
          theme,
          route,
          violations: result.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            nodes: v.nodes.map((n) => n.target),
          })),
        });
        assert.equal(
          result.violations.length,
          0,
          JSON.stringify(report.accessibility.at(-1)),
        );
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          "Desbordamiento " + width + " " + route,
        );
        if (width === 1366 || width === 390)
          await page.screenshot({
            path: path.join(out, route + "-" + theme + "-" + width + ".png"),
            fullPage: true,
          });
      }
    }
  }
  ok(
    "40 revisiones responsive/tema/ruta sin violaciones axe WCAG A/AA ni overflow",
  );
  await page.setViewportSize({ width: 1366, height: 950 });
  await page.goto(base + "/comunicaciones.html#admin");
  await page.getByRole("button", { name: "Crear aviso", exact: true }).click();
  await page.addScriptTag({ path: axePath });
  const dialogAxe = await page.evaluate(() =>
    axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
    }),
  );
  ok(
    "Editor: scan de accesibilidad sin violaciones",
    dialogAxe.violations.length === 0,
  );
  for (let n = 0; n < 24; n++) {
    await page.keyboard.press("Tab");
    ok(
      "Foco modal contenido " + n,
      await page.evaluate(() =>
        document.querySelector("#dialog").contains(document.activeElement),
      ),
    );
  }
  await page.keyboard.press("Escape");
  await page.goto(base + "/index.html");
  await page
    .getByRole("button", { name: "Iniciar sesión", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Entrar a administración", exact: true })
    .click();
  for (const screen of ["events", "projects", "family", "people", "giving"]) {
    await page.evaluate((screen) => goto(screen), screen);
    await page.waitForSelector(".list-tools");
    ok(
      "Herramientas de listado en " + screen,
      (await page.locator(".list-tools").count()) > 0,
    );
    if (screen === "events") {
      await page.locator(".list-tools input[type=search]").fill("imposible");
      ok(
        "Vacío en listado principal",
        await page.locator("[data-list=empty]").isVisible(),
      );
      await page.locator(".list-tools input[type=search]").fill("");
    }
  }
  ok("Sin errores JavaScript en flujos", errors.length === 0);
  report.errors = errors;
  fs.writeFileSync(
    path.join(out, "report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(
    "COMPLETE",
    report.checks.length,
    "checks;",
    report.accessibility.length,
    "a11y scans",
  );
})()
  .catch((e) => {
    report.errors.push(e.stack);
    fs.writeFileSync(
      path.join(out, "report.json"),
      JSON.stringify(report, null, 2),
    );
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (browser) await browser.close();
    server.close();
  });
