import { requireSession, pbkdf2Hash, json, ACTIVE_WINDOW_MS } from '../_utils.js';

export async function onRequestGet({ request, env }) {
  const session = await requireSession(request, env);
  if (!session) return json({ error: 'Brak sesji.' }, 401);
  if (session.role !== 'admin') return json({ error: 'Brak uprawnień.' }, 403);

  const since = Date.now() - ACTIVE_WINDOW_MS;
  const { results } = await env.DB.prepare(
    `SELECT a.username, a.role, a.created_at, a.last_login,
            (SELECT COUNT(*) FROM sessions s WHERE s.username = a.username AND s.last_seen > ?) as active_count
     FROM accounts a ORDER BY a.username`
  ).bind(since).all();
  return json({ accounts: results });
}

export async function onRequestPost({ request, env }) {
  const session = await requireSession(request, env);
  if (!session) return json({ error: 'Brak sesji.' }, 401);
  if (session.role !== 'admin') return json({ error: 'Brak uprawnień.' }, 403);

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'Nieprawidłowe dane.' }, 400); }
  const { username, password, role } = body || {};
  if (!username || !/^[a-zA-Z0-9_.\-]{3,32}$/.test(username)) {
    return json({ error: 'Nieprawidłowa nazwa użytkownika (3-32 znaki: litery/cyfry/_ . -).' }, 400);
  }
  if (!password || password.length < 6) return json({ error: 'Hasło musi mieć min. 6 znaków.' }, 400);
  if (!['user', 'admin'].includes(role)) return json({ error: 'Nieprawidłowa rola.' }, 400);

  const existing = await env.DB.prepare(`SELECT username FROM accounts WHERE username = ?`).bind(username).first();
  if (existing) return json({ error: 'Takie konto już istnieje.' }, 409);

  const { hash, salt } = await pbkdf2Hash(password);
  await env.DB.prepare(
    `INSERT INTO accounts (username, password_hash, salt, role, created_at, created_by, last_login) VALUES (?, ?, ?, ?, ?, ?, NULL)`
  ).bind(username, hash, salt, role, Date.now(), session.username).run();

  return json({ ok: true });
}
