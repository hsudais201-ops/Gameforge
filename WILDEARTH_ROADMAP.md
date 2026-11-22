# WILDEARTH — Master Development Roadmap

**Status:** Active development  
**Canonical plan:** This is the single source of truth for WILDEARTH development. Older WILDEARTH roadmaps and numbered checklists have been retired.  
**Development branch:** `feature/wildearth-browser-prototype`  
**Playable entry:** `wildearth3d.html`  
**Current target:** A polished, original, third-person open-world creature-collection survival adventure.

---

## Product vision

WILDEARTH is an original 3D survival-adventure game about exploring a vast living world, discovering and befriending extraordinary creatures, surviving hostile nights, building a home, and uncovering the mystery behind the Wraiths.

The intended experience combines:
- Open-world exploration across distinct environments, caves, landmarks, and secrets.
- Creature discovery, capture, care, collection, breeding, and meaningful companions.
- Responsive third-person movement, traversal, combat, and creature-assisted abilities.
- Survival, gathering, crafting, equipment, base construction, and useful stations.
- Quests, world events, bosses, progression, and a story worth completing.
- A colorful, detailed, stylized 3D presentation with expressive original creature designs.

The game may take inspiration from the broad creature-collection survival genre, but all WILDEARTH characters, creature designs, world layouts, UI, animations, names, audio, and story must remain original. Do not copy Palworld or another game's protected assets or distinctive content one-to-one.

## How to use this roadmap

- **Done** means the system exists in the current source and has automated/source-level coverage where practical. It does not automatically mean device or human gameplay QA has passed.
- **In progress** means a foundation exists but meaningful work or validation remains.
- **Planned** means it is not yet implemented to an acceptable playable standard.
- The agent must inspect the current branch before each task, because code and status can change between sessions.
- Work in small, reviewable batches. Implement the highest-priority unfinished item, add regression tests, run the test suite, review the diff, and commit only successful work.
- Do not mark an item Done because a button, placeholder, mock object, or untested code path exists.
- Preserve save compatibility. Add migrations when save data changes.
- Do not change the user's display resolution. Respect Low/Balanced/High graphics settings and low-memory Chromebook hardware.
- Do not merge to the default branch or deploy/promote production without explicit approval.

## Current foundation

The prototype already contains a substantial playable foundation: a streamed seeded world, multiple biomes, caves and water, customizable player, wildlife and Wraith enemies, capture and companions, survival conditions, inventory/crafting/building, quests and exploration, save migration, diagnostics, and graphics profiles. Companion commands currently include Follow, Hold, Defend, and Attack.

These foundations are not a claim that the game is finished. The remaining roadmap focuses on making each system feel complete, coherent, polished, balanced, and reliable.

---

# Development phases

## Phase 0 — Project health and playable baseline

**Status: In progress**

- [x] Keep the 3D game launchable from `wildearth3d.html`.
- [x] Maintain automated Node.js smoke tests in GitHub Actions.
- [x] Add save backups, legacy migration, input guards, and runtime diagnostics.
- [x] Add Low, Balanced, and High graphics profiles with capped pixel ratio.
- [x] Add deterministic world seeds and reproducible test sessions.
- [ ] Establish a repeatable browser gameplay smoke-test route: menu → create/load world → play → save → return → reload.
- [ ] Add a single documented development command/checklist for syntax, smoke tests, and release checks.
- [ ] Ensure every major runtime failure produces a useful, non-crashing diagnostic message.
- [ ] Audit all persistent data for versioning, bounds, invalid values, and safe defaults.
- [ ] Add regression tests for every bug fixed in future development.

**Exit gate:** The game starts reliably, a world can be created and resumed, saves survive reload, and CI passes.

## Phase 1 — Player feel, camera, animation, and combat

**Status: In progress**

