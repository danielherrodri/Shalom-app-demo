"use strict";
const path = require("node:path");
const local = path.resolve(__dirname, "../.pw-browsers");
if (require("node:fs").existsSync(local))
  process.env.PLAYWRIGHT_BROWSERS_PATH ||= local;
const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  server = require("./server.cjs");
(async () => {
  await new Promise((r) => server.listen(4177, "127.0.0.1", r));
  const b = await chromium.launch();
  const p = await b.newPage({ reducedMotion: "reduce" });
  const rows = [];
  try {
    for (const width of [390, 1366]) {
      await p.setViewportSize({ width, height: 950 });
      await p.goto("http://127.0.0.1:4177/index.html");
      for (const theme of ["night", "cream"])
        for (const role of ["visitante", "persona", "voluntario", "admin"]) {
          await p.evaluate(
            ({ theme, role }) => {
              state.theme = theme;
              state.session =
                role === "visitante" ? null : { role, kind: "demo" };
              state.role = role === "visitante" ? "persona" : role;
              state.screen = role === "visitante" ? "login" : "profile";
              render();
            },
            { theme, role },
          );
          const data = await p
            .locator(".brand-wrap img:visible,.mobile-top img:visible")
            .evaluateAll((imgs) =>
              imgs.map((i) => ({
                src: i.getAttribute("src"),
                loaded: i.complete && i.naturalWidth > 0,
                background: getComputedStyle(
                  i.closest(".brand-wrap,.mobile-top"),
                ).backgroundColor,
              })),
            );
          assert.equal(data.length, 1);
          assert(data[0].loaded);
          assert.equal(
            data[0].src,
            theme === "night"
              ? "assets/shalom-logo.png"
              : "assets/shalom-logo-negro.png",
          );
          await p.addScriptTag({
            path: require.resolve("axe-core/axe.min.js"),
          });
          const axe = await p.evaluate(() =>
            window.axe.run(document, {
              runOnly: {
                type: "tag",
                values: ["wcag2a", "wcag2aa", "wcag21aa"],
              },
            }),
          );
          assert.equal(
            axe.violations.length,
            0,
            JSON.stringify(axe.violations),
          );
          rows.push({ width, theme, role, ...data[0], axeViolations: 0 });
          if (role === "visitante" || role === "admin")
            await p.screenshot({
              path: path.resolve(
                "../Entregables-Shalom-v06/Logo-" +
                  theme +
                  "-" +
                  role +
                  "-" +
                  width +
                  ".png",
              ),
              fullPage: false,
            });
        }
      await p.goto("http://127.0.0.1:4177/comunicaciones.html#preferencias");
      for (const theme of ["night", "cream"]) {
        await p.evaluate(
          (t) => document.body.classList.toggle("night", t === "night"),
          theme,
        );
        const src = await p
          .locator(".brand img:visible,.mobile-brand img:visible")
          .getAttribute("src");
        assert.equal(
          src,
          theme === "night"
            ? "assets/shalom-logo.png"
            : "assets/shalom-logo-negro.png",
        );
        rows.push({ width, theme, role: "comunicaciones", src });
      }
    }
    fs.writeFileSync(
      path.resolve("../Entregables-Shalom-v06/Evidencia-logotipos.json"),
      JSON.stringify(rows, null, 2),
    );
    console.log(
      "PASS: 16 perfiles/temas/tamaños con logos y contraste correctos; 4 variantes en Comunicaciones.",
    );
  } finally {
    await b.close();
    server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
