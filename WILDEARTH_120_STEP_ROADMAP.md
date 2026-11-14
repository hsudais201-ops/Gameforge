# WILDEARTH — 120-Step Production Roadmap

Branch: `feature/wildearth-browser-prototype`  
Game entry: `wildearth3d.html`

This is the execution tracker for the next development stages. A checked item means the capability is present in the current prototype or the latest commits and has been verified at source level; it does **not** imply full gameplay QA. Unchecked items are future work, not claimed as completed.

## A. Core foundation and stability
- [x] 01. Keep the game in a single browser-loadable entry point for the current prototype.
- [x] 02. Add a guarded animation loop with visible error reporting.
- [x] 03. Clamp frame delta to reduce simulation jumps after slow frames.
- [x] 04. Add local save snapshots and a backup save.
- [x] 05. Recover from a corrupt primary save using the backup.
- [x] 06. Preserve compatibility with older inventory layouts.
- [x] 07. Add automated smoke tests for startup, menu, and world entry.
- [x] 08. Add a deterministic test seed for reproducible bug reports.
- [x] 09. Add structured runtime diagnostics and an exportable error report.
- [x] 10. Add a versioned save migration test suite.

## B. Player, controls, and camera
- [x] 11. Maintain the detailed player model and its animation rig.
- [x] 12. Support keyboard movement and mobile joystick movement.
- [x] 13. Add sprint stamina drain and regeneration.
- [x] 14. Add camera-relative movement.
- [x] 15. Add remappable keyboard controls.
- [x] 16. Add configurable joystick dead-zone and sensitivity.
- [x] 17. Add camera sensitivity and inversion settings.
- [x] 18. Add optional aim assist for touch combat.
- [x] 19. Add swimming movement and underwater camera handling.
- [x] 20. Add player status effects with clear HUD indicators.

## C. Character and customization
- [x] 21. Keep the detailed character mesh rather than replacing it with a simplified placeholder.
- [x] 22. Support skin tone, outfit color, eye color, and hair customization.
- [x] 23. Support multiple hair styles and facial-hair options.
- [x] 24. Provide character presets.
- [x] 25. Add a preview turntable and lighting in the customization screen.
- [x] 26. Add separate head, torso, legs, and accessory customization slots.
- [x] 27. Add cosmetic unlock tracking.
- [x] 28. Add outfit save slots.
- [x] 29. Add animation preview controls in customization.
- [x] 30. Validate customization persistence across world changes.

## D. World generation and streaming
- [x] 31. Generate procedural terrain height.
- [x] 32. Stream world content around the player.
- [x] 33. Provide configurable world loading distance.
- [x] 34. Use instanced resources for dense environmental objects.
- [x] 35. Add distinct named biomes with readable boundaries.
- [x] 36. Add biome-specific ground materials and foliage.
- [x] 37. Add biome-specific resource distribution.
- [x] 38. Add caves with entrances, interior lighting, and exit paths.
- [ ] 39. Add rivers, ponds, and connected water flow.
- [x] 40. Add world seed entry and seed display.

## E. Ecology and creatures
- [x] 41. Spawn multiple wildlife species.
- [x] 42. Give creatures health, damage reactions, and recovery.
- [x] 43. Add flee, alert, graze, rest, and wander behavior.
- [x] 44. Add herd cohesion and separation.
- [x] 45. Add juvenile growth and parent-follow behavior.
- [x] 46. Add creature taming and companion following.
- [x] 47. Add companion Follow, Hold, and Defend orders.
- [x] 48. Add species-specific habitat and biome preference tables.
- [x] 49. Add breeding, offspring inheritance, and population limits.
- [x] 50. Add creature needs, feeding preferences, and trust levels.

## F. Combat and hostile encounters
- [x] 51. Add player attack and weapon progression.
- [x] 52. Add hostile Wraith enemies.
- [x] 53. Add Wraith windup and lunge attacks.
- [x] 54. Add Shade, Stalker, and Brute variants.
- [x] 55. Add player damage feedback and centralized damage handling.
- [x] 56. Add companion interception and guardian attacks.
- [x] 57. Add weapon hit validation and clearer hit confirmation.
- [x] 58. Add dodge or evade with stamina cost.
- [x] 59. Add enemy resistance and vulnerability profiles.
- [x] 60. Add a boss encounter with multi-stage behavior.

