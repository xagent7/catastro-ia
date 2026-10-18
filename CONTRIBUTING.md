# Cómo contribuir

Gracias por ayudar a mantener el catastro. Todo el contenido vive en `data/` como JSON; el sitio y el README se generan desde ahí.

## Criterios de inclusión

- **Solo recursos directos:** repositorios, cursos, libros, herramientas y documentación oficial. No se aceptan artículos, noticias ni posts.
- **Gratuitos** o con una versión gratuita útil. Si el certificado o parte del contenido es pagado, se dice en la descripción.
- **Relacionados:** cada recurso nuevo debe relacionarse con al menos otro del catálogo.
- **Honestos:** si la descripción repite lo que dicen los autores sin verificarlo, usa `"confidence": "segun_proyecto"`. Si hay riesgos (seguridad, términos de uso, afirmaciones no verificadas), agrega `warning`.
- En español neutro, sin promesas que el recurso no cumple.

## Agregar un recurso

1. Agrega una entrada en `data/resources.json`:

```json
{
  "id": "nombre_corto",
  "name": "organizacion/proyecto",
  "url": "https://github.com/organizacion/proyecto",
  "category": "harness",
  "type": "Repo · skills",
  "level": "Intermedio",
  "confidence": "segun_proyecto",
  "description": "Qué es, en dos o tres frases.",
  "use": "Para qué sirve en una ruta de aprendizaje.",
  "added": "2026-11-01"
}
```

   - `id`: minúsculas, números y `_`; único.
   - `category`: uno de los `id` de `data/categories.json`.
   - `confidence`: `contrastada` o `segun_proyecto`.
   - `added` / `updated` (con `updateNote`): fechas `AAAA-MM-DD`; activan las etiquetas NUEVO y ACTUALIZADO durante `freshDays` días.

2. Agrega al menos una relación en `data/relations.json` (`type`: `comp` se complementa, `alt` alternativa, `pre` prerrequisito, `fam` misma familia).
3. Registra el cambio en `data/changelog.json`.
4. Ejecuta:

```bash
npm ci
npm run validate   # revisa ids, relaciones, URLs y exámenes
npm run readme     # regenera README.md
npm run build      # genera el sitio en dist/
```

5. Abre un pull request. Cloudflare Pages publica una vista previa del sitio en el PR.

## Corregir un examen

Las preguntas están en `data/exams/<ruta>.json`. Cada pregunta tiene 4 opciones, `answer` (0–3) y una `explanation` que debería citar la fuente cuando se trata de una función de un producto. Cuida que la respuesta correcta no sea siempre la más larga.

## Eliminar o cambiar un enlace

Nunca se elimina un recurso por una sola falla. La verificación mensual distingue enlaces ROTOS (dos fallas definitivas), MOVIDOS, ARCHIVADOS y NO VERIFICABLES; solo los primeros tres requieren acción, y siempre en un PR.
