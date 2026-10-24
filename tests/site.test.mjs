// Pruebas de humo sobre el sitio generado (requiere npm run build)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';

const DIST = new URL('../dist/', import.meta.url);
const skip = !existsSync(new URL('index.html', DIST)) && 'ejecuta npm run build primero';

function load(page) {
  // Inserta en línea los scripts locales (en el navegador comparten el ámbito global, igual que aquí)
  const html = readFileSync(new URL(page, DIST), 'utf8').replace(/<script src="(\/[^"?]+)[^"]*" defer><\/script>/g,
    (m, src) => `<script>${readFileSync(new URL('.' + src, DIST), 'utf8')}</script>`);
  const errors = [];
  const vc = new VirtualConsole(); vc.on('jsdomError', e => { if (!/Not implemented/.test(e.message)) errors.push(e.message); });
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://academia.xaboli.cl/', virtualConsole: vc });
  return { doc: dom.window.document, win: dom.window, errors };
}

test('portada: catálogo, learning paths, universidades y formulario', { skip }, () => {
  const { doc, errors } = load('index.html');
  assert.deepEqual(errors, []);
  const R = JSON.parse(readFileSync(new URL('data/resources.json', DIST), 'utf8'));
  assert.equal(doc.querySelectorAll('#catalog .card').length, R.length);
  assert.ok(doc.querySelectorAll('.lpcard').length >= 1);
  assert.ok(doc.querySelectorAll('.ucard').length >= 10);
  assert.ok(doc.querySelector('form[data-lead="equipo"] [name=consent_contact][required]') || doc.querySelector('#equipos .gform'), 'formulario propio o de Google');
  assert.ok(doc.querySelector('link[rel=canonical]').href.startsWith('https://'));
  assert.ok(doc.querySelector('meta[property="og:image"]'));
  assert.match(readFileSync(new URL('index.html', DIST), 'utf8'), /<noscript>.*<li><a href="https:/s, 'listado sin JavaScript para buscadores');
});

test('learning paths: módulos, fases y examen completo', { skip }, () => {
  for (const lp of JSON.parse(readFileSync(new URL('data/catalog.js', DIST), 'utf8').match(/const LPS=(.*);/)[1])) {
    const { doc, errors } = load('.' + lp.href + 'index.html');
    assert.deepEqual(errors, [], lp.href);
    assert.equal(doc.querySelectorAll('.modlist li').length, lp.modules);
    assert.equal(doc.querySelectorAll('#qs > li').length, lp.questions, 'modo completo muestra todas las preguntas');
    assert.ok(doc.querySelector('form[data-lead="novedades"] [name=consent_marketing][required]') || doc.querySelector('#notify a[href*="google"], #notify a[href*="forms.gle"]'));
  }
});

test('cabeceras de seguridad y SEO', { skip }, () => {
  const h = readFileSync(new URL('_headers', DIST), 'utf8');
  assert.match(h, /Content-Security-Policy: default-src 'self'/);
  assert.doesNotMatch(h, /script-src[^;]*'unsafe-inline'/);
  assert.match(readFileSync(new URL('sitemap.xml', DIST), 'utf8'), /<loc>https:\/\/[^<]+\/lp\//);
  assert.match(readFileSync(new URL('robots.txt', DIST), 'utf8'), /Sitemap:/);
});
