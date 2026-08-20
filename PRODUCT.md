# PRODUCT.md

## Product

Tower Defense: a single-page HTML5 canvas game in vanilla ES-module JavaScript. 20 waves, 4 tower types, 3 upgrades each, boss every 5th wave. Zero dependencies: no framework, no build tools, no image or font assets, no package.json. All graphics are hand-drawn on `<canvas>`, all audio is synthesized with WebAudio.

## Users

Solo casual players on desktop and mobile (touch input + portrait auto-pause are first-class, PWA-ready), in short 10–20 minute sessions, at home in the evening in a dim room.

## Register

product

## Tone

Cozy tactical arcade: a "war table at dusk" mood. Deep blue-slate ground, warm gold for currency, one functional color per tower type. Calm, legible, feedback-dense. No marketing gloss, no neon.

## Strategic principles

- Zero dependencies: everything inline. No external fonts, images, or libraries (SVG icons are inline markup, not assets).
- One visual language: the same dark-slate + gold accent connects the DOM HUD and the canvas.
- Feedback first: every action (build, hit, leak, wave start, life lost) answers visually on the next frame.
- Mobile parity: touch state machine and orientation handling are preserved behavior, not an afterthought.
- Balance lives only in `js/config.js`; UI work never changes balance numbers.

## Anti-references

- Generic SaaS dashboard chrome, crypto-neon glow, gradient-text heroes.
- Emoji as UI iconography (platform rendering is inconsistent and reads as a placeholder).
- Decorative glassmorphism or blur for its own sake.
