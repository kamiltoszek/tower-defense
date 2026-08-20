/* ============================== state ============================== */
/*
 * All mutable simulation collections live on `world` so any module can
 * reassign them (e.g. after a .filter() pass in update). `state` is the
 * game status object, mutated in place everywhere.
 */
export const world = {
  uid:0,
  towers:[], enemies:[], projs:[], effects:[], particles:[], floats:[],
  towerCell:new Map()
};

export function freshState(){
  return {
    phase:'start',            // start | build | wave | over | win
    gold:150, lives:20, wave:1,
    placing:null, selected:null,
    speed:1, paused:false, muted:false,
    queue:[], spawnT:0, interval:0.7,
    time:0, kills:0, multiHits:0, slowHits:0,
    shake:0                 // screen-shake magnitude, decays in update
  };
}
export let state = freshState();

export function resetWorld(){
  state=freshState();
  world.towers=[]; world.enemies=[]; world.projs=[];
  world.effects=[]; world.particles=[]; world.floats=[];
  world.towerCell=new Map();
}
resetWorld();

export const mouse={x:-99,y:-99,c:-1,r:-1,inside:false};
