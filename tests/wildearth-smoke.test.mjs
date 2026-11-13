import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../wildearth3d.html', import.meta.url), 'utf8');
const scriptStart = html.indexOf('<script>');
const scriptEnd = html.indexOf('</script>', scriptStart);
const gameScript = scriptStart >= 0 && scriptEnd > scriptStart ? html.slice(scriptStart + 8, scriptEnd) : '';

test('game script parses without syntax errors', () => {
  assert.ok(gameScript.trim(), 'expected the game entry script');
  assert.doesNotThrow(() => new Function(gameScript));
});

test('startup and menu entry points remain present', () => {
  for (const id of ['c', 'mainMenu', 'worldSelect', 'playSelected', 'createWorld', 'settingsPanel', 'pausePanel']) {
    assert.match(html, new RegExp('id="' + id + '"'), 'missing required UI node: ' + id);
  }
  assert.match(gameScript, /requestAnimationFrame\(frame\)/, 'animation loop must be started');
  assert.match(gameScript, /updateWorldStreaming\(true\)/, 'world streaming must initialize');
});

test('seeded random generator reproduces the same sequence', () => {
  const rngStart = gameScript.indexOf('function rng(a){');
  const rngEnd = gameScript.indexOf('var R=', rngStart);
  const declaration = rngStart >= 0 && rngEnd > rngStart ? gameScript.slice(rngStart, rngEnd) : '';
  assert.ok(declaration, 'seeded RNG declaration must exist');
  const rng = new Function(declaration + '; return rng;')();
  const first = rng(12345), second = rng(12345), different = rng(54321);
  const sequenceA = [first(), first(), first(), first()];
  const sequenceB = [second(), second(), second(), second()];
  const sequenceC = [different(), different(), different(), different()];
  assert.deepEqual(sequenceA, sequenceB);
  assert.notDeepEqual(sequenceA, sequenceC);
});

test('world seed is stored per world and can be overridden for reproduction', () => {
  assert.match(gameScript, /seedFromString/);
  assert.match(gameScript, /worldSeed/);
  assert.match(gameScript, /URLSearchParams\(location\.search\)/);
  assert.match(gameScript, /R=rng\(worldSeed\)/);
  assert.match(html, /id="newWorldSeed"/);
});

test('save compatibility keeps legacy inventory migration paths', () => {
  assert.match(gameScript, /version:4/);
  assert.match(gameScript, /d\.slots\.length===30/);
  assert.match(gameScript, /mfwilds3d_v2/);
  assert.match(gameScript, /mfwilds3d_v1/);
});

test('storage chests are craftable, interactable, and included in world saves', () => {
  for (const marker of ['chestPanel', 'chestGrid', 'openChest', 'chestStore', 'chestTake', 'chests.map', 'd.chests', 'Array.from({length:18}']) {
    assert.ok(gameScript.includes(marker) || html.includes(marker), 'missing chest system marker: ' + marker);
  }
  assert.match(gameScript, /chest:\{wood:12,stone:4\}/);
});

test('inventory sorting and chest quick-transfer controls are wired', () => {
  assert.match(html, /id="bagSort"/);
  assert.ok(gameScript.includes('function sortStorageInventory'));
  assert.ok(gameScript.includes('chestStore'));
  assert.ok(gameScript.includes('chestTake'));
});

test('crafting recipe search and category filters are wired', () => {
  assert.match(html, /id="craftSearch"/);
  assert.match(html, /id="craftCategoryFilter"/);
  assert.ok(gameScript.includes('function applyRecipeFilters'));
  assert.ok(gameScript.includes('data-craft-category'));
});
