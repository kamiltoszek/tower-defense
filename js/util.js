/* ============================== helpers ============================== */
export const TAU = Math.PI*2;
export const clamp=(v,a,b)=>v<a?a:(v>b?b:v);
export const rand=(a,b)=>a+Math.random()*(b-a);
export function rgba(hex,a){ const n=parseInt(hex.slice(1),16); return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`; }
export function rr(c,x,y,w,h,r){
  c.beginPath(); c.moveTo(x+r,y);
  c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r);
  c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath();
}
export const $=id=>document.getElementById(id);