## G. Survival, weather, and world events
- [x] 61. Add hunger and health recovery.
- [x] 62. Add day/night progression.
- [x] 63. Add rain particle effects.
- [x] 64. Add campfire protection from Wraiths.
- [x] 65. Add temperature and exposure.
- [x] 66. Add wetness and drying behavior.
- [x] 67. Add storms with wind and lightning.
- [x] 68. Add seasonal world-state changes.
- [x] 69. Add rare world events and discoverable event rewards.
- [x] 70. Add survival difficulty presets.

## H. Inventory, crafting, and equipment
- [x] 71. Maintain a 36-slot inventory with a 9-slot hotbar.
- [x] 72. Support moving, swapping, stacking, and splitting item stacks.
- [x] 73. Add armor equip and unequip.
- [x] 74. Add crafting recipes and quantity selection.
- [x] 75. Check ingredients and inventory capacity before crafting.
- [x] 76. Add item durability and repair.
- [x] 77. Add tool tiers with gathering-speed differences.
- [x] 78. Add storage chests with persistent contents.
- [x] 79. Add item sorting and quick-transfer controls.
- [x] 80. Add crafting category filters and recipe search.

## I. Building and player base
- [x] 81. Add placeable walls, floors, fires, torches, and beds.
- [x] 82. Add placement preview and collision-aware placement.
- [x] 83. Add bedroll respawn and safe spawn validation.
- [x] 84. Add snap points and grid-aligned building.
- [x] 85. Add doors, gates, and roof pieces.
- [x] 86. Add structural integrity and support rules.
- [x] 87. Add storage, workbench, and cooking stations.
- [x] 88. Add base comfort and protection ratings.
- [x] 89. Add build-piece upgrade and dismantle interactions.
- [x] 90. Add base save validation and structure limits.

## J. Progression, quests, and exploration
- [x] 91. Add achievement tracking and persistent unlocks.
- [x] 92. Add creature, night-survival, Wraith, crafting, and building milestones.
- [x] 93. Track actual player travel distance.
- [x] 94. Add 500, 2,500, and 10,000 world-unit exploration milestones.
- [x] 95. Add a quest journal with active, completed, and abandoned states.
- [x] 96. Add tutorial objectives that teach core systems.
- [x] 97. Add named landmarks and discovery notifications.
- [x] 98. Add a map with explored-area fog.
- [x] 99. Add collectible lore and world-story entries.
- [x] 100. Add a multi-stage main quest with clear completion conditions.

## K. Interface, audio, and accessibility
- [x] 101. Add a main menu, pause menu, and settings panel.
- [x] 102. Add HUD bars for health, hunger, and stamina.
- [x] 103. Add target information for nearby wildlife.
- [x] 104. Add a dedicated quest and objective panel.
- [x] 105. Add audio settings and separate music/effects volume.
- [x] 106. Add original ambient, weather, creature, and UI sound effects.
- [x] 107. Add subtitle and notification duration settings.
- [x] 108. Add scalable UI text and high-contrast mode.
- [x] 109. Add controller/gamepad navigation.
- [x] 110. Add localization-ready text tables.

## L. Performance, QA, and release
- [x] 111. Add Low, Balanced, and High graphics profiles.
- [x] 112. Keep resolution independent from graphics-quality selection.
- [x] 113. Cap renderer pixel ratio for constrained hardware.
- [ ] 114. Profile CPU and GPU frame time on low-end Chromebook hardware.
- [x] 115. Add adaptive shadow and particle budgets per quality profile.
- [x] 116. Add memory cleanup for streamed-out objects and effects.
- [x] 117. Add mobile touch-layout and viewport regression tests.
- [ ] 118. Add long-session save/load and world-streaming stress tests.
- [ ] 119. Add browser compatibility checks and release build validation.
- [ ] 120. Publish a tested release build with known limitations and patch notes.

- Localization foundation: sound captions now use a persisted English/Urdu text table with a language selector; the existing subtitle enable/disable preference remains persisted.
- Runtime cleanup: floating combat text is capped at 60 DOM nodes and removed safely; streamed instance buffers now mark only the changed mesh dirty, avoiding redundant GPU uploads.

