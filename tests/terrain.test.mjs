import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const base=new URL('../public/hinojosa/',import.meta.url),read=p=>readFile(new URL(p,base),'utf8');
const d=JSON.parse(await read('terrain-assets/hole1-elevation.json'));
const ctx={window:{}};vm.runInNewContext(await read('terrain.js'),ctx);const T=ctx.window.HinojosaTerrain;
test('Terrain: real metre mesh preserves heights, geographic proportions and complete cells',()=>{
 assert.equal(d.sourceResolution,5);assert.equal(d.elevations.length,d.cols*d.rows);
 assert.equal(Math.min(...d.elevations),d.min);assert.equal(Math.max(...d.elevations),d.max);
 assert.ok(d.min>600&&d.max<700);assert.ok(d.width/(d.cols-1)<=5.1);assert.ok(d.depth/(d.rows-1)<=5.1);
 const m=T.mesh(d);assert.equal(m.vertices.length,d.rows*d.cols*5);assert.equal(m.indices.length,(d.rows-1)*(d.cols-1)*6);
 assert.ok(Math.abs(m.vertices[0]+d.width/2)<.001);assert.ok(Math.abs(m.vertices[2]+d.depth/2)<.001);
 for(let i=0;i<d.elevations.length;i++)assert.ok(Math.abs(m.vertices[i*5+1]+(d.min+d.max)/2-d.elevations[i])<.0001);
 for(const i of m.indices)assert.ok(i<d.cols*d.rows);
 assert.match(d.sources.terrain,/xyz-mdt.idee.es/);
});
test('Terrain: camera matrices are finite and multiplication respects identity',()=>{
 const identity=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
 for(const eye of [[0,800,.01],[50,300,500],[-200,400,200]]){const a=T.lookAt(eye,[0,0,0],[0,1,-.001]);assert.ok([...a].every(Number.isFinite));assert.ok([...T.multiply(identity,a)].every((v,i)=>Math.abs(v-a[i])<.00001));}
});
test('Terrain: both modes, relief disclosure, offline assets and 2D fallback are present',async()=>{
 const html=await read('index.html'),sw=await read('sw.js');
 for(const id of ['terrain2d','terrain3d','terrainCanvas','terrainExag','terrainReset','terrainFallback'])assert.ok(html.includes('id="'+id+'"'));
 for(const p of ['terrain.js','terrain-assets/hole1-ortho.jpg','terrain-assets/hole1-elevation.json'])assert.ok(sw.includes(p));
 assert.match(html,/caídas de putt/);assert.match(html,/CC BY 4.0/);assert.match(html,/×1 · real/);
 const jpeg=await readFile(new URL('terrain-assets/hole1-ortho.jpg',base));assert.equal(jpeg[0],255);assert.equal(jpeg[1],216);
});

test('Round companion: stored plans reject invalid values and all three camera presets target the real sector',()=>{
 const empty=T.cleanPlan(null);assert.equal(empty.phase,0);assert.equal(empty.club,'');
 const bad=T.cleanPlan({phase:10,club:'fake club',aim:'x'.repeat(200),review:'maybe'});assert.equal(bad.phase,0);assert.equal(bad.club,'');assert.equal(bad.aim.length,120);assert.equal(bad.review,'');
 const good=T.cleanPlan({phase:2,club:'Madera 3',aim:'Árbol',review:'yes'});assert.equal(good.phase,2);assert.equal(good.review,'yes');
 for(let phase=0;phase<3;phase++){const p=T.preset(phase,d);assert.ok(p.pan.every(Number.isFinite));assert.ok(Math.abs(p.pan[0])<d.width/2);assert.ok(Math.abs(p.pan[1])<d.depth/2);assert.ok(p.zoom>=1&&p.zoom<=3);}
 assert.ok(T.preset(2,d).zoom>T.preset(0,d).zoom);
});
