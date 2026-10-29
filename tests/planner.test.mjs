import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const base=new URL('../public/hinojosa/',import.meta.url);
const read=p=>readFile(new URL(p,base),'utf8');
const context={window:{}};vm.runInNewContext(await read('planner-math.js'),context);vm.runInNewContext(await read('map-data.js'),context);
const M=context.window.HinojosaPlannerMath,D=context.window.HINOJOSA_MAP;
test('Planner: independent geodesic checks and exact distance/bearing round trips',()=>{
 assert.ok(Math.abs(M.distance([0,0],[0,1])-111195.0802)<.1);
 assert.equal(M.distance([40.46,-3.6],[40.46,-3.6]),0);
 assert.equal(M.distance(null,[0,0]),null);
 const p=[40.466,-3.603];
 for(const bearing of [0,45,90,135,180,225,270,315])for(const distance of [20,100,150,200,350,400]){
  const q=M.destination(p,bearing,distance);assert.ok(Math.abs(M.distance(p,q)-distance)<.0001);
  assert.ok(Math.abs(M.bearing(p,q)-bearing)<.0001);
 }
});
test('Planner: route totals match segment sums and direct route is the lower bound',()=>{
 const tee=[40.468,-3.609],green=[40.469,-3.607];
 for(const shots of [2,3]){const points=M.initial(tee,green,shots),s=M.summary(tee,points,green);assert.equal(s.legs.length,shots);assert.ok(Math.abs(s.total-s.direct)<.001);assert.equal(points.length,shots-1);}
 const shifted=M.destination(M.initial(tee,green,2)[0],0,80),a=M.summary(tee,[shifted],green);
 assert.ok(a.total>a.direct);assert.ok(Math.abs(a.total-(M.distance(tee,shifted)+M.distance(shifted,green)))<.001);
});
test('Planner: persistence rejects bad anchors and preserves independent A/B and bar references',()=>{
 const tee=[40.468,-3.609],green=[40.469,-3.607];
 assert.equal(M.clean({tee:[0,0],green:[1,1]},D.bounds).tee,null);
 const s=M.clean({tee,green,active:1,compare:true,routes:[{shots:2,points:[[0,0]]},{shots:3,points:[]}]},D.bounds);
 assert.equal(s.active,1);assert.equal(s.routes[0].points.length,1);assert.equal(s.routes[1].points.length,2);
 const p=JSON.parse(JSON.stringify({'1:yellow':s,'2:yellow':M.clean({},D.bounds),'1:red':M.clean({},D.bounds)}));
 assert.notEqual(p['1:yellow'].tee,null);assert.equal(p['2:yellow'].tee,null);assert.equal(p['1:red'].tee,null);
 assert.equal(s.compare,true);
});
test('Planner: frontend parses and all required map assets are prepared for offline use',async()=>{
 new vm.Script(await read('planner.js'));
 const sw=await read('sw.js'),html=await read('index.html');
 for(const path of ['planner.js','planner-math.js','map-data.js','map-assets/hinojosa-ortho.jpg','vendor/leaflet.js','vendor/leaflet.css'])assert.ok(sw.includes(path),path);
 assert.match(html,/id="planningMap"/);assert.match(html,/id="shotRange"/);assert.match(html,/id="setTee"/);assert.match(html,/id="setGreen"/);
 const raster=await readFile(new URL('map-assets/hinojosa-ortho.jpg',base));assert.equal(raster[0],255);assert.equal(raster[1],216);assert.ok(raster.length>500000);
 assert.match(D.attribution,/IGN/);assert.match(D.attribution,/CC BY 4.0/);
});
