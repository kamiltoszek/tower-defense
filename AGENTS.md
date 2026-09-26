# AGENTS.md

Tower Defense game in vanilla JavaScript ES modules. Single page (`index.html` holds markup + all CSS), graphics drawn on `<canvas>`, audio synthesized with WebAudio. Zero dependencies, zero image/font assets, no framework, no build step, no `package.json`, no tests. PWA: `manifest.webmanifest` + `sw.js` (network-first service worker, registered in `main.js`). CI only deploys: `.github/workflows/pages.yml` publishes to GitHub Pages on push to `main`.

See `PRODUCT.md` for tone and design principles, `README.md` (Polish) for gameplay, balance tables, controls and per-file roles.

## Running

- Must be served over HTTP — ES modules do **not** load from `file://`.
- `./start.sh` (default port 9100, opens browser) or `./start.sh <port>`.
- Manually: `python3 -m http.server 9100` → http://localhost:9100.
- No build/lint/test commands. Bad imports fail only at runtime — after any change, load the page and check the console for module errors.

## Verification

`window.TD_DEBUG` (defined in `js/main.js`) is the console handle for inspection and scripted testing:

- Read: `TD_DEBUG.state`, `.towers`, `.enemies`, `.projs`, `.map` (active map `{ wp, len, thumb }`)
- Act: `sendWave()`, `placeTower(type, col, row)`, `doUpgrade(tw)`, `doSell(tw)`, `stats(tw)`, `selectMap(i)` (0–4), `regenerateMaps()`

Keep this API stable — it is used by automated browser tests.

## Module map (`js/`)

| Module | Role |
|--------|------|
| `main.js` | Entry: rAF loop, `TD_DEBUG`, resize/orientation listeners, initial `generateMaps()` |
| `state.js` | `state` (game status), `world` (entity collections), `resetWorld()`, `mouse` |
| `config.js` | All balance: `TOWERS`, `ETYPES`, `DIFFS`, `WAVES`, HP/speed curves, `waveBonus`, `buildQueue` |
| `board.js` | Grid constants, live path bindings, `setWaypoints`, `pointAt`, `dirsAt` |
| `mapgen.js` | `genWaypoints()` random path, `pathCells(wp)` |
| `mapsel.js` | Start-screen map picker (5 candidates): `generateMaps`, `select`, `nextMap`, `currentMap` |
| `update.js` | Simulation step: spawn, move, leak, tower fire, projectiles, fx aging, wave end |
| `combat.js` | `spawnEnemy`, `acquire` (targeting), `fire`, `hitEnemy` |
| `towers.js` | `canPlace`, `placeTower`, `doUpgrade`, `doSell`, `towerStats`, `upCost`, `sellValue` |
| `waves.js` | `sendWave`, `doGameOver`, `doVictory` |
| `render.js` | Canvas drawing, static `bg` layer (`rebuildBG`), `makeThumb`, `fitCanvas` |
| `dom.js` | HUD, shop, info panel, overlays/start screen, `checkOrientation` |
| `input.js` | Mouse, touch, keyboard, buttons |
| `fx.js` / `audio.js` / `util.js` | Floating text + particles / synthesized `sfx` / helpers (`$`, `clamp`, `rand`, `rgba`, `rr`, `TAU`) |

## Architecture rules

- **Shared state lives only in `state.js`.**
  - `state` is `export let` and is **re-assigned** by `resetWorld()` — import the binding, never cache it in a `const`.
  - `world` collections (`towers`, `enemies`, `projs`, `effects`, `particles`, `floats`, `towerCell`) are re-assigned after `.filter()` passes — always go through `world.*`, never hold a direct array reference.
- **Board path is swappable.** `board.js` exports `pathSet`, `pts`, `TOTAL_LEN`, `pathDirs` as `export let` bindings, re-assigned by `setWaypoints(wp)`. Same rule: import the bindings, never cache the arrays.
- **Waypoints** (`mapgen.genWaypoints`) go from column 0 to column 23, column stops strictly increasing (path never self-crosses), consecutive waypoints differ in exactly one coordinate (axis-aligned). `pointAt`/`dirsAt` depend on this. Path length is 24–108 cells.
- **Background cache.** The `bg` canvas in `render.js` is built once per map. Every code path calling `setWaypoints()` must also call `rebuildBG()` (as `mapsel.select`/`generateMaps` do), otherwise the old road is drawn.
- **Balance only in `js/config.js`.** `README.md` tables mirror these values — update the README whenever balance changes. UI work never changes balance numbers.
- **Fixed logical canvas 960×600** (`W`/`H`, `CELL=40`, 24×15 grid). Scaled by CSS only (`fitCanvas`, scale ≤ 1). All game and drawing coordinates use logical space; input maps via `getBoundingClientRect()` (`mousePos` in `input.js`). Never resize the canvas `width`/`height` attributes to fit the viewport.
- **Grid keys** for path cells and occupied tower cells are `"col,row"` strings (0-based) in both `pathSet` and `world.towerCell`. Entity `x`/`y` are cell centers (`c*CELL + CELL/2`).
- **Dependency direction:** `main → input → dom → render → state`. Simulation modules (`update`, `combat`, `towers`) stay DOM-free and talk only via `state`/`world`, `fx`, `sfx`. Known exceptions: `waves.js` imports `showOverlay` from `dom.js`; `mapsel.js` touches DOM and imports `makeThumb`/`rebuildBG` from `render.js`; `render.js` reads `canPlace`/`towerStats` from `towers.js`. Don't add new DOM access to simulation code.

## Game flow

- Phases: `start → build ⇄ wave → over | win → start`. Play Again returns to the start screen with a fresh random map set.
- `update(dt)` runs only in `build`/`wave` and when not paused; `dt` is clamped to ≤ 0.1 s, then scaled by `state.speed` (1 | 2).
- Difficulty (`DIFFS`): Easy/Normal/Hard end after 20/25/30 waves (`WAVES` has 30 entries); boss every 5th wave. Enemy HP = base × `waveHpMul(w)` × difficulty `hp` (bosses use `bossHp(w)`).

## Gotchas

- **Adding/renaming a shipped file:** add it to `ASSETS` in `sw.js` and bump `VERSION`, and make sure the copy step in `.github/workflows/pages.yml` includes it — otherwise it's missing offline or on Pages.

- `AudioContext` is created lazily on first user gesture (touchstart / Start button) to unlock mobile audio. Never instantiate it at module load.
- Touch input (`input.js`) is a one-finger state machine: long-press (500 ms) = cancel; synthetic mouse clicks within 600 ms of `touchend` are suppressed (`lastTouchEnd`). Preserve both when editing input.
- Phones in portrait auto-pause behind a "rotate" overlay (`checkOrientation` in `dom.js`).
- Keys `1`–`3` pick difficulty on the start screen but `1`–`4` pick towers in-game — `input.js` branches on `state.phase`.

## Conventions

- Code, comments and in-game UI strings: English. `README.md`: Polish.
- Match existing style: compact code, `/* ===== section ===== */` file headers. No new dependencies or assets (icons as inline SVG, no emoji in UI).
