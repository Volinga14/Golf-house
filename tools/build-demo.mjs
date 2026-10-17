import {readFile,writeFile}from'node:fs/promises';
import {fileURLToPath}from'node:url';import{join}from'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const svg=await readFile(join(root,'public/assets/course.svg'),'utf8'),icon=await readFile(join(root,'public/assets/icon.svg'),'utf8');
const baseCss=(await readFile(join(root,'public/styles.css'),'utf8')).replaceAll("'./assets/course.svg'",`'data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}'`);
const css=baseCss+'\n'+await readFile(join(root,'public/refresh.css'),'utf8');
const scripts=await Promise.all(['scoring.js','demo.js','app.js'].map(n=>readFile(join(root,'public',n),'utf8')));
const html=`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#123f34"><title>Clubhouse · Demo de tu liga</title><link rel="icon" href="data:image/svg+xml;base64,${Buffer.from(icon).toString('base64')}"><style>${css}</style></head><body><div id="app"><div class="loading"><span class="brand-symbol">⚑</span><h1>clubhouse<span>®</span></h1><p>Un buen día empieza en el tee.</p></div></div><div id="toast" role="status" aria-live="polite"></div><div id="modal-root"></div><script>window.CLUBHOUSE_DEMO=true;window.CLUBHOUSE_STATIC=true;\n${scripts.join('\n').replaceAll('</script','<\\/script')}</script></body></html>`;
await writeFile(join(root,'DEMO.html'),html);console.log('Demo autónoma generada: DEMO.html');
