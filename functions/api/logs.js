import { requireSession, json } from '../_utils.js';

export async function onRequestGet({ request, env }) {
  const session = await requireSession(request, env);
  if (!session) return json({ error: 'Brak sesji.' }, 401);
  if (session.role !== 'admin') return json({ error: 'Brak uprawnień.' }, 403);

  const { results } = await env.DB.prepare(
    `SELECT username, role, ts, user_agent FROM login_logs ORDER BY ts DESC LIMIT 200`
  ).all();
  return json({ logs: results });
}

export async function onRequestDelete({ request, env }) {
  const session = await requireSession(request, env);
  if (!session) return json({ error: 'Brak sesji.' }, 401);
  if (session.role !== 'admin') return json({ error: 'Brak uprawnień.' }, 403);

  await env.DB.prepare(`DELETE FROM login_logs`).run();
  return json({ ok: true });
}
