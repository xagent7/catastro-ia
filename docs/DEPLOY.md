# Puesta en marcha: GitHub + Cloudflare Pages

Arquitectura: el repositorio en GitHub es la fuente de verdad; Cloudflare Pages construye y publica el sitio en cada push a `main` y crea una vista previa por cada pull request. Los formularios se guardan en Cloudflare D1 mediante una Pages Function (`functions/api/lead.js`).

```
GitHub (data/*.json) ──push──▶ Cloudflare Pages (npm run build → dist/) ──▶ catastro.xaboli.cl
                                        └── /api/lead (Function) ──▶ D1 catastro-leads
```

Tiempo estimado: 30–40 minutos la primera vez.

## 1. GitHub

1. Crea la cuenta u organización `xaboli` (si el nombre no está disponible, usa otro y cámbialo en `site.config.json` → `github.repo`).
2. Crea un repositorio **público** vacío llamado `catastro-ia` (sin README ni licencia: ya vienen en este proyecto).
3. Sube el código:

```bash
cd catastro-ia
git remote add origin https://github.com/xaboli/catastro-ia.git
git push -u origin main
```

4. En **Settings → General**, agrega descripción, el sitio `https://catastro.xaboli.cl` y estos temas: `ai`, `claude`, `claude-code`, `llm`, `agents`, `awesome-list`, `spanish`, `learning-path`.
5. En **Settings → Branches**, protege `main` y exige que pase el check **Validación**.

## 2. Cloudflare Pages

1. En el panel de Cloudflare: **Workers & Pages → Create → Pages → Connect to Git**. (Si el asistente te ofrece crear un Worker, elige la opción de Pages.)
2. Autoriza GitHub, elige `xaboli/catastro-ia` y configura:
   - **Production branch:** `main`
   - **Framework preset:** None
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Variable de entorno:** `NODE_VERSION` = `22`
3. Guarda y despliega. El sitio queda en `catastro-ia.pages.dev`.
4. **Custom domains → Set up a domain →** `catastro.xaboli.cl`. Como `xaboli.cl` ya está en Cloudflare, el registro DNS se crea solo.

## 3. Base de datos de contactos (D1)

1. **Storage & Databases → D1 → Create database** → nombre `catastro-leads`.
2. Abre la base → **Console**, pega el contenido de `migrations/0001_leads.sql` y ejecútalo.
3. En el proyecto de Pages: **Settings → Bindings → Add → D1 database**, nombre de variable `DB`, base `catastro-leads`, para **Production**. Para **Preview** crea otra base (`catastro-leads-preview`) con la misma migración, así las pruebas no se mezclan con contactos reales.
4. **Deployments → Retry deployment** para que el binding se aplique.

Mientras `DB` no esté configurada, el formulario responde con un mensaje que invita a escribir al correo de contacto: el sitio funciona igual.

## 4. Protección contra bots (Turnstile)

1. **Turnstile → Add widget**: nombre `catastro`, hostnames `catastro.xaboli.cl` y `catastro-ia.pages.dev`, modo **Managed**.
2. Copia la **Site key** en `site.config.json` → `turnstileSiteKey` y haz commit.
3. En Pages: **Settings → Variables and Secrets → Add** (tipo *Secret*):
   - `TURNSTILE_SECRET` = la Secret key del widget.
   - `IP_SALT` = un valor aleatorio largo (por ejemplo, el resultado de `openssl rand -hex 24`).
   - `NOTIFY_WEBHOOK` (opcional) = URL de un webhook entrante de Slack, Discord o Teams para recibir un aviso por cada contacto.

Sin `TURNSTILE_SECRET` el formulario funciona igual, protegido solo por el campo trampa y el límite de 5 envíos por hora por conexión.

## 5. Medición sin cookies

En el proyecto de Pages: **Metrics → Web Analytics → Enable**. Cloudflare inyecta el script automáticamente; no hace falta tocar el código. (Alternativa: poner el token en `site.config.json` → `cloudflareAnalyticsToken`.)

Usa enlaces con UTM en tus publicaciones para saber de dónde vienen los contactos, por ejemplo:
`https://catastro.xaboli.cl/lp/sdlc-ia/?utm_source=linkedin&utm_medium=post&utm_campaign=lp8`. La campaña de llegada queda guardada junto a cada contacto.

## 6. Correo de contacto

La política de privacidad publica `contacto@xaboli.cl` (configurable en `site.config.json` → `privacy.contactEmail`). Créalo gratis con **Email → Email Routing** en la zona `xaboli.cl`, reenviando a tu correo personal. Debe existir antes de publicar: es el canal para ejercer derechos de datos personales.

## 7. Ajustes de la zona

- **Speed → Optimization → Rocket Loader:** desactivado (reordena scripts y choca con la política de seguridad de contenido).
- La política de seguridad (`Content-Security-Policy`) y el resto de cabeceras se generan en `dist/_headers`. Si agregas un servicio externo, permítelo en `scripts/build.mjs`.

## 8. Verificación final

- [ ] `https://catastro.xaboli.cl` carga, con candado y sin errores en la consola.
- [ ] `https://catastro.xaboli.cl/lp/sdlc-ia/` permite rendir el examen y, al corregir, muestra el formulario de aviso.
- [ ] Un envío de prueba del formulario «Para equipos» aparece en D1 (`SELECT * FROM leads ORDER BY id DESC LIMIT 5;` en la consola).
- [ ] `https://catastro.xaboli.cl/privacidad/` muestra el correo correcto.
- [ ] En GitHub, **Actions → Enlaces → Run workflow** termina sin errores.
- [ ] Revisa cómo se ve el enlace al compartirlo (LinkedIn Post Inspector).

## Operación de contactos

```bash
npx wrangler login
npm run leads:export                      # todos los contactos → leads.csv (no se versiona)
npm run leads:export -- --since=2026-11-01
```

Consultas útiles en la consola de D1:

```sql
-- Ejercicio de derechos: ver y eliminar los datos de una persona
SELECT * FROM leads WHERE email = 'persona@dominio.cl';
DELETE FROM leads WHERE email = 'persona@dominio.cl';

-- Retención: eliminar contactos con más de 24 meses
DELETE FROM leads WHERE created_at < strftime('%Y-%m-%dT%H:%M:%fZ','now','-24 months');

-- Embudo por campaña
SELECT utm_source, utm_campaign, kind, COUNT(*) n FROM leads GROUP BY 1,2,3 ORDER BY n DESC;
```

Quienes marcaron solo el formulario de equipos (`consent_marketing = 0`) no deben recibir correos de novedades.
