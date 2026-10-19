// Genera README.md desde /data. Uso: node scripts/readme.mjs [--check]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, loadAll, validate } from './lib/data.mjs';

const d = loadAll();
const errors = validate(d);
if (errors.length) { console.error('Datos inválidos; ejecuta npm run validate'); process.exit(1); }
const C = d.config;
const REPO = `https://github.com/${C.github.repo}`;
const cell = s => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const anchor = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 -]/g, '').trim().replace(/\s+/g, '-');
const short = n => n.split(' (')[0];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const longDate = iso => { const [y, m, dd] = iso.split('-'); return `${+dd} de ${MONTHS[+m - 1]} de ${y}`; };
const byId = Object.fromEntries(d.resources.map(r => [r.id, r]));
const relCount = id => d.relations.filter(e => e.from === id || e.to === id).length;
const uniCount = d.universities.reduce((a, g) => a + g.items.length, 0);
const gh = d.resources.filter(r => /github\.com/.test(r.url)).length;

let md = `<!-- Archivo generado por scripts/readme.mjs a partir de /data. No lo edites a mano: cambia los JSON y ejecuta npm run readme. -->

# ${C.siteName}

**Rutas de aprendizaje de IA con examen y un catastro abierto, en español y vivo, de repositorios, cursos y herramientas**, clasificados por tema, con las relaciones entre ellos y recursos gratuitos de las 10 mejores universidades del mundo.

🌐 **Sitio:** [${C.siteUrl.replace('https://', '')}](${C.siteUrl}) · 📈 **Actualizado:** ${longDate(d.meta.updated)} · 🔁 **Próxima revisión:** ${d.meta.nextReview}

[![Licencia del contenido: CC BY 4.0](https://img.shields.io/badge/contenido-CC%20BY%204.0-blue)](LICENSE-CONTENT.md) [![Licencia del código: MIT](https://img.shields.io/badge/c%C3%B3digo-MIT-green)](LICENSE) [![Validación](${REPO}/actions/workflows/ci.yml/badge.svg)](${REPO}/actions/workflows/ci.yml) [![Enlaces](${REPO}/actions/workflows/enlaces.yml/badge.svg)](${REPO}/actions/workflows/enlaces.yml)

| ${d.resources.length} recursos | ${gh} repositorios de GitHub | ${d.categories.length} categorías | ${d.relations.length} relaciones | ${uniCount} recursos universitarios | ${d.paths.length} learning path${d.paths.length === 1 ? '' : 's'} |
|:-:|:-:|:-:|:-:|:-:|:-:|

## Qué lo hace distinto

- **En español y para equipos de LATAM.** Cada ficha explica qué es el recurso y *para qué sirve en una ruta de aprendizaje*, no solo un enlace.
- **Relaciones entre recursos.** Qué se complementa, qué es alternativa de qué y qué conviene aprender antes. En el sitio se exploran como [mapa interactivo](${C.siteUrl}/#mapa).
- **Honesto sobre lo que no se verificó.** Las fichas marcadas *según el proyecto* repiten lo que declaran sus autores; las que tienen riesgos (seguridad, términos de uso, afirmaciones no verificadas) llevan advertencia.
- **Solo recursos directos.** Repositorios, cursos, libros, herramientas y documentación oficial. Sin artículos ni noticias.
- **Vivo.** Se revisa cada mes, con verificación automática de enlaces y un registro público de cambios.
- **Learning paths con examen.** Rutas por objetivo y nivel, con una práctica por módulo y un examen interactivo.

## Learning paths

| Ruta | Módulos | Examen | |
|---|:-:|:-:|---|
${d.paths.map(lp => `| **${lp.code} · ${cell(lp.title)}**<br>${cell(lp.summary)} | ${lp.modules.length} | ${lp.exam ? lp.exam.questions.length + ' preguntas' : '—'} | [Abrir](${C.siteUrl}/lp/${lp.slug}/) |`).join('\n')}

Se publica una ruta nueva cada mes. Para recibir el aviso, deja tu correo al final de cualquier examen en el sitio.

## Contenido

${d.categories.filter(c => d.resources.some(r => r.category === c.id)).map(c => `- [${c.name}](#${anchor(c.name)}) (${d.resources.filter(r => r.category === c.id).length})`).join('\n')}
- [Universidades top 10 (QS 2026)](#universidades-top-10-qs-2026) (${uniCount})
- [Novedades](#novedades)

> **Leyenda.** ✅ descripción contrastada · 🔎 según el proyecto (lo que declaran sus autores) · ⚠️ tiene advertencia · 🆕 agregado en los últimos ${d.meta.freshDays} días

`;
const fresh = iso => iso && (Date.parse(d.meta.updated) - Date.parse(iso)) / 864e5 <= d.meta.freshDays;
for (const c of d.categories) {
  const items = d.resources.filter(r => r.category === c.id).sort((a, b) => relCount(b.id) - relCount(a.id) || a.name.localeCompare(b.name));
  if (!items.length) continue;
  md += `## ${c.name}\n\n${c.description}\n\n| Recurso | Tipo · nivel | Para qué sirve |\n|---|---|---|\n`;
  md += items.map(r => {
    const flags = (r.confidence === 'contrastada' ? '✅' : '🔎') + (r.warning ? ' ⚠️' : '') + (fresh(r.added) ? ' 🆕' : '');
    const rel = d.relations.filter(e => e.from === r.id || e.to === r.id).slice(0, 4).map(e => short(byId[e.from === r.id ? e.to : e.from].name).split('/').pop());
    return `| ${flags} [**${cell(r.name)}**](${r.url})<br><sub>${cell(r.description)}</sub> | ${cell(r.type)} · ${cell(r.level)} | ${cell(r.use)}${r.warning ? `<br>⚠️ *${cell(r.warning)}*` : ''}${rel.length ? `<br><sub>Se relaciona con: ${cell(rel.join(', '))}</sub>` : ''} |`;
  }).join('\n') + '\n\n';
}
md += `## Universidades top 10 (QS 2026)\n\nRecursos gratuitos de IA que publican las diez primeras universidades del QS World University Rankings 2026. Algunos cursos son gratis para aprender, pero cobran el certificado.\n\n| # | Universidad | Recurso | Tipo · nivel |\n|:-:|---|---|---|\n`;
for (const g of d.universities) for (const it of g.items) md += `| ${g.rank} | ${cell(g.university)} | [**${cell(it.name)}**](${it.url})${it.repo ? ` · [repo](${it.repo})` : ''}<br><sub>${cell(it.description)}</sub> | ${cell(it.type)} · ${cell(it.level)} |\n`;
md += `\n## Novedades\n\n${d.changelog.slice(0, 3).map(l => `**${longDate(l.date)}.** ${l.summary}`).join('\n\n')}\n\nEl detalle está en la pestaña [Novedades](${C.siteUrl}/#novedades) del sitio y en el [historial de commits](${REPO}/commits/${C.github.branch}).\n\n`;
md += `## Cómo contribuir

- **Sugerir un recurso:** abre un [issue con la plantilla](${REPO}/issues/new?template=sugerir-recurso.yml).
- **Reportar un enlace roto o un error en un examen:** usa las plantillas de [enlace roto](${REPO}/issues/new?template=enlace-roto.yml) o [error en examen](${REPO}/issues/new?template=error-en-examen.yml).
- **Proponer cambios directos:** edita los archivos de \`data/\` y abre un pull request. Lee [CONTRIBUTING.md](CONTRIBUTING.md).

## Usar los datos

Los datos están en [\`data/\`](data/) y se publican como JSON abierto en [${C.siteUrl.replace('https://', '')}/data/resources.json](${C.siteUrl}/data/resources.json). Puedes reutilizarlos citando la fuente (CC BY 4.0).

## Autor

**${C.author.name}** · ${C.author.title} · [LinkedIn](${C.author.linkedin})

¿Tu equipo quiere adoptar Claude y los agentes de código en todo el ciclo de desarrollo? [Conversemos](${C.siteUrl}/#equipos).

---

<sub>Proyecto independiente. No está afiliado ni respaldado por Anthropic ni por los autores de los recursos listados; los nombres de productos y marcas pertenecen a sus dueños, y Claude es una marca de Anthropic. Contenido bajo [CC BY 4.0](LICENSE-CONTENT.md); código bajo [MIT](LICENSE).</sub>
`;

const path = join(ROOT, 'README.md');
if (process.argv.includes('--check')) {
  const cur = existsSync(path) ? readFileSync(path, 'utf8') : '';
  if (cur !== md) { console.error('README.md está desactualizado. Ejecuta: npm run readme'); process.exit(1); }
  console.log('✓ README.md al día');
} else {
  writeFileSync(path, md);
  console.log(`README.md generado (${md.length} caracteres)`);
}
