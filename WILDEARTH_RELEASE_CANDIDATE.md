# WILDEARTH Release Candidate — QA Gate

Status: **Not approved for public release yet**  
Target branch: `feature/wildearth-browser-prototype`  
Entry point: `wildearth3d.html`  
Master plan: [WILDEARTH Master Development Roadmap](WILDEARTH_ROADMAP.md)

## Included in this candidate

- Seeded, streamed world with multiple biomes, caves, rivers and ponds.
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

- GitHub Actions run [#155](https://github.com/hsudais201-ops/Gameforge/actions/runs/43563419085) completed successfully on 2026-11-14.
- Result: **64 tests passed, 0 failed** on commit `94934e984d76a7afa749ff4698d63fe2295aff4a`.
- Regression coverage includes low-end Chromebook startup defaults and the combined 120-piece save-validation limit.
- Scope: Node.js source-level smoke/regression checks. This is not a substitute for browser gameplay, physical Chromebook profiling, controller testing, or release acceptance. Check the current branch's latest Actions run before treating this historical result as current.

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

The master roadmap's **Phase 8 — Performance, compatibility, and quality assurance** remains open until real Chromebook profiles are reviewed and the target-device matrix passes. **Phase 9 — Release candidate and launch** remains blocked until gameplay acceptance, release checks, and explicit production approval are complete. Do not infer release readiness from source-level CI alone.
