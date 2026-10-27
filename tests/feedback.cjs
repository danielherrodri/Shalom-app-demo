const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  try {
    const page = await browser.newPage({viewport: {width: 390, height: 844}});
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => {
      const file = path.resolve(process.cwd(), '.' + new URL(route.request().url()).pathname);
      return file.startsWith(process.cwd() + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile() ? route.fulfill({path: file}) : route.abort();
    });
    await page.goto('http://localhost/index.html');
    // Desde «Más», Tu opinión abre con el servicio de la pantalla actual.
    await page.evaluate(() => { state.session = {role: 'persona', kind: 'demo'}; goto('events'); });
    await page.locator('[data-shalom-more]').click();
    await page.locator('.shalom-more-sheet').getByRole('link', {name: 'Tu opinión'}).click();
    assert.equal(await page.locator('#service').inputValue(), 'events');
    await page.goto('http://localhost/feedback.html?service=kids');
    assert.equal(await page.locator('#service').inputValue(), 'kids');
    // Tres pasos: «Continuar» avanza y los errores regresan al paso que corresponde.
    const go = label => page.locator('fieldset[data-step]:not([hidden]) [data-step-go]', {hasText: label}).click();
    await go('Continuar');
    await go('Continuar');
    await page.locator('[name=tutor]').check();
    await page.getByRole('button', {name: 'Registrar opinión de prueba'}).click();
    assert.match(await page.locator('#form-error').innerText(), /valoración o un comentario/);
    assert.match(await page.locator('#step-label').innerText(), /Paso 2 de 3/);
    await page.locator('#comment').fill('   ');
    await go('Continuar');
    await page.getByRole('button', {name: 'Registrar opinión de prueba'}).click();
    assert.equal(await page.locator('article').count(), 0);
    await page.locator('#comment').fill('<img src=x onerror=alert(1)> Sugerencia ficticia');
    await go('Continuar');
    await page.locator('#contact').check();
    await page.getByRole('button', {name: 'Registrar opinión de prueba'}).click();
    assert.equal(await page.locator('article').count(), 0);
    await page.locator('#channel').selectOption({label: 'Mensajería de mi cuenta'});
    await page.getByRole('button', {name: 'Registrar opinión de prueba'}).click();
    assert.match(await page.locator('#message').innerText(), /OP-/);
    assert.equal(await page.locator('article img').count(), 0);
    assert.match(await page.locator('article').innerText(), /<img src=x onerror=alert/);
    await page.locator('#profile').selectOption('team');
    assert.equal(await page.locator('article').count(), 0);
    await page.locator('#scope').selectOption('kids');
    assert.equal(await page.locator('article').count(), 1);
    await page.locator('[name=owner]').fill('Coordinación de ejemplo');
    await page.locator('[name=status]').selectOption('Cerrado');
    await page.getByRole('button', {name: 'Guardar seguimiento'}).click();
    assert.match(await page.locator('#message').innerText(), /sin omitir etapas/);
    await page.locator('[name=owner]').fill('Coordinación de ejemplo');
    await page.locator('[name=status]').selectOption('En revisión');
    await page.locator('[name=note]').fill('Nota interna ficticia');
    await page.locator('[name=reply]').fill('Respuesta ficticia para el remitente');
    await page.getByRole('button', {name: 'Guardar seguimiento'}).click();
    for (const status of ['En atención', 'Resuelto', 'Cerrado']) {
      await page.locator('[name=status]').selectOption(status);
      await page.getByRole('button', {name: 'Guardar seguimiento'}).click();
    }
    await page.locator('#profile').selectOption('person');
    assert.doesNotMatch(await page.locator('article').innerText(), /Nota interna ficticia/);
    assert.match(await page.locator('article').innerText(), /Respuesta ficticia para el remitente/);
    await page.getByRole('button', {name: 'Aún necesito ayuda'}).click();
    assert.equal(await page.locator('.badge').innerText(), 'En atención');
    await page.getByRole('button', {name: 'Reportar una situación delicada o de seguridad'}).click();
    assert.equal(await page.locator('dialog textarea').count(), 0);
    assert.match(await page.locator('dialog').innerText(), /no recibe reportes sensibles/);
    await page.keyboard.press('Escape');
    await page.locator('dialog').waitFor({state: 'detached'});
    assert.equal(await page.locator('dialog').count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({path: 'test-results/feedback-mobile.png', fullPage: true});
    await page.reload();
    assert.equal(await page.locator('article').count(), 0);
    await page.locator('#service').selectOption('cafe');
    await page.locator('#rating').selectOption('4');
    await go('Continuar');
    await go('Continuar');
    await page.getByRole('button', {name: 'Registrar opinión de prueba'}).click();
    assert.match(await page.locator('.metrics').innerText(), /100%/);
    for (const [file, service] of [['cafeteria.html','cafe'], ['design/kids-paneles.html','kids'], ['comunicaciones.html','other']]) {
      await page.goto('http://localhost/' + file);
      await page.locator('[data-shalom-more]').click();
      await page.locator('.shalom-more-sheet').getByRole('link', {name: 'Tu opinión'}).click();
      assert.equal(await page.locator('#service').inputValue(), service);
    }
    await page.setViewportSize({width: 1366, height: 900});
    await page.goto('http://localhost/feedback.html');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    const axePath = require.resolve('axe-core/axe.min.js');
    await page.addScriptTag({path: axePath});
    const a11y = await page.evaluate(async () => (await axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa']}})).violations.map(x => x.id));
    assert.deepEqual(a11y, []);
    assert.deepEqual(errors, []);
    console.log('PASS: contexto por servicio, Kids/tutor, validación, contacto, escape HTML, aislamiento por servicio, secuencia, notas privadas, respuesta, reapertura, canal delicado, reinicio, métricas, móvil y axe.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