- [x] Third-person player movement, camera-relative controls, sprint, dodge, swimming, and keyboard/touch/gamepad input.
- [x] Character customization, presets, outfit slots, and animation preview foundation.
- [ ] Tune acceleration, deceleration, turning, jump/fall response, slope handling, and ground contact.
- [ ] Make camera collision, terrain clipping, indoor framing, and target tracking reliable.
- [ ] Complete a consistent player animation set: idle, walk, run, sprint, jump, fall, land, swim, gather, interact, dodge, hit, death, and weapon attacks.
- [ ] Blend animation states smoothly and prevent foot sliding, snapping, and stuck poses.
- [ ] Add readable weapon classes with distinct reach, speed, impact, stamina cost, and attack patterns.
- [ ] Add deliberate combo windows, hit-stop/impact feedback, dodge timing, and clear enemy telegraphs.
- [ ] Add robust target selection and touch-friendly combat controls.
- [ ] Add accessibility settings for camera shake, sensitivity, aim assist, and input remapping.

**Exit gate:** Player movement and combat feel responsive on keyboard and touch; animations transition cleanly; combat feedback is readable.

## Phase 2 — Creature collection and companion gameplay

**Status: In progress**

- [x] Multiple original creature species with species-specific silhouettes and expressive face details.
- [x] Wildlife behaviors, habitat preferences, feeding, trust, capture, breeding, and companion following.
- [x] Companion Follow, Hold, Defend, and Attack commands.
- [ ] Create a complete creature roster plan with clear roles, rarity, habitats, diet, temperament, and progression.
- [ ] Give every species a distinct movement style, locomotion animation, idle behavior, and recognizable personality.
- [x] Add eight species-specific signature abilities: Pollen Mend, Cinder Burst, Tidal Snare, Stone Ward, Arc Spark, Briar Snare, Gale Break, and Prism Lance, with distinct support, damage, control, chain, and disruption effects.
- [x] Improve capture feedback: camera-aligned aiming, eased distance-scaled throw arcs, impact and capture pulses, clear success/escape feedback, and qualitative odds without exposing hidden formulas.
- [x] Add a collection journal with first-sighting discovery, biome hints, preferred-food care tips, signature abilities, caught counts, and missing-species filters.
- [x] Add persistent active-party and reserve storage management with deploy, slot swapping, release back to the wild, individual health, salve healing, and clear command feedback.
- [x] Improve companion navigation with bounded side-steering around trees, rocks, building collision volumes, water, steep terrain, and cave boundaries.
- [x] Add safe party recall/regroup, cave-transition positioning, stuck recovery, and soft/hard leash-distance behavior.
- [ ] Balance creature progression, trust, breeding, offspring inheritance, and population caps.
- [x] Add persistent companion bond progression: earn bond through exploration, care, combat, and signature abilities; gain up to 10% companion damage and modest work-yield bonuses; display and validate progress in active/reserve storage.
- [x] Add assignable companion work roles: native species specialties, foraging, lumbering, quarrying, prospecting, guard duty, and rest; preferred habitats improve work yields and guard effectiveness.
- [x] Add recoverable companion downed states: Wraiths can intercept companions in Defend/Attack orders, downed companions stop fighting, and Healing Salves restore them without permanent loss.
- [x] Add clear wild-creature knockout and recovery rules: player/Wraith damage causes a recoverable 18-second unconscious state, weakened creatures gain a bounded capture bonus, preferred feeding speeds recovery, and downed wildlife is excluded from predators, breeding, and further attacks.

**Exit gate:** Capturing, collecting, raising, commanding, and fighting alongside creatures is a complete repeatable gameplay loop.

## Phase 3 — Living world, exploration, and traversal

**Status: In progress**

