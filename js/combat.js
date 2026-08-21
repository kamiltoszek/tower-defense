/* ============================== combat ============================== */
import { pts } from './board.js';
import { ETYPES, TOWERS, waveHpMul, waveSpdMul, bossHp, DIFFS } from './config.js';
import { state, world } from './state.js';
import { sfx } from './audio.js';
import { addFloat, burst } from './fx.js';
import { towerStats } from './towers.js';

export function spawnEnemy(type){
  const t=ETYPES[type], w=state.wave, D=DIFFS[state.difficulty];
  const hp = (type==='boss' ? bossHp(w) : t.hp*waveHpMul(w))*D.hp;
  world.enemies.push({
    uid:++world.uid, type,
    x:pts[0].x-30, y:pts[0].y, dist:-30,
    hp, maxHp:hp, speed:t.speed*waveSpdMul(w)*D.spd,
    r:t.r, gold:t.gold, lives:t.lives,
    slow:0, slowAmt:0, face:0, dead:false, flash:0
  });
}
export function acquire(tw,s){
  let best=null, bestKey=-1;
  const rr2=s.range*s.range;
  for(const e of world.enemies){
    if(e.dead) continue;
    const dx=e.x-tw.x, dy=e.y-tw.y;
    if(dx*dx+dy*dy>rr2) continue;
    const key=tw.type==='sniper'? e.hp : e.dist;   // sniper snipes the beefiest target
    if(key>bestKey){ bestKey=key; best=e; }
  }
  return best;
}
export function fire(tw,target){
  const s=towerStats(tw);
  const a=Math.atan2(target.y-tw.y,target.x-tw.x);
  tw.angle=a; tw.muzzle=0.08;
  world.projs.push({
    x:tw.x+Math.cos(a)*TOWERS[tw.type].barrel, y:tw.y+Math.sin(a)*TOWERS[tw.type].barrel,
    tx:target.x, ty:target.y, target,
    speed:s.speed, dmg:s.dmg, kind:tw.type,
    splash:s.splash, slow:s.slow, slowDur:s.slowDur, dead:false
  });
  sfx(tw.type==='cannon'?'cannon':tw.type==='sniper'?'sniper':tw.type==='frost'?'frost':'shoot');
}
export function hitEnemy(e,dmg){
  if(e.dead) return;
  e.hp-=dmg; e.flash=0.08;
  if(e.hp<=0){
    e.dead=true;
    state.gold+=e.gold; state.kills++;
    state.shake=Math.max(state.shake,e.type==='boss'?0.5:0.12);
    addFloat(e.x,e.y-10,'+'+e.gold,'#f5c542');
    burst(e.x,e.y,ETYPES[e.type].color,e.type==='boss'?26:9);
    sfx(e.type==='boss'?'bossdie':'die');
  }
}
