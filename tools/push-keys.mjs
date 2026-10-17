// VAPID keys are printed only on your own computer. Do not commit their output.
const {default:webpush}=await import('web-push').catch(()=>{console.error('Ejecuta npm install para instalar web-push.');process.exit(1)});
const keys=webpush.generateVAPIDKeys();
console.log('Copia estas líneas en tu .env privado:\n');
console.log('VAPID_PUBLIC_KEY='+keys.publicKey+'\nVAPID_PRIVATE_KEY='+keys.privateKey+'\nVAPID_SUBJECT=mailto:tu-email@ejemplo.com');
console.log('\nSustituye el email por uno real, conserva estas claves y reinicia el servidor.');