- [x] Seeded streamed world, multiple biomes, caves, rivers, ponds, landmarks, map fog, and exploration discovery.
- [x] Day/night, weather, storms, seasons, temperature, wetness, oxygen, and survival exposure.
- [ ] Expand biome identity through unique silhouettes, plants, rocks, ambient effects, sounds, and encounter tables.
- [ ] Add more meaningful points of interest: ruins, camps, shrines, abandoned structures, caves, and hidden treasure areas.
- [ ] Improve cave readability, navigation, lighting, verticality, rewards, and exit safety.
- [ ] Add additional traversal tools and routes such as climbing, gliding, swimming upgrades, and creature-assisted travel.
- [ ] Design original mounts with mounting/dismounting, turning, acceleration, stamina, camera framing, and collision behavior.
- [ ] Add more environmental interactions: breakable resource nodes, harvestable plants, moving hazards, and discoverable secrets.
- [ ] Improve world streaming boundaries, spawn/despawn rules, and transition continuity.
- [ ] Add wildlife population simulation that remains performant and consistent when areas stream out.
- [ ] Add world-event variety and ensure rewards, timers, and one-time claims persist safely.
- [ ] Add exploration rewards that encourage curiosity rather than repetitive grinding.

**Exit gate:** The world feels varied and worth exploring; traversal is understandable; streaming does not cause visible or gameplay-breaking discontinuities.

## Phase 4 — Survival, resources, crafting, and equipment

**Status: In progress**

- [x] Health, hunger, stamina, temperature, wetness, oxygen, status effects, gathering, tools, durability, and repair.
- [x] Inventory, hotbar, stack handling, crafting recipes, storage, workbench, and cooking pot.
- [ ] Audit every resource and recipe for a clear purpose, source, cost, and progression tier.
- [ ] Add readable crafting categories, ingredient sourcing hints, quantity controls, and unavailable-recipe explanations.
- [ ] Add equipment comparison, armor set identity, weapon/tool progression, and clear stat descriptions.
- [ ] Add more meaningful food effects, cooking choices, consumable cooldowns, and spoilage only if it improves play.
- [ ] Add resource respawn rules and prevent farming exploits or permanent resource depletion.
- [ ] Add inventory filters, search, favorite recipes, transfer shortcuts, and mobile-friendly drag/tap behavior.
- [ ] Ensure all crafting, durability, and storage actions are transactional and safe against partial failures.
- [ ] Balance survival drain and damage across difficulty settings.

**Exit gate:** Players can understand how to gather, craft, equip, repair, store, and progress without unexplained resource bottlenecks.

## Phase 5 — Base building and creature work

**Status: In progress**

- [x] Placeable structures, snapping, doors, gates, roofs, support checks, dismantling, upgrades, storage, and base ratings.
- [ ] Add a polished building mode with clear placement ghost, rotation, snap feedback, obstruction feedback, and cancel controls.
- [ ] Add a coherent structural piece catalogue with material tiers and visual upgrades.
- [ ] Improve collision and navigation around foundations, stairs/ramps, doors, roofs, and uneven terrain.
- [ ] Add useful crafting stations and station-specific recipes.
- [ ] Add creature work assignments such as gathering, carrying, crafting support, guarding, and tending crops.
- [ ] Add a simple task-priority and work-area system with clear creature assignment UI.
- [ ] Add farm plots, seeds, growth stages, watering, harvest, and crop storage.
- [ ] Add base raids or hostile events only after defense, pathfinding, and save rules are dependable.
- [ ] Add base management limits, performance budgets, and clear structure ownership.

**Exit gate:** A player can build a useful, attractive base and assign companions to understandable jobs without save corruption or severe performance loss.

## Phase 6 — Quests, story, bosses, and progression

**Status: In progress**

- [x] Quest journal, tutorials, achievements, landmarks, lore entries, staged main story, and Night Herald boss foundation.
- [ ] Write the full original story arc, central mystery, factions, characters, and world history.
- [ ] Turn the tutorial into a paced onboarding sequence that teaches movement, gathering, capture, crafting, combat, and building.
- [ ] Add quest objectives with clear navigation hints, fail/retry rules, rewards, and save persistence.
- [ ] Add varied quest types: exploration, creature research, rescue, crafting, defense, hunting, and boss preparation.
- [ ] Add distinct boss encounters with readable phases, arena design, counterplay, and meaningful rewards.
- [ ] Connect creature collection and base progression to story progression without forcing excessive grinding.
- [ ] Add progression milestones, unlock screens, reward previews, and a clear endgame objective.
- [ ] Add optional post-story activities and repeatable world challenges.

