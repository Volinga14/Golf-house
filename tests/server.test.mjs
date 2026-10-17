import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm,readFile}from'node:fs/promises';import {tmpdir}from'node:os';import {join}from'node:path';import {createApp}from'../server.mjs';import {safePushEndpoint}from'../src/push.mjs';
const course={name:'Test Course',city:'Madrid',tee:'Amarillas',slope:113,rating:72,pars:Array(18).fill(4),si:Array.from({length:18},(_,i)=>i+1),meters:Array(18).fill(350),source:'Test fixture'};
const pw='ContraseñaSegura123!';
test('Real multiuser league: auth, rounds, revisions, permissions, SSE, chat and persistence',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'clubhouse-test-'));const app=await createApp({dir,quiet:true,env:{SETUP_TOKEN:'test-setup'}});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.server.address().port;
 const cookies={};async function req(who,path,method='GET',data,headers={}){const res=await fetch(base+path,{method,headers:{...(cookies[who]?{Cookie:cookies[who]}:{}),...(data!==undefined?{'Content-Type':'application/json'}:{}),...headers},body:data!==undefined?JSON.stringify(data):undefined});if(res.headers.get('set-cookie'))cookies[who]=res.headers.get('set-cookie').split(';')[0];const type=res.headers.get('content-type')||'';return {status:res.status,data:type.includes('application/json')?await res.json():await res.text()}}
 try{
 assert.equal((await req('n','/api/state')).status,401);
 assert.equal((await req('a','/api/setup','POST',{setupToken:'wrong',name:'Admin',email:'admin@test.es',password:pw})).status,403);
 assert.equal((await req('a','/api/setup','POST',{setupToken:'test-setup',name:'Admin',email:'admin@test.es',password:pw,hi:18})).status,201);
 let state=(await req('a','/api/state')).data;const adminId=state.me.id,invite=state.admin.inviteCode;
 assert.equal((await req('b','/api/register','POST',{name:'Bea',email:'bea@test.es',password:pw,inviteCode:'WRONG'})).status,403);
 assert.equal((await req('b','/api/register','POST',{name:'Bea',email:'bea@test.es',password:pw,hi:0,inviteCode:invite})).status,201);
 assert.equal((await req('c','/api/register','POST',{name:'Cris',email:'cris@test.es',password:pw,hi:0,inviteCode:invite})).status,201);
 const bstate=(await req('b','/api/state')).data,bid=bstate.me.id,cid=(await req('c','/api/state')).data.me.id;
 assert.equal(bstate.admin,null);assert.ok(bstate.users.every(u=>!('email'in u)&&!('password'in u)));
 const created=await req('a','/api/courses','POST',course);assert.equal(created.status,201);const c=created.data;
 assert.equal((await req('b','/api/admin/settings','PATCH',{name:'Hacked'})).status,403);
 assert.equal((await req('b','/api/rounds','POST',{courseId:c.id,markerId:adminId})).status,409);
 assert.equal((await req('a','/api/admin/users/'+bid,'PATCH',{hi:0,hiVerified:true})).status,200);
 assert.equal((await req('b','/api/rounds','POST',{courseId:c.id,markerId:bid})).status,400);
 let r=(await req('b','/api/rounds','POST',{courseId:c.id,markerId:adminId})).data;assert.equal(r.playingHandicap,0);
 assert.equal((await req('b','/api/rounds','POST',{courseId:c.id,markerId:adminId})).status,409);
 assert.equal((await req('c','/api/rounds/'+r.id+'/hole','POST',{hole:1,score:4,revision:0,operationId:'foreign'})).status,403);
 const abort=new AbortController();const stream=await fetch(base+'/api/events',{headers:{Cookie:cookies.c},signal:abort.signal});assert.equal(stream.status,200);const reader=stream.body.getReader();await reader.read();
 const op={hole:1,score:4,revision:0,operationId:'first'};const first=await req('b','/api/rounds/'+r.id+'/hole','POST',op);assert.equal(first.status,200);r=first.data;const update=await Promise.race([reader.read(),new Promise((_,reject)=>setTimeout(()=>reject(Error('SSE timeout')),3000))]);assert.match(new TextDecoder().decode(update.value),/event: change/);abort.abort();await reader.cancel().catch(()=>{});
 assert.equal((await req('b','/api/rounds/'+r.id+'/hole','POST',op)).data.revision,1);
 assert.equal((await req('b','/api/rounds/'+r.id+'/hole','POST',{...op,score:5})).status,409);
 assert.equal((await req('b','/api/rounds/'+r.id+'/hole','POST',{...op,operationId:'stale'})).status,409);
 assert.equal((await req('b','/api/rounds/'+r.id+'/submit','POST',{})).status,409);
 for(let i=2;i<=18;i++){const res=await req('b','/api/rounds/'+r.id+'/hole','POST',{hole:i,score:4,revision:r.revision,operationId:'hole-'+i});assert.equal(res.status,200);r=res.data}
 assert.equal(r.currentHole,18);assert.equal((await req('b','/api/rounds/'+r.id+'/submit','POST',{})).status,200);
 assert.equal((await req('b','/api/rounds/'+r.id+'/validate','POST',{})).status,403);
 assert.equal((await req('c','/api/rounds/'+r.id+'/validate','POST',{})).status,403);
 assert.equal((await req('a','/api/rounds/'+r.id+'/reject','POST',{})).status,400);
 assert.equal((await req('a','/api/rounds/'+r.id+'/reject','POST',{note:'Revisar hoyo 1'})).status,200);
 assert.equal((await req('b','/api/rounds/'+r.id+'/reopen','POST',{})).status,200);
 assert.equal((await req('b','/api/rounds/'+r.id+'/submit','POST',{})).status,200);
 assert.equal((await req('a','/api/rounds/'+r.id+'/validate','POST',{})).status,200);
 assert.equal((await req('b','/api/rounds/'+r.id+'/hole','POST',{hole:1,score:3,revision:r.revision,operationId:'closed'})).status,409);
 const after=(await req('c','/api/state')).data;assert.equal(after.rounds.find(x=>x.id===r.id).status,'validated');assert.equal(Golf.ranking(after.users,after.rounds,after.settings).find(x=>x.user.id===bid).total,36);
 const chat=(await req('b','/api/messages','POST',{room:r.id,text:'¡Gran vuelta! ⛳'})).data;assert.equal((await req('c','/api/messages?room='+r.id)).data.messages[0].text,'¡Gran vuelta! ⛳');assert.equal((await req('a','/api/messages/'+chat.id+'/react','POST',{})).status,200);assert.equal((await req('c','/api/messages/'+chat.id+'/delete','POST',{})).status,403);
 assert.equal((await req('b','/api/messages','POST',{room:'not-a-round',text:'hello'})).status,404);
 const image=await readFile(new URL('../public/assets/icon-192.png',import.meta.url));const upload=await fetch(base+'/api/media',{method:'POST',headers:{Cookie:cookies.b,'Content-Type':'image/png'},body:image});assert.equal(upload.status,201);const media=await upload.json();assert.equal((await fetch(base+'/media/'+media.id)).status,401);assert.equal((await fetch(base+'/media/'+media.id,{headers:{Cookie:cookies.c}})).status,200);assert.equal((await fetch(base+'/media/'+media.id,{headers:{Cookie:cookies.c,Range:'bytes=0-9'}})).status,206);
 assert.equal((await req('c','/api/profile','PATCH',{avatar:media.id})).status,400);assert.equal((await req('b','/api/profile','PATCH',{avatar:media.id})).status,200);
 const html=await fetch(base+'/api/media',{method:'POST',headers:{Cookie:cookies.b,'Content-Type':'image/png'},body:'<svg onload="alert(1)"></svg>'});assert.equal(html.status,415);
 assert.equal((await req('a','/api/admin/settings','PATCH',{name:'Bad Origin'},{Origin:'https://evil.example'})).status,403);
 assert.equal((await req('a','/api/admin/users/'+adminId,'PATCH',{active:false})).status,400);
 assert.equal((await req('a','/api/admin/users/'+cid,'PATCH',{active:false})).status,200);assert.equal((await req('c','/api/state')).status,401);
 assert.equal((await req('a','/api/export')).status,200);
 assert.ok(!(await req('a','/api/export')).data.users.some(u=>u.password));
 assert.equal((await req('b','/api/profile','PATCH',{hi:2})).status,200);assert.equal((await req('b','/api/state')).data.me.hiVerified,false);assert.equal((await req('b','/api/state')).data.rounds[0].hi,0);
 assert.equal((await req('a','/api/admin/settings','PATCH',{rotateInvite:true})).status,200);assert.notEqual((await req('a','/api/state')).data.admin.inviteCode,invite);
 assert.equal((await req('b','/api/logout','POST',{})).status,200);assert.equal((await req('b','/api/state')).status,401);assert.equal((await req('b','/api/login','POST',{email:'bea@test.es',password:pw})).status,200);
 await app.close();const restored=await createApp({dir,quiet:true,env:{}});assert.equal(restored.store.list('round')[0].status,'validated');restored.store.db.close();
 }finally{if(app.server.listening)await app.close();await rm(dir,{recursive:true,force:true})}
});
test('Push destinations reject SSRF and permit supported browser providers',()=>{assert.equal(safePushEndpoint('https://fcm.googleapis.com/fcm/send/abc'),true);assert.equal(safePushEndpoint('https://web.push.apple.com/Qabc'),true);assert.equal(safePushEndpoint('http://127.0.0.1/'),false);assert.equal(safePushEndpoint('https://evil.example/'),false);assert.equal(safePushEndpoint('https://fcm.googleapis.com.evil.example/'),false);assert.equal(safePushEndpoint('https://fcm.googleapis.com:8000/'),false)});
test('30 accounts share the same durable league and the 31st place is rejected',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'clubhouse-capacity-'));const app=await createApp({dir,quiet:true,env:{SETUP_TOKEN:'setup'}});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.server.address().port;
 async function post(path,b,cookie){return fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(b)})}
 try{
 const admin=await post('/api/setup',{setupToken:'setup',name:'Admin',email:'owner@club.es',password:pw});const ac=admin.headers.get('set-cookie').split(';')[0];const s=await (await fetch(base+'/api/state',{headers:{Cookie:ac}})).json();
 const regs=await Promise.all(Array.from({length:29},(_,i)=>post('/api/register',{name:'Jugador '+i,email:'p'+i+'@club.es',password:pw,inviteCode:s.admin.inviteCode})));assert.ok(regs.every(r=>r.status===201));
 const sessions=regs.map(r=>r.headers.get('set-cookie').split(';')[0]);const states=await Promise.all(sessions.map(async c=>(await fetch(base+'/api/state',{headers:{Cookie:c}})).json()));assert.ok(states.every(s=>s.users.length===30));assert.equal(new Set(states.map(s=>s.me.id)).size,29);
 assert.equal((await post('/api/register',{name:'Extra',email:'extra@club.es',password:pw,inviteCode:s.admin.inviteCode})).status,409);
 const courseRes=await post('/api/courses',course,ac);const field=await courseRes.json();
 for(const s of states)app.store.saveUser({...app.store.user(s.me.id),hiVerified:true});
 const rounds=await Promise.all(sessions.map((c,i)=>post('/api/rounds',{courseId:field.id,markerId:s.me.id},c).then(r=>r.json())));assert.ok(rounds.every(r=>r.id));
 const scores=await Promise.all(sessions.map((c,i)=>post('/api/rounds/'+rounds[i].id+'/hole',{hole:1,score:4+i%3,revision:0,operationId:'parallel-'+i},c)));assert.ok(scores.every(r=>r.status===200));
 const final=await(await fetch(base+'/api/state',{headers:{Cookie:ac}})).json();assert.equal(final.rounds.length,29);assert.ok(final.rounds.every(r=>r.revision===1&&r.scores[0]!==null));
 }finally{await app.close();await rm(dir,{recursive:true,force:true})}
});
