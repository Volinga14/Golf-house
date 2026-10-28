import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const read=p=>readFile(new URL(p,root),'utf8');
const modelCode=await read('public/hinojosa/model.js');
const courseCode=await read('public/hinojosa/course.js');
const appCode=await read('public/hinojosa/app.js');
const context={window:{}};vm.runInNewContext(modelCode,context);vm.runInNewContext(courseCode,context);
const M=context.window.HinojosaModel,C=context.window.HINOJOSA;
test('Hinojosa: 18 holes, correct totals, unique SI, exact official hole 12 image',()=>{
 assert.equal(C.holes.length,18);assert.equal(C.holes.reduce((s,h)=>s+h.par,0),72);
 assert.equal(new Set(C.holes.map(h=>h.si)).size,18);
 for(const [key,total] of Object.entries({yellow:5963,blue:5327,red:5122,black:6084})){
  assert.equal(C.tees[key].meters.length,18);assert.equal(C.tees[key].meters.reduce((s,n)=>s+n,0),total);
 }
 assert.match(C.holes[11].image,/2016\/04/);
 assert.ok(C.holes.every(h=>h.tip&&h.image.startsWith('https://olivar.golf/')));
});
test('Hinojosa: allocation adds up, including plus and high handicaps',()=>{
 for(let hj=-10;hj<=72;hj++)assert.equal(C.holes.reduce((s,h)=>s+M.allocation(hj,h.si),0),hj);
 assert.equal(M.allocation(-2,18),-1);assert.equal(M.allocation(-2,1),0);
 assert.equal(M.allocation(36,1),2);assert.equal(M.allocation(37,1),3);
});
test('Hinojosa: blank HJ, pending holes, rayas, net par, putts and estimates',()=>{
 const h=C.holes[0];assert.equal(M.number(''),null);assert.equal(M.number('18,4'),18.4);
 assert.equal(M.points(h,null,18),null);
 assert.equal(M.points(h,{strokes:4},''),null);
 assert.equal(M.points(h,{picked:true},18),0);
 assert.equal(M.points(h,{strokes:5},18),2);
 assert.equal(M.points(h,{strokes:10},18),0);
 assert.equal(M.estimate('18,4',130,71.5),21);
 assert.equal(M.validScore({strokes:4,putts:5,picked:false}),false);
 assert.equal(M.validScore({strokes:null,putts:1,picked:true}),true);
 const scores=C.holes.map(h=>({strokes:h.par+1,putts:2,picked:false}));
 assert.equal(M.summary(C.holes,scores,18).points,36);
 scores[0]={strokes:null,putts:1,picked:true};
 const t=M.summary(C.holes,scores,18);
 assert.equal(t.points,34);assert.equal(t.picked,1);assert.equal(t.played,18);
});
test('Hinojosa: app and service worker parse; offline cache stays in separate scope',async()=>{
 new vm.Script(appCode);const sw=await read('public/hinojosa/sw.js');new vm.Script(sw);
 assert.match(sw,/hinojosa-v1/);assert.doesNotMatch(sw,/caches\.delete\(['"]clubhouse/);
 const manifest=JSON.parse(await read('public/hinojosa/manifest.webmanifest'));
 assert.equal(manifest.scope,'./');assert.equal(manifest.start_url,'./');
});
function browser(stored){
 const ids=new Map(),groups=new Map(),events=new Map(),memory=new Map(stored?Object.entries(stored):[]);
 let html='';
 function el(id){if(!ids.has(id))ids.set(id,{style:{},value:'',textContent:'',dataset:{},complete:false,scrollTop:0,showModal(){},close(){},remove(){},click(){this.onclick?.();}});return ids.get(id);}
 const app=el('app');
 Object.defineProperty(app,'innerHTML',{get(){return html;},set(s){html=s;groups.clear();for(const m of s.matchAll(/<([a-z]+)\b([^>]*)>/g)){const attrs=m[2],id=attrs.match(/\bid="([^"]+)"/)?.[1];const o=id?el(id):{style:{},dataset:{}};o.value=attrs.match(/\bvalue="([^"]*)"/)?.[1]||o.value||'';for(const a of attrs.matchAll(/\bdata-([\w-]+)="([^"]*)"/g)){o.dataset[a[1]]=a[2];const key='[data-'+a[1]+']';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(o);}}}});
 const w={scrollY:0,scrollTo(){},addEventListener:(n,fn)=>events.set(n,fn)};
 const document={getElementById:el,querySelectorAll:s=>groups.get(s)||[],createElement:()=>({click(){},remove(){}}),body:{appendChild(){}}};
 const sandbox={window:w,document,navigator:{onLine:true},localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)},setTimeout:()=>1,clearTimeout(){},confirm:()=>true,console,Blob,URL,Image:class{}};
 vm.createContext(sandbox);vm.runInContext(modelCode,sandbox);vm.runInContext(courseCode,sandbox);vm.runInContext(appCode,sandbox);
 return {ids,groups,memory,get html(){return html;}};
}
test('Hinojosa: first opening, setup, save 18 holes, reload, notes and draft persistence',()=>{
 const b=browser();assert.match(b.html,/Tu vuelta en/);
 b.groups.get('[data-view]').find(e=>e.dataset.view==='setup').onclick();
 b.ids.get('player').value='Víctor';b.ids.get('date').value='2026-10-29';b.ids.get('tee').value='yellow';b.ids.get('hcp').value='18';
 b.ids.get('setupForm').onsubmit({preventDefault(){}});
 b.ids.get('note').oninput({target:{value:'Línea segura <izquierda>'}});
 b.groups.get('[data-step]').find(e=>e.dataset.step==='1').onclick();
 let s=JSON.parse(b.memory.get('clubhouse-hinojosa-v1'));assert.equal(s.drafts[0].strokes,5);
 const reload=browser(Object.fromEntries(b.memory));assert.match(reload.html,/Línea segura &lt;izquierda&gt;/);
 for(let i=0;i<18;i++)reload.ids.get('saveHole').onclick();
 s=JSON.parse(reload.memory.get('clubhouse-hinojosa-v1'));
 assert.equal(s.scores.filter(Boolean).length,18);assert.match(reload.html,/Vuelta completada/);
 assert.equal(s.notes[0],'Línea segura <izquierda>');
 const final=browser(Object.fromEntries(reload.memory));assert.match(final.html,/Guardado/);
});
