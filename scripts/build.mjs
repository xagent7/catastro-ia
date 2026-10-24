// Construye el sitio estático en /dist a partir de /data, /src y site.config.json
import { mkdirSync, rmSync, writeFileSync, readFileSync, readdirSync, copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { ROOT, loadAll, validate, toClient, resolveLpResource } from './lib/data.mjs';

const d = loadAll();
const errors = validate(d);
if (errors.length) { console.error('Datos inválidos:\n- ' + errors.join('\n- ')); process.exit(1); }

const C = d.config;
const DIST = join(ROOT, 'dist');
const REPO_URL = `https://github.com/${C.github.repo}`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const src = p => readFileSync(join(ROOT, 'src', p), 'utf8');
const hash = s => createHash('sha256').update(s).digest('hex').slice(0, 10);
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const longDate = iso => { const [y, m, dd] = iso.split('-'); return `${+dd} de ${MONTHS[+m - 1]} de ${y}`; };

rmSync(DIST, { recursive: true, force: true });
const out = (p, content) => { const f = join(DIST, p); mkdirSync(join(f, '..'), { recursive: true }); writeFileSync(f, content); };

// ── Recursos estáticos con huella para caché
const assets = {};
for (const f of readdirSync(join(ROOT, 'src/assets'))) {
  const content = src('assets/' + f);
  out('assets/' + f, content);
  assets[f] = `/assets/${f}?v=${hash(content)}`;
}
mkdirSync(join(DIST, 'fonts'), { recursive: true });
for (const f of readdirSync(join(ROOT, 'src/fonts'))) copyFileSync(join(ROOT, 'src/fonts', f), join(DIST, 'fonts', f));
if (existsSync(join(ROOT, 'public'))) for (const f of readdirSync(join(ROOT, 'public'))) copyFileSync(join(ROOT, 'public', f), join(DIST, f));

// ── Datos públicos (abiertos) y datos de página
const client = toClient(d);
const byId = Object.fromEntries(d.resources.map(r => [r.id, r]));
const lpList = [...d.paths].sort((a, b) => b.published.localeCompare(a.published)).map(lp => ({
  code: lp.code, title: lp.title, summary: lp.summary, href: `/lp/${lp.slug}/`,
  modules: lp.modules.length, questions: lp.exam ? lp.exam.questions.length : 0, passMark: lp.passMark,
}));
const dataJs = (name, obj) => {
  const body = Object.entries(obj).map(([k, v]) => `const ${k}=${JSON.stringify(v)};`).join('\n') + '\n';
  out(`data/${name}.js`, body);
  return `/data/${name}.js?v=${hash(body)}`;
};
const catalogData = dataJs('catalog', { ...client, LPS: lpList });
for (const f of ['categories', 'resources', 'relations', 'universities', 'meta', 'changelog']) out(`data/${f}.json`, JSON.stringify(d[f], null, 1));

// ── Piezas comunes
const head = ({ title, description, path, css = [], jsonld = null, type = 'website' }) => {
  const url = C.siteUrl + path;
  return `<!doctype html>
<html lang="${C.language}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">
<meta name="author" content="${esc(C.cta.brand)}">
<meta property="og:type" content="${type}">
<meta property="og:locale" content="es_CL">
<meta property="og:site_name" content="${esc(C.siteName)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(C.siteUrl)}/og.png">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta name="theme-color" content="#F2F5F4" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0E1412" media="(prefers-color-scheme: dark)">
<link rel="preload" href="/fonts/source-sans-3-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${assets['base.css']}">
${css.map(f => `<link rel="stylesheet" href="${assets[f]}">`).join('\n')}
${C.turnstileSiteKey ? `<meta name="turnstile-sitekey" content="${esc(C.turnstileSiteKey)}">` : ''}
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>` : ''}
${C.cloudflareAnalyticsToken ? `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='${JSON.stringify({ token: C.cloudflareAnalyticsToken })}'></script>` : ''}
</head>
<body>
<a class="skip" href="#main">Saltar al contenido</a>
<div class="w">`;
};
const top = active => `<div class="top">
  <div class="byline"><b>${esc(C.author.name)}</b><span aria-hidden="true">·</span><span>${esc(C.author.title)}</span><span aria-hidden="true">·</span><a href="${esc(C.author.linkedin)}" target="_blank" rel="noopener">${esc(C.author.linkedin.replace(/^https:\/\/(www\.)?/, ''))}</a></div>
  <nav class="nav" aria-label="Principal">
    <a href="/"${active === 'home' ? ' aria-current="page"' : ''}>Catálogo</a>
    <a href="/#learning-paths"${active === 'lp' ? ' aria-current="page"' : ''}>Learning paths</a>
    <a href="${REPO_URL}" rel="noopener">GitHub</a>
    <a class="cta-link" href="${active === 'home' ? '' : '/'}#equipos">Para equipos</a>
  </nav>
</div>`;
const cta = page => `<section class="band" id="equipos" aria-labelledby="equipos-h">
  <div>
    <div class="kicker">Para equipos · ${esc(C.cta.brand)}</div>
    <h2 id="equipos-h">${esc(C.cta.headline)}</h2>
    <p>${esc(C.cta.body)}</p>
    <ul>
      <li>Diagnóstico de cómo tu equipo usa hoy los agentes de código.</li>
      <li>Bootstrap de repositorios y estándares compartidos: CLAUDE.md, skills, permisos y MCP.</li>
      <li>Learning paths con examen por rol, como los de este catastro.</li>
      <li>Desarrollo guiado por especificaciones, CI/CD agéntico y gobierno de agentes.</li>
    </ul>
    <p><a href="${esc(C.cta.brandUrl)}" rel="noopener">${esc(C.cta.brandUrl.replace(/^https:\/\//, ''))}</a></p>
  </div>
  <form class="form" data-lead="equipo" data-ok-msg="Gracias. Te responderé en un plazo de 2 días hábiles." novalidate>
    <label>Nombre<input type="text" name="name" required maxlength="120" autocomplete="name"></label>
    <label>Correo de trabajo<input type="email" name="email" required maxlength="160" autocomplete="email"></label>
    <label>Empresa<input type="text" name="company" required maxlength="120" autocomplete="organization"></label>
    <label>Cargo <span class="optional">(opcional)</span><input type="text" name="role" maxlength="120" autocomplete="organization-title"></label>
    <label>Tamaño del equipo de ingeniería<select name="team_size" required><option value="">Elige una opción</option><option>1–10</option><option>11–50</option><option>51–200</option><option>Más de 200</option></select></label>
    <label>Interés principal<select name="interest" required><option value="">Elige una opción</option><option>Adopción de Claude Code en el equipo</option><option>Learning paths y certificación interna</option><option>Desarrollo guiado por especificaciones y agentes</option><option>CI/CD agéntico y gobierno</option><option>Otro</option></select></label>
    <label class="full">Mensaje <span class="optional">(opcional)</span><textarea name="message" maxlength="2000" placeholder="Contexto, plazos o lo que quieras contar"></textarea></label>
    <label class="check full"><input type="checkbox" name="consent_contact" required><span>Acepto que ${esc(C.privacy.controller)} use estos datos para responder mi solicitud, según la <a href="/privacidad/">política de privacidad</a>.</span></label>
    <label class="check full"><input type="checkbox" name="consent_marketing"><span>Además, quiero recibir los próximos learning paths y novedades del catastro (opcional).</span></label>
    <div class="hp" aria-hidden="true"><label>No completar<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
    <input type="hidden" name="source" value="${esc(page)}">
    <div class="ts full"></div>
    <div class="full"><button class="btn" type="submit">${esc(C.cta.button)}</button></div>
    <p class="status full" role="status"></p>
  </form>
</section>`;
const foot = () => `<footer class="foot">
  <div>
    <p>Proyecto independiente. No está afiliado ni respaldado por Anthropic ni por los autores de los recursos listados; los nombres de productos y marcas pertenecen a sus dueños, y Claude es una marca de Anthropic.</p>
    <p>Contenido bajo licencia <a href="https://creativecommons.org/licenses/by/4.0/deed.es" rel="noopener license">CC BY 4.0</a>: puedes reutilizarlo citando «${esc(C.siteName)}». Código bajo licencia MIT. Datos abiertos en <a href="/data/resources.json">JSON</a>.</p>
  </div>
  <nav aria-label="Pie">
    <a href="${REPO_URL}" rel="noopener">Repositorio en GitHub</a>
    <a href="${REPO_URL}/issues/new?template=sugerir-recurso.yml" rel="noopener">Sugerir un recurso</a>
    <a href="${REPO_URL}/issues/new?template=enlace-roto.yml" rel="noopener">Reportar un enlace roto</a>
    <a href="/privacidad/">Política de privacidad</a>
    <a href="${esc(C.author.linkedin)}" rel="noopener">LinkedIn</a>
  </nav>
</footer>
</div>`;
const page = ({ meta, active, body, scripts = [] }) =>
  head(meta) + '\n' + top(active) + '\n' + body + '\n' + foot() + '\n' + scripts.map(s => `<script src="${s}" defer></script>`).join('\n') + '\n</body>\n</html>\n';
const fill = (tpl, map) => tpl.replace(/\{\{([A-Z_]+)\}\}/g, (m, k) => { if (!(k in map)) throw new Error('Token sin valor: ' + k); return map[k]; });
const common = { REPO_URL, BRANCH: C.github.branch };

// ── Página principal
const catNames = Object.fromEntries(d.categories.map(c => [c.id, c.name]));
const noscript = `<noscript><p class="lede">Activa JavaScript para filtrar y buscar. Listado completo:</p>${d.categories.map(c => {
  const items = d.resources.filter(r => r.category === c.id); if (!items.length) return '';
  return `<h2>${esc(c.name)}</h2><ul>${items.map(r => `<li><a href="${esc(r.url)}">${esc(r.name)}</a> — ${esc(r.description)}</li>`).join('')}</ul>`;
}).join('')}</noscript>`;
const latestLp = [...d.paths].sort((a, b) => b.published.localeCompare(a.published))[0];
const promo = latestLp ? `<p class="promo"><b>Nuevo: ${esc(latestLp.code)} · ${esc(latestLp.title)}.</b> <span>${latestLp.modules.length} módulos y examen de ${latestLp.exam ? latestLp.exam.questions.length : 0} preguntas.</span> <a href="/lp/${latestLp.slug}/">Abrir la ruta →</a></p>` : '';
const home = fill(src('pages/index.html'), { ...common, NOSCRIPT: noscript, PROMO: promo, CTA: cta('home') });
const homeDesc = `Academia gratuita de IA en español: learning paths con examen y un catastro de ${d.resources.length} repositorios, cursos y herramientas, con mapa de relaciones y recursos de universidades top 10. Se actualiza cada mes.`;
out('index.html', page({
  meta: { title: C.siteName, description: homeDesc, path: '/', css: ['catalog.css'],
    jsonld: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: C.siteName, description: homeDesc, inLanguage: 'es', url: C.siteUrl + '/',
      author: { '@type': 'Organization', name: C.cta.brand, url: C.cta.brandUrl }, dateModified: d.meta.updated,
      license: 'https://creativecommons.org/licenses/by/4.0/',
      mainEntity: { '@type': 'ItemList', numberOfItems: d.resources.length } } },
  active: 'home', body: home, scripts: [catalogData, assets['catalog.js'], assets['forms.js']],
}));

// ── Learning paths
const sitemap = [{ loc: '/', lastmod: d.meta.updated }];
for (const lp of d.paths) {
  const MODS = lp.modules.map(m => ({ t: m.title, lv: m.level, o: m.objective, p: m.practice, r: m.resources.map(r => resolveLpResource(r, byId)) }));
  const PHASES = lp.phases.map(p => ({ t: p.title, d: p.description, m: p.modules, r: p.resources.map(r => resolveLpResource(r, byId).slice(0, 2)) }));
  const Q = lp.exam ? lp.exam.questions.map(q => ({ m: q.module, lv: q.level, p: q.prompt, o: q.options, a: q.answer, e: q.explanation })) : [];
  const lpData = dataJs(lp.id, { LP: { id: lp.id, passMark: lp.passMark }, MODS, PHASES, Q });
  const body = fill(src('pages/lp.html'), { ...common, LP_EYEBROW: esc(lp.eyebrow), LP_TITLE: esc(lp.title), LP_LEDE: esc(lp.lede), LP_ID: esc(lp.id), LP_PASS: String(lp.passMark), LP_REVIEWED: longDate(lp.reviewed), CTA: cta(lp.id) });
  const path = `/lp/${lp.slug}/`;
  out(`lp/${lp.slug}/index.html`, page({
    meta: { title: `${lp.code} · ${lp.title} · ${C.siteName}`, description: `${lp.summary} ${lp.modules.length} módulos y examen interactivo de ${Q.length} preguntas.`, path, css: ['lp.css'],
      jsonld: { '@context': 'https://schema.org', '@type': 'Course', name: `${lp.code} · ${lp.title}`, description: lp.summary, inLanguage: 'es', url: C.siteUrl + path,
        provider: { '@type': 'Organization', name: C.cta.brand, url: C.cta.brandUrl }, isAccessibleForFree: true, educationalLevel: 'Básico a avanzado',
        datePublished: lp.published, dateModified: lp.reviewed, hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'online', courseWorkload: 'PT50H' } } },
    active: 'lp', body, scripts: [lpData, assets['lp.js'], assets['forms.js']],
  }));
  sitemap.push({ loc: path, lastmod: lp.reviewed });
}

// ── Privacidad y 404
const priv = fill(src('pages/privacidad.html'), { ...common, PRIV_VERSION: longDate(C.privacy.version), PRIV_CONTROLLER: esc(C.privacy.controller), PRIV_EMAIL: esc(C.privacy.contactEmail), PRIV_RETENTION: String(C.privacy.retentionMonths) });
out('privacidad/index.html', page({ meta: { title: `Política de privacidad · ${C.siteName}`, description: 'Qué datos recoge este sitio, para qué, por cuánto tiempo y cómo ejercer tus derechos.', path: '/privacidad/' }, active: '', body: priv }));
sitemap.push({ loc: '/privacidad/', lastmod: C.privacy.version });
out('404.html', page({ meta: { title: `Página no encontrada · ${C.siteName}`, description: 'La página no existe.', path: '/404' }, active: '', body: src('pages/404.html') }));

// ── SEO y cabeceras
out('robots.txt', `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${C.siteUrl}/sitemap.xml\n`);
out('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap.map(s => `  <url><loc>${C.siteUrl}${s.loc}</loc><lastmod>${s.lastmod}</lastmod></url>`).join('\n')}\n</urlset>\n`);
const csp = [
  "default-src 'self'",
  `script-src 'self' https://challenges.cloudflare.com https://static.cloudflareinsights.com`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data:",
  "connect-src 'self' https://cloudflareinsights.com",
  'frame-src https://challenges.cloudflare.com',
  "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'", "object-src 'none'", 'upgrade-insecure-requests',
].join('; ');
out('_headers', `/*
  Content-Security-Policy: ${csp}
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
  X-Frame-Options: DENY
  Strict-Transport-Security: max-age=31536000; includeSubDomains

/assets/*
  Cache-Control: public, max-age=31536000, immutable
/fonts/*
  Cache-Control: public, max-age=31536000, immutable
/data/*
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=3600
`);
out('_redirects', d.paths.map(lp => `/${lp.id} /lp/${lp.slug}/ 301`).join('\n') + '\n');

console.log(`Sitio generado en dist/: ${d.resources.length} recursos, ${d.relations.length} relaciones, ${d.paths.length} learning path(s).`);
