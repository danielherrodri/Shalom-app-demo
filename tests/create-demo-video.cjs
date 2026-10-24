"use strict";
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:4173/comunicaciones.html");
  const bytes = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 960;
    canvas.height = 540;
    const ctx = canvas.getContext("2d");
    const stream = canvas.captureStream(15);
    const recorder = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=vp8",
      videoBitsPerSecond: 400000,
    });
    const parts = [];
    recorder.ondataavailable = (e) => parts.push(e.data);
    const done = new Promise((resolve) => (recorder.onstop = resolve));
    let frame = 0;
    function draw() {
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(0, 0, 960, 540);
      ctx.fillStyle = "#c8956c";
      ctx.fillRect(80, 110, 80, 3);
      ctx.font = "600 22px Inter,Arial";
      ctx.fillStyle = "#d9ad86";
      ctx.fillText("COMUNIDAD SHALOM", 80, 185);
      ctx.font = "700 48px Inter,Arial";
      ctx.fillStyle = "#faf7f2";
      ctx.fillText("Una casa para todos.", 80, 275);
      ctx.font = "24px Inter,Arial";
      ctx.fillStyle = "#c4c4c4";
      const text =
        frame < 30
          ? "Avisos, comunidad y próximos encuentros."
          : "Consulta los detalles en Comunicaciones.";
      ctx.fillText(text, 80, 350);
      ctx.font = "18px Inter,Arial";
      ctx.fillText("CLIP DE DEMOSTRACIÓN · SIN AUDIO", 80, 450);
      frame++;
    }
    draw();
    recorder.start();
    const timer = setInterval(draw, 100);
    await new Promise((r) => setTimeout(r, 6000));
    clearInterval(timer);
    recorder.stop();
    await done;
    stream.getTracks().forEach((t) => t.stop());
    return Array.from(
      new Uint8Array(
        await new Blob(parts, { type: "video/webm" }).arrayBuffer(),
      ),
    );
  });
  fs.writeFileSync(
    path.join(__dirname, "../assets/aviso-demo.webm"),
    Buffer.from(bytes),
  );
  await browser.close();
  console.log("Clip tipográfico generado localmente.");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