**Exit gate:** A new player can understand the story, follow objectives, make meaningful progress, and reach a satisfying main-game conclusion.

## Phase 7 — Visual identity, audio, interface, and accessibility

**Status: In progress**

- [x] Detailed player/creature procedural models, species-specific art pass, lighting profiles, HUD, settings, audio foundations, and English/Urdu text tables.
- [ ] Define a unified original art direction for characters, creatures, vegetation, architecture, terrain, VFX, and UI.
- [ ] Improve material quality, silhouettes, proportions, texture detail, color harmony, and lighting consistency.
- [ ] Replace placeholder-looking repeated props with a curated set of recognizable original environmental assets.
- [ ] Add polished creature and player animation/VFX for attacks, gathering, capture, damage, weather, and abilities.
- [ ] Add original music themes for exploration, combat, caves, bosses, and safe bases.
- [ ] Improve sound spatialization, distance falloff, biome ambience, creature calls, and interaction feedback.
- [ ] Complete UI flows for inventory, crafting, party, collection, quests, map, building, settings, and character customization.
- [ ] Add consistent iconography, tooltips, controller focus, touch targets, loading feedback, and error states.
- [ ] Audit English/Urdu translations for clipping, layout direction, readability, and missing strings.
- [ ] Add subtitle controls, text scaling, color contrast, reduced motion, and audio-caption support.

**Exit gate:** All major screens and gameplay states share a consistent visual language and communicate actions clearly.

## Phase 8 — Performance, compatibility, and quality assurance

**Status: In progress — physical device validation remains open**

- [x] Low/Balanced/High graphics profiles, capped pixel ratio, adaptive shadows/particles, cleanup safeguards, smoke tests, and performance diagnostics.
- [ ] Collect real performance profiles on the target 4 GB Chromebook; source tests are not a substitute for device measurements.
- [ ] Profile average and p95 frame time, memory growth, draw calls, triangles, update time, and rendering cost in representative scenes.
- [ ] Optimize creature count, AI update frequency, animation, shadows, vegetation, particles, and streaming based on measurements.
- [ ] Confirm graphics settings actually reduce workload and never alter display resolution.
- [ ] Run at least a 30-minute play session and check memory growth, save stability, crashes, and input responsiveness.
- [ ] Test current Chromium on Chromebook and representative Android devices.
- [ ] Test supported desktop browsers and document unsupported features.
- [ ] Test keyboard, touch, and physical gamepad separately.
- [ ] Add automated tests for every critical bug found during manual testing.
- [ ] Validate save migration from every supported previous save version.
- [ ] Test corrupted, oversized, partial, and interrupted save data.
- [ ] Add a release checklist and reproducible bug-report template.

**Exit gate:** The target-device matrix passes with measured results, no known critical data-loss bugs, and acceptable performance under Low settings.

## Phase 9 — Release candidate and launch

**Status: Planned**

- [ ] Freeze a release candidate from the development branch.
- [ ] Complete all Phase 8 target-device tests and attach reviewed diagnostics.
- [ ] Resolve all critical and high-priority gameplay, save, security, and performance issues.
- [ ] Review accessibility, localization, controls, onboarding, and known limitations.
- [ ] Verify all game assets are original or correctly licensed.
- [ ] Create final title screen, credits, settings defaults, and player-facing support information.
- [ ] Produce release notes and a known-issues list.
- [ ] Create a tagged release and verify the release artifact.
- [ ] Obtain explicit approval before production deployment or promotion.
- [ ] Publish the approved build and verify the public release end-to-end.
- [ ] Establish a post-launch bug triage and patch process.

**Exit gate:** A tested, approved build is publicly available with honest compatibility notes and a repeatable patch process.

---

## Definition of done

A feature is complete only when all applicable conditions are met:

