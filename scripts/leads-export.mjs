// Exporta los contactos de D1 a leads.csv (no se versiona). Requiere `wrangler login`.
// Uso: npm run leads:export [-- --since=2026-10-01]
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const since = (process.argv.find(a => a.startsWith('--since=')) || '').slice(8);
if (since && !/^\d{4}-\d{2}-\d{2}$/.test(since)) { console.error('--since debe ser AAAA-MM-DD'); process.exit(1); }
const sql = `SELECT id, created_at, kind, name, email, company, role, team_size, interest, message, lp, lp_mode, score, consent_contact, consent_marketing, consent_version, page, source, utm_source, utm_medium, utm_campaign, country FROM leads${since ? ` WHERE created_at >= '${since}'` : ''} ORDER BY id`;
const out = execFileSync('npx', ['wrangler', 'd1', 'execute', 'catastro-leads', '--remote', '--json', '--command', sql], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const rows = JSON.parse(out)[0].results;
if (!rows.length) { console.log('Sin contactos.'); process.exit(0); }
const cols = Object.keys(rows[0]);
const q = v => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
writeFileSync('leads.csv', '﻿' + [cols.join(','), ...rows.map(r => cols.map(c => q(r[c])).join(','))].join('\n') + '\n');
console.log(`leads.csv: ${rows.length} contactos`);
