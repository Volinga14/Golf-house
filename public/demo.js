/* Isolated, labelled demonstration. No demo accounts or scores reach the server. */
(function(){
 const key='clubhouse-demo-v2',clone=x=>JSON.parse(JSON.stringify(x)),id=()=>crypto.randomUUID?crypto.randomUUID():'d'+Date.now()+Math.random().toString(16).slice(2);
 let data;const callbacks=[];
 function seed(){
  const now=new Date(),year=now.getFullYear(),month=now.getMonth(),date=year+'-'+String(month+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
  const names=['Víctor','Sara','Álvaro','Lucía','Pablo','Marta','Diego','Clara','Javi','Ana','Carlos','Elena','Nacho','María','Marcos','Paula','Gonzalo','Laura','Jorge','Irene','Sergio','Bea','Dani','Cris','Miguel','Rocío','Andrés','Nuria','Luis','Alicia'];
  const users=names.map((name,i)=>({id:'demo-'+i,name,hi:[18.4,22.1,11.2,15.8,8.5,25.2,14.7,19.3][i%8],hiVerified:true,role:i===0?'admin':'player',active:true,avatar:null,club:['Madrid','Gran Canaria','Costa del Sol'][i%3],bio:i===0?'Un hoyo más. Y luego el 19.':'Aquí por el golf. Y por el grupo.',follows:['demo-2','demo-6','demo-8'],notifyChat:false}));
  const pars=[4,5,3,4,4,3,5,4,4,4,3,5,4,4,3,4,5,4],si=[7,3,17,1,11,15,5,13,9,8,18,4,2,12,16,10,6,14],meters=[354,486,148,391,332,162,501,316,372,361,141,493,402,325,172,368,510,342];
  const courses=[{id:'c1',name:'Los Olivos',city:'Madrid · campo de demostración',tee:'Amarillas',slope:128,rating:71.8,pars,si,meters,verified:true,source:'Datos ficticios para la demo'},{id:'c2',name:'Costa Verde',city:'Gran Canaria · campo de demostración',tee:'Rojas',slope:121,rating:70.3,pars,si,meters:meters.map(m=>m-25),verified:true,source:'Datos ficticios para la demo'},{id:'c3',name:'Sierra del Sur',city:'Málaga · campo de demostración',tee:'Blancas',slope:135,rating:73.2,pars,si,meters:meters.map(m=>m+30),verified:true,source:'Datos ficticios para la demo'}];
  const rounds=[];
  function make(u,m,n,status='validated',played=18){const c=courses[(n+m)%3],h=Golf.handicap(u.hi,c,95);const scores=c.pars.map((p,i)=>i>=played?null:Math.max(1,p+Golf.strokes(h.playing,c.si[i])+((i*7+n*3+m*5)%9<2?-1:(i+n+m)%7===0?2:(i+n+m)%3===0?1:0)));return {id:'r-'+u.id+'-'+m+'-'+n,userId:u.id,markerId:users[(users.indexOf(u)+1)%30].id,course:clone(c),hi:u.hi,courseHandicap:h.course,playingHandicap:h.playing,allowance:95,scores,status,date:year+'-'+String(m+1).padStart(2,'0')+'-12',currentHole:Math.min(18,played+1),revision:0,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}}
  for(let m=0;m<=Math.min(month,8);m++)users.forEach((u,i)=>{if((i+m)%11!==0)rounds.push(make(u,m,i))});
  [2,6,8].forEach((i,j)=>{const r=make(users[i],month,60+j,'live',[11,6,14][j]);r.date=date;rounds.push(r)});
  const events=[{id:3,type:'hole',text:'Álvaro · hoyo 11 · 4 golpes · 3 pts',actorId:'demo-2',roundId:rounds.at(-3).id,time:new Date(Date.now()-20000).toISOString()},{id:2,type:'started',text:'Diego ha salido a jugar en Costa Verde',actorId:'demo-6',roundId:rounds.at(-2).id,time:new Date(Date.now()-240000).toISOString()},{id:1,type:'joined',text:'Ya estamos los 30. ¡Arranca la liga!',actorId:'demo-0',time:new Date(Date.now()-86400000).toISOString()}];
  const messages=[{id:'m1',room:'league',userId:'demo-4',text:'¿Quién se apunta a una vuelta este domingo? ⛳',reactions:['demo-0','demo-1','demo-6'],createdAt:new Date(Date.now()-3800000).toISOString()},{id:'m2',room:'league',userId:'demo-1',text:'¡Yo! Pero el café del hoyo 19 es obligatorio ☕',reactions:['demo-4'],createdAt:new Date(Date.now()-3600000).toISOString()},{id:'m3',room:'league',userId:'demo-2',text:'Hoy el putter está de mi lado. No digo nada más 🤫',reactions:[],createdAt:new Date(Date.now()-600000).toISOString()}];
  return {users,courses,rounds,events,messages,media:{},settings:{name:'La Liga de los 30',year,allowance:95,bestMonths:12,capacity:30,openMonths:[]},meId:'demo-0',today:date,invite:'DEMO-30'};
 }
 function save(){try{localStorage.setItem(key,JSON.stringify(data))}catch{throw Error('La demo ha llenado el espacio del navegador. Reiníciala o usa el servidor.')}callbacks.forEach(f=>f());}
 function init(){if(!data){try{data=JSON.parse(localStorage.getItem(key))}catch{}if(!data)data=seed()}return data}
 function evt(type,text,actorId,extra={}){data.events.unshift({id:Date.now(),type,text,actorId,time:new Date().toISOString(),...extra});data.events=data.events.slice(0,60)}
 async function call(path,method='GET',b={}){
  init();const url=new URL(path,'http://demo'),p=url.pathname,u=data.users.find(u=>u.id===data.meId);let m;
  if(p==='/api/bootstrap')return {setupRequired:false,name:data.settings.name,year:data.settings.year};
  if(p==='/api/state')return clone({me:{...u,email:u.name.toLowerCase()+'@demo.local'},users:data.users,courses:data.courses,rounds:data.rounds,settings:data.settings,events:data.events,today:data.today,pushPublicKey:null,admin:u.role==='admin'?{inviteCode:data.invite,pushConfigured:false}:null});
  if(p==='/api/logout'){data.meId='demo-0';save();return {ok:true}}
  if(p==='/demo/switch'){data.meId=b.id;save();return {ok:true}}
  if(p==='/demo/reset'){data=seed();save();return {ok:true}}
  if(p==='/api/profile'){const changed=b.hi!==undefined&&b.hi!==u.hi;Object.assign(u,b);if(changed)u.hiVerified=false;save();return {ok:true}}
  if(p==='/api/password')return {ok:true};
  if(p==='/api/courses'){Golf.validateCourse(b);const c={...b,id:id(),verified:u.role==='admin',createdBy:u.id};data.courses.push(c);save();return clone(c)}
  if((m=p.match(/^\/api\/courses\/([^/]+)\/approve$/))){data.courses.find(c=>c.id===m[1]).verified=true;save();return {ok:true}}
  if(p==='/api/rounds'){
   if(data.rounds.some(r=>r.userId===u.id&&r.status==='live'))throw Error('Ya tienes una vuelta en juego.');if(!u.hiVerified)throw Error('Verifica tu hándicap desde Administración.');const c=data.courses.find(c=>c.id===b.courseId),h=Golf.handicap(u.hi,c,data.settings.allowance);
   const r={id:id(),userId:u.id,markerId:b.markerId,course:clone(c),hi:u.hi,courseHandicap:h.course,playingHandicap:h.playing,allowance:data.settings.allowance,scores:Array(18).fill(null),status:'live',date:b.date||data.today,currentHole:1,revision:0,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};data.rounds.push(r);evt('started',u.name+' ha salido a jugar en '+c.name,u.id,{roundId:r.id});save();return clone(r);
  }
  if((m=p.match(/^\/api\/rounds\/([^/]+)\/(hole|submit|validate|reject|reopen|cancel)$/))){
   const r=data.rounds.find(r=>r.id===m[1]),action=m[2];if(action==='hole'){if(r.userId!==u.id)throw Error('Esta tarjeta pertenece a otro jugador.');if(b.revision!==r.revision)throw Object.assign(Error('La tarjeta ha cambiado.'),{status:409,data:{round:clone(r)}});r.scores[b.hole-1]=b.score;r.currentHole=Math.min(18,r.scores.findIndex(s=>s===null)+1||18);evt('hole',u.name+' · hoyo '+b.hole+' · '+(b.score==='X'?'bola levantada':b.score+' golpes'),u.id,{roundId:r.id})}
   else{if(['validate','reject'].includes(action)&&(u.id===r.userId||(u.id!==r.markerId&&u.role!=='admin')))throw Error('Debe validar otro jugador.');if(action==='submit'&&r.scores.some(s=>s===null))throw Error('Completa los 18 hoyos.');r.status={submit:'submitted',validate:'validated',reject:'rejected',reopen:'live',cancel:'cancelled'}[action];r.validationNote=b.note;evt('round',u.name+' · tarjeta actualizada',u.id,{roundId:r.id})}r.revision++;save();return clone(r);
  }
  if(p==='/api/messages'&&method==='GET'){const room=url.searchParams.get('room')||'league',before=url.searchParams.get('before');return clone({messages:data.messages.filter(m=>m.room===room&&(!before||m.createdAt<before)).slice(-60)})}
  if(p==='/api/messages'&&method==='POST'){const msg={id:id(),userId:u.id,room:b.room||'league',text:b.text||'',media:b.media||null,mime:data.media[b.media]?.mime,reactions:[],createdAt:new Date().toISOString()};data.messages.push(msg);evt('chat',u.name+': '+(msg.text||'Ha compartido un archivo'),u.id,{room:msg.room,roundId:msg.room==='league'?undefined:msg.room});save();return clone(msg)}
  if((m=p.match(/^\/api\/messages\/([^/]+)\/(react|delete)$/))){const msg=data.messages.find(mg=>mg.id===m[1]);if(m[2]==='delete')data.messages=data.messages.filter(mg=>mg.id!==msg.id);else msg.reactions=msg.reactions.includes(u.id)?msg.reactions.filter(x=>x!==u.id):[...msg.reactions,u.id];save();return {ok:true}}
  if(p==='/api/admin/settings'){Object.assign(data.settings,b);if(b.rotateInvite)data.invite='DEMO-'+Math.random().toString(36).slice(2,6).toUpperCase();save();return {ok:true}}
  if((m=p.match(/^\/api\/admin\/users\/([^/]+)$/))){Object.assign(data.users.find(u=>u.id===m[1]),b);save();return {ok:true}}
  throw Error('Esta acción requiere el servidor multiusuario.');
 }
 window.Demo={call,init,subscribe:fn=>callbacks.push(fn),media:id=>init().media[id]?.url,async upload(file){if(file.size>2*1024*1024)throw Error('En la demo, máximo 2 MB por archivo. El servidor admite vídeos de 25 MB.');const url=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)}),mediaId=id();data.media[mediaId]={url,mime:file.type};save();return {id:mediaId,mime:file.type}}};
})();
