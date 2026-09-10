import { requireSession, json } from '../../_utils.js';

// Zwraca płaską listę wszystkich folderów - drzewo składa frontend, bo folderów
// nigdy nie będzie na tyle dużo, żeby to było problemem wydajnościowym.
export async function onRequestGet({ request, env }) {
  const session = await requireSession(request, env);
  if (!session) return json({ error: 'Brak sesji.' }, 401);

  const { results } = await env.DB.prepare(
    `SELECT id, name, parent_id, created_by, created_at FROM asset_folders ORDER BY name COLLATE NOCASE`
  ).all();
  return json({ folders: results });
}

export async function onRequestPost({ request, env }) {
  const session = await requireSession(request, env);
  if (!session) return json({ error: 'Brak sesji.' }, 401);

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'Nieprawidłowe dane.' }, 400); }
  const name = (body && body.name || '').trim();
  const parentId = body && body.parent_id ? body.parent_id : null;
  if (!name || name.length > 60) return json({ error: 'Podaj nazwę folderu (max 60 znaków).' }, 400);

  if (parentId) {
    const parent = await env.DB.prepare(`SELECT id FROM asset_folders WHERE id = ?`).bind(parentId).first();
    if (!parent) return json({ error: 'Folder nadrzędny nie istnieje.' }, 404);
  }

  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO asset_folders (id, name, parent_id, created_by, created_at) VALUES (?, ?, ?, ?, ?)`
  ).bind(id, name, parentId, session.username, Date.now()).run();

  return json({ id, name, parent_id: parentId });
}
