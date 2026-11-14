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
  assert.match(gameScript, /requestAnimationFrame\(frame\)/, 'animation loop must be started');
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
  assert.match(gameScript, /version:5/);
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

test('settings panel fits short and narrow screens and scrolls all controls', () => {
  assert.match(html, /width:min\\(94vw,520px\\)/);
  assert.match(html, /max-height:calc\\(100dvh - 20px/);
  assert.match(html, /overflow-y:auto/);
  assert.match(html, /overscroll-behavior:contain/);
  assert.match(html, /grid-template-columns:minmax\\(0,1fr\\) minmax\\(110px,auto\\)/);
  assert.match(html, /@media\\(max-height:560px\\)/);
  for (const id of ['settingsClose','qualitySelect','musicVolume','cameraSensitivity','exportDiagnostics','settingsMenu']) {
    assert.match(html, new RegExp('id="' + id + '"'), 'settings control must remain accessible: ' + id);
  }
});

test('menu scrolling remains touch-accessible despite gameplay touch-action rules', () => {
  assert.match(html, /#mainMenu,#settingsPanel,#questPanel,#mapPanel,#chestPanel,#pausePanel,#deathPanel,#bag,[\\s\\S]*?touch-action:pan-y/);
  assert.match(html, /-webkit-overflow-scrolling:touch/);
  assert.match(html, /#mainMenu \\.menuCard[^{]*\\{[^}]*max-height:calc\\(100dvh/);
  assert.match(html, /scrollbar-color:#718d77/);
});

test('all game menus and dialogs support bounded vertical scrolling', () => {
  for (const id of ['mainMenu','questPanel','mapPanel','chestPanel','pausePanel','deathPanel']) {
    assert.match(html, new RegExp('#' + id + '[^{]*\\{[^}]*overflow-y:auto'), id + ' must scroll vertically');
  }
  assert.match(html, /\\.menuCard,\\.questCard,\\.mapCard,\\.chestCard,\\.pauseCard,\\.deathCard\\{[^}]*max-height:calc\\(100dvh/);
  assert.match(html, /#bag\\{[^}]*overscroll-behavior:contain/);
  assert.match(html, /@media\\(max-height:560px\\)/);
});

test('settings markup has clean audio controls and restores saved world-area selection', () => {
  assert.doesNotMatch(html, /\\\\n<label class="settingRow">Ambient music volume/);
  assert.ok(html.indexOf('id="captionLanguage"') < html.indexOf('id="musicVolume"'), 'caption language should appear before music volume');
  assert.ok(gameScript.includes("$('areaSelect').value=String(areaLevel);"));
  assert.ok(gameScript.includes("applyAreaLevel(+this.value)"));
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
  for (const marker of ['P.swimming=!caveMode&&waterDepth>0.55', 'waterSurface-0.45-P.y', 'P.oxygen=Math.max(0,P.oxygen-dt*8)', "playerDamage(4*dt,'Drowning')", '(P.swimming?0.58:1)']) {
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
  assert.match(gameScript, /version:5/);
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
  for (const marker of ['var riverPaths=[', 'function buildRiver(points)', 'function buildPond(x,z,radius)', 'function riverDepthAt(x,z)', 'riverPaths.forEach(buildRiver)', 'buildPond(34,18,4.2)', 'Math.max(WATER-groundY,riverDepth)', 'waterSurface-0.45', 'updateRivers();']) {
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
  const validator = new Function(gameScript.slice(start, end) + ';return validStructureCounts;')();
  assert.equal(validator({walls:Array(120).fill({}),fires:[],beds:[],chests:[]}), true);
  assert.equal(validator({walls:Array(100).fill({}),fires:Array(21).fill({})}), false);
  assert.equal(validator({walls:Array(121).fill({})}), false);
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
