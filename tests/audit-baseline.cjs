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
const cp = require("node:child_process");
const server = require("./server.cjs");
const out = path.resolve(__dirname, "../test-results");
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(
  path.join(out, "baseline.html"),
  cp.execFileSync("git", ["show", "e9aa3e4:index.html"], {
    encoding: "utf8",
    maxBuffer: 2000000,
  }),
);
fs.writeFileSync(
  path.join(out, "baseline-cafe.html"),
  cp.execFileSync("git", ["show", "e9aa3e4:cafeteria.html"], {
    encoding: "utf8",
    maxBuffer: 2000000,
  }),
);
(async () => {
  await new Promise((r) => server.listen(4175, "127.0.0.1", r));
  const b = await chromium.launch();
  const p = await b.newPage({ reducedMotion: "reduce" });
  const report = [];
  const current = process.env.AUDIT_CURRENT === "1";
  try {
    for (const width of [390, 1366]) {
      await p.setViewportSize({ width, height: 950 });
      await p.goto(
        "http://127.0.0.1:4175/" +
          (current ? "index.html" : "test-results/baseline.html"),
      );
      await p.evaluate(() => {
        state.session = { role: "admin", kind: "demo" };
        state.role = "admin";
      });
      for (const theme of ["night", "cream"]) {
        for (const screen of [
          "home",
          "parking",
          "family",
          "kids",
          "events",
          "giving",
          "cafe",
          "projects",
          "notices",
          "profile",
          "volunteer",
          "admin",
          "people",
          "settings",
          "login",
        ]) {
          await p.evaluate(
            ({ screen, theme }) => {
              state.theme = theme;
              state.screen = screen;
              render();
            },
            { screen, theme },
          );
          await p.addScriptTag({
            path: require.resolve("axe-core/axe.min.js"),
          });
          const data = await p.evaluate(async () => ({
            overflow: document.documentElement.scrollWidth > innerWidth + 1,
            violations: (
              await axe.run(document, {
                runOnly: {
                  type: "tag",
                  values: ["wcag2a", "wcag2aa", "wcag21aa"],
                },
              })
            ).violations.map((v) => ({
              id: v.id,
              impact: v.impact,
              targets: v.nodes.map((n) => n.target),
            })),
          }));
          report.push({ width, theme, screen, ...data });
          if (["home", "notices", "profile", "people"].includes(screen))
            await p.screenshot({
              path: path.join(
                out,
                (current ? "current-" : "baseline-") +
                  screen +
                  "-" +
                  theme +
                  "-" +
                  width +
                  ".png",
              ),
              fullPage: true,
            });
        }
      }
    }
    await p.goto("http://127.0.0.1:4175/test-results/baseline-cafe.html");
    await p.screenshot({
      path: path.join(out, "baseline-cafe.png"),
      fullPage: true,
    });
    fs.writeFileSync(
      path.join(out, current ? "current-audit.json" : "baseline-audit.json"),
      JSON.stringify(report, null, 2),
    );
    console.log(
      current ? "Current audited:" : "Baseline audited:",
      report.length,
      "views; violations:",
      report.reduce((s, r) => s + r.violations.length, 0),
    );
  } finally {
    await b.close();
    server.close();
  }
})().catch((e) => {
  console.error(e);
  server.close();
  process.exitCode = 1;
});
