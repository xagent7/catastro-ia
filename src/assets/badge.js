// Insignia de práctica Xäboli: se ofrece al aprobar el examen completo de un learning path.
// Todo ocurre en el navegador: la imagen se dibuja en un canvas y nada se envía a un servidor.
'use strict';
(function () {
  const W = 1200, H = 1200;
  const SITE = 'academia.xaboli.cl';
  const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  const KEY = 'badge-' + LP.id;
  // El nombre vive solo en memoria mientras la página está abierta: no se guarda ni se envía.
  let currentName = '';
  const save = b => store.set(KEY, { ok: b.ok, n: b.n, pct: b.pct, date: b.date });
  const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const fmt = iso => { const d = new Date(iso); return d.getDate() + ' de ' + MONTHS[d.getMonth()] + ' de ' + d.getFullYear(); };
  const shareUrl = () => 'https://' + SITE + '/' + LP.id + '?utm_source=linkedin&utm_medium=insignia&utm_campaign=' + LP.id;

  function wrap(ctx, text, maxW) {
    const words = text.split(' '); const lines = []; let line = '';
    for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
    if (line) lines.push(line); return lines;
  }

  const ORANGE = '#e26223', BG = '#0d1112';
  const imgs = {};
  const loadImg = src => imgs[src] || (imgs[src] = new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }));
  const DEFAULT_VARIANT = 'iso-seal';

  async function draw(canvas, b, variant) {
    variant = variant || DEFAULT_VARIANT;
    const [img, iso] = await Promise.all([loadImg('/brand/xaboli-logo-dark.svg'), loadImg('/brand/xaboli-isotipo-dark.svg')]);
    try { await Promise.all(['700 64px "Bricolage Grotesque"', '400 30px "Source Sans 3"', '600 30px "Source Sans 3"', '400 26px "JetBrains Mono"'].map(f => document.fonts.load(f))); } catch (e) {}
    const ctx = canvas.getContext('2d');
    canvas.width = W; canvas.height = H;
    // Fondo
    const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#141a1b'); g.addColorStop(1, BG);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (variant === 'iso-hero' && iso) {
      ctx.globalAlpha = 1; ctx.drawImage(iso, 740, 40, 400, 400);
    } else {
      // Red de nodos (motivo del catastro)
      const N = [[930, 210, 30, ORANGE], [1090, 160, 18, '#F2F5F4'], [1010, 360, 24, '#F2F5F4'], [1120, 330, 36, ORANGE], [880, 410, 14, '#9BABA5'], [1060, 500, 20, ORANGE]];
      const L = [[0, 1], [0, 2], [1, 3], [2, 3], [2, 4], [3, 5], [2, 5], [0, 4]];
      ctx.strokeStyle = 'rgba(226,98,35,.4)'; ctx.lineWidth = 3;
      L.forEach(([a, c]) => { ctx.beginPath(); ctx.moveTo(N[a][0], N[a][1]); ctx.lineTo(N[c][0], N[c][1]); ctx.stroke(); });
      N.forEach(([x, y, r, col]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill(); });
    }
    // Marca
    const isoSeal = variant === 'iso-seal' || variant === 'iso-only';
    if (variant === 'iso-only') {
      ctx.fillStyle = '#9BABA5'; ctx.font = '400 28px "JetBrains Mono", monospace'; ctx.fillText('ACADEMIA DE IA XÄBOLI', 90, 150);
    } else {
      if (img) { const lh = 92, lw = lh * img.naturalWidth / img.naturalHeight || lh * 3.83; ctx.drawImage(img, 90, 80, lw, lh); }
      else { ctx.fillStyle = '#F2F5F4'; ctx.font = '700 80px "Bricolage Grotesque", sans-serif'; ctx.fillText('Xäboli', 90, 160); }
      ctx.fillStyle = '#9BABA5'; ctx.font = '400 26px "JetBrains Mono", monospace';
      ctx.fillText('ACADEMIA DE IA', 94, 222);
    }
    // Sello
    const cx = 250, cy = 430, R = 140;
    if (isoSeal && iso) {
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fillStyle = '#1a2224'; ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, R - 6, 0, Math.PI * 2); ctx.strokeStyle = ORANGE; ctx.lineWidth = 12; ctx.stroke();
      const s2 = R * 1.85; ctx.drawImage(iso, cx - s2 / 2 - 4, cy - s2 / 2 + 4, s2, s2);
      ctx.fillStyle = ORANGE; ctx.font = '700 120px "Bricolage Grotesque", sans-serif'; ctx.fillText(LP.code, cx + R + 50, cy + 20);
      ctx.fillStyle = '#F2F5F4'; ctx.font = '600 30px "Source Sans 3", sans-serif'; ctx.fillText('APROBADO', cx + R + 56, cy + 70);
    } else {
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fillStyle = ORANGE; ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, R - 14, 0, Math.PI * 2); ctx.strokeStyle = BG; ctx.lineWidth = 4; ctx.stroke();
      ctx.fillStyle = BG; ctx.textAlign = 'center';
      ctx.font = '700 92px "Bricolage Grotesque", sans-serif'; ctx.fillText(LP.code, cx, cy + 18);
      ctx.font = '600 24px "Source Sans 3", sans-serif'; ctx.fillText('APROBADO', cx, cy + 64);
      ctx.textAlign = 'left';
    }
    // Título
    ctx.fillStyle = '#F2F5F4'; ctx.font = '700 70px "Bricolage Grotesque", sans-serif';
    let y = 650;
    wrap(ctx, LP.title, W - 180).slice(0, 3).forEach(l => { ctx.fillText(l, 90, y); y += 80; });
    // Persona y resultado
    y += 20;
    ctx.fillStyle = '#B8C6C0'; ctx.font = '400 32px "Source Sans 3", sans-serif';
    if (b.name) { ctx.fillStyle = '#F2F5F4'; ctx.font = '600 40px "Source Sans 3", sans-serif'; ctx.fillText(b.name.slice(0, 48), 90, y); y += 58; ctx.fillStyle = '#B8C6C0'; ctx.font = '400 32px "Source Sans 3", sans-serif'; }
    ctx.fillText('Examen de práctica: ' + b.ok + '/' + b.n + ' · ' + b.pct + '%', 90, y); y += 46;
    ctx.fillText(fmt(b.date), 90, y);
    // Pie
    ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(90, H - 150, W - 180, 2);
    ctx.fillStyle = ORANGE; ctx.font = '400 28px "JetBrains Mono", monospace'; ctx.fillText(SITE + '/' + LP.id, 90, H - 92);
    ctx.fillStyle = '#9BABA5'; ctx.font = '400 22px "Source Sans 3", sans-serif'; ctx.textAlign = 'right';
    ctx.fillText('Insignia de práctica · examen autoevaluado', W - 90, H - 94); ctx.textAlign = 'left';
  }

  function postText(b) {
    return 'Completé la ruta ' + LP.code + ' · ' + LP.title + ' de la Academia de IA Xäboli y aprobé el examen de práctica con ' + b.pct + '% (' + b.ok + '/' + b.n + ').\n\n'
      + LP.summary + '\n\n'
      + 'Es gratuita y en español, con ' + MODS.length + ' módulos y ' + Q.length + ' preguntas: ' + shareUrl() + '\n\n'
      + '#InteligenciaArtificial #IngenieriaDeSoftware #ClaudeCode #AgentesIA #XaboliAcademia';
  }

  function render(b) {
    const host = document.getElementById('badge'); if (!host) return;
    host.hidden = false;
    host.innerHTML = `<h3 id="badge-h">Tu insignia ${LP.code}</h3>
      <p class="lede">Aprobaste el examen completo. Descarga la insignia y compártela en LinkedIn con el texto listo.</p>
      <div class="badge-grid">
        <div class="badge-img"><canvas id="badge-canvas" aria-label="Insignia de práctica ${LP.code}" role="img"></canvas></div>
        <div class="badge-side">
          <label class="badge-name">Tu nombre <span class="optional">(opcional: aparece en la insignia y en el diploma; no se guarda ni se envía a ningún lado)</span><input type="text" id="badge-name" maxlength="48" autocomplete="name"></label>
          <label class="badge-post">Texto para LinkedIn<textarea id="badge-text" rows="9"></textarea></label>
          <div class="badge-actions">
            <button class="btn" type="button" id="badge-dl">1. Descargar imagen</button>
            <button class="btn ghost" type="button" id="badge-copy">2. Copiar texto</button>
            <a class="btn ghost" id="badge-li" target="_blank" rel="noopener">3. Publicar en LinkedIn ↗</a>
          </div>
          <p class="fine" id="badge-msg" role="status">LinkedIn no permite adjuntar la imagen automáticamente: al abrir la publicación, pega el texto y adjunta la imagen descargada.</p>
          ${LP.wa ? `<div class="badge-more badge-wa">
            <h4>Únete al grupo de la comunidad</h4>
            <p class="fine">Completaste la ruta: ya puedes entrar al grupo de WhatsApp de Estrategas de Soluciones en la era Agéntica. Tu solicitud la aprueba un administrador. Al unirte, tu número queda visible para los demás miembros (<a href="/privacidad/">más detalles</a>).</p>
            <a class="btn wa" href="${LP.wa}" target="_blank" rel="noopener">Pedir acceso al grupo de WhatsApp ↗</a>
          </div>` : ''}
          <div class="badge-more">
            <h4>Guárdala en tu perfil</h4>
            <p class="fine">Agrégala a <b>Licencias y certificaciones</b> de tu perfil de LinkedIn: así queda tu historial de insignias de la Academia en un solo lugar.</p>
            <a class="btn ghost" id="badge-profile" target="_blank" rel="noopener">Agregar a mi perfil de LinkedIn ↗</a>
          </div>
          <div class="badge-more">
            <h4>Diploma</h4>
            <p class="fine" id="dip-hint">Escribe tu nombre arriba para generar tu diploma de práctica en formato carta horizontal.</p>
            <div class="badge-actions"><button class="btn ghost" type="button" id="dip-dl" disabled>Descargar diploma (PNG)</button><button class="btn ghost" type="button" id="dip-print" disabled>Imprimir o guardar PDF</button></div>
          </div>
        </div>
      </div>`;
    const canvas = host.querySelector('#badge-canvas'), nameI = host.querySelector('#badge-name'), txt = host.querySelector('#badge-text'), msg = host.querySelector('#badge-msg'), li = host.querySelector('#badge-li');
    nameI.value = b.name || '';
    txt.value = postText(b);
    const sync = () => { li.href = 'https://www.linkedin.com/feed/?shareActive=true&text=' + encodeURIComponent(txt.value); };
    sync(); txt.addEventListener('input', sync);
    draw(canvas, b);
    let t; nameI.value = currentName; nameI.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { b.name = currentName = nameI.value.trim(); save(b); if (window.__dipHint) window.__dipHint(); draw(canvas, b); }, 250); });
    host.querySelector('#badge-dl').addEventListener('click', () => {
      canvas.toBlob(blob => { if (!blob) return; const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'insignia-xaboli-' + LP.id + '.png'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); msg.textContent = 'Imagen descargada. Ahora copia el texto y publícalo.'; }, 'image/png');
    });
    host.querySelector('#badge-copy').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(txt.value); msg.textContent = 'Texto copiado. Ábrelo en LinkedIn, pégalo y adjunta la imagen.'; }
      catch (e) { txt.select(); msg.textContent = 'Selecciona el texto y cópialo con Ctrl+C o Cmd+C.'; }
    });
    li.addEventListener('click', () => { try { navigator.clipboard.writeText(txt.value); } catch (e) {} });
    // Perfil de LinkedIn: formulario «Agregar licencia o certificación» precargado
    const d = new Date(b.date);
    const q = new URLSearchParams({ startTask: 'CERTIFICATION_NAME', name: 'Insignia de práctica ' + LP.code + ' · ' + LP.title, organizationName: 'Xäboli', issueYear: String(d.getFullYear()), issueMonth: String(d.getMonth() + 1), certUrl: 'https://' + SITE + '/' + LP.id });
    host.querySelector('#badge-profile').href = 'https://www.linkedin.com/profile/add?' + q.toString();
    // Diploma
    const dl2 = host.querySelector('#dip-dl'), pr = host.querySelector('#dip-print'), hint = host.querySelector('#dip-hint');
    function dipHint() { const ok = !!currentName; dl2.disabled = pr.disabled = !ok; hint.textContent = ok ? 'Tu diploma está listo con el nombre «' + currentName + '».' : 'Escribe tu nombre arriba para generar tu diploma de práctica en formato carta horizontal.'; }
    window.__dipHint = dipHint; dipHint();
    dl2.addEventListener('click', async () => { const c = document.createElement('canvas'); await drawDiploma(c, b); c.toBlob(blob => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'diploma-xaboli-' + LP.id + '.png'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }, 'image/png'); });
    pr.addEventListener('click', async () => {
      const c = document.createElement('canvas'); await drawDiploma(c, b);
      const img = document.createElement('img'); img.id = 'diploma-print'; img.alt = 'Diploma'; img.src = c.toDataURL('image/png');
      await new Promise(r => { img.onload = r; });
      document.body.appendChild(img); document.body.classList.add('printing-diploma');
      const done = () => { document.body.classList.remove('printing-diploma'); img.remove(); window.removeEventListener('afterprint', done); };
      window.addEventListener('afterprint', done); window.print(); setTimeout(() => { if (document.getElementById('diploma-print')) done(); }, 60000);
    });
  }

  // Diploma de práctica: carta horizontal (11 × 8,5 in a 150 ppp), fondo claro para imprimir
  async function drawDiploma(canvas, b) {
    const DW = 1650, DH = 1275;
    const [logoL, isoL] = await Promise.all([loadImg('/brand/xaboli-logo-light.svg'), loadImg('/brand/xaboli-isotipo-light.svg')]);
    try { await Promise.all(['700 64px "Bricolage Grotesque"', '400 30px "Source Sans 3"', '600 30px "Source Sans 3"', '400 26px "JetBrains Mono"'].map(f => document.fonts.load(f))); } catch (e) {}
    canvas.width = DW; canvas.height = DH;
    const c = canvas.getContext('2d');
    c.fillStyle = '#FFFFFF'; c.fillRect(0, 0, DW, DH);
    c.strokeStyle = ORANGE; c.lineWidth = 10; c.strokeRect(40, 40, DW - 80, DH - 80);
    c.strokeStyle = '#D5DEDA'; c.lineWidth = 2; c.strokeRect(62, 62, DW - 124, DH - 124);
    const mid = DW / 2;
    if (logoL) { const lh = 84, lw = lh * logoL.naturalWidth / logoL.naturalHeight || lh * 3.83; c.drawImage(logoL, mid - lw / 2, 120, lw, lh); }
    c.textAlign = 'center';
    c.fillStyle = '#56665F'; c.font = '400 26px "JetBrains Mono", monospace'; c.fillText('ACADEMIA DE IA', mid, 250);
    c.fillStyle = BG; c.font = '700 76px "Bricolage Grotesque", sans-serif'; c.fillText('Diploma de práctica', mid, 370);
    c.fillStyle = '#56665F'; c.font = '400 32px "Source Sans 3", sans-serif'; c.fillText('Se otorga a', mid, 450);
    c.fillStyle = BG; c.font = '700 84px "Bricolage Grotesque", sans-serif';
    let nm = (b.name || '').slice(0, 60); while (c.measureText(nm).width > DW - 360 && c.font) { const sz = parseInt(c.font.match(/(\d+)px/)[1], 10) - 4; c.font = '700 ' + sz + 'px "Bricolage Grotesque", sans-serif'; if (sz < 44) break; }
    c.fillText(nm, mid, 560);
    c.fillStyle = ORANGE; c.fillRect(mid - 260, 595, 520, 4);
    c.fillStyle = '#14211E'; c.font = '400 32px "Source Sans 3", sans-serif';
    c.fillText('por aprobar el examen de práctica del learning path', mid, 670);
    c.font = '600 40px "Source Sans 3", sans-serif'; c.fillStyle = BG;
    wrap(c, LP.code + ' · ' + LP.title, DW - 400).slice(0, 2).forEach((l, i) => c.fillText(l, mid, 730 + i * 50));
    c.font = '400 30px "Source Sans 3", sans-serif'; c.fillStyle = '#56665F';
    c.fillText('Resultado: ' + b.ok + '/' + b.n + ' · ' + b.pct + '%   ·   ' + fmt(b.date), mid, 860);
    // Sello con isotipo
    const sx = DW - 250, sy = DH - 260, R = 105;
    c.beginPath(); c.arc(sx, sy, R, 0, Math.PI * 2); c.fillStyle = '#FFFFFF'; c.fill();
    c.beginPath(); c.arc(sx, sy, R - 5, 0, Math.PI * 2); c.strokeStyle = ORANGE; c.lineWidth = 10; c.stroke();
    if (isoL) { const s2 = R * 1.85; c.drawImage(isoL, sx - s2 / 2 - 3, sy - s2 / 2 + 3, s2, s2); }
    // Pie
    c.textAlign = 'left'; c.fillStyle = ORANGE; c.font = '400 26px "JetBrains Mono", monospace'; c.fillText(SITE + '/' + LP.id, 130, DH - 150);
    c.fillStyle = '#56665F'; c.font = '400 22px "Source Sans 3", sans-serif';
    c.fillText('Examen autoevaluado en línea. Este diploma reconoce la práctica realizada y no constituye una certificación.', 130, DH - 112);
    c.textAlign = 'left';
  }

  // Llamado por lp.js cada vez que se corrige un modo
  window.XaboliBadge = {
    _draw: draw,
    _drawDiploma: drawDiploma,
    onGraded(mode, ok, n) {
      const host = document.getElementById('badge'); if (!host) return;
      const pct = Math.round(100 * ok / n);
      if (mode !== 'all') { host.hidden = true; return; }
      if (pct < LP.passMark) { host.hidden = true; return; }
      const prev = store.get(KEY);
      const keep = prev && prev.pct >= pct;
      const b = keep ? { ok: prev.ok, n: prev.n, pct: prev.pct, date: prev.date } : { ok, n, pct, date: new Date().toISOString() };
      b.name = currentName; save(b); render(b);
    },
    hide() { const host = document.getElementById('badge'); if (host) host.hidden = true; },
  };
})();
