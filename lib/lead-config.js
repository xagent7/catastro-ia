// Valores que necesita la función /api/lead. Deben coincidir con site.config.json:
// npm run validate falla si quedan desalineados. (Se evita importar JSON porque el
// empaquetador de Cloudflare Pages no admite la sintaxis "import ... with { type: 'json' }".)
export const CONSENT_VERSION = '2026-10-24';
export const CONTACT_EMAIL = 'contacto@xaboli.cl';
