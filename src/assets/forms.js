// Formularios de contacto (form[data-lead]): validación, Turnstile bajo demanda, UTM y envío a /api/lead
'use strict';
(function(){
  const ss={get(k){try{return sessionStorage.getItem(k)}catch(e){return null}},set(k,v){try{sessionStorage.setItem(k,v)}catch(e){}}};
  // Guarda la campaña de llegada (UTM) durante la sesión, sin cookies
  try{
    const q=new URLSearchParams(location.search);
    ['utm_source','utm_medium','utm_campaign'].forEach(k=>{const v=q.get(k);if(v)ss.set(k,v.slice(0,80))});
    if(!ss.get('landing'))ss.set('landing',location.pathname);
  }catch(e){}

  const meta=document.querySelector('meta[name="turnstile-sitekey"]');
  const SITEKEY=meta&&meta.content?meta.content:'';
  let tsLoading=null;
  function loadTurnstile(){
    if(!SITEKEY)return Promise.resolve(null);
    if(window.turnstile)return Promise.resolve(window.turnstile);
    if(tsLoading)return tsLoading;
    tsLoading=new Promise((res,rej)=>{
      window.__tsReady=()=>res(window.turnstile);
      const s=document.createElement('script');
      s.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__tsReady';
      s.async=true;s.defer=true;s.onerror=()=>rej(new Error('turnstile'));
      document.head.appendChild(s);
    });
    return tsLoading;
  }
  function prepare(form){
    if(form.dataset.tsReady)return;form.dataset.tsReady='1';
    const box=form.querySelector('.ts');if(!SITEKEY||!box)return;
    loadTurnstile().then(ts=>{if(ts&&!box.dataset.wid)box.dataset.wid=ts.render(box,{sitekey:SITEKEY,language:'es',theme:'auto',size:'flexible'})}).catch(()=>{});
  }
  function setStatus(form,msg,kind){const s=form.querySelector('.status');if(!s)return;s.textContent=msg;s.className='status '+(kind||'')}

  document.querySelectorAll('form[data-lead]').forEach(form=>{
    form.addEventListener('focusin',()=>prepare(form),{once:true});
    form.addEventListener('submit',async e=>{
      e.preventDefault();
      if(!form.reportValidity())return;
      const btn=form.querySelector('[type=submit]');
      const fd=new FormData(form);const data={};
      fd.forEach((v,k)=>{data[k]=typeof v==='string'?v.trim():v});
      form.querySelectorAll('input[type=checkbox]').forEach(c=>{data[c.name]=c.checked});
      data.kind=form.dataset.lead;
      data.page=location.pathname;
      data.landing=ss.get('landing')||'';
      ['utm_source','utm_medium','utm_campaign'].forEach(k=>{data[k]=ss.get(k)||''});
      if(data.share_score===false){delete data.score;delete data.lp_mode}
      const box=form.querySelector('.ts');
      if(SITEKEY&&box){
        const token=window.turnstile&&box.dataset.wid?window.turnstile.getResponse(box.dataset.wid):'';
        if(!token){prepare(form);setStatus(form,'Completa la verificación antes de enviar.','err');return}
        data.turnstile=token;
      }
      btn.disabled=true;setStatus(form,'Enviando…');
      try{
        const r=await fetch('/api/lead',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
        const j=await r.json().catch(()=>({}));
        if(r.ok&&j.ok){
          setStatus(form,form.dataset.okMsg||'Recibido. Gracias.','ok');form.reset();
          form.querySelectorAll('input,select,textarea,button').forEach(el=>{if(el.type!=='hidden')el.disabled=true});
        }else{
          setStatus(form,j.error||'No se pudo enviar. Inténtalo de nuevo en unos minutos.','err');btn.disabled=false;
        }
      }catch(err){
        setStatus(form,'No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.','err');btn.disabled=false;
      }finally{
        if(window.turnstile&&box&&box.dataset.wid){try{window.turnstile.reset(box.dataset.wid)}catch(e){}}
      }
    });
  });
})();