1. It works in the actual game loop, not just in an isolated mock or menu.
2. It has clear player feedback and usable keyboard/touch/controller interaction.
3. It handles invalid input, edge cases, and failure states safely.
4. Persistent data is validated and migrated where necessary.
5. It does not break existing systems or older saves.
6. Automated tests cover the important behavior and regressions.
7. Performance impact is measured or bounded, especially on low-memory hardware.
8. The change has been reviewed, committed, and its CI result checked.
9. Device-only claims are made only after real device testing.

## Agent execution rules

For every development session:

1. Read repository instructions and inspect the latest branch head and recent commits.
2. Review this roadmap and choose the highest-priority unfinished task whose dependencies are ready.
3. Inspect the relevant implementation and tests before editing.
4. Implement a complete, focused change; do not make cosmetic-only changes when a gameplay system is unfinished.
5. Add or update tests and run the full available test suite.
6. Fix failures and rerun tests. If blocked, report the exact blocker without marking work complete.
7. Review the final diff for regressions, accidental deletions, unsafe save changes, and performance costs.
8. Commit successful work to `feature/wildearth-browser-prototype`.
9. Verify CI and any preview deployment for the exact commit. Never claim physical device testing unless it happened.
10. Update this roadmap only when status genuinely changes, and continue with the next unfinished task in a later run.

## Current release gates

- **Target-device profiling:** Open. A diagnostic tool exists, but real Chromebook measurements must still be collected and reviewed.
- **Human gameplay acceptance:** Open. Automated source tests do not replace a complete playthrough.
- **Public release:** Not approved. Production deployment requires explicit approval.

## Scope protection

Do not delete working gameplay to simplify the project. Do not replace real systems with placeholders to make checklist items appear complete. Do not change the screen resolution. Do not copy another game's protected models, textures, map, UI, animation, characters, or audio. Preserve WILDEARTH's original identity and keep the game playable throughout development.



---

# Expanded content roadmap — additional major systems

The phases below expand the game beyond its current core loop. They are part of the long-term product vision, but they must be developed in dependency order. Do not start expensive online or large-world systems before the single-player foundations, save model, and performance budgets are stable.

## Phase 10 — NPC settlements, factions, and social world

**Status: Planned**

- [ ] Build several original settlements with distinct architecture, culture, services, and local problems.
- [ ] Add named NPCs with schedules, daily routines, dialogue, relationship states, and persistent identity.
- [ ] Add dialogue choices with consequences, quest branching, and clear quest-state tracking.
- [ ] Add merchants, specialist traders, creature researchers, builders, healers, and travelling vendors.
- [ ] Add a buy/sell economy with item values, regional supply, currency sinks, and safeguards against easy duplication.
- [ ] Add settlement reputation, faction standing, unlockable services, and visible reactions to player actions.
- [ ] Add NPC requests, delivery tasks, rescue missions, and settlement upgrade projects.
- [ ] Add patrols, guards, caravans, travellers, and settlement defense behaviors.
- [ ] Add safe-zone rules and prevent NPCs from wandering into unloaded or unreachable areas.
- [ ] Add dialogue history and quest tracking without storing unbounded text or state.

**Exit gate:** Settlements feel populated and useful; NPC schedules, dialogue, economy, and quests persist correctly.

## Phase 11 — Dungeons, caves, expeditions, and world challenges

**Status: Planned**

- [ ] Design several original dungeon themes with distinct layouts, hazards, puzzles, enemy groups, and rewards.
- [ ] Add multi-room cave expeditions with clear entrances, exits, checkpoints, and optional secret routes.
- [ ] Add environmental puzzles using creature abilities, elemental interactions, pressure plates, switches, and movable objects.
- [ ] Add locked vaults, keys, treasure caches, relics, and readable clues.
- [ ] Add dungeon difficulty tiers and scale encounters by progression rather than only increasing enemy health.
- [ ] Add elite enemies with distinct behavior, telegraphs, and counterplay.
- [ ] Add timed trials, survival arenas, hunting contracts, and exploration challenges.
- [ ] Add boss rematches or challenge variants with separate rewards and fair retry rules.
- [ ] Ensure dungeon state, loot claims, checkpoints, and reset rules are save-safe.
- [ ] Keep dungeon geometry and enemy counts within the target device performance budget.

