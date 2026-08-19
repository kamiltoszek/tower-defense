/* ============================== rendering ============================== */
import { TAU, clamp, rgba, rr, $ } from './util.js';
import { CELL, COLS, ROWS, W, H, pathSet, pts, TOTAL_LEN, pathDirs } from './board.js';
import { TOWERS, ETYPES } from './config.js';
import { state, world, mouse } from './state.js';
import { canPlace, towerStats } from './towers.js';

export const cvs=$('game'), ctx=cvs.getContext('2d');

/* Static background layer (built once) */
const bg=document.createElement('canvas'); bg.width=W; bg.height=H;
(function buildBG(){
  const b=bg.getContext('2d');
  b.fillStyle='#10151f'; b.fillRect(0,0,W,H);
  // subtle checker
  for(let c=0;c<COLS;c++) for(let r=0;r<ROWS;r++){
    if((c+r)%2===0){ b.fillStyle='rgba(255,255,255,0.018)'; b.fillRect(c*CELL,r*CELL,CELL,CELL); }
  }
  // grid lines
  b.strokeStyle='rgba(255,255,255,0.05)'; b.lineWidth=1;
  for(let c=0;c<=COLS;c++){ b.beginPath(); b.moveTo(c*CELL+.5,0); b.lineTo(c*CELL+.5,H); b.stroke(); }
  for(let r=0;r<=ROWS;r++){ b.beginPath(); b.moveTo(0,r*CELL+.5); b.lineTo(W,r*CELL+.5); b.stroke(); }
  // road
  for(const key of pathSet){
    const [c,r]=key.split(',').map(Number);
    b.fillStyle='#463b2e'; b.fillRect(c*CELL,r*CELL,CELL,CELL);
  }
  // speckles
  for(const key of pathSet){
    const [c,r]=key.split(',').map(Number);
    let h=(c*73856093)^(r*19349663)>>>0;
    const rnd=()=>{ h=(h*1664525+1013904223)>>>0; return h/4294967296; };
    b.fillStyle='rgba(0,0,0,0.22)';
    for(let i=0;i<3;i++){
      b.beginPath();
      b.arc(c*CELL+6+rnd()*28, r*CELL+6+rnd()*28, 1.4+rnd()*1.6, 0, TAU);
      b.fill();
    }
  }
  // road edges where exposed
  b.strokeStyle='#251f17'; b.lineWidth=3; b.lineCap='round';
  for(const key of pathSet){
    const [c,r]=key.split(',').map(Number);
    const x=c*CELL, y=r*CELL;
    const lines=[];
    if(!pathSet.has((c)+','+(r-1))) lines.push([x+1,y+1.5,x+39,y+1.5]);
    if(!pathSet.has((c)+','+(r+1))) lines.push([x+1,y+38.5,x+39,y+38.5]);
    if(!pathSet.has((c-1)+','+r))   lines.push([x+1.5,y+1,x+1.5,y+39]);
    if(!pathSet.has((c+1)+','+r))   lines.push([x+38.5,y+1,x+38.5,y+39]);
    for(const [x1,y1,x2,y2] of lines){ b.beginPath(); b.moveTo(x1,y1); b.lineTo(x2,y2); b.stroke(); }
  }
  // entry / exit markers
  b.fillStyle='rgba(111,209,111,0.9)';
  b.beginPath(); b.moveTo(2,pts[0].y); b.lineTo(24,pts[0].y-16); b.lineTo(24,pts[0].y+16); b.closePath(); b.fill();
  const e=pts[pts.length-1];
  b.fillStyle='#1c1416'; b.fillRect(W-14,e.y-18,12,36);
  b.fillStyle='rgba(224,82,82,0.95)';
  b.beginPath(); b.moveTo(W-3,e.y-18); b.lineTo(W-16,e.y-10); b.lineTo(W-3,e.y-2); b.closePath(); b.fill();
})();

