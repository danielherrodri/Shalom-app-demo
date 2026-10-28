"use strict";
// Flujo de asistencia de Shalom Kids: Recepción escribe un registro único que leen Mi grupo hoy, Asistencia y Mis hijos.
const localBrowserPath = require("node:path").resolve(__dirname, "../.pw-browsers");
if (require("node:fs").existsSync(localBrowserPath)) process.env.PLAYWRIGHT_BROWSERS_PATH ||= localBrowserPath;
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const server = require("./server.cjs");
const ok = (n) => console.log("PASS", n);
(async () => {
  await new Promise((r) => server.listen(4180, "127.0.0.1", r));
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  // El 404 del versículo del día (API externa) es ajeno a este flujo.
  page.on("console", (m) => m.type() === "error" && !/status of 404/.test(m.text()) && errors.push(m.text()));
  const base = "http://127.0.0.1:4180/design/kids-paneles.html";
  const txt = (sel) => page.locator(sel).innerText();
  const scan = async (code) => { await page.fill("#rec-codigo", code); await page.press("#rec-codigo", "Enter"); };
  const codigoDe = (id) => page.evaluate((x) => window.ShalomKidsAsistencia.st.registros.get(x).codigo, id);
  const cambia = async (perfil, hash) => {
    await page.click("#perfil-cambiar");
    await page.click(`[data-perfil=${perfil}]`);
    await page.evaluate((h) => { location.hash = h; }, hash);
  };
  try {
    await page.goto(base + "#recepcion");
    await page.waitForSelector("#rec-bloqueo:not([hidden])");
    assert.match(await txt("#rec-bloqueo"), /Recepción es para el equipo de la puerta/);
    ok("el docente no entra a Recepción");

    await page.goto(base + "?perfil=admin#recepcion");
    await page.waitForSelector("#rec-contenido:not([hidden])");
    const dentroAntes = await txt("#rec-vivo");
    await scan("XQ-000");
    assert.match(await txt("#rec-resultado"), /No reconocemos este código/);
    await scan("K-105");
    assert.match(await txt("#rec-resultado"), /Gafete desactivado/);
    await scan("K-103");
    assert.match(await txt("#rec-resultado"), /Ya está dentro/);
    ok("estados de escaneo: desconocido, inactivo y ya registrado");

    await scan("K-101");
    assert.match(await txt("#rec-resultado"), /Por confirmar · avisó/);
    assert.match(await txt("#rec-resultado"), /Requiere atención/);
    await page.click("[data-entrada=K-101]");
    assert.match(await txt("#rec-resultado"), /Dentro ·/);
    assert.match((await txt("#rec-resultado .ka-codigo strong")).trim(), /^[A-Z0-9]{4}$/);
    assert.notEqual(await txt("#rec-vivo"), dentroAntes);
    await scan("K-101");
    assert.match(await txt("#rec-resultado"), /No se duplicó la entrada/);
    ok("entrada confirmada con código de recogida y sin duplicados");

    // Mi grupo hoy lee el mismo registro (sin recargar: la sesión de ejemplo vive en memoria).
    await cambia("docente", "#lista");
    await page.waitForSelector("#mg-dentro");
    assert.match(await txt("#mg-dentro"), /Menor de ejemplo A/);
    await page.click("[data-corregir=K-101]");
    await page.click("#ka-corregir button[type=submit]");
    assert.match(await txt("#cor-msg"), /motivo/);
    await page.check("[name=que][value=fuera]");
    await page.fill("#cor-motivo", "Se escaneó el gafete de su hermano por error");
    await page.click("#ka-corregir button[type=submit]");
    assert.match(await txt("#mg-esperados"), /Menor de ejemplo A/);
    assert.equal(await page.locator("#lista button:has-text('Registrar entrega')").isDisabled(), true);
    ok("Mi grupo hoy se llena solo; la corrección exige motivo y el docente no entrega");
    await cambia("admin", "#recepcion");
    await page.waitForSelector("#rec-contenido:not([hidden])");
    await page.click("#rec-alta");
    await page.click("#ka-alta button[type=submit]");
    assert.match(await txt("#alta-msg"), /nombre/);
    await page.fill("#alta-nombre", "Menor de ejemplo G");
    await page.fill("#alta-adulto", "Adulto de ejemplo H");
    await page.fill("#alta-tel", "5500000000");
    await page.click("#ka-alta button[type=submit]");
    assert.match(await txt("#alta-msg"), /privacidad/);
    assert.equal(await page.locator("#alta-datos").isChecked(), false);
    assert.equal(await page.locator("#alta-imagen").isChecked(), false);
    await page.check("#alta-datos");
    await page.click("#ka-alta button[type=submit]");
    assert.match(await txt("#rec-resultado"), /Registro provisional/);
    ok("alta rápida: consentimientos sin premarcar, datos obligatorios, registro provisional");
    await page.click("#rec-resultado [data-temporal]");
    assert.match(await txt("#rec-msg"), /Gafete temporal en blanco vinculado/);
    ok("alta rápida vincula un gafete temporal en blanco");

    await page.click("[data-camara]");
    assert.match(await txt("#rec-resultado"), /No tenemos acceso a la cámara/);
    await page.click("[data-lista-prueba=error]");
    assert.match(await txt("#rec-avisos"), /No pudimos cargar la lista/);
    await page.click("[data-lista-reintenta]");
    assert.match(await txt("#rec-avisos"), /Cargando la lista/);
    await page.waitForFunction(() => !/Cargando/.test(document.querySelector("#rec-avisos").innerText));
    ok("estados de pantalla: cámara bloqueada, error al cargar y cargando");
    await page.check("#rec-offline");
    assert.match(await txt("#rec-sync"), /Sin conexión · \d+ lecturas? en cola/);
    await page.uncheck("#rec-offline");

    await page.evaluate(() => { location.hash = "#alumnos"; });
    assert.match(await txt("#alumnos-aviso"), /provisional/);
    ok("Alumnos y gafetes muestra pendientes");
    await page.click("#alumnos-filas [data-gafete=K-104]");
    assert.match(await txt("#gafete-cuerpo"), /Última impresión[\s\S]*Lecturas este mes/);
    await page.click("[data-expediente=K-104]");
    assert.match(await txt("#alumnos-estado"), /permiso de coordinación/);
    ok("panel de gafete con impresiones, lecturas del mes y expediente autorizado");

    await page.evaluate(() => { location.hash = "#recepcion"; });
    await page.click("[data-modo=entrega]");
    await scan("K-203");
    await page.fill("#rec-cod-pres", "ZZZZ");
    await page.click("#rec-entrega button[type=submit]");
    assert.match(await txt("#rec-resultado"), /El código no coincide/);
    await scan("K-203");
    await page.fill("#rec-cod-pres", await codigoDe("K-203"));
    await page.click("#rec-entrega button[type=submit]");
    assert.equal(await page.locator("#rec-entregar").isDisabled(), true);
    await page.check("#rec-reconozco");
    await page.click("#rec-entregar");
    assert.match(await txt("#rec-resultado"), /De vuelta con su familia/);
    ok("entrega: código, adulto autorizado y reconocimiento personal");

    await scan("K-206");
    await page.fill("#rec-cod-pres", await codigoDe("K-206"));
    await page.click("#rec-entrega button[type=submit]");
    await page.check("[name=adulto][value='']");
    await page.check("#rec-reconozco");
    await page.click("#rec-entregar");
    assert.match(await txt("#rec-resultado"), /Entrega pendiente/);
    assert.match(await txt("#rec-pendientes"), /K-206/);
    ok("adulto no autorizado deja la entrega pendiente para coordinación");

    await page.evaluate(() => { location.hash = "#asistencia"; });
    assert.match(await txt("#asistencia-resumen"), /En curso/);
    await page.click("[data-bit=Entregas]");
    assert.match(await txt("#bitacora-filas"), /Entrega/);
    ok("Asistencia y bitácora salen del mismo registro");

    await page.evaluate(() => { location.hash = "#familia"; });
    assert.match(await txt("#fam-hijos"), /Menor de ejemplo A/);
    ok("Mis hijos");
    if (!(await page.locator("#fam-qr-tiempo").count())) await page.click("[data-fam-avisa]");
    assert.match(await txt("#fam-qr"), /Muéstralo en la puerta[\s\S]*Se renueva en [0-5]:\d\d/);
    ok("QR familiar con cuenta regresiva de 5 minutos");
    await page.click("[data-fam-aut]");
    assert.match(await txt("dialog[open]"), /Adulto de ejemplo B/);
    await page.click("#fam-aut-pide");
    assert.match(await txt("#fam-aut-msg"), /coordinación/);
    await page.click("dialog[open] [data-cerrar]");
    ok("administrar autorizaciones sin mostrar teléfonos");
    const op = page.locator("form[data-fam-opinion]").first();
    await op.locator("button[type=submit]").click();
    assert.match(await op.locator("[data-op-msg]").innerText(), /Elige cómo les fue/);
    await op.locator("[name=valor][value='Muy bien']").check();
    await op.locator("[name=bien][value=Actividad]").check();
    await op.locator("button[type=submit]").click();
    assert.match(await txt(".ka-opinion"), /Gracias por contarnos[\s\S]*Muy bien · Actividad/);
    await page.click("[data-fam-volver]");
    assert.equal(await page.locator(".ka-opinion").count(), 0);
    ok("opinión una sola vez después de la entrega");

    await page.evaluate(() => { location.hash = "#decisiones"; });
    assert.equal(await page.locator(".ka-decisiones article").count(), 9);
    ok("nueve decisiones abiertas");
    assert.deepEqual(errors, [], "errores de consola: " + errors.join(" | "));
    ok("sin errores de consola");
  } finally {
    await browser.close();
    server.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
