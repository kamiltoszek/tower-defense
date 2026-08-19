/* ============================== towers ============================== */
import { CELL, COLS, ROWS, pathSet } from './board.js';
import { TOWERS, MAX_LEVEL } from './config.js';
import { state, world } from './state.js';
import { sfx } from './audio.js';
import { addFloat, burst } from './fx.js';

export function canPlace(c,r){
  return c>=0&&r>=0&&c<COLS&&r<ROWS && !pathSet.has(c+','+r) && !world.towerCell.has(c+','+r);
}
export function towerStats(tw){
  const b=TOWERS[tw.type], L=tw.level-1;
  return {
    dmg: Math.round(b.dmg*Math.pow(1.45,L)*10)/10,
    range: b.range*Math.pow(1.08,L),
    rate: b.rate*Math.pow(0.92,L),
    speed: b.speed,
    splash: b.splash?(b.splash*(1+0.06*L)):0,
    slow: b.slow,
    slowDur: b.slowDur?b.slowDur*(1+0.15*L):0
  };
}
export function upCost(tw){ return Math.round(TOWERS[tw.type].cost*0.8*tw.level); }
export function sellValue(tw){ return Math.floor(tw.spent*0.7); }

export function placeTower(type,c,r){
  if(!canPlace(c,r)) return false;
  const b=TOWERS[type];
  if(state.gold<b.cost){ sfx('deny'); addFloat(c*CELL+20,r*CELL+20,'Need '+b.cost+'g','#ff8a80'); return false; }
  const tw={uid:++world.uid, type, col:c, row:r, x:c*CELL+CELL/2, y:r*CELL+CELL/2,
            level:1, spent:b.cost, cd:0, angle:-Math.PI/2, muzzle:0};
  state.gold-=b.cost;
  world.towers.push(tw); world.towerCell.set(c+','+r,tw);
  state.placing=null; state.selected=tw;
  burst(tw.x,tw.y,b.color,10); sfx('build');
  return true;
}
export function doUpgrade(tw){
  if(!tw||tw.level>=MAX_LEVEL) return;
  const c=upCost(tw);
  if(state.gold<c){ sfx('deny'); addFloat(tw.x,tw.y-18,'Need '+c+'g','#ff8a80'); return; }
  state.gold-=c; tw.level++; tw.spent+=c;
  burst(tw.x,tw.y,'#ffd54f',12); sfx('upgrade');
}
export function doSell(tw){
  const v=sellValue(tw);
  state.gold+=v;
  world.towers.splice(world.towers.indexOf(tw),1);
  world.towerCell.delete(tw.col+','+tw.row);
  if(state.selected===tw) state.selected=null;
  addFloat(tw.x,tw.y,'+'+v+'g','#f5c542');
  burst(tw.x,tw.y,'#8b95ab',8); sfx('sell');
}
