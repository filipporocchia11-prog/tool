import { requireSession, json, MAX_ASSET_BYTES, isAllowedAssetType, extFromMime } from '../_utils.js';

// Lista plikow w danym folderze (albo w katalogu glownym, jesli nie podano folder).
export async function onRequestGet({ request, env }) {
  const session = await requireSession(request, env);
  if (!session) return json({ error: 'Brak sesji.' }, 401);

  const url = new URL(request.url);
  const folderId = url.searchParams.get('folder');

  const query = folderId
    ? env.DB.prepare(
        `SELECT id, folder_id, name, mime_type, size_bytes, created_by, created_at FROM assets WHERE folder_id = ? ORDER BY name COLLATE NOCASE`
      ).bind(folderId)
    : env.DB.prepare(
        `SELECT id, folder_id, name, mime_type, size_bytes, created_by, created_at FROM assets WHERE folder_id IS NULL ORDER BY name COLLATE NOCASE`
      );

  const { results } = await query.all();
  return json({ assets: results });
}

// Upload pliku - multipart/form-data z polami: file, name (opcjonalnie), folder_id (opcjonalnie).
export async function onRequestPost({ request, env }) {
  const session = await requireSession(request, env);
  if (!session) return json({ error: 'Brak sesji.' }, 401);

  let form;
  try { form = await request.formData(); } catch (e) { return json({ error: 'Nie udało się odczytać przesłanego pliku.' }, 400); }

  const file = form.get('file');
  if (!file || typeof file === 'string') return json({ error: 'Brak pliku w żądaniu.' }, 400);
  if (!isAllowedAssetType(file.type)) return json({ error: 'Ten format pliku nie jest obsługiwany. Wrzucaj PNG, JPG, WEBP, GIF albo SVG.' }, 400);
  if (file.size > MAX_ASSET_BYTES) return json({ error: `Plik jest za duży - limit to ${Math.round(MAX_ASSET_BYTES / 1024 / 1024)} MB.` }, 400);

  const folderIdRaw = form.get('folder_id');
  const folderId = folderIdRaw && folderIdRaw !== 'null' ? folderIdRaw : null;
  if (folderId) {
    const folder = await env.DB.prepare(`SELECT id FROM asset_folders WHERE id = ?`).bind(folderId).first();
    if (!folder) return json({ error: 'Wskazany folder nie istnieje.' }, 404);
  }

  const nameRaw = form.get('name');
  const name = (typeof nameRaw === 'string' && nameRaw.trim()) ? nameRaw.trim().slice(0, 120) : file.name.slice(0, 120);

  const id = crypto.randomUUID();
  const kvKey = `${id}.${extFromMime(file.type)}`;

  await env.ASSET_KV.put(kvKey, await file.arrayBuffer(), {
    metadata: { contentType: file.type }
  });

  await env.DB.prepare(
    `INSERT INTO assets (id, folder_id, name, mime_type, size_bytes, r2_key, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, folderId, name, file.type, file.size, kvKey, session.username, Date.now()).run();

  return json({ id, folder_id: folderId, name, mime_type: file.type, size_bytes: file.size });
}
