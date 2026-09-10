import { json, requireSession } from '../_utils.js';

export async function onRequest(context) {
  const { request, env } = context;
  const db = env.DB;

  if (!db) {
    return json({ error: "Brak bazy D1" }, 500);
  }

  const session = await requireSession(request, env);
  const headerUser = request.headers.get('x-username');
  const username = (session && session.username) || headerUser;

  if (!username) {
    return json({ error: "Brak autoryzacji" }, 401);
  }

  if (request.method === 'GET') {
    try {
      const { results } = await db.prepare("SELECT * FROM notes WHERE username = ? ORDER BY id DESC")
        .bind(username)
        .all();
      return json({ notes: results || [] }, 200);
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  }

  if (request.method === 'POST') {
    try {
      const body = await request.json();
      if (!body.title || !body.content) {
        return json({ error: "Brak tytułu lub treści notatki" }, 400);
      }

      await db.prepare("INSERT INTO notes (username, title, content) VALUES (?, ?, ?)")
        .bind(username, body.title.trim(), body.content.trim())
        .run();

      return json({ success: true }, 200);
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  }

  return json({ error: "Method not allowed" }, 405);
}