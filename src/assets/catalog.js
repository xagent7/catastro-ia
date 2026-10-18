// Catálogo: depende de los datos globales definidos en /data/catalog.js (CATS, R, E, U, META, LOG, LPS)
'use strict';
const byId=Object.fromEntries(R.map(r=>[r.id,r]));
const relOf=id=>E.filter(e=>e[0]===id||e[1]===id).map(e=>({o:e[0]===id?e[1]:e[0],t:e[2],l:e[3],dir:e[0]===id?'out':'in'}));
const TL={comp:"se complementa",alt:"alternativa",pre:"prerrequisito",fam:"misma familia"};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const short=r=>r.n.split('/').pop().split(' (')[0];
const deg=Object.fromEntries(R.map(r=>[r.id,relOf(r.id).length]));
const MS=864e5, today=Date.now(), fresh=d=>d&&(today-new Date(d+'T12:00:00').getTime())/MS<=META.days;
const fmtD=d=>{const [y,m,dd]=d.split('-');return +dd+' '+['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][+m-1]+' '+y};
const flag=o=>fresh(o.nw)?`<span class="b new" title="Agregado el ${fmtD(o.nw)}">NUEVO</span>`:fresh(o.up)?`<span class="b upd" title="${esc((o.upn||'Actualizado')+' · '+fmtD(o.up))}">ACTUALIZADO</span>`:'';
const isFresh=o=>fresh(o.nw)||fresh(o.up);
let fNew=false;

document.getElementById('stats').innerHTML=[
 [R.length,"recursos"],[R.filter(r=>/github\.com/.test(r.u)).length,"repositorios de GitHub"],[Object.keys(CATS).length,"categorías"],[E.length,"relaciones"],[U.reduce((a,g)=>a+g.items.length,0),"recursos universitarios"]
].map(([b,s])=>`<div class="stat"><b>${b}</b><span>${s}</span></div>`).join('');

let fCat=null;
function card(r){
 const rel=relOf(r.id);
 return `<article class="card" id="r-${r.id}" style="--cc:var(--c-${r.c})">
  <a class="slug" href="${esc(r.u)}" target="_blank" rel="noopener">${esc(r.n)}</a>
  <div class="badges">${flag(r)}<span class="b">${esc(r.t)}</span><span class="b">${esc(r.lv)}</span>${r.conf!=='k'?'<span class="b r" title="Basada en la descripción publicada por sus autores">según el proyecto</span>':''}</div>
  <p>${esc(r.d)}</p>
  <p class="uso"><b>Para qué sirve:</b> ${esc(r.uso)}</p>
  ${r.w?`<div class="warn">${esc(r.w)}</div>`:''}
  ${rel.length?`<div class="rel"><span>Se relaciona con:</span>${rel.map(x=>`<a href="#r-${x.o}" data-go="${x.o}" data-t="${x.t==='pre'&&x.dir==='in'?'prein':x.t}" title="${esc(TL[x.t]+(x.t==='pre'?(x.dir==='out'?' (este va antes)':' (va antes que este)'):'')+': '+x.l)}">${esc(short(byId[x.o]))}</a>`).join('')}</div>`:''}
 </article>`;
}
function renderCats(){
 const counts={};R.forEach(r=>counts[r.c]=(counts[r.c]||0)+1);
 const nNew=R.filter(isFresh).length;
 document.getElementById('cats').innerHTML=`<button class="cat" aria-pressed="${fCat===null&&!fNew}" data-c="">Todas <em>${R.length}</em></button>`+(nNew?`<button class="cat" aria-pressed="${fNew}" data-c="__new">Nuevos y actualizados <em>${nNew}</em></button>`:'')+Object.entries(CATS).filter(([k])=>counts[k]).map(([k,v])=>`<button class="cat" style="--cc:var(--c-${k})" aria-pressed="${fCat===k&&!fNew}" data-c="${k}"><i></i>${v.n} <em>${counts[k]}</em></button>`).join('');
}
function renderCatalog(){
 const q=document.getElementById('q').value.trim().toLowerCase();
 const list=R.filter(r=>(!fNew||isFresh(r))&&(!fCat||r.c===fCat)&&(!q||(r.n+' '+r.d+' '+r.uso+' '+r.t).toLowerCase().includes(q)));
 document.getElementById('count').textContent=list.length+' de '+R.length+' recursos';
 let html='';
 Object.entries(CATS).forEach(([k,v])=>{const items=list.filter(r=>r.c===k).sort((a,b)=>deg[b.id]-deg[a.id]||a.n.localeCompare(b.n)); if(!items.length)return;
  html+=`<div class="section-h" style="--cc:var(--c-${k})"><i></i><h2>${v.n}</h2></div><p class="lede" style="margin:-4px 0 12px">${v.d}</p><div class="grid">${items.map(card).join('')}</div>`;});
 document.getElementById('catalog').innerHTML=html||'<p class="lede">No hay recursos que coincidan con la búsqueda.</p>';
}
document.getElementById('cats').addEventListener('click',e=>{const b=e.target.closest('.cat');if(!b)return;if(b.dataset.c==='__new'){fNew=!fNew;fCat=null}else{fNew=false;fCat=b.dataset.c||null}renderCats();renderCatalog()});
document.getElementById('q').addEventListener('input',renderCatalog);
document.addEventListener('click',e=>{const a=e.target.closest('a[data-go]');if(!a)return;e.preventDefault();
 if(document.getElementById('p-cat').hidden)selectTab('t-cat');
 fCat=null;fNew=false;document.getElementById('q').value='';renderCats();renderCatalog();
 const el=document.getElementById('r-'+a.dataset.go);if(el){el.scrollIntoView({block:'center'});el.style.boxShadow='0 0 0 2px var(--accent)';setTimeout(()=>el.style.boxShadow='',1600)}});

const tabs=[...document.querySelectorAll('#tabs button')];
function selectTab(id){tabs.forEach(t=>{const on=t.id===id;t.setAttribute('aria-selected',on);document.getElementById(t.getAttribute('aria-controls')).hidden=!on});
 try{localStorage.setItem('catastro-pub-tab',id)}catch(e){} if(id==='t-rel')startGraph();}
tabs.forEach(t=>t.addEventListener('click',()=>selectTab(t.id)));

let gStarted=false;
function startGraph(){ if(gStarted)return; gStarted=true;
 const svg=document.getElementById('graph'),NS='http://www.w3.org/2000/svg';
 const W=svg.clientWidth||1000,H=svg.clientHeight||660; svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
 const keys=Object.keys(CATS), ang=k=>keys.indexOf(k)/keys.length*Math.PI*2;
 const nodes=R.map(r=>({id:r.id,r,x:W/2+Math.cos(ang(r.c))*W*.32+(Math.random()-.5)*60,y:H/2+Math.sin(ang(r.c))*H*.34+(Math.random()-.5)*60,vx:0,vy:0,rad:4+Math.sqrt(deg[r.id])*2.6}));
 const nm=Object.fromEntries(nodes.map(n=>[n.id,n]));
 const links=E.map(e=>({s:nm[e[0]],t:nm[e[1]],ty:e[2],l:e[3]}));
 const gl=document.createElementNS(NS,'g'),gn=document.createElementNS(NS,'g');svg.append(gl,gn);
 links.forEach(L=>{L.el=document.createElementNS(NS,'line');L.el.setAttribute('class',L.ty);gl.appendChild(L.el)});
 nodes.forEach(n=>{const g=document.createElementNS(NS,'g');const c=document.createElementNS(NS,'circle');c.setAttribute('r',n.rad);c.setAttribute('fill',`var(--c-${n.r.c})`);if(isFresh(n.r))c.setAttribute('class','isnew');
  const t=document.createElementNS(NS,'text');t.textContent=short(n.r).slice(0,22);t.setAttribute('dx',n.rad+3);t.setAttribute('dy',3.5);
  const ti=document.createElementNS(NS,'title');ti.textContent=n.r.n;c.appendChild(ti);g.append(c,t);gn.appendChild(g);n.g=g});
 const reduce=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
 function step(alpha){
  for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){const a=nodes[i],b=nodes[j];let dx=b.x-a.x,dy=b.y-a.y,d2=dx*dx+dy*dy||1;if(d2>40000)continue;const f=900/d2*alpha;const d=Math.sqrt(d2);dx/=d;dy/=d;a.vx-=dx*f;a.vy-=dy*f;b.vx+=dx*f;b.vy+=dy*f}
  links.forEach(L=>{let dx=L.t.x-L.s.x,dy=L.t.y-L.s.y,d=Math.sqrt(dx*dx+dy*dy)||1;const f=(d-70)*.02*alpha;dx/=d;dy/=d;L.s.vx+=dx*f;L.s.vy+=dy*f;L.t.vx-=dx*f;L.t.vy-=dy*f});
  nodes.forEach(n=>{const a=ang(n.r.c),cx=W/2+Math.cos(a)*W*.3,cy=H/2+Math.sin(a)*H*.3;n.vx+=(cx-n.x)*.006*alpha;n.vy+=(cy-n.y)*.006*alpha;
   if(n.fixed)return;n.vx*=.82;n.vy*=.82;n.x=Math.max(n.rad+4,Math.min(W-90,n.x+n.vx));n.y=Math.max(n.rad+4,Math.min(H-n.rad-4,n.y+n.vy))});
 }
 function draw(){links.forEach(L=>{L.el.setAttribute('x1',L.s.x);L.el.setAttribute('y1',L.s.y);L.el.setAttribute('x2',L.t.x);L.el.setAttribute('y2',L.t.y)});nodes.forEach(n=>n.g.setAttribute('transform',`translate(${n.x},${n.y})`))}
 if(reduce){for(let i=0;i<400;i++)step(1-i/400);draw()} else {for(let i=0;i<150;i++)step(1);let k=0;(function tick(){step(Math.max(.05,1-k/220));draw();if(++k<260)requestAnimationFrame(tick)})()}
 const panel=document.getElementById('panel');
 function focus(n){const nb=new Set([n.id]);links.forEach(L=>{const on=L.s===n||L.t===n;L.el.classList.toggle('on',on);L.el.classList.toggle('dim',!on);if(on){nb.add(L.s.id);nb.add(L.t.id)}});
  nodes.forEach(m=>m.g.classList.toggle('dim',!nb.has(m.id)));
  const rel=relOf(n.id);
  panel.innerHTML=`<h4>${esc(n.r.n)}</h4><p style="color:var(--muted)">${CATS[n.r.c].n}</p>${rel.length?rel.map(x=>`<p><a href="#r-${x.o}" data-go="${x.o}">${esc(short(byId[x.o]))}</a> · <i>${TL[x.t]}</i>: ${esc(x.l)}</p>`).join(''):'<p>Sin relaciones registradas.</p>'}<p><a href="#r-${n.id}" data-go="${n.id}">Ver ficha →</a></p>`}
 let drag=null,moved=false;
 svg.addEventListener('pointerdown',e=>{const g=e.target.closest('g');const n=nodes.find(m=>m.g===g);if(!n)return;drag=n;moved=false;n.fixed=true;svg.setPointerCapture(e.pointerId)});
 svg.addEventListener('pointermove',e=>{if(!drag)return;const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const q=p.matrixTransform(svg.getScreenCTM().inverse());drag.x=q.x;drag.y=q.y;moved=true;draw()});
 svg.addEventListener('pointerup',()=>{if(drag){if(!moved)focus(drag);drag.fixed=false;drag=null}});
 document.getElementById('legend').innerHTML=Object.entries(CATS).map(([k,v])=>`<span><i style="width:10px;height:10px;border-radius:50%;background:var(--c-${k});display:inline-block"></i>${v.n}</span>`).join('')+
  `<span><i class="lg-line"></i>se complementa / prerrequisito</span><span><i class="lg-line alt"></i>alternativa</span><span>Tamaño = número de relaciones</span>`;
}
document.getElementById('unis').innerHTML=U.map(g=>`<div class="uni"><div class="rk">${g.rk}<small>QS 2026</small></div><div><h3>${esc(g.uni)}</h3><p class="pais">${esc(g.pais)}</p><div class="ugrid">${g.items.map(it=>`<article class="ucard">
 <a class="slug" href="${esc(it.u)}" target="_blank" rel="noopener">${esc(it.n)}</a>
 <div class="badges">${flag(it)}<span class="b">${esc(it.t)}</span><span class="b">${esc(it.lv)}</span>${it.conf!=='k'?'<span class="b r" title="Basada en la descripción publicada por la universidad">según el sitio del curso</span>':''}</div>
 <p>${esc(it.d)}</p>
 ${it.w?`<div class="warn">${esc(it.w)}</div>`:''}
 <div class="links"><a href="${esc(it.u)}" target="_blank" rel="noopener">Sitio oficial ↗</a>${it.repo?`<a href="${esc(it.repo)}" target="_blank" rel="noopener">Repositorio ↗</a>`:''}</div>
 ${it.rel.length?`<div class="rel"><span>En el catálogo:</span>${it.rel.map(r=>`<a href="#r-${r[0]}" data-go="${r[0]}" data-t="${r[1]}" title="${esc(TL[r[1]]+': '+r[2])}">${esc(short(byId[r[0]]))}</a>`).join('')}</div>`:''}
</article>`).join('')}</div></div></div>`).join('');
document.getElementById('updated').innerHTML=`<span>Actualizado el <b>${fmtD(META.updated)}</b></span><span>Próxima revisión: ${esc(META.next)}</span><button type="button" id="go-new">Ver novedades →</button>`;
document.getElementById('go-new').addEventListener('click',()=>selectTab('t-new'));
const TT={add:['NUEVO','new'],upd:['ACTUALIZADO','upd'],del:['ELIMINADO','']};
document.getElementById('log').innerHTML=LOG.map(l=>`<article class="logentry"><h3>${fmtD(l.d)}</h3><p class="sum">${esc(l.s)}</p><ul>${l.i.map(x=>`<li><span class="b ${TT[x[0]][1]}">${TT[x[0]][0]}</span><span>${x[2]&&byId[x[2]]?`<a href="#r-${x[2]}" data-go="${x[2]}">${esc(x[1])}</a>`:esc(x[1])}${x[3]?' — '+esc(x[3]):''}</span></li>`).join('')}</ul></article>`).join('');
// Learning paths
document.getElementById('lps').innerHTML=LPS.map(p=>`<article class="lpcard${p.soon?' soon':''}">
 <span class="code">${esc(p.code)}${p.soon?' · PRÓXIMAMENTE':''}</span><h3>${esc(p.title)}</h3><p>${esc(p.summary)}</p>
 ${p.soon?'':`<span class="meta">${p.modules} módulos · ${p.questions} preguntas · aprobación ${p.passMark}%</span><a class="btn" href="${esc(p.href)}">Abrir ruta y examen</a>`}
</article>`).join('');
renderCats();renderCatalog();
const HT={'#mapa':'t-rel','#universidades':'t-uni','#novedades':'t-new','#learning-paths':'t-lp','#catalogo':'t-cat'};
let saved=null;try{saved=localStorage.getItem('catastro-pub-tab')}catch(e){}
if(HT[location.hash])selectTab(HT[location.hash]);else if(saved&&document.getElementById(saved))selectTab(saved);
window.addEventListener('hashchange',()=>{if(HT[location.hash])selectTab(HT[location.hash])});
document.querySelectorAll('[data-tab]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();selectTab(a.dataset.tab);document.getElementById('tabs').scrollIntoView({block:'start'})}));
