# WILDEARTH Release Candidate — QA Gate

Status: **Not approved for public release yet**  
Target branch: `feature/wildearth-browser-prototype`  
Entry point: `wildearth3d.html`

## Included in this candidate

- Five biomes, streamed terrain, caves, rivers and ponds.
- Detailed customizable player model, character presets and outfit slots.
- Wildlife ecology, breeding, feeding, taming and companions.
- Wraith variants and the three-phase Night Herald boss.
- Survival systems: hunger, stamina, swimming, oxygen, wetness, temperature, storms and seasons.
- Inventory, crafting, storage, tool durability and repair.
- Building, doors, gates, roofs, support checks, upgrades and dismantling.
- Quests, exploration map, landmarks, lore, achievements and cosmetic unlocks.
- Keyboard, touch and gamepad controls; English/Urdu interface and captions.
- Save backups, legacy inventory migration, diagnostics and performance instrumentation.

## Automated pre-release checks

Run in the repository root:

```sh
node --test tests/wildearth-smoke.test.mjs
```

The test suite checks script syntax and critical UI wiring, deterministic seeds, save migration, combat, survival, building, accessibility, browser fallbacks and bounded stress loops. Passing source tests does not establish device compatibility or stable frame rates.

## Latest automated verification

- GitHub Actions run [#142](https://github.com/hsudais201-ops/Gameforge/actions/runs/43560542030) completed successfully on 2026-11-14.
- Result: **59 tests passed, 0 failed** on commit `d3a5602a66a11c583335b8c32c2ae3e552705430`.
- Scope: Node.js source-level smoke/regression checks. This is not a substitute for browser gameplay, physical Chromebook profiling, controller testing, or release acceptance.

## Required target-device test matrix

1. On the Dell Chromebook 11 (3180), open the game in a current supported Chromium browser.
2. Confirm WebGL startup, main menu, world creation, world loading and save/reload.
3. Run the in-game **Run 30-second device profile** with graphics set to Low, Balanced, and High. Export each JSON report.
4. Repeat while moving through dense forest, near a river, inside a cave, during rain/storm, and near the base with companions and enemies active.
5. Record average FPS, p95 frame time, update time, render-submit time, draw calls, triangles, memory stability and thermal throttling.
6. Play for at least 30 minutes; check input latency, crashes, save integrity, memory growth, audio and touch layout.
7. Test keyboard, touch controls and a physical controller separately.
8. Verify no save loss when closing/reopening the tab and when returning to the main menu.
9. Attach the exported diagnostics and device-profile JSON files to the release record, after reviewing them for browser/world details.

## Release blockers

- No physical Chromebook measurements have been collected by the development environment.
- No human gameplay acceptance pass has been completed on the target device.
- No production deployment or public release has been performed.
- Browser/WebGL performance varies by device and browser; do not advertise a frame-rate target until measured.

## Release decision

Keep roadmap step 114 open until real Chromebook profiles are reviewed. Keep step 120 open until the target-device matrix passes, a release build is deployed, and patch notes are published. Do not mark either step complete based only on source checks.
