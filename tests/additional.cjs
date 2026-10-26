"use strict";
const localBrowserPath = require("node:path").resolve(
  __dirname,
  "../.pw-browsers",
);
if (require("node:fs").existsSync(localBrowserPath))
  process.env.PLAYWRIGHT_BROWSERS_PATH ||= localBrowserPath;
const { chromium } = require("playwright"),
  fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  server = require("./server.cjs");
const out = path.resolve(__dirname, "../test-results");
const report = { checks: [], scans: [] };
const ok = (label, v) => {
  assert(v, label);
  report.checks.push(label);
  console.log("PASS", label);
};
let b;
(async () => {
  await new Promise((r) => server.listen(4176, "127.0.0.1", r));
  b = await chromium.launch();
  const p = await b.newPage({
    viewport: { width: 1366, height: 950 },
    reducedMotion: "reduce",
  });
  const base = "http://127.0.0.1:4176";
  for (const width of [390, 600])
    for (const colorScheme of ["light", "dark"]) {
      await p.setViewportSize({ width, height: 950 });
      await p.emulateMedia({ colorScheme });
      for (const item of JSON.parse(
        fs
          .readFileSync(
            path.resolve(__dirname, "../emails/catalogo.json"),
            "utf8",
          )
          .replace(/^\uFEFF/, ""),
      )) {
        await p.goto(base + "/emails/" + item.id + ".html");
        await p.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
        const a = await p.evaluate(() =>
          axe.run(document, {
            runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
          }),
        );
        report.scans.push({
          template: item.id,
          width,
          colorScheme,
          violations: a.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => n.target),
          })),
        });
        assert.equal(
          a.violations.length,
          0,
          JSON.stringify(report.scans.at(-1)),
        );
        assert(
          await p.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          "overflow email " + item.id,
        );
        if (
          colorScheme === "light" &&
          ["bienvenida-kids", "aviso-general", "recibo-cafeteria"].includes(
            item.id,
          )
        )
          await p.screenshot({
            path: path.join(out, "email-" + item.id + "-" + width + ".png"),
            fullPage: true,
          });
      }
    }
  ok("32 revisiones de plantillas sin problemas axe ni overflow", true);
  await p.setViewportSize({ width: 1366, height: 950 });
  await p.goto(base + "/comunicaciones.html#correos");
  await p.waitForSelector("#email-results article");
  ok(
    "Galería paginada",
    (await p.locator("#email-results article").count()) === 4,
  );
  await p.getByRole("button", { name: "Siguiente", exact: true }).click();
  ok(
    "Segunda página de correos",
    (await p.locator("#email-results article").count()) === 4,
  );
  await p.getByLabel("Temática", { exact: true }).selectOption("Kids");
  ok(
    "Filtro de temática y reinicio de página",
    (await p.locator("#email-results article").count()) === 3,
  );
  await p.getByLabel("Buscar plantilla o tipo").fill("bienvenido");
  ok(
    "Búsqueda de plantilla",
    (await p.locator("#email-results article").count()) === 1,
  );
  await p.getByRole("button", { name: "Vista previa", exact: true }).click();
  ok(
    "Vista previa aislada sin scripts",
    (await p.locator("iframe").getAttribute("sandbox")) === "",
  );
  await p.screenshot({
    path: path.join(out, "email-gallery-dialog.png"),
    fullPage: true,
  });
  await p.keyboard.press("Escape");
  await p.getByLabel("Buscar plantilla o tipo").fill("");
  await p.getByLabel("Temática", { exact: true }).selectOption("Todos");
  for (const width of [320, 390, 810, 1366]) {
    await p.setViewportSize({ width, height: 950 });
    for (const theme of ["night", "cream"]) {
      await p.evaluate(
        (t) => document.body.classList.toggle("night", t === "night"),
        theme,
      );
      await p.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
      const a = await p.evaluate(() =>
        axe.run(document, {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
        }),
      );
      assert.equal(
        a.violations.length,
        0,
        "galería " + width + theme + JSON.stringify(a.violations),
      );
      assert(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      report.scans.push({ route: "correos", width, theme, violations: [] });
    }
  }
  ok("Galería accesible en 8 combinaciones", true);
  await p.goto(base + "/comunicaciones.html#avisos");
  await p.getByRole("button", { name: "Siguiente", exact: true }).click();
  await p.getByLabel("Buscar un aviso").fill("");
  await p.locator("details.state-controls summary").click();
  for (const s of ["Carga", "Error", "Vacío"]) {
    await p.getByRole("button", { name: s, exact: true }).click();
    ok("Estado visible " + s, await p.locator("#results .empty").isVisible());
  }
  await p.getByRole("button", { name: "Normal", exact: true }).click();
  ok(
    "Reintento vuelve a resultados",
    (await p.locator("#results article").count()) > 0,
  );
  await p.goto(base + "/comunicaciones.html#admin");
  await p.getByRole("button", { name: "Crear aviso", exact: true }).click();
  await p.getByLabel("Título", { exact: true }).fill("Imagen ficticia");
  await p.getByLabel("Mensaje", { exact: true }).fill("Mensaje de prueba");
  await p.getByLabel("Formato", { exact: true }).selectOption("imagen");
  await p.getByRole("button", { name: "Guardar ejemplo" }).click();
  ok(
    "Imagen exige alternativa textual",
    await p
      .locator("#post-error")
      .textContent()
      .then((x) => x.includes("Describe")),
  );
  await p.getByLabel("Descripción de imagen").fill("Taza de café");
  await p.getByRole("button", { name: "Guardar ejemplo" }).click();
  ok(
    "Medio exige confirmar derechos de biblioteca",
    await p
      .locator("#post-error")
      .textContent()
      .then((x) => x.includes("Confirma")),
  );
  await p.keyboard.press("Escape");
  await p.getByRole("button", { name: "Crear aviso", exact: true }).click();
  await p.getByLabel("Título", { exact: true }).fill("Video ficticio");
  await p.getByLabel("Mensaje", { exact: true }).fill("Mensaje");
  await p.getByLabel("Formato", { exact: true }).selectOption("video");
  await p.getByRole("button", { name: "Guardar ejemplo" }).click();
  ok(
    "Video exige transcripción",
    await p
      .locator("#post-error")
      .textContent()
      .then((x) => x.includes("transcripción")),
  );
  await p.keyboard.press("Escape");
  await p.goto(base + "/index.html");
  await p.evaluate(() => {
    state.session = { role: "admin", kind: "demo" };
    state.role = "admin";
    state.family.members.push(
      ...Array.from({ length: 9 }, (_, i) => ({
        id: "TEST-" + i,
        name: "Persona ficticia " + i,
        type: "adulto",
        relationship: "Prueba",
        verified: false,
      })),
    );
    goto("people");
  });
  await p.waitForSelector(".list-tools");
  ok(
    "Lista principal pagina más de 5 filas",
    (await p.locator("tbody tr:visible").count()) === 5,
  );
  await p.locator("[data-list=next]").click();
  ok(
    "Siguiente página principal",
    await p
      .locator("[data-list=status]")
      .textContent()
      .then((x) => x.includes("Página 2")),
  );
  await p.locator("[data-list=toggle]").click();
  await p.locator("[data-list=filter]").selectOption("Pendiente");
  ok(
    "Filtro vuelve a página 1",
    await p
      .locator("[data-list=status]")
      .textContent()
      .then((x) => x.includes("Página 1")),
  );
  await p.locator("[data-list=search]").fill("Persona ficticia 8");
  ok(
    "Búsqueda encuentra fila fuera de página inicial",
    (await p.locator("tbody tr:visible").count()) === 1,
  );
  await p.locator("[data-list=search]").fill("");
  await p.evaluate(() => goto("events"));
  await p.waitForSelector(".list-tools");
  await p.getByRole("button", { name: "Crear evento de prueba" }).click();
  for (let i = 0; i < 15; i++) {
    await p.keyboard.press("Tab");
    assert(
      await p.evaluate(() =>
        document
          .querySelector("[role=dialog]")
          .contains(document.activeElement),
      ),
    );
  }
  await p.keyboard.press("Escape");
  ok(
    "Diálogos heredados: Tab contenido y Escape",
    !(await p.locator("[role=dialog]").count()),
  );
  await p.setViewportSize({ width: 1366, height: 950 });
  await p.goto(base + "/cafeteria.html");
  await p.locator(".product").filter({ hasText: "Capuchino" }).click();
  await p.getByRole("button", { name: "Agregar al pedido" }).click();
  await p.locator("#paidConfirm").check();
  await p.getByRole("button", { name: "Confirmar y enviar comanda" }).click();
  ok(
    "Cafetería conserva captura y creación de comanda demo",
    await p
      .locator(".receipt")
      .textContent()
      .then((x) => x.includes("Capuchino")),
  );
  const id = (await p.locator(".receipt").innerText()).match(
    /Orden #(S-\d+)/,
  )[1];
  await p.keyboard.press("Escape");
  await p.locator("[data-tab=cocina]").first().click();
  for (let i = 0; i < 2; i++)
    await p
      .locator('[data-action=advance][data-id="' + id + '"]')
      .first()
      .click();
  await p.locator("[data-tab=seguimiento]").first().click();
  await p.locator("#orderNumber").fill(id);
  await p.getByRole("button", { name: "Buscar", exact: true }).click();
  await p.getByRole("button", { name: "Ver recibo", exact: true }).click();
  ok(
    "Cafetería conserva seguimiento y recibo específico",
    await p
      .locator(".receipt")
      .textContent()
      .then((x) => x.includes("Capuchino")),
  );
  await p.locator("[data-action=print]").click();
  ok(
    "Recibo se solicita por cola sin imprimir ni descargar",
    await p.evaluate(() =>
      ShalomProcessing.snapshot().jobs.some(
        (j) =>
          j.source === "Recibo ficticio de cafetería" &&
          j.count === 1 &&
          !!j.filters.order,
      ),
    ),
  );
  await p.keyboard.press("Escape");
  await p.screenshot({
    path: path.join(out, "cafe-regression.png"),
    fullPage: true,
  });
  fs.writeFileSync(
    path.join(out, "additional-report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(
    "COMPLETE",
    report.checks.length,
    "checks;",
    report.scans.length,
    "scans",
  );
})()
  .catch((e) => {
    report.error = e.stack;
    fs.writeFileSync(
      path.join(out, "additional-report.json"),
      JSON.stringify(report, null, 2),
    );
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (b) await b.close();
    server.close();
  });
