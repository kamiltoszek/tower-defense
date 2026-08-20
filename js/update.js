/* ============================== update (simulation step) ============================== */
import { W, TOTAL_LEN, pointAt } from './board.js';
import { WAVES } from './config.js';
import { state, world } from './state.js';
import { sfx } from './audio.js';
import { addFloat } from './fx.js';
import { towerStats } from './towers.js';
import { spawnEnemy, acquire, fire, hitEnemy } from './combat.js';
import { doGameOver, doVictory } from './waves.js';

export function update(dt){
  state.time+=dt;
  if(state.shake>0) state.shake=Math.max(0,state.shake-dt*1.8);
  if(state.shake<=0) state.shake=0;

  // spawning
  if(state.phase==='wave'&&state.queue.length){
    state.spawnT-=dt;
    if(state.spawnT<=0){ spawnEnemy(state.queue.shift()); state.spawnT=state.interval; }
  }

  // enemies
  for(const e of world.enemies){
    if(e.dead) continue;
    if(e.slow>0){ e.slow-=dt; if(e.slow<=0) e.slowAmt=0; }
    if(e.flash>0) e.flash-=dt;
    const mul=e.slow>0?1-e.slowAmt:1;
    e.dist+=e.speed*mul*dt;
    const p=pointAt(e.dist); e.x=p.x; e.y=p.y;
    if(e.dist>=TOTAL_LEN){
      e.dead=true;
      state.lives-=e.lives;
      state.shake=Math.max(state.shake,0.35);
      addFloat(e.x-24,e.y,'-'+e.lives+(e.lives>1?' lives':' life'),'#ff5252');
      sfx('leak');
      if(state.lives<=0){ state.lives=0; doGameOver(); }
    } else {
      const p2=pointAt(e.dist+3);
      const dx=p2.x-e.x, dy=p2.y-e.y;
      if(dx*dx+dy*dy>0.0001) e.face=Math.atan2(dy,dx);
    }
  }
  world.enemies=world.enemies.filter(e=>!e.dead);

  // towers
  for(const tw of world.towers){
    if(tw.muzzle>0) tw.muzzle-=dt;
    if(tw.cd>0){ tw.cd-=dt; continue; }
    const s=towerStats(tw);
    const t=acquire(tw,s);
    if(t){ fire(tw,t); tw.cd=s.rate; }
  }

  // projectiles
  for(const p of world.projs){
    if(p.dead) continue;
    const t=p.target;
    if(t&&!t.dead){ p.tx=t.x; p.ty=t.y; }
    const dx=p.tx-p.x, dy=p.ty-p.y;
    const d=Math.hypot(dx,dy);
    const step=p.speed*dt;
    const hitR=(t&&!t.dead)?t.r:2;
    if(d<=step+hitR){
      p.dead=true;
      if(p.kind==='cannon'){
        // splash: hits every enemy inside the blast radius
        world.effects.push({type:'ring',x:p.tx,y:p.ty,age:0,life:.38,r0:6,r1:p.splash,color:'#ffb74d'});
        world.effects.push({type:'ring',x:p.tx,y:p.ty,age:0,life:.20,r0:3,r1:p.splash*0.55,color:'#fff3e0'});
        let hits=0;
        for(const e of world.enemies){
          if(e.dead) continue;
          if(Math.hypot(e.x-p.tx,e.y-p.ty)<=p.splash+e.r){ hitEnemy(e,p.dmg); if(!e.dead||true) hits++; }
        }
        if(hits>=2) state.multiHits++;
        state.shake=Math.max(state.shake,0.18);
        sfx('boom');
      }else if(t&&!t.dead){
        hitEnemy(t,p.dmg);
        if(p.slow>0&&t.hp>0){
          t.slow=Math.max(t.slow,p.slowDur);
          t.slowAmt=p.slow;
          state.slowHits++;
          world.effects.push({type:'snow',x:t.x,y:t.y,age:0,life:.5});
        }
      }else{
        world.particles.push({x:p.tx,y:p.ty,vx:0,vy:0,age:0,life:.25,r:2.5,color:'#7d8aa0'});
      }
    }else{
      p.x+=dx/d*step; p.y+=dy/d*step;
    }
  }
  world.projs=world.projs.filter(p=>!p.dead);

  // fx
  for(const f of world.effects) f.age+=dt;
  world.effects=world.effects.filter(f=>f.age<f.life);
  for(const p of world.particles){ p.age+=dt; p.x+=p.vx*dt; p.y+=p.vy*dt; p.vx*=0.92; p.vy*=0.92; }
  world.particles=world.particles.filter(p=>p.age<p.life);
  for(const f of world.floats){ f.age+=dt; f.y-=26*dt; }
  world.floats=world.floats.filter(f=>f.age<f.life);

  // wave complete?
  if(state.phase==='wave'&&state.queue.length===0&&world.enemies.length===0){
    const bonus=20+8*state.wave;
    state.gold+=bonus;
    addFloat(W/2,110,'Wave bonus +'+bonus+'g','#f5c542');
    sfx('waveclear');
    if(state.wave>=WAVES.length){ doVictory(); }
    else{ state.wave++; state.phase='build'; }
  }
}
