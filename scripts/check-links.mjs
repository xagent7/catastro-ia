// Verifica todos los enlaces del catastro sin modificar datos.
// Clasifica cada URL como OK, MOVIDO, ARCHIVADO, ROTO o NO_VERIFICABLE y escribe link-report.md y link-report.json.
// Nunca elimina nada: un enlace solo se considera ROTO si falla de forma definitiva en dos intentos separados.
// Uso: node scripts/check-links.mjs [--only=https://...]   (GITHUB_TOKEN opcional para consultar la API de GitHub)
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, loadAll } from './lib/data.mjs';

const d = loadAll();
const only = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7);
const TIMEOUT = 20000, CONCURRENCY = 6, RETRY_DELAY = 8000;
const UA = 'Mozilla/5.0 (compatible; catastro-ia-linkcheck/1.0; +https://github.com/' + d.config.github.repo + ')';
const GH_TOKEN = process.env.GITHUB_TOKEN || '';

// Reúne URLs con su origen
const targets = new Map();
const add = (url, where) => { if (!url) return; if (!targets.has(url)) targets.set(url, []); targets.get(url).push(where); };
d.resources.forEach(r => add(r.url, `recurso ${r.id}`));
d.universities.forEach(g => g.items.forEach(it => { add(it.url, `universidad ${g.university}: ${it.name}`); add(it.repo, `universidad ${g.university}: ${it.name} (repo)`); }));
d.paths.forEach(lp => [...lp.modules.flatMap(m => m.resources), ...lp.phases.flatMap(p => p.resources)].forEach(r => { if (!r.ref) add(r.url, `${lp.code}`); }));