function drawRange(x,y,r,color){
  ctx.beginPath(); ctx.arc(x,y,r,0,TAU);
  ctx.fillStyle=rgba(color,0.08); ctx.fill();
  ctx.strokeStyle=rgba(color,0.55); ctx.lineWidth=1.5; ctx.stroke();
}
function drawTowerBody(tw,alpha){
  const b=TOWERS[tw.type];
  ctx.save(); ctx.globalAlpha=alpha;
  ctx.translate(tw.x,tw.y);
  rr(ctx,-15,-15,30,30,6);
  ctx.fillStyle='#1b2231'; ctx.fill();
  ctx.strokeStyle=alpha<1?'#2e3950':'#33405e'; ctx.lineWidth=1.5; ctx.stroke();
  ctx.rotate(tw.angle);
  switch(tw.type){
    case 'archer':
      ctx.fillStyle='#67a83f'; ctx.beginPath(); ctx.arc(0,0,9,0,TAU); ctx.fill();
      ctx.fillStyle='#3f6d26'; ctx.beginPath(); ctx.arc(0,0,4.5,0,TAU); ctx.fill();
      ctx.strokeStyle='#d9efc9'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(5,0); ctx.lineTo(15,0); ctx.stroke();
      ctx.fillStyle='#d9efc9';
      ctx.beginPath(); ctx.moveTo(18,0); ctx.lineTo(13,-3.5); ctx.lineTo(13,3.5); ctx.closePath(); ctx.fill();
      break;
    case 'cannon':
      ctx.fillStyle='#5d5d66'; ctx.beginPath(); ctx.arc(0,0,10,0,TAU); ctx.fill();
      ctx.fillStyle='#3a3a42'; ctx.fillRect(3,-4.5,15,9);
      ctx.fillStyle='#232329'; ctx.beginPath(); ctx.arc(0,0,5.5,0,TAU); ctx.fill();
      break;
    case 'frost':
      ctx.rotate(Math.PI/4);
      ctx.fillStyle='#3fb6ef'; rr(ctx,-8,-8,16,16,3); ctx.fill();
      ctx.rotate(-Math.PI/4);
      ctx.fillStyle='rgba(255,255,255,0.75)';
      ctx.rotate(Math.PI/4); rr(ctx,-4,-4,8,8,2); ctx.fill(); ctx.rotate(-Math.PI/4);
      break;
    case 'sniper':
      ctx.fillStyle='#5a4b8a'; ctx.beginPath(); ctx.arc(0,0,8,0,TAU); ctx.fill();
      ctx.fillStyle='#2d2a3a'; ctx.fillRect(5,-3,21,6);
      ctx.fillStyle='#b79cff'; ctx.beginPath(); ctx.arc(11,0,3,0,TAU); ctx.fill();
      break;
  }
  if(tw.muzzle>0){
    const a=clamp(tw.muzzle/0.08,0,1);
    ctx.fillStyle=rgba('#ffd54f',a*0.9);
    ctx.beginPath(); ctx.arc(b.barrel+2,0,2+6*a,0,TAU); ctx.fill();
  }
  ctx.restore();
  // upgrade pips
  for(let i=0;i<tw.level-1;i++){
    ctx.fillStyle='#ffd54f';
    ctx.beginPath(); ctx.arc(tw.x-8+i*8,tw.y-20,2.4,0,TAU); ctx.fill();
  }
}
function drawEnemy(e){
  const t=ETYPES[e.type];
  ctx.save(); ctx.translate(e.x,e.y);
  switch(e.type){
    case 'runner':
      ctx.rotate(e.face);
      ctx.fillStyle=t.color;
      ctx.beginPath(); ctx.moveTo(11,0); ctx.lineTo(-7,7); ctx.lineTo(-3,0); ctx.lineTo(-7,-7); ctx.closePath(); ctx.fill();
      break;
    case 'soldier':
      ctx.fillStyle=t.color; ctx.beginPath(); ctx.arc(0,0,e.r,0,TAU); ctx.fill();
      ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.arc(2,2,e.r*0.55,0,TAU); ctx.fill();
      break;
    case 'tank':
      ctx.rotate(e.face*0.3);
      ctx.fillStyle=t.color; rr(ctx,-e.r,-e.r,e.r*2,e.r*2,4); ctx.fill();
      ctx.fillStyle='rgba(0,0,0,0.3)'; rr(ctx,-e.r*0.5,-e.r*0.5,e.r,e.r,3); ctx.fill();
      break;
    case 'boss':{
      ctx.rotate(state.time*1.2);
      ctx.fillStyle='#8c2f16';
      for(let i=0;i<8;i++){
        ctx.rotate(TAU/8);
        ctx.beginPath(); ctx.moveTo(e.r-2,-6); ctx.lineTo(e.r+9,0); ctx.lineTo(e.r-2,6); ctx.closePath(); ctx.fill();
      }
      ctx.rotate(-state.time*1.2);
      ctx.fillStyle=t.color; ctx.beginPath(); ctx.arc(0,0,e.r,0,TAU); ctx.fill();
      ctx.fillStyle='#5e1e0d'; ctx.beginPath(); ctx.arc(0,0,e.r*0.55,0,TAU); ctx.fill();
      ctx.fillStyle='#ffd180';
      ctx.beginPath(); ctx.arc(-6,-4,3,0,TAU); ctx.arc(6,-4,3,0,TAU); ctx.fill();
      break;}
  }
  ctx.restore();
  // frost tint
  if(e.slow>0){
    ctx.fillStyle='rgba(79,195,247,0.4)';
    ctx.beginPath(); ctx.arc(e.x,e.y,e.r+2,0,TAU); ctx.fill();
    ctx.strokeStyle='rgba(220,245,255,0.9)'; ctx.lineWidth=1.5;
    const s=e.r+5, a=state.time*3;
    for(let i=0;i<3;i++){
      const an=a+i*TAU/6;
      ctx.beginPath();
      ctx.moveTo(e.x-Math.cos(an)*s,e.y-Math.sin(an)*s);
      ctx.lineTo(e.x+Math.cos(an)*s,e.y+Math.sin(an)*s);
      ctx.stroke();
    }
  }
  // health bar
  const pct=clamp(e.hp/e.maxHp,0,1);
  const bw=e.type==='boss'?48:Math.max(22,e.r*2.2);
  const bh=e.type==='boss'?5:4;
  const x=e.x-bw/2, y=e.y-e.r-(e.type==='boss'?12:9);
  ctx.fillStyle='rgba(0,0,0,0.65)'; ctx.fillRect(x-1,y-1,bw+2,bh+2);
  ctx.fillStyle=`hsl(${pct*115},72%,52%)`; ctx.fillRect(x,y,bw*pct,bh);
}
function drawProj(p){
  const ang=Math.atan2(p.ty-p.y,p.tx-p.x);
  ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(ang);
  switch(p.kind){
    case 'archer':
      ctx.strokeStyle='#d9efc9'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(-8,0); ctx.lineTo(4,0); ctx.stroke();
      ctx.fillStyle='#d9efc9';
      ctx.beginPath(); ctx.moveTo(8,0); ctx.lineTo(3,-3); ctx.lineTo(3,3); ctx.closePath(); ctx.fill();
      break;
    case 'cannon':
      ctx.fillStyle='#2b2620'; ctx.beginPath(); ctx.arc(0,0,5,0,TAU); ctx.fill();
      ctx.strokeStyle='#8a6a3f'; ctx.lineWidth=1.5; ctx.stroke();
      break;
    case 'frost':
      ctx.fillStyle='rgba(191,233,255,0.35)'; ctx.beginPath(); ctx.arc(0,0,7,0,TAU); ctx.fill();
      ctx.rotate(TAU/8);
      ctx.fillStyle='#bfe9ff'; ctx.fillRect(-3.5,-3.5,7,7);
      break;
    case 'sniper':
      ctx.strokeStyle='#d0baff'; ctx.lineWidth=2.5;
      ctx.beginPath(); ctx.moveTo(-16,0); ctx.lineTo(6,0); ctx.stroke();
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(6,0,2,0,TAU); ctx.fill();
      break;
  }
  ctx.restore();
}
export function draw(){
  ctx.drawImage(bg,0,0);

  // animated direction chevrons on the road
  ctx.strokeStyle='rgba(255,255,255,0.17)'; ctx.lineWidth=2; ctx.lineCap='round';
  const N=13, seg=TOTAL_LEN/N, off=(state.time*26)%seg;
  for(let k=0;k<N;k++){
    const d=k*seg+off;
    if(d>=TOTAL_LEN) continue;
    const i=clamp(Math.floor(d/CELL),0,pts.length-2);
    const a=pts[i], b=pts[i+1], t=(d-i*CELL)/CELL;
    const x=a.x+(b.x-a.x)*t, y=a.y+(b.y-a.y)*t;
    ctx.save(); ctx.translate(x,y); ctx.rotate(pathDirs[i]);
    ctx.beginPath(); ctx.moveTo(-5,-6); ctx.lineTo(3,0); ctx.lineTo(-5,6); ctx.stroke();
    ctx.restore();
  }

  // hover / placement feedback
  if(state.phase==='build'||state.phase==='wave'){
    if(state.placing&&mouse.inside){
      const c=mouse.c, r=mouse.r;
      const ok=canPlace(c,r)&&state.gold>=TOWERS[state.placing].cost;
      const x=c*CELL+CELL/2, y=r*CELL+CELL/2;
      const b=TOWERS[state.placing];
      drawRange(x,y,b.range,b.color);
      ctx.fillStyle=ok?'rgba(124,194,79,0.25)':'rgba(255,82,82,0.3)';
      ctx.fillRect(c*CELL+1,r*CELL+1,CELL-2,CELL-2);
      const ghost={type:state.placing,level:1,x,y,angle:-Math.PI/2,muzzle:0};
      drawTowerBody(ghost,ok?0.65:0.4);
    }else if(mouse.inside&&!state.placing){
      const c=mouse.c, r=mouse.r;
      if(c>=0&&r>=0&&c<COLS&&r<ROWS){
        ctx.strokeStyle=world.towerCell.has(c+','+r)?'rgba(255,255,255,0.5)':'rgba(255,255,255,0.18)';
        ctx.lineWidth=1.5;
        ctx.strokeRect(c*CELL+1.5,r*CELL+1.5,CELL-3,CELL-3);
      }
    }
  }

  // selected tower range (under the tower sprite)
  if(state.selected){
    const s=towerStats(state.selected);
    drawRange(state.selected.x,state.selected.y,s.range,TOWERS[state.selected.type].color);
  }

  for(const tw of world.towers) drawTowerBody(tw,1);

  if(state.selected){
    const s=towerStats(state.selected);
    drawRange(state.selected.x,state.selected.y,s.range,TOWERS[state.selected.type].color);
    ctx.strokeStyle='#fff'; ctx.lineWidth=2;
    rr(ctx,state.selected.x-17,state.selected.y-17,34,34,7); ctx.stroke();
  }

  for(const e of world.enemies) drawEnemy(e);
  for(const p of world.projs) drawProj(p);

  // effects
  for(const f of world.effects){
    const t=f.age/f.life;
    if(f.type==='ring'){
      ctx.strokeStyle=rgba(f.color,1-t); ctx.lineWidth=3;
      ctx.beginPath(); ctx.arc(f.x,f.y,f.r0+(f.r1-f.r0)*t,0,TAU); ctx.stroke();
    }else if(f.type==='snow'){
      ctx.strokeStyle=`rgba(210,240,255,${1-t})`; ctx.lineWidth=1.5;
      const s=6+10*t, a=f.age*4;
      for(let i=0;i<3;i++){
        const an=a+i*TAU/6;
        ctx.beginPath();
        ctx.moveTo(f.x-Math.cos(an)*s,f.y-Math.sin(an)*s);
        ctx.lineTo(f.x+Math.cos(an)*s,f.y+Math.sin(an)*s);
        ctx.stroke();
      }
    }else if(f.type==='banner'){
      const a=Math.min(1,t*4,(1-t)*2.5);
      ctx.textAlign='center';
      ctx.fillStyle=`rgba(255,255,255,${a})`;
      ctx.font='bold 44px sans-serif';
      ctx.fillText(f.text,W/2,H*0.34);
      if(f.sub){ ctx.fillStyle=`rgba(255,120,90,${a})`; ctx.font='bold 20px sans-serif'; ctx.fillText(f.sub,W/2,H*0.34+30); }
    }
  }
  // particles
  for(const p of world.particles){
    ctx.fillStyle=rgba(p.color,1-p.age/p.life);
    ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,TAU); ctx.fill();
  }
  // floating texts
  ctx.textAlign='center';
  for(const f of world.floats){
    ctx.fillStyle=rgba(f.color,clamp(1-f.age/f.life,0,1));
    ctx.font='bold 14px sans-serif';
    ctx.fillText(f.txt,f.x,f.y);
  }

  if(state.paused&&(state.phase==='build'||state.phase==='wave')){
    ctx.fillStyle='rgba(6,9,15,0.55)'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#fff'; ctx.font='bold 40px sans-serif'; ctx.textAlign='center';
    ctx.fillText('PAUSED',W/2,H/2-8);
    ctx.font='15px sans-serif'; ctx.fillStyle='#aab6cc';
    ctx.fillText('Press P to resume',W/2,H/2+22);
  }
}

/* ---------- responsive canvas sizing ---------- */
const stageEl=$('stage'), hudEl=$('hud'), mainEl=document.querySelector('main');
const isStacked=()=>innerWidth<=960;
export function fitCanvas(){
  let s;
  if(isStacked()){
    const availW=Math.max(200,mainEl.clientWidth-2);
    const availH=Math.max(160,innerHeight-hudEl.offsetHeight-28);
    s=Math.min(availW/W,availH/H,1);
  }else{
    s=Math.min(Math.max(200,stageEl.clientWidth-2)/W,1);
  }
  s=clamp(s,0.25,1);
  cvs.style.width=Math.round(W*s)+'px';
  cvs.style.height=Math.round(H*s)+'px';
}
