import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../wildearth3d.html', import.meta.url), 'utf8');
const scriptStart = html.indexOf('<script>');
const scriptEnd = html.indexOf('</script>', scriptStart);
const gameScript = scriptStart >= 0 && scriptEnd > scriptStart ? html.slice(scriptStart + 8, scriptEnd) : '';
const projectApi = readFileSync(new URL('../functions/api/projects/index.js', import.meta.url), 'utf8');

function extractGameFunction(name) {
  const start=gameScript.indexOf('function '+name+'(');
  if(start<0)throw new Error('Missing game function: '+name);
  const open=gameScript.indexOf('{',start);
  let depth=0;
  for(let i=open;i<gameScript.length;i++){
    if(gameScript[i]==='{')depth++;
    else if(gameScript[i]==='}'&&--depth===0)return gameScript.slice(start,i+1);
  }
  throw new Error('Unclosed game function: '+name);
}

test('game script parses without syntax errors', () => {
  assert.ok(gameScript.trim(), 'expected the game entry script');
  assert.doesNotThrow(() => new Function(gameScript));
});

test('startup and menu entry points remain present', () => {
  for (const id of ['c', 'mainMenu', 'worldSelect', 'playSelected', 'createWorld', 'settingsPanel', 'pausePanel']) {
    assert.match(html, new RegExp('id="' + id + '"'), 'missing required UI node: ' + id);
  }
  assert.match(gameScript, /function scheduleFrame\(\)[^{]*\{[^}]*requestAnimationFrame\(frame\)/, 'single animation scheduler must start the loop');
  assert.match(gameScript, /updateWorldStreaming\(true\)/, 'world streaming must initialize');
});

test('startup shows the world seed before deferred world streaming', () => {
  assert.match(gameScript, /var earlySeedLabel=\$\('worldSeedInfo'\)/);
  const streamCall = gameScript.indexOf('updateWorldStreaming(true)');
  const seedLabel = gameScript.indexOf('var earlySeedLabel=$(\'worldSeedInfo\')');
  assert.ok(seedLabel >= 0 && streamCall > seedLabel, 'the resolved seed must be shown before streaming is scheduled');
  assert.match(gameScript, /function startInitialWorldStreaming\(\)\{[\s\S]*?try\{updateWorldStreaming\(true\);?\}[\s\S]*?initialStreamAttempts<1[\s\S]*?setTimeout\(startInitialWorldStreaming,1000\)/);
  assert.ok(gameScript.includes('requestAnimationFrame(function(){setTimeout(startInitialWorldStreaming,120);});'), 'initial streaming must remain deferred until after the first menu paint');
});

test('world creation and selected-world launch are wired to persistent world data', () => {
  assert.match(gameScript, /var activeWorldId=selectedWorldId/);
  assert.match(gameScript, /if\(selectedWorldId!==activeWorldId\).*location\.reload\(\)/s);
  assert.match(gameScript, /id='world-'/);
  assert.match(gameScript, /function persistWorldList\(\)\{try\{/);
  assert.match(gameScript, /seedText===''[\s\S]*?\/\^\\d\+\$\//);
  assert.match(gameScript, /Created '\+name\+' · seed '\+newSeed/);
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
  assert.match(gameScript, /version:6/);
  assert.match(gameScript, /oldSlots\.length===30/);
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

test('settings uses a fixed header and a dedicated independently scrollable content region', () => {
  assert.match(html, /id="settingsContent" tabindex="0"/);
  assert.ok(html.includes('#settingsContent{display:flex;flex:1 1 0%'));
  assert.ok(html.includes('overflow-y:auto;overscroll-behavior-y:contain'));
  assert.ok(html.includes('#settingsPanel{top:max(8px,env(safe-area-inset-top));bottom:max(8px,env(safe-area-inset-bottom))'));
  assert.ok(html.includes('#settingsPanel>.bagTop{position:relative;top:auto;flex:0 0 auto'));
  assert.ok(html.includes('#settingsContent>*{flex:0 0 auto;min-height:max-content}'));
  assert.ok(html.includes('#settingsContent::-webkit-scrollbar'));
  assert.ok(html.includes('#settingsPanel[hidden]{display:none}'));
});

test('settings panel keeps all controls full-height and scrolls the full content', () => {
  for (const css of ['#settingsPanel>*{flex:0 0 auto;min-height:max-content}', '#settingsPanel .settingRow{flex:0 0 auto;min-height:36px}', 'height:calc(100dvh - 20px', '-webkit-overflow-scrolling:touch', '#settingsPanel>.bagTop{position:sticky']) {
    assert.ok(html.includes(css), 'missing full-content settings layout: '+css);
  }
});

test('settings panel fits short and narrow screens and scrolls all controls', () => {
  for (const css of ['width:min(94vw,520px)','max-height:calc(100dvh - 20px','overflow-y:auto','overscroll-behavior:contain','grid-template-columns:minmax(0,1fr) minmax(110px,auto)','@media(max-height:560px)']) {
    assert.ok(html.includes(css), 'missing responsive settings CSS: ' + css);
  }
  for (const id of ['settingsClose','qualitySelect','musicVolume','cameraSensitivity','exportDiagnostics','settingsMenu']) {
    assert.ok(html.includes('id="' + id + '"'), 'settings control must remain accessible: ' + id);
  }
});

test('world render distance slider persists and controls streamed world radius', () => {
  assert.match(html, /id="renderDistanceSlider"/);
  assert.match(html, /min="40" max="160" step="5"/);
  assert.match(html, /id="renderDistanceValue"/);
  for (const marker of ['areaRadius=85', 'savedGraphics.areaRadius', 'function applyAreaRadius(radius)', "addEventListener('input',function(){applyAreaRadius(+this.value)})", 'var radius=areaRadius', 'Active render distance:']) {
    assert.ok(gameScript.includes(marker), 'missing render-distance behavior: '+marker);
  }
  assert.ok(gameScript.includes('areaRadii[savedGraphics.area]'), 'legacy world-area settings must migrate through the validated profile index');
  assert.ok(gameScript.includes('areaRadius:areaRadius'), 'render distance must persist');
});

test('graphics quality applies shadow, fog, and weather budgets and restores the selected value', () => {
  assert.match(html, /id="qualitySelect"/);
  for (const marker of ['function applyRenderProfile(level)', 'renderer.shadowMap.enabled=profile.shadows', 'sun.castShadow=profile.shadows', 'scene.fog.far=profile.fogFar', 'applyWeatherBudget()', "$('qualitySelect').value=String(renderLevel)", 'applyRenderProfile(renderLevel)']) {
    assert.ok(gameScript.includes(marker), 'missing graphics setting behavior: '+marker);
  }
});

test('menu scrolling remains touch-accessible despite gameplay touch-action rules', () => {
  assert.ok(html.includes('touch-action:pan-y'));
  assert.ok(html.includes('-webkit-overflow-scrolling:touch'));
  assert.ok(html.includes('#mainMenu .menuCard'));
  assert.ok(html.includes('scrollbar-color:#718d77'));
});

test('all game menus and dialogs support bounded vertical scrolling', () => {
  for (const id of ['mainMenu','questPanel','mapPanel','chestPanel','pausePanel','deathPanel']) {
    assert.ok(html.includes('#' + id), id + ' must exist');
  }
  assert.ok(html.includes('.menuCard,.questCard,.mapCard,.chestCard,.pauseCard,.deathCard'));
  assert.ok(html.includes('max-height:calc(100dvh'));
  assert.ok(html.includes('#bag{overscroll-behavior:contain'));
  assert.ok(html.includes('@media(max-height:560px)'));
});

test('settings markup has clean audio controls and restores saved render distance', () => {
  assert.ok(html.includes('id="captionLanguage"'));
  assert.ok(html.includes('id="musicVolume"'));
  assert.ok(html.includes('id="renderDistanceSlider"'));
  assert.ok(gameScript.includes('applyAreaRadius(areaRadius)'));
  assert.ok(gameScript.includes('function saveGraphicsSettings()'));
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
  for (const marker of ['function isHeadSubmerged(waterSurface,groundY,alreadySwimming)', 'P.swimming=!caveMode&&isHeadSubmerged(waterSurface,groundY,P.swimming)', 'swimFloatHeight(waterSurface)-P.y', 'P.oxygen=Math.max(0,P.oxygen-dt*8)', "playerDamage(4*dt,'Drowning')", '(P.swimming?0.58:1)']) {
    assert.ok(gameScript.includes(marker), 'missing swimming marker: ' + marker);
  }
});

test('wetness, drying, cold exposure, and oxygen persist safely in versioned saves', () => {
  for (const marker of ['wetness:P.wetness', 'oxygen:P.oxygen', 'P.wetness=Math.min(100', 'P.wetness=Math.max(0', "playerDamage(0.45*dt,'Cold exposure')", 'P.temperature<0.08']) {
    assert.ok(gameScript.includes(marker), 'missing exposure marker: ' + marker);
  }
  assert.match(gameScript, /version:6/);
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



test('wildlife knockouts are recoverable, stop movement, and restore bounded health', () => {
  const source=[
    'var WILD_KNOCKOUT_RECOVERY_SECONDS=18,WILD_KNOCKOUT_RECOVERY_HEALTH=0.45,WILD_KNOCKOUT_CAPTURE_BONUS=0.22;',
    ...['beginWildKnockout','recoverWildCreature','tickWildKnockout','wildCaptureConditionBonus','claimWildKnockoutDrop'].map(extractGameFunction)
  ].join('\n');
  const helpers=new Function('clamp',source+';return {beginWildKnockout,recoverWildCreature,tickWildKnockout,wildCaptureConditionBonus,claimWildKnockoutDrop};')((v,a,b)=>Math.max(a,Math.min(b,v)));
  const creature={hp:0,maxHp:100,downed:false,recoverT:0,flee:2,vx:3,vz:4,speed:2,state:'flee',alertT:1,hitTimer:0.2};
  assert.equal(helpers.beginWildKnockout(creature),true);
  assert.equal(creature.hp,0);
  assert.equal(creature.downed,true);
  assert.equal(creature.recoverT,18);
  assert.equal(creature.flee,0);
  assert.equal(creature.vx,0);
  assert.equal(creature.vz,0);
  assert.equal(creature.speed,0);
  assert.equal(creature.state,'downed');
  assert.equal(helpers.beginWildKnockout(creature),false);
  assert.equal(helpers.tickWildKnockout(creature,17),true);
  assert.equal(creature.downed,true);
  assert.equal(creature.recoverT,1);
  assert.equal(helpers.tickWildKnockout(creature,1),true);
  assert.equal(creature.downed,false);
  assert.equal(creature.hp,45);
  assert.equal(creature.flee,1.8);
  assert.equal(helpers.tickWildKnockout(creature,1),false);
  assert.equal(helpers.recoverWildCreature(creature,0.35),false);
  assert.equal(helpers.beginWildKnockout({hp:0,maxHp:80,held:true}),false);
  assert.equal(helpers.wildCaptureConditionBonus({downed:true}),0.22);
  assert.equal(helpers.wildCaptureConditionBonus({downed:false}),0);
  assert.equal(helpers.wildCaptureConditionBonus(null),0);
  const shed={hp:0,maxHp:90,downed:true,harvested:false};
  assert.equal(helpers.claimWildKnockoutDrop(shed),true);
  assert.equal(helpers.claimWildKnockoutDrop(shed),false);
  assert.equal(helpers.recoverWildCreature(shed,0.45),true);
  assert.equal(shed.harvested,false);
  shed.hp=0;
  assert.equal(helpers.beginWildKnockout(shed),true);
  assert.equal(helpers.claimWildKnockoutDrop(shed),true);
  const bounded={hp:0,maxHp:100,downed:true};
  assert.equal(helpers.recoverWildCreature(bounded,2),true);
  assert.equal(bounded.hp,100);
  const invalid={hp:0,maxHp:NaN,downed:true};
  assert.equal(helpers.recoverWildCreature(invalid,NaN),true);
  assert.equal(invalid.hp,40.5);
});

test('player and Wraith attacks knock out wildlife without deleting population entries', () => {
  for (const marker of [
    'if(prey.hp<=0&&beginWildKnockout(prey)){if(claimWildKnockoutDrop(prey))gain(SPECIES[prey.sp].w,prey.sp===3?3:2,prey.x,prey.y+1.2,prey.z,\'#d8c6a1\');',
    'if(struckWild.hp<=0&&beginWildKnockout(struckWild)){if(claimWildKnockoutDrop(struckWild))gain(SPECIES[struckWild.sp].w,1,struckWild.x,struckWild.y+1,struckWild.z,\'#b8a6d8\');',
    'if(struckWild&&wild.indexOf(struckWild)>=0&&!struckWild.downed',
    'var prey=wild[hi];if(prey.held||prey.downed||prey.isJuvenile)continue;',
    'var protector=wild[gi];if(!protector.defending||protector.held||protector.downed)continue;',
    'return !o.held&&!o.downed&&inWeaponArc(o,3.4,0.35)'
  ]) assert.ok(gameScript.includes(marker), 'missing humane wildlife combat marker: '+marker);
  assert.ok(gameScript.includes('wild.length>=48'), 'downed wildlife must still count toward the existing population cap');
});

test('downed creatures are visible, recover on schedule, and remain capturable with improved odds', () => {
  assert.ok(gameScript.includes('tickWildKnockout(c,dt)'));
  assert.ok(gameScript.includes('if(!discoveredSpecies[c.sp]&&Math.hypot(c.x-P.x,c.z-P.z)<=18)discoverSpecies(c.sp,true)'));
  assert.ok(gameScript.includes('if(c.downed)m.g.rotation.z=0.62;'));
  assert.ok(gameScript.includes("tc.downed?' · UNCONSCIOUS · '"));
  assert.ok(gameScript.includes('wildCaptureConditionBonus(c)'));
  assert.ok(gameScript.includes('Math.max(35,normalizeCompanionHp(sc.maxHp>0?sc.hp/sc.maxHp*100:100))'));
  assert.ok(gameScript.includes('recoverWildCreature(sc,0.35)'));
  const calculate=new Function('rateNow','P','wildCaptureConditionBonus',extractGameFunction('captureChance')+';return captureChance;')((sp,id,c)=>0.5,{stats:{tamer:2}},c=>c&&c.downed?0.22:0);
  assert.equal(calculate({sp:0,downed:true},'ball'),0.77);
  assert.equal(calculate({sp:0,downed:false},'ball'),0.55);
});

test('preferred feeding shortens wild recovery and downed wildlife cannot breed', () => {
  assert.ok(gameScript.includes('c.recoverT=Math.max(0,(Number(c.recoverT)||0)-5)'));
  assert.ok(gameScript.includes('if(c.isJuvenile||c.held||c.downed||c.young'));
  assert.ok(gameScript.includes('o.isJuvenile||o.held||o.downed||o.young'));
});

test('melee attacks require a valid forward-facing hit arc and show hit confirmation', () => {
  for (const marker of ['function inWeaponArc(o,range,threshold)', 'inWeaponArc(o,5,0.25)', 'inWeaponArc(o,3.4,0.35)', 'burst(w.x,w.y+1.2,w.z,weapon.color,weapon.id===\'frostblade\'||weapon.id===\'emberblade\'?12:6)', 'dealt.toFixed(1)']) {
    assert.ok(gameScript.includes(marker), 'missing melee validation marker: ' + marker);
  }
});

test('Wraith variants have distinct resistance and vulnerability profiles', () => {
  for (const marker of ['damageTaken:0.68', 'damageTaken:1.3', 'damageTaken:profile.damageTaken', 'w.damageTaken||1']) {
    assert.ok(gameScript.includes(marker), 'missing enemy resistance marker: ' + marker);
  }
});


test('gamepad support maps sticks, camera, combat actions, and hotbar navigation', () => {
  for (const marker of ['function readGamepad(dt)', 'navigator.getGamepads()', 'gamepadMove.x=axis(0)', 'cam.yaw-=axis(2)', 'doGather()', 'startDodge()', 'doUse()', 'doCatch()', '+gamepadMove.x', '+gamepadMove.y']) {
    assert.ok(gameScript.includes(marker), 'missing gamepad marker: ' + marker);
  }
  assert.match(gameScript, /current\[12\].*hotSel/);
  assert.match(gameScript, /current\[13\].*hotSel/);
});


test('audio has separate persisted music/effects volumes and unlocks only after user input', () => {
  for (const marker of ['id="musicVolume"', 'id="effectsVolume"', 'mfwilds3d_audio_v1', 'function initAudio()', 'function playSfx(kind)', 'document.addEventListener(\'pointerdown\',initAudio,{once:true})', "playSfx('rain')", "playSfx('creature')", "playSfx('ui')"]) {
    assert.ok(html.includes(marker) || gameScript.includes(marker), 'missing audio marker: ' + marker);
  }
  assert.ok(gameScript.includes('low.start();high.start();'), 'procedural ambient tone should be started');
});


test('versioned save migration maps legacy 30-slot inventories into the 36-slot layout', () => {
  const start = gameScript.indexOf('function migrateInventorySlots(');
  const end = gameScript.indexOf('function load()', start);
  assert.ok(start >= 0 && end > start, 'inventory migration helper must exist');
  const source = gameScript.slice(start, end);
  const defs = { wood: { max: 50 }, ball: { max: 20 }, berry: { max: 20 } };
  const migrate = new Function('itemDefs', 'slotCount', 'hotbarCount', source + '; return migrateInventorySlots;')(defs, 36, 9);
  const old = Array.from({ length: 30 }, () => null);
  old[0] = { id: 'wood', n: 80 };
  old[6] = { id: 'cage', n: 3 };
  old[29] = { id: 'berry', n: 2 };
  const result = migrate(old, defs, 36, 9);
  assert.equal(result.length, 36);
  assert.deepEqual(result[0], { id: 'wood', n: 50 });
  assert.deepEqual(result[9], { id: 'ball', n: 3 });
  assert.deepEqual(result[32], { id: 'berry', n: 2 });
  assert.equal(result[33], null);
});

test('save migration safely filters invalid legacy items and stack quantities', () => {
  const start = gameScript.indexOf('function migrateInventorySlots(');
  const end = gameScript.indexOf('function load()', start);
  const source = gameScript.slice(start, end);
  const defs = { wood: { max: 50 }, ball: { max: 20 } };
  const migrate = new Function('itemDefs', 'slotCount', 'hotbarCount', source + '; return migrateInventorySlots;')(defs, 36, 9);
  const old = Array.from({ length: 36 }, () => null);
  old[0] = { id: 'unknown', n: 5 };
  old[1] = { id: 'wood', n: -2 };
  old[2] = { id: 'wood', n: '5' };
  old[3] = { id: 'wood', n: 4 };
  const result = migrate(old, defs, 36, 9);
  assert.equal(result[0], null);
  assert.equal(result[1], null);
  assert.equal(result[2], null);
  assert.deepEqual(result[3], { id: 'wood', n: 4 });
});

test('mobile touch layout and viewport regression safeguards are present', () => {
  assert.match(html, /name="viewport"[^>]*width=device-width/);
  assert.match(html, /touch-action:none/);
  assert.match(html, /id="joy"/);
  assert.match(html, /id="btns"/);
  assert.match(html, /@media\s*\(max-width:\s*380px\)/);
  assert.match(html, /@media\s*\(max-height:\s*650px\)/);
  assert.match(gameScript, /window\.addEventListener\('resize',resize\)/);
  assert.match(gameScript, /renderer\.setSize\(vw,vh,false\)/);
});

test('versioned save defaults and recovery paths remain compatible', () => {
  assert.match(gameScript, /version:6/);
  assert.match(gameScript, /P\.wetness=isFinite\(d\.P\.wetness\)/);
  assert.match(gameScript, /P\.oxygen=isFinite\(d\.P\.oxygen\)/);
  assert.match(gameScript, /SAVE_KEY\+'_backup'/);
  assert.match(gameScript, /validSave\(localStorage\.getItem\(OLD_KEY\)\)/);
});


test('touch combat aim assist gently aligns nearby targets inside a limited cone', () => {
  assert.ok(gameScript.includes('function applyTouchAimAssist(targets,range,cone)'));
  assert.ok(gameScript.includes('if(!isMobile)return false'));
  assert.ok(gameScript.includes('applyTouchAimAssist(wraiths,5,0.82)'));
  assert.ok(gameScript.includes('applyTouchAimAssist(wild,3.4,0.82)'));
});

test('tool tiers change resource gathering cooldowns as well as mining damage', () => {
  assert.ok(gameScript.includes("P.cool=pickLevel===3?0.30:(pickLevel===2?0.38:(pickLevel===1?0.46:0.55))"));
  assert.ok(gameScript.includes("if(r.type==='tree'&&axe)P.cool=0.34"));
  assert.ok(gameScript.includes("Math.max(1,pickLevel)"));
});


test('sound captions are accessible, configurable, persisted, and independent of audio playback', () => {
  assert.match(html, /id="subtitleLine" role="status" aria-live="polite"/);
  assert.match(html, /id="subtitlesToggle"/);
  assert.ok(gameScript.includes("subtitles:true"));
  assert.ok(gameScript.includes("typeof savedAudio.subtitles==='boolean'"));
  assert.ok(gameScript.includes("function showSoundCaption(kind)"));
  assert.ok(gameScript.includes("showSoundCaption(kind);"));
  assert.ok(gameScript.includes("saveAudioPrefs();"));
});


test('sound captions have persisted English and Urdu localization tables', () => {
  assert.match(html, /id="captionLanguage"/);
  assert.match(html, /id="subtitleLine"/);
  for (const marker of ["captionLanguage:'en'", "savedAudio.captionLanguage==='ur'", 'captions={en:', 'ur:{gather:', "audioPrefs.captionLanguage=this.value==='ur'?'ur':'en'"]) {
    assert.ok(gameScript.includes(marker), 'missing caption localization marker: ' + marker);
  }
});

test('floating combat text has a hard DOM-node cap and safe removal', () => {
  assert.ok(gameScript.includes('if(floats.length>=60)'));
  assert.ok(gameScript.includes('oldest.el.parentNode.removeChild(oldest.el)'));
  assert.ok(gameScript.includes('if(f.el.parentNode)f.el.parentNode.removeChild(f.el)'));
});

test('streamed instance matrices only mark changed mesh buffers dirty', () => {
  assert.ok(gameScript.includes('var meshChanged=false,im=streamedMeshes[m]'));
  assert.ok(gameScript.includes('if(meshChanged)im.instanceMatrix.needsUpdate=true'));
});


test('swimming adjusts third-person camera framing and enables underwater visual feedback', () => {
  assert.match(html, /id="underwaterTint"/);
  assert.ok(gameScript.includes('var underwater=!!P.swimming'));
  assert.ok(gameScript.includes('underwater?1.25:1.7'));
  assert.ok(gameScript.includes('underwater?Math.min(cam.dist,7.2):cam.dist'));
  assert.ok(gameScript.includes("tint.classList.toggle('active',underwater)"));
});


test('three outfit save slots persist and restore validated appearance selections', () => {
  for (const id of ['outfitSlot', 'saveOutfitSlot', 'loadOutfitSlot']) assert.match(html, new RegExp('id="' + id + '"'));
  for (const marker of ['mfwilds3d_outfit_slots_v1', 'function readCurrentOutfit()', 'function validSelectValue(', 'function normalizeOutfitRecord(look)', 'function normalizeOutfitSlots(value)', 'function readOutfitSlots()', 'writePreferenceObject(OUTFIT_SLOTS_KEY,all,4096)', "$(id).dispatchEvent(new Event('change'))", "applyCharacterStyle(look.character)"]) {
    assert.ok(gameScript.includes(marker), 'missing outfit-slot marker: ' + marker);
  }
});

test('character appearance is restored from validated global profile storage when a world loads', () => {
  assert.ok(gameScript.includes('function restoreCharacterAppearance()'));
  assert.match(gameScript, /restoreCharacterAppearance\(\);/);
  assert.ok(gameScript.includes("readAppearanceChoice('mfwilds3d_skin','skinTone','0xc98f68')"));
  assert.ok(gameScript.includes("readAppearanceChoice('mfwilds3d_outfit','outfitColor','0x527b70')"));
  assert.ok(gameScript.includes("function readAppearanceChoice(key,id,fallback)"));
  assert.ok(gameScript.includes("readPreferenceChoice(key,24,function(value){return validSelectValue(id,value);},fallback)"));
});


test('Night Herald boss has three escalating combat phases, a health HUD, and persistent defeat reward', () => {
  for (const id of ['bossStatus', 'bossPhase', 'bossHealth']) assert.match(html, new RegExp('id="' + id + '"'));
  for (const marker of ['bossDefeated:bossDefeated', 'nights>=7&&nightF>0.72&&!bossDefeated', "kind:'harbinger'", 'hp>40?1:(s.hp>18?2:3)', 's.phase===3?0.28:0.52', "gain('crystal',12", 'bossDefeated=d.bossDefeated===true']) {
    assert.ok(gameScript.includes(marker), 'missing boss encounter marker: ' + marker);
  }
});


test('tool tiers have different mining cooldowns and resource damage values', () => {
  assert.ok(gameScript.includes("P.cool=pickLevel===3?0.30:(pickLevel===2?0.38:(pickLevel===1?0.46:0.55))"));
  assert.ok(gameScript.includes("var dmg=(r.type==='tree'&&axe)?2:((r.type==='rock'||r.type==='ore')?Math.max(1,pickLevel):1)"));
});


test('tools and weapons have saved durability, wear on use, and can be repaired with materials', () => {
  assert.match(html, /id="repairTool"/);
  for (const marker of ['var TOOL_MAX={axe:80,pick:90,copperpick:140,ironpick:220', 'function toolDurabilityNow(id)', 'function wearTool(id,amount)', 'function repairSelectedTool()', 'toolDurability:toolDurability', "wearTool('axe',1)", "toolDurability[id]=max"]) {
    assert.ok(gameScript.includes(marker), 'missing durability marker: ' + marker);
  }
});


test('storm weather adds variable wind and timed lightning flashes', () => {
  assert.match(html, /id="lightningFlash"/);
  for (const marker of ['stormLevel=clamp((rainLevel-0.38)*2.1,0,1)', 'rainWindX=0.72+Math.sin(clock*0.13)*stormLevel*(snowing?1.2:2.6)', 'lightningCooldown=10+random()*18', 'lightningFlashTime=0.16+random()*0.12', "flash.style.opacity=lightningFlashTime>0"]) {
    assert.ok(gameScript.includes(marker), 'missing storm marker: ' + marker);
  }
});

test('season cycle changes environmental temperature, water palette, and HUD season label', () => {
  assert.ok(gameScript.includes('function seasonInfo()'));
  assert.ok(gameScript.includes('temperature:-0.24'));
  assert.ok(gameScript.includes('seasonInfo().temperature'));
  assert.ok(gameScript.includes('var SEASONS=['));
  assert.ok(gameScript.includes('return SEASONS[index]||SEASONS[0]'));
  assert.ok(gameScript.includes('var season=seasonInfo()||SEASONS[0]'));
  assert.ok(gameScript.includes('Number.isFinite(season.water)?season.water:SEASONS[0].water'));
  assert.ok(gameScript.includes('if(water&&water.material&&water.material.color)'));
  assert.ok(gameScript.includes("+' · '+seasonInfo().name"));
});


test('rare fallen-star event spawns after three nights, grants rewards once, and persists its claim', () => {
  for (const marker of ['function spawnRareEvent()', "new THREE.IcosahedronGeometry(0.62,1)", "say('A fallen star has landed nearby.", "rareEventClaimed=true", "gain('crystal',8", "gain('goldOre',3", 'rareEventClaimed:rareEventClaimed', 'rareEventClaimed=d.rareEventClaimed===true']) {
    assert.ok(gameScript.includes(marker), 'missing rare event marker: ' + marker);
  }
});


test('character customization has a persisted preview turntable, light, and animation selector', () => {
  for (const id of ['previewTurntable', 'previewLighting', 'previewAnimation']) assert.match(html, new RegExp('id="' + id + '"'));
  for (const marker of ['mfwilds3d_preview_v1', 'function updateCharacterPreview(dt)', 'cam.yaw+=0.004', 'playerPreviewLight.visible=previewActive&&previewPrefs.lighting', "previewPrefs.animation=['idle','walk','attack'].indexOf(this.value)>=0?this.value:'idle'", "mode==='walk'", "mode==='attack'"]) {
    assert.ok(gameScript.includes(marker), 'missing character preview marker: ' + marker);
  }
});


test('character customization exposes independent head, torso, leg, and accessory appearance controls', () => {
  for (const id of ['skinTone', 'outfitColor', 'legsColor', 'accessoryColor']) assert.match(html, new RegExp('id="' + id + '"'));
  for (const marker of ['legCloth=stdMat(0x314a40,0.92)', 'legs:legCloth', "mfwilds3d_legs", "mfwilds3d_accessory", 'm.legs.color.set(lc)', 'm.leather.color.set(ac)']) {
    assert.ok(gameScript.includes(marker), 'missing separated appearance slot marker: ' + marker);
  }
});


test('achievement rewards unlock cosmetics and persist the unlocked reward IDs', () => {
  assert.match(html, /id="cosmeticUnlockStatus"/);
  for (const marker of ["id:'aurora_hair',achievement:'three_nights'", "id:'wraith_violet',achievement:'wraith_slayer'", "id:'pathfinder_gold',achievement:'pathfinder'", 'function refreshCosmeticUnlocks()', 'option.disabled=achievementIds.indexOf(option.getAttribute(\'data-unlock\'))<0', 'cosmeticUnlockIds:cosmeticUnlockIds', 'cosmeticUnlockIds=Array.isArray(d.cosmeticUnlockIds)?d.cosmeticUnlockIds.filter']) {
    assert.ok(gameScript.includes(marker), 'missing cosmetic unlock marker: ' + marker);
  }
});


test('transient particle counts are bounded and unique capture projectiles release GPU resources', () => {
  assert.ok(gameScript.includes('while(sparks.length+n>500)'));
  assert.ok(gameScript.includes('function disposeObject3D(root)'));
  assert.ok(gameScript.includes('disposeObject3D(sh.m)'));
  assert.ok(gameScript.includes('floats.length>=60'));
});


test('doors and gates open/close with collision changes and roofs are buildable and saved', () => {
  for (const id of ['door', 'gate', 'roof']) assert.ok(gameScript.includes(id+':{wood:') || gameScript.includes(id+':{stone:'));
  for (const marker of ['function makeDoor()', 'function makeGate()', 'function makeRoof()', "w.t==='door'||w.t==='gate'", 'nearbyEntry.open=!nearbyEntry.open', 'open:!!w.open', "w.open&&(kind==='door'||kind==='gate')", 'door:[new THREE.BoxGeometry']) {
    assert.ok(gameScript.includes(marker), 'missing building piece marker: ' + marker);
  }
});


test('workbench and cooking pot are craftable, placeable, and usable stations', () => {
  for (const id of ['workbench', 'cookpot']) assert.ok(gameScript.includes(id+':{'));
  for (const marker of ['function makeWorkbench()', 'function makeCookpot()', "w.t==='workbench'||w.t==='cookpot'", "nearbyStation.t==='workbench'", "craft('jam',1)", "workbench:{wood:8,stone:3}", "cookpot:{stone:6,ironbar:1}"]) assert.ok(gameScript.includes(marker), 'missing station marker: '+marker);
});

test('roof support and world structure-count limits are validated before placement and loading', () => {
  assert.ok(gameScript.includes("id==='roof'&&!walls.some"));
  assert.ok(gameScript.includes('walls.length+fires.length+beds.length+chests.length>=120'));
  assert.ok(gameScript.includes('function validStructureCounts(parsed)'));
});

test('base comfort and protection ratings respond to nearby structures', () => {
  assert.match(html, /id="baseRating"/);
  assert.ok(gameScript.includes('function baseRatings()'));
  assert.ok(gameScript.includes("if(w.t==='roof')comfort+=4"));
  assert.ok(gameScript.includes("if(w.t==='stone'||w.t==='wall')protection"));
});


test('nearby base pieces can be upgraded from wood to stone and dismantled with refunds', () => {
  for (const id of ['baseActions', 'upgradeBasePiece', 'dismantleBasePiece']) assert.match(html, new RegExp('id="' + id + '"'));
  for (const marker of ['function upgradeNearbyBasePiece()', 'takeItem(\'stone\',4)', "w.t='stone'", 'function dismantleNearbyBasePiece()', 'walls.splice(idx,1)', "var refunds={wall:['wood',1]"]) assert.ok(gameScript.includes(marker), 'missing base interaction marker: '+marker);
});


test('interface localization uses persisted English and Urdu text tables for core UI labels', () => {
  assert.match(html, /id="gameLanguage"/);
  for (const marker of ["mfwilds3d_language_v1", 'var GAME_TEXT={', "ur:{play:'منتخب دنیا کھیلیں'", 'function gameText(key)', 'function applyGameLanguage()', 'writePreferenceString(GAME_LANGUAGE_KEY,gameLanguage,2)']) {
    assert.ok(gameScript.includes(marker), 'missing localization marker: '+marker);
  }
  assert.ok(gameScript.includes("gameText('baseComfort')"));
});


test('cave entrance and underground chamber support entry, bounded movement, lighting, and exit', () => {
  assert.match(html, /id="cavePrompt"/);
  assert.match(html, /id="caveAction"/);
  for (const marker of ['function addCaveEntrance(x,z)', 'function enterCave(cave)', 'function exitCave()', 'var initialCave=addCaveEntrance(-52,42)', 'caveMode&&activeCave?activeCave.floorY', "if(caveMode&&activeCave){P.x=clamp", "new THREE.PointLight(0x3ecde8"]) {
    assert.ok(gameScript.includes(marker), 'missing cave system marker: '+marker);
  }
});


test('river channels and ponds are connected to swimming, oxygen, and surface-water behavior', () => {
  for (const marker of ['var riverPaths=[', 'function buildRiver(points)', 'function buildPond(x,z,radius)', 'function riverDepthAt(x,z)', 'riverPaths.forEach(buildRiver)', 'buildPond(34,18,4.2)', 'waterSurface=riverDepth>0?groundY+0.3:WATER', 'waterColumn=caveMode?0:Math.max(0,waterSurface-groundY)', 'updateRivers();']) {
    assert.ok(gameScript.includes(marker), 'missing river system marker: '+marker);
  }
});


test('long-session save migration and world-streaming stress loops remain bounded and deterministic', () => {
  const migrationStart = gameScript.indexOf('function migrateInventorySlots(');
  const migrationEnd = gameScript.indexOf('\nfunction load()', migrationStart);
  assert.ok(migrationStart >= 0 && migrationEnd > migrationStart);
  const migrate = new Function(gameScript.slice(migrationStart, migrationEnd) + ';return migrateInventorySlots;')();
  const itemDefs = {wood:{max:50},ball:{max:20},stone:{max:50}};
  let slots = Array.from({length:36}, (_,i) => i===0?{id:'wood',n:50}:null);
  for (let i=0;i<2000;i++) {
    const snapshot = JSON.parse(JSON.stringify({version:5,slots,clock:i*10,structures:[]}));
    slots = migrate(snapshot.slots,itemDefs,36,9);
    assert.equal(slots.length,36);
    assert.equal(slots[0].id,'wood');
    assert.equal(slots[0].n,50);
  }
  const streamStart=gameScript.indexOf('function streamChunkActive(');
  const streamEnd=gameScript.indexOf('\nfunction updateWorldStreaming',streamStart);
  assert.ok(streamStart>=0&&streamEnd>streamStart);
  const active=new Function(gameScript.slice(streamStart,streamEnd)+';return streamChunkActive;')();
  let visible=0;
  for(let i=0;i<5000;i++){
    const px=Math.sin(i*0.013)*145,pz=Math.cos(i*0.017)*145;
    for(let j=0;j<12;j++)if(active((j-6)*32,(j%5-2)*32,px,pz,85,32))visible++;
  }
  assert.ok(visible>0);
  assert.ok(gameScript.includes('var meshChanged=false,im=streamedMeshes[m]'));
});


test('browser compatibility preflight covers WebGL, animation-frame, audio, and gamepad fallbacks', () => {
  assert.match(html, /id="webglFallback"/);
  for (const marker of ["window.requestAnimationFrame!=='function'", 'window.webkitRequestAnimationFrame', "cv.getContext('webgl2')", "cv.getContext('webgl')", 'window.AudioContext||window.webkitAudioContext', 'navigator.getGamepads']) {
    assert.ok(gameScript.includes(marker), 'missing browser compatibility marker: '+marker);
  }
});


test('performance monitor records bounded frame samples and exports CPU/render submission metrics', () => {
  assert.match(html, /id="perfMonitorToggle"/);
  assert.match(html, /id="perfStatus"/);
  for (const marker of ['var perfMonitorEnabled=false,perfSamples=[]', 'function recordPerformance(frameMs,updateMs,renderMs)', 'if(perfSamples.length>120)perfSamples.shift()', 'p95FrameMs:', 'renderer.info.render.calls', 'renderer.info.render.triangles', 'performance:perfStats']) {
    assert.ok(gameScript.includes(marker), 'missing performance instrumentation marker: '+marker);
  }
});


test('device profiling runs for 30 seconds and exports real frame, update, render, and hardware samples', () => {
  assert.match(html, /id="runDeviceProfile"/);
  assert.match(html, /id="deviceProfileStatus"/);
  for (const marker of ['profileActive=false,profileFrames=[]', 'if(profileActive&&profileFrames.length<6000)', 'function finishDeviceProfile()', 'durationSeconds:30', 'averageFrameMs:', 'p95FrameMs:', 'averageUpdateMs:', 'averageRenderSubmitMs:', 'logicalCores:navigator.hardwareConcurrency', "link.download='wildearth-device-profile-'", 'setTimeout(finishDeviceProfile,30000)']) {
    assert.ok(gameScript.includes(marker), 'missing device profile marker: '+marker);
  }
});


test('low-end Chromebook hardware receives a lighter default rendering workload', () => {
  assert.ok(gameScript.includes('var hardwareCores=Number(navigator.hardwareConcurrency)||0'));
  assert.ok(gameScript.includes('var isLowEnd=isMobile||(hardwareCores>0&&hardwareCores<=4)||(deviceMemoryGB>0&&deviceMemoryGB<=4)'));
  assert.ok(gameScript.includes('antialias:!isLowEnd'));
  assert.ok(gameScript.includes('var renderLevel=isLowEnd?0:1'));
  assert.ok(gameScript.includes('var cnt=isLowEnd?2600:(isMobile?3500:7000)'));
});

test('loaded and backed-up saves enforce the global 120-piece structure limit', () => {
  const start = gameScript.indexOf('function validStructureCounts(');
  const end = gameScript.indexOf('function save()', start);
  assert.ok(start >= 0 && end > start, 'shared structure validator must exist');
  const validator = new Function('SPECIES','HALF','NSLOTS','RESERVE_PARTY_LIMIT','TOTAL_PARTY_LIMIT',gameScript.slice(start, end) + ';return validStructureCounts;')([{id:0}],300,36,20,32);
  assert.equal(validator({walls:Array(120).fill({x:0,z:0,t:'wall'}),fires:[],beds:[],chests:[]}), true);
  assert.equal(validator({walls:Array(100).fill({x:0,z:0,t:'wall'}),fires:Array(21).fill({x:0,z:0,t:'fire'})}), false);
  assert.equal(validator({walls:Array(121).fill({x:0,z:0,t:'wall'})}), false);
  assert.equal(validator({walls:'corrupt'}), false);
  assert.ok(gameScript.includes('validStructureCounts(parsed)'));
  assert.match(gameScript, /validSave\(previous\)/);
  assert.ok(gameScript.includes('function inspectSave(raw)'));
});


test('cloud project validation accepts every editor object type and rejects unsafe IDs or malformed data', () => {
  const start = projectApi.indexOf('function validId(');
  const end = projectApi.indexOf('export async function onRequestGet', start);
  assert.ok(start >= 0 && end > start, 'cloud project validators must exist');
  const validators = new Function(projectApi.slice(start, end) + ';return {validId,validProject};')();
  const project = {
    id:'project-1', name:'Test Project', genre:'adventure', currentSceneId:'scene-1',
    scenes:[{id:'scene-1',name:'Main',objects:[
      {id:'hazard-1',kind:'Hazard',name:'Hazard',x:20,y:30,width:36,height:36,visible:true,collisionEnabled:true,collisionMode:'trigger'},
      {id:'decoration-1',kind:'Decoration',name:'Decoration',x:40,y:50,width:42,height:42,visible:true,collisionEnabled:false,collisionMode:'trigger'}
    ]}]
  };
  assert.equal(validators.validProject(project), true);
  const unsafe = structuredClone(project);
  unsafe.scenes[0].objects[0].id = 'x" onmouseover="alert(1)';
  assert.equal(validators.validProject(unsafe), false);
  const invalidBounds = structuredClone(project);
  invalidBounds.scenes[0].objects[0].x = 999;
  assert.equal(validators.validProject(invalidBounds), false);
  const invalidScene = structuredClone(project);
  invalidScene.currentSceneId = 'missing';
  assert.equal(validators.validProject(invalidScene), false);
  const duplicateIds = structuredClone(project);
  duplicateIds.scenes[0].objects[1].id = duplicateIds.scenes[0].objects[0].id;
  assert.equal(validators.validProject(duplicateIds), false);
  assert.ok(projectApi.includes('return validProject(project) ? [project] : []'));
});


test('performance optimizations throttle water animation and avoid redundant world-stream scans', () => {
  assert.ok(gameScript.includes('var riverUpdateAccumulator=0'));
  assert.ok(gameScript.includes('if(riverUpdateAccumulator>=1/12){updateRivers();riverUpdateAccumulator%=1/12;}'));
  assert.ok(gameScript.includes('lastStreamX=NaN,lastStreamZ=NaN,lastStreamRadius=0'));
  assert.ok(gameScript.includes('dxPlayer*dxPlayer+dzPlayer*dzPlayer<64'));
  assert.ok(gameScript.includes('lastStreamX=P.x;lastStreamZ=P.z;lastStreamRadius=radius;streamDirty=false'));
});

test('low-end graphics retain a 512px player-centered shadow map for depth without detail-shadow workload', () => {
  assert.ok(gameScript.includes("sun.shadow.mapSize.set(isMobile?512:1024,isMobile?512:1024)"));
  assert.ok(gameScript.includes("sun.shadow.camera.left=-38;sun.shadow.camera.right=38;sun.shadow.camera.top=38;sun.shadow.camera.bottom=-38"));
  assert.ok(gameScript.includes("sun.shadow.camera.near=5;sun.shadow.camera.far=130"));
  assert.ok(gameScript.includes("{name:'Low',shadows:true,detailShadows:false,fogFar:195"));
  assert.ok(gameScript.includes("var shadowSize=renderLevel===2?((isMobile||isLowEnd)?1024:2048):((isMobile||isLowEnd)?512:1024)"));
});

test('low and balanced graphics reduce environmental shadow workload without changing resolution', () => {
  assert.ok(gameScript.includes("{name:'Low',shadows:true,detailShadows:false,fogFar:195"));
  assert.ok(gameScript.includes("{name:'Balanced',shadows:true,detailShadows:false"));
  assert.ok(gameScript.includes("{name:'High',shadows:true,detailShadows:true"));
  assert.ok(gameScript.includes('detailShadowMeshes.push(im)'));
  assert.ok(gameScript.includes('detailShadowMeshes.push(stumpIM)'));
  assert.ok(gameScript.includes('detailShadowMeshes[di].castShadow=profile.detailShadows'));
  assert.ok(gameScript.includes('renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,isLowEnd?1.15:1.75))'));
});


test('night firefly simulation updates at a capped cadence instead of every rendered frame', () => {
  assert.ok(gameScript.includes('fireflyUpdateAccumulator=0'));
  assert.ok(gameScript.includes('fireflyUpdateAccumulator>=1/15'));
  assert.ok(gameScript.includes('fireflyUpdateAccumulator%=1/15'));
  assert.ok(gameScript.includes('ffGeo.attributes.position.needsUpdate=true'));
});


test('game uses one animation-frame scheduler so menu actions cannot create duplicate game loops', () => {
  const directFrameCalls = gameScript.match(/requestAnimationFrame\(frame\)/g) || [];
  assert.equal(directFrameCalls.length, 1, 'only the scheduler may request the frame callback');
  assert.match(gameScript, /var last=performance\.now\(\),pageActive=true,frameScheduled=false/);
  assert.match(gameScript, /function scheduleFrame\(\)\{if\(pageActive&&!frameScheduled\)/);
  assert.match(gameScript, /frameScheduled=false;\s*if\(!pageActive\)return/);
  assert.match(gameScript, /else\{last=performance\.now\(\);scheduleFrame\(\);\}/);
  assert.match(gameScript, /if\(pageActive\)\{last=performance\.now\(\);scheduleFrame\(\);\}/);
});

test('expanded 600m world includes woodland, desert, gravel, beach, ocean and forest biomes', () => {
  assert.ok(gameScript.includes('var WORLD=600,HALF=WORLD/2'));
  for (const id of ["id:'woodland'","id:'forest'","id:'desert'","id:'gravel'","id:'sand'","id:'ocean'"]) {
    assert.ok(gameScript.includes(id), 'missing expanded biome: '+id);
  }
  assert.ok(gameScript.includes("if(elevation<WATER+0.35)return BIOMES[9]"));
  assert.ok(gameScript.includes("if(elevation<WATER+2.1)return BIOMES[8]"));
});

test('2D minimap and full top-down map render terrain colors and a directional player marker', () => {
  for (const id of ['miniMap','mapCanvas']) assert.match(html,new RegExp('id="'+id+'"'));
  for (const marker of ['function renderMiniMap()','function renderWorldMap()','function biomeMapColor(x,z)','function drawPlayerArrow(ctx,x,y,size,angle)','var MAP_CELLS=60','ctx.fillStyle=seen[idx]?biomeMapColor(x,z)']) {
    assert.ok(gameScript.includes(marker),'missing 2D map feature: '+marker);
  }
  assert.ok(html.includes('WORLD MAP · 600 × 600 M'));
  assert.ok(html.includes('#miniMapWrap'));
});

test('expanded map exploration migrates old 30x30 explored cells without re-migrating new saves', () => {
  assert.ok(gameScript.includes('mapVersion:2'));
  assert.ok(gameScript.includes('a>=0&&a<3600'));
  assert.ok(gameScript.includes('d.mapVersion!==2'));
  assert.ok(gameScript.includes('return mapCellFor(wx,wz)'));
});

test('new tundra, jungle, savanna and volcanic biomes have distinct terrain and habitat rules', () => {
  for (const id of ["id:'tundra'","id:'jungle'","id:'savanna'","id:'volcanic'"]) {
    assert.ok(gameScript.includes(id), 'missing biome '+id);
  }
  for (const rule of [
    "if(heat<0.24)return BIOMES[10]",
    "if(heat>0.68&&moisture>0.62)return BIOMES[11]",
    "if(heat>0.62&&moisture>0.3&&moisture<0.58)return BIOMES[12]",
    "return BIOMES[13]",
    "biome.id==='volcanic'",
    "biome.id==='jungle'",
    "biome.id==='savanna'",
    "biome.id==='tundra'"
  ]) assert.ok(gameScript.includes(rule), 'missing biome generation or visual rule '+rule);
});

test('new survival recipes are listed, craftable at the bench, and have working item effects', () => {
  for (const id of ['berrypie','heartymeal','strongsalve']) {
    assert.ok(gameScript.includes(id+':{') || gameScript.includes(id+':{'), 'missing recipe '+id);
    assert.ok(gameScript.includes(id+':1'), 'missing output count '+id);
    assert.ok(gameScript.includes(id+':'), 'missing item definition '+id);
    assert.ok(gameScript.includes("['Survival',['salve','strongsalve','tonic','jam','berrypie','heartymeal','torch']]"));
  }
  assert.ok(gameScript.includes("P.food=Math.min(100,P.food+70)"));
  assert.ok(gameScript.includes("P.food=Math.min(100,P.food+48);P.hp=Math.min(P.maxHp||100,P.hp+22)"));
  assert.ok(gameScript.includes("P.hp=Math.min(P.maxHp||100,P.hp+75)"));
  assert.ok(gameScript.includes("strongsalve:{salve:2,crystal:1,fiber:2}"));
  assert.ok(gameScript.includes("berrypie:{berry:4,jam:1,fiber:1}"));
  assert.ok(gameScript.includes("heartymeal:{berry:3,jam:1,wood:1}"));
});

test('each hostile mob drops its own guaranteed signature loot, including the Night Herald boss', () => {
  const start=gameScript.indexOf('function dropWraithLoot(');
  const end=gameScript.indexOf('function slotHtml(',start);
  assert.ok(start>=0&&end>start,'mob loot table must be defined');
  const cases=[
    [{kind:'shade',x:0,y:0,z:0},'wraithEssence'],
    [{kind:'stalker',x:0,y:0,z:0},'shadowFang'],
    [{kind:'brute',x:0,y:0,z:0},'bruteHeart'],
    [{kind:'harbinger',boss:true,x:0,y:0,z:0},'heraldSigil']
  ];
  for(const [mob,expected] of cases){
    const drops=[];
    const fn=new Function('gain','random',gameScript.slice(start,end)+';return dropWraithLoot;')((id,n)=>drops.push({id,n}),()=>0);
    fn(mob);
    assert.ok(drops.some(d=>d.id===expected),'missing signature loot '+expected);
  }
  for(const id of ['wraithEssence','shadowFang','bruteHeart','heraldSigil'])assert.ok(gameScript.includes(id+':{n:'),'missing inventory item '+id);
  assert.ok(gameScript.includes('dropWraithLoot(s)'));
  assert.ok(gameScript.includes("gain('crystal',12,s.x,s.y+2.6,s.z"));
  assert.ok(gameScript.includes("gain('goldOre',6,s.x,s.y+2.2,s.z"));
});

test('mob signature drops unlock legendary Nightfall Blade and Wraithguard recipes with real combat bonuses', () => {
  const recipesStart=gameScript.indexOf('var RECIPES=');
  const recipesEnd=gameScript.indexOf('var OUT=',recipesStart);
  const recipes=gameScript.slice(recipesStart,recipesEnd);
  assert.ok(recipes.includes("heraldblade:{ironbar:2,shadowFang:2,wraithEssence:2,heraldSigil:1}"));
  assert.ok(recipes.includes("wraithguard:{ironbar:3,bruteHeart:2,wraithEssence:2,heraldSigil:1}"));
  for(const id of ['heraldblade','wraithguard']){
    assert.ok(gameScript.includes(id+":{n:'"),'missing item '+id);
    assert.ok(gameScript.includes(id+":'<svg"),'missing icon '+id);
    assert.ok(gameScript.includes(id+':1'),'missing output '+id);
  }
  assert.ok(gameScript.includes("id:'heraldblade',damage:6,bonus:powerBonus"));
  assert.ok(gameScript.includes("wraithguard:0.28"));
  assert.ok(gameScript.includes("'wraithguard','frostarmor','emberarmor'].indexOf(d.equippedArmor)>=0"));
  assert.ok(gameScript.includes("id!=='wraithguard'"));
  assert.ok(gameScript.includes('wearTool(weapon.id,1)'));
  assert.ok(gameScript.includes("id==='heraldblade'||id==='frostblade'||id==='emberblade'?'ironbar'"),'elemental blades must use iron ingots for repairs');
  assert.ok(gameScript.includes('heraldblade:320'));
  assert.ok(gameScript.includes("id==='ironpick'||id==='ironsword'||id==='heraldblade'||id==='frostblade'||id==='emberblade'?'ironbar'"));
  assert.ok(gameScript.includes("wraithguard:'Wraithguard'"));
});


test('Frost Reavers and Ember Wisps have distinct combat profiles and visual identities', () => {
  const paletteStart=gameScript.indexOf('function makeWraith(kind){');
  const paletteEnd=gameScript.indexOf('/* ---------- structures ---------- */',paletteStart);
  const palette=gameScript.slice(paletteStart,paletteEnd);
  assert.ok(palette.includes('frostreaver:{'));
  assert.ok(palette.includes('emberwisp:{'));
  assert.ok(gameScript.includes("kind==='frostreaver'"));
  assert.ok(gameScript.includes("kind==='emberwisp'"));
  assert.ok(gameScript.includes("kind='frostreaver'"));
  assert.ok(gameScript.includes("kind='emberwisp'"));
});

test('Frost and ember attacks apply short status effects that affect movement and health', () => {
  assert.ok(gameScript.includes('var frostSlowTimer=0,emberBurnTimer=0,emberBurnTick=0'));
  assert.ok(gameScript.includes('function applyWraithStatus(mob){'));
  assert.ok(gameScript.includes("mob.kind==='frostreaver'"));
  assert.ok(gameScript.includes("mob.kind==='emberwisp'"));
  assert.ok(gameScript.includes("frostSlowTimer=Math.max(frostSlowTimer,2.4*(equippedArmor==='frostarmor'?0.35:1))"));
  assert.ok(gameScript.includes("emberBurnTimer=Math.max(emberBurnTimer,3.2*(equippedArmor==='emberarmor'?0.35:1))"));
  assert.ok(gameScript.includes('frostSlowTimer>0?0.58:1'));
  assert.ok(gameScript.includes('emberBurnTimer>0'));
  assert.ok(gameScript.includes("playerDamage(1.1,'Burning')"));
  assert.ok(gameScript.includes('applyWraithStatus(s)'));
});

test('new wraith types drop their signature materials and existing wraiths can drop rare variants', () => {
  const start=gameScript.indexOf('function dropWraithLoot(');
  const end=gameScript.indexOf('function slotHtml(',start);
  const loot=gameScript.slice(start,end);
  assert.ok(loot.includes("mob.kind==='frostreaver'"));
  assert.ok(loot.includes("mob.kind==='emberwisp'"));
  assert.ok(loot.includes("gain('frostShard'"));
  assert.ok(loot.includes("gain('emberCore'"));
  assert.ok(loot.includes('rareRoll<0.14'));
  for(const id of ['frostShard','emberCore']) {
    assert.ok(gameScript.includes(id+':{n:'));
    assert.ok(gameScript.includes(id+':\'<svg'));
    assert.ok(gameScript.includes(id+':'));
  }
  assert.ok(gameScript.includes("['Relics',['wraithEssence','shadowFang','bruteHeart','heraldSigil','frostShard','emberCore']]"));
});


test('swimming starts only when the water reaches the player head and shallow water remains wadeable', () => {
  const start=gameScript.indexOf('var SWIM_HEAD_CLEARANCE=');
  const end=gameScript.indexOf('var P={',start);
  assert.ok(start>=0&&end>start,'head-submersion helpers must be defined');
  const helpers=new Function(gameScript.slice(start,end)+';return {isHeadSubmerged,swimFloatHeight};')();
  assert.equal(helpers.isHeadSubmerged(-1.2,-4,false),true,'deep water should submerge the head');
  assert.equal(helpers.isHeadSubmerged(-1.2,-2,false),false,'waist/chest-depth water should not trigger swimming');
  assert.equal(helpers.isHeadSubmerged(0.3,0,false),false,'shallow rivers should remain wadeable');
  assert.equal(helpers.isHeadSubmerged(-1.2,-3.1,false),false,'head must reach the water before swimming');
  assert.equal(helpers.isHeadSubmerged(-1.2,-3.1,true),true,'swimming should have a small exit hysteresis');
  assert.equal(helpers.isHeadSubmerged(-1.2,-2.9,true),false,'swimming should end when leaving deep water');
  assert.ok(Math.abs(helpers.swimFloatHeight(2)-(-0.28))<1e-9,'float target should keep the head at the water surface');
});

test('underwater tint follows head-submersion swimming state and swim animation has a dedicated stroke', () => {
  assert.ok(gameScript.includes('var underwater=!!P.swimming'));
  assert.ok(gameScript.includes('player.legL.rotation.x=0.62+Math.sin(phase*1.7)*0.22'));
  assert.ok(gameScript.includes('player.armL.rotation.x=-1.05+Math.sin(phase)*0.38'));
  assert.ok(gameScript.includes('P.y+=(swimFloatHeight(waterSurface)-P.y)*Math.min(1,dt*4.2)'));
  assert.ok(gameScript.includes('else if(!caveMode&&waterColumn>0.35)P.wetness=Math.min(100,P.wetness+dt*(P.swimming?18:5))'));
});

test('elemental weapon and armor recipes are registered, unique, and use mob relics', () => {
  for (const id of ['frostblade','emberblade','frostarmor','emberarmor']) {
    assert.ok(gameScript.includes(id+':{n:'), 'missing item definition: '+id);
    assert.ok(gameScript.includes(id+':\'<svg'), 'missing item icon: '+id);
    assert.ok(gameScript.includes(id+':1'), 'missing single-item output: '+id);
    assert.ok(gameScript.includes(id+':'), 'missing item metadata: '+id);
  }
  assert.ok(gameScript.includes("frostblade:{ironbar:2,frostShard:3,wraithEssence:1,crystalcore:1}"));
  assert.ok(gameScript.includes("emberblade:{ironbar:2,emberCore:3,bruteHeart:1,crystalcore:1}"));
  assert.ok(gameScript.includes("frostarmor:{ironbar:4,frostShard:3,crystalcore:1}"));
  assert.ok(gameScript.includes("emberarmor:{ironbar:4,emberCore:3,goldbar:1}"));
  assert.ok(gameScript.includes("'frostblade','emberblade'"));
  assert.ok(gameScript.includes("'frostarmor','emberarmor'"));
  assert.ok(gameScript.includes("frostblade:360,emberblade:350"));
  assert.ok(gameScript.includes("frostarmor','emberarmor'].indexOf(d.equippedArmor)>=0"));
});

test('elemental weapons deal their own damage and armor reduces incoming damage', () => {
  const start=gameScript.indexOf('function activeElementalWeapon()');
  const end=gameScript.indexOf('function doGather()',start);
  assert.ok(start>=0&&end>start,'elemental combat helpers must exist');
  const helpers=new Function(gameScript.slice(start,end)+';return {activeElementalWeapon,armorDamageMultiplier};')();
  assert.equal(helpers.armorDamageMultiplier(null),1,'no armor should leave damage unchanged');
  assert.equal(helpers.armorDamageMultiplier('frostarmor'),0.68,'Frostguard should reduce incoming damage by 32%');
  assert.equal(helpers.armorDamageMultiplier('emberarmor'),0.62,'Emberplate should reduce incoming damage by 38%');
  assert.equal(helpers.armorDamageMultiplier('copperarmor'),0.7,'existing Copper Armor protection must remain intact');
  assert.equal(helpers.armorDamageMultiplier('ironarmor'),0.42,'existing Iron Armor protection must remain intact');
  assert.equal(helpers.armorDamageMultiplier('wraithguard'),0.28,'existing Wraithguard protection must remain intact');
  assert.ok(gameScript.includes('weaponLevel+weapon.bonus'));
  assert.ok(gameScript.includes('preyWeapon.damage*7+preyWeapon.bonus*4'));
  assert.ok(gameScript.includes('amount*difficultyScale()*armorDamageMultiplier(equippedArmor)'));
  assert.ok(gameScript.includes("w.frostTimer=Math.max(w.frostTimer||0,2.8)"),'Frostfang should slow hostile enemies');
  assert.ok(gameScript.includes("w.burnTimer=Math.max(w.burnTimer||0,3.2)"),'Emberbrand should burn hostile enemies');
  assert.ok(gameScript.includes('s.frostTimer>0?0.62:1'),'frost status must reduce enemy movement');
  assert.ok(gameScript.includes('s.hp-=1.25'),'burn status must deal damage over time');
  assert.ok(gameScript.includes("equippedArmor==='frostarmor'?0.35:1"),'Frostguard should resist frost slow');
  assert.ok(gameScript.includes("equippedArmor==='emberarmor'?0.35:1"),'Emberplate should resist burn duration');
  assert.ok(!gameScript.includes('playerDamage(Math.min(18,(9+nights*0.65)*(s.damageScale||1))*armor'), 'wraith strike must not apply armor twice');
  assert.ok(gameScript.includes('function equipSelectedArmor()'));
  assert.ok(gameScript.includes("id!=='frostarmor'&&id!=='emberarmor'"));
});

test('desert expansion adds cactus resources and a discoverable sandstone castle', () => {
  assert.ok(gameScript.includes("id:'desert',name:'Sunscorched Desert'"));
  assert.ok(gameScript.includes('function buildCactus()'));
  assert.ok(gameScript.includes("scatter('cactus','bush'"));
  assert.ok(gameScript.includes("biomeAt(cx,cz).id!=='desert'"));
  assert.ok(gameScript.includes('function buildDesertCastle()'));
  assert.ok(gameScript.includes("id:'sunspire_castle',name:'Sunspire Desert Castle'"));
  assert.ok(gameScript.includes("'sunspire_castle'].indexOf(a)>=0"));
  assert.ok(gameScript.includes("awardXP(l.id==='sunspire_castle'?60:15"));
});

test('firefly count is reduced for mobile and desktop', () => {
  assert.ok(gameScript.includes('var FF=isMobile?18:32'));
  assert.ok(!gameScript.includes('var FF=isMobile?60:110'));
});

test('player levels, persists upgrades, and exposes a caught-creature index', () => {
  assert.ok(gameScript.includes('level:1,xp:0,statPoints:0,stats:{vitality:0,power:0,tamer:0}'));
  assert.ok(gameScript.includes('function awardXP(amount,reason)'));
  assert.ok(gameScript.includes('function upgradePlayerStat(stat)'));
  assert.ok(gameScript.includes("progress:{level:P.level,xp:P.xp,statPoints:P.statPoints,stats:P.stats,caught:catchIndex,discoveredSpecies:discoveredSpecies}"));
  assert.ok(gameScript.includes("awardXP(25+(SPECIES[sc.sp].r==='rare'?15"));
  assert.ok(gameScript.includes("data-stat-upgrade"));
  assert.ok(html.includes('id="creatureIndex"'));
  assert.ok(gameScript.includes("status=count>0?'CAUGHT ×'+count"));
  assert.ok(gameScript.includes("P.stats.tamer)||0)*0.025"));
  assert.ok(gameScript.includes("P.stats.power)||0)*0.75"));
});


test('craft menu safely excludes loot-only relics without recipes', () => {
  assert.ok(gameScript.includes("var craftable=c[1].filter(function(k){return RECIPES[k]&&typeof RECIPES[k]==='object';});if(!craftable.length)return;"));
  assert.ok(gameScript.includes("var r=RECIPES[k];var cost=Object.keys(r).map(function(i){return r[i]+' '+(ITEMS[i]?ITEMS[i].n:i).toLowerCase()}).join(', ');"));
  assert.ok(gameScript.includes("!k||!RECIPES[k]||typeof RECIPES[k]!=='object'"));
  for (const id of ['wraithEssence','shadowFang','bruteHeart','heraldSigil','frostShard','emberCore']) {
    assert.match(gameScript, new RegExp(id+':'));
  }
});

test('world autosaves every ten seconds and reports save status', () => {
  assert.ok(gameScript.includes('var autosaveElapsed=0;'));
  assert.ok(gameScript.includes('autosaveElapsed+=dt;'));
  assert.ok(gameScript.includes('if(autosaveElapsed>=10)'));
  assert.ok(gameScript.includes("var autosaveOk=save();"));
  assert.ok(gameScript.includes("'Autosaved just now · every 10 seconds'"));
  assert.ok(gameScript.includes("autosaveElapsed=0;var status=$('saveStatus')"), 'manual save should restart the autosave countdown');
  assert.ok(html.includes('Autosave is active · every 10 seconds'));
});

test('world catalog normalization filters malformed and duplicate records and caps growth safely', () => {
  const start=gameScript.indexOf('function seedFromString(');
  const end=gameScript.indexOf('var rawWorldCatalog=',start);
  assert.ok(start>=0&&end>start,'bounded world catalog helpers must exist');
  const normalize=new Function('MAX_WORLD_CATALOG_CHARS','MAX_WORLD_RECORDS',gameScript.slice(start,end)+';return normalizeWorldCatalog;')(65536,64);
  const raw=JSON.stringify([
    {id:'world-1',name:'  First World  ',created:10,seed:'424242'},
    {id:'world-1',name:'Duplicate',created:11,seed:2},
    null,
    {id:'unsafe id',name:'Unsafe',created:12,seed:3},
    {id:'world-2',name:'',created:-1,seed:0}
  ]);
  const result=normalize(raw);
  assert.equal(result.valid,true);
  assert.equal(result.overflow,false);
  assert.equal(result.worlds.length,2);
  assert.deepEqual(result.worlds[0],{id:'world-1',name:'First World',created:10,seed:424242});
  assert.equal(result.worlds[1].name,'Untitled World 2');
  assert.ok(result.worlds[1].seed>0);
  assert.equal(normalize('{broken').valid,false);
  assert.equal(normalize('x'.repeat(65537)).valid,false);
  const many=Array.from({length:65},(_,i)=>({id:'world-'+i,name:'World '+i,created:i,seed:i+1}));
  const overflow=normalize(JSON.stringify(many));
  assert.equal(overflow.overflow,true);
  assert.equal(overflow.worlds.length,64);
  assert.ok(gameScript.includes('if(worldCatalogReadOnly||worldList.length>=MAX_WORLD_RECORDS)'));
});

test('save integrity validation rejects unsafe values and preserves supported legacy envelopes', () => {
  const start=gameScript.indexOf('function validStructureCounts(parsed)');
  const end=gameScript.indexOf('function awardXP',start);
  assert.ok(start>=0&&end>start,'save integrity validators must be present');
  const helpers=new Function('SPECIES','HALF','NSLOTS','RESERVE_PARTY_LIMIT','TOTAL_PARTY_LIMIT',gameScript.slice(start,end)+';return {validStructureCounts,inspectSave,validSave};')(
    Array.from({length:8},(_,id)=>({id})),300,36,20,32
  );
  const validate=helpers.validStructureCounts;
  assert.equal(validate({version:6,mapVersion:2,worldSeed:424242,P:{x:0,z:0,hp:150,food:60},slots:[{id:'wood',n:3}],team:[{sp:0,hp:100}],progress:{level:2,stats:{vitality:1}}}),true);
  assert.equal(validate({P:{x:'0',z:0}}),false,'numeric strings must not be accepted as coordinates');
  assert.equal(validate({P:{x:null,z:0}}),false,'null must not be treated as zero');
  assert.equal(validate({version:7,P:{x:0,z:0}}),false,'future save versions must not be loaded as version 6');
  assert.equal(validate({version:'6',P:{x:0,z:0}}),false,'version must be a numeric integer');
  assert.equal(validate({worldSeed:0}),false,'world seed zero is not a valid persisted seed');
  assert.equal(validate({P:{x:0,z:0,hp:201}}),false,'player health must remain within the supported maximum');
  assert.equal(validate({progress:{level:101}}),true,'older saves above the current cap are accepted and clamped by load');
  assert.equal(validate({progress:{level:1000001}}),false,'extreme player levels must remain bounded');
  assert.equal(validate({progress:{stats:{power:11}}}),false,'player stat levels must remain bounded');
  assert.equal(validate({exploredCells:Array(3601).fill(0)}),false,'exploration cells must remain bounded');
  assert.equal(validate({team:Array(13).fill({sp:0})}),true,'legacy active rosters are accepted for migration into reserve storage');
  assert.equal(validate({team:Array(33).fill({sp:0})}),false,'legacy roster migration must still reject collections above 32');
  assert.equal(validate({slots:[{id:'wood',n:0}]}),false,'inventory stacks must be positive integers');
  assert.equal(validate({chests:[{x:0,z:0,slots:[{id:'wood',n:1.5}]}]}),false,'chest stacks must be whole numbers');
  const validRaw=JSON.stringify({version:6,mapVersion:2,worldSeed:424242,P:{x:0,z:0},team:[],reserve:[],walls:[],fires:[],beds:[],chests:[],slots:[]});
  assert.equal(helpers.inspectSave(validRaw).data.version,6);
  assert.equal(helpers.inspectSave('not-json').data,null);
  assert.equal(helpers.inspectSave('x'.repeat(1048577)).oversized,true);
  assert.equal(helpers.inspectSave(JSON.stringify({version:7,P:{x:0,z:0}})).unsupported,true);
  assert.equal(helpers.validSave(JSON.stringify({version:7,P:{x:0,z:0}})),null);
});

test('player progression stops at the validated level cap and cannot create unloadable XP records', () => {
  const start=gameScript.indexOf('function awardXP(');
  const end=gameScript.indexOf('function upgradePlayerStat',start);
  assert.ok(start>=0&&end>start,'bounded player progression must exist');
  const player={level:99,xp:0,statPoints:0};
  const run=new Function('P','clamp','$','say','playSfx',gameScript.slice(start,end)+';return function(amount){return awardXP(amount,"test");};')(
    player,
    (value,min,max)=>Math.max(min,Math.min(max,value)),
    ()=>null,
    ()=>{},
    ()=>{}
  );
  run(1000000);
  assert.equal(player.level,100);
  assert.equal(player.xp,0);
  assert.equal(player.statPoints,1);
  run(100);
  assert.equal(player.level,100);
  assert.equal(player.xp,0);
});

test('save validation rejects malformed or out-of-bounds world records before loading', () => {
  const start=gameScript.indexOf('function validStructureCounts(parsed)');
  const end=gameScript.indexOf('function awardXP',start);
  assert.ok(start>=0&&end>start,'save validator must be present');
  const validate=new Function('SPECIES','HALF','NSLOTS','RESERVE_PARTY_LIMIT','TOTAL_PARTY_LIMIT',gameScript.slice(start,end)+';return validStructureCounts;')([{id:0},{id:1}],300,36,20,32);
  assert.equal(validate({P:{x:0,z:0},team:[{sp:0}],walls:[{x:10,z:10,t:'wall'}]}),true);
  assert.equal(validate({team:[{sp:99}]}),false,'unknown creature species must be rejected');
  assert.equal(validate({team:Array.from({length:33},()=>({sp:0}))}),false,'oversized companion lists must be rejected');
  assert.equal(validate({team:Array.from({length:12},()=>({sp:0,hp:100})),reserve:Array.from({length:20},()=>({sp:1,hp:60}))}),true,'active and reserve storage should support the bounded 32-creature collection');
  assert.equal(validate({team:[{sp:0,hp:101}]}),false,'companion health outside 0-100 must be rejected');
  assert.equal(validate({team:[{sp:0,bondXp:421}]}),false,'bond XP above the level cap must be rejected');
  assert.equal(validate({team:[{sp:0,bondXp:-1}]}),false,'negative bond XP must be rejected');
  assert.equal(validate({reserve:[{sp:0,bondXp:'420'}]}),false,'bond XP must be stored as a finite number');
  assert.equal(validate({reserve:Array.from({length:21},()=>({sp:0}))}),false,'reserve storage must remain bounded');
  assert.equal(validate({team:Array.from({length:13},()=>({sp:0})),reserve:Array.from({length:20},()=>({sp:1}))}),false,'the total collection must remain bounded');
  assert.equal(validate({walls:[{x:301,z:0,t:'wall'}]}),false,'out-of-bounds structures must be rejected');
  assert.equal(validate({walls:[{x:0,z:0,t:'unknown'}]}),false,'unknown structure types must be rejected');
  assert.equal(validate({chests:[{x:0,z:0,slots:Array(19).fill(null)}]}),false,'oversized chest inventories must be rejected');
  assert.equal(validate({fires:[{x:0,z:0,t:'lava'}]}),false,'unknown fire types must be rejected');
  assert.equal(validate({P:{x:301,z:0}}),false,'player positions outside the world must be rejected');
  assert.equal(validate({P:{x:0,z:-301}}),false,'player positions outside the world must be rejected');
  assert.equal(validate({slots:Array(37).fill(null)}),false,'oversized player inventories must be rejected');
  assert.equal(validate({slots:Array(36).fill(null)}),true,'the supported inventory size must remain loadable');
});

test('inventory uses the complete responsive WILDEARTH character and backpack layout', () => {
  assert.ok(html.includes('wildInventory'));
  assert.ok(html.includes('class="wildCharacterPanel"'));
  assert.ok(html.includes('class="wildBackpackPanel"'));
  assert.ok(html.includes('class="wildPartyPanel"'));
  assert.ok(html.includes('id="itemPreviewIcon"'));
  assert.ok(html.includes('id="itemPreviewName"'));
  assert.ok(html.includes('id="bagGrid"'));
  assert.ok(html.includes('id="bagHotbar"'));
  assert.ok(html.includes('grid-template-columns:minmax(205px,.83fr) minmax(360px,1.45fr) minmax(220px,.9fr)'));
  assert.ok(html.includes('@media(max-width:600px)'));
  assert.ok(gameScript.includes("$('itemPreviewName').textContent=preview?ITEMS[preview.id].n:'Select an item';"));
});

test('Palworld-inspired inventory includes working category filters and a companion party list', () => {
  assert.ok(html.includes('data-inv-filter="all"'));
  assert.ok(html.includes('data-inv-filter="gear"'));
  assert.ok(html.includes('data-inv-filter="materials"'));
  assert.ok(html.includes('data-inv-filter="food"'));
  assert.ok(html.includes('data-inv-filter="capture"'));
  assert.ok(html.includes('data-inv-filter="building"'));
  assert.ok(html.includes('id="itemPreviewMeta"'));
  assert.ok(gameScript.includes('function inventoryCategory(id)'));
  assert.ok(gameScript.includes('function setInventoryFilter(filter)'));
  assert.ok(gameScript.includes("var filterButtons=$('bag').querySelectorAll('[data-inv-filter]')"));
  assert.ok(gameScript.includes('var counts={},total=totalCompanionCount(),html=\'<div class="partyHead"><strong>ACTIVE PARTY</strong>'));
  assert.ok(gameScript.includes('team.forEach(function(t,index){counts[t.sp]'));
  assert.ok(html.includes('.partyCard'));
});

test('inventory is rebuilt as a full-screen character, backpack, party and crafting experience', () => {
  assert.ok(html.includes('wildInventory'));
  assert.ok(html.includes('class="wildCharacterPanel"'));
  assert.ok(html.includes('class="wildBackpackPanel"'));
  assert.ok(html.includes('class="wildPartyPanel"'));
  assert.ok(html.includes('id="inventoryScreen"'));
  assert.ok(html.includes('id="craftingScreen"'));
  assert.ok(html.includes('data-bag-tab="inventory"'));
  assert.ok(html.includes('data-bag-tab="crafting"'));
  assert.ok(html.includes('id="armorHead"'));
  assert.ok(html.includes('id="armorChest"'));
  assert.ok(html.includes('id="armorLegs"'));
  assert.ok(html.includes('id="armorFeet"'));
  assert.ok(gameScript.includes('function setBagTab(tab)'));
  assert.ok(gameScript.includes("$('craftingScreen').hidden=tab!=='crafting'"));
  assert.ok(html.includes('.wildCharacterSilhouette'));
  assert.ok(html.includes('.wildRecipeBody'));
});

test('inventory reference behaviors are selectively integrated and every storage action is wired', () => {
  // The Library reference index (2).html uses the same select-then-destination
  // interaction. Keep that touch-friendly behavior while retaining WILDEARTH's
  // larger backpack, equipment, party and crafting systems.
  assert.ok(gameScript.includes('function slotClick(i)'));
  assert.match(gameScript, /if\(moveFrom<0\)\{if\(slots\[i\]\)moveFrom=i;renderInv\(true\);return\}/);
  assert.ok(gameScript.includes("else if(b.id===a.id){var t=Math.min(a.n,ITEMS[a.id].max-b.n);"));
  assert.ok(gameScript.includes("$('hotbar').addEventListener('click'"));
  assert.ok(gameScript.includes("var b=e.target.closest('[data-slot]');"));
  assert.ok(gameScript.includes("if(e.target.closest('#quickMove')&&moveFrom>=0)"));
  assert.ok(gameScript.includes("if(e.target.closest('#quickDiscard'))"));
  assert.ok(gameScript.includes("if(e.target.closest('#repairTool'))"));
  assert.ok(gameScript.includes("if(e.target.closest('#splitStack'))"));
  assert.ok(gameScript.includes("if(e.target.closest('#equipArmor'))"));
  assert.ok(gameScript.includes("function sortStorageInventory()"));
  assert.ok(gameScript.includes("function splitSelectedStack()"));
  assert.ok(gameScript.includes("function equipSelectedArmor()"));
  assert.ok(gameScript.includes("$('bagSort').addEventListener('click',sortStorageInventory)"));
  assert.ok(gameScript.includes("function setBagTab(tab)"));
  assert.ok(gameScript.includes("function setInventoryFilter(filter)"));
  assert.ok(gameScript.includes("function setCompanionMode(mode)"));
  assert.ok(gameScript.includes("function craft(k,amount)"));
  assert.ok(gameScript.includes("$('bag').addEventListener('dragstart'"));
  assert.ok(gameScript.includes("$('bag').addEventListener('drop'"));
  assert.ok(html.includes('touch-action:manipulation'));
});

test('legacy MF Wilds reference saves merge into WILDEARTH world saves safely', () => {
  assert.ok(html.includes("SAVE_KEY='mfwilds3d_world_'+selectedWorldId"));
  assert.ok(gameScript.includes("localStorage.getItem('mfwilds3d_v2')"));
  assert.ok(gameScript.includes("localStorage.setItem(SAVE_KEY,legacy)"));
  assert.ok(gameScript.includes('function migrateInventorySlots(oldSlots,itemDefs,slotCount,hotbarCount)'));
  assert.ok(gameScript.includes("if(item&&item.id==='cage')item={id:'ball',n:item.n}"));
  assert.ok(gameScript.includes("d=validSave(localStorage.getItem(SAVE_KEY+'_backup'))"));
  assert.ok(gameScript.includes('version:6,mapVersion:2,worldSeed:worldSeed'));
  assert.ok(gameScript.includes('toolDurability:toolDurability'));
  assert.ok(gameScript.includes('chests:chests.map'));
  assert.ok(gameScript.includes('discoveredLandmarks:discoveredLandmarks'));
});

test('WILDEARTH keeps the reference survival loop while extending it with advanced world systems', () => {
  for (const feature of [
    'function doGather()', 'function doCatch()', 'function craft(k,amount)',
    'function doPlace(id)', 'function update(dt)', 'function envUpdate()',
    'function updateWorldStreaming', 'function playerDamage',
    'function updateRivers', 'function spawnRareEvent'
  ]) assert.ok(gameScript.includes(feature), 'missing merged game system: ' + feature);
  assert.ok(html.includes('id="worldSelect"'));
  assert.ok(html.includes('id="settingsPanel"'));
  assert.ok(html.includes('id="pausePanel"'));
  assert.ok(html.includes('id="inventoryScreen"'));
  assert.ok(html.includes('id="craftingScreen"'));
});

test('companions coordinate their attacks on the Night Herald instead of splitting party damage', () => {
  assert.ok(gameScript.includes('guardScore=Infinity'));
  assert.ok(gameScript.includes('var threatScore=wd-(candidate.boss?5:0)'));
  assert.ok(gameScript.includes('threatScore<guardScore'));
  assert.ok(gameScript.includes('guardDist=wd;guardScore=threatScore'));
  assert.ok(gameScript.includes('if(guard&&guardDist<3.1&&t.guardCd<=0)'));
});

test('hostile attacks show a visible ground telegraph during wind-up and intensify before impact', () => {
  assert.ok(gameScript.includes('g.userData.attackWarning=warningRing'));
  assert.ok(gameScript.includes('warningRing.visible=false'));
  assert.ok(gameScript.includes('attackWarning.visible=s.windup>0'));
  assert.ok(gameScript.includes('warningProgress=1-clamp(s.windup/'));
  assert.ok(gameScript.includes('attackWarning.material.opacity=0.45+warningProgress*0.5'));
});

test('Escape closes the topmost open game menu before attempting to pause', () => {
  assert.ok(gameScript.includes('function closeTopMenu(){'));
  for (const overlay of ["$('chestPanel')", "$('settingsPanel')", "$('mapPanel')", "$('questPanel')", 'bagOpen', 'pauseOpen']) {
    assert.ok(gameScript.includes(overlay), 'Escape handler must close ' + overlay);
  }
  assert.ok(gameScript.includes('if(closeTopMenu()){e.preventDefault();e.stopPropagation();return;}'));
  assert.ok(gameScript.includes("if(waitingBinding){e.preventDefault();waitingBinding=null;renderKeyBindings();say('Key binding cancelled.'"));
  assert.ok(gameScript.includes('function closeSettingsPanel(){'));
  assert.ok(gameScript.includes('if(pauseOpen)$(' + "'pausePanel'" + ').hidden=false'));
});

test('graphics upgrades color output and increases shadow quality without changing display resolution', () => {
  assert.ok(gameScript.includes('renderer.outputEncoding=THREE.sRGBEncoding'));
  assert.ok(gameScript.includes('renderLevel===2?((isMobile||isLowEnd)?1024:2048):((isMobile||isLowEnd)?512:1024)'));
  assert.ok(gameScript.includes('renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,isLowEnd?1.15:1.75))'));
  assert.ok(gameScript.includes('renderer.setSize(vw,vh,false)'));
});

test('companions use cached steering around trees, rocks, structures, water, slopes, and cave walls', () => {
  for (const marker of [
    'function companionNavigationStep(member,target,options)',
    'offsets=[0,-0.65,0.65,-1.3,1.3]',
    'function companionGroundSafe(x,z)',
    'riverDepthAt(x,z)<0.55',
    'function companionCanStand(x,z,sp)',
    'function resolveCompanionNavigationPoint(point,radius)',
    't.navT=0.18',
    'companionGroundSafe(companionNext.x,companionNext.z)',
    'pushOutBoxes(e,r)'
  ]) assert.ok(gameScript.includes(marker), 'missing companion navigation behavior: '+marker);
  assert.ok(gameScript.includes('if(dd<rr){if(dd===0){ddx=1;ddz=0;}'), 'resource collision must resolve exact-center overlaps');
  assert.ok(gameScript.includes('caveMode?0.6+row*0.72:2.7+row*1.45'), 'cave followers need a compact formation');
});

test('companion steering selects a safe side route, stops near its target, and reports fully blocked paths', () => {
  const navigate=new Function(extractGameFunction('companionNavigationStep')+';return companionNavigationStep;')();
  const routed=navigate({x:0,z:0,sp:0,navSide:0},{x:10,z:0},{maxSpeed:9,probeDistance:1.8,radius:0.72,canStand:()=>true,resolve(point){if(point.x>1.2&&point.x<2.8&&Math.abs(point.z)<1.0)point.z+=Math.sign(point.z||1)*1.1;}});
  assert.equal(routed.blocked,false);
  assert.ok(routed.vx>0,'the chosen route should continue toward the destination');
  assert.ok(Math.abs(routed.vz)>0.1,'the chosen route should steer around the obstacle');
  const blocked=navigate({x:0,z:0,sp:0},{x:10,z:0},{canStand:()=>false});
  assert.equal(blocked.blocked,true);
  assert.equal(blocked.vx,0);
  const arrived=navigate({x:0,z:0},{x:0.2,z:0.1},{});
  assert.equal(arrived.arrived,true);
  assert.equal(arrived.vx,0);
});

test('companion ground checks reject water, rivers, steep slopes, and world edges while allowing cave floors', () => {
  const source=extractGameFunction('companionGroundSafe')+'\n'+extractGameFunction('companionCanStand');
  const build=(cave,active,height,river)=>new Function('caveMode','activeCave','HALF','WATER','heightAt','riverDepthAt','clamp',source+';return {companionGroundSafe,companionCanStand};')(cave,active,50,1,height,river,(v,a,b)=>Math.max(a,Math.min(b,v)));
  assert.equal(build(false,null,()=>3,()=>0).companionCanStand(0,0,0),true);
  assert.equal(build(false,null,()=>0,()=>0).companionCanStand(0,0,0),false,'deep water is not walkable');
  assert.equal(build(false,null,()=>3,()=>0.82).companionCanStand(0,0,0),false,'rivers are avoided when companions cannot swim');
  assert.equal(build(false,null,()=>3,()=>0).companionCanStand(43,0,0),false,'world-edge margins remain enforced');
  assert.equal(build(false,null,(x)=>x>0?9:0,()=>0).companionCanStand(0,0,0),false,'species slope limits prevent unsafe climbs');
  const cave=build(true,{x:0,z:0,floorY:-18},()=>0,()=>0);
  assert.equal(cave.companionGroundSafe(6,0),true,'the cave interior uses its own safe floor bounds');
  assert.equal(cave.companionGroundSafe(6.7,0),false,'companions cannot pass through cave walls');
});

test('safe companion regroup positions avoid occupied slots and return null when every slot is blocked', () => {
  const place=new Function(extractGameFunction('companionSafePosition')+';return companionSafePosition;')();
  const safe=place(0,{x:0,z:0},{sp:0},{radii:[2],canStand:()=>true,isOccupied:(x)=>x>0.5});
  assert.ok(safe);
  assert.ok(safe.x<=0.5,'the selected slot must not overlap an occupied party position');
  assert.equal(place(0,{x:0,z:0},{sp:0},{radii:[2],canStand:()=>false}),null);
});

test('collision push-out resolves exact-center overlaps with walls, resource nodes, and campfires', () => {
  const push=new Function('walls','res','fires','clamp',extractGameFunction('pushOutBoxes')+';return pushOutBoxes;');
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const wallPush=push([{x:0,z:0,t:'wall',open:false}],[],[],clamp),wallPoint={x:0,z:0};
  wallPush(wallPoint,0.72);assert.ok(Math.abs(wallPoint.z)>0.8,'wall overlap should exit through the nearest wall edge');
  const treePush=push([],[{x:0,z:0,rad:1,dead:0}],[],clamp),treePoint={x:0,z:0};
  treePush(treePoint,0.72);assert.ok(treePoint.x>1.7,'tree overlap should be pushed fully beyond its radius');
  const firePush=push([],[],[{x:0,z:0,t:'fire'}],clamp),firePoint={x:0,z:0};
  firePush(firePoint,0.72);assert.ok(firePoint.x>1.5,'campfire overlap should be pushed fully beyond its safety radius');
});

test('party recall safely regroups companions and cave transitions carry the active party', () => {
  for (const marker of [
    'function companionSafePosition(index,origin,member,options)',
    'function findCompanionSafePosition(index,origin,member)',
    'function regroupCompanionsNearPlayer()',
    'function recallCompanions()',
    'data-team-command="recall"',
    'var recall=e.target.closest(\'[data-team-command="recall"]\')',
    'companionMode=\'follow\';',
    'regroupCompanionsNearPlayer();say(\'Entered the Lumen Cavern.',
    'activeCave=null;P.oxygen=100;regroupCompanionsNearPlayer();',
    'function companionNeedsRecovery(distance,stuck,mode)',
    'playerDistance>34?12',
    'companionNeedsRecovery(playerDistance,t.navStuck||0,companionMode)',
    'distance>72||(distance>8.5&&stuck>3.4)'
  ]) assert.ok(gameScript.includes(marker) || html.includes(marker), 'missing companion recall or recovery behavior: '+marker);
  const recovery=new Function(extractGameFunction('companionNeedsRecovery')+';return companionNeedsRecovery;')();
  assert.equal(recovery(73,0,'follow'),true);
  assert.equal(recovery(10,4,'follow'),true);
  assert.equal(recovery(90,0,'hold'),false);
  assert.equal(recovery(10,2,'follow'),false);
  assert.ok(gameScript.includes('version:6,mapVersion:2'), 'navigation state must remain transient and save-compatible');
});



test('WILDEARTH beds support safe night-only sleep through to dawn with recovery and persistence', () => {
  assert.ok(gameScript.includes('function sleepAtBed(bed)'));
  assert.ok(gameScript.includes('if(nightF<0.55)'));
  assert.ok(gameScript.includes('clock=nextDawn;nights+=1;inNight=false'));
  assert.ok(gameScript.includes('P.hp=Math.min(P.maxHp||100,P.hp+40);P.stamina=100;P.food=Math.max(0,P.food-8)'));
  assert.ok(gameScript.includes("nearestOf(beds,P.x,P.z,4.8)"));
  assert.ok(html.includes('id="sleepPrompt"'));
  assert.ok(gameScript.includes("$('sleepAction').addEventListener('click'"));
  assert.ok(gameScript.includes("if(nearbyBed){sleepAtBed(nearbyBed);return;}"));
});

test('winter weather produces visible drifting snow while storms retain rain and lightning behavior', () => {
  assert.ok(gameScript.includes("weatherSeason.id==='winter'&&localCold&&rainLevel>0.02"));
  assert.ok(gameScript.includes("rainMat.color.setHex(snowing?0xeaf6ff:0xb9d9ed)"));
  assert.ok(gameScript.includes("rainPositions[k+1]-=dt*(snowing?4.5+rainLevel*2:17+rainLevel*5)"));
  assert.ok(gameScript.includes("if(!snowing&&stormLevel>0.62&&lightningCooldown<=0)"));
  assert.ok(html.includes('id="weatherStatus"'));
});

test('all composed 3D model meshes receive scene lighting and cast and receive shadows', () => {
  assert.ok(gameScript.includes('o.castShadow=true;o.receiveShadow=true;return o'));
});

test('creature models receive species-aware face, chest and paw detail geometry', () => {
  assert.ok(gameScript.includes('var eyeGlint=stdMat(0xffffff,0.18'));
  assert.ok(gameScript.includes('var chestMark=mesh(new THREE.SphereGeometry'));
  assert.ok(gameScript.includes('for(var clawSide=-1;clawSide<=1;clawSide+=2)'));
});

test('hostile wraith models receive spectral ribs, shoulder plates and a glowing core', () => {
  assert.ok(gameScript.includes('var ribMat=stdMat(p.glow'));
  assert.ok(gameScript.includes('new THREE.TorusGeometry(0.42+rib*0.11'));
  assert.ok(gameScript.includes('new THREE.OctahedronGeometry(kind===\'brute\'?0.23:0.16,1)'));
  assert.ok(gameScript.includes('for(var armorSide=-1;armorSide<=1;armorSide+=2)'));
});

test('sleeping bed model has a timber frame, mattress, stitched blanket and pillow', () => {
  assert.ok(gameScript.includes('function makeBed(){'));
  assert.ok(gameScript.includes('new THREE.BoxGeometry(0.12,0.22,2.15)'));
  assert.ok(gameScript.includes('for(var stitch=0;stitch<5;stitch++)'));
  assert.ok(gameScript.includes('new THREE.SphereGeometry(0.24,12,9)'));
});
test('survival chest model includes plank seams, reinforced hinges and metal hardware', () => {
  assert.ok(gameScript.includes('function makeChest(){'));
  assert.ok(gameScript.includes('for(var plank=-2;plank<=2;plank++)'));
  assert.ok(gameScript.includes('for(var hinge=-1;hinge<=1;hinge+=2)'));
});

test('door and gate models include structural braces, plank seams and rivets', () => {
  assert.ok(gameScript.includes('for(var brace=-1;brace<=1;brace+=2)'));
  assert.ok(gameScript.includes('for(var bolt=-2;bolt<=2;bolt++)'));
  assert.ok(gameScript.includes('new THREE.SphereGeometry(0.055,8,6)'));
});

test('roof, workbench and cookpot models include additional construction and tool details', () => {
  assert.ok(gameScript.includes('for(var row=0;row<3;row++)for(var col=0;col<4;col++)'));
  assert.ok(gameScript.includes('Crafting tools: hammer, chisel, saw blade and a small parts tray.'));
  assert.ok(gameScript.includes('new THREE.TorusGeometry(0.32,0.025,6,12)'));
});


test('original WILDEARTH creature art direction uses eight tuned silhouettes and cached merged detail meshes', () => {
  assert.match(gameScript, /var CREATURE_FORMS=\[/);
  assert.match(gameScript, /function makeCreatureArtPass\(sp\)/);
  assert.ok(gameScript.includes('var CREATURE_ART_CACHE=[]'));
  assert.ok(gameScript.includes('CREATURE_ART_CACHE[sp]'));
  assert.ok(gameScript.includes('new THREE.MeshStandardMaterial({vertexColors:true,roughness:sp===7?0.58:0.84'));
  assert.ok(gameScript.includes("sculptLayer.name='original-species-sculpt-'+S.n"));
  assert.ok(gameScript.includes('g.add(sculptLayer)'));
  assert.ok(gameScript.includes('head.scale.setScalar(form.headScale)'));
  assert.ok(gameScript.includes('lg.scale.set(form.legScale[0],form.legScale[1],form.legScale[2])'));
  assert.ok(gameScript.includes('g.userData.speciesForm=S.n'));
});

test('creature faces use species-specific irises, pupils and eye highlights', () => {
  assert.match(gameScript, /var irisColors=\[0x72b9a0,0xffa24f,0x6bd8e8,0xc5b9a0,0xffe36e,0x89b96e,0x9ca8c9,0x83f1e8\]/);
  assert.ok(gameScript.includes('var irisMat=stdMat(irisColors[sp]'));
  assert.ok(gameScript.includes('var eyeHighlight=stdMat(0xffffff'));
  assert.ok(gameScript.includes('new THREE.SphereGeometry(0.064,10,8),irisMat'));
  assert.ok(gameScript.includes('new THREE.SphereGeometry(0.014,7,5),eyeHighlight'));
  assert.ok(gameScript.includes('new THREE.BoxGeometry(0.16,0.018,0.025),dark'));
});
test('creature models expose animated ears, eyes and torso for low-cost expressive idle motion', () => {
  assert.ok(gameScript.includes('ears.push(ear)'));
  assert.ok(gameScript.includes('eyes.push(eyeWhite)'));
  assert.ok(gameScript.includes('return {g:clone,legs:legs,head:head,tail:tail,ears:ears,eyes:eyes,torso:torso}'));
});

test('creature animation includes breathing, blinking, ear reactions and relaxed resting gait', () => {
  assert.ok(gameScript.includes('var blink=Math.pow'));
  assert.ok(gameScript.includes('result.breath=downed?0:Math.sin(time*p.breathRate*(resting?0.56:1))'));
  assert.ok(gameScript.includes('m.torso.scale.y=1+mood.breath'));
  assert.ok(gameScript.includes('m.ears[ei].rotation.z'));
  assert.ok(gameScript.includes("c.state!=='rest'"));
});
test('world lighting uses a low-cost sky fill and improved exposure for readable shaded models', () => {
  assert.ok(gameScript.includes('renderer.toneMappingExposure=0.92'));
  assert.ok(gameScript.includes('isLowEnd?1.15:1.75'));
  assert.ok(gameScript.includes('var skyFill=new THREE.DirectionalLight(0x8299bd,0.12)'));
  assert.ok(gameScript.includes('skyFill.castShadow=false'));
  assert.ok(gameScript.includes('skyFill.intensity=0.025+0.12*dayF'));
});

test('atmospheric fog follows the selected graphics profile and day-night cycle', () => {
  assert.ok(gameScript.includes('scene.fog.far=renderProfiles[renderLevel].fogFar*(0.72+0.28*dayF)'));
  assert.ok(gameScript.includes('scene.fog.near=22+18*dayF'));
});

test('world water uses a segmented physical material with mobile-scaled geometry and subtle waves', () => {
  assert.ok(gameScript.includes('new THREE.PlaneGeometry(WORLD*1.6,WORLD*1.6,isMobile?20:40,isMobile?20:40)'));
  assert.ok(gameScript.includes('new THREE.MeshPhysicalMaterial({color:0x327b98'));
  assert.ok(gameScript.includes('clearcoat:0.82'));
  assert.ok(gameScript.includes('function animateWater(dt)'));
  assert.ok(gameScript.includes('waterGeo.computeVertexNormals()'));
  assert.ok(gameScript.includes('animateWater(dt);if(!menuOpen)update(dt)'));
});

test('terrain vertex colors include layered micro-variation without external texture assets', () => {
  assert.ok(gameScript.includes('var detail=vnoise(x*2.4+31,z*2.4-17),micro=vnoise(x*5.2-8,z*5.2+23)'));
  assert.ok(gameScript.includes('if(biome.id===\'volcanic\'&&micro>0.68)'));
  assert.ok(gameScript.includes('var v=0.86+0.22*fine+(micro-0.5)*0.045'));
});


test('low-poly tree meshes include layered pine boughs, bark grooves and oak root flares', () => {
  const pine=gameScript.slice(gameScript.indexOf('function buildPine()'),gameScript.indexOf('function buildOak()'));
  const oak=gameScript.slice(gameScript.indexOf('function buildOak()'),gameScript.indexOf('function buildRock()'));
  assert.match(pine,/CylinderGeometry\(0\.025,0\.055,4\.35,4\)/);
  assert.match(pine,/reach=rad\*0\.76/);
  assert.match(oak,/CylinderGeometry\(0\.045,0\.16,1\.15,5\)/);
  assert.match(oak,/var ka=k\/7\*6\.283/);
});

test('rock meshes add layered mineral facets and restrained moss patches', () => {
  const rock=gameScript.slice(gameScript.indexOf('function buildRock()'),gameScript.indexOf('function buildOre('));
  assert.match(rock,/var strata=\[0x626a70,0x969b9c,0x68736f,0x858b8b\]/);
  assert.match(rock,/new THREE\.DodecahedronGeometry\(0\.12\+\(i%3\)\*0\.035\)/);
  assert.match(rock,/new THREE\.SphereGeometry\(0\.24,6,4\)/);
  assert.match(rock,/return merge\(parts\)/);
});


test('biome signature plants provide desert, snow, volcanic and jungle vegetation', () => {
  for (const fn of ['buildDesertTuft','buildSnowShrub','buildEmberPlant','buildJungleBroadleaf']) {
    assert.match(gameScript,new RegExp('function '+fn+'\\('),fn+' builder should exist');
  }
  assert.match(gameScript,/biomeAt\(x,z\)\.id==='volcanic'/);
  assert.match(gameScript,/id==='frost'\|\|id==='tundra'\|\|id==='highland'/);
  assert.match(gameScript,/biomeAt\(x,z\)\.id==='jungle'\|\|biomeAt\(x,z\)\.id==='marsh'/);
  assert.match(gameScript,/Math\.round\(72\*mf\)/);
  assert.match(gameScript,/Math\.round\(30\*mf\)/);
});


test('fallen logs show cut growth rings, bark ridges and knots', () => {
  const log=gameScript.slice(gameScript.indexOf('function buildLog()'),gameScript.indexOf('function buildLeafLitter()'));
  assert.match(log,/CylinderGeometry\(0\.19,0\.19,0\.018,9\)/);
  assert.match(log,/CylinderGeometry\(0\.11,0\.11,0\.02,8\)/);
  assert.ok(log.includes('CylinderGeometry(0.025,0.045,2.85,4)'));
  assert.match(log,/SphereGeometry\(0\.075,5,4\)/);
});

test('forest and dry biomes receive distinct ground litter instances', () => {
  assert.match(gameScript,/function buildLeafLitter\(\)/);
  assert.match(gameScript,/function buildDryLitter\(\)/);
  assert.match(gameScript,/id==='forest'\|\|id==='woodland'\|\|id==='jungle'\|\|id==='marsh'/);
  assert.match(gameScript,/id==='desert'\|\|id==='savanna'\|\|id==='meadow'/);
  assert.match(gameScript,/Math\.round\(230\*mf\)/);
});


test('visual grading reduces washed-out daylight and increases render edge clarity safely', () => {
  assert.ok(gameScript.includes('renderer.toneMappingExposure=0.92'));
  assert.ok(gameScript.includes('isLowEnd?1.15:1.75'));
  assert.ok(gameScript.includes('var hemi=new THREE.HemisphereLight(0xb7c9df,0x393329,0.48)'));
  assert.ok(gameScript.includes('sun.intensity=1.12*dayF'));
  assert.ok(gameScript.includes('hemi.intensity=0.14+0.46*dayF'));
  assert.ok(gameScript.includes('var cDayS=new THREE.Color(0x8199b2)'));
});


test('terrain uses a lightweight deterministic bump map for fine surface relief', () => {
  assert.ok(gameScript.includes('function makeGroundDetailMap()'));
  assert.ok(gameScript.includes('canvas.width=128;canvas.height=128'));
  assert.ok(gameScript.includes('tex.repeat.set(54,54)'));
  assert.ok(gameScript.includes('bumpMap:groundDetailMap,bumpScale:0.038'));
  assert.ok(gameScript.includes('Math.min(4,renderer.capabilities.getMaxAnisotropy())'));
});


test('shared prop materials use a lightweight tileable micro-surface map for sharper material definition', () => {
  assert.ok(gameScript.includes('function makeSurfaceDetailMap()'));
  assert.ok(gameScript.includes('canvas.width=128;canvas.height=128'));
  assert.ok(gameScript.includes('tex.repeat.set(3,3)'));
  assert.ok(gameScript.includes('roughnessMap:surfaceDetailMap,bumpMap:surfaceDetailMap,bumpScale:0.016'));
  assert.ok(gameScript.includes('Math.min(4,renderer.capabilities.getMaxAnisotropy())'));
});


test('companion attack order is available, saved safely, and expands target acquisition without changing follow or defend ranges', () => {
  for (const marker of [
    'data-team-mode="attack"',
    "if(['follow','hold','defend','attack'].indexOf(mode)<0)return;",
    "companionMode=['follow','hold','defend','attack'].indexOf(d.companionMode)>=0?d.companionMode:'follow';",
    "companionMode==='attack'?36:(companionMode==='defend'?19:13)",
    "companionMode==='attack'?48:(companionMode==='defend'?27:19)",
    'Companions will actively hunt nearby Wraiths.'
  ]) assert.ok(gameScript.includes(marker), 'missing companion attack-order marker: ' + marker);
});

test('eight original species use distinct, bounded locomotion and secondary-motion profiles', () => {
  const start = gameScript.indexOf('var CREATURE_GAITS=[');
  const end = gameScript.indexOf('var CREATURE_ART_CACHE=', start);
  assert.ok(start >= 0 && end > start, 'species gait profiles and pure gait helper must exist');
  const source = gameScript.slice(start, end);
  const factory = new Function(source + '; return { profiles: CREATURE_GAITS, gait: creatureGait };');
  const system = factory();
  assert.equal(system.profiles.length, 8);
  const signatures = system.profiles.map(p => [p.rate,p.stride,p.leg,p.bob,p.tailRate,p.tailSwing,p.tailLift,p.bodySway,p.offsets.join(',')].join('|'));
  assert.equal(new Set(signatures).size, 8, 'each species needs a distinct movement signature');
  for (let species = 0; species < 8; species++) {
    const pose = system.gait(species, 0.73, 1.2, true);
    assert.equal(pose.legs.length, 4);
    for (const angle of pose.legs) {
      assert.ok(Number.isFinite(angle));
      assert.ok(Math.abs(angle) <= 0.9, 'leg swing must stay inside a safe animation range');
    }
    for (const key of ['bob','bodySway','tailYaw','tailPitch','headSway']) assert.ok(Number.isFinite(pose[key]));
    const stopped = system.gait(species, 0.73, 1.2, false);
    assert.strictEqual(stopped, pose, 'the gait helper must reuse its scratch result rather than allocate per frame');
    assert.deepEqual(stopped.legs, [0,0,0,0], 'stopped creatures must not keep walking');
  }
  const fallback = system.gait(99, 0.73, 1.2, true);
  assert.equal(fallback.legs.length, 4, 'unknown species safely uses the base gait');
  assert.ok(gameScript.includes('gait=creatureGait(c.sp,c.walk,c.speed,moving)'));
  assert.ok(gameScript.includes('m.tail.rotation.y=gait.tailYaw'));
  assert.ok(gameScript.includes('m.g.rotation.z=gait.bodySway'));
});



test('eight original species have a complete, distinct field-guide roster', () => {
  const start = gameScript.indexOf('var SPECIES=[');
  const end = gameScript.indexOf('var COMPANION_BOND_XP_CAP=', start);
  assert.ok(start >= 0 && end > start, 'species roster metadata must exist');
  const species = new Function(gameScript.slice(start, end) + ';return SPECIES;')();
  assert.equal(species.length, 8);
  assert.equal(new Set(species.map(s => s.n)).size, 8);
  for (const s of species) {
    for (const key of ['n','r','role','ability','workLabel','temperament','movement','bondFocus']) {
      assert.equal(typeof s[key], 'string', s.n + ' must define ' + key);
      assert.ok(s[key].length > 2, s.n + ' must provide readable ' + key);
    }
    assert.ok(Array.isArray(s.habitats) && s.habitats.length >= 1, s.n + ' needs a habitat');
  }
  assert.ok(gameScript.includes("temperament:known?(S.temperament||'Unknown'):'Unknown'"));
  assert.ok(gameScript.includes("movement:known?(S.movement||'Unknown'):'Unknown'"));
  assert.ok(gameScript.includes("bondFocus:known?(S.bondFocus||'Unknown'):'Unknown'"));
  assert.ok(gameScript.includes(" · Temperament: '+entry.temperament+' · Movement: '+entry.movement"));
  assert.ok(gameScript.includes("Bond focus: '+entry.bondFocus+'.'"));
});

test('species behavior profiles drive bounded awareness, movement, and personality animation without per-frame allocation', () => {
  const start = gameScript.indexOf('var CREATURE_BEHAVIORS=[');
  const end = gameScript.indexOf('var CREATURE_ART_CACHE=', start);
  assert.ok(start >= 0 && end > start, 'species behavior helpers must exist');
  const source = gameScript.slice(start, end);
  const system = new Function('clamp', source + ';return {profiles:CREATURE_BEHAVIORS,awareness:creatureAwareness,roam:creatureRoamSpeed,flee:creatureFleeSpeed,accel:creatureAcceleration,turn:creatureTurnRate,mood:creatureMoodPose};')((v,a,b)=>Math.max(a,Math.min(b,v)));
  assert.equal(system.profiles.length, 8);
  const signatures = system.profiles.map(p => [p.alertRadius,p.panicRadius,p.roamSpeed,p.fleeSpeed,p.turnWander,p.turnFlee,p.idleRate,p.idleBob,p.idleSway,p.idleTilt].join('|'));
  assert.equal(new Set(signatures).size, 8, 'species need distinct behavior and idle signatures');
  for (let sp=0;sp<8;sp++) {
    const awareness=system.awareness(sp,0.5);
    for (const key of ['alert','panic','predatorAlert','predatorPanic']) assert.ok(Number.isFinite(awareness[key])&&awareness[key]>0);
    assert.ok(awareness.alert>=4&&awareness.alert<=24);
    assert.ok(awareness.panic>=3&&awareness.panic<=12);
    assert.ok(system.roam(sp,0.5)>=0.65&&system.roam(sp,0.5)<=3.6);
    assert.ok(system.flee(sp)>=3.5&&system.flee(sp)<=9);
    assert.ok(system.accel(sp,false)>=1.2&&system.accel(sp,false)<=7);
    assert.ok(system.accel(sp,true)>=1.2&&system.accel(sp,true)<=7);
    assert.ok(system.turn(sp,false)>=3&&system.turn(sp,false)<=13);
    assert.ok(system.turn(sp,true)>=3&&system.turn(sp,true)<=13);
    const idle=system.mood(sp,2.4,0.8,0.25,0,false,false,false);
    const alert=system.mood(sp,2.4,0.8,0.25,1,false,false,false);
    assert.ok(Number.isFinite(idle.bob)&&Math.abs(idle.bob)<=0.05);
    assert.ok(Number.isFinite(idle.sway)&&Math.abs(idle.sway)<=0.045);
    assert.ok(Number.isFinite(idle.headTilt)&&Math.abs(idle.headTilt)<=0.05);
    assert.ok(alert.alertLean>=0&&alert.alertLean<=0.12);
    assert.ok(alert.tailAlert>=0&&alert.tailAlert<=0.4);
    assert.ok(alert.earAlert>=0&&alert.earAlert<=0.16);
    const downed=system.mood(sp,2.4,0.8,0.25,0,false,false,true);
    assert.equal(downed.bob,0);
    assert.equal(downed.sway,0);
    assert.equal(downed.headTilt,0);
  }
  const shared=system.awareness(0,0.5);
  assert.strictEqual(system.awareness(1,0.5),shared,'awareness must reuse a scratch result');
  const mood=system.mood(0,1,0.5,0.5,0,false,false,false);
  assert.strictEqual(system.mood(1,1,0.5,0.5,0,false,false,false),mood,'idle animation must reuse a scratch result');
  assert.ok(gameScript.includes('awareness=creatureAwareness(c.sp,c.boldness)'));
  assert.ok(gameScript.includes('creatureFleeSpeed(c.sp)'));
  assert.ok(gameScript.includes('creatureRoamSpeed(c.sp,c.curiosity)'));
  assert.ok(gameScript.includes('creatureAcceleration(c.sp,c.flee>0)'));
  assert.ok(gameScript.includes("creatureTurnRate(c.sp,c.state==='flee')"));
  assert.ok(gameScript.includes('creatureMoodPose(c.sp,clock+(c.personalityPhase||0)'));
});

test('capture targeting follows the camera aim cone and allows a close-range throw', () => {
  const start = gameScript.indexOf('function isCaptureTargetAimed(');
  const end = gameScript.indexOf('function doCatch(){', start);
  const source = gameScript.slice(start, end);
  assert.ok(start >= 0 && end > start, 'capture targeting helpers must exist');
  const system = new Function('function clamp(v,a,b){return Math.max(a,Math.min(b,v));};' + source + '; return { isCaptureTargetAimed, selectCaptureTarget, captureOddsLabel };')();
  const ahead = { x: 0, z: 5 };
  const behind = { x: 0, z: -3.5 };
  assert.strictEqual(system.selectCaptureTarget([behind, ahead], 0, 0, 0, 12, 0.92, 2.4, true), ahead);
  assert.strictEqual(system.selectCaptureTarget([behind], 0, 0, 0, 12, 0.92, 2.4, true), null);
  const closeBehind = { x: 0, z: -1.8 };
  assert.strictEqual(system.selectCaptureTarget([closeBehind], 0, 0, 0, 12, 0.92, 2.4, true), closeBehind);
  assert.strictEqual(system.selectCaptureTarget([{ x: 0, z: 3, held: true }], 0, 0, 0, 12, 0.92, 2.4, true), null);
});

test('capture feedback uses qualitative odds and clearly reports aim readiness', () => {
  const start = gameScript.indexOf('function isCaptureTargetAimed(');
  const end = gameScript.indexOf('function doCatch(){', start);
  const source = gameScript.slice(start, end);
  const system = new Function('function clamp(v,a,b){return Math.max(a,Math.min(b,v));};' + source + '; return { captureOddsLabel };')();
  assert.equal(system.captureOddsLabel(0.9), 'Excellent odds');
  assert.equal(system.captureOddsLabel(0.65), 'Good odds');
  assert.equal(system.captureOddsLabel(0.4), 'Fair odds');
  assert.equal(system.captureOddsLabel(0.1), 'Low odds');
  assert.ok(gameScript.includes('captureAimFace(),tc=selectCaptureTarget'));
  assert.ok(gameScript.includes('captureOddsLabel(captureChance(tc,bid))'));
  assert.ok(gameScript.includes("aimed?'AIMED':'TURN TO AIM'"));
  assert.ok(gameScript.includes('Math.atan2(-Math.sin(cam.yaw),-Math.cos(cam.yaw))'));
  assert.ok(gameScript.includes('rateNow(c.sp,id,c)'));
  assert.ok(gameScript.includes('P.stats.tamer)||0)*0.025'));
  assert.doesNotThrow(() => new Function(gameScript));
});

test('capture throws use eased distance-scaled arcs and communicate impact, success, and escape', () => {
  assert.ok(gameScript.includes('flightDuration:clamp(0.36+distance*0.018,0.4,0.58)'));
  assert.ok(gameScript.includes('flight=u0*u0*(3-2*u0)'));
  assert.ok(gameScript.includes("pop(sc.x,sc.y+2.2,sc.z,'Capture attempt'"), 'impact should begin a visible capture attempt');
  assert.ok(gameScript.includes("SPECIES[sc.sp].n+' joined your active party!'"), 'successful capture should confirm active party membership');
  assert.ok(gameScript.includes("SPECIES[sc.sp].n+' joined reserve storage."), 'full parties should explain reserve placement');
  assert.ok(gameScript.includes('broke free. Build trust or try a Great Ball.'), 'failed capture should explain recovery options');
});

test('all eight original species expose unique signature abilities and readable combat roles', () => {
  const start=gameScript.indexOf('var COMPANION_ABILITIES=[');
  const end=gameScript.indexOf('function companionAbilityProfile',start);
  assert.ok(start>=0&&end>start,'signature ability profiles must exist');
  const block=gameScript.slice(start,end);
  const profiles=new Function(block+';return COMPANION_ABILITIES;')();
  assert.equal(profiles.length,8);
  assert.equal(new Set(profiles.map(p=>p.name)).size,8);
  assert.equal(new Set(profiles.map(p=>p.effect)).size,8);
  for(const profile of profiles){
    assert.ok(profile.cooldown>=9&&profile.cooldown<=13);
    assert.ok(profile.range>=6&&profile.range<=8);
    assert.ok(profile.role&&profile.name);
  }
  for(const entry of ["role:'Support',ability:'Pollen Mend'","role:'Striker',ability:'Cinder Burst'","role:'Controller',ability:'Tidal Snare'","role:'Guardian',ability:'Stone Ward'","role:'Chain striker',ability:'Arc Spark'","role:'Controller',ability:'Briar Snare'","role:'Disruptor',ability:'Gale Break'","role:'Finisher',ability:'Prism Lance'"])assert.ok(gameScript.includes(entry),'missing species role/ability: '+entry);
});

test('signature abilities require Attack order, range, cooldown and appropriate support conditions', () => {
  const start=gameScript.indexOf('var COMPANION_ABILITIES=[');
  const end=gameScript.indexOf('function resolveCompanionAbility',start);
  const system=new Function(gameScript.slice(start,end)+';return {ready:companionAbilityReady};')();
  const player={x:0,z:0,hp:72,maxHp:100,stamina:55};
  const companion={sp:0,x:1,z:0,abilityCd:0};
  const target={x:3,z:0,hp:12};
  assert.equal(system.ready(companion,target,'attack',player,0,0),true);
  assert.equal(system.ready(companion,target,'follow',player,0,0),false);
  assert.equal(system.ready({...companion,abilityCd:2},target,'attack',player,0,0),false);
  assert.equal(system.ready(companion,target,'attack',player,1,0),false);
  assert.equal(system.ready(companion,{x:12,z:0,hp:12},'attack',player,0,0),false);
  assert.equal(system.ready(companion,target,'attack',{...player,x:20},0,0),false);
  assert.equal(system.ready(companion,target,'attack',{...player,hp:100,stamina:100},0,0),false);
  assert.equal(system.ready({...companion,sp:3},target,'attack',player,0,4),false);
  assert.equal(system.ready({...companion,abilityCd:undefined},target,'attack',player,0,0),true,'legacy saved companions start ready without a saved cooldown');
});

test('eight signature ability effects heal, ward, burn, slow, chain, root, knock back and finish Wraiths', () => {
  const start=gameScript.indexOf('var COMPANION_ABILITIES=[');
  const end=gameScript.indexOf('function activateCompanionAbility',start);
  const bondHelpers='function clamp(v,a,b){return Math.max(a,Math.min(b,v));}\nvar COMPANION_BOND_XP_CAP=420;\n'+['normalizeCompanionBondXp','companionBondLevel','companionBondDamageMultiplier'].map(extractGameFunction).join('\n');
  const system=new Function(bondHelpers+'\n'+gameScript.slice(start,end)+';return {resolve:resolveCompanionAbility};')();
  function scenario(sp,boss,bondXp){
    const mobs=[
      {x:0,z:0,y:0,hp:20,boss:!!boss,damageTaken:1,windup:0.4,lunge:0.2,attackCd:0.2},
      {x:2,z:0,y:0,hp:20,damageTaken:1,windup:0.2,lunge:0.1,attackCd:0.1},
      {x:3,z:0,y:0,hp:20,damageTaken:1},
      {x:4,z:0,y:0,hp:20,damageTaken:1},
      {x:8,z:0,y:0,hp:20,damageTaken:1}
    ];
    const companion={sp,x:-1,y:0,z:0,bondXp:Number(bondXp)||0};
    const player={x:0,y:0,z:0,hp:70,maxHp:100,stamina:40};
    const calls={bursts:0,pops:0,knockbacks:0,sounds:0};
    const result=system.resolve(companion,mobs[0],{player,wraiths:mobs,wardTimer:0,wardReduction:0},{
      burst(){calls.bursts++;},pop(){calls.pops++;},sound(){calls.sounds++;},knockback(){calls.knockbacks++;}
    });
    return {mobs,player,calls,result};
  }
  const mend=scenario(0);assert.equal(mend.result.healed,8);assert.equal(mend.result.staminaRestored,14);assert.equal(mend.player.hp,78);
  const burn=scenario(1);assert.ok(burn.mobs[0].hp<20);assert.equal(burn.mobs[0].burnTimer,1.45);
  const tide=scenario(2);assert.ok(tide.mobs[0].frostTimer>=3.1);
  const ward=scenario(3);assert.equal(ward.result.wardTimer,5.5);assert.equal(ward.result.wardReduction,0.28);
  const chain=scenario(4);assert.equal(chain.result.affected,3);assert.ok(chain.mobs[1].hp<20&&chain.mobs[2].hp<20);
  const root=scenario(5);assert.ok(root.mobs[0].rootTimer>0);assert.equal(root.mobs[0].windup,0);assert.equal(root.mobs[0].lunge,0);
  const gust=scenario(6);assert.equal(gust.result.affected,4);assert.equal(gust.calls.knockbacks,4);assert.equal(gust.mobs[0].attackCd,0.45);
  const prism=scenario(7,true);assert.ok(Math.abs(prism.mobs[0].hp-(20-2.4*1.35))<0.0001);
  const bondedPrism=scenario(7,true,420);assert.ok(Math.abs(bondedPrism.mobs[0].hp-(20-2.4*1.35*1.1))<0.0001,'maximum bond adds a capped 10% signature-ability bonus');
  for(const run of [mend,burn,tide,ward,chain,root,gust,prism]){assert.equal(run.calls.pops,1);assert.equal(run.calls.sounds,1);}
});

test('signature abilities integrate with companion attack orders, Wraith status updates, damage mitigation and backward-compatible saves', () => {
  assert.ok(gameScript.includes('if(guard&&companionAbilityReady(t,guard,companionMode,P,companionAbilityGlobalCd,companionWardTimer))activateCompanionAbility(t,guard);'));
  assert.ok(gameScript.includes("if(s.rootTimer>0){s.windup=0;s.lunge=0;s.attackTarget=null;s.attackCompanion=null;}"));
  assert.ok(gameScript.includes("s.frostTimer=Math.max(0,(s.frostTimer||0)-dt);s.rootTimer=Math.max(0,(s.rootTimer||0)-dt);"));
  assert.ok(gameScript.includes("var wardMultiplier=companionWardTimer>0?1-clamp(companionWardReduction,0,0.6):1;"));
  assert.ok(gameScript.includes("if(companionWardTimer>0)statuses.push('STONE WARD · '+Math.ceil(companionWardTimer)+'s');"));
  assert.ok(gameScript.includes("team:team.map(function(t){return {sp:t.sp,hp:companionHealth(t),bondXp:normalizeCompanionBondXp(t.bondXp),workJob:normalizeCompanionWorkJob(t.workJob)}})"),'active companion health and bond should persist without saving runtime cooldowns');
  assert.ok(gameScript.includes("reserve:reserveTeam.map(function(t){return {sp:t.sp,hp:companionHealth(t),bondXp:normalizeCompanionBondXp(t.bondXp),workJob:normalizeCompanionWorkJob(t.workJob)}})"),'reserve companion health and bond should persist without creating reserve meshes');
  assert.ok(gameScript.includes("html+='</div><div class=\"companionCommands\""));
  assert.ok(gameScript.includes('Signature abilities activate in Attack order when a Wraith is close.'));
  for(const marker of ['function companionBondProgress(member)','function gainCompanionBond(member,amount)','gainCompanionBond(companion,result.affected>0?6:4)','gainCompanionBond(t,2)','gainCompanionBond(member,3)','t.bondTimer>=60','companionWorkYield(t,random(),workProfile.habitatMatch)',"BOND LVL '+bond.level",'sc.bondXp=Math.round(clamp(sc.trust||0,0,1)*20)'])assert.ok(gameScript.includes(marker),'missing bond progression integration: '+marker);
  assert.doesNotThrow(() => new Function(gameScript));
});

test('species habitat metadata stays aligned with the eight original creature roles', () => {
  const speciesStart = gameScript.indexOf('var SPECIES=[');
  const speciesEnd = gameScript.indexOf('];', speciesStart) + 2;
  const biomeStart = gameScript.indexOf('var BIOMES=[');
  const biomeEnd = gameScript.indexOf('];', biomeStart) + 2;
  const species = new Function(gameScript.slice(speciesStart, speciesEnd) + ';return SPECIES;')();
  const biomes = new Function(gameScript.slice(biomeStart, biomeEnd) + ';return BIOMES;')();
  const biomeIds = new Set(biomes.map(b => b.id));
  assert.equal(species.length, 8);
  assert.equal(new Set(species.map(s => s.n)).size, 8);
  for (const entry of species) {
    assert.ok(Array.isArray(entry.habitats) && entry.habitats.length >= 2);
    assert.ok(entry.habitats.every(id => biomeIds.has(id)), entry.n + ' must reference real biomes');
    assert.ok(entry.role && entry.ability);
  }
  assert.ok(gameScript.includes('var habitats=SPECIES[sp]&&SPECIES[sp].habitats;'), 'spawn weighting must use the same field-guide habitat data');
});

test('field guide discovery migration preserves caught species and rejects malformed flags', () => {
  const start = gameScript.indexOf('function normalizeSpeciesDiscovery(');
  const end = gameScript.indexOf('function creatureFieldGuideEntry(', start);
  assert.ok(start >= 0 && end > start);
  const normalize = new Function('var SPECIES=Array.from({length:8},function(){return {};});' + gameScript.slice(start, end) + ';return normalizeSpeciesDiscovery;')();
  assert.deepEqual(normalize([true, 'yes', false, 1], [0, 1, 0, 0, 2]), [true, true, false, false, true, false, false, false]);
  assert.deepEqual(normalize(null, [0, 0, 3]), [false, false, true, false, false, false, false, false]);
  assert.deepEqual(normalize(['true', true], []), [false, true, false, false, false, false, false, false]);
});

test('field guide entries reveal care and signature ability only after a sighting', () => {
  const start = gameScript.indexOf('function creatureFieldGuideEntry(');
  const end = gameScript.indexOf('function discoverSpecies(', start);
  assert.ok(start >= 0 && end > start);
  const source = gameScript.slice(start, end);
  const entryFor = new Function(
    'var SPECIES=[{n:"Fluffo",r:"common",c:0x8fd16a,role:"Support",ability:"Pollen Mend",habitats:["meadow","forest"],temperament:"Playful and sociable",movement:"Soft bounding hops",bondFocus:"Healing and care"}];' +
    'var BIOMES=[{id:"meadow",name:"Sunlit Meadow"},{id:"forest",name:"Mosswood Forest"}];' +
    'var CREATURE_DIET=["berry"];var ITEMS={berry:{n:"Berry"}};' +
    'var RAR={common:{n:"Common"}};' + source + ';return creatureFieldGuideEntry;'
  )();
  const hidden = entryFor(0, false, 0);
  assert.equal(hidden.name, 'Unknown species 1');
  assert.equal(hidden.ability, 'Unknown');
  assert.equal(hidden.food, 'Unknown');
  assert.equal(hidden.temperament, 'Unknown');
  assert.equal(hidden.movement, 'Unknown');
  assert.equal(hidden.bondFocus, 'Unknown');
  assert.deepEqual(hidden.habitats, ['Sunlit Meadow', 'Mosswood Forest']);
  const seen = entryFor(0, true, 2);
  assert.equal(seen.name, 'Fluffo');
  assert.equal(seen.rarity, 'Common');
  assert.equal(seen.ability, 'Pollen Mend');
  assert.equal(seen.food, 'Berry');
  assert.equal(seen.temperament, 'Playful and sociable');
  assert.equal(seen.movement, 'Soft bounding hops');
  assert.equal(seen.bondFocus, 'Healing and care');
  assert.equal(seen.caught, 2);
});

test('field guide sightings and captures persist without changing the existing save version', () => {
  assert.ok(gameScript.includes('version:6,mapVersion:2'));
  assert.ok(gameScript.includes('caught:catchIndex,discoveredSpecies:discoveredSpecies'));
  assert.ok(gameScript.includes('discoveredSpecies=normalizeSpeciesDiscovery(d.progress&&d.progress.discoveredSpecies,catchIndex)'));
  assert.ok(gameScript.includes('if(pdist<=18)discoverSpecies(c.sp,true);'));
  assert.ok(gameScript.includes('discoverSpecies(sc.sp,false)'));
  assert.ok(html.includes('data-creature-filter="all"'));
  assert.ok(html.includes('data-creature-filter="seen"'));
  assert.ok(html.includes('data-creature-filter="missing"'));
  assert.ok(gameScript.includes("var filter=e.target.closest('button[data-creature-filter]')"));
  assert.ok(gameScript.includes("'SIGHTED '+seen"));
  assert.ok(gameScript.includes("'Preferred habitat: '+habitatText"));
});

test('companion health is bounded, downed members stop at zero, and salves can restore them', () => {
  const source='var COMPANION_BOND_XP_CAP=420;\n'+['normalizeCompanionBondXp','normalizeCompanionHp','companionHealth','applyCompanionDamage','restoreCompanionHealth','normalizePartyStorage'].map(extractGameFunction).join('\n');
  const helpers=new Function('clamp','ACTIVE_PARTY_LIMIT','RESERVE_PARTY_LIMIT',source+';return {normalizeCompanionBondXp,normalizeCompanionHp,companionHealth,applyCompanionDamage,restoreCompanionHealth,normalizePartyStorage};')((v,a,b)=>Math.max(a,Math.min(b,v)),12,20);
  assert.equal(helpers.normalizeCompanionHp(undefined),100);
  assert.equal(helpers.normalizeCompanionHp(-8),0);
  assert.equal(helpers.normalizeCompanionHp(140),100);
  const member={hp:14};
  assert.equal(helpers.applyCompanionDamage(member,20),14);
  assert.equal(member.hp,0);
  assert.equal(member.downed,true);
  assert.equal(helpers.restoreCompanionHealth(member,45),45);
  assert.equal(member.hp,45);
  assert.equal(member.downed,false);
  assert.equal(helpers.restoreCompanionHealth(member,100),55);
  assert.equal(member.hp,100);
});

test('companion bond progression is bounded and unlocks measured combat and work bonuses', () => {
  const source='var COMPANION_BOND_XP_CAP=420;\n'+['normalizeCompanionBondXp','companionBondLevel','companionBondProgress','companionBondDamageMultiplier','companionWorkYield','awardCompanionBond'].map(extractGameFunction).join('\n');
  const helpers=new Function('clamp',source+';return {normalizeCompanionBondXp,companionBondLevel,companionBondProgress,companionBondDamageMultiplier,companionWorkYield,awardCompanionBond};')((v,a,b)=>Math.max(a,Math.min(b,v)));
  const member={bondXp:0};
  assert.equal(helpers.companionBondLevel(member),1);
  assert.equal(helpers.companionBondDamageMultiplier(member),1);
  assert.equal(helpers.companionWorkYield(member,0.01),1);
  assert.equal(helpers.awardCompanionBond(member,60).level,2);
  assert.equal(helpers.companionBondProgress(member).needed,90);
  assert.equal(helpers.awardCompanionBond(member,90).level,3);
  assert.equal(helpers.companionBondDamageMultiplier(member),1.05);
  assert.equal(helpers.companionWorkYield(member,0.05),2);
  assert.equal(helpers.companionWorkYield(member,0.5),1);
  assert.equal(helpers.awardCompanionBond(member,120).level,4);
  assert.equal(helpers.awardCompanionBond(member,150).level,5);
  assert.equal(helpers.companionBondDamageMultiplier(member),1.1);
  assert.equal(helpers.companionWorkYield(member,0.2),2);
  assert.equal(helpers.companionWorkYield(member,0.3),1);
  assert.equal(helpers.awardCompanionBond(member,50).xp,420,'bond XP is capped at the final level');
  assert.equal(helpers.awardCompanionBond(member,-20).gained,0);
  assert.equal(helpers.normalizeCompanionBondXp(NaN),0);
  assert.equal(helpers.normalizeCompanionBondXp(999),420);
});

test('legacy companion saves migrate overflow into bounded reserve storage without losing health', () => {
  const jobsStart=gameScript.indexOf('var COMPANION_WORK_JOBS='),jobsEnd=gameScript.indexOf('\nfunction normalizeCompanionWorkJob',jobsStart);
  const source='var COMPANION_BOND_XP_CAP=420;\n'+gameScript.slice(jobsStart,jobsEnd)+'\n'+['normalizeCompanionWorkJob','normalizeCompanionBondXp','normalizeCompanionHp','normalizePartyStorage'].map(extractGameFunction).join('\n');
  const normalize=new Function('clamp','ACTIVE_PARTY_LIMIT','RESERVE_PARTY_LIMIT',source+';return normalizePartyStorage;')((v,a,b)=>Math.max(a,Math.min(b,v)),12,20);
  const legacy=Array.from({length:14},(_,i)=>({sp:i%8}));
  const normalized=normalize(legacy,[{sp:7,hp:35}],8);
  assert.equal(normalized.active.length,12);
  assert.equal(normalized.reserve.length,3);
  assert.equal(normalized.active[0].hp,100,'legacy companions without health start fully recovered');
  assert.equal(normalized.reserve[0].sp,4,'legacy overflow keeps its original collection order');
  assert.equal(normalized.reserve[0].hp,100);
  assert.equal(normalized.reserve[2].hp,35,'existing reserve health remains intact');
});

test('party UI supports storing, deploying, swapping, and healing active or reserve companions', () => {
  for(const marker of [
    'function makeActiveCompanion(record,index)',
    'function storePartyCompanion(index)',
    'function deployPartyCompanion(index)',
    'function swapPartyCompanion(reserveIndex,activeIndex)',
    'function healPartyCompanion(storage,index)',
    'function releasePartyCompanion(storage,index)',
    'data-party-action="release"',
    'data-party-action="store"',
    'data-party-action="deploy"',
    'data-party-action="swap"',
    'data-party-action="heal"',
    'id="partySwapTarget"',
    'reserveTeam.length>=RESERVE_PARTY_LIMIT',
    'team.length>=ACTIVE_PARTY_LIMIT'
  ]) assert.ok(gameScript.includes(marker),'missing party management behavior: '+marker);
  assert.ok(gameScript.includes("var b=e.target.closest('[data-party-action]')"));
  assert.ok(gameScript.includes("var item=countOf('strongsalve')>0?'strongsalve':(countOf('salve')>0?'salve':null)"));
  assert.ok(gameScript.includes("restoreCompanionHealth(member,item==='strongsalve'?75:40)"));
});

test('full active parties capture into reserve while the entire collection stays capped at 32', () => {
  assert.ok(gameScript.includes('if(totalCompanionCount()+shots.length>=TOTAL_PARTY_LIMIT)'));
  assert.ok(gameScript.includes('if(team.length<ACTIVE_PARTY_LIMIT)team.push(sc)'));
  assert.ok(gameScript.includes('reserveTeam.push({sp:sc.sp,hp:companionHealth(sc),bondXp:normalizeCompanionBondXp(sc.bondXp),workJob:normalizeCompanionWorkJob(sc.workJob)})'));
  assert.ok(gameScript.includes('var savedParty=normalizePartyStorage(d.team,d.reserve,SPECIES.length)'));
  assert.ok(gameScript.includes('version:6,mapVersion:2'),'party expansion must remain additive to the existing save version');
});

test('Defend and Attack companions can intercept Wraith strikes and downed companions cannot fight', () => {
  assert.ok(gameScript.includes("var interceptRange=companionMode==='attack'?4.6:3.4"));
  assert.ok(gameScript.includes('targetCompanion=candidateCompanion'));
  assert.ok(gameScript.includes('s.attackCompanion=targetCompanion||null'));
  assert.ok(gameScript.includes('damageCompanion(struckCompanion,companionHit)'));
  assert.ok(gameScript.includes('if(companionHealth(t)<=0){t.speed=0;t.defending=false;'));
  assert.ok(gameScript.includes('Heal them with a Healing Salve in the Party panel.'));
  assert.ok(gameScript.includes('if(down)save();return dealt;'),'downed state is saved immediately while partial health uses autosave');
});

test('species companion models reuse cached geometry and materials across active and reserve swaps', () => {
  assert.ok(gameScript.includes('var CREATURE_ART_CACHE=[],CREATURE_MODEL_CACHE=[];'));
  assert.ok(gameScript.includes('var clone=cached.g.clone(true),legs=[],ears=[],eyes=[],head=null,tail=null,torso=null;'));
  assert.ok(gameScript.includes('CREATURE_MODEL_CACHE[sp]={g:g};'));
  assert.ok(gameScript.includes('return makeCreature(sp);'));
  for(const name of ['creature-head','creature-tail','creature-torso','creature-leg-','creature-ear-','creature-eye-']) {
    assert.ok(gameScript.includes(name),'cached model must retain animation part '+name);
  }
});

test('releasing an active or reserve companion frees a collection slot and safely returns wildlife', () => {
  assert.ok(gameScript.includes("if(!window.confirm('Release '+name+' back into the wild? This removes them from your collection.'))return;"));
  assert.ok(gameScript.includes("var list=storage==='reserve'?reserveTeam:team,member=list[index]"));
  assert.ok(gameScript.includes("if(storage!=='reserve'&&member.m&&member.m.g)scene.remove(member.m.g)"));
  assert.ok(gameScript.includes('if(wild.length<48&&!caveMode)'));
  assert.ok(gameScript.includes('var released=spawnWild(member.sp)'));
  assert.ok(gameScript.includes('list.splice(index,1)'));
  assert.ok(gameScript.includes('Your collection is full (32). Release a companion from the Party panel before capturing another.'));
});

test('companion work assignments use species specialties and preferred habitat affinity', () => {
  const speciesStart=gameScript.indexOf('var SPECIES=['),speciesEnd=gameScript.indexOf('];',speciesStart)+2;
  const jobsStart=gameScript.indexOf('var COMPANION_WORK_JOBS='),jobsEnd=gameScript.indexOf('\nfunction normalizeCompanionWorkJob',jobsStart);
  assert.ok(speciesStart>=0&&speciesEnd>speciesStart&&jobsStart>=0&&jobsEnd>jobsStart);
  const source='var COMPANION_BOND_XP_CAP=420;'+gameScript.slice(speciesStart,speciesEnd)+'\n'+gameScript.slice(jobsStart,jobsEnd)+'\n'+
    ['normalizeCompanionBondXp','companionBondLevel','normalizeCompanionWorkJob','companionWorkProfile','companionWorkYield','companionWorkGuardMultiplier'].map(extractGameFunction).join('\n');
  const helpers=new Function('clamp',source+';return {normalizeCompanionWorkJob,companionWorkProfile,companionWorkYield,companionWorkGuardMultiplier};')((v,a,b)=>Math.max(a,Math.min(b,v)));
  const member={sp:0,bondXp:0};
  assert.equal(helpers.normalizeCompanionWorkJob('invalid'),'native');
  const native=helpers.companionWorkProfile(member,'meadow');
  assert.equal(native.item,'wood','legacy native resource specialization is preserved');
  assert.equal(native.label,'Woodland gatherer');
  assert.equal(native.habitatMatch,true);
  assert.equal(helpers.companionWorkProfile(member,'desert').habitatMatch,false);
  member.workJob='forage';
  const forage=helpers.companionWorkProfile(member,'forest');
  assert.equal(forage.item,'berry');
  assert.equal(forage.bonusItem,'fiber');
  assert.equal(forage.habitatMatch,true);
  member.workJob='quarry';
  const quarry=helpers.companionWorkProfile(member,'desert');
  assert.equal(quarry.item,'stone');
  assert.equal(quarry.bonusItem,'copperOre');
  member.workJob='guard';
  assert.equal(helpers.companionWorkProfile(member,'forest').produces,false);
  assert.equal(helpers.companionWorkGuardMultiplier(member,'forest'),1.15);
  assert.equal(helpers.companionWorkGuardMultiplier(member,'desert'),1.08);
  member.workJob='rest';
  assert.equal(helpers.companionWorkProfile(member,'forest').produces,false);
  assert.equal(helpers.companionWorkGuardMultiplier(member,'forest'),1);
});

test('bond and habitat bonuses stack within a bounded work-yield chance', () => {
  const source='var COMPANION_BOND_XP_CAP=420;\n'+['normalizeCompanionBondXp','companionBondLevel','companionWorkYield'].map(extractGameFunction).join('\n');
  const helpers=new Function('clamp',source+';return {companionWorkYield};')((v,a,b)=>Math.max(a,Math.min(b,v)));
  assert.equal(helpers.companionWorkYield({bondXp:0},0.05,false),1);
  assert.equal(helpers.companionWorkYield({bondXp:0},0.05,true),2);
  assert.equal(helpers.companionWorkYield({bondXp:150},0.15,true),2);
  assert.equal(helpers.companionWorkYield({bondXp:150},0.25,true),1);
  assert.equal(helpers.companionWorkYield({bondXp:420},0.34,true),2);
  assert.equal(helpers.companionWorkYield({bondXp:420},0.36,true),1);
});

test('work assignments migrate safely and persist across active and reserve storage', () => {
  const jobsStart=gameScript.indexOf('var COMPANION_WORK_JOBS='),jobsEnd=gameScript.indexOf('\nfunction normalizeCompanionWorkJob',jobsStart);
  const source='var COMPANION_BOND_XP_CAP=420;'+gameScript.slice(jobsStart,jobsEnd)+'\n'+
    ['normalizeCompanionWorkJob','normalizeCompanionBondXp','normalizeCompanionHp','normalizePartyStorage'].map(extractGameFunction).join('\n');
  const normalize=new Function('clamp','ACTIVE_PARTY_LIMIT','RESERVE_PARTY_LIMIT',source+';return normalizePartyStorage;')((v,a,b)=>Math.max(a,Math.min(b,v)),12,20);
  const result=normalize([{sp:0},{sp:1,workJob:'quarry'}],[{sp:2,workJob:'rest'},{sp:3,workJob:'invalid'}],8);
  assert.equal(result.active[0].workJob,'native');
  assert.equal(result.active[1].workJob,'quarry');
  assert.equal(result.reserve[0].workJob,'rest');
  assert.equal(result.reserve[1].workJob,'native');
  assert.ok(gameScript.includes('version:6,mapVersion:2'),'work assignments remain additive to save version 6');
  assert.ok(gameScript.includes('workJob:normalizeCompanionWorkJob(record.workJob)'));
  assert.ok(gameScript.includes('workJob:normalizeCompanionWorkJob(member.workJob)'));
  assert.ok(gameScript.includes('workJob:normalizeCompanionWorkJob(t.workJob)'));
});

test('party UI and live companion updates apply assigned jobs and habitat effects', () => {
  assert.ok(gameScript.includes('data-companion-work="1"'));
  assert.ok(gameScript.includes("data-companion-storage=\"'+storage+'\""));
  assert.ok(gameScript.includes("$('bagTeam').addEventListener('change'"));
  assert.ok(gameScript.includes("e.target.closest('select[data-companion-work]')"));
  assert.ok(gameScript.includes('COMPANION_WORK_JOB_ORDER.forEach'));
  assert.ok(gameScript.includes('t.workProfileT=Math.max(0,(t.workProfileT||0)-dt)'));
  assert.ok(gameScript.includes('if(!t.workProfile||t.workProfileT<=0)'));
  assert.ok(gameScript.includes('var workProfile=t.workProfile,guardAssignment=workProfile.guard'));
  assert.ok(gameScript.includes('workProfile.bonusItem'));
  assert.ok(gameScript.includes('(workProfile.guard?(workProfile.habitatMatch?1.15:1.08):1)'));
  assert.ok(gameScript.includes('(guardAssignment?1.2:1)'));
  assert.ok(gameScript.includes('member.workJob=job;member.work=10;member.workProfile=null;member.workProfileT=0;'));
});


test('global preference objects are bounded, backed up, and recover from malformed JSON', () => {
  const names=['parsePreferenceObject','readPreferenceObject','writePreferenceObject','readPreferenceString','writePreferenceString','readPreferenceChoice'];
  const source=names.map(extractGameFunction).join('\n');
  const values=new Map();
  const storage={
    getItem(key){return values.has(key)?values.get(key):null;},
    setItem(key,value){values.set(key,String(value));}
  };
  const helpers=new Function('localStorage',source+';return {parsePreferenceObject,readPreferenceObject,writePreferenceObject,readPreferenceString,writePreferenceString,readPreferenceChoice};')(storage);
  values.set('graphics','{broken');
  values.set('graphics_backup','{"quality":1,"areaRadius":85}');
  assert.deepEqual(helpers.readPreferenceObject('graphics',256),{quality:1,areaRadius:85});
  assert.equal(values.get('graphics'),'{"quality":1,"areaRadius":85}','valid backup should repair malformed primary data');
  assert.equal(helpers.parsePreferenceObject('x'.repeat(257),256),null,'oversized JSON must be rejected before parsing');
  assert.equal(helpers.parsePreferenceObject('[]',256),null,'arrays are not accepted as preference records');
  assert.equal(helpers.writePreferenceObject('graphics',{quality:2},256),true);
  assert.equal(values.get('graphics_backup'),'{"quality":1,"areaRadius":85}','last valid preference snapshot should be retained');
  assert.equal(helpers.writePreferenceObject('graphics',{note:'x'.repeat(300)},64),false,'oversized writes must be refused');
  assert.equal(values.get('graphics'),'{"quality":2}','failed writes must not replace the previous preference');
});

test('preference choices recover only allowlisted strings and keep valid backups intact', () => {
  const names=['readPreferenceString','writePreferenceString','readPreferenceChoice'];
  const source=names.map(extractGameFunction).join('\n');
  const values=new Map([['language','bad'],['language_backup','ur']]);
  const storage={getItem(key){return values.has(key)?values.get(key):null;},setItem(key,value){values.set(key,String(value));}};
  const helpers=new Function('localStorage',source+';return {readPreferenceChoice,writePreferenceString};')(storage);
  const language=helpers.readPreferenceChoice('language',2,value=>value==='en'||value==='ur','en');
  assert.equal(language,'ur');
  assert.equal(values.get('language'),'ur','the valid backup should repair the primary key');
  assert.equal(values.get('language_backup'),'ur','repair must not overwrite the valid backup with corrupt data');
  assert.equal(helpers.readPreferenceChoice('difficulty',16,value=>['easy','normal','hard'].includes(value),'normal'),'normal');
  assert.equal(values.get('difficulty'),'normal','safe defaults should replace invalid saved choices');
  assert.equal(helpers.writePreferenceString('language','en',2),true);
  assert.equal(values.get('language_backup'),'ur');
});

test('saved movement bindings are normalized to four unique supported keys', () => {
  const normalize=new Function(extractGameFunction('normalizeKeyBindings')+';return normalizeKeyBindings;')();
  const result=normalize({forward:'KeyR',backward:'KeyR',left:'NotAKey',right:'ArrowRight',extra:'KeyQ'});
  assert.deepEqual(result,{forward:'KeyR',right:'ArrowRight',backward:'KeyS',left:'KeyA'});
  assert.equal(new Set(Object.values(result)).size,4);
  assert.deepEqual(normalize([]),{forward:'KeyW',backward:'KeyS',left:'KeyA',right:'KeyD'});
});

test('outfit slot normalization accepts only three complete allowlisted appearance records', () => {
  const options={
    skinTone:['0xc98f68','0x8f5d43'],outfitColor:['0x527b70','0x8a633e'],
    hairStyle:['0','1','2','3','4'],hairColor:['0x211c19','0x493226'],
    eyeColor:['0x6b8f91','0x527b4b'],facialHair:['0','1','2'],
    legsColor:['0x314a40','0x69503a'],accessoryColor:['0x69452d','0x35483f']
  };
  const $=id=>({options:(options[id]||[]).map(value=>({value}))});
  const source=['validSelectValue','normalizeOutfitRecord','normalizeOutfitSlots'].map(extractGameFunction).join('\n');
  const helpers=new Function('$',source+';return {normalizeOutfitRecord,normalizeOutfitSlots};')($);
  const valid={character:2,skin:'0xc98f68',outfit:'0x527b70',hair:'1',hairColor:'0x211c19',eyes:'0x6b8f91',facialHair:'0',legs:'0x314a40',accessory:'0x69452d'};
  const slots=helpers.normalizeOutfitSlots({'0':valid,'1':{...valid,eyes:'not-a-color'},'3':valid});
  assert.deepEqual(Object.keys(slots),['0']);
  assert.deepEqual(slots['0'],valid);
  assert.equal(helpers.normalizeOutfitRecord({...valid,character:4}),null);
  assert.deepEqual(helpers.normalizeOutfitSlots([]),{});
});


test('global settings use strict bounded values instead of coercing malformed stored preferences', () => {
  for(const marker of [
    "typeof savedGraphics.quality==='number'",
    "savedGraphics.quality<=2",
    "savedGraphics.areaRadius<=160",
    "typeof savedAudio.music==='number'",
    "typeof cp.deadzone==='number'",
    "typeof cp.invertY==='boolean'",
    "typeof ap.contrast==='boolean'",
    "readPreferenceChoice(GAME_LANGUAGE_KEY,2",
    "readPreferenceChoice(DIFFICULTY_KEY,16",
    "readPreferenceChoice(NOTIFY_KEY,4,validNotificationDuration"
  ])assert.ok(gameScript.includes(marker),'missing strict preference validation: '+marker);
});


test('runtime diagnostics sanitize messages, deduplicate repeats, and stay bounded', () => {
  const source = ['safeDiagnosticText', 'addDiagnostic'].map(extractGameFunction).join(String.fromCharCode(10));
  const diagnostics = [];
  const helpers = new Function('runtimeDiagnostics', source + ';return {safeDiagnosticText,addDiagnostic};')(diagnostics);
  assert.equal(helpers.safeDiagnosticText('bad' + String.fromCharCode(1) + 'message', 40), 'bad message');
  assert.equal(helpers.safeDiagnosticText(new Error('audio failed'), 40), 'audio failed');
  const entry = helpers.addDiagnostic('render', 'renderer failed', 's'.repeat(5000));
  assert.equal(entry.stack.length, 4000);
  helpers.addDiagnostic('render', 'renderer failed', 'second stack');
  assert.equal(diagnostics.length, 1, 'repeated identical failures should be grouped');
  assert.equal(diagnostics[0].repeatCount, 2);
  for (let i = 0; i < 110; i++) helpers.addDiagnostic('failure-' + i, 'failure ' + i, '');
  assert.equal(diagnostics.length, 100, 'diagnostic history must remain capped');
  assert.equal(diagnostics[0].type, 'failure-10');
});

test('major startup, save, audio, streaming, WebGL, and frame failures have actionable diagnostics', () => {
  for (const marker of [
    "window.addEventListener('error'",
    "window.addEventListener('unhandledrejection'",
    "reportRuntimeIssue('world-catalog-write'",
    "reportRuntimeIssue('save-write'",
    "reportRuntimeIssue('save-load'",
    "reportRuntimeIssue('save-version-unsupported'",
    "reportRuntimeIssue('audio-init'",
    "reportRuntimeIssue('audio-resume'",
    "reportRuntimeIssue('world-streaming'",
    "reportRuntimeIssue('webgl-context-lost'",
    "addDiagnostic('renderer-unavailable'",
    "addDiagnostic('frame-'+frameStage",
    "runtimePhase==='starting'",
    "runtimePhase!=='failed'"
  ]) assert.ok(gameScript.includes(marker), 'missing runtime failure route: ' + marker);
  assert.ok(html.includes('id="runtimeNotice"'), 'recoverable runtime notice must exist');
  assert.ok(gameScript.includes('page:location.pathname'), 'diagnostic export must omit query strings and hashes');
});

test('audio resume and playback failures are contained without terminating gameplay', () => {
  assert.match(gameScript, /resumeResult\.catch\(function\(e\)\{[\s\S]*?reportRuntimeIssue\('audio-resume'/);
  assert.match(gameScript, /catch\(e\)\{if\(!audioFailureReported\)[\s\S]*?reportRuntimeIssue\('audio-playback'/);
  assert.match(gameScript, /audioCtx=null;musicBus=null;effectsBus=null/);
  assert.match(gameScript, /Gameplay will continue without sound/);
});
