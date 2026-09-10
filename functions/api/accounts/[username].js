import { requireSession, countAdmins, json } from '../../_utils.js';

export async function onRequestPatch({ request, env, params }) {
  const session = await requireSession(request, env);
  if (!session) return json({ error: 'Brak sesji.' }, 401);
  if (session.role !== 'admin') return json({ error: 'Brak uprawnień.' }, 403);

  const username = params.username;
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'Nieprawidłowe dane.' }, 400); }
  const { role } = body || {};
  if (!['user', 'admin'].includes(role)) return json({ error: 'Nieprawidłowa rola.' }, 400);

  const acc = await env.DB.prepare(`SELECT role FROM accounts WHERE username = ?`).bind(username).first();
  if (!acc) return json({ error: 'Nie znaleziono konta.' }, 404);

  if (acc.role === 'admin' && role !== 'admin') {
    const admins = await countAdmins(env);
    if (admins <= 1) return json({ error: 'Nie można odebrać roli ostatniemu administratorowi.' }, 400);
    if (username === session.username) return json({ error: 'Nie możesz odebrać sobie roli admina.' }, 400);
  }

  await env.DB.prepare(`UPDATE accounts SET role = ? WHERE username = ?`).bind(role, username).run();
  return json({ ok: true });
}

export async function onRequestDelete({ request, env, params }) {
  const session = await requireSession(request, env);
  if (!session) return json({ error: 'Brak sesji.' }, 401);
  if (session.role !== 'admin') return json({ error: 'Brak uprawnień.' }, 403);

  const username = params.username;
  if (username === session.username) return json({ error: 'Nie możesz usunąć własnego konta.' }, 400);

  const acc = await env.DB.prepare(`SELECT role FROM accounts WHERE username = ?`).bind(username).first();
  if (!acc) return json({ error: 'Nie znaleziono konta.' }, 404);
  if (acc.role === 'admin') {
    const admins = await countAdmins(env);
    if (admins <= 1) return json({ error: 'Nie można usunąć ostatniego administratora.' }, 400);
  }

  await env.DB.batch([
    env.DB.prepare(`DELETE FROM accounts WHERE username = ?`).bind(username),
    env.DB.prepare(`DELETE FROM sessions WHERE username = ?`).bind(username)
  ]);
  return json({ ok: true });
}
