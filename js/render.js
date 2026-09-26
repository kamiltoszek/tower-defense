/* ============================== rendering ============================== */
import { TAU, clamp, rgba, rr, $ } from './util.js';
import { CELL, COLS, ROWS, W, H, pathSet, pts, TOTAL_LEN, pathDirs, setWaypoints } from './board.js';
import { TOWERS, ETYPES, MAX_LEVEL } from './config.js';
import { state, world, mouse } from './state.js';
import { canPlace, towerStats } from './towers.js';

export const cvs=$('game'), ctx=cvs.getContext('2d');

/* small color helpers */
function mix(hex,amt){ // toward white
  const n=parseInt(hex.slice(1),16), f=c=>Math.round(c+(255-c)*amt);
  return `rgb(${f((n>>16)&255)},${f((n>>8)&255)},${f(n&255)})`;
}
function shade(hex,amt){ // toward black
  const n=parseInt(hex.slice(1),16), d=1-amt;
  return `rgb(${Math.round(((n>>16)&255)*d)},${Math.round(((n>>8)&255)*d)},${Math.round((n&255)*d)})`;
}
function hash(c,r,s){ let h=(((c+1)*73856093)^((r+1)*19349663)^((s+1)*83492791))>>>0; h=(h*1664525+1013904223)>>>0; return h/4294967296; }