- Underwater camera: third-person framing moves closer/lower while swimming and a lightweight blue underwater tint communicates submersion.

- Character outfits: added three independent local outfit save slots with validation before applying selections; appearance remains stored globally and is restored when switching worlds.

- Boss encounter: introduced the Night Herald after the seventh survived night, with three escalating phases, phase-specific movement/attack tuning, a live boss-health display, persistent defeat state, and crystal/gold rewards.
- Gathering progression: verified existing Stone/Copper/Iron tool tiers use distinct gathering cooldowns and mining damage.

- Tool durability and repair: Stone, Copper, and Iron tools/weapons now wear with use, display durability in slot tooltips, break at zero, and can be repaired with tier-appropriate materials. Durability persists per world save.

- Storms: rain intensity now drives changing wind vectors and timed lightning flashes, with storm warnings and a visible screen flash.
- Seasons: five-day seasonal cycles alter environmental temperature, water palette, and the HUD season label; the season derives from saved world time.

- Rare world event: after three survived nights, a glowing fallen star appears in the world. Players can discover and collect it for Lumen Crystal and Gold Ore; the one-time reward claim persists in the world save.

- Character preview: added a persisted turntable toggle, dedicated preview light toggle, and Idle/Walk/Attack animation preview controls in the customization screen.

- Character appearance slots: separated head/skin, torso/outfit, leg fabric, and accessory/leather color controls; the new leg/accessory choices persist globally and are included in the three outfit presets.

- Cosmetic progression: three appearance rewards unlock from Night Survivor, Wraith Slayer, and Pathfinder achievements; locked color choices remain disabled until earned, and unlock IDs persist per world.

- Memory safeguards: capped transient spark meshes at 500, retained the 60-node floating-text cap, and explicitly dispose unique capture-projectile geometries/materials when projectiles leave the scene. Shared instanced world geometry remains reused rather than recreated for streamed chunks.

- Building pieces: added craftable wooden doors, gates, and pitched roof sections. Doors/gates toggle open and closed, update collision behavior, and preserve open state in world saves.

- Base stations: added craftable Workbench and Cooking Pot. The workbench opens inventory crafting; the cooking pot converts berries and fiber into jam.
- Structural rules and base ratings: roofs require nearby wall/door/gate support, structure placement is capped at 120 pieces, corrupted/oversized structure arrays are rejected during save validation, and nearby base comfort/protection ratings appear in the HUD.

- Base interactions: nearby wooden walls can be upgraded to reinforced stone using four Stone; nearby wall/floor/door/gate/roof/workbench/cooking-pot pieces can be dismantled with partial material refunds. Contextual touch-friendly buttons appear near the player.

- Localization foundation: added persisted English/Urdu interface language selection and a reusable UI text table for core menu, navigation, day/night, and base-rating labels. Sound captions already have their own bilingual text table.

- Caves: added a surface cave entrance, a bounded underground chamber with crystal formations and point lighting, an entry/exit interaction, and cave-specific ground/temperature/oxygen handling.

