const fs = require("node:fs"),
  vm = require("node:vm"),
  assert = require("node:assert/strict"),
  path = require("node:path");
const checks = [];
const ok = (name, v) => {
  assert(v, name);
  checks.push(name);
  console.log("PASS", name);
};
function fixture() {
  const handlers = {};
  const doc = {
    activeElement: null,
    addEventListener: (n, f) => (handlers[n] = f),
    dispatchEvent: () => {},
    getElementById: () => null,
    querySelectorAll: () => [],
  };
  const context = { document: doc, window: {}, CustomEvent: class {}, console };
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, "../assets/processing.js"), "utf8"),
    context,
  );
  const api = context.window.ShalomProcessing;
  return {
    api,
    click: (process, job) =>
      handlers.click({
        target: { closest: () => ({ dataset: { process, job } }) },
      }),
    snap: () => api.snapshot(),
  };
}
let f = fixture();
f.api.seed();
f.api.runBatch();
let s = f.snap();
ok(
  "Lote máximo tres y reparto alta/alta/media",
  s.jobs.filter((j) => j.state !== "pendiente").length === 3 &&
    s.jobs[0].state === "aceptado" &&
    s.jobs[5].state === "conciliar" &&
    s.jobs[1].state === "reintento",
);
ok(
  "Reintento temporal diferido 30 segundos",
  s.jobs[1].attempts === 1 && s.jobs[1].next === 30,
);
f.api.runBatch();
ok(
  "Prioridad baja atendida y optativo suprimido",
  f.snap().jobs[2].state === "suprimido",
);
ok("Error permanente sin reintento", f.snap().jobs[3].state === "muerto");
f.click("replay", s.jobs[3].id);
f.click("replay", s.jobs[3].id);
ok(
  "Replay corregido único",
  f.snap().jobs.filter((j) => j.replayOf === s.jobs[3].id).length === 1,
);
for (let i = 0; i < 8; i++) f.api.runBatch();
ok("No reintenta antes de tiempo", f.snap().jobs[1].attempts === 1);
f.click("time");
f.api.runBatch();
ok(
  "Segundo reintento difiere 120 segundos",
  f.snap().jobs[1].attempts === 2 && f.snap().jobs[1].next === 240,
);
f.click("time");
f.api.runBatch();
ok(
  "Máximo tres intentos temporales",
  f.snap().jobs[1].attempts === 3 && f.snap().jobs[1].state === "muerto",
);
f.click("reconcile", s.jobs[5].id);
f.click("reconcile", s.jobs[5].id);
ok(
  "Conciliación no reenvía ni incrementa intentos",
  f.snap().jobs[5].state === "aceptado" && f.snap().jobs[5].attempts === 1,
);
f.click("delivered", s.jobs[5].id);
f.click("delivered", s.jobs[5].id);
ok(
  "Confirmación duplicada idempotente",
  f.snap().jobs[5].state === "entregado",
);
f = fixture();
f.click("quota");
f.click("quota");
f.click("quota");
f.api.runBatch();
s = f.snap();
ok(
  "Cuota detiene correos preseleccionados del mismo lote",
  s.paused && s.jobs[2].attempts === 0,
);
for (let i = 0; i < 5; i++) f.click("time");
f.click("resume");
f.api.runBatch();
for (let i = 0; i < 5; i++) f.click("time");
f.click("resume");
f.api.runBatch();
ok(
  "Cuota también tiene máximo tres intentos",
  f.snap().jobs[0].attempts === 3 && f.snap().jobs[0].state === "muerto",
);
f = fixture();
f.api.seed();
for (let i = 0; i < 30; i++) f.click("time");
f.api.runBatch();
ok(
  "Caducidad de una hora impide procesar",
  f.snap().jobs.filter((j) => j.state === "muerto").length === 3 &&
    f.snap().jobs.every((j) => j.attempts === 0),
);
f = fixture();
f.api.seed();
f.api.runBatch();
f.api.runBatch();
ok(
  "Una exportación avanza máximo 100 filas por lote",
  f.snap().jobs[4].progress === 100,
);
for (let i = 0; i < 3; i++) f.api.runBatch();
ok(
  "Exportación completa genera un solo correo dependiente",
  f.snap().jobs[4].progress === 350 &&
    f.snap().jobs.filter((j) => j.parent === f.snap().jobs[4].id).length === 1,
);
// Navegador: integración real, duplicados, ausencia de descargas/red y foco.
const local = path.resolve(__dirname, "../.pw-browsers");
if (fs.existsSync(local)) process.env.PLAYWRIGHT_BROWSERS_PATH ||= local;
const { chromium } = require("playwright"),
  server = require("./server.cjs");
