/* ============================== main (entry point) ============================== */
import { clamp } from './util.js';
import { state, world } from './state.js';
import { audio } from './audio.js';
import { update } from './update.js';
import { draw, fitCanvas } from './render.js';
import { syncHud, checkOrientation } from './dom.js';
import { sendWave } from './waves.js';
import { doUpgrade, doSell, placeTower, towerStats } from './towers.js';
import { generateMaps, select as selectMap, currentMap } from './mapsel.js';
import './input.js';

addEventListener('resize',fitCanvas);
addEventListener('orientationchange',()=>setTimeout(fitCanvas,60));
addEventListener('touchstart',()=>audio(),{once:true,passive:true}); // unlock mobile audio
if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{}); // offline support

/* debug handle (also used by automated tests) */
window.TD_DEBUG={
  get state(){ return state; },
  get towers(){ return world.towers; },
  get enemies(){ return world.enemies; },
  get projs(){ return world.projs; },
  get map(){ return currentMap(); },
  sendWave, doUpgrade, doSell, placeTower,
  stats: towerStats,
  selectMap, regenerateMaps: generateMaps
};

/* ============================== main loop ============================== */
let last=performance.now();
function frame(now){
  requestAnimationFrame(frame);
  let dt=(now-last)/1000;
  last=now;
  dt=clamp(dt,0,0.1);
  if(!state.paused&&(state.phase==='build'||state.phase==='wave')){
    update(dt*state.speed);
  }
  draw();
  syncHud();
  checkOrientation();
}
generateMaps();
fitCanvas();
syncHud();
requestAnimationFrame(frame);
