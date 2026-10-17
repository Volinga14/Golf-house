// Optional delivery. SSE and the rest of the app work without this dependency.
let provider;
export async function pushProvider(env){
 if(!env.VAPID_PUBLIC_KEY||!env.VAPID_PRIVATE_KEY||!env.VAPID_SUBJECT)return null;
 try{provider=(await import('web-push')).default;provider.setVapidDetails(env.VAPID_SUBJECT,env.VAPID_PUBLIC_KEY,env.VAPID_PRIVATE_KEY);return provider}catch{return null}
}
export function safePushEndpoint(endpoint){
 try{const u=new URL(endpoint);return u.protocol==='https:' && u.port==='' && !u.username && !u.password && (u.hostname==='fcm.googleapis.com'||u.hostname==='updates.push.services.mozilla.com'||u.hostname.endsWith('.push.apple.com')||u.hostname==='web.push.apple.com'||u.hostname.endsWith('.notify.windows.com'))}catch{return false}
}
