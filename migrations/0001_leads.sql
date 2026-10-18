-- Contactos recibidos desde los formularios del sitio (Cloudflare D1 / SQLite)
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  kind TEXT NOT NULL CHECK (kind IN ('equipo','novedades')),
  name TEXT,
  email TEXT NOT NULL,
  company TEXT,
  role TEXT,
  team_size TEXT,
  interest TEXT,
  message TEXT,
  lp TEXT,
  lp_mode TEXT,
  score TEXT,
  consent_contact INTEGER NOT NULL DEFAULT 0,
  consent_marketing INTEGER NOT NULL DEFAULT 0,
  consent_version TEXT NOT NULL,
  page TEXT,
  landing TEXT,
  source TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  ip_hash TEXT,
  country TEXT,
  user_agent TEXT
);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_ip ON leads(ip_hash, created_at);
