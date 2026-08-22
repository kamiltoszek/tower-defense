# AGENTS.md

Vanilla JavaScript ES-modules Tower Defense game. No framework, no build tools, no package.json, no tests, no CI. All graphics drawn on `<canvas>`, all audio synthesized via WebAudio. Zero assets, zero dependencies.

## Running

- Must be served over HTTP — ES modules do **not** run from `file://`.
- `./start.sh` (default port 8000, opens browser) or `./start.sh 9000` for a custom port.
- Manually: `python3 -m http.server 8000` → http://localhost:8000.
- There are no build/lint/test commands. Verify changes by playing in a browser; check the console for module load errors (no build step — bad imports only fail at runtime).

## Verification

`window.TD_DEBUG` (set in `js/main.js`) is the console handle for inspection and scripted testing:

- Read: `TD_DEBUG.state`, `.towers`, `.enemies`, `.projs`, `.map`
- Act: `TD_DEBUG.sendWave()`, `TD_DEBUG.placeTower(type, col, row)`, `TD_DEBUG.doUpgrade(tw)`, `TD_DEBUG.doSell(tw)`, `TD_DEBUG.stats(tw)`, `TD_DEBUG.selectMap(i)`, `TD_DEBUG.regenerateMaps()`

## Architecture

- Entrypoint: `index.html` → `js/main.js` (game loop, `TD_DEBUG`, resize/orientation listeners). Per-file roles are documented in `README.md` (Polish).
- `js/state.js` is the only shared state:
  - `state` — game status, mutated in place. It is `export let` and is **re-assigned** by `resetWorld()`, so import the binding and never cache it in a `const`.
  - `world` — all simulation collections (`towers`, `enemies`, `projs`, `effects`, `particles`, `floats`) plus `towerCell` Map. Collections are re-assigned after `.filter()` passes, so always go through `world.*`, never hold a direct reference.
- The board path is swappable: `board.js` exports `pathSet`, `pts`, `TOTAL_LEN`, `pathDirs` as `export let` bindings, re-assigned by `setWaypoints(wp)`. Random maps come from `mapgen.js` (`genWaypoints()`, right-monotonic axis-aligned waypoints); the start-screen picker lives in `mapsel.js` (5 candidates, thumbnails via `render.makeThumb`). Same rule as `state`: import the bindings, never cache the arrays.
- All balance lives in `js/config.js` (`TOWERS`, `ETYPES`, `WAVES`, HP/speed curves). The tables in `README.md` mirror these values — update the README when changing balance.
- Fixed logical canvas 960×600 (`W`/`H`, `CELL=40`, 24×15 grid in `js/board.js`). The canvas is scaled by CSS only (`fitCanvas`, scale ≤ 1); all drawing and game coordinates use the 960×600 logical space. Input is mapped via `getBoundingClientRect()` scaling (`mousePos` in `js/input.js`). Never resize the canvas `width`/`height` attributes to fit the viewport.
- Dependency direction: `main → input → dom → render → state`; `mapsel.js` (map picker UI) may touch DOM and imports `makeThumb`/`rebuildBG` from `render.js`. Simulation modules (`update`, `combat`, `towers`) stay DOM-free, communicating only via `state`/`world`, `fx`, and `sfx`. Don't add DOM access to simulation code; the known exception is `waves.js` importing `showOverlay` from `dom.js`.
- Phase machine: `start → build ⇄ wave → over/win → start` (Play Again returns to the start screen with a fresh random map set). `update(dt)` runs only in `build`/`wave` when not paused; dt is clamped to ≤ 0.1 and scaled by `state.speed` (1|2).
- Path cells and occupied tower cells are keyed as `"$col,$row"` strings in both `board.pathSet` and `world.towerCell` (0-based grid coords). Entity x/y are cell centers (`c*CELL + CELL/2`).

## Gotchas

- `AudioContext` is created lazily on first user gesture (touchstart / Start button) for mobile audio unlock. Never instantiate it at module load time.
- Touch input (`js/input.js`) is a one-finger state machine: long-press (500 ms) = cancel, and synthetic mouse clicks within 600 ms of `touchend` are suppressed (`lastTouchEnd`). Preserve both when editing input handling.
- Phones in portrait auto-pause with a "rotate" overlay (`checkOrientation` in `js/dom.js`).
- The static background layer (`bg` canvas in `js/render.js`) is built once per map. Any code path that calls `setWaypoints()` must also call `rebuildBG()` (see `mapsel.select`), or the board will render with the previous map's road.
- Code and in-game UI strings are English; `README.md` is Polish.
