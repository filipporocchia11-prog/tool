-- Moon Shop -- schemat bazy D1
-- Uruchom: wrangler d1 execute moonshop-db --remote --file=schema.sql

CREATE TABLE IF NOT EXISTS accounts (
  username TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at INTEGER NOT NULL,
  created_by TEXT,
  last_login INTEGER
);

CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  user_agent TEXT
);

CREATE TABLE IF NOT EXISTS login_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  role TEXT,
  ts INTEGER NOT NULL,
  user_agent TEXT
);
CREATE TABLE IF NOT EXISTS saved_bots (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  encrypted_token TEXT NOT NULL,
  iv TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS styles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS config_maker (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  data TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- Konto startowe: flajp / Fili2011 (rola: admin)
-- Zmien haslo od razu po pierwszym zalogowaniu przez panel "Konta i logi" (usun to konto i zaloz nowe, albo
-- edytuj haslo bezposrednio w bazie -- w tej wersji nie ma jeszcze endpointu "zmien wlasne haslo",
-- wiec najprosciej: zaloguj sie jako flajp, utworz swoje docelowe konto admina, usun flajp).
INSERT OR IGNORE INTO accounts (username, password_hash, salt, role, created_at, created_by, last_login)
VALUES ('flajp', '1e7c232c764da14e38fc41bb99f8c0d4fa89397945550b2ae5df24a662331b54', 'e8ab04658312c3d55b2b794a19b937cc', 'admin', strftime('%s','now') * 1000, 'system', NULL);

CREATE TABLE IF NOT EXISTS fonts (
  name TEXT PRIMARY KEY,
  base64 TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
