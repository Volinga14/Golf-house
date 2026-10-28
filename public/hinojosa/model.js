/* Browser + Node, no dependencies. */
(function(root){
'use strict';
function number(v){if(v===null||v===undefined||String(v).trim()==='')return null;const n=Number(String(v).replace(',','.'));return Number.isFinite(n)?n:null;}
function allocation(hcp,si){const h=number(hcp);if(h===null||!Number.isInteger(h))return null;const base=Math.floor(h/18),remainder=h-base*18;return base+(si<=remainder?1:0);}
function points(hole,score,hcp){if(score===null||score===undefined)return null;if(score.picked)return hcp===null||number(hcp)===null?null:0;const s=number(score.strokes),a=allocation(hcp,hole.si);if(s===null||a===null)return null;return Math.max(0,2+hole.par+a-s);}
function estimate(index,slope,rating){const i=number(index);return i===null?null:Math.round(i*slope/113+rating-72);}
function validScore(s){return s&&typeof s==='object'&&Number.isInteger(s.putts)&&s.putts>=0&&s.putts<=10&&((s.picked===true&&s.strokes===null)||(!s.picked&&Number.isInteger(s.strokes)&&s.strokes>=1&&s.strokes<=30&&s.putts<=s.strokes));}
function summary(holes,scores,hcp){let played=0,strokes=0,par=0,total=0,putts=0,picked=0;holes.forEach((h,i)=>{const s=scores[i];if(!s)return;played++;putts+=s.putts||0;if(s.picked)picked++;else{strokes+=s.strokes;par+=h.par;}total+=points(h,s,hcp)||0;});return {played,strokes,par,points:number(hcp)===null?null:total,putts,picked};}
root.HinojosaModel={number,allocation,points,estimate,validScore,summary};
})(typeof window==='undefined'?globalThis:window);
