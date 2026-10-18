// Carga y valida los datos del catastro. Fuente única de verdad: /data/*.json
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = p => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));

export const CONFIDENCE = { contrastada: 'k', segun_proyecto: 'r' };
export const REL_TYPES = ['comp', 'alt', 'pre', 'fam'];
export const LEVELS = { B: 'Básico', I: 'Intermedio', A: 'Avanzado' };

export function loadAll() {
  const config = read('site.config.json');
  const categories = read('data/categories.json');
  const resources = read('data/resources.json');
  const relations = read('data/relations.json');
  const universities = read('data/universities.json');
  const meta = read('data/meta.json');
  const changelog = read('data/changelog.json');
  const paths = readdirSync(join(ROOT, 'data/learning-paths')).filter(f => f.endsWith('.json')).sort()
    .map(f => {
      const lp = read('data/learning-paths/' + f);
      let exam = null;
      try { exam = read('data/exams/' + f); } catch { /* ruta sin examen */ }
      return { ...lp, file: f, exam };
    });
  return { config, categories, resources, relations, universities, meta, changelog, paths };
}

const isDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const isUrl = s => { try { const u = new URL(s); return u.protocol === 'https:'; } catch { return false; } };

export function validate(d) {
  const errors = [];
  const err = (where, msg) => errors.push(`${where}: ${msg}`);
  const cats = new Set();
  d.categories.forEach((c, i) => {
    if (!c.id || !c.name || !c.description) err(`categories[${i}]`, 'faltan id, name o description');
    if (cats.has(c.id)) err(`categories[${i}]`, `id duplicado "${c.id}"`);
    cats.add(c.id);
  });
  const ids = new Set(); const urls = new Map();
  d.resources.forEach((r, i) => {
    const w = `resources[${i}] (${r.id || '?'})`;
    for (const k of ['id', 'name', 'url', 'category', 'type', 'level', 'confidence', 'description', 'use']) if (!r[k]) err(w, `falta "${k}"`);
    if (r.id && !/^[a-z0-9_]+$/.test(r.id)) err(w, 'el id solo admite minúsculas, números y _');
    if (ids.has(r.id)) err(w, 'id duplicado');
    ids.add(r.id);
    if (!cats.has(r.category)) err(w, `categoría inexistente "${r.category}"`);
    if (!(r.confidence in CONFIDENCE)) err(w, `confidence debe ser ${Object.keys(CONFIDENCE).join(' o ')}`);
    if (r.url && !isUrl(r.url)) err(w, 'la URL debe ser https válida');
    if (r.url) { const key = r.url.replace(/\/+$/, '').toLowerCase(); if (urls.has(key)) err(w, `URL repetida con ${urls.get(key)}`); urls.set(key, r.id); }
    for (const k of ['added', 'updated']) if (r[k] && !isDate(r[k])) err(w, `${k} debe tener formato AAAA-MM-DD`);
    if (r.updated && !r.updateNote) err(w, 'updated requiere updateNote');
    if (r.description && r.description.length > 700) err(w, 'description supera 700 caracteres');
  });
  const seen = new Set();
  d.relations.forEach((e, i) => {
    const w = `relations[${i}] (${e.from}→${e.to})`;
    if (!ids.has(e.from)) err(w, `from inexistente "${e.from}"`);
    if (!ids.has(e.to)) err(w, `to inexistente "${e.to}"`);
    if (e.from === e.to) err(w, 'relación consigo mismo');
    if (!REL_TYPES.includes(e.type)) err(w, `type debe ser ${REL_TYPES.join(', ')}`);
    if (!e.label) err(w, 'falta label');
    const k = [e.from, e.to].sort().join('|');
    if (seen.has(k)) err(w, 'relación duplicada');
    seen.add(k);
  });
  d.universities.forEach((g, i) => {
    const w = `universities[${i}] (${g.university})`;
    if (!Number.isInteger(g.rank) || !g.university || !g.country) err(w, 'faltan rank, university o country');
    (g.items || []).forEach((it, j) => {
      const wi = `${w}.items[${j}]`;
      for (const k of ['name', 'url', 'type', 'level', 'confidence', 'description']) if (!it[k]) err(wi, `falta "${k}"`);
      if (!isUrl(it.url)) err(wi, 'URL inválida');
      if (it.repo && !isUrl(it.repo)) err(wi, 'repo inválido');
      if (!(it.confidence in CONFIDENCE)) err(wi, 'confidence inválida');
      (it.relations || []).forEach(r => { if (!ids.has(r.to)) err(wi, `relación a recurso inexistente "${r.to}"`); if (!REL_TYPES.includes(r.type)) err(wi, 'type inválido'); });
    });
  });
  if (!isDate(d.meta.updated)) err('meta', 'updated inválido');
  d.changelog.forEach((l, i) => { if (!isDate(l.date) || !l.summary || !Array.isArray(l.items)) err(`changelog[${i}]`, 'faltan date, summary o items'); });
  const lpIds = new Set();
  d.paths.forEach(lp => {
    const w = `learning-paths/${lp.file}`;
    for (const k of ['id', 'slug', 'code', 'title', 'summary', 'lede', 'eyebrow', 'passMark', 'published', 'reviewed']) if (lp[k] == null) err(w, `falta "${k}"`);
    if (lpIds.has(lp.id)) err(w, 'id duplicado'); lpIds.add(lp.id);
    if (!/^[a-z0-9-]+$/.test(lp.slug || '')) err(w, 'slug inválido');
    const checkRes = (arr, where) => arr.forEach((r, k) => {
      if (r.ref) { if (!ids.has(r.ref)) err(`${w} ${where}[${k}]`, `ref a recurso inexistente "${r.ref}"`); }
      else if (!r.name || !isUrl(r.url)) err(`${w} ${where}[${k}]`, 'requiere ref, o name + url https');
    });
    (lp.modules || []).forEach((m, i) => {
      if (!m.title || !(m.level in LEVELS) || !m.objective || !m.practice) err(`${w} modules[${i}]`, 'faltan title, level (B/I/A), objective o practice');
      checkRes(m.resources || [], `modules[${i}].resources`);
    });
    (lp.phases || []).forEach((p, i) => {
      (p.modules || []).forEach(n => { if (n < 1 || n > lp.modules.length) err(`${w} phases[${i}]`, `módulo ${n} no existe`); });
      checkRes(p.resources || [], `phases[${i}].resources`);
    });
    if (lp.exam) {
      lp.exam.questions.forEach((q, i) => {
        const wq = `exams/${lp.file} questions[${i}]`;
        if (!q.prompt || !q.explanation) err(wq, 'faltan prompt o explanation');
        if (!Array.isArray(q.options) || q.options.length !== 4) err(wq, 'debe tener 4 opciones');
        if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) err(wq, 'answer debe ser 0–3');
        if (q.module < 1 || q.module > lp.modules.length) err(wq, `módulo ${q.module} no existe`);
        if (!(q.level in LEVELS)) err(wq, 'level inválido');
        if (new Set(q.options).size !== q.options.length) err(wq, 'opciones repetidas');
      });
    }
  });
  return errors;
}

