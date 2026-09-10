import { requireSession, json } from '../../_utils.js';

// GET zwraca surowe bajty pliku (nie JSON) - dzieki temu mozna to wpisac wprost jako
// src="/api/assets/{id}" w <img>, bez dodatkowego pobierania i konwertowania na blob.
// Celowo BEZ wymogu sesji: jeśli plik ma trafić np. do galerii mediów w wiadomości
// Discorda, to serwery Discorda muszą go pobrać same, bez logowania. ID pliku to
// nieodgadnalny UUID, więc to ten sam kompromis co "link który zna tylko ten, kto go dostał".
// Zarządzanie plikami (lista, upload, zmiana nazwy, usuwanie) nadal wymaga zalogowania.
export async function onRequestGet({ request, env, params }) {
  const asset = await env.DB.prepare(`SELECT r2_key, mime_type, name FROM assets WHERE id = ?`).bind(params.id).first();
  if (!asset) return new Response('Nie znaleziono pliku.', { status: 404 });

  const bytes = await env.ASSET_KV.get(asset.r2_key, 'arrayBuffer');
  if (!bytes) return new Response('Plik zniknął z magazynu (metadane bez danych) - usuń go z biblioteki.', { status: 404 });

  return new Response(bytes, {
    headers: {
      'Content-Type': asset.mime_type,
      'Cache-Control': 'public, max-age=3600'
    }
  });
}

export async function onRequestPatch({ request, env, params }) {
  const session = await requireSession(request, env);
  if (!session) return json({ error: 'Brak sesji.' }, 401);

  const asset = await env.DB.prepare(`SELECT id FROM assets WHERE id = ?`).bind(params.id).first();
  if (!asset) return json({ error: 'Nie znaleziono pliku.' }, 404);

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'Nieprawidłowe dane.' }, 400); }

  if (body && typeof body.name === 'string' && body.name.trim()) {
    await env.DB.prepare(`UPDATE assets SET name = ? WHERE id = ?`).bind(body.name.trim().slice(0, 120), params.id).run();
  }
  if (body && 'folder_id' in body) {
    const folderId = body.folder_id || null;
    if (folderId) {
      const folder = await env.DB.prepare(`SELECT id FROM asset_folders WHERE id = ?`).bind(folderId).first();
      if (!folder) return json({ error: 'Wskazany folder nie istnieje.' }, 404);
    }
    await env.DB.prepare(`UPDATE assets SET folder_id = ? WHERE id = ?`).bind(folderId, params.id).run();
  }

  return json({ ok: true });
}

export async function onRequestDelete({ request, env, params }) {
  const session = await requireSession(request, env);
  if (!session) return json({ error: 'Brak sesji.' }, 401);

  const asset = await env.DB.prepare(`SELECT r2_key FROM assets WHERE id = ?`).bind(params.id).first();
  if (!asset) return json({ error: 'Nie znaleziono pliku.' }, 404);

  await env.ASSET_KV.delete(asset.r2_key);
  await env.DB.prepare(`DELETE FROM assets WHERE id = ?`).bind(params.id).run();

  return json({ ok: true });
}
