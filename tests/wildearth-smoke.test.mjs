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
  assert.match(gameScript, /version:5/);
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

test('control preferences and dodge action are wired', () => {
  for (const id of ['joyDeadzone', 'cameraSensitivity', 'invertCamera', 'bDodge']) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
  for (const marker of ['mfwilds3d_controls_v1', 'function startDodge', "e.code==='KeyV'", 'P.invulnerable>0', 'Math.max(deadzone,0.001)']) {
    assert.ok(gameScript.includes(marker), 'missing control/dodge marker: ' + marker);
  }
});

test('player condition states are exposed through an accessible HUD indicator', () => {
  assert.match(html, /id="statusEffects"/);
  assert.ok(gameScript.includes("statuses.push('CRITICAL HEALTH')"));
  assert.ok(gameScript.includes("statuses.push('STARVING')"));
  assert.ok(gameScript.includes("statuses.push('EXHAUSTED')"));
  assert.ok(gameScript.includes("statuses.push('DODGING')"));
});

test('survival difficulty presets persist and scale incoming damage and hunger', () => {
  assert.match(html, /id="difficultySelect"/);
  for (const marker of ["mfwilds3d_difficulty_v1", "function difficultyScale()", "function hungerScale()", "P.food-0.3*dt*hungerScale()", "P.hp-amount*difficultyScale()"]) {
    assert.ok(gameScript.includes(marker), 'missing difficulty marker: ' + marker);
  }
});

test('notification duration is user-configurable and persisted', () => {
  assert.match(html, /id="notificationDuration"/);
  assert.ok(gameScript.includes('mfwilds3d_notify_v1'));
  assert.ok(gameScript.includes('hintT=secs||notificationSeconds'));
});

test('movement keys can be remapped and persisted without collisions', () => {
  for (const id of ['bindForward', 'bindBackward', 'bindLeft', 'bindRight']) assert.match(html, new RegExp('id="' + id + '"'));
  for (const marker of ['mfwilds3d_keybindings_v1', 'function saveKeyBindings()', 'waitingBinding', 'duplicate', 'keys[keyBindings.right]', 'keys[keyBindings.forward]']) {
    assert.ok(gameScript.includes(marker), 'missing key remapping marker: ' + marker);
  }
});

test('world seed entry and grid-aligned build placement are available', () => {
  assert.match(html, /id="newWorldSeed"/);
  assert.match(html, /id="worldSeedInfo"/);
  assert.ok(gameScript.includes('function placePos(id)'));
  assert.ok(gameScript.includes('Math.round(tx/3)*3'));
  assert.ok(gameScript.includes('Math.round(tz/3)*3'));
});

test('graphics profiles adapt weather particle budgets with quality changes', () => {
  assert.ok(gameScript.includes('particleScale:0.4'));
  assert.ok(gameScript.includes('particleScale:0.7'));
  assert.ok(gameScript.includes('function applyWeatherBudget()'));
  assert.ok(gameScript.includes('applyWeatherBudget();'));
  assert.ok(gameScript.includes('rainCount=target'));
});


test('procedural biomes drive terrain materials, resource placement, and wildlife habitat', () => {
  for (const marker of ['var BIOMES=', 'function biomeAt(x,z)', 'function habitatWeight(sp,b)', 'pickSpecies(s.x,s.z)', 'var habitatChance=']) {
    assert.ok(gameScript.includes(marker), 'missing biome ecology marker: ' + marker);
  }
  assert.match(html, /id="biomeStatus"/);
});

test('swimming has slower movement, buoyancy, oxygen drain, and drowning damage', () => {
  for (const marker of ['P.swimming=waterDepth>0.55', 'P.y+=(WATER-0.45-P.y)', 'P.oxygen=Math.max(0,P.oxygen-dt*8)', "playerDamage(4*dt,'Drowning')", '(P.swimming?0.58:1)']) {
    assert.ok(gameScript.includes(marker), 'missing swimming marker: ' + marker);
  }
});

test('wetness, drying, cold exposure, and oxygen persist safely in versioned saves', () => {
  for (const marker of ['wetness:P.wetness', 'oxygen:P.oxygen', 'P.wetness=Math.min(100', 'P.wetness=Math.max(0', "playerDamage(0.45*dt,'Cold exposure')", 'P.temperature<0.08']) {
    assert.ok(gameScript.includes(marker), 'missing exposure marker: ' + marker);
  }
  assert.match(gameScript, /version:5/);
  assert.match(gameScript, /P\.wetness=isFinite\(d\.P\.wetness\)/);
});


test('wildlife breeding is population-limited and offspring inherit parent traits', () => {
  for (const marker of ['function tryBreed(c,dt)', 'wild.length>=48', 'child.secondParent=mate', 'child.boldness=clamp((c.boldness+mate.boldness)', 'child.sociability=clamp((c.sociability+mate.sociability)', 'child.curiosity=clamp((c.curiosity+mate.curiosity)', 'tryBreed(c,dt)']) {
    assert.ok(gameScript.includes(marker), 'missing breeding marker: ' + marker);
  }
});


test('creatures have food preferences, hunger needs, and trust-based catch bonuses', () => {
  for (const marker of ['var CREATURE_DIET=', 'trust:0,hunger:rand(25,75)', 'function feedCreature(c,item)', 'creature.trust||0', 'c.hunger=clamp((c.hunger||0)+dt*0.16', 'rateNow(c.sp,id,c)']) {
    assert.ok(gameScript.includes(marker), 'missing creature care marker: ' + marker);
  }
  assert.match(gameScript, /Trust '\+Math\.round\(c\.trust\*100\)/);
});


test('melee attacks require a valid forward-facing hit arc and show hit confirmation', () => {
  for (const marker of ['function inWeaponArc(o,range,threshold)', 'inWeaponArc(o,5,0.25)', 'inWeaponArc(o,3.4,0.35)', 'burst(w.x,w.y+1.2,w.z,0xc9a8ff,6)', 'dealt.toFixed(1)']) {
    assert.ok(gameScript.includes(marker), 'missing melee validation marker: ' + marker);
  }
});

test('Wraith variants have distinct resistance and vulnerability profiles', () => {
  for (const marker of ['damageTaken:0.68', 'damageTaken:1.3', 'damageTaken:profile.damageTaken', 'w.damageTaken||1']) {
    assert.ok(gameScript.includes(marker), 'missing enemy resistance marker: ' + marker);
  }
});
