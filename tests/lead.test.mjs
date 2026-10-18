// Pruebas de la función /api/lead con una base D1 simulada
import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost, onRequest } from '../functions/api/lead.js';

function mockDB({ recent = 0 } = {}) {
  const rows = [];
  return {
    rows,
    prepare(sql) {
      return {
        bind(...args) {
          return {
            first: async () => ({ n: recent }),
            run: async () => { const cols = sql.match(/\(([^)]+)\) VALUES/)[1].split(','); rows.push(Object.fromEntries(cols.map((c, i) => [c, args[i]]))); return { success: true }; },
          };
        },
      };
    },
  };
}
const req = (body, headers = {}) => new Request('https://catastro.xaboli.cl/api/lead', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: 'https://catastro.xaboli.cl', 'CF-Connecting-IP': '203.0.113.7', ...headers },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});
const team = { kind: 'equipo', name: 'Ana', email: 'ana@empresa.cl', company: 'Empresa', team_size: '11–50', interest: 'Otro', consent_contact: true, consent_marketing: false };
const call = async (body, env = {}, headers) => { const r = await onRequestPost({ request: req(body, headers), env, waitUntil: () => {} }); return { status: r.status, body: await r.json() }; };

test('guarda un contacto de equipo válido', async () => {
  const DB = mockDB();
  const r = await call(team, { DB });
  assert.equal(r.status, 200); assert.equal(r.body.ok, true);
  assert.equal(DB.rows.length, 1);
  assert.equal(DB.rows[0].email, 'ana@empresa.cl');
  assert.equal(DB.rows[0].consent_contact, 1);
  assert.match(DB.rows[0].ip_hash, /^[0-9a-f]{32}$/);
  assert.ok(!Object.values(DB.rows[0]).includes('203.0.113.7'), 'no guarda la IP en claro');
});
test('exige consentimiento de contacto', async () => {
  const r = await call({ ...team, consent_contact: false }, { DB: mockDB() });
  assert.equal(r.status, 400);
});
test('novedades exige consentimiento de marketing y descarta el puntaje si no se comparte', async () => {
  const DB = mockDB();
  assert.equal((await call({ kind: 'novedades', email: 'x@y.cl', consent_marketing: false }, { DB })).status, 400);
  const r = await call({ kind: 'novedades', email: 'x@y.cl', consent_marketing: true, share_score: false, score: '80/100', lp: 'lp8' }, { DB });
  assert.equal(r.status, 200); assert.equal(DB.rows[0].score, '');
  await call({ kind: 'novedades', email: 'z@y.cl', consent_marketing: true, share_score: true, score: '80/100', lp: 'lp8', lp_mode: 'all' }, { DB });
  assert.equal(DB.rows[1].score, '80/100');
});
test('rechaza correo inválido, otro origen, método y JSON roto', async () => {
  assert.equal((await call({ ...team, email: 'nope' }, { DB: mockDB() })).status, 400);
  assert.equal((await call(team, { DB: mockDB() }, { Origin: 'https://malo.example' })).status, 403);
  assert.equal((await call('{roto', { DB: mockDB() })).status, 400);
  assert.equal(onRequest().status, 405);
});
test('honeypot responde OK sin guardar', async () => {
  const DB = mockDB();
  const r = await call({ ...team, website: 'spam' }, { DB });
  assert.equal(r.status, 200); assert.equal(DB.rows.length, 0);
});
test('limita envíos por IP y responde 503 sin base', async () => {
  assert.equal((await call(team, { DB: mockDB({ recent: 5 }) })).status, 429);
  assert.equal((await call(team, {})).status, 503);
});
test('con TURNSTILE_SECRET exige token', async () => {
  const r = await call(team, { DB: mockDB(), TURNSTILE_SECRET: 's' });
  assert.equal(r.status, 403);
});
