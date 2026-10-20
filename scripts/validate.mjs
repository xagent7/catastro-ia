// Valida /data contra las reglas del catastro (ids únicos, relaciones existentes, URLs https, exámenes coherentes)
import { loadAll, validate } from './lib/data.mjs';
const d = loadAll();
const errors = validate(d);
const lc = await import('../lib/lead-config.js');
if (lc.CONSENT_VERSION !== d.config.privacy.version) errors.push(`lib/lead-config.js: CONSENT_VERSION (${lc.CONSENT_VERSION}) no coincide con privacy.version de site.config.json (${d.config.privacy.version})`);
if (lc.CONTACT_EMAIL !== d.config.privacy.contactEmail) errors.push('lib/lead-config.js: CONTACT_EMAIL no coincide con privacy.contactEmail de site.config.json');
if (errors.length) { console.error(`✗ ${errors.length} error(es):\n- ` + errors.join('\n- ')); process.exit(1); }
const q = d.paths.reduce((a, p) => a + (p.exam ? p.exam.questions.length : 0), 0);
console.log(`✓ Datos válidos: ${d.resources.length} recursos, ${d.relations.length} relaciones, ${d.universities.reduce((a, g) => a + g.items.length, 0)} recursos universitarios, ${d.paths.length} learning path(s), ${q} preguntas.`);
