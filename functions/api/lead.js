// Cloudflare Pages Function: POST /api/lead
// Guarda en D1 los contactos de los formularios «Para equipos» y «Próximo learning path».
// Bindings y variables (Pages → Settings):
//   DB               (D1, obligatorio)  base con la tabla de migrations/0001_leads.sql
//   TURNSTILE_SECRET (secreto, recomendado) verifica el token de Cloudflare Turnstile
//   IP_SALT          (secreto, recomendado) sal para el hash de la IP
//   NOTIFY_WEBHOOK   (secreto, opcional) URL compatible con Slack/Discord/Teams para avisar de cada contacto
import config from '../../site.config.json' with { type: 'json' };

const MAX_BODY = 12_000;
const RATE_LIMIT_PER_HOUR = 5;
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]{1,64}@[^\s@<>()[\]\\,;:"]{1,190}\.[a-z]{2,24}$/i;

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const pick = (v, allowed) => (allowed.includes(v) ? v : '');

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyTurnstile(secret, token, ip) {
  if (!token) return false;
  const form = new FormData();
  form.append('secret', secret);
  form.append('response', token);
  if (ip) form.append('remoteip', ip);
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
    const j = await r.json();
    return j.success === true;
  } catch {
    return false;
  }
}

export async function onRequestPost({ request, env, waitUntil }) {
  // Solo peticiones del mismo origen
  const origin = request.headers.get('Origin');
  const host = new URL(request.url).host;
  if (origin && new URL(origin).host !== host) return json(403, { ok: false, error: 'Origen no permitido.' });
  if (!(request.headers.get('Content-Type') || '').includes('application/json')) return json(415, { ok: false, error: 'Formato no soportado.' });
  if (!env.DB) return json(503, { ok: false, error: `El formulario aún no está activo. Escribe a ${config.privacy.contactEmail}.` });

  const raw = await request.text();
  if (raw.length > MAX_BODY) return json(413, { ok: false, error: 'El mensaje es demasiado largo.' });
  let b;
  try { b = JSON.parse(raw); } catch { return json(400, { ok: false, error: 'Datos inválidos.' }); }
  if (!b || typeof b !== 'object') return json(400, { ok: false, error: 'Datos inválidos.' });

  // Trampa para bots: el campo oculto debe venir vacío. Se responde OK para no dar pistas.
  if (str(b.website, 200)) return json(200, { ok: true });

  const kind = pick(b.kind, ['equipo', 'novedades']);
  if (!kind) return json(400, { ok: false, error: 'Formulario desconocido.' });
  const email = str(b.email, 160).toLowerCase();
  if (!EMAIL_RE.test(email)) return json(400, { ok: false, error: 'Revisa el correo.' });
  const consentContact = b.consent_contact === true;
  const consentMarketing = b.consent_marketing === true;
  const name = str(b.name, 120);
  const company = str(b.company, 120);

  if (kind === 'equipo') {
    if (!name || !company) return json(400, { ok: false, error: 'Completa nombre y empresa.' });
    if (!consentContact) return json(400, { ok: false, error: 'Necesitamos tu autorización para responderte.' });
  } else if (!consentMarketing) {
    return json(400, { ok: false, error: 'Marca la casilla para recibir los avisos.' });
  }

  const ip = request.headers.get('CF-Connecting-IP') || '';
  if (env.TURNSTILE_SECRET && !(await verifyTurnstile(env.TURNSTILE_SECRET, str(b.turnstile, 2048), ip))) {
    return json(403, { ok: false, error: 'No pudimos verificar que no eres un bot. Recarga la página e inténtalo de nuevo.' });
  }

  const ipHash = ip ? (await sha256((env.IP_SALT || 'catastro-ia') + '|' + ip)).slice(0, 32) : '';
  if (ipHash) {
    const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM leads WHERE ip_hash = ?1 AND created_at > strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 hour')").bind(ipHash).first();
    if (row && row.n >= RATE_LIMIT_PER_HOUR) return json(429, { ok: false, error: 'Recibimos varios envíos desde tu conexión. Inténtalo más tarde.' });
  }

  const shareScore = kind === 'novedades' && b.share_score === true;
  const rec = {
    kind, name, email, company,
    role: str(b.role, 120),
    team_size: pick(b.team_size, ['1–10', '11–50', '51–200', 'Más de 200']),
    interest: str(b.interest, 120),
    message: str(b.message, 2000),
    lp: str(b.lp, 40),
    lp_mode: shareScore ? str(b.lp_mode, 10) : '',
    score: shareScore ? str(b.score, 12) : '',
    consent_contact: consentContact ? 1 : 0,
    consent_marketing: consentMarketing ? 1 : 0,
    consent_version: config.privacy.version,
    page: str(b.page, 200), landing: str(b.landing, 200), source: str(b.source, 40),
    utm_source: str(b.utm_source, 80), utm_medium: str(b.utm_medium, 80), utm_campaign: str(b.utm_campaign, 80),
    ip_hash: ipHash,
    country: (request.cf && request.cf.country) || '',
    user_agent: str(request.headers.get('User-Agent') || '', 300),
  };
  const cols = Object.keys(rec);
  await env.DB.prepare(`INSERT INTO leads (${cols.join(',')}) VALUES (${cols.map((_, i) => '?' + (i + 1)).join(',')})`)
    .bind(...cols.map(k => rec[k])).run();

  if (env.NOTIFY_WEBHOOK) {
    const text = kind === 'equipo'
      ? `Nuevo contacto para equipos: ${name} (${company}${rec.role ? ', ' + rec.role : ''}) · ${rec.team_size} · ${rec.interest} · ${email}`
      : `Nueva suscripción a learning paths${rec.score ? ` (resultado ${rec.score} en ${rec.lp})` : ''} · ${email}`;
    const p = fetch(env.NOTIFY_WEBHOOK, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, content: text }) }).catch(() => {});
    if (waitUntil) waitUntil(p);
  }
  return json(200, { ok: true });
}

export const onRequest = () => json(405, { ok: false, error: 'Método no permitido.' });