let b;
(async () => {
  await new Promise((r) => server.listen(4178, "127.0.0.1", r));
  b = await chromium.launch();
  const p = await b.newPage({ reducedMotion: "reduce" });
  let downloads = 0,
    writes = 0,
    errors = [];
  p.on("download", () => downloads++);
  p.on("request", (r) => {
    if (r.method() !== "GET") writes++;
  });
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto("http://127.0.0.1:4178/comunicaciones.html");
  await p
    .getByRole("button", { name: "Solicitar CSV por correo", exact: true })
    .click();
  await p.locator("#processing-dialog [data-process=batch]").click();
  ok(
    "Foco conservado tras actualizar panel",
    await p
      .locator("#processing-dialog [data-process=batch]")
      .evaluate((n) => n === document.activeElement),
  );
  await p.locator("#processing-dialog [data-process=close]").click();
  await p
    .getByRole("button", { name: "Solicitar CSV por correo", exact: true })
    .click();
  ok(
    "Exportación generada deduplicada",
    await p.evaluate(
      () =>
        ShalomProcessing.snapshot().jobs.filter((j) => j.kind === "exportación")
          .length === 1,
    ),
  );
  await p.locator("#processing-dialog [data-process=close]").click();
  await p.evaluate(() => {
    ShalomProcessing.requestExport({ source: "otro", count: 250 });
    ShalomProcessing.requestExport({ source: "tercero", count: 250 });
    ShalomProcessing.runBatch();
  });
  ok(
    "Máximo una exportación por lote con varias pendientes",
    await p.evaluate(
      () =>
        ShalomProcessing.snapshot().jobs.filter(
          (j) => j.kind === "exportación" && j.progress === 100,
        ).length === 1,
    ),
  );
  await p.reload();
  ok(
    "Recarga borra cola y no guarda decisiones",
    await p.evaluate(
      () =>
        ShalomProcessing.snapshot().jobs.length === 0 &&
        localStorage.length === 0 &&
        sessionStorage.length === 0,
    ),
  );
  ok(
    "Sin descargas de datos, escrituras de red ni errores",
    downloads === 0 && writes === 0 && errors.length === 0,
  );
  fs.mkdirSync(path.join(__dirname, "../test-results"), { recursive: true });
  await p.goto("http://127.0.0.1:4178/index.html");
  await p.evaluate(() => {
    state.session = { role: "admin", kind: "demo" };
    state.role = "admin";
    goto("profile");
  });
  await p.locator("[data-action=export]").click();
  ok(
    "Perfil solicita datos por cola",
    await p.evaluate(() => ShalomProcessing.snapshot().jobs.length === 1),
  );
  await p.locator("#processing-dialog [data-process=close]").click();
  await p.evaluate(() => goto("giving"));
  await p.locator("[data-action=giving-csv]").click();
  ok(
    "Aportaciones solicitan estado por cola",
    await p.evaluate(() => ShalomProcessing.snapshot().jobs.length === 2),
  );
  await p.locator("#processing-dialog [data-process=close]").click();
  await p.evaluate(() => goto("people"));
  const resultsCount = await p.locator("[data-list=status]").textContent();
  await p.locator("[data-list=csv]").click();
  ok(
    "Listado principal exporta todas las páginas filtradas",
    await p.evaluate(
      (n) => ShalomProcessing.snapshot().jobs.at(-1).count === parseInt(n),
      resultsCount,
    ),
  );
  ok(
    "Accesos principales sin descargas ni envíos",
    downloads === 0 && writes === 0,
  );
  const scans = [];
  for (const width of [320, 390, 810, 1366])
    for (const theme of ["night", "cream"]) {
      await p.setViewportSize({ width, height: 950 });
      await p.goto("http://127.0.0.1:4178/comunicaciones.html#procesamiento");
      await p.evaluate((t) => {
        document.body.classList.toggle("night", t === "night");
        ShalomProcessing.seed();
      }, theme);
      await p.locator("#main [data-process=batch]").click();
      await p.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
      let a = await p.evaluate(() =>
        axe.run(document, {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
        }),
      );
      scans.push({ width, theme, view: "panel", violations: a.violations });
      assert.equal(a.violations.length, 0, JSON.stringify(scans.at(-1)));
      assert(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        "Overflow panel",
      );
      await p.evaluate(() => ShalomProcessing.show());
      a = await p.evaluate(() =>
        axe.run(document, {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
        }),
      );
      scans.push({ width, theme, view: "dialog", violations: a.violations });
      assert.equal(a.violations.length, 0, JSON.stringify(scans.at(-1)));
      for (let n = 0; n < 18; n++) {
        await p.keyboard.press("Tab");
        assert(
          await p.evaluate(() =>
            document
              .querySelector("#processing-dialog")
              .contains(document.activeElement),
          ),
          "Foco modal",
        );
      }
      await p.keyboard.press("Escape");
      assert(!(await p.locator("#processing-dialog").isVisible()));
      if (width === 390 || width === 1366)
        await p.screenshot({
          path: path.join(
            __dirname,
            `../test-results/procesamiento-${theme}-${width}.png`,
          ),
          fullPage: true,
        });
    }
  ok(
    "16 revisiones de panel y modal poblados, temas, móvil, teclado y axe",
    scans.length === 16,
  );
  fs.writeFileSync(
    path.join(__dirname, "../test-results/processing.json"),
    JSON.stringify({ checks, scans, downloads, writes, errors }, null, 2),
  );
  console.log("COMPLETE", checks.length, "checks");
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (b) await b.close();
    server.close();
  });
