import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const htmlPath = join(root, 'wildearth3d.html');
const threeBundle = join(dirname(require.resolve('three')), 'three.min.js');
const threeCdn = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

test('browser gameplay smoke: create, save, return, reload, and resume a world', {
  timeout: 180_000
}, async () => {
  const html = await readFile(htmlPath);
  let server;
  let browser;
  let context;

  try {
    server = createServer((request, response) => {
      const pathname = new URL(request.url || '/', 'http://127.0.0.1').pathname;
      if (pathname !== '/wildearth3d.html') {
        response.writeHead(404);
        response.end('Not found');
        return;
      }
      response.writeHead(200, {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store'
      });
      response.end(html);
    });

    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });

    const address = server.address();
    assert.ok(address && typeof address === 'object' && address.port, 'static test server must start');

    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-webgl',
        '--ignore-gpu-blocklist',
        '--enable-unsafe-swiftshader',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ]
    });

    context = await browser.newContext({
      viewport: { width: 1024, height: 640 },
      deviceScaleFactor: 1
    });
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'deviceMemory', { configurable: true, value: 4 });
      Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, value: 4 });
    });

    const page = await context.newPage();
    page.setDefaultTimeout(30_000);
    page.setDefaultNavigationTimeout(60_000);
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.stack || error.message));
    await page.route(threeCdn, route => route.fulfill({
      path: threeBundle,
      contentType: 'application/javascript'
    }));

    const url = 'http://127.0.0.1:' + address.port + '/wildearth3d.html';
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.locator('#mainMenu').waitFor({ state: 'visible' });
    await page.waitForFunction(() =>
      document.getElementById('worldSeedInfo')?.textContent.includes('World seed:')
    );

    const assertHealthy = async stage => {
      const errorPanel = page.locator('#err');
      const display = await errorPanel.evaluate(element => getComputedStyle(element).display);
      assert.equal(display, 'none', stage + ': runtime error panel was shown: ' + await errorPanel.textContent());
      assert.deepEqual(pageErrors, [], stage + ': uncaught browser errors');
    };
    await assertHealthy('initial menu');

    const webglVersion = await page.locator('#c').evaluate(canvas => {
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return gl ? gl.getParameter(gl.VERSION) : null;
    });
    assert.ok(webglVersion, 'the game renderer must acquire a WebGL context');

    await page.locator('#createWorldToggle').click();
    await page.locator('#createWorldForm').waitFor({ state: 'visible' });
    await page.locator('#newWorldName').fill('Browser QA Frontier');
    await page.locator('#newWorldSeed').fill('424242');
    const createNavigation = page.waitForEvent('framenavigated', {
      predicate: frame => frame === page.mainFrame(),
      timeout: 60_000
    });
    await page.locator('#createWorld').click({ noWaitAfter: true });
    await createNavigation;

    await page.locator('#mainMenu').waitFor({ state: 'visible', timeout: 60_000 });
    await page.waitForFunction(() =>
      document.getElementById('worldSeedInfo')?.textContent.includes('World seed: 424242'),
    null, { timeout: 60_000 });
    const worldId = await page.locator('#worldSelect').inputValue();
    assert.ok(worldId.startsWith('world-'), 'created world must have a stable id');
    assert.equal(
      await page.locator('#worldSelect option:checked').textContent(),
      'Browser QA Frontier'
    );
    const worldRecord = await page.evaluate(id => {
      const worlds = JSON.parse(localStorage.getItem('mfwilds3d_world_list_v1') || '[]');
      return worlds.find(world => world.id === id);
    }, worldId);
    assert.equal(worldRecord?.seed, 424242, 'created world seed must persist in the world list');
    await assertHealthy('created world menu');

    await page.locator('#playSelected').click();
    await page.locator('#mainMenu').waitFor({ state: 'hidden' });

    await page.locator('#settingsBtn').click();
    await page.locator('#settingsPanel').waitFor({ state: 'visible' });
    await page.locator('#qualitySelect').selectOption('1');
    await page.locator('#renderDistanceSlider').evaluate(element => {
      element.value = '70';
      element.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.locator('#difficultySelect').selectOption('hard');
    await page.locator('#gameLanguage').selectOption('ur');
    await page.locator('#uiSizeSelect').selectOption('large');
    await page.locator('#contrastToggle').check();
    await page.locator('#notificationDuration').evaluate(element => {
      element.value = '4.5';
      element.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.locator('#joyDeadzone').evaluate(element => {
      element.value = '25';
      element.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.locator('#cameraSensitivity').evaluate(element => {
      element.value = '150';
      element.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.locator('#invertCamera').check();
    await page.locator('#subtitlesToggle').uncheck();
    await page.locator('#captionLanguage').selectOption('ur');
    await page.locator('#settingsClose').click();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('#mainMenu').waitFor({ state: 'visible' });
    await page.locator('#playSelected').click();
    await page.locator('#mainMenu').waitFor({ state: 'hidden' });
    await page.locator('#settingsBtn').click();
    await page.locator('#settingsPanel').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#qualitySelect').inputValue(), '1');
    assert.equal(await page.locator('#renderDistanceSlider').inputValue(), '70');
    assert.equal(await page.locator('#difficultySelect').inputValue(), 'hard');
    assert.equal(await page.locator('#gameLanguage').inputValue(), 'ur');
    assert.equal(await page.locator('#uiSizeSelect').inputValue(), 'large');
    assert.equal(await page.locator('#contrastToggle').isChecked(), true);
    assert.equal(await page.locator('#notificationDuration').inputValue(), '4.5');
    assert.equal(await page.locator('#joyDeadzone').inputValue(), '25');
    assert.equal(await page.locator('#cameraSensitivity').inputValue(), '150');
    assert.equal(await page.locator('#invertCamera').isChecked(), true);
    assert.equal(await page.locator('#subtitlesToggle').isChecked(), false);
    assert.equal(await page.locator('#captionLanguage').inputValue(), 'ur');
    await page.locator('#qualitySelect').selectOption('0');
    await page.locator('#renderDistanceSlider').evaluate(element => {
      element.value = '85';
      element.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.locator('#difficultySelect').selectOption('normal');
    await page.locator('#gameLanguage').selectOption('en');
    await page.locator('#uiSizeSelect').selectOption('normal');
    await page.locator('#contrastToggle').uncheck();
    await page.locator('#notificationDuration').evaluate(element => {
      element.value = '3.5';
      element.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.locator('#joyDeadzone').evaluate(element => {
      element.value = '10';
      element.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.locator('#cameraSensitivity').evaluate(element => {
      element.value = '100';
      element.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.locator('#invertCamera').uncheck();
    await page.locator('#subtitlesToggle').check();
    await page.locator('#captionLanguage').selectOption('en');
    await page.locator('#settingsClose').click();
    await assertHealthy('settings reload');

    await page.locator('#pauseToggle').waitFor({ state: 'visible' });
    await page.locator('#pauseToggle').click();
    await page.locator('#pausePanel').waitFor({ state: 'visible' });
    await page.waitForFunction(() =>
      document.getElementById('pauseStatus')?.textContent.includes('saved')
    );

    const baseline = await page.evaluate(id => {
      const raw = localStorage.getItem('mfwilds3d_world_' + id);
      return raw ? JSON.parse(raw) : null;
    }, worldId);
    assert.equal(baseline?.version, 6, 'new world must use the supported save version');
    assert.equal(baseline?.worldSeed, 424242, 'save must retain the selected world seed');
    assert.ok(Number.isFinite(baseline?.P?.x) && Number.isFinite(baseline?.P?.z), 'save must contain finite player coordinates');

    await page.locator('#pauseSave').click();
    await page.waitForFunction(() =>
      document.getElementById('pauseStatus')?.textContent.includes('saved successfully')
    );
    const saved = await page.evaluate(id => JSON.parse(localStorage.getItem('mfwilds3d_world_' + id)), worldId);
    assert.equal(saved?.version, 6, 'manual save must keep the supported save version');
    assert.equal(saved?.worldSeed, 424242, 'manual save must retain the selected world seed');
    assert.ok(Number.isFinite(saved?.P?.x) && Number.isFinite(saved?.P?.z), 'manual save must contain finite player coordinates');

    await page.locator('#pauseMainMenu').click();
    await page.locator('#mainMenu').waitFor({ state: 'visible' });
    await assertHealthy('return to main menu');

    await page.evaluate(id => {
      const key = 'mfwilds3d_world_' + id;
      const valid = localStorage.getItem(key);
      if (!valid) throw new Error('expected a valid world save before corruption recovery test');
      localStorage.setItem(key + '_backup', valid);
      const corrupted = JSON.parse(valid);
      corrupted.questCompletedIds = ['unknown_quest'];
      localStorage.setItem(key, JSON.stringify(corrupted));
    }, worldId);

    await page.reload({ waitUntil: 'commit', timeout: 60_000 });
    await page.locator('#mainMenu').waitFor({ state: 'visible', timeout: 60_000 });
    await page.waitForFunction(id =>
      document.getElementById('worldSelect')?.value === id &&
      document.getElementById('worldSeedInfo')?.textContent.includes('World seed: 424242'),
    worldId, { timeout: 60_000 });
    await page.locator('#playSelected').click();
    await page.locator('#mainMenu').waitFor({ state: 'hidden' });
    await page.locator('#pauseToggle').click();
    await page.locator('#pausePanel').waitFor({ state: 'visible' });

    const reloaded = await page.evaluate(id => JSON.parse(localStorage.getItem('mfwilds3d_world_' + id)), worldId);
    assert.equal(reloaded?.version, 6);
    assert.equal(reloaded?.worldSeed, 424242);
    assert.deepEqual(reloaded.questCompletedIds || [], saved.questCompletedIds || [], 'an unknown quest ID must be rejected and the validated backup restored');
    assert.ok(Math.abs(reloaded.P.x - saved.P.x) < 1, 'player X position must survive return and reload');
    assert.ok(Math.abs(reloaded.P.z - saved.P.z) < 1, 'player Z position must survive return and reload');
    await assertHealthy('resumed saved world');

    await page.evaluate(() => {
      window.dispatchEvent(new ErrorEvent('error', { message: 'QA recoverable runtime fault' }));
    });
    await page.waitForFunction(() => {
      const notice = document.getElementById('runtimeNotice');
      return notice && !notice.hidden && notice.textContent.includes('QA recoverable runtime fault');
    });
    assert.equal(await page.locator('#err').evaluate(element => getComputedStyle(element).display), 'none',
      'recoverable JavaScript faults must not replace the game with the fatal panel');

    await page.evaluate(() => {
      const event = new Event('unhandledrejection');
      Object.defineProperty(event, 'reason', { value: new Error('QA background task rejection') });
      window.dispatchEvent(event);
    });
    await page.waitForFunction(() =>
      document.getElementById('runtimeNotice')?.textContent.includes('QA background task rejection')
    );
    await assertHealthy('recoverable runtime diagnostics');
  } finally {
    if (context) await context.close();
    if (browser) await browser.close();
    if (server) await new Promise(resolve => server.close(resolve));
  }
});
