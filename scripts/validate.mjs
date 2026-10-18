// Valida /data contra las reglas del catastro (ids únicos, relaciones existentes, URLs https, exámenes coherentes)
import { loadAll, validate } from './lib/data.mjs';
const d = loadAll();
const errors = validate(d);
if (errors.length) { console.error(`✗ ${errors.length} error(es):\n- ` + errors.join('\n- ')); process.exit(1); }
const q = d.paths.reduce((a, p) => a + (p.exam ? p.exam.questions.length : 0), 0);
console.log(`✓ Datos válidos: ${d.resources.length} recursos, ${d.relations.length} relaciones, ${d.universities.reduce((a, g) => a + g.items.length, 0)} recursos universitarios, ${d.paths.length} learning path(s), ${q} preguntas.`);