**Exit gate:** Players have repeatable, varied expeditions with fair challenge, meaningful rewards, and reliable persistence.

## Phase 12 — Deep ecology, wildlife, and creature life cycles

**Status: Planned**

- [ ] Add species-specific day/night activity, sleep, migration, nesting, territorial behavior, and group behavior.
- [ ] Add predator/prey interactions with strict simulation limits and no uncontrolled population growth.
- [ ] Add seasonal migration, weather responses, and biome-specific encounter changes.
- [ ] Add nests, eggs, incubation, juvenile stages, growth, and adult traits where appropriate to each species.
- [ ] Expand breeding inheritance with visible, understandable traits rather than opaque random stat rolls.
- [ ] Add rare variants with unique behavior or utility, not only a different color.
- [ ] Add creature care needs, habitat comfort, enrichment, and recovery at the base.
- [ ] Add a creature archive with field notes, tracks, calls, behavior observations, and discovery rewards.
- [ ] Add humane recovery/knockout rules and clear consequences for companion defeat.
- [ ] Add a deterministic simulation budget so distant wildlife can use simplified updates.

**Exit gate:** Creatures feel like inhabitants of the world, not just collectible combat units, while simulation remains efficient.

## Phase 13 — Expanded gathering, farming, fishing, and cooking

**Status: Planned**

- [ ] Add fishing with rods, bait, water locations, fish behaviors, catch feedback, and collection records.
- [ ] Add traps and gathering tools for selected resources with clear placement and retrieval rules.
- [ ] Add crop plots, seed varieties, growth stages, soil quality, watering, harvest, and seed recovery.
- [ ] Add orchards, herb gardens, mushrooms, and biome-specific harvestables.
- [ ] Add food preparation tiers, recipes, ingredient quality, meal buffs, and party meals.
- [ ] Add preservation such as drying, smoking, salting, or storage upgrades if it adds meaningful choices.
- [ ] Add livestock or ranching only where it fits WILDEARTH's creature-care identity and does not reduce creatures to disposable resources.
- [ ] Add clear resource tooltips, respawn rules, and anti-exploit checks.
- [ ] Add storage labels, sorting, category filters, and station-to-storage convenience.
- [ ] Ensure farming and production continue safely across world reloads without requiring continuous simulation.

**Exit gate:** Gathering and food production support exploration and base life without becoming tedious chores.

## Phase 14 — Traversal, vehicles, water, and aerial exploration

**Status: Planned**

- [ ] Add a complete mount roster with ground, climbing, swimming, and aerial roles.
- [ ] Add mount stamina, acceleration, turning, jump, landing, dismount safety, and mount-specific camera behavior.
- [ ] Add gliding equipment and wind/thermal lift where it creates interesting traversal.
- [ ] Add boats or rafts for rivers and larger water regions, with buoyancy simplified for browser performance.
- [ ] Add underwater exploration areas with oxygen management, visibility, aquatic creatures, and discoverable resources.
- [ ] Add waterfalls, rapids, currents, and safe/unsafe water entry points.
- [ ] Add fast travel through discovered waypoints with clear cost and restrictions.
- [ ] Add travel route markers, compass bearings, custom map pins, and destination tracking.
- [ ] Prevent mounts and vehicles from clipping through terrain, structures, or streamed-world boundaries.
- [ ] Add travel unlocks through exploration rather than making fast travel available before discovery.

**Exit gate:** Traversal adds meaningful freedom and discovery without breaking camera, collision, streaming, or low-end performance.

## Phase 15 — Character identity, housing, cosmetics, and creative play

**Status: Planned**

