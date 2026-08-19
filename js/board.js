/* ============================== board & path ============================== */
import { clamp } from './util.js';

export const CELL=40, COLS=24, ROWS=15, W=960, H=600;

// Winding path: left edge -> right edge (grid waypoints)
const WAYPOINTS=[[0,2],[20,2],[20,6],[3,6],[3,10],[23,10]];
export const pathSet=new Set();
export const pts=[];               // ordered cell centers, 40px apart
for(let i=0;i<WAYPOINTS.length-1;i++){
  const [c0,r0]=WAYPOINTS[i], [c1,r1]=WAYPOINTS[i+1];
  const dc=Math.sign(c1-c0), dr=Math.sign(r1-r0);
  let c=c0, r=r0;
  for(;;){
    if(!(c===c0&&r===r0&&i>0)){
      pathSet.add(c+','+r);
      pts.push({x:c*CELL+CELL/2, y:r*CELL+CELL/2});
    }
    if(c===c1&&r===r1) break;
    c+=dc; r+=dr;
  }
}
export const TOTAL_LEN=(pts.length-1)*CELL;   // 2600 px
export const pathDirs=pts.map((p,i)=> i<pts.length-1 ? Math.atan2(pts[i+1].y-p.y, pts[i+1].x-p.x) : 0);

export function pointAt(d){
  if(d<0) return {x:pts[0].x+d, y:pts[0].y};
  if(d>=TOTAL_LEN){ const p=pts[pts.length-1]; return {x:p.x, y:p.y}; }
  const i=Math.floor(d/CELL), t=(d-i*CELL)/CELL;
  const a=pts[i], b=pts[i+1];
  return {x:a.x+(b.x-a.x)*t, y:a.y+(b.y-a.y)*t};
}
export function dirsAt(d){
  const i=clamp(Math.floor(d/CELL),0,pts.length-2);
  return pathDirs[i];
}
