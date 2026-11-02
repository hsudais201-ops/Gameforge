# GameForge Studio

GameForge Studio is an early browser-based game creation workspace. The long-term target is **C: both** — an online editor, browser-playable games, and downloadable game exports.

## Current starter features

- Responsive dark UI with neon-green GameForge branding
- Create projects and choose a starter genre
- Local browser persistence for project metadata and scene objects
- Email/password account registration, login, session lookup, and logout through Cloudflare Pages Functions
- Cloudflare D1 user/session/project storage; passwords are PBKDF2-SHA-256 hashed and session tokens are stored as SHA-256 hashes
- Per-account cloud project sync with local-first fallback, project ownership checks, 1 MB request limit, and 200-project account limit
- Lightweight multi-level 2D scene editor
- Add Player, Platform, Coin, Enemy, Hazard, and Decoration objects
- Select, drag, rename, show/hide, and position scene objects
- Configure object collision and solid/trigger platform behavior
- Visual no-code "On Player Touch" actions: add score, lose a life, destroy object, complete the level, or do nothing
- Browser playtest with keyboard and touch controls, score, lives, restart, and game-over state
- Export the current scene as JSON or a standalone playable HTML file; touch actions and collision settings are included in the HTML export

## Run locally

Open `index.html` in a modern browser, or serve this directory with a static web server.

## Deploy to Cloudflare Pages

1. Import this GitHub repository in Cloudflare Pages.
2. Select **Direct Upload** or connect the Git repository.
3. For this static starter, use the repository root as the build output directory and no build command.
4. Deploy. The `wrangler.toml` file records the project name and output directory.

## Roadmap

1. Improve the 2D physics engine (moving platforms, slopes, and configurable hitboxes)
2. Expand the visual event system (keyboard, timers, scene transitions, and reusable actions)
3. Asset library, image/audio import, and sprite animation
4. Camera, tilemap, and level design tools
5. Browser publishing and shareable game links
6. Downloadable desktop/mobile packaging workflow
7. R2 asset uploads, asset browser, and collaboration

## Status

This repository is an early browser-based 2D editor prototype, not a complete commercial game engine. The event system currently supports player-touch triggers and a small set of actions; advanced physics, sprite animation, audio, multiplayer, email ownership verification, password reset, R2 asset uploads, and compiled desktop/mobile exports are not implemented yet. Signed-in projects sync to D1; a local copy remains on the device as a fallback.
