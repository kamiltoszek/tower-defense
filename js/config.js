/* ============================== data (balance) ============================== */
export const TOWERS={
  archer:{name:'Archer', cost:50,  range:100, rate:0.5,  dmg:12,  speed:520, splash:0,  slow:0,   slowDur:0,   color:'#7cc24f', barrel:15, desc:'Cheap and fast. Reliable single-target damage.'},
  cannon:{name:'Cannon', cost:90,  range:110, rate:1.5,  dmg:28,  speed:240, splash:60, slow:0,   slowDur:0,   color:'#c07a4e', barrel:18, desc:'Slow shot that explodes for heavy splash damage.'},
  frost: {name:'Frost',  cost:70,  range:90,  rate:0.7,  dmg:6,   speed:380, splash:0,  slow:0.5, slowDur:1.5, color:'#4fc3f7', barrel:12, desc:'Chills targets, slowing them by 50%.'},
  sniper:{name:'Sniper', cost:140, range:230, rate:2.6,  dmg:130, speed:900, splash:0,  slow:0,   slowDur:0,   color:'#9b7bea', barrel:26, desc:'Enormous range and devastating single-shot damage.'}
};
export const TOWER_ORDER=['archer','cannon','frost','sniper'];
export const MAX_LEVEL=4;   // base + 3 upgrades

export const ETYPES={
  runner: {name:'Runner',  hp:38,   speed:105, r:8,  gold:6,   lives:1, color:'#9ccc2e'},
  soldier:{name:'Soldier', hp:70,   speed:62,  r:10, gold:9,   lives:1, color:'#e05252'},
  tank:   {name:'Tank',    hp:240,  speed:38,  r:13, gold:20,  lives:1, color:'#a45fd3'},
  boss:   {name:'BOSS',    hp:1400, speed:40,  r:20, gold:150, lives:5, color:'#ff7043'}
};

// Difficulty: enemy HP/speed scaling, starting gold/lives, wave-bonus
// multiplier and total number of waves for each mode.
export const DIFFS={
  easy:  {name:'Easy',   hp:1,    spd:1,    lives:20, gold:150, bonus:1,    waves:20},
  normal:{name:'Normal', hp:1.15, spd:1.05, lives:15, gold:150, bonus:0.95, waves:25},
  hard:  {name:'Hard',   hp:1.3,  spd:1.12, lives:12, gold:150, bonus:0.88, waves:30}
};
export const DIFF_ORDER=['easy','normal','hard'];
export function waveBonus(w,diff){ return Math.round((20+8*w)*DIFFS[diff].bonus); }

// 30 waves; a boss appears on every 5th wave.
// Easy ends after wave 20, Normal after wave 25, Hard after wave 30.
export const WAVES=[
  [['soldier',8]],
  [['soldier',10],['runner',4]],
  [['soldier',8],['runner',8]],
  [['soldier',10],['runner',10]],
  [['soldier',8],['runner',6],['boss',1]],
  [['runner',16],['soldier',6]],
  [['soldier',12],['runner',10]],
  [['tank',4],['soldier',10],['runner',8]],
  [['soldier',12],['runner',16]],
  [['soldier',12],['runner',12],['boss',1]],
  [['soldier',14],['runner',12],['tank',4]],
  [['tank',8],['runner',14],['soldier',8]],
  [['soldier',18],['runner',10]],
  [['tank',10],['runner',16],['soldier',10]],
  [['tank',8],['soldier',14],['runner',10],['boss',1]],
  [['tank',12],['runner',18],['soldier',12]],
  [['soldier',20],['runner',16],['tank',8]],
  [['tank',14],['runner',20],['soldier',16]],
  [['tank',16],['runner',20],['soldier',16]],
  [['tank',12],['runner',20],['soldier',14],['boss',1]],
  [['soldier',16],['runner',14],['tank',6]],
  [['tank',12],['runner',16],['soldier',10]],
  [['soldier',22],['runner',14]],
  [['tank',14],['runner',20],['soldier',12]],
  [['tank',10],['soldier',16],['runner',12],['boss',1]],
  [['tank',16],['runner',22],['soldier',14]],
  [['soldier',24],['runner',20],['tank',10]],
  [['tank',18],['runner',24],['soldier',20]],
  [['tank',20],['runner',24],['soldier',20]],
  [['tank',16],['runner',24],['soldier',18],['boss',1]]
];

export function waveHpMul(w){ return 1 + 0.08*(w-1) + 0.005*(w-1)*(w-1); }
export function waveSpdMul(w){ return 1 + 0.008*(w-1); }
export function bossHp(w){ return 1400*(1 + 0.5*(w-5)); }

export function buildQueue(def){
  const lists=def.map(([t,n])=>({t,n}));
  const q=[];
  let any=true;
  while(any){ any=false; for(const l of lists){ if(l.n>0){ q.push(l.t); l.n--; any=true; } } }
  const bi=q.indexOf('boss');
  if(bi>=0){ q.splice(bi,1); q.splice(Math.floor(q.length*0.6),0,'boss'); }
  return q;
}
