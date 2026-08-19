/* ============================== audio (synth, no assets) ============================== */
import { state } from './state.js';

let actx=null;
export function audio(){
  if(state.muted) return null;
  if(!actx){ try{ actx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ return null; } }
  if(actx.state==='suspended'){ actx.resume(); }
  return actx;
}
function beep(freq,dur,type,vol,slide){
  const c=audio(); if(!c) return;
  try{
    const o=c.createOscillator(), g=c.createGain();
    o.type=type||'sine'; o.frequency.setValueAtTime(freq,c.currentTime);
    if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(30,freq+slide),c.currentTime+dur);
    g.gain.setValueAtTime(vol||0.07,c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001,c.currentTime+dur);
    o.connect(g).connect(c.destination);
    o.start(); o.stop(c.currentTime+dur+0.03);
  }catch(e){}
}
export function sfx(name){
  switch(name){
    case 'shoot':   beep(660,.07,'square',.04,-260); break;
    case 'frost':   beep(880,.09,'sine',.05,240); break;
    case 'cannon':  beep(120,.14,'square',.09,-60); break;
    case 'sniper':  beep(1300,.11,'sawtooth',.05,-950); break;
    case 'boom':    beep(68,.30,'triangle',.12,-28); beep(46,.26,'sawtooth',.05); break;
    case 'die':     beep(300,.11,'triangle',.05,-160); break;
    case 'bossdie': beep(150,.5,'sawtooth',.1,-110); break;
    case 'leak':    beep(190,.28,'sawtooth',.1,-130); break;
    case 'build':   beep(430,.08,'square',.06,220); break;
    case 'upgrade': beep(520,.07,'square',.06); setTimeout(()=>beep(780,.09,'square',.06),70); break;
    case 'sell':    beep(700,.06,'sine',.07); setTimeout(()=>beep(480,.09,'sine',.06),65); break;
    case 'deny':    beep(130,.12,'square',.07); break;
    case 'wavestart': beep(330,.09,'square',.06); setTimeout(()=>beep(440,.09,'square',.06),95); setTimeout(()=>beep(554,.12,'square',.07),190); break;
    case 'waveclear': beep(523,.09,'sine',.07); setTimeout(()=>beep(659,.09,'sine',.07),100); setTimeout(()=>beep(784,.14,'sine',.08),200); break;
    case 'win':     [523,659,784,1047].forEach((f,i)=>setTimeout(()=>beep(f,.22,'sine',.08),i*160)); break;
    case 'lose':    [392,330,262,196].forEach((f,i)=>setTimeout(()=>beep(f,.3,'sawtooth',.08),i*180)); break;
  }
}
