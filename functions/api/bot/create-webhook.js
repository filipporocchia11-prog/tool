import { requireSession, json } from '../../_utils.js';

export async function onRequestPost({ request, env }) {
  const session = await requireSession(request, env);
  if (!session) return json({ error: 'Brak sesji.' }, 401);

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'Nieprawidłowe dane.' }, 400); }
  const botToken = (body && body.botToken || '').trim();
  const channelId = (body && body.channelId || '').trim();
  const name = (body && body.name || 'Moon Shop').trim().slice(0, 80) || 'Moon Shop';
  if (!botToken) return json({ error: 'Podaj token bota.' }, 400);
  if (!channelId) return json({ error: 'Wybierz kanał.' }, 400);

  let res;
  try {
    res = await fetch(`https://discord.com/api/v10/channels/${channelId}/webhooks`, {
      method: 'POST',
      headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
  } catch (e) {
    return json({ error: 'Nie udało się połączyć z Discordem: ' + e.message }, 502);
  }

  if (res.status === 401) return json({ error: 'Discord odrzucił ten token bota (401).' }, 400);
  if (res.status === 403) return json({ error: 'Bot nie ma uprawnień do tworzenia webhooków na tym kanale (403) - potrzebuje uprawnienia "Zarządzaj webhookami".' }, 400);
  if (!res.ok) {
    const text = await res.text();
    return json({ error: `Discord odpowiedział błędem ${res.status} przy tworzeniu webhooka: ${text}` }, 502);
  }

  const w = await res.json();
  return json({ id: w.id, name: w.name, url: `https://discord.com/api/webhooks/${w.id}/${w.token}` });
}
