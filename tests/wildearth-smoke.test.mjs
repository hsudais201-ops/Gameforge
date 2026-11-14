import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../wildearth3d.html', import.meta.url), 'utf8');
const scriptStart = html.indexOf('<script>');
const scriptEnd = html.indexOf('</script>', scriptStart);
const gameScript = scriptStart >= 0 && scriptEnd > scriptStart ? html.slice(scriptStart + 8, scriptEnd) : '';
const projectApi = readFileSync(new URL('../functions/api/projects/index.js', import.meta.url), 'utf8');

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
  assert.match(gameScript, /requestAnimationFrame\(function\(\)\{setTimeout\(function\(\)\{try\{updateWorldStreaming\(true\)/);
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
  assert.ok(gameScript.includes('areaRadii[clamp(savedGraphics.area|0,0,2)]'), 'legacy world-area settings must migrate');
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
  assert.ok(gameScript.includes("savedAudio.subtitles==='boolean'"));
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
  for (const marker of ['mfwilds3d_outfit_slots_v1', 'function readCurrentOutfit()', 'function validSelectValue(', 'all[$(\'outfitSlot\').value]=readCurrentOutfit()', "$(id).dispatchEvent(new Event('change'))", "applyCharacterStyle(look.character)"]) {
    assert.ok(gameScript.includes(marker), 'missing outfit-slot marker: ' + marker);
  }
});

test('character appearance is restored from global profile storage when a world loads', () => {
  assert.ok(gameScript.includes('function restoreCharacterAppearance()'));
  assert.match(gameScript, /restoreCharacterAppearance\(\);/);
  assert.ok(gameScript.includes("localStorage.getItem('mfwilds3d_skin')"));
  assert.ok(gameScript.includes("localStorage.getItem('mfwilds3d_outfit')"));
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
  for (const marker of ['stormLevel=clamp((rainLevel-0.38)*2.1,0,1)', 'rainWindX=0.72+Math.sin(clock*0.13)*stormLevel*2.6', 'lightningCooldown=10+random()*18', 'lightningFlashTime=0.16+random()*0.12', "flash.style.opacity=lightningFlashTime>0"]) {
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
  for (const marker of ["mfwilds3d_language_v1", 'var GAME_TEXT={', "ur:{play:'منتخب دنیا کھیلیں'", 'function gameText(key)', 'function applyGameLanguage()', 'localStorage.setItem(GAME_LANGUAGE_KEY,gameLanguage)']) {
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
  const validator = new Function('SPECIES','HALF',gameScript.slice(start, end) + ';return validStructureCounts;')([{id:0}],300);
  assert.equal(validator({walls:Array(120).fill({x:0,z:0,t:'wall'}),fires:[],beds:[],chests:[]}), true);
  assert.equal(validator({walls:Array(100).fill({x:0,z:0,t:'wall'}),fires:Array(21).fill({x:0,z:0,t:'fire'})}), false);
  assert.equal(validator({walls:Array(121).fill({x:0,z:0,t:'wall'})}), false);
  assert.equal(validator({walls:'corrupt'}), false);
  assert.ok(gameScript.includes('validStructureCounts(parsed)'));
  assert.match(gameScript, /validStructureCounts\(check\)/);
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

test('low and balanced graphics reduce environmental shadow workload without changing resolution', () => {
  assert.ok(gameScript.includes("{name:'Low',shadows:false,detailShadows:false"));
  assert.ok(gameScript.includes("{name:'Balanced',shadows:true,detailShadows:false"));
  assert.ok(gameScript.includes("{name:'High',shadows:true,detailShadows:true"));
  assert.ok(gameScript.includes('detailShadowMeshes.push(im)'));
  assert.ok(gameScript.includes('detailShadowMeshes.push(stumpIM)'));
  assert.ok(gameScript.includes('detailShadowMeshes[di].castShadow=profile.detailShadows'));
  assert.ok(gameScript.includes('renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5))'));
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
  assert.ok(gameScript.includes("progress:{level:P.level,xp:P.xp,statPoints:P.statPoints,stats:P.stats,caught:catchIndex}"));
  assert.ok(gameScript.includes("awardXP(25+(SPECIES[sc.sp].r==='rare'?15"));
  assert.ok(gameScript.includes("data-stat-upgrade"));
  assert.ok(html.includes('id="creatureIndex"'));
  assert.ok(gameScript.includes("CAUGHT ×'+catchIndex[ci]"));
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

test('save validation rejects malformed or out-of-bounds world records before loading', () => {
  const start=gameScript.indexOf('function validStructureCounts(parsed)');
  const end=gameScript.indexOf('function awardXP',start);
  assert.ok(start>=0&&end>start,'save validator must be present');
  const validate=new Function('SPECIES','HALF','NSLOTS',gameScript.slice(start,end)+';return validStructureCounts;')([{id:0},{id:1}],300,36);
  assert.equal(validate({P:{x:0,z:0},team:[{sp:0}],walls:[{x:10,z:10,t:'wall'}]}),true);
  assert.equal(validate({team:[{sp:99}]}),false,'unknown creature species must be rejected');
  assert.equal(validate({team:Array.from({length:33},()=>({sp:0}))}),false,'oversized companion lists must be rejected');
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
  assert.ok(gameScript.includes('var th=\'<div class="partyHead"><strong>Party</strong>'));
  assert.ok(gameScript.includes('team.forEach(function(t,ti)'));
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
  assert.ok(gameScript.includes('renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5))'));
  assert.ok(gameScript.includes('renderer.setSize(vw,vh,false)'));
});

test('companions resolve movement against world obstacles and avoid invalid water or world-edge positions', () => {
  assert.ok(gameScript.includes('var companionNext={x:t.x+ddx/dl*sp2*dt,z:t.z+ddz/dl*sp2*dt}'));
  assert.ok(gameScript.includes('pushOutBoxes(companionNext,0.72)'));
  assert.ok(gameScript.includes('heightAt(companionNext.x,companionNext.z)>WATER+0.2'));
  assert.ok(gameScript.includes('t.x=companionNext.x;t.z=companionNext.z;t.speed=Math.min(1,sp2/6)'));
  assert.ok(gameScript.includes('else{t.speed=0;}'));
});
