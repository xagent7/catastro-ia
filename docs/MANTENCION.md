# Mantención mensual

## Ciclo

1. **Día 1, automático:** el workflow **Enlaces** verifica todas las URLs y, si hay enlaces ROTOS, MOVIDOS o ARCHIVADOS, abre un issue `Enlaces para revisar · AAAA-MM` con el informe. No modifica datos.
2. **Actualización del mes** (a mano o con una tarea programada de Claude), siempre en una rama y un pull request:
   - Corregir las URLs movidas y resolver los enlaces rotos según el issue.
   - Agregar recursos nuevos (`added`) y marcar los cambiados (`updated` + `updateNote`).
   - Registrar todo en `data/changelog.json` (una entrada por mes, con `agregado`, `actualizado` o `eliminado`).
   - Actualizar `data/meta.json` (`updated` y `nextReview`).
   - Ejecutar `npm run validate && npm run readme && npm run build`.
3. **Revisión:** Cloudflare Pages publica una vista previa del PR. Si se ve bien, merge a `main` y el sitio se actualiza solo.

## Instrucción sugerida para la tarea programada

> Clona `xagent7/catastro-ia`, crea la rama `actualizacion/AAAA-MM`, lee el último issue con la etiqueta `enlaces` y aplica sus correcciones. Busca recursos nuevos para las categorías de `data/categories.json` siguiendo `CONTRIBUTING.md` (solo recursos directos, gratuitos, con al menos una relación). Registra los cambios en `data/changelog.json`, actualiza `data/meta.json`, ejecuta `npm run validate`, `npm run readme` y `npm run build`, y abre un pull request con el resumen. No elimines un recurso por una sola falla y no hagas merge.

## Publicar un learning path nuevo

1. Crea `data/learning-paths/<slug>.json` con la misma estructura que `lp8-sdlc-ia.json`. Los recursos del catálogo se referencian con `{"ref": "<id>"}`; la documentación externa, con `{"name", "url", "official": true}`.
2. Crea `data/exams/<slug>.json` con las preguntas (4 opciones, `answer` 0–3, `explanation`).
3. Agrega la ruta al menú de `.github/ISSUE_TEMPLATE/error-en-examen.yml`.
4. `npm run validate && npm run readme && npm run build`. La página queda en `/lp/<slug>/`, aparece en la pestaña Learning paths, en el aviso de portada (la última ruta) y en el sitemap. `/<id>` redirige a la ruta (por ejemplo, `/lp8`).
5. Avisa a los suscriptores: `npm run leads:export` y filtra `consent_marketing = 1`.
