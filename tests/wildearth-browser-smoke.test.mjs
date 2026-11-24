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

test('browser gameplay smoke: create, move, save, return, reload, and resume a world', {
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
      window.__wildearthSmoke = { keys: [] };
      window.addEventListener('keydown', event => window.__wildearthSmoke.keys.push(event.code), true);
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

    await page.locator('#pauseResume').click();
    await page.locator('#pausePanel').waitFor({ state: 'hidden' });
    await page.bringToFront();
    await page.waitForFunction(() => document.visibilityState === 'visible');
    await page.keyboard.down('w');
    await page.waitForTimeout(500);
    await page.keyboard.up('w');
    const inputDiagnostics = await page.evaluate(() => window.__wildearthSmoke.keys);
    assert.ok(inputDiagnostics.includes('KeyW'), 'browser keyboard input must reach the game window');

    const joystick = page.locator('#joy');
    const joystickBox = await joystick.boundingBox();
    assert.ok(joystickBox && joystickBox.width > 0, 'movement joystick must be present in gameplay');
    const joystickCenter = {
      x: joystickBox.x + joystickBox.width / 2,
      y: joystickBox.y + joystickBox.height / 2
    };
    const dragJoystick = async (dx, dy) => {
      await page.mouse.move(joystickCenter.x, joystickCenter.y);
      await page.mouse.down();
      await page.mouse.move(
        joystickCenter.x + dx * joystickBox.width * 0.4,
        joystickCenter.y + dy * joystickBox.height * 0.4,
        { steps: 8 }
      );
      const transform = await page.locator('#stick').evaluate(element => element.style.transform);
      await page.waitForTimeout(1_000);
      await page.mouse.up();
      return transform;
    };
    const forwardStick = await dragJoystick(0, -1);
    await dragJoystick(1, 0);
    assert.ok(forwardStick.includes('-'), 'joystick drag must update its visible movement stick');

    await page.locator('#pauseToggle').click();
    await page.locator('#pausePanel').waitFor({ state: 'visible' });
    await page.locator('#pauseSave').click();
    await page.waitForFunction(() =>
      document.getElementById('pauseStatus')?.textContent.includes('saved successfully')
    );
    const saved = await page.evaluate(id => JSON.parse(localStorage.getItem('mfwilds3d_world_' + id)), worldId);
    const distanceMoved = Math.hypot(saved.P.x - baseline.P.x, saved.P.z - baseline.P.z);
    assert.ok(distanceMoved > 0.35, 'keyboard movement must change the persisted player position; moved ' + distanceMoved);

    await page.locator('#pauseMainMenu').click();
    await page.locator('#mainMenu').waitFor({ state: 'visible' });
    await assertHealthy('return to main menu');

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
    assert.ok(Math.abs(reloaded.P.x - saved.P.x) < 1, 'player X position must survive return and reload');
    assert.ok(Math.abs(reloaded.P.z - saved.P.z) < 1, 'player Z position must survive return and reload');
    await assertHealthy('resumed saved world');
  } finally {
    if (context) await context.close();
    if (browser) await browser.close();
    if (server) await new Promise(resolve => server.close(resolve));
  }
});
