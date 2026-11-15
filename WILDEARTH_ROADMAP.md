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
- [ ] Add species-specific attacks and companion abilities; avoid making creatures differ only by stats or color.
- [ ] Improve capture feedback: aiming, throw arc, impact, capture attempt, success/failure, escape, and clear probability feedback without exposing hidden formulas.
- [ ] Add a collection journal with discovery, habitat hints, care information, abilities, and missing-species tracking.
- [ ] Make party management clear: active team, reserve storage, swapping, healing, and command feedback.
- [ ] Improve companion navigation around slopes, trees, buildings, water, caves, and narrow spaces.
- [ ] Add reliable recall, regroup, stuck recovery, and leash-distance behavior.
- [ ] Balance creature progression, trust, breeding, offspring inheritance, and population caps.
- [ ] Add creature status, bond progression, and meaningful non-combat utility.
- [ ] Add clear creature death/knockout and recovery rules that are fair and communicated.

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
