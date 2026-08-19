/* ============================== fx helpers ============================== */
import { world } from './state.js';
import { rand, TAU } from './util.js';

export function addFloat(x,y,txt,color){ world.floats.push({x,y,txt,color,age:0,life:1.1}); }
export function burst(x,y,color,n){
  for(let i=0;i<n;i++){
    const a=rand(0,TAU), sp=rand(40,140);
    world.particles.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,age:0,life:rand(.35,.7),r:rand(1.5,3.2),color});
  }
}
