# GameForge Studio

GameForge Studio is an early browser-based game creation workspace. The long-term target is **C: both** — an online editor, browser-playable games, and downloadable game exports.

## Current starter features

- Responsive dark UI with neon-green GameForge branding
- Create projects and choose a starter genre
- Local browser persistence for project metadata and scene objects
- Email/password account registration, login, session lookup, and logout through Cloudflare Pages Functions
- Cloudflare D1 user/session storage; passwords are PBKDF2-SHA-256 hashed and session tokens are stored as SHA-256 hashes
- Lightweight 2D scene editor
- Add Player, Platform, Coin, and Enemy objects
- Select objects and edit their names, visibility, and positions
- Export the current scene as JSON

## Run locally

Open `index.html` in a modern browser, or serve this directory with a static web server.

## Deploy to Cloudflare Pages

1. Import this GitHub repository in Cloudflare Pages.
2. Select **Direct Upload** or connect the Git repository.
3. For this static starter, use the repository root as the build output directory and no build command.
4. Deploy. The `wrangler.toml` file records the project name and output directory.

## Roadmap

1. Scene editor and object model
2. Executable event system and runtime
3. Collision detection and 2D physics
4. Asset library and import pipeline
5. Browser game export
6. Downloadable desktop/mobile packaging workflow
7. Cloud project synchronization and per-user project storage
8. R2 asset uploads, asset browser, and collaboration

## Status

This repository is an early browser-based editor prototype, not a complete game engine. Account authentication is implemented with Pages Functions and D1, but email ownership verification, password reset, cloud project synchronization, R2 asset uploads, multiplayer, and compiled desktop/mobile exports are not implemented yet. Project content remains in the browser's local storage.
