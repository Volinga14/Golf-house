import http from 'node:http';
import {readFile,writeFile,stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {join,resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes,randomUUID,scryptSync,timingSafeEqual,createHash} from 'node:crypto';
import {openStore} from './src/store.mjs';
import {pushProvider,safePushEndpoint} from './src/push.mjs';
import './public/scoring.js';
const ROOT=fileURLToPath(new URL('.',import.meta.url)),Golf=globalThis.Golf;
const fail=(code,message,extra={})=>{throw Object.assign(Error(message),{code,...extra})};
const hash=s=>createHash('sha256').update(s).digest('hex');
const clean=(v,max=100)=>String(v??'').trim().slice(0,max);
function passwordHash(p){const salt=randomBytes(16).toString('hex');return salt+':'+scryptSync(p,salt,64).toString('hex')}
function passwordOK(p,stored){const [salt,h]=stored.split(':');const b=scryptSync(p,salt,64);return timingSafeEqual(b,Buffer.from(h,'hex'))}
const currentDate=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.mp4':'video/mp4','.webm':'video/webm'};
export async function createApp({dir=process.env.DATA_DIR||join(ROOT,'data'),env=process.env,quiet=false}={}){
 const store=openStore(dir),{db,get,put,list,meta}=store;
 let settings=meta('settings')||meta('settings',{name:'La Liga de los 30',year:Number(currentDate().slice(0,4)),allowance:95,bestMonths:12,capacity:30,openMonths:[]});
 const setupToken=env.SETUP_TOKEN||randomBytes(18).toString('hex');
 if(!quiet&&!store.users().length)console.log('\n⛳ Primera apertura: crea tu administrador en la app.\nClave de configuración (solo administrador): '+setupToken+'\n');
 if(!meta('invite'))meta('invite',randomBytes(6).toString('hex').toUpperCase());
 const push=await pushProvider(env),clients=new Set(),limits=new Map();
 function event(type,text,actorId,extra={}){
  const e={type,text,actorId,...extra,time:new Date().toISOString()};
  const r=db.prepare('INSERT INTO events(data) VALUES (?)').run(JSON.stringify(e));e.id=Number(r.lastInsertRowid);
  const wire='id: '+e.id+'\nevent: change\ndata: '+JSON.stringify(e)+'\n\n';for(const c of clients)c.res.write(wire);
  db.prepare('DELETE FROM events WHERE id < ?').run(e.id-1000);
  if(push)void notifyPush(e);return e;
 }
 async function notifyPush(e){
  const users=store.users();
  await Promise.allSettled(list('subscription').filter(s=>s.userId!==e.actorId).map(async s=>{
   const u=users.find(x=>x.id===s.userId);if(!u?.active)return;
   if(e.type==='chat'&&!u.notifyChat)return;
   if(['hole','started'].includes(e.type)&&!(u.follows||[]).includes(e.actorId))return;
   if(!['chat','hole','started'].includes(e.type))return;
   try{await push.sendNotification(s.subscription,JSON.stringify({title:e.type==='chat'?'Clubhouse · mensaje':'Clubhouse · en juego',body:e.text,url:e.roundId?'/?round='+encodeURIComponent(e.roundId):'/?view=chat'}),{TTL:120,timeout:8000})}catch(err){if([404,410].includes(err.statusCode))db.prepare('DELETE FROM records WHERE kind=? AND id=?').run('subscription',s.id)}
  }));
 }
 function publicUser(u){const {email,password,...s}=u;return s}
 function auth(req){const token=/clubhouse_session=([^;]+)/.exec(req.headers.cookie||'')?.[1];if(!token)return null;const s=db.prepare('SELECT * FROM sessions WHERE token=? AND expires>?').get(hash(token),Date.now());if(!s)return null;const u=store.user(s.userId);return u?.active?u:null}
 function admin(u){if(u.role!=='admin')fail(403,'Esta acción requiere un administrador.')}
 function rate(req,key,max=40,minutes=15){const ip=env.TRUST_PROXY==='1'?(req.headers['x-forwarded-for']||req.socket.remoteAddress).split(',')[0]:req.socket.remoteAddress;const k=key+ip,now=Date.now();let v=limits.get(k);if(!v||now>v.until)v={n:0,until:now+minutes*60000};v.n++;limits.set(k,v);if(limits.size>5000)for(const [k,v]of limits)if(v.until<now)limits.delete(k);if(v.n>max)fail(429,'Demasiados intentos. Espera unos minutos.')}
 async function body(req,max=60000){let size=0,parts=[];for await(const c of req){size+=c.length;if(size>max)fail(413,'El archivo o mensaje supera el tamaño permitido.');parts.push(c)}return Buffer.concat(parts)}
 async function jsonBody(req){if(!(req.headers['content-type']||'').startsWith('application/json'))fail(415,'Se requiere JSON.');try{return JSON.parse((await body(req)).toString()||'{}')}catch(e){if(e.code)throw e;fail(400,'Datos JSON no válidos.')}}
 function send(res,data,status=200){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data))}
 function session(res,u){const token=randomBytes(32).toString('base64url');db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(hash(token),u.id,Date.now()+30*86400000);res.setHeader('Set-Cookie','clubhouse_session='+token+'; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000'+(env.PUBLIC_URL?.startsWith('https:')?'; Secure':''))}
 function state(u){return {me:{...publicUser(u),email:u.email},users:store.users().map(publicUser),courses:list('course'),rounds:list('round'),settings,events:db.prepare('SELECT id,data FROM events ORDER BY id DESC LIMIT 60').all().map(r=>({...JSON.parse(r.data),id:r.id})),today:currentDate(),pushPublicKey:push?env.VAPID_PUBLIC_KEY:null,admin:u.role==='admin'?{inviteCode:meta('invite'),pushConfigured:!!push}:null}}
 const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; media-src 'self' blob:; connect-src 'self'; worker-src 'self'; manifest-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  try{
   const url=new URL(req.url,'http://localhost'),path=url.pathname,method=req.method;
   if(!['GET','HEAD','POST','PATCH','DELETE'].includes(method))fail(405,'Método no permitido.');
   if(['POST','PATCH','DELETE'].includes(method)&&req.headers.origin){const expected=env.PUBLIC_URL?new URL(env.PUBLIC_URL).origin:'http://'+req.headers.host;if(req.headers.origin!==expected)fail(403,'Origen no permitido.')}
   if(path==='/api/bootstrap'){return send(res,{setupRequired:store.users().length===0,name:settings.name,year:settings.year})}
   if(path==='/api/setup'&&method==='POST'){
    if(store.users().length)fail(409,'La liga ya tiene administrador.');rate(req,'setup',10);const b=await jsonBody(req);if(store.users().length)fail(409,'La liga ya tiene administrador.');if(b.setupToken!==setupToken)fail(403,'La clave de configuración no coincide con la consola del servidor.');
    const u=createUser(b,'admin');session(res,u);return send(res,{ok:true},201);
   }
   function createUser(b,role='player'){
    const email=clean(b.email,200).toLowerCase(),name=clean(b.name,60),hi=Number(b.hi??18);
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!name||!b.password||b.password.length<10||b.password.length>128)fail(400,'Nombre, email y contraseña de 10–128 caracteres son obligatorios.');
    if(!Number.isFinite(hi)||hi< -10||hi>54)fail(400,'El índice de hándicap debe estar entre −10 y 54.');
    if(store.users().filter(u=>u.active).length>=settings.capacity)fail(409,'La liga ha alcanzado sus 30 plazas.');
    if(db.prepare('SELECT id FROM users WHERE email=?').get(email))fail(409,'Ese email ya está registrado.');
    const u={id:randomUUID(),email,password:passwordHash(b.password),name,hi,hiVerified:role==='admin',role,active:true,avatar:null,bio:'',club:'',follows:[],notifyChat:false,createdAt:new Date().toISOString()};store.saveUser(u);return u;
   }
   if(path==='/api/register'&&method==='POST'){
    rate(req,'register',100);if(!store.users().length)fail(409,'Configura primero la liga.');const b=await jsonBody(req);if(b.inviteCode!==meta('invite'))fail(403,'El código de invitación no es correcto.');const u=createUser(b);session(res,u);event('joined',u.name+' se ha unido a la liga',u.id);return send(res,{ok:true},201);
   }
   if(path==='/api/login'&&method==='POST'){
    rate(req,'login',100);const b=await jsonBody(req);if(typeof b.password!=='string'||b.password.length>128)fail(400,'Contraseña no válida.');const row=db.prepare('SELECT id FROM users WHERE email=?').get(clean(b.email,200).toLowerCase());const u=row?store.user(row.id):null;if(!u||!u.active||!passwordOK(b.password,u.password))fail(401,'Email o contraseña incorrectos.');session(res,u);return send(res,{ok:true});
   }
   if(path.startsWith('/api/')||path.startsWith('/media/')){
    const u=auth(req);if(!u)fail(401,'Inicia sesión para continuar.');
    if(path==='/api/logout'&&method==='POST'){const t=/clubhouse_session=([^;]+)/.exec(req.headers.cookie||'')?.[1];db.prepare('DELETE FROM sessions WHERE token=?').run(hash(t||''));res.setHeader('Set-Cookie','clubhouse_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');for(const c of clients)if(c.userId===u.id)c.res.end();return send(res,{ok:true})}
    if(path==='/api/state'&&method==='GET')return send(res,state(u));
    if(path==='/api/events'&&method==='GET'){
     res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});res.write('retry: 3000\n\n');const c={res,userId:u.id};clients.add(c);
     const timer=setInterval(()=>{if(!auth(req)){res.end();return}res.write(': heartbeat\n\n')},20000);timer.unref();res.on('close',()=>{clearInterval(timer);clients.delete(c)});return;
    }
    if(path==='/api/profile'&&method==='PATCH'){
     const b=await jsonBody(req);u.name=clean(b.name??u.name,60);if(!u.name)fail(400,'El nombre es obligatorio.');u.bio=clean(b.bio??u.bio,240);u.club=clean(b.club??u.club,100);
     if(b.hi!==undefined){const hi=Number(b.hi);if(!Number.isFinite(hi)||hi< -10||hi>54)fail(400,'Índice fuera de rango.');if(hi!==u.hi){u.hi=hi;u.hiVerified=false}}
     if(b.avatar!==undefined){if(b.avatar!==null&&(!get('media',b.avatar)?.mime.startsWith('image/')||get('media',b.avatar)?.owner!==u.id))fail(400,'La foto no es válida.');u.avatar=b.avatar}
     if(b.notifyChat!==undefined)u.notifyChat=!!b.notifyChat;
     if(b.follows!==undefined){if(!Array.isArray(b.follows))fail(400,'Lista no válida.');u.follows=b.follows.filter(id=>store.user(id)&&id!==u.id).slice(0,30)}
     store.saveUser(u);event('profile',u.name+' ha actualizado su perfil',u.id);return send(res,{ok:true});
    }
    if(path==='/api/password'&&method==='POST'){
     const b=await jsonBody(req);rate(req,'password',10);if(typeof b.current!=='string'||!passwordOK(b.current,u.password))fail(403,'La contraseña actual no coincide.');if(typeof b.password!=='string'||b.password.length<10||b.password.length>128)fail(400,'Usa de 10 a 128 caracteres.');u.password=passwordHash(b.password);store.saveUser(u);db.prepare('DELETE FROM sessions WHERE userId=?').run(u.id);session(res,u);return send(res,{ok:true});
    }
    if(path==='/api/courses'&&method==='POST'){
     const b=await jsonBody(req);Golf.validateCourse(b);const c={id:randomUUID(),name:clean(b.name),city:clean(b.city),tee:clean(b.tee,60),slope:b.slope,rating:b.rating,pars:b.pars,si:b.si,meters:b.meters,source:clean(b.source,400),verified:u.role==='admin',createdBy:u.id};put('course',c.id,c);event('course',u.name+' ha añadido '+c.name,u.id);return send(res,c,201);
    }
    let m=path.match(/^\/api\/courses\/([^/]+)\/approve$/);
    if(m&&method==='POST'){admin(u);const c=get('course',m[1]);if(!c)fail(404,'Campo no encontrado.');c.verified=true;c.verifiedBy=u.id;put('course',c.id,c);event('course','Campo validado: '+c.name,u.id);return send(res,{ok:true})}
    if(path==='/api/rounds'&&method==='POST'){
     const b=await jsonBody(req),course=get('course',b.courseId);if(!course?.verified)fail(400,'Elige un campo con barras verificadas.');if(!u.hiVerified)fail(409,'El administrador debe confirmar tu índice de hándicap antes de jugar.');
     if(list('round').some(r=>r.userId===u.id&&r.status==='live'))fail(409,'Ya tienes una vuelta en juego.');const date=b.date||currentDate();if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date>currentDate()||Number(date.slice(0,4))!==settings.year)fail(400,'La fecha debe pertenecer a la temporada y no estar en el futuro.');
     const month=Number(date.slice(5,7)),today=currentDate();if((date.slice(0,7)!==today.slice(0,7))&&!settings.openMonths.includes(month))fail(409,'Esa jornada está cerrada. El administrador puede reabrirla.');
     if(Number.isNaN(Date.parse(date))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date)fail(400,'Fecha no válida.');
     const marker=store.user(b.markerId);if(!marker?.active||marker.id===u.id)fail(400,'Elige a otro jugador como marcador.');
     const h=Golf.handicap(u.hi,course,settings.allowance),r={id:randomUUID(),userId:u.id,markerId:marker.id,course,hi:u.hi,courseHandicap:h.course,playingHandicap:h.playing,allowance:settings.allowance,scores:Array(18).fill(null),status:'live',date,currentHole:1,revision:0,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
     put('round',r.id,r);event('started',u.name+' ha salido a jugar en '+course.name,u.id,{roundId:r.id});return send(res,r,201);
    }
    m=path.match(/^\/api\/rounds\/([^/]+)\/(hole|submit|validate|reject|reopen|cancel)$/);
    if(m&&method==='POST'){
     rate(req,'play',250,1);const r=get('round',m[1]),action=m[2],b=await jsonBody(req);if(!r)fail(404,'Vuelta no encontrada.');
     if(action==='hole'){
      if(r.userId!==u.id)fail(403,'Solo puedes anotar tus propios golpes.');if(!b.operationId||typeof b.operationId!=='string'||b.operationId.length>100)fail(400,'Falta identificador de guardado.');
      const fp=hash(JSON.stringify([r.id,b.hole,b.score,b.revision]));const prev=db.prepare('SELECT * FROM operations WHERE userId=? AND id=?').get(u.id,b.operationId);if(prev){if(prev.fingerprint!==fp)fail(409,'La operación ya existe con otros datos.');return send(res,JSON.parse(prev.data))}
      if(r.status!=='live')fail(409,'La tarjeta está cerrada.');if(b.revision!==r.revision)fail(409,'La tarjeta cambió en otro dispositivo. Revisa antes de continuar.',{round:r});
      if(!Number.isInteger(b.hole)||b.hole<1||b.hole>18||!(b.score===null||b.score==='X'||Number.isInteger(b.score)&&b.score>=1&&b.score<=30))fail(400,'Hoyo o golpes no válidos.');
      r.scores[b.hole-1]=b.score;r.currentHole=Math.min(18,r.scores.findIndex(s=>s===null)+1||18);r.revision++;r.updatedAt=new Date().toISOString();
      db.exec('BEGIN IMMEDIATE');try{put('round',r.id,r);db.prepare('INSERT INTO operations VALUES (?,?,?,?)').run(u.id,b.operationId,fp,JSON.stringify(r));db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}
      const p=Golf.summary(r).pts[b.hole-1];event('hole',u.name+' · hoyo '+b.hole+' · '+(b.score===null?'corregido':b.score==='X'?'bola levantada':b.score+' golpes')+(p!==null?' · '+p+' pts':''),u.id,{roundId:r.id,hole:b.hole,points:p});return send(res,r);
     }
     if(['submit','cancel','reopen'].includes(action)&&r.userId!==u.id)fail(403,'Esta tarjeta pertenece a otro jugador.');
     if(action==='submit'){if(r.status!=='live'||r.scores.some(s=>s===null))fail(409,'Completa los 18 hoyos antes de enviar.');r.status='submitted'}
     if(action==='cancel'){if(r.status!=='live')fail(409,'Solo se puede cancelar una vuelta en juego.');r.status='cancelled'}
     if(action==='reopen'){if(r.status!=='rejected')fail(409,'Solo puedes corregir una tarjeta devuelta.');if(list('round').some(x=>x.userId===u.id&&x.status==='live'))fail(409,'Termina primero tu vuelta activa.');r.status='live'}
     if(['validate','reject'].includes(action)){
      if(u.id===r.userId||(u.id!==r.markerId&&u.role!=='admin'))fail(403,'Debe revisar la tarjeta su marcador u otro administrador.');
      if(r.status!=='submitted')fail(409,'La tarjeta no está pendiente de validar.');r.status=action==='validate'?'validated':'rejected';r.validatedBy=u.id;r.validationNote=clean(b.note,250);if(action==='reject'&&!r.validationNote)fail(400,'Indica qué debe corregirse.');
     }
     r.revision++;r.updatedAt=new Date().toISOString();put('round',r.id,r);event('round',store.user(r.userId).name+' · '+({submitted:'tarjeta enviada al marcador',validated:'vuelta validada: '+Golf.summary(r).points+' pts',rejected:'tarjeta devuelta para corregir',live:'tarjeta reabierta',cancelled:'vuelta cancelada'}[r.status]),u.id,{roundId:r.id});return send(res,r);
    }
    if(path==='/api/messages'&&method==='GET'){
     const room=url.searchParams.get('room')||'league';if(room!=='league'&&!get('round',room))fail(404,'Partida no encontrada.');const before=url.searchParams.get('before');const messages=list('message').filter(m=>m.room===room&&(!before||m.createdAt<before)).sort((a,b)=>a.createdAt.localeCompare(b.createdAt)).slice(-60);return send(res,{messages});
    }
    if(path==='/api/messages'&&method==='POST'){
     rate(req,'chat',40,1);const b=await jsonBody(req),room=b.room||'league';if(room!=='league'&&!get('round',room))fail(404,'Partida no encontrada.');const text=clean(b.text,2000),media=b.media?get('media',b.media):null;
     if(b.media&&(!media||media.owner!==u.id))fail(400,'Adjunto no válido.');if(!text&&!media)fail(400,'Escribe un mensaje o adjunta una foto/vídeo.');
     const msg={id:randomUUID(),room,userId:u.id,text,media:media?.id||null,mime:media?.mime||null,reactions:[],createdAt:new Date().toISOString()};put('message',msg.id,msg);event('chat',u.name+': '+(text||'Ha compartido '+(media?.mime.startsWith('video/')?'un vídeo':'una foto')),u.id,{room,roundId:room==='league'?undefined:room,messageId:msg.id});return send(res,msg,201);
    }
    m=path.match(/^\/api\/messages\/([^/]+)\/(react|delete)$/);
    if(m&&method==='POST'){
     const msg=get('message',m[1]);if(!msg)fail(404,'Mensaje no encontrado.');await jsonBody(req);
     if(m[2]==='delete'){if(msg.userId!==u.id&&u.role!=='admin')fail(403,'No puedes eliminar este mensaje.');db.prepare('DELETE FROM records WHERE kind=? AND id=?').run('message',msg.id)}else{msg.reactions=msg.reactions.includes(u.id)?msg.reactions.filter(id=>id!==u.id):[...msg.reactions,u.id];put('message',msg.id,msg)}
     event('reaction','Chat actualizado',u.id,{room:msg.room});return send(res,{ok:true});
    }
    if(path==='/api/media'&&method==='POST'){
     rate(req,'media',20,5);const buf=await body(req,25*1024*1024);let mime,extension;
     if(buf[0]===0xff&&buf[1]===0xd8&&buf[2]===0xff){mime='image/jpeg';extension='jpg'}else if(buf.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))){mime='image/png';extension='png'}else if(buf.toString('ascii',0,4)==='RIFF'&&buf.toString('ascii',8,12)==='WEBP'){mime='image/webp';extension='webp'}else if(buf.toString('ascii',4,8)==='ftyp'&&/^(isom|iso[2-9]|mp4[12]|avc1|M4V |qt  )$/.test(buf.toString('ascii',8,12))){mime='video/mp4';extension='mp4'}else if(buf.subarray(0,4).equals(Buffer.from([26,69,223,163]))){mime='video/webm';extension='webm'}else fail(415,'Admite JPG, PNG, WebP, MP4/MOV o WebM. Convierte HEIC antes de adjuntar.');
     if(mime.startsWith('image/')&&buf.length>8*1024*1024)fail(413,'Máximo 8 MB por foto.');
     const used=list('media').reduce((n,m)=>n+m.size,0),quota=Number(env.MEDIA_QUOTA_MB||2048)*1024*1024;if(used+buf.length>quota)fail(413,'El espacio multimedia de la liga está lleno. Contacta con el administrador.');
     const id=randomUUID()+'.'+extension;await writeFile(join(dir,'uploads',id),buf,{flag:'wx'});put('media',id,{id,mime,owner:u.id,size:buf.length,createdAt:new Date().toISOString()});return send(res,{id,mime},201);
    }
    if(path.startsWith('/media/')&&['GET','HEAD'].includes(method)){
     const id=decodeURIComponent(path.slice(7)),f=get('media',id);if(!f)fail(404,'Archivo no encontrado.');const p=join(dir,'uploads',id),s=await stat(p);let start=0,end=s.size-1,status=200;
     if(req.headers.range){const range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range);if(!range)fail(416,'Rango no válido.');start=Number(range[1]);end=range[2]?Math.min(Number(range[2]),end):end;if(start>end||start>=s.size)fail(416,'Rango no válido.');status=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${s.size}`)}
     res.writeHead(status,{'Content-Type':f.mime,'Content-Length':end-start+1,'Accept-Ranges':'bytes','Cache-Control':'private, max-age=300','Content-Disposition':'inline'});if(method==='HEAD')res.end();else createReadStream(p,{start,end}).pipe(res);return;
    }
    if(path==='/api/push'&&method==='POST'){
     if(!push)fail(503,'El administrador debe configurar las claves Web Push del servidor.');const b=await jsonBody(req);if(!safePushEndpoint(b.endpoint)||!b.keys||typeof b.keys.auth!=='string'||typeof b.keys.p256dh!=='string'||b.keys.auth.length>200||b.keys.p256dh.length>200)fail(400,'Suscripción push no válida.');const id=hash(b.endpoint);const existing=get('subscription',id);if(existing&&existing.userId!==u.id)fail(409,'Desactiva los avisos de la cuenta anterior en este navegador.');put('subscription',id,{id,userId:u.id,subscription:b});return send(res,{ok:true});
    }
    if(path==='/api/push'&&method==='DELETE'){const b=await jsonBody(req);if(typeof b.endpoint==='string'){const id=hash(b.endpoint);if(get('subscription',id)?.userId===u.id)db.prepare('DELETE FROM records WHERE kind=? AND id=?').run('subscription',id)}return send(res,{ok:true})}
    if(path==='/api/admin/settings'&&method==='PATCH'){
     admin(u);const b=await jsonBody(req);const year=Number(b.year??settings.year),allowance=Number(b.allowance??settings.allowance),bestMonths=Number(b.bestMonths??settings.bestMonths),openMonths=b.openMonths??settings.openMonths;
     if(!Number.isInteger(year)||year<2020||year>2100||![95,100].includes(allowance)||!Number.isInteger(bestMonths)||bestMonths<1||bestMonths>12||!Array.isArray(openMonths)||openMonths.some(m=>!Number.isInteger(m)||m<1||m>12))fail(400,'Revisa temporada, porcentaje, meses y jornadas abiertas.');
     settings={...settings,name:clean(b.name??settings.name,80),year,allowance,bestMonths,openMonths};meta('settings',settings);if(b.rotateInvite)meta('invite',randomBytes(6).toString('hex').toUpperCase());event('settings','Se ha actualizado el reglamento de la liga',u.id);return send(res,{ok:true});
    }
    m=path.match(/^\/api\/admin\/users\/([^/]+)$/);
    if(m&&method==='PATCH'){
     admin(u);const target=store.user(m[1]);if(!target)fail(404,'Jugador no encontrado.');const b=await jsonBody(req);if(b.hi!==undefined){if(!Number.isFinite(b.hi)||b.hi< -10||b.hi>54)fail(400,'Índice no válido.');target.hi=b.hi}if(b.hiVerified!==undefined)target.hiVerified=!!b.hiVerified;
     if(b.active===false&&target.id===u.id)fail(400,'No puedes desactivar tu propia cuenta.');if(b.active!==undefined)target.active=!!b.active;
     if(b.password){if(typeof b.password!=='string'||b.password.length<10||b.password.length>128)fail(400,'Contraseña: 10–128 caracteres.');target.password=passwordHash(b.password);db.prepare('DELETE FROM sessions WHERE userId=?').run(target.id)}
     if(!target.active){db.prepare('DELETE FROM sessions WHERE userId=?').run(target.id);for(const c of clients)if(c.userId===target.id)c.res.end()}
     store.saveUser(target);event('admin','Se ha revisado el perfil de '+target.name,u.id);return send(res,{ok:true});
    }
    if(path==='/api/export'&&method==='GET'){
     admin(u);res.setHeader('Content-Disposition','attachment; filename="clubhouse-datos.json"');return send(res,{exportedAt:new Date().toISOString(),settings,users:store.users(),courses:list('course'),rounds:list('round'),messages:list('message')});
    }
    fail(404,'Acción no encontrada.');
   }
   if(!['GET','HEAD'].includes(method))fail(405,'Método no permitido.');
   const rel=path==='/'?'index.html':decodeURIComponent(path.slice(1));const file=resolve(ROOT,'public',rel);if(!file.startsWith(resolve(ROOT,'public')+'/'))fail(403,'Ruta no permitida.');
   const data=await readFile(file);res.writeHead(200,{'Content-Type':MIME[extname(file)]||'application/octet-stream','Cache-Control':file.endsWith('sw.js')?'no-cache':'public, max-age=0'});res.end(method==='HEAD'?undefined:data);
  }catch(e){if(res.headersSent){res.end();return}const code=e.code&&Number.isInteger(e.code)?e.code:e.code==='ENOENT'?404:500;if(code===500&&!quiet)console.error(e);send(res,{error:code===500?'Error del servidor. Revisa la consola.':e.message,...(e.round?{round:e.round}:{})},code)}
 });
 server.requestTimeout=60000;server.headersTimeout=15000;server.on('close',()=>{for(const c of clients)c.res.end();db.close()});
 return {server,store,setupToken,close:()=>{for(const c of clients)c.res.end();return new Promise(resolve=>server.close(resolve))}};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(Number(process.versions.node.split('.')[0])<24){console.error('Instala Node.js 24 o posterior.');process.exit(1)}
 const app=await createApp();app.server.listen(Number(process.env.PORT||3000),process.env.HOST||'127.0.0.1',()=>console.log('⛳ Clubhouse en http://'+(process.env.HOST||'127.0.0.1')+':'+(process.env.PORT||3000)));
 for(const sig of ['SIGINT','SIGTERM'])process.on(sig,async()=>{await app.close();process.exit(0)});
}
