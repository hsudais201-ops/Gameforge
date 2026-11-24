# GameForge Studio

GameForge Studio is a browser-based game creation workspace. The long-term target is **C: both** — an online editor, browser-playable games, and downloadable game exports.

## Current starter features

- Responsive dark UI with neon-green GameForge branding
- Create projects and choose a starter genre
- Local browser persistence for project metadata and scene objects
- Email/password account registration, login, session lookup, and logout through Cloudflare Pages Functions
- Cloudflare D1 user/session/project storage; passwords are PBKDF2-SHA-256 hashed and session tokens are stored as SHA-256 hashes
- Per-account cloud project sync with local-first fallback, project ownership checks, 1 MB request limit, and 200-project account limit
- Lightweight multi-level 2D scene editor
- Add Player, Platform, Coin, Enemy, Hazard, and Decoration objects
- Select, drag, rename, show/hide, position, and resize scene objects with configurable collision dimensions
- Configure object collision and solid/trigger platform behavior
- Visual no-code "On Player Touch" actions: add score, lose a life, destroy object, complete the level, or do nothing
- Browser playtest with keyboard and touch controls, score, lives, restart, and game-over state
- Export the current scene as JSON or a standalone playable HTML file; touch actions and collision settings are included in the HTML export

## WILDEARTH browser game

Open `wildearth3d.html` to play the current third-person 3D WILDEARTH prototype. The earlier 2D build remains available at `wildearth.html` as a fallback. The 3D prototype includes a seeded, streamed world; biomes; caves, rivers and ponds; a customizable player; wildlife and companions; Wraith encounters; survival systems; crafting, inventory and building; quests and exploration; and keyboard, touch and gamepad controls. World progress is stored locally on this device, separately for each world. Three.js is loaded from cdnjs, so an internet connection is required. Modest Chromebook-class hardware receives a lighter default graphics workload.

WILDEARTH is still in active development and is not a finished commercial AAA release. Its single source of truth for remaining work, priorities, completion gates, and agent execution rules is the [WILDEARTH Master Development Roadmap](WILDEARTH_ROADMAP.md).

## Run locally

Open `index.html` in a modern browser, or serve this directory with a static web server.

## Deploy to Cloudflare Pages

1. Import this GitHub repository in Cloudflare Pages.
2. Select **Direct Upload** or connect the Git repository.
3. For this static starter, use the repository root as the build output directory and no build command.
4. Deploy. The `wrangler.toml` file records the project name and output directory.

## WILDEARTH development checks

Requires Node.js 20 or newer.

```bash
npm install
npx playwright install chromium
npm run check
```

`npm run check` runs JavaScript syntax checks, the Node.js gameplay/save regression suite, and a headless Chromium gameplay route. The browser route creates a seeded world, verifies WebGL startup, enters gameplay, saves, returns to the menu, reloads, and resumes the same world. It uses a local copy of the same Three.js r128 runtime so the smoke test does not depend on the CDN being reachable. CI uses the Ubuntu 24.04 runner image for Chromium's shared-library dependencies and installs the pinned Chromium browser.

The browser test emulates a 4 GB device-memory profile, but it is not a substitute for physical Chromebook performance and compatibility testing.

## GameForge Studio status

The repository also contains an early browser-based 2D editor prototype. Its current event system supports player-touch triggers and a small set of actions; advanced physics, sprite animation, audio, multiplayer, email ownership verification, password reset, R2 asset uploads, and compiled desktop/mobile exports are not implemented yet. Signed-in projects sync to D1; a local copy remains on the device as a fallback.
