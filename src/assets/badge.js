// Insignia de práctica Xäboli: se ofrece al aprobar el examen completo de un learning path.
// Todo ocurre en el navegador: la imagen se dibuja en un canvas y nada se envía a un servidor.
'use strict';
(function () {
  const W = 1200, H = 1200;
  const SITE = 'academia.xaboli.cl';
  const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  const KEY = 'badge-' + LP.id;
  const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const fmt = iso => { const d = new Date(iso); return d.getDate() + ' de ' + MONTHS[d.getMonth()] + ' de ' + d.getFullYear(); };
  const shareUrl = () => 'https://' + SITE + '/' + LP.id + '?utm_source=linkedin&utm_medium=insignia&utm_campaign=' + LP.id;

  function wrap(ctx, text, maxW) {
    const words = text.split(' '); const lines = []; let line = '';
    for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
    if (line) lines.push(line); return lines;
  }

  async function draw(canvas, b) {
    try { await Promise.all(['700 64px "Bricolage Grotesque"', '400 30px "Source Sans 3"', '600 30px "Source Sans 3"', '400 26px "JetBrains Mono"'].map(f => document.fonts.load(f))); } catch (e) {}
    const ctx = canvas.getContext('2d');
    canvas.width = W; canvas.height = H;
    // Fondo
    const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#14211E'); g.addColorStop(1, '#0B1311');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // Red de nodos (motivo del catastro)
    const N = [[930, 170, 34, '#43C9A3'], [1090, 120, 22, '#FF7EAA'], [1010, 330, 28, '#79A6FF'], [1120, 300, 40, '#E2BD4A'], [880, 380, 16, '#FF9A63'], [1060, 470, 22, '#B595FF']];
    const L = [[0, 1], [0, 2], [1, 3], [2, 3], [2, 4], [3, 5], [2, 5], [0, 4]];
    ctx.strokeStyle = 'rgba(142,168,255,.45)'; ctx.lineWidth = 3;
    L.forEach(([a, c]) => { ctx.beginPath(); ctx.moveTo(N[a][0], N[a][1]); ctx.lineTo(N[c][0], N[c][1]); ctx.stroke(); });
    N.forEach(([x, y, r, col]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill(); });
    // Marca
    ctx.fillStyle = '#9BABA5'; ctx.font = '400 26px "JetBrains Mono", monospace';
    ctx.fillText('ACADEMIA DE IA XÄBOLI', 90, 140);
    // Sello
    const cx = 260, cy = 400, R = 150;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fillStyle = '#8EA8FF'; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, R - 14, 0, Math.PI * 2); ctx.strokeStyle = '#14211E'; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = '#14211E'; ctx.textAlign = 'center';
    ctx.font = '700 92px "Bricolage Grotesque", sans-serif'; ctx.fillText(LP.code, cx, cy + 18);
    ctx.font = '600 24px "Source Sans 3", sans-serif'; ctx.fillText('APROBADO', cx, cy + 64);
    ctx.textAlign = 'left';
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
    ctx.fillStyle = '#8EA8FF'; ctx.font = '400 28px "JetBrains Mono", monospace'; ctx.fillText(SITE + '/' + LP.id, 90, H - 92);
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
          <label class="badge-name">Tu nombre en la insignia <span class="optional">(opcional, no se envía a ningún lado)</span><input type="text" id="badge-name" maxlength="48" autocomplete="name"></label>
          <label class="badge-post">Texto para LinkedIn<textarea id="badge-text" rows="9"></textarea></label>
          <div class="badge-actions">
            <button class="btn" type="button" id="badge-dl">1. Descargar imagen</button>
            <button class="btn ghost" type="button" id="badge-copy">2. Copiar texto</button>
            <a class="btn ghost" id="badge-li" target="_blank" rel="noopener">3. Publicar en LinkedIn ↗</a>
          </div>
          <p class="fine" id="badge-msg" role="status">LinkedIn no permite adjuntar la imagen automáticamente: al abrir la publicación, pega el texto y adjunta la imagen descargada.</p>
        </div>
      </div>`;
    const canvas = host.querySelector('#badge-canvas'), nameI = host.querySelector('#badge-name'), txt = host.querySelector('#badge-text'), msg = host.querySelector('#badge-msg'), li = host.querySelector('#badge-li');
    nameI.value = b.name || '';
    txt.value = postText(b);
    const sync = () => { li.href = 'https://www.linkedin.com/feed/?shareActive=true&text=' + encodeURIComponent(txt.value); };
    sync(); txt.addEventListener('input', sync);
    draw(canvas, b);
    let t; nameI.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { b.name = nameI.value.trim(); store.set(KEY, b); draw(canvas, b); }, 250); });
    host.querySelector('#badge-dl').addEventListener('click', () => {
      canvas.toBlob(blob => { if (!blob) return; const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'insignia-xaboli-' + LP.id + '.png'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); msg.textContent = 'Imagen descargada. Ahora copia el texto y publícalo.'; }, 'image/png');
    });
    host.querySelector('#badge-copy').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(txt.value); msg.textContent = 'Texto copiado. Ábrelo en LinkedIn, pégalo y adjunta la imagen.'; }
      catch (e) { txt.select(); msg.textContent = 'Selecciona el texto y cópialo con Ctrl+C o Cmd+C.'; }
    });
    li.addEventListener('click', () => { try { navigator.clipboard.writeText(txt.value); } catch (e) {} });
  }

  // Llamado por lp.js cada vez que se corrige un modo
  window.XaboliBadge = {
    onGraded(mode, ok, n) {
      const host = document.getElementById('badge'); if (!host) return;
      const pct = Math.round(100 * ok / n);
      if (mode !== 'all') { host.hidden = true; return; }
      if (pct < LP.passMark) { host.hidden = true; return; }
      const prev = store.get(KEY);
      const b = prev && prev.pct >= pct ? prev : { ok, n, pct, date: new Date().toISOString(), name: prev ? prev.name : '' };
      store.set(KEY, b); render(b);
    },
    hide() { const host = document.getElementById('badge'); if (host) host.hidden = true; },
  };
})();
