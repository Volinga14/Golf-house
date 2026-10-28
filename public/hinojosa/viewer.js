(function(root){
'use strict';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function fit(iw,ih,vw,vh){const scale=Math.min((vw-24)/iw,(vh-24)/ih);return {iw,ih,vw,vh,scale,base:scale,x:(vw-iw*scale)/2,y:(vh-ih*scale)/2};}
function constrain(s){return {...s,x:clamp(s.x,40-s.iw*s.scale,s.vw-40),y:clamp(s.y,40-s.ih*s.scale,s.vh-40)};}
function zoomAt(s,scale,p){scale=clamp(scale,s.base,s.base*12);const ratio=scale/s.scale;return constrain({...s,scale,x:p.x-(p.x-s.x)*ratio,y:p.y-(p.y-s.y)*ratio});}
function pan(s,dx,dy){return constrain({...s,x:s.x+dx,y:s.y+dy});}
function pinch(s,start,end){const distance=pts=>Math.hypot(pts[1].x-pts[0].x,pts[1].y-pts[0].y);const center=pts=>({x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2});const a=center(start),b=center(end),d=distance(start);return pan(zoomAt(s,s.scale*distance(end)/Math.max(1,d),a),b.x-a.x,b.y-a.y);}
function create(doc){
 const $=id=>doc.getElementById(id),dialog=$('zoom'),stage=$('zoomstage'),image=$('zoomimage'),label=$('zoomlevel'),status=$('zoomstatus');
 let state=null,gesture=null,pointers=new Map(),lastTap=null,opener=null,bodyOverflow='',touchMoved=false,pendingFocus=null;
 const paint=()=>{if(!state)return;image.style.width=state.iw+'px';image.style.height=state.ih+'px';image.style.transform='translate('+state.x+'px,'+state.y+'px) scale('+state.scale+')';label.textContent=Math.round(state.scale/state.base*100)+'%';$('zoomout').disabled=state.scale<=state.base*1.001;$('zoomin').disabled=state.scale>=state.base*11.999;};
 const ready=()=>image.complete&&image.naturalWidth>0;
 function reset(){if(!ready()||!dialog.open)return;state=fit(image.naturalWidth,image.naturalHeight,stage.clientWidth,stage.clientHeight);image.hidden=false;status.hidden=true;pointers.clear();gesture=null;if(pendingFocus){const p={x:state.x+pendingFocus.x*state.iw*state.scale,y:state.y+pendingFocus.y*state.ih*state.scale};state=pan(zoomAt(state,state.base*6,p),state.vw/2-p.x,state.vh/2-p.y);pendingFocus=null;}paint();}
 function close(){dialog.close();}
 function finish(){doc.body.style.overflow=bodyOverflow;pointers.clear();gesture=null;state=null;opener?.focus?.({preventScroll:true});}
 function open(url,title,focus){pendingFocus=focus||null;opener=doc.activeElement;bodyOverflow=doc.body.style.overflow;doc.body.style.overflow='hidden';state=null;pointers.clear();gesture=null;lastTap=null;image.hidden=true;status.hidden=false;status.textContent='Cargando lámina…';$('zoomtitle').textContent=title;image.alt=title+' · lámina oficial';$('zoomoriginal').href=url;dialog.showModal();image.src=url;if(ready())reset();stage.focus({preventScroll:true});}
 image.onload=()=>{if(!state)reset();};image.onerror=()=>{status.hidden=false;status.textContent='No se ha podido cargar la lámina. Cierra y vuelve a intentarlo con conexión, o abre el original.';image.hidden=true;state=null;};
 function zoom(mult,p){if(!state)return;state=zoomAt(state,state.scale*mult,p||{x:state.vw/2,y:state.vh/2});paint();}
 $('closezoom').onclick=close;$('zoomfit').onclick=reset;$('zoomin').onclick=()=>zoom(1.5);$('zoomout').onclick=()=>zoom(1/1.5);
 dialog.addEventListener('close',finish);
 const local=e=>{const r=stage.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};};
 function rebase(){const points=Array.from(pointers.values()).slice(0,2);gesture=state&&points.length?{state:{...state},points}:null;}
 stage.addEventListener('pointerdown',e=>{if(!state||(e.pointerType==='mouse'&&e.button!==0))return;e.preventDefault();stage.setPointerCapture(e.pointerId);pointers.set(e.pointerId,local(e));touchMoved=false;rebase();});
 stage.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId)||!gesture)return;e.preventDefault();pointers.set(e.pointerId,local(e));const pts=Array.from(pointers.values()).slice(0,2);if(pts.length>1&&gesture.points.length>1){state=pinch(gesture.state,gesture.points,pts);touchMoved=true;}else{const dx=pts[0].x-gesture.points[0].x,dy=pts[0].y-gesture.points[0].y;state=pan(gesture.state,dx,dy);if(Math.hypot(dx,dy)>8)touchMoved=true;}paint();});
 function release(e){if(!pointers.has(e.pointerId))return;const tap=!touchMoved&&pointers.size===1&&e.type==='pointerup';pointers.delete(e.pointerId);if(tap&&e.pointerType!=='mouse'){const p=local(e),now=Date.now();if(lastTap&&now-lastTap.time<320&&Math.hypot(p.x-lastTap.p.x,p.y-lastTap.p.y)<30){if(state.scale>state.base*1.1)reset();else zoom(3,p);lastTap=null;}else lastTap={time:now,p};}if(pointers.size){touchMoved=true;rebase();}else gesture=null;}
 stage.addEventListener('pointerup',release);stage.addEventListener('pointercancel',release);stage.addEventListener('lostpointercapture',e=>{pointers.delete(e.pointerId);rebase();});
 stage.addEventListener('wheel',e=>{if(!state)return;e.preventDefault();zoom(Math.exp(-e.deltaY*.002),local(e));},{passive:false});
 stage.addEventListener('dblclick',e=>{if(!state)return;e.preventDefault();if(state.scale>state.base*1.1)reset();else zoom(3,local(e));});
 stage.addEventListener('keydown',e=>{if(!state)return;const moves={ArrowLeft:[60,0],ArrowRight:[-60,0],ArrowUp:[0,60],ArrowDown:[0,-60]};if(moves[e.key]){e.preventDefault();state=pan(state,...moves[e.key]);paint();}else if(e.key==='+'||e.key==='='){e.preventDefault();zoom(1.5);}else if(e.key==='-'){e.preventDefault();zoom(1/1.5);}else if(e.key==='0'){e.preventDefault();reset();}});
 if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>{if(dialog.open)reset();}).observe(stage);
 return {open,close};
}
root.HinojosaViewer={fit,zoomAt,pan,pinch,create};
})(typeof window==='undefined'?globalThis:window);
