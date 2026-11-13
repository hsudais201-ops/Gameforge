import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../wildearth3d.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script\\b[^>]*>([\\s\\S]*?)<\\/script>/gi)].map(m => m[1]).filter(s => s.trim());

test('game script parses without syntax errors', () => {
  assert.ok(scripts.length > 0, 'expected the game entry script');
  for (const source of scripts) assert.doesNotThrow(() => new Function(source));
});

test('startup and menu entry points remain present', () => {
  for (const id of ['c', 'mainMenu', 'worldSelect', 'playSelected', 'createWorld', 'settingsPanel', 'pausePanel']) {
    assert.match(html, new RegExp('id="' + id + '"'), 'missing required UI node: ' + id);
  }
  assert.match(html, /requestAnimationFrame\\(frame\\)/, 'animation loop must be started');
  assert.match(html, /updateWorldStreaming\\(true\\)/, 'world streaming must initialize');
});

test('world seed is stored per world and can be overridden for reproduction', () => {
  assert.match(html, /seedFromString/);
  assert.match(html, /worldSeed/);
  assert.match(html, /URLSearchParams\\(location\\.search\\)/);
  assert.match(html, /R=rng\\(worldSeed\\)/);
  assert.match(html, /newWorldSeed/);
});

test('save compatibility keeps legacy inventory migration paths', () => {
  assert.match(html, /version:4/);
  assert.match(html, /d\\.slots\\.length===30/);
  assert.match(html, /mfwilds3d_v2/);
  assert.match(html, /mfwilds3d_v1/);
});
