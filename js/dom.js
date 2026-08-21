/* ============================== HUD & panel sync ============================== */
import { $ } from './util.js';
import { TOWERS, TOWER_ORDER, MAX_LEVEL, DIFFS, DIFF_ORDER } from './config.js';
import { state, world } from './state.js';
import { sfx } from './audio.js';
import { upCost, sellValue, towerStats, doUpgrade, doSell } from './towers.js';
import { fitCanvas } from './render.js';

const elGold=$('gold'), elGoldBox=$('goldBox'), elLives=$('lives'), elLivesBox=$('livesBox'),
      elWave=$('wave'), elWaveBox=$('waveBox'), elLeft=$('left'), sendBtn=$('send'),
      speedBtn=$('speed'), pauseBtn=$('pause'), muteBtn=$('mute'),
      shopEl=$('shop'), infoEl=$('info'),
      overlay=$('overlay'), ovTitle=$('ovTitle'), ovText=$('ovText'),
      ovExtra=$('ovExtra'), ovSub=$('ovSub'), ovBtn=$('ovBtn');

const ICON_VOL='<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M3 8v4h3l4.5 4V4L6 8H3z"/><path d="M13.5 7.3a4.2 4.2 0 0 1 0 5.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
const ICON_MUTE='<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M3 8v4h3l4.5 4V4L6 8H3z"/><path d="M13 8l4.4 4.4M17.4 8L13 12.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

