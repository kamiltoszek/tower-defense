/* ============================== map selection ============================== */
import { $ } from './util.js';
import { setWaypoints } from './board.js';
import { genWaypoints, pathCells } from './mapgen.js';
import { makeThumb, rebuildBG } from './render.js';
import { sfx } from './audio.js';
import { state } from './state.js';

const COUNT=5;
let maps=[];   // { wp, len, thumb }
let sel=0;
const elMaps=$('ovMaps');

function renderDom(){
  elMaps.innerHTML='';
  maps.forEach((m,i)=>{
    const b=document.createElement('button');
    b.className='map-btn'+(i===sel?' sel':'');
    b.type='button';
    b.appendChild(m.thumb);
    const cap=document.createElement('span');
    cap.className='cap';
    cap.textContent='Map '+String.fromCharCode(65+i)+' · '+m.len+' cells';
    b.appendChild(cap);
    b.addEventListener('click',()=>select(i));
    elMaps.appendChild(b);
  });
}
export function select(i){
  if(!maps.length||i<0||i>=maps.length) return;
  sel=i;
  setWaypoints(maps[i].wp);
  rebuildBG();
  elMaps.querySelectorAll('.map-btn').forEach((x,j)=>x.classList.toggle('sel',j===i));
  if(state.phase==='start') sfx('build');
}
export function nextMap(d){
  if(!maps.length) return;
  select((sel+d+maps.length)%maps.length);
}
/* Fresh set of random maps for the start screen. Leaves the board on the
 * first candidate so the game starts on it. */
export function generateMaps(){
  maps=Array.from({length:COUNT},()=>{
    const wp=genWaypoints();
    return {wp, len:pathCells(wp), thumb:makeThumb(wp)};
  });
  sel=0;
  setWaypoints(maps[0].wp);
  rebuildBG();
  renderDom();
}
export function currentMap(){ return maps[sel]||null; }
