# WILDEARTH — Release Notes Draft

> Status: PRE-RELEASE DRAFT — not a published or device-validated build.

## Current development highlights

- Detailed player rig, character customization, three outfit slots, preview turntable, lighting and Idle/Walk/Attack previews.
- Five biomes, streamed world areas, world seeds, landmarks, exploration map, quests and story progression.
- Wildlife, taming, companions, breeding, Wraith variants and the three-phase Night Herald encounter.
- Survival systems for hunger, stamina, temperature, wetness, swimming, oxygen and drowning.
- Rivers, ponds, a Lumen Cavern, seasonal cycles, storms, wind and lightning.
- Crafting, inventory, workbench, cooking pot, storage, building pieces, doors, gates, roofs, base ratings and structure limits.
- Tool durability, breakage, repairs, achievement-based cosmetic rewards and persistent world saves.
- Configurable controls, gamepad input, accessibility settings, bilingual interface/captions and optional performance diagnostics.

## Verification completed in development

- 64 source-level smoke/regression tests passed in GitHub Actions on commit `94934e984d76a7afa749ff4698d63fe2295aff4a`.
- Added low-end Chromebook graphics defaults and stricter total structure-count validation for loaded and backup saves.
- Game script syntax validation passed.
- Static duplicate-ID scan passed.
- Automated tests cover save migration, streaming visibility, combat, survival, building, cave/rivers, localization and diagnostics.

## Known limitations and release blockers

- CPU/GPU performance has not yet been measured on the target low-memory Chromebook.
- Actual gameplay has not yet been verified on the target Chromebook or a representative Android device.
- Physical gamepad testing is still required.
- Cross-browser testing on Chrome, Firefox, Safari and Edge is not yet complete.
- The current development branch has not been promoted to a production release.
- Render-submit timing is recorded by the diagnostics monitor; it is not a direct GPU execution-time measurement.

## Required before publishing

1. Run a sustained play session on the target Chromebook and record FPS, p95 frame time, draw calls and memory behavior.
2. Verify world save/load, cave transitions, water movement, boss defeat persistence and building collisions in a real browser.
3. Test touch controls and a physical gamepad.
4. Run the browser compatibility matrix and resolve any startup/rendering issues.
5. Freeze the release candidate, rerun the complete test suite, and publish a tagged release with final patch notes.
