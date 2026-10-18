// Learning path: depende de los datos globales definidos en /data/<lp>.js (LP, MODS, PHASES, Q)
'use strict';
const KEY=LP.id, PASS=LP.passMark;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const store={get(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const LV={B:"Básico",I:"Intermedio",A:"Avanzado"};
document.getElementById('stats').innerHTML=[[MODS.length,"módulos"],[Q.length,"preguntas"],[PHASES.length,"fases del ciclo"],[new Set(MODS.flatMap(m=>m.r.map(x=>x[1]))).size,"recursos y documentos"],[PASS+"%","para aprobar"]].map(([b,s])=>`<div class="stat"><b>${b}</b><span>${s}</span></div>`).join('');
document.getElementById('phases').innerHTML=PHASES.map((p,i)=>`<div class="phase"><div class="k">FASE ${i+1}</div><h3>${p.t}</h3><p>${p.d}</p><ul>${p.r.map(([n,u])=>`<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(n)}</a></li>`).join('')}</ul><div class="mods">Módulos: ${p.m.map(x=>'M'+x).join(', ')}</div></div>`).join('');
document.getElementById('mods').innerHTML=MODS.map((m,i)=>`<li><span class="n">M${i+1}</span><div><h3>${m.t} <span class="lvlb ${m.lv}">${LV[m.lv]}</span></h3><p>${m.o}</p><p class="pr"><b>Práctica:</b> ${m.p}</p><div class="res">${m.r.map(([n,u,doc])=>`<a class="${doc?'doc':''}" href="${esc(u)}" target="_blank" rel="noopener">${esc(n)}</a>`).join('')}</div></div><button class="btn ghost" type="button" data-mod="${i+1}">Practicar M${i+1}</button></li>`).join('');

// Tabs
const tabs=[...document.querySelectorAll('#tabs button')];
function selectTab(id){tabs.forEach(t=>{const on=t.id===id;t.setAttribute('aria-selected',on);document.getElementById(t.getAttribute('aria-controls')).hidden=!on});}
tabs.forEach(t=>t.addEventListener('click',()=>selectTab(t.id)));
document.getElementById('mods').addEventListener('click',e=>{const b=e.target.closest('[data-mod]');if(!b)return;modeSel.value='m'+b.dataset.mod;load();selectTab('t-exam');window.scrollTo({top:0})});

// Examen
const modeSel=document.getElementById('mode');
modeSel.innerHTML=`<option value="all">Examen completo · ${Q.length} preguntas</option>`+MODS.map((m,i)=>`<option value="m${i+1}">M${i+1} · ${esc(m.t)} · ${Q.filter(q=>q.m===i+1).length} preguntas</option>`).join('');
let cur=null;
function shuffle(a){for(let i=a.length-1;i>0;i--){const k=Math.floor(Math.random()*(i+1));[a[i],a[k]]=[a[k],a[i]]}return a}
function idxFor(mode){return Q.map((q,i)=>i).filter(i=>mode==='all'||('m'+Q[i].m)===mode)}
function load(){
  const mode=modeSel.value, ids=idxFor(mode);
  let st=store.get(KEY+'-'+mode);
  if(!st||!st.order||st.order.length!==ids.length){st={order:ids.map(i=>[i,shuffle([0,1,2,3])]),ans:{},graded:false}}
  cur={mode,st};render();
}
function save(){store.set(KEY+'-'+cur.mode,cur.st)}
function render(){
  const {st}=cur;
  document.getElementById('qs').innerHTML=st.order.map(([qi,perm],k)=>{const q=Q[qi];const sel=st.ans[qi];
    return `<li id="q-${qi}"><div class="qmeta"><span>P${k+1}</span><span>M${q.m} · ${esc(MODS[q.m-1].t)}</span><span class="lvlb ${q.lv}">${LV[q.lv]}</span></div><p class="qt">${esc(q.p)}</p>
    <div class="opts" role="radiogroup" aria-label="Pregunta ${k+1}">${perm.map(j=>{const cls=st.graded?(j===q.a?'correct':(j===sel?'wrong':'')):'';return `<label class="opt ${cls}" for="o-${qi}-${j}"><input type="radio" id="o-${qi}-${j}" name="q-${qi}" value="${j}" ${sel===j?'checked':''} ${st.graded?'disabled':''}><span>${esc(q.o[j])}</span></label>`}).join('')}</div>
    ${st.graded?`<div class="explain"><span class="tag ${sel===q.a?'ok':'bad'}">${sel===q.a?'Correcta':(sel==null?'Sin responder':'Incorrecta')}</span>${esc(q.e)}</div>`:''}</li>`}).join('');
  progress();
  document.getElementById('res').innerHTML=st.graded?resultHTML():'';
  const nf=document.getElementById('notify');if(nf){nf.hidden=!st.graded;if(st.graded){const sc=scoreOf();nf.querySelector('[name=score]').value=sc.ok+'/'+sc.n;nf.querySelector('[name=lp_mode]').value=cur.mode;nf.querySelector('.scoretxt').textContent=sc.ok+'/'+sc.n}}
}
function progress(){
  const {st}=cur,n=st.order.length,a=Object.keys(st.ans).length;
  document.getElementById('prog').textContent=`${a} de ${n} respondidas`;
  document.getElementById('barfill').style.width=(100*a/n)+'%';
  const g=document.getElementById('grade');g.disabled=st.graded||a<n;
  document.getElementById('hint').textContent=st.graded?'Examen corregido. Reinicia para volver a intentarlo.':(a<n?`Faltan ${n-a} para poder corregir.`:'Todo respondido.');
}
function scoreOf(){let ok=0;cur.st.order.forEach(([qi])=>{if(cur.st.ans[qi]===Q[qi].a)ok++});return {ok,n:cur.st.order.length}}
function resultHTML(){
  const {st}=cur;let ok=0;const bm={};
  st.order.forEach(([qi])=>{const q=Q[qi];bm[q.m]=bm[q.m]||[0,0];bm[q.m][1]++;if(st.ans[qi]===q.a){ok++;bm[q.m][0]++}});
  const n=st.order.length,pct=Math.round(100*ok/n),pass=pct>=PASS;const best=store.get(KEY+'-best-'+cur.mode);
  return `<div class="result ${pass?'pass':'fail'}"><div class="score">${ok}/${n} · ${pct}%</div><p><b>${pass?'Aprobado':'Aún no aprobado'}</b>. ${pass?'Dominas los conceptos de este tramo de la ruta.':'Revisa las explicaciones y los recursos de los módulos con menor puntaje.'} Mejor puntaje en este navegador: ${best??ok}/${n}.</p>
  ${Object.keys(bm).length>1?`<div class="bymod">${Object.entries(bm).map(([m,[o,t]])=>`<div class="${o/t<PASS/100?'lo':'hi'}"><span>M${m} · ${esc(MODS[m-1].t)}</span><b>${o}/${t}</b></div>`).join('')}</div>`:''}</div>`;
}
document.getElementById('qs').addEventListener('change',e=>{const r=e.target;if(r.type!=='radio'||cur.st.graded)return;cur.st.ans[+r.name.slice(2)]=+r.value;save();progress()});
document.getElementById('grade').addEventListener('click',()=>{cur.st.graded=true;let ok=0;cur.st.order.forEach(([qi])=>{if(cur.st.ans[qi]===Q[qi].a)ok++});const b=store.get(KEY+'-best-'+cur.mode);if(b==null||ok>b)store.set(KEY+'-best-'+cur.mode,ok);save();render();document.getElementById('res').scrollIntoView({block:'nearest',behavior:(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)?'auto':'smooth'})});
document.getElementById('reset').addEventListener('click',()=>{try{localStorage.removeItem(KEY+'-'+cur.mode)}catch(e){}load()});
modeSel.addEventListener('change',load);
const h=(location.hash||'').replace('#','');if(/^m([1-9]|10)$/.test(h)){modeSel.value=h;selectTab('t-exam')}else if(h==='examen'){selectTab('t-exam')}
load();