- [ ] Expand player appearance with hair styles, face details, body proportions within rig limits, skin/outfit palettes, and accessory slots.
- [ ] Add armor transmog or appearance overrides so players can choose looks without losing equipment stats.
- [ ] Add outfit presets for exploration, cold regions, hot regions, combat, and base work.
- [ ] Add furniture, decorations, trophies, lighting, signs, storage appearance, and interior customization.
- [ ] Add player home upgrades, personal rooms, display stands, and creature habitat spaces.
- [ ] Add a dye system with preview, color accessibility checks, and material-safe palette choices.
- [ ] Add emotes, gestures, idle poses, and companion interaction animations.
- [ ] Add a photo mode with camera orbit, focal distance, field of view, time-of-day selection, and UI hiding.
- [ ] Add a creative/sandbox world option with configurable resource abundance, damage, survival drain, and building restrictions.
- [ ] Add world naming, save thumbnails, favorite worlds, duplicate-world backup, and delete confirmation.

**Exit gate:** Players can make their character and base feel personal, and optional creative settings do not compromise normal survival progression.

## Phase 16 — Optional co-op and shared-world architecture

**Status: Planned — post-core priority**

- [ ] First decide whether co-op is technically and commercially justified; do not promise multiplayer until a network prototype proves feasibility.
- [ ] Document authoritative ownership for player movement, creature AI, combat, inventory, crafting, building, and world events.
- [ ] Design server-authoritative validation for item creation, capture, damage, currency, and save changes.
- [ ] Prototype a small private session with two clients before designing large servers.
- [ ] Add invite-only sessions, host migration or dedicated-host rules, reconnect handling, and clear session status.
- [ ] Add synchronized creature movement, combat events, interactions, doors, building, and loot claims.
- [ ] Add party permissions, base ownership, shared storage rules, and per-player progression boundaries.
- [ ] Add anti-duplication, replay protection, rate limits, and server-side validation.
- [ ] Add moderation, block/report tools, privacy controls, and safe defaults before public matchmaking.
- [ ] Add latency simulation and network failure tests.
- [ ] Keep single-player fully playable offline if co-op is unavailable.
- [ ] Do not build an MMO or persistent public server as a prerequisite for the first complete release.

**Exit gate:** A small co-op prototype is stable, secure, and fun under real network conditions; otherwise retain single-player scope.

## Phase 17 — Long-term progression and endgame

**Status: Planned**

- [ ] Add a clear endgame loop after the main story: advanced expeditions, rare creature research, boss challenges, and base projects.
- [ ] Add mastery tracks for weapons, gathering, crafting, exploration, creature care, and building.
- [ ] Add optional challenge modifiers and difficulty presets with transparent effects.
- [ ] Add a world completion journal for landmarks, dungeons, creature discoveries, recipes, lore, and achievements.
- [ ] Add weekly or rotating challenges only if the game has reliable date handling and rewards that do not punish missed sessions.
- [ ] Add New Game Plus or a fresh-world challenge mode only after save slots and progression migration are dependable.
- [ ] Add late-game crafting materials and equipment with sidegrades and specialized roles, not endless stat inflation.
- [ ] Add cosmetic rewards for difficult achievements without pay-to-win advantages.
- [ ] Add endgame balance tests and ensure older content remains useful.

**Exit gate:** Players have meaningful goals after the main story without mandatory repetitive grinding.

## Phase 18 — Platform readiness, cloud saves, and community features

**Status: Planned**

- [ ] Add optional account-linked cloud save only after authentication, privacy, conflict resolution, and backup recovery are designed.
- [ ] Support multiple local save slots and export/import backups in a documented format.
- [ ] Add save conflict resolution with clear choices and never silently overwrite a newer world.
- [ ] Add controller-first navigation and safe-area handling for phones, tablets, Chromebooks, and desktop.
- [ ] Audit browser storage quotas and provide warnings before saves approach platform limits.
- [ ] Add language selection and verify all supported languages across menus, HUD, captions, and dialogue.
- [ ] Add localization-ready text keys; avoid hard-coded strings in gameplay logic.
- [ ] Add credits, license notices, privacy information, support links, and crash-report consent.
- [ ] Add optional player feedback/bug report export with user review before sharing.
- [ ] Add mod/plugin support only after stable public APIs, sandboxing, versioning, and security review exist.
- [ ] Add community-created world sharing only with content validation, moderation, and clear ownership/licensing.
- [ ] Define supported browser/device versions and publish honest compatibility notes.

