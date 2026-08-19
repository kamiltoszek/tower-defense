/* ============================== input ============================== */
import { $ } from './util.js';
import { W, H, CELL, pathSet } from './board.js';
import { TOWER_ORDER } from './config.js';
import { state, world, mouse, resetWorld } from './state.js';
import { audio, sfx } from './audio.js';
import { addFloat } from './fx.js';
import { placeTower, doUpgrade, doSell } from './towers.js';
import { sendWave } from './waves.js';
import { syncHud, checkOrientation, hideOverlay, shopBtns } from './dom.js';
import { cvs } from './render.js';

function mousePos(ev){
  const r=cvs.getBoundingClientRect();
  return {x:(ev.clientX-r.left)*(W/r.width), y:(ev.clientY-r.top)*(H/r.height)};
}
function applyPointer(p){
  mouse.x=p.x; mouse.y=p.y;
  mouse.c=Math.floor(p.x/CELL); mouse.r=Math.floor(p.y/CELL);
  mouse.inside=p.x>=0&&p.y>=0&&p.x<W&&p.y<H;
}
function pointerTap(p){
  if(state.phase!=='build'&&state.phase!=='wave') return;
  if(state.paused) return;
  if(p.x<0||p.y<0||p.x>=W||p.y>=H) return;
  const c=Math.floor(p.x/CELL), r=Math.floor(p.y/CELL);
  if(state.placing){
    const tw=world.towerCell.get(c+','+r);
    if(tw){ // tapped an existing tower -> inspect it instead
      state.placing=null; state.selected=tw; sfx('build'); syncHud(); return;
    }
    if(pathSet.has(c+','+r)){ sfx('deny'); addFloat(p.x,p.y,'Can’t build on the road!','#ff8a80'); syncHud(); return; }
    placeTower(state.placing,c,r);
  }else{
    state.selected=world.towerCell.get(c+','+r)||null;
  }
  syncHud();
}
function cancelSel(){ state.placing=null; state.selected=null; syncHud(); }

cvs.addEventListener('mousemove',ev=>{ applyPointer(mousePos(ev)); });
cvs.addEventListener('mouseleave',()=>{ mouse.inside=false; mouse.c=-1; mouse.r=-1; });
cvs.addEventListener('click',ev=>{
  if(performance.now()-lastTouchEnd<600) return; // ignore synthetic click emitted after touch
  pointerTap(mousePos(ev));
});
cvs.addEventListener('contextmenu',ev=>{ ev.preventDefault(); cancelSel(); });

// Touch: tap = build/select · drag = ghost follows finger, release = build · long-press = cancel
let lastTouchEnd=0;
const tch={id:null,sx:0,sy:0,moved:false,done:false,lp:null};
function touchOf(ev){
  for(let i=0;i<ev.changedTouches.length;i++)
    if(ev.changedTouches[i].identifier===tch.id) return ev.changedTouches[i];
  return null;
}
cvs.addEventListener('touchstart',ev=>{
  if(tch.id!==null) return;               // one finger at a time
  ev.preventDefault();                     // stop scroll/zoom/callout on the board
  audio();                                // unlock AudioContext inside a user gesture
  const t=ev.changedTouches[0];
  tch.id=t.identifier; tch.sx=t.clientX; tch.sy=t.clientY;
  tch.moved=false; tch.done=false;
  applyPointer(mousePos(t));
  clearTimeout(tch.lp);
  tch.lp=setTimeout(()=>{                  // long-press = mobile "right-click"
    tch.done=true;
    if(navigator.vibrate) navigator.vibrate(15);
    cancelSel();
  },500);
},{passive:false});
cvs.addEventListener('touchmove',ev=>{
  const t=touchOf(ev); if(!t) return;
  ev.preventDefault();
  applyPointer(mousePos(t));
  if(!tch.moved&&Math.hypot(t.clientX-tch.sx,t.clientY-tch.sy)>10){
    tch.moved=true; clearTimeout(tch.lp);
  }
},{passive:false});
function endTouch(ev){
  const t=touchOf(ev); if(!t) return;
  ev.preventDefault();
  clearTimeout(tch.lp);
  lastTouchEnd=performance.now();
  const p=mousePos(t);
  const wasPlacing=!!state.placing;
  tch.id=null;
  if(!tch.done&&(wasPlacing||!tch.moved)) pointerTap(p);
  applyPointer({x:-1,y:-1});               // drop the hover ghost
}
cvs.addEventListener('touchend',endTouch,{passive:false});
cvs.addEventListener('touchcancel',ev=>{
  if(!touchOf(ev)) return;
  clearTimeout(tch.lp); tch.id=null;
  mouse.inside=false; mouse.c=-1; mouse.r=-1;
},{passive:false});

$('send').addEventListener('click',sendWave);
$('speed').addEventListener('click',()=>{ state.speed=state.speed===1?2:1; sfx('build'); syncHud(); });
$('pause').addEventListener('click',()=>{
  if(state.phase!=='build'&&state.phase!=='wave') return;
  state.paused=!state.paused; sfx(state.paused?'deny':'build'); syncHud();
});
$('mute').addEventListener('click',()=>{ state.muted=!state.muted; syncHud(); });

$('ovBtn').addEventListener('click',()=>{
  audio(); // unlock on user gesture
  if(state.phase==='start'){ state.phase='build'; hideOverlay(); sfx('wavestart'); }
  else{ resetWorld(); state.phase='build'; hideOverlay(); sfx('wavestart'); }
  syncHud();
  checkOrientation();
});

document.addEventListener('keydown',ev=>{
  if(ev.key==='m'||ev.key==='M'){ state.muted=!state.muted; syncHud(); return; }
  if(state.phase==='start'){ if(ev.key==='Enter'||ev.key===' '){ $('ovBtn').click(); } return; }
  if(state.phase==='over'||state.phase==='win'){ if(ev.key==='Enter') $('ovBtn').click(); return; }
  switch(ev.key){
    case ' ': ev.preventDefault(); sendWave(); break;
    case 'p': case 'P': $('pause').click(); break;
    case 'f': case 'F': $('speed').click(); break;
    case 'Escape': state.placing=null; state.selected=null; syncHud(); break;
    case 'u': case 'U': if(state.selected) doUpgrade(state.selected); syncHud(); break;
    case 'x': case 'X': if(state.selected) doSell(state.selected); syncHud(); break;
    case '1': case '2': case '3': case '4':
      shopBtns[TOWER_ORDER[+ev.key-1]].click(); break;
  }
});
