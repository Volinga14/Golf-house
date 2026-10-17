/* Shared, deterministic golf rules. No DOM and no dependencies. */
(function(root){
  const roundHalfUp = value => Math.floor(value + 0.5 + 1e-10);
  function handicap(hi, course, allowance=95) {
    const raw = Number(hi)*Number(course.slope)/113 + Number(course.rating)-course.pars.reduce((a,b)=>a+b,0);
    return {raw, course:roundHalfUp(raw), playing:roundHalfUp(raw*allowance/100)};
  }
  function strokes(playing, si, holes=18){
    const q=Math.floor(playing/holes), r=playing-q*holes;
    return q+(si<=r?1:0);
  }
  function points(score, par, received){
    if(score===null || score===undefined) return null;
    if(score==='X') return 0;
    return Math.max(0,2+par+received-score);
  }
  function summary(r){
    const pts=r.scores.map((s,i)=>points(s,r.course.pars[i],strokes(r.playingHandicap,r.course.si[i])));
    const played=r.scores.filter(x=>x!==null).length;
    return {points:pts.reduce((a,b)=>a+(b||0),0),played,pts,gross:r.scores.includes('X')?null:r.scores.reduce((a,b)=>a+(b||0),0),front:pts.slice(0,9).reduce((a,b)=>a+(b||0),0),back:pts.slice(9).reduce((a,b)=>a+(b||0),0)};
  }
  function ranking(users,rounds,settings,month=null){
    const list=users.filter(u=>u.active!==false).map(u=>{
      const monthly=Array(12).fill(null);
      rounds.filter(r=>r.userId===u.id && r.status==='validated' && Number(r.date.slice(0,4))===Number(settings.year)).forEach(r=>{
        const m=Number(r.date.slice(5,7))-1,p=summary(r).points;
        if(monthly[m]===null || p>monthly[m]) monthly[m]=p;
      });
      const vals=monthly.filter(x=>x!==null).sort((a,b)=>b-a).slice(0,settings.bestMonths||12);
      const total=month===null?vals.reduce((a,b)=>a+b,0):(monthly[month]??0);
      const entries=month===null?monthly.filter(x=>x!==null).length:(monthly[month]!==null?1:0);
      return {user:u,monthly,total,entries};
    }).sort((a,b)=>b.total-a.total || a.user.name.localeCompare(b.user.name,'es'));
    let rank=0,last=null;return list.map((x,i)=>{if(x.total!==last){rank=i+1;last=x.total}return {...x,rank}});
  }
  function validateCourse(c){
    if(!c || typeof c.name!=='string' || !c.name.trim() || c.name.length>100) throw Error('Indica un nombre de campo válido.');
    if(!c.tee || c.tee.length>60)throw Error('Indica las barras de salida.');
    if(!Number.isFinite(c.slope)||c.slope<55||c.slope>155)throw Error('Slope válido: de 55 a 155.');
    if(!Number.isFinite(c.rating)||c.rating<40||c.rating>90)throw Error('Valor de campo válido: de 40 a 90.');
    if(!Array.isArray(c.pars)||c.pars.length!==18||c.pars.some(p=>!Number.isInteger(p)||p<3||p>6))throw Error('Introduce el par de los 18 hoyos (3–6).');
    if(!Array.isArray(c.si)||c.si.length!==18||new Set(c.si).size!==18||c.si.some(p=>!Number.isInteger(p)||p<1||p>18))throw Error('Los índices de dificultad deben ser los números 1–18, sin repetir.');
    if(!Array.isArray(c.meters)||c.meters.length!==18||c.meters.some(p=>!Number.isInteger(p)||p<30||p>900))throw Error('Introduce la distancia de cada hoyo en metros (30–900).');
    return true;
  }
  root.Golf={roundHalfUp,handicap,strokes,points,summary,ranking,validateCourse};
})(globalThis);