**Exit gate:** Saves are portable and recoverable, controls adapt to supported platforms, and community features have security and moderation safeguards.

## Phase 19 — Audio, feedback, and world immersion expansion

**Status: Planned**

- [ ] Give each biome a layered ambient soundscape with day/night variations.
- [ ] Add original creature vocalizations and readable audio cues for aggression, fear, feeding, injury, and trust.
- [ ] Add dynamic music transitions based on exploration, danger, combat, discovery, and boss phases.
- [ ] Add spatial audio attenuation and priority limits so many creatures do not overwhelm low-end devices.
- [ ] Add weather audio for rain, wind, thunder, caves, water, and sheltered interiors.
- [ ] Add satisfying sound and visual feedback for gathering, crafting, building, capture, upgrades, and quest completion.
- [ ] Add audio mix controls for music, ambience, effects, UI, and voice.
- [ ] Add subtitle/caption labels for important non-verbal cues where practical.
- [ ] Ensure every sound and music asset is original or properly licensed.

**Exit gate:** Sound communicates the world and gameplay clearly, with adjustable mix and no performance or accessibility regressions.

## Phase 20 — Security, data integrity, and operational readiness

**Status: Planned**

- [ ] Threat-model local saves, cloud endpoints, account sessions, project sharing, and any future multiplayer services.
- [ ] Validate all client-provided IDs, quantities, coordinates, recipe costs, and object limits at trust boundaries.
- [ ] Add schema versioning and tested migrations for every persistent system.
- [ ] Add backup rotation and a tested recovery path for corrupt or interrupted saves.
- [ ] Add telemetry only with transparent consent, data minimization, and documented retention.
- [ ] Add crash diagnostics that avoid collecting passwords, tokens, personal data, or private world contents.
- [ ] Add dependency/license inventory and a repeatable security update process.
- [ ] Add content integrity checks for downloadable assets and future mods.
- [ ] Add rate limits and abuse controls to any online service.
- [ ] Document incident response and safe rollback procedures.

**Exit gate:** Player data is protected, recoverable, and handled transparently; online surfaces are reviewed before release.

---

## Expanded prioritization rules

Use this order when selecting work:

1. **P0 — Blockers:** crashes, save loss, broken launch, input lockups, security issues, corrupted world state.
2. **P1 — Core loop:** player feel, capture, creature AI, combat, crafting, building, world streaming, progression.
3. **P2 — Content depth:** biomes, species, settlements, dungeons, quests, bosses, farming, fishing, mounts.
4. **P3 — Polish:** animation quality, audio, UI, accessibility, cosmetics, photo mode.
5. **P4 — Optional scale:** co-op, community sharing, modding, live events, advanced cloud features.

A later phase must not be treated as a reason to delay a stable, complete single-player release. Co-op, modding, and online community features remain optional until their technical and operational costs are proven.

## Additional release-quality acceptance checklist

- [ ] A first-time player can start a new world, learn the controls, capture a first companion, craft essential gear, build shelter, and understand the first story objective without external instructions.
- [ ] A returning player can load a previous world and recover from a failed or interrupted save.
- [ ] Every creature species has a documented gameplay role, habitat, behavior, and at least one distinct ability or utility.
- [ ] Every major biome has a unique resource loop, encounter identity, landmark, and reason to revisit.
- [ ] Every major system has an accessible UI path and is usable with supported input methods.
- [ ] All quests, bosses, recipes, structures, and rewards have tested unlock and persistence rules.
- [ ] No optional online feature is required to play the main game.
- [ ] Performance has been measured on actual target hardware, not inferred from CI.
- [ ] No unlicensed or copied game assets are included.
- [ ] The release build, save format, support information, and known limitations are documented.
