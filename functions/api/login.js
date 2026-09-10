import { verifyPassword, sessionCookie, json, shortUA } from '../_utils.js';

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'Nieprawidłowe dane.' }, 400); }
  const { username, password } = body || {};
  if (!username || !password) return json({ error: 'Podaj login i hasło.' }, 400);

  const acc = await env.DB.prepare(
    `SELECT username, password_hash, salt, role FROM accounts WHERE username = ?`
  ).bind(username).first();
  if (!acc) return json({ error: 'Nieprawidłowy użytkownik lub hasło.' }, 401);

  const ok = await verifyPassword(password, acc.password_hash, acc.salt);
  if (!ok) return json({ error: 'Nieprawidłowy użytkownik lub hasło.' }, 401);

  const sessionId = crypto.randomUUID();
  const now = Date.now();
  const ua = shortUA(request);

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO sessions (session_id, username, created_at, last_seen, user_agent) VALUES (?, ?, ?, ?, ?)`
    ).bind(sessionId, username, now, now, ua),
    env.DB.prepare(`UPDATE accounts SET last_login = ? WHERE username = ?`).bind(now, username),
    env.DB.prepare(
      `INSERT INTO login_logs (username, role, ts, user_agent) VALUES (?, ?, ?, ?)`
    ).bind(username, acc.role, now, ua)
  ]);

  return json({ username, role: acc.role }, 200, { 'Set-Cookie': sessionCookie(sessionId) });
}