const sleep = ms => new Promise(r => setTimeout(r, ms));
const ghRepo = u => { const m = u.match(/^https:\/\/github\.com\/([^/#?]+)\/([^/#?]+)\/?$/); return m ? [m[1], m[2].replace(/\.git$/, '')] : null; };

async function fetchOnce(url, method) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), TIMEOUT);
  try {
    let cur = url; const hops = [];
    for (let i = 0; i < 6; i++) {
      const r = await fetch(cur, { method, redirect: 'manual', signal: ctl.signal, headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,*/*;q=0.8' } });
      if (r.status >= 300 && r.status < 400 && r.headers.get('location')) {
        hops.push(r.status); cur = new URL(r.headers.get('location'), cur).toString(); continue;
      }
      try { await r.body?.cancel(); } catch {}
      return { status: r.status, final: cur, hops };
    }
    return { status: 0, final: cur, hops, error: 'demasiadas redirecciones' };
  } catch (e) {
    return { status: 0, error: e.name === 'AbortError' ? 'tiempo de espera agotado' : (e.cause && e.cause.code) || e.message };
  } finally { clearTimeout(t); }
}

async function probe(url) {
  let r = await fetchOnce(url, 'HEAD');
  if ([0, 403, 405, 404, 429, 501].includes(r.status) || r.status >= 500) {
    const g = await fetchOnce(url, 'GET');
    if (g.status) r = g; else r = r.status ? r : g;
  }
  return r;
}

const permanent = hops => hops.some(h => h === 301 || h === 308);
const sameish = (a, b) => { try { const x = new URL(a), y = new URL(b); const n = u => (u.host.replace(/^www\./, '') + u.pathname.replace(/\/+$/, '')).toLowerCase(); return n(x) === n(y); } catch { return a === b; } };

async function checkGithub(url) {
  const rp = ghRepo(url); if (!rp || !GH_TOKEN) return null;
  try {
    const r = await fetch(`https://api.github.com/repos/${rp[0]}/${rp[1]}`, { redirect: 'follow', headers: { Authorization: `Bearer ${GH_TOKEN}`, 'User-Agent': UA, Accept: 'application/vnd.github+json' } });
    if (r.status === 404) return { state: 'ROTO', detail: 'GitHub responde 404 (repositorio eliminado o privado)' };
    if (!r.ok) return null;
    const j = await r.json();
    const canonical = j.html_url;
    if (canonical && canonical.toLowerCase() !== url.replace(/\/+$/, '').toLowerCase()) return { state: 'MOVIDO', detail: `El repositorio ahora es ${canonical}`, final: canonical };
    if (j.archived) return { state: 'ARCHIVADO', detail: `Archivado; último push ${String(j.pushed_at).slice(0, 10)}` };
    return { state: 'OK', detail: `★ ${j.stargazers_count} · último push ${String(j.pushed_at).slice(0, 10)}` };
  } catch { return null; }
}

async function classify(url) {
  const g = await checkGithub(url);
  if (g && g.state !== 'ROTO') return { url, ...g };
  let r = await probe(url);
  const definitive = s => s === 404 || s === 410;
  const dns = e => /ENOTFOUND|EAI_AGAIN|ERR_NAME/.test(e || '');
  if (definitive(r.status) || dns(r.error) || (g && g.state === 'ROTO')) {
    await sleep(RETRY_DELAY);
    const r2 = await probe(url);
    if (definitive(r2.status) || (dns(r.error) && dns(r2.error))) return { url, state: 'ROTO', detail: r2.status ? `HTTP ${r2.status} en dos intentos` : `${r2.error} en dos intentos` };
    r = r2;
  }
  if (r.status >= 200 && r.status < 300) {
    if (r.hops.length && permanent(r.hops) && !sameish(url, r.final)) return { url, state: 'MOVIDO', detail: `Redirección permanente a ${r.final}`, final: r.final };
    return { url, state: 'OK', detail: `HTTP ${r.status}` };
  }
  return { url, state: 'NO_VERIFICABLE', detail: r.status ? `HTTP ${r.status} (el sitio puede bloquear verificaciones automáticas)` : r.error };
}

const list = [...targets.keys()].filter(u => !only || u === only);
const results = []; let i = 0;
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (i < list.length) { const u = list[i++]; const res = await classify(u); res.where = targets.get(u); results.push(res); process.stdout.write(res.state === 'OK' ? '.' : res.state[0]); }
}));
process.stdout.write('\n');

const ORDER = ['ROTO', 'MOVIDO', 'ARCHIVADO', 'NO_VERIFICABLE', 'OK'];
const NOTE = {
  ROTO: 'Falló de forma definitiva dos veces. Revisa a mano antes de quitarlo: busca la nueva ubicación o reemplázalo.',
  MOVIDO: 'Responde con redirección permanente o el repositorio cambió de nombre. Actualiza la URL en data/.',
  ARCHIVADO: 'El repositorio está archivado: sigue disponible, pero sin mantención. Evalúa agregar una advertencia.',
  NO_VERIFICABLE: 'No se pudo verificar (bloqueo de bots, límite de solicitudes o caída temporal). No implica que esté roto.',
};
results.sort((a, b) => ORDER.indexOf(a.state) - ORDER.indexOf(b.state) || a.url.localeCompare(b.url));
const count = Object.fromEntries(ORDER.map(s => [s, results.filter(r => r.state === s).length]));
const today = new Date().toISOString().slice(0, 10);
let md = `# Verificación de enlaces · ${today}\n\n${results.length} URLs revisadas: ${ORDER.map(s => `**${s.replace('_', ' ')}** ${count[s]}`).join(' · ')}\n\nEste informe no modifica datos. Cada cambio se aplica a mano o con la actualización mensual, en un pull request revisable.\n`;
for (const s of ORDER.slice(0, 4)) {
  const rs = results.filter(r => r.state === s); if (!rs.length) continue;
  md += `\n## ${s.replace('_', ' ')} (${rs.length})\n\n${NOTE[s]}\n\n| URL | Detalle | Dónde se usa |\n|---|---|---|\n` + rs.map(r => `| ${r.url} | ${r.detail || ''} | ${r.where.join('; ')} |`).join('\n') + '\n';
}
writeFileSync(join(ROOT, 'link-report.md'), md);
writeFileSync(join(ROOT, 'link-report.json'), JSON.stringify({ date: today, count, results }, null, 1));
console.log(`Informe en link-report.md · ${ORDER.map(s => `${s}: ${count[s]}`).join(' · ')}`);
if (process.env.GITHUB_OUTPUT) {
  const { appendFileSync } = await import('node:fs');
  appendFileSync(process.env.GITHUB_OUTPUT, `actionable=${count.ROTO + count.MOVIDO + count.ARCHIVADO}\n`);
}
