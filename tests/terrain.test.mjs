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