function setTxt(el,v){ if(el.textContent!==String(v)) el.textContent=v; }
function pulse(el,cls){ el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

// difficulty selector on the start screen
const elDiff=$('ovDiff');
for(const d of DIFF_ORDER){
  const b=document.createElement('button');
  b.className='diff-btn';
  b.dataset.diff=d;
  b.innerHTML=`<b>${DIFFS[d].name}</b>`+
    `<small>${DIFFS[d].waves} waves · ${DIFFS[d].lives} lives</small>`;
  b.addEventListener('click',()=>{
    if(state.phase!=='start') return;
    state.difficulty=d;
    elDiff.querySelectorAll('.diff-btn').forEach(x=>
      x.classList.toggle('sel',x.dataset.diff===d));
    syncDiffSub();
    sfx('build');
  });
  elDiff.appendChild(b);
}
export function syncDiffSub(){
  const D=DIFFS[state.difficulty];
  ovSub.textContent=D.gold+' gold · '+D.lives+' lives · '+D.waves+
    ' waves · sell refunds 70%';
}
syncDiffSub();
elDiff.querySelector('[data-diff="'+state.difficulty+'"]').classList.add('sel');

// build shop buttons
export const shopBtns={};
for(const type of TOWER_ORDER){
  const b=TOWERS[type];
  const btn=document.createElement('button');
  btn.className='shop'; btn.dataset.type=type;
  btn.style.setProperty('--c',b.color);
  const idx=TOWER_ORDER.indexOf(type)+1;
  btn.innerHTML=
    `<span class="chip" style="--c:${b.color}"></span>`+
    `<span class="name">${b.name}<span class="key">${idx}</span></span>`+
    `<span class="cost">${b.cost}g</span>`+
    `<span class="desc">${b.desc}</span>`;
  btn.addEventListener('click',()=>{
    if(state.phase==='over'||state.phase==='win') return;
    state.placing=state.placing===type?null:type;
    state.selected=null;
    sfx(state.placing?'build':'deny');
    syncHud();
  });
  shopEl.appendChild(btn);
  shopBtns[type]=btn;
}

let lastInfoKey='';
function syncInfo(){
  const sel=state.selected;
  const key=sel? sel.uid+':'+sel.level+':'+(state.gold>=upCost(sel)) : state.placing||'none';
  if(key===lastInfoKey) return;
  lastInfoKey=key;
  if(sel){
    const b=TOWERS[sel.type], s=towerStats(sel);
    const maxed=sel.level>=MAX_LEVEL;
    const uc=upCost(sel);
    infoEl.innerHTML=
      `<div class="tname" style="color:${b.color}">${b.name} <span class="lv">Lv ${sel.level}${maxed?' · MAX':''}</span></div>`+
      `<div class="rows">`+
        `<div><span>Damage</span><b>${s.dmg}</b></div>`+
        `<div><span>Range</span><b>${Math.round(s.range)} px</b></div>`+
        `<div><span>Fire rate</span><b>${(1/s.rate).toFixed(2)}/s</b></div>`+
        (s.splash?`<div><span>Splash radius</span><b>${Math.round(s.splash)} px</b></div>`:'')+
        (s.slow?`<div><span>Slow</span><b>${Math.round((1-s.slow)*100)}% for ${s.slowDur.toFixed(1)}s</b></div>`:'')+
      `</div>`+
      `<div class="btns">`+
        (maxed?`<button data-act="up" disabled>Max level reached</button>`
              :`<button data-act="up" ${state.gold<uc?'disabled':''}>Upgrade <small>${uc}g</small></button>`)+
        `<button data-act="sell" class="sell">Sell <small>+${sellValue(sel)}g</small></button>`+
      `</div>`+
      `<p class="hint">Total spent: ${sel.spent}g · sell refunds 70%.`+
      (maxed?'':' Next upgrade costs '+uc+'g. (U / X)')+`</p>`;
  }else if(state.placing){
    const b=TOWERS[state.placing];
    infoEl.innerHTML=
      `<div class="tname" style="color:${b.color}">${b.name}</div>`+
      `<div class="rows">`+
        `<div><span>Cost</span><b>${b.cost}g</b></div>`+
        `<div><span>Damage</span><b>${b.dmg}</b></div>`+
        `<div><span>Range</span><b>${b.range} px</b></div>`+
        `<div><span>Fire rate</span><b>${(1/b.rate).toFixed(2)}/s</b></div>`+
      `</div>`+
      `<p class="hint">${b.desc}<br><br>Click a <b style="color:#8fd18f">non-road cell</b> to place. Right-click or Esc cancels.</p>`;
  }else{
    infoEl.innerHTML=
      `<p class="hint" style="margin:0">Pick a tower above, then click a grid cell to build it.</p>`+
      `<p class="hint" style="margin:8px 0 0">Click a placed tower to see its stats and upgrade or sell it (70% refund).</p>`+
      `<p class="hint" style="margin:8px 0 0">Towers cannot be built on the road.</p>`;
  }
}
infoEl.addEventListener('click',e=>{
  const btn=e.target.closest?e.target.closest('[data-act]'):null;
  if(!btn||btn.disabled) return;
  const sel=state.selected;
  if(!sel) return;
  if(btn.dataset.act==='up') doUpgrade(sel);
  else if(btn.dataset.act==='sell') doSell(sel);
  syncHud();
});

// start-screen tower preview (only shown on the start screen)
ovExtra.innerHTML=TOWER_ORDER.map((t,i)=>{
  const b=TOWERS[t];
  return `<div class="trow" style="--c:${b.color}">
    <span class="chip"></span><span class="key">${i+1}</span>
    <b>${b.name}</b><small>${b.cost}g</small>
  </div>`;
}).join('');

export function showOverlay(title,cls,text,sub,btnLabel){
  ovTitle.textContent=title;
  ovTitle.className=cls||'';
  ovText.textContent=text;
  ovExtra.classList.toggle('hidden',title!=='TOWER DEFENSE');
  ovSub.textContent=sub||'';
  ovBtn.textContent=btnLabel;
  ovBtn.style.display=btnLabel?'':'none';
  overlay.classList.remove('hidden');
}
export function hideOverlay(){ overlay.classList.add('hidden'); }

let prevGold=null, prevLives=null, prevWave=null;
export function syncHud(){
  if(prevGold!==state.gold){ if(prevGold!==null) pulse(elGoldBox,'bump'); prevGold=state.gold; }
  if(prevLives!==state.lives){ if(prevLives!==null&&prevLives>state.lives) pulse(elLivesBox,'hurt'); prevLives=state.lives; }
  if(prevWave!==state.wave){ if(prevWave!==null) pulse(elWaveBox,'flash'); prevWave=state.wave; }
  setTxt(elGold,state.gold);
  setTxt(elLives,state.lives);
  elLivesBox.classList.toggle('low',state.lives<=5);
  setTxt(elWave,state.wave+' / '+DIFFS[state.difficulty].waves);
  setTxt(elLeft, state.phase==='wave'
    ? 'Enemies left: '+(state.queue.length+world.enemies.length)
    : state.phase==='build' ? 'Next: wave '+state.wave
    : state.phase==='start' ? 'Ready' : '');
  setTxt(sendBtn, state.phase==='build'?('Send Wave '+state.wave):'Wave in progress…');
  sendBtn.disabled=!(state.phase==='build'&&!state.paused);
  setTxt(speedBtn,state.speed+'×');
  speedBtn.classList.toggle('on',state.speed===2);
  setTxt(pauseBtn,state.paused?'Resume':'Pause');
  pauseBtn.disabled=!(state.phase==='build'||state.phase==='wave');
  const muteIcon=state.muted?ICON_MUTE:ICON_VOL;
  if(muteBtn.innerHTML!==muteIcon) muteBtn.innerHTML=muteIcon;
  for(const type of TOWER_ORDER){
    const b=TOWERS[type];
    shopBtns[type].classList.toggle('active',state.placing===type);
    shopBtns[type].classList.toggle('cant',state.gold<b.cost);
  }
  syncInfo();
}

/* ---------- orientation: phones must play in landscape ---------- */
let orientPaused=false, orientWasPaused=false;
export function checkOrientation(){
  const phone=Math.min(innerWidth,innerHeight)<500;
  const portrait=innerHeight>innerWidth;
  const active=state.phase==='build'||state.phase==='wave';
  if(phone&&portrait&&active){
    if(!orientPaused){
      orientPaused=true; orientWasPaused=state.paused;
      showOverlay('Rotate your phone','','Turn your device to landscape','The game is paused. It will resume automatically','');
    }
    state.paused=true;
  }else if(orientPaused){
    orientPaused=false;
    state.paused=orientWasPaused;
    hideOverlay();
    fitCanvas();
  }
}