/* Static background layer (rebuilt when the map changes) */
const bg=document.createElement('canvas'); bg.width=W; bg.height=H;
function buildBG(){
  const b=bg.getContext('2d');
  b.fillStyle='#10151f'; b.fillRect(0,0,W,H);
  // grass: per-cell tonal variation so the field doesn't read as flat
  for(let c=0;c<COLS;c++) for(let r=0;r<ROWS;r++){
    if(pathSet.has(c+','+r)) continue;
    const n=hash(c,r,1);
    b.fillStyle= n>0.5 ? `rgba(150,180,150,${((n-0.5)*0.07).toFixed(3)})`
                       : `rgba(0,0,0,${((0.5-n)*0.09).toFixed(3)})`;
    b.fillRect(c*CELL,r*CELL,CELL,CELL);
    if((c+r)%2===0){ b.fillStyle='rgba(255,255,255,0.012)'; b.fillRect(c*CELL,r*CELL,CELL,CELL); }
  }
  // grass tufts and pebbles
  for(let c=0;c<COLS;c++) for(let r=0;r<ROWS;r++){
    if(pathSet.has(c+','+r)) continue;
    const n=hash(c,r,2);
    if(n>0.72){
      const gx=c*CELL+7+hash(c,r,3)*26, gy=r*CELL+12+hash(c,r,4)*23;
      b.strokeStyle='rgba(148,199,140,0.15)'; b.lineWidth=1.3; b.lineCap='round';
      b.beginPath();
      b.moveTo(gx,gy); b.quadraticCurveTo(gx-2,gy-4,gx-4,gy-6);
      b.moveTo(gx,gy); b.quadraticCurveTo(gx+1,gy-5,gx+1,gy-7);
      b.moveTo(gx,gy); b.quadraticCurveTo(gx+2,gy-4,gx+4,gy-5);
      b.stroke();
    }else if(n<0.10){
      const n2=hash(c,r,5);
      b.fillStyle='rgba(0,0,0,0.28)';
      b.beginPath(); b.arc(c*CELL+6+n2*28, r*CELL+6+hash(c,r,6)*28, 1.1+n2*1.3,0,TAU); b.fill();
    }
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
  // worn band along the route: dark rim + packed center
  const roadPath=()=>{ b.beginPath(); b.moveTo(pts[0].x,pts[0].y); for(let i=1;i<pts.length;i++) b.lineTo(pts[i].x,pts[i].y); b.stroke(); };
  b.lineCap='round'; b.lineJoin='round';
  b.strokeStyle='rgba(0,0,0,0.12)'; b.lineWidth=CELL; roadPath();
  b.strokeStyle='rgba(158,134,96,0.16)'; b.lineWidth=22; roadPath();
  b.strokeStyle='rgba(255,236,200,0.05)'; b.lineWidth=8; roadPath();
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
  // entry marker: pad + spawn arrow
  const s=pts[0];
  b.fillStyle='rgba(124,194,79,0.13)'; b.fillRect(0,s.y-19,26,38);
  b.fillStyle='rgba(124,194,79,0.9)';
  b.beginPath(); b.moveTo(4,s.y); b.lineTo(24,s.y-13); b.lineTo(24,s.y+13); b.closePath(); b.fill();
  // exit marker: stone gate + warning arrow
  const e=pts[pts.length-1];
  b.fillStyle='#232b3c'; b.fillRect(W-20,e.y-22,18,44);
  b.fillStyle='rgba(255,255,255,0.05)'; b.fillRect(W-20,e.y-22,18,3);
  b.fillStyle='#141a26'; b.fillRect(W-15,e.y-16,7,32);
  b.fillStyle='rgba(224,82,82,0.95)';
  b.beginPath(); b.moveTo(W-5,e.y-14); b.lineTo(W-16,e.y-8); b.lineTo(W-5,e.y-2); b.closePath(); b.fill();
  // vignette: focus the eye on the board center
  const vg=b.createRadialGradient(W/2,H/2,Math.min(W,H)*0.42, W/2,H/2, Math.max(W,H)*0.72);
  vg.addColorStop(0,'rgba(0,0,0,0)');
  vg.addColorStop(1,'rgba(4,7,13,0.5)');
  b.fillStyle=vg; b.fillRect(0,0,W,H);
}
buildBG();
export function rebuildBG(){ buildBG(); }
/* Thumbnail for the map picker: applies the given waypoints, renders the
 * full background, downscales it. The caller restores the live board. */
export function makeThumb(wp,w=192,h=120){
  setWaypoints(wp);
  buildBG();
  const c=document.createElement('canvas'); c.width=w; c.height=h;
  c.getContext('2d').drawImage(bg,0,0,w,h);
  return c;
}

function drawRange(x,y,r,color){
  ctx.beginPath(); ctx.arc(x,y,r,0,TAU);
  ctx.fillStyle=rgba(color,0.08); ctx.fill();
  ctx.strokeStyle=rgba(color,0.55); ctx.lineWidth=1.5; ctx.stroke();
}
const EDGE_BY_LV=['#33405e','#3f4e73','#4d6090','#a58c4c'];
function drawTowerBody(tw,alpha){
  const b=TOWERS[tw.type];
  const lv=Math.min(tw.level||1,MAX_LEVEL);
  const ext=(lv-1)*1.6;
  ctx.save(); ctx.globalAlpha=alpha;
  // ground shadow
  if(alpha>=1){
    ctx.fillStyle='rgba(0,0,0,0.32)';
    ctx.beginPath(); ctx.ellipse(tw.x,tw.y+13,14,5.5,0,0,TAU); ctx.fill();
  }
  ctx.translate(tw.x,tw.y);
  // base plate with bevel
  rr(ctx,-15,-15,30,30,6);
  const g=ctx.createLinearGradient(0,-15,0,15);
  g.addColorStop(0,lv>=2?mix('#232c40',0.04):'#232c40');
  g.addColorStop(1,shade('#232c40',0.18));
  ctx.fillStyle=alpha<1?'#1b2231':g; ctx.fill();
  ctx.strokeStyle=alpha<1?'#2e3950':EDGE_BY_LV[lv-1]; ctx.lineWidth=1.5; ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,0.06)'; ctx.lineWidth=1;
  rr(ctx,-13.5,-13.5,27,27,5); ctx.stroke();
  if(lv>=3){
    ctx.strokeStyle=lv>=4?'rgba(255,213,79,0.85)':'rgba(255,213,79,0.38)';
    ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(0,0,11.5,0,TAU); ctx.stroke();
  }
  ctx.rotate(tw.angle);
  switch(tw.type){
    case 'archer':
      ctx.fillStyle='#67a83f'; ctx.beginPath(); ctx.arc(0,0,9,0,TAU); ctx.fill();
      ctx.fillStyle=mix('#3f6d26',(lv-1)*0.10); ctx.beginPath(); ctx.arc(0,0,4.5,0,TAU); ctx.fill();
      ctx.strokeStyle='#d9efc9'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(5,0); ctx.lineTo(15+ext,0); ctx.stroke();
      ctx.fillStyle='#d9efc9';
      ctx.beginPath(); ctx.moveTo(18+ext,0); ctx.lineTo(13+ext,-3.5); ctx.lineTo(13+ext,3.5); ctx.closePath(); ctx.fill();
      break;
    case 'cannon':
      ctx.fillStyle='#5d5d66'; ctx.beginPath(); ctx.arc(0,0,10,0,TAU); ctx.fill();
      ctx.fillStyle='#3a3a42'; ctx.fillRect(3,-4.5,15+ext,9);
      ctx.fillStyle='rgba(255,255,255,0.07)'; ctx.fillRect(3,-4.5,15+ext,2);
      ctx.fillStyle=mix('#232329',(lv-1)*0.08); ctx.beginPath(); ctx.arc(0,0,5.5,0,TAU); ctx.fill();
      break;
    case 'frost':
      if(lv>=2){ ctx.globalCompositeOperation='lighter'; ctx.fillStyle='rgba(79,195,247,0.30)'; ctx.beginPath(); ctx.arc(0,0,9,0,TAU); ctx.fill(); ctx.globalCompositeOperation='source-over'; }
      ctx.rotate(Math.PI/4);
      ctx.fillStyle=mix('#3fb6ef',(lv-1)*0.12); rr(ctx,-8,-8,16,16,3); ctx.fill();
      ctx.rotate(-Math.PI/4);
      ctx.fillStyle=`rgba(255,255,255,${0.6+lv*0.08})`;
      ctx.rotate(Math.PI/4); rr(ctx,-4,-4,8,8,2); ctx.fill(); ctx.rotate(-Math.PI/4);
      break;
    case 'sniper':
      ctx.fillStyle='#5a4b8a'; ctx.beginPath(); ctx.arc(0,0,8,0,TAU); ctx.fill();
      ctx.fillStyle='#2d2a3a'; ctx.fillRect(5,-3,21+ext,6);
      if(lv>=2){ ctx.globalCompositeOperation='lighter'; ctx.fillStyle='rgba(140,110,240,0.30)'; ctx.beginPath(); ctx.arc(11+ext,0,4.5,0,TAU); ctx.fill(); ctx.globalCompositeOperation='source-over'; }
      ctx.fillStyle='#b79cff'; ctx.beginPath(); ctx.arc(11+ext,0,3,0,TAU); ctx.fill();
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
  // ground shadow
  ctx.fillStyle='rgba(0,0,0,0.30)';
  ctx.beginPath(); ctx.ellipse(e.x,e.y+e.r*0.72,e.r*0.95,e.r*0.38,0,0,TAU); ctx.fill();
  // walk bob (squash/stretch) + hit pop
  const f=clamp(e.flash>0?e.flash/0.08:0,0,1);
  const sq=Math.sin(e.dist*0.22)*0.05;
  ctx.save(); ctx.translate(e.x,e.y);
  ctx.scale((1+sq)*(1+f*0.15),(1-sq)*(1+f*0.15));
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
  // hit flash
  if(f>0){
    ctx.fillStyle=rgba('#ffffff',f*0.65);
    ctx.beginPath(); ctx.arc(0,0,e.r+(e.type==='boss'?7:2),0,TAU); ctx.fill();
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
  const glow=fn=>{ ctx.globalCompositeOperation='lighter'; fn(); ctx.globalCompositeOperation='source-over'; };
  switch(p.kind){
    case 'archer':
      ctx.strokeStyle='rgba(217,239,201,0.35)'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(-12,0); ctx.lineTo(-4,0); ctx.stroke();
      ctx.strokeStyle='#d9efc9';
      ctx.beginPath(); ctx.moveTo(-8,0); ctx.lineTo(4,0); ctx.stroke();
      ctx.fillStyle='#d9efc9';
      ctx.beginPath(); ctx.moveTo(8,0); ctx.lineTo(3,-3); ctx.lineTo(3,3); ctx.closePath(); ctx.fill();
      break;
    case 'cannon':
      for(let i=3;i>=1;i--){ // smoke trail
        ctx.fillStyle=`rgba(168,173,184,${(0.30/i+0.04).toFixed(2)})`;
        ctx.beginPath(); ctx.arc(-i*4.5,Math.sin(i*1.7)*1.6,1.4+i*1.15,0,TAU); ctx.fill();
      }
      ctx.fillStyle='#2b2620'; ctx.beginPath(); ctx.arc(0,0,5,0,TAU); ctx.fill();
      ctx.strokeStyle='#8a6a3f'; ctx.lineWidth=1.5; ctx.stroke();
      break;
    case 'frost':
      glow(()=>{ ctx.fillStyle='rgba(79,195,247,0.30)'; ctx.beginPath(); ctx.arc(0,0,9,0,TAU); ctx.fill(); });
      ctx.rotate(TAU/8+state.time*6);
      ctx.fillStyle='#bfe9ff'; ctx.fillRect(-3.5,-3.5,7,7);
      break;
    case 'sniper':{
      const gr=ctx.createLinearGradient(-26,0,8,0);
      gr.addColorStop(0,'rgba(155,123,234,0)');
      gr.addColorStop(1,'rgba(208,186,255,0.55)');
      ctx.strokeStyle=gr; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(-26,0); ctx.lineTo(6,0); ctx.stroke();
      glow(()=>{ ctx.fillStyle='rgba(155,123,234,0.45)'; ctx.beginPath(); ctx.arc(4,0,5,0,TAU); ctx.fill(); });
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(6,0,2,0,TAU); ctx.fill();
      ctx.fillStyle='#d0baff';
      ctx.beginPath(); ctx.moveTo(11,0); ctx.lineTo(4,-2.5); ctx.lineTo(4,2.5); ctx.closePath(); ctx.fill();
      break;}
  }
  ctx.restore();
}
export function draw(){
  ctx.save();
  if(state.shake>0){ // offset frozen while paused (state.time stands still)
    const s=state.shake*10;
    ctx.translate(Math.sin(state.time*67)*s, Math.cos(state.time*53)*s*0.7);
  }
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
    ctx.fillStyle='rgba(6,9,15,0.55)'; ctx.fillRect(-12,-12,W+24,H+24);
    ctx.fillStyle='#fff'; ctx.font='bold 40px sans-serif'; ctx.textAlign='center';
    ctx.fillText('PAUSED',W/2,H/2-8);
    ctx.font='15px sans-serif'; ctx.fillStyle='#aab6cc';
    ctx.fillText('Press P to resume',W/2,H/2+22);
  }
  ctx.restore();
}

/* ---------- responsive canvas sizing ---------- */
const stageEl=$('stage'), hudEl=$('hud'), mainEl=document.querySelector('main');
const isStacked=()=>innerWidth<=960;
export function fitCanvas(){
  let s;
  if(isStacked()){
    const availW=Math.max(200,mainEl.clientWidth-2);
    const bs=getComputedStyle(document.body); // padding includes safe-area insets
    const padV=parseFloat(bs.paddingTop)+parseFloat(bs.paddingBottom);
    const availH=Math.max(160,innerHeight-hudEl.offsetHeight-padV);
    s=Math.min(availW/W,availH/H,1);
  }else{
    s=Math.min(Math.max(200,stageEl.clientWidth-2)/W,1);
  }
  s=clamp(s,0.25,1);
  cvs.style.width=Math.round(W*s)+'px';
  cvs.style.height=Math.round(H*s)+'px';
}
