/* Independent service worker: never replaces Clubhouse's cache or stored rounds. */
const CACHE='hinojosa-v1.4.0-'+self.registration.scope;
const CORE=['./','index.html','style.css?v=1.4.0','course.js?v=1.4.0','model.js?v=1','viewer.js?v=1.4.0','terrain.js?v=1.4.0','terrain-assets/hole1-elevation.json','terrain-assets/hole1-ortho.jpg','app.js?v=1.4.0','manifest.webmanifest','icon.svg','../assets/icon-192.png','../assets/icon-512.png'].map(p=>new URL(p,self.location.href).href);
const validImage=url=>/^https:\/\/olivar\.golf\/wp-content\/uploads\/2016\/(?:02|04)\/Campo-de-Golf-Olivar-de-la-Hinojosa-Campo-de-las-Naciones-Hoyo-(?:[1-9]|1[0-8])-by-PerfectPixel-Publicidad\.jpg$/.test(url);
async function core(){const c=await caches.open(CACHE);await c.addAll(CORE);}
self.addEventListener('install',e=>e.waitUntil(core().then(()=>self.skipWaiting())));
async function upgrade(){const current=await caches.open(CACHE);for(const name of await caches.keys()){if(!name.startsWith('hinojosa-')||!name.endsWith(self.registration.scope)||name===CACHE)continue;const old=await caches.open(name);for(const req of await old.keys()){if(validImage(req.url)&&!await current.match(req)){const response=await old.match(req);if(response)await current.put(req,response);}}await caches.delete(name);}await self.clients.claim();}
self.addEventListener('activate',e=>e.waitUntil(upgrade()));
self.addEventListener('fetch',e=>{
 const req=e.request,url=new URL(req.url);if(req.method!=='GET')return;
 if(validImage(url.href)){
  e.respondWith(caches.open(CACHE).then(async c=>{const hit=await c.match(req.url);if(hit)return hit;const r=await fetch(req);if(r.ok||r.type==='opaque')e.waitUntil(c.put(req.url,r.clone()));return r;}));return;
 }
 if(url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
 if(req.mode==='navigate'){e.respondWith(fetch(req).then(r=>{if(r.ok){const copy=r.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(CORE[0],copy)));}return r;}).catch(()=>caches.match(CORE[0])));return;}
 if(CORE.includes(url.href))e.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(r=>{if(r.ok){const copy=r.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(req,copy)));}return r;})));
});
self.addEventListener('message',e=>{
 const msg=e.data||{},port=e.ports[0];if(!port)return;
 e.waitUntil((async()=>{try{
  if(msg.type==='CACHE_CORE')await core();
  else if(msg.type==='CACHE_IMAGE'&&validImage(msg.url)){const c=await caches.open(CACHE);if(!await c.match(msg.url)){const r=await fetch(msg.url,{mode:'no-cors',cache:'reload',credentials:'omit'});if(!r.ok&&r.type!=='opaque')throw Error('Lámina no disponible');await c.put(msg.url,r);}}
  else if(msg.type==='DELETE_IMAGE'&&validImage(msg.url))await (await caches.open(CACHE)).delete(msg.url);
  else throw Error('Solicitud no válida');
  port.postMessage({ok:true});
 }catch(err){port.postMessage({ok:false,error:err.message});}})());
});