## Current verified implementation batch
- Graphics scaling: added Low/Balanced/High weather particle budgets that rebuild rain buffers when quality changes, alongside the existing adaptive shadow settings.
- World/build foundations: added optional world-seed entry and reproducibility display; building pieces already snap to a consistent 3-metre grid and are now covered by smoke tests.
- Keyboard accessibility: added four remappable movement bindings with reserved-key and duplicate checks; bindings persist locally.
- Survival presets: added persistent Explorer/Easy, Survivor/Normal, and Wilderness/Hard difficulty choices that scale incoming damage and hunger drain.
- Player condition HUD: added accessible live status labels for critical health, starvation, hunger, exhaustion, and active dodge windows.
- Controls and combat: persisted joystick dead-zone, camera sensitivity and vertical inversion settings; added keyboard/touch dodge with stamina cost, movement burst, and brief damage immunity.
- Crafting UX: added recipe text search across names and ingredients, plus category filtering with empty-category headings hidden.
- Inventory convenience: added storage-only sorting that preserves the hotbar, plus quick chest deposit/withdraw controls with stack limits and partial-transfer handling.
- Storage system foundation: added a craftable 18-slot storage chest, nearby interaction UI, stack deposit/withdraw with capacity checks, and per-world chest-content save/load.
- Deterministic world seeds: each world now stores a seed; new worlds accept an optional numeric or text seed, and `?seed=12345` overrides the selected world for reproducible test sessions. Procedural randomness now uses the seeded generator; the seed is included in saves and diagnostic exports.
- QA foundation: added Node.js smoke tests for script syntax, startup/menu wiring, seeded RNG repeatability, seed override wiring, and legacy save compatibility; GitHub Actions runs them on pushes and pull requests to the prototype branch.
- Companion commands: Follow / Hold / Defend, saved per world.
- Achievement expansion: 12 milestones.
- Exploration tracking: distance is accumulated from actual player movement and saved per world.
- Achievement expansion: 15 milestones total, including Wanderer, Pathfinder, and World Roamer.
- Quest journal: nine automatically progressing objectives, active/completed/abandoned states, reactivation, completion alerts, progress bars, and per-world persistence.
- Exploration: 30×30 fog-of-war map grid, five discoverable named landmarks, discovery alerts, and lore entries saved per world.
- Progression: four field tutorial objectives and a four-stage main story with sequential completion conditions.
- Diagnostics and accessibility: local runtime error/unhandled-rejection capture with JSON report export; Normal/Large UI text and high-contrast mode, saved locally.


- World ecology: added five deterministic biomes (Sunlit Meadow, Mosswood Forest, Windscar Highlands, Whispering Marsh, Frostfall Ridge), biome-specific terrain palettes, habitat-weighted wildlife selection, and biome-weighted tree/bush/ore placement.
- Water and exposure: player can enter deep water, swims at reduced speed, floats at the water surface, consumes oxygen and stamina, takes drowning damage at zero oxygen, and recovers oxygen on land. Rain and swimming increase wetness; dry weather dries the player; cold wet exposure causes damage. Wetness and oxygen are included in version-5 saves with safe defaults for older saves.

- Wildlife ecology: adults of the same species can breed when calm and nearby; offspring inherit blended personality traits with small variation, and a hard local population cap prevents runaway growth. Parent links are cleaned when offspring are removed.

- Creature care: wildlife now has hunger needs and species-specific preferred foods. Feeding compatible berries or treats reduces hunger and builds trust; trust improves capture odds and is visible in the nearby-creature HUD.

- Combat refinement: melee hits now require a forward-facing weapon arc for wildlife and Wraiths, with visible hit bursts and numeric confirmation. Wraith Brutes resist weapon damage while Stalkers are more vulnerable; Shade remains baseline.

- Controller support: added Gamepad API polling with left-stick movement, right-stick camera look, face-button gather/dodge/use/catch actions, and shoulder/D-pad hotbar selection. Controller connection and disconnection are announced.

- Audio: added original synthesized ambient tones, distinct music/effects buses and persisted volume sliders. Browser audio initializes only after a user gesture; procedural effects cover gathering, capture, damage, rain, wildlife interactions, Wraith warnings, and button feedback.

## Verification policy
Source-level syntax and structural checks are not substitutes for playing the game. Browser, mobile, performance, and save-migration tests remain open until actually run on target devices.

- Save QA: extracted legacy inventory conversion into a pure migration helper and added executable tests for 30-slot-to-36-slot conversion, legacy cage-to-ball mapping, stack clamping, invalid-item rejection, and version-5 save fallback defaults.
- Mobile QA: added smoke-test regression checks for viewport metadata, touch controls, narrow/short viewport CSS breakpoints, and renderer resize handling. These are source-level regression checks, not physical-device gameplay tests.

- Combat accessibility: added a mobile-only, limited-cone aim assist for nearby wildlife and Wraiths; keyboard/controller aiming is unchanged.
- Gathering progression: copper/iron/stone pick tiers and the axe now have distinct gathering cooldowns in addition to existing damage differences.

- Accessibility captions: added a persisted sound-caption toggle and live subtitle line for gathering, capture, damage, rain, wildlife, and danger cues. Captions remain available when sound effects are muted or unavailable.
