/* ============================== map generation ============================== */
import { COLS, ROWS } from './board.js';

const ri=(a,b)=>a+Math.floor(Math.random()*(b-a+1));

/* Random winding path: left edge -> right edge.
 * Column stops are strictly increasing (right-monotonic), so the path never
 * self-crosses. Consecutive waypoints differ in exactly one coordinate
 * (axis-aligned segments), as the board's pointAt/dirsAt machinery expects. */
export function genWaypoints(){
  const legs=ri(3,6);                 // number of horizontal bands
  const cols=[0];
  while(cols.length<legs){
    const v=ri(1,COLS-2);
    if(!cols.includes(v)) cols.push(v);
  }
  cols.sort((a,b)=>a-b);
  cols.push(COLS-1);
  const rows=Array.from({length:cols.length},()=>ri(0,ROWS-1));
  const wp=[];
  for(let i=0;i<cols.length;i++){
    if(i>0) wp.push([cols[i],rows[i-1]]);  // vertical turn at column i
    wp.push([cols[i],rows[i]]);            // start of horizontal band i
  }
  const out=[];
  for(const p of wp)
    if(!out.length||out[out.length-1][0]!==p[0]||out[out.length-1][1]!==p[1]) out.push(p);
  return out;
}

/* Total number of road cells (1 + sum of unit steps). */
export function pathCells(wp){
  let n=1;
  for(let i=0;i<wp.length-1;i++)
    n+=Math.abs(wp[i+1][0]-wp[i][0])+Math.abs(wp[i+1][1]-wp[i][1]);
  return n;
}
