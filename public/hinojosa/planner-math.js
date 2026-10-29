(function(root){
'use strict';
const R=6371008.8,rad=n=>n*Math.PI/180,deg=n=>n*180/Math.PI;
function valid(p){return Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&Math.abs(p[0])<=90&&Math.abs(p[1])<=180;}
function distance(a,b){if(!valid(a)||!valid(b))return null;const lat=rad(b[0]-a[0]),lon=rad(b[1]-a[1]);const t=Math.sin(lat/2)**2+Math.cos(rad(a[0]))*Math.cos(rad(b[0]))*Math.sin(lon/2)**2;return R*2*Math.atan2(Math.sqrt(Math.max(0,t)),Math.sqrt(Math.max(0,1-t)));}
function bearing(a,b){const p=rad(a[0]),q=rad(b[0]),d=rad(b[1]-a[1]);return (deg(Math.atan2(Math.sin(d)*Math.cos(q),Math.cos(p)*Math.sin(q)-Math.sin(p)*Math.cos(q)*Math.cos(d)))+360)%360;}
function destination(a,angle,meters){const b=rad(angle),d=meters/R,p=rad(a[0]),l=rad(a[1]);const q=Math.asin(Math.sin(p)*Math.cos(d)+Math.cos(p)*Math.sin(d)*Math.cos(b));const n=l+Math.atan2(Math.sin(b)*Math.sin(d)*Math.cos(p),Math.cos(d)-Math.sin(p)*Math.sin(q));return [deg(q),((deg(n)+540)%360)-180];}
function inside(p,bounds){return valid(p)&&p[0]>=bounds[0][0]&&p[0]<=bounds[1][0]&&p[1]>=bounds[0][1]&&p[1]<=bounds[1][1];}
function initial(tee,green,shots){const d=distance(tee,green),b=bearing(tee,green);return shots===3?[destination(tee,b,d*.4),destination(tee,b,d*.74)]:[destination(tee,b,d*.55)];}
function summary(tee,points,green){const coords=[tee,...points,green];const legs=coords.slice(1).map((p,i)=>distance(coords[i],p));return {legs,total:legs.reduce((a,b)=>a+b,0),direct:distance(tee,green)};}
function clean(raw,bounds){if(!raw||typeof raw!=='object')return null;const tee=inside(raw.tee,bounds)?raw.tee:null,green=inside(raw.green,bounds)?raw.green:null;const routes=['A','B'].map((id,i)=>{const r=raw.routes?.[i],shots=r?.shots===3?3:2;const points=Array.isArray(r?.points)&&r.points.length===shots-1&&r.points.every(p=>inside(p,bounds))?r.points:tee&&green?initial(tee,green,shots):[];return {id,shots,points};});return {tee,green,routes,active:raw.active===1?1:0,compare:raw.compare===true,rings:raw.rings!==false};}
root.HinojosaPlannerMath={R,valid,distance,bearing,destination,inside,initial,summary,clean};
})(typeof window==='undefined'?globalThis:window);
