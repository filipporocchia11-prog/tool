import { requireSession, json } from '../../../_utils.js';

async function collectDescendantFolderIds(env, rootId) {
  let frontier = [rootId];
  const all = [rootId];
  while (frontier.length) {
    const placeholders = frontier.map(() => '?').join(',');
    const { results } = await env.DB.prepare(
      `SELECT id FROM asset_folders WHERE parent_id IN (${placeholders})`
    ).bind(...frontier).all();
    const ids = results.map(r => r.id);
    if (!ids.length) break;
    all.push(...ids);
    frontier = ids;
  }
  return all;
}

export async function onRequestPatch({ request, env, params }) {
  const session = await requireSession(request, env);
  if (!session) return json({ error: 'Brak sesji.' }, 401);

  const folder = await env.DB.prepare(`SELECT id FROM asset_folders WHERE id = ?`).bind(params.id).first();
  if (!folder) return json({ error: 'Nie znaleziono folderu.' }, 404);

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'Nieprawidłowe dane.' }, 400); }
  const name = (body && body.name || '').trim();
  if (!name || name.length > 60) return json({ error: 'Podaj nazwę folderu (max 60 znaków).' }, 400);

  await env.DB.prepare(`UPDATE asset_folders SET name = ? WHERE id = ?`).bind(name, params.id).run();
  return json({ ok: true });
}

export async function onRequestDelete({ request, env, params }) {
  const session = await requireSession(request, env);
  if (!session) return json({ error: 'Brak sesji.' }, 401);

  const folder = await env.DB.prepare(`SELECT id FROM asset_folders WHERE id = ?`).bind(params.id).first();
  if (!folder) return json({ error: 'Nie znaleziono folderu.' }, 404);

  const folderIds = await collectDescendantFolderIds(env, params.id);
  const placeholders = folderIds.map(() => '?').join(',');

  const { results: toDelete } = await env.DB.prepare(
    `SELECT id, r2_key FROM assets WHERE folder_id IN (${placeholders})`
  ).bind(...folderIds).all();

  // Kasujemy pliki po kolei - dla biblioteki ikon/tel to i tak niewielkie liczby na raz.
  for (const a of toDelete) {
    await env.ASSET_KV.delete(a.r2_key);
  }

  await env.DB.batch([
    env.DB.prepare(`DELETE FROM assets WHERE folder_id IN (${placeholders})`).bind(...folderIds),
    env.DB.prepare(`DELETE FROM asset_folders WHERE id IN (${placeholders})`).bind(...folderIds)
  ]);

  return json({ ok: true, deletedFolders: folderIds.length, deletedAssets: toDelete.length });
}
