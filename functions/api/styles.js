import { json } from '../_utils.js';

export async function onRequest(context) {
  const { request, env } = context;
  const db = env.DB;

  if (!db) {
    return json({ error: "Brak bazy D1" }, 500);
  }

  if (request.method === 'GET') {
    try {
      const { results } = await db.prepare("SELECT * FROM styles ORDER BY created_at DESC").all();
      const styles = (results || []).map(r => {
        let parsedData = r.data;
        if (typeof r.data === 'string') {
          try {
            parsedData = JSON.parse(r.data);
          } catch (e) {}
        }
        return {
          id: r.id,
          name: r.name,
          data: parsedData,
          created_at: r.created_at
        };
      });
      return json({ styles }, 200);
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  }

  if (request.method === 'POST') {
    try {
      const body = await request.json();
      if (!body.name || !body.data) {
        return json({ error: "Brak nazwy lub danych stylu" }, 400);
      }

      const stringifiedData = typeof body.data === 'string' ? body.data : JSON.stringify(body.data);

      await db.prepare("INSERT INTO styles (name, data) VALUES (?, ?)")
        .bind(body.name.trim(), stringifiedData)
        .run();

      return json({ success: true }, 200);
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  }

  if (request.method === 'DELETE') {
    try {
      const body = await request.json().catch(() => ({}));
      if (body.id) {
        await db.prepare("DELETE FROM styles WHERE id = ?").bind(body.id).run();
      } else if (body.name) {
        await db.prepare("DELETE FROM styles WHERE name = ?").bind(body.name).run();
      } else {
        return json({ error: "Podaj id lub nazwe stylu do usuniecia" }, 400);
      }

      return json({ success: true }, 200);
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  }

  return json({ error: "Method not allowed" }, 405);
}
