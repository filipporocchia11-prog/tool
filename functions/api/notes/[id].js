import { json, requireSession } from '../../_utils.js';

export async function onRequest(context) {
  const { request, env, params } = context;
  const db = env.DB;
  const id = params.id;

  if (!db) {
    return json({ error: "Brak bazy D1" }, 500);
  }

  if (!id) {
    return json({ error: "Brak ID notatki" }, 400);
  }

  const session = await requireSession(request, env);
  const headerUser = request.headers.get('x-username');
  const username = (session && session.username) || headerUser;

  if (!username) {
    return json({ error: "Brak autoryzacji" }, 401);
  }

  if (request.method === 'PATCH') {
    try {
      const body = await request.json();
      if (!body.title || !body.content) {
        return json({ error: "Brak tytułu lub treści notatki" }, 400);
      }

      await db.prepare("UPDATE notes SET title = ?, content = ? WHERE id = ? AND username = ?")
        .bind(body.title.trim(), body.content.trim(), id, username)
        .run();

      return json({ success: true }, 200);
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  }

  if (request.method === 'DELETE') {
    try {
      await db.prepare("DELETE FROM notes WHERE id = ? AND username = ?")
        .bind(id, username)
        .run();

      return json({ success: true }, 200);
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  }

  return json({ error: "Method not allowed" }, 405);
}