// Formato compacto que consumen las páginas (claves cortas)
export function toClient(d) {
  const res = d.resources.map(r => {
    const o = { id: r.id, n: r.name, u: r.url, c: r.category, t: r.type, lv: r.level, conf: CONFIDENCE[r.confidence], d: r.description, uso: r.use };
    if (r.warning) o.w = r.warning; if (r.added) o.nw = r.added; if (r.updated) { o.up = r.updated; o.upn = r.updateNote; }
    return o;
  });
  const CATS = Object.fromEntries(d.categories.map(c => [c.id, { n: c.name, d: c.description }]));
  const E = d.relations.map(e => [e.from, e.to, e.type, e.label]);
  const U = d.universities.map(g => ({ rk: g.rank, uni: g.university, pais: g.country, items: g.items.map(it => {
    const o = { n: it.name, u: it.url, t: it.type, lv: it.level, conf: CONFIDENCE[it.confidence], d: it.description, rel: (it.relations || []).map(r => [r.to, r.type, r.label]) };
    if (it.repo) o.repo = it.repo; if (it.warning) o.w = it.warning; if (it.added) o.nw = it.added; return o;
  }) }));
  const META = { updated: d.meta.updated, next: d.meta.nextReview, days: d.meta.freshDays };
  const TY = { agregado: 'add', actualizado: 'upd', eliminado: 'del' };
  const LOG = d.changelog.map(l => ({ d: l.date, s: l.summary, i: l.items.map(x => [TY[x.change], x.name, x.id || null, x.note || '']) }));
  return { CATS, R: res, E, U, META, LOG };
}

export function resolveLpResource(r, byId) {
  if (r.ref) { const x = byId[r.ref]; return [x.name.split(' (')[0], x.url, false]; }
  return [r.name, r.url, !!r.official];
}
