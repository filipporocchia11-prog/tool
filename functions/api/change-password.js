import { requireSession, verifyPassword, pbkdf2Hash, json } from '../_utils.js';

export async function onRequestPost({ request, env }) {
  const session = await requireSession(request, env);
  if (!session) return json({ error: 'Brak sesji.' }, 401);

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'Nieprawidłowe dane.' }, 400); }
  const { currentPassword, newPassword } = body || {};
  if (!newPassword || newPassword.length < 6) return json({ error: 'Nowe hasło musi mieć min. 6 znaków.' }, 400);

  const acc = await env.DB.prepare(`SELECT password_hash, salt FROM accounts WHERE username = ?`).bind(session.username).first();
  if (!acc) return json({ error: 'Nie znaleziono konta.' }, 404);

  const ok = await verifyPassword(currentPassword || '', acc.password_hash, acc.salt);
  if (!ok) return json({ error: 'Obecne hasło jest nieprawidłowe.' }, 401);

  const { hash, salt } = await pbkdf2Hash(newPassword);
  await env.DB.prepare(`UPDATE accounts SET password_hash = ?, salt = ? WHERE username = ?`)
    .bind(hash, salt, session.username).run();

  return json({ ok: true });
}
