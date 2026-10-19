/* Scoped to the installation path: works at / and /repository-name/. */
const BASE=new URL('./',self.location.href);
const CACHE='clubhouse-v3-'+BASE.pathname;
const FILES=['','index.html','styles.css','refresh.css','gamebook.css','config.js','scoring.js','demo.js','app.js','manifest.webmanifest','assets/icon.svg','assets/icon-192.png','assets/icon-512.png','assets/course.svg'].map(p=>new URL(p,BASE).href);
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('clubhouse-')&&k.endsWith(BASE.pathname)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const u=new URL(event.request.url);
 if(event.request.method!=='GET'||u.origin!==BASE.origin||!u.href.startsWith(BASE.href)||u.pathname.startsWith('/api/')||u.pathname.startsWith('/media/'))return;
 if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).catch(()=>caches.match(BASE.href)));return}
 if(FILES.includes(u.href))event.respondWith(fetch(event.request).then(res=>{if(res.ok){const copy=res.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(event.request,copy)))}return res}).catch(()=>caches.match(event.request)));
});
self.addEventListener('push',event=>{let data;try{data=event.data.json()}catch{data={title:'Clubhouse',body:'Hay novedades en tu liga.'}}event.waitUntil(self.registration.showNotification(data.title||'Clubhouse',{body:data.body||'Hay novedades en tu liga.',icon:new URL('assets/icon-192.png',BASE).href,badge:new URL('assets/icon-192.png',BASE).href,tag:data.tag||'clubhouse-update',data:{url:data.url||BASE.href}}))});
self.addEventListener('notificationclick',event=>{event.notification.close();const target=new URL(event.notification.data?.url||BASE.href,BASE);if(target.origin!==BASE.origin)return;event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async clients=>{for(const c of clients)if('focus'in c){await c.navigate(target.href);return c.focus()}return self.clients.openWindow(target.href)}))});
