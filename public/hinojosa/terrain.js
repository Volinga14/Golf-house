/* Textured terrain from IGN MDT05; all dimensions and heights are metres. */
(function(){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function multiply(a,b){const out=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];return out;}
function lookAt(eye,target,up){const norm=v=>{const l=Math.hypot(...v);return v.map(n=>n/l);},cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),z=norm(eye.map((v,i)=>v-target[i])),x=norm(cross(up,z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);}
function mesh(d){const vertices=[],indices=[],mid=(d.min+d.max)/2;for(let r=0;r<d.rows;r++)for(let c=0;c<d.cols;c++)vertices.push((c/(d.cols-1)-.5)*d.width,d.elevations[r*d.cols+c]-mid,(r/(d.rows-1)-.5)*d.depth,c/(d.cols-1),r/(d.rows-1));for(let r=0;r<d.rows-1;r++)for(let c=0;c<d.cols-1;c++){const a=r*d.cols+c,b=a+1,k=a+d.cols;indices.push(a,k,b,b,k,k+1);}return{vertices:new Float32Array(vertices),indices:new Uint16Array(indices)};}
const CLUBS=['','Driver','Madera 3','Madera 5','Híbrido','Hierro largo','Hierro medio'];
const PHASES=[
 {name:'Salida',title:'Abre tu segundo golpe',text:'La guía de José Rivero propone jugar a la derecha del búnker de caída. Escoge una referencia que identifiques desde tu tee.',next:'Ver aproximación →',focus:[.42,.33],zoom:1.12,yaw:-.65,pitch:.88},
 {name:'Aproximación',title:'Mira la entrada al green',text:'Confirma tu distancia con el medidor o las marcas del campo. Amplía el green y localiza los búnkers antes de elegir el palo.',next:'Ver el green →',focus:[.59,.24],zoom:1.7,yaw:-.9,pitch:1.05},
 {name:'Green',title:'Elige tu zona de entrada',text:'El esquema oficial da 21 m de fondo como referencia. Para el putt, comprueba las caídas sobre el terreno: esta malla no tiene ese detalle.',next:'Anotar resultado →',focus:[.79,.24],zoom:2.7,yaw:-.8,pitch:1.18}
];
function cleanPlan(value){const p=value&&typeof value==='object'?value:{};return{phase:Number.isInteger(p.phase)&&p.phase>=0&&p.phase<3?p.phase:0,club:CLUBS.includes(p.club)?p.club:'',aim:typeof p.aim==='string'?p.aim.slice(0,120):'',review:['yes','little','no'].includes(p.review)?p.review:''};}
function preset(phase,d){const p=PHASES[clamp(phase,0,2)];return{zoom:p.zoom,yaw:p.yaw,pitch:p.pitch,pan:[(p.focus[0]-.5)*d.width,(p.focus[1]-.5)*d.depth]};}
window.HinojosaTerrain={mesh,multiply,lookAt,cleanPlan,preset,PHASES,create};
function create(doc,callbacks={}){
 const $=id=>doc.getElementById(id),dialog=$('terrain'),canvas=$('terrainCanvas'),status=$('terrainStatus');
 let data,ready=false,opening=false,mode='3d',exaggeration=3,colors=false,contours=false,yaw=-.3,pitch=.85,zoom=1,pan=[0,0],frame=0,pointer=new Map(),gesture;
 const midpoint=()=>{const a=[...pointer.values()];return a.reduce((s,p)=>[s[0]+p.x/a.length,s[1]+p.y/a.length],[0,0]);};
 const separation=()=>{const a=[...pointer.values()];return a.length<2?0:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);};
 let ctx,photo,round=false,plan=cleanPlan(),info={};
 function storePlan(){const ok=callbacks.onPlanChange?.({...plan});$('roundSaved').textContent=ok===false?'No se ha podido guardar en este móvil.':'Guardado en este móvil';}
 function applyPhase(){if(!data)return;const p=preset(plan.phase,data);yaw=p.yaw;pitch=p.pitch;zoom=p.zoom;pan=p.pan;}
 function fieldUI(){
  dialog.classList.toggle('is-round',round);$('terrainRoundNav').hidden=!round;$('roundDock').hidden=!round;$('terrainExperience').textContent=round?'Explorar libre':'Modo ronda';$('terrainExperience').setAttribute('aria-pressed',String(round));
  $('terrainTitle').textContent=round?'Hoyo 1 · En el campo':'El terreno, en perspectiva';$('terrainEyebrow').textContent=round?'PAR 4 · '+(info.meters||382)+' m DE TARJETA · '+(info.tee||'Amarillas').toUpperCase():'PRUEBA · HOYO 1';
  const p=PHASES[plan.phase];$('roundPhase').textContent=(plan.phase+1)+'/3 · '+p.name;$('roundTitle').textContent=p.title;$('roundAdvice').textContent=p.text;$('roundNext').textContent=p.next;
  for(let i=0;i<3;i++)$('roundPhase'+i).setAttribute('aria-pressed',String(i===plan.phase));
  $('roundPlanDetails').hidden=plan.phase!==0;$('roundReview').hidden=plan.phase!==2;$('roundScore').hidden=plan.phase===2;$('roundClub').value=plan.club;$('roundAim').value=plan.aim;
  $('roundDecision').textContent=plan.club||plan.aim?[plan.club,plan.aim].filter(Boolean).join(' · '):'Sin decisión guardada';
  for(const v of ['yes','little','no'])$('roundReview'+v).setAttribute('aria-pressed',String(v===plan.review));
  $('roundSource').href=window.HINOJOSA.source.book;
 }
 function selectPhase(i){plan.phase=i;applyPhase();storePlan();fieldUI();update();}
 function score(){dialog.close();callbacks.onScore?.();}

 function initialize(image){ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw Error('No se puede abrir el visor en este navegador.');photo=image;ready=true;}
 function project(matrix,x,y,z,w,h){const q=[x,y,z,1],p=[0,0,0,0];for(let r=0;r<4;r++)for(let k=0;k<4;k++)p[r]+=matrix[k*4+r]*q[k];return{x:(p[0]/p[3]+1)*w/2,y:(1-p[1]/p[3])*h/2,depth:p[3]};}
 function triangle(a,b,c){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.closePath();}
 function textureTriangle(a,b,c){
  const x0=a.u*photo.width,y0=a.v*photo.height,x1=b.u*photo.width,y1=b.v*photo.height,x2=c.u*photo.width,y2=c.v*photo.height,det=x0*(y1-y2)+x1*(y2-y0)+x2*(y0-y1);if(Math.abs(det)<.001)return;
  const transform=v=>[(v[0]*(y1-y2)+v[1]*(y2-y0)+v[2]*(y0-y1))/det,(v[0]*(x2-x1)+v[1]*(x0-x2)+v[2]*(x1-x0))/det,(v[0]*(x1*y2-x2*y1)+v[1]*(x2*y0-x0*y2)+v[2]*(x0*y1-x1*y0))/det],tx=transform([a.x,b.x,c.x]),ty=transform([a.y,b.y,c.y]);
  ctx.save();const mx=(a.x+b.x+c.x)/3,my=(a.y+b.y+c.y)/3,expand=p=>{const dx=p.x-mx,dy=p.y-my,l=Math.hypot(dx,dy)||1;return{x:p.x+dx/l*.45,y:p.y+dy/l*.45};};triangle(expand(a),expand(b),expand(c));ctx.clip();ctx.setTransform(tx[0],ty[0],tx[1],ty[1],tx[2],ty[2]);ctx.drawImage(photo,0,0);ctx.restore();
 }
 function draw(){frame=0;if(!ready||!dialog.open)return;const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,1.5),w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}ctx.fillStyle='#091a14';ctx.fillRect(0,0,w,h);
  const aspect=w/h,size=Math.max(data.width,data.depth),target=[pan[0],0,pan[1]];let view,projection;
  if(mode==='2d'){const half=Math.max(data.depth/2,data.width/(2*aspect))*1.12/zoom,wide=half*aspect;projection=new Float32Array([1/wide,0,0,0,0,1/half,0,0,0,0,-2/(size*5),0,0,0,-1,1]);view=lookAt([target[0],size*2,target[2]+.01],target,[0,0,-1]);}
  else{const fov=.75,distance=Math.max(size*.9,data.width/(aspect*2*Math.tan(fov/2)))*1.6/zoom,eye=[target[0]+Math.sin(yaw)*Math.cos(pitch)*distance,Math.sin(pitch)*distance,target[2]+Math.cos(yaw)*Math.cos(pitch)*distance],near=1,far=size*12,f=1/Math.tan(fov/2);projection=new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]);view=lookAt(eye,target,[0,1,0]);}
  const matrix=multiply(projection,view),mid=(data.min+data.max)/2,relief=mode==='2d'?0:exaggeration,points=[];
  for(let r=0;r<data.rows;r++)for(let c=0;c<data.cols;c++){const u=c/(data.cols-1),v=r/(data.rows-1),alt=data.elevations[r*data.cols+c],p=project(matrix,(u-.5)*data.width,(alt-mid)*relief,(v-.5)*data.depth,w,h);points.push({...p,u,v,alt});}
  const triangles=[];const step=pointer.size?3:2,rs=[],cs=[];for(let i=0;i<data.rows-1;i+=step)rs.push(i);rs.push(data.rows-1);for(let i=0;i<data.cols-1;i+=step)cs.push(i);cs.push(data.cols-1);
  for(let ri=0;ri<rs.length-1;ri++)for(let ci=0;ci<cs.length-1;ci++){const a=points[rs[ri]*data.cols+cs[ci]],b=points[rs[ri]*data.cols+cs[ci+1]],c=points[rs[ri+1]*data.cols+cs[ci]],d=points[rs[ri+1]*data.cols+cs[ci+1]];triangles.push([a,c,b],[b,c,d]);}
  triangles.sort((a,b)=>b.reduce((s,p)=>s+p.depth,0)-a.reduce((s,p)=>s+p.depth,0));
  if(mode==='2d'){const a=points[0],b=points[data.cols-1],c=points[points.length-1];ctx.drawImage(photo,a.x,a.y,b.x-a.x,c.y-a.y);}
  else{
   // Vertical skirts make the cut-out terrain volume visible without invented trees/buildings.
   const border=[...cs.map(c=>c),...rs.slice(1).map(r=>r*data.cols+data.cols-1),...cs.slice(0,-1).reverse().map(c=>(data.rows-1)*data.cols+c),...rs.slice(1,-1).reverse().map(r=>r*data.cols)];
   const sides=border.map((i,k)=>{const a=points[i],b=points[border[(k+1)%border.length]],bottom=p=>project(matrix,(p.u-.5)*data.width,(data.min-mid)*relief-18,(p.v-.5)*data.depth,w,h);return[a,b,bottom(b),bottom(a)];}).sort((a,b)=>b[0].depth+b[1].depth-a[0].depth-a[1].depth);
   ctx.fillStyle='#525648';ctx.strokeStyle='#434c3c';ctx.lineWidth=.5;for(const side of sides){ctx.beginPath();side.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fill();ctx.stroke();}
   for(const t of triangles)if(t.every(p=>p.depth>0))textureTriangle(...t);
  }
  if(colors)for(const t of triangles){const level=(t.reduce((s,p)=>s+p.alt,0)/3-data.min)/(data.max-data.min);triangle(...t);ctx.fillStyle='hsla('+(170-level*125)+',60%,55%,.48)';ctx.fill();}
  if(contours){ctx.strokeStyle='rgba(255,255,225,.7)';ctx.lineWidth=.8*dpr;ctx.beginPath();for(const t of triangles)for(let level=Math.ceil(Math.min(...t.map(p=>p.alt))/2)*2;level<=Math.max(...t.map(p=>p.alt));level+=2){const hits=[];for(let i=0;i<3;i++){const a=t[i],b=t[(i+1)%3];if((a.alt<level&&b.alt>=level)||(b.alt<level&&a.alt>=level)){const f=(level-a.alt)/(b.alt-a.alt);hits.push([a.x+(b.x-a.x)*f,a.y+(b.y-a.y)*f]);}}if(hits.length===2){ctx.moveTo(...hits[0]);ctx.lineTo(...hits[1]);}}ctx.stroke();}
  function at(u,v){const r=Math.round(v*(data.rows-1)),c=Math.round(u*(data.cols-1)),alt=data.elevations[r*data.cols+c];return project(matrix,(u-.5)*data.width,(alt-mid)*relief,(v-.5)*data.depth,w,h);}
  function marker(u,v,label,active){const a=at(u,v);if(a.depth<=0||a.x<0||a.x>w||a.y<0||a.y>h)return;ctx.strokeStyle=active?'#e5ef96':'#fff8de';ctx.lineWidth=2*dpr;ctx.beginPath();ctx.arc(a.x,a.y,active?12*dpr:6*dpr,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#193c30';ctx.font='600 '+(11*dpr)+'px system-ui';const tw=ctx.measureText(label).width+16*dpr,lx=clamp(a.x-tw/2,4*dpr,w-tw-4*dpr),ly=clamp(a.y-33*dpr,5*dpr,h-24*dpr);ctx.fillRect(lx,ly,tw,22*dpr);ctx.fillStyle='#fff8de';ctx.textAlign='left';ctx.fillText(label,lx+8*dpr,ly+15*dpr);}
  if(round){marker(.20,.49,'Calle 1',plan.phase===0);marker(.45,.20,'Giro de calle',plan.phase===1);marker(.79,.24,'Green 1',plan.phase===2);}
  else marker(.52,.16,'HOYO 1',false);
  if(mode==='2d'){const a=project(matrix,0,0,0,w,h),b=project(matrix,100,0,0,w,h),length=Math.abs(b.x-a.x);ctx.strokeStyle='#fff8df';ctx.fillStyle='#fff8df';ctx.lineWidth=2*dpr;ctx.beginPath();ctx.moveTo(22*dpr,h-61*dpr);ctx.lineTo(22*dpr+length,h-61*dpr);ctx.stroke();ctx.textAlign='left';ctx.font=(11*dpr)+'px system-ui';ctx.fillText('100 m',22*dpr,h-70*dpr);}

 }
 function schedule(){if(!frame)frame=requestAnimationFrame(draw);}
 function update(){for(const v of ['2d','3d'])$('terrain'+v).setAttribute('aria-pressed',String(mode===v));$('terrainExag').disabled=mode==='2d';$('terrainLegend').hidden=!colors;$('terrainMode').textContent=mode==='2d'?'2D · Norte ↑':'3D · relieve ×'+exaggeration;$('terrainHelp').textContent=mode==='2d'?'Arrastra para desplazar · dos dedos para ampliar':'Arrastra para girar e inclinar · dos dedos para ampliar';schedule();}
 function reset(){if(round)applyPhase();else{yaw=-.3;pitch=.85;zoom=1;pan=[0,0];}update();}
 async function open(options={}){if(opening)return;info=options;round=!!options.round;plan=cleanPlan(options.plan);mode=round?'2d':'3d';colors=false;contours=false;$('terrainColors').checked=false;$('terrainContours').checked=false;dialog.classList.remove('adjusting');$('terrainAdjust').setAttribute('aria-expanded','false');fieldUI();$('roundSaved').textContent='Se guarda en este móvil';dialog.showModal();document.body.classList.add('terrain-open');if(ready){reset();return;}opening=true;status.hidden=false;status.textContent='Cargando fotografía y relieve del IGN…';try{const [d,im]=await Promise.all([fetch('terrain-assets/hole1-elevation.json').then(r=>{if(!r.ok)throw Error('No se ha podido cargar el relieve.');return r.json();}),new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(Error('No se ha podido cargar la fotografía.'));i.src='terrain-assets/hole1-ortho.jpg';})]);data=d;$('terrainHeight').textContent=d.min.toFixed(1)+'–'+d.max.toFixed(1)+' m';initialize(im);canvas.hidden=false;$('terrainFallback').hidden=true;$('terrainControls').hidden=false;status.hidden=true;reset();}catch(e){status.textContent=e.message;$('terrainFallback').hidden=false;canvas.hidden=true;$('terrainControls').hidden=true;}finally{opening=false;}}
 $('terrainClose').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{document.body.classList.remove('terrain-open');pointer.clear();});
 for(const v of ['2d','3d'])$('terrain'+v).onclick=()=>{mode=v;reset();};$('terrainExag').onchange=e=>{exaggeration=Number(e.target.value);update();};$('terrainColors').onchange=e=>{colors=e.target.checked;update();};$('terrainContours').onchange=e=>{contours=e.target.checked;schedule();};$('terrainReset').onclick=reset;$('terrainPlus').onclick=()=>{zoom=clamp(zoom*1.25,.5,5);schedule();};$('terrainMinus').onclick=()=>{zoom=clamp(zoom/1.25,.5,5);schedule();};
 function start(){gesture={point:midpoint(),distance:separation(),yaw,pitch,zoom,pan:[...pan]};}
 canvas.addEventListener('pointerdown',e=>{if(!ready)return;canvas.setPointerCapture(e.pointerId);pointer.set(e.pointerId,{x:e.clientX,y:e.clientY});start();});
 canvas.addEventListener('pointermove',e=>{if(!pointer.has(e.pointerId)||!gesture)return;pointer.set(e.pointerId,{x:e.clientX,y:e.clientY});const p=midpoint(),dx=p[0]-gesture.point[0],dy=p[1]-gesture.point[1];if(pointer.size>1){if(gesture.distance>0)zoom=clamp(gesture.zoom*separation()/gesture.distance,.5,5);}else if(mode==='3d'){yaw=gesture.yaw-dx*.008;pitch=clamp(gesture.pitch+dy*.006,.12,1.5);}else{const rect=canvas.getBoundingClientRect(),scale=Math.max(data.width/rect.width,data.depth/rect.height)*1.12/zoom;pan=[clamp(gesture.pan[0]-dx*scale,-data.width,data.width),clamp(gesture.pan[1]-dy*scale,-data.depth,data.depth)];}schedule();});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{pointer.delete(e.pointerId);if(pointer.size)start();else gesture=null;schedule();});
 canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=clamp(zoom*Math.exp(-e.deltaY*.001),.5,5);schedule();},{passive:false});
 canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','0'].includes(e.key)){e.preventDefault();if(e.key==='0')reset();else if(e.key==='+')zoom=clamp(zoom*1.2,.5,5);else if(e.key==='-')zoom=clamp(zoom/1.2,.5,5);else if(mode==='3d'){yaw+=(e.key==='ArrowLeft'?.15:e.key==='ArrowRight'?-.15:0);pitch=clamp(pitch+(e.key==='ArrowUp'?.1:e.key==='ArrowDown'?-.1:0),.12,1.5);}else{pan[0]+=(e.key==='ArrowLeft'?-15:e.key==='ArrowRight'?15:0)/zoom;pan[1]+=(e.key==='ArrowUp'?-15:e.key==='ArrowDown'?15:0)/zoom;}schedule();}});
 $('terrainExperience').onclick=()=>{round=!round;fieldUI();reset();};
 $('terrainAdjust').onclick=()=>{const expanded=dialog.classList.toggle('adjusting');$('terrainAdjust').setAttribute('aria-expanded',String(expanded));schedule();};
 for(let i=0;i<3;i++)$('roundPhase'+i).onclick=()=>selectPhase(i);
 $('roundNext').onclick=()=>plan.phase<2?selectPhase(plan.phase+1):score();$('roundScore').onclick=score;
 $('roundClub').onchange=e=>{plan.club=CLUBS.includes(e.target.value)?e.target.value:'';storePlan();$('roundDecision').textContent=[plan.club,plan.aim].filter(Boolean).join(' · ')||'Sin decisión guardada';};
 $('roundAim').oninput=e=>{plan.aim=e.target.value.slice(0,120);storePlan();$('roundDecision').textContent=[plan.club,plan.aim].filter(Boolean).join(' · ')||'Sin decisión guardada';};
 for(const v of ['yes','little','no'])$('roundReview'+v).onclick=()=>{plan.review=v;storePlan();fieldUI();};
 window.addEventListener('resize',schedule);return{open};
}
})();
