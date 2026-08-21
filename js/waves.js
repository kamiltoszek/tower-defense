/* ============================== waves & game flow ============================== */
import { WAVES, buildQueue, DIFFS } from './config.js';
import { state, world } from './state.js';
import { sfx } from './audio.js';
import { showOverlay } from './dom.js';

export function sendWave(){
  if(state.phase!=='build'||state.paused) return;
  const def=WAVES[state.wave-1];
  state.queue=buildQueue(def);
  state.phase='wave';
  state.interval=(state.wave%5===0)?0.85:Math.max(0.35,0.8-state.wave*0.015);
  state.spawnT=0.35;
  world.effects.push({type:'banner', text:'WAVE '+state.wave,
    sub:def.some(d=>d[0]==='boss')?'BOSS INCOMING':'', age:0, life:2.3});
  sfx('wavestart');
}

export function doGameOver(){
  state.phase='over';
  sfx('lose');
  showOverlay('GAME OVER','lose','The defenses fell on wave '+state.wave+'.',
    DIFFS[state.difficulty].name+'  ·  Waves cleared: '+(state.wave-1)+'  ·  Kills: '+state.kills,'Play Again');
}
export function doVictory(){
  state.phase='win';
  sfx('win');
  showOverlay('VICTORY!','win','All '+DIFFS[state.difficulty].waves+' waves cleared — the kingdom is safe.',
    DIFFS[state.difficulty].name+'  ·  Kills: '+state.kills+'  ·  Lives left: '+state.lives+'  ·  Gold: '+state.gold,'Play Again');
}
