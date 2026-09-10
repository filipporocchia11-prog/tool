-- Moon Shop -- biblioteka zasobow (foldery + pliki)
-- Uruchom po schema.sql: wrangler d1 execute moonshop-db --remote --file=schema_assets.sql

CREATE TABLE IF NOT EXISTS asset_folders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id TEXT,
  created_by TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  folder_id TEXT,
  name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  r2_key TEXT NOT NULL,
  created_by TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_assets_folder ON assets(folder_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent ON asset_folders(parent_id);
