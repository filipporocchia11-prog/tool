import { requireSession, json } from '../../_utils.js';

export async function onRequestPost({ request, env }) {
  const session = await requireSession(request, env);
  if (!session) return json({ error: 'Brak sesji.' }, 401);

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'Nieprawidłowe dane.' }, 400); }
  const botToken = (body && body.botToken || '').trim();
  const channelId = (body && body.channelId || '').trim();
  if (!botToken) return json({ error: 'Podaj token bota.' }, 400);
  if (!channelId) return json({ error: 'Wybierz kanał.' }, 400);

  let res;
  try {
    res = await fetch(`https://discord.com/api/v10/channels/${channelId}/webhooks`, {
      headers: { Authorization: `Bot ${botToken}` }
    });
  } catch (e) {
    return json({ error: 'Nie udało się połączyć z Discordem: ' + e.message }, 502);
  }

  if (res.status === 401) return json({ error: 'Discord odrzucił ten token bota (401).' }, 400);
  if (res.status === 403) return json({ error: 'Bot nie ma uprawnień do zarządzania webhookami na tym kanale (403) - potrzebuje uprawnienia "Zarządzaj webhookami".' }, 400);
  if (!res.ok) return json({ error: `Discord odpowiedział błędem ${res.status} przy pobieraniu webhooków.` }, 502);

  const webhooks = await res.json();
  return json({
    webhooks: webhooks.map(w => ({
      id: w.id,
      name: w.name,
      url: `https://discord.com/api/webhooks/${w.id}/${w.token}`,
      // Webhook stworzony przez bota (ma token) jest "application-owned" i obsluguje przyciski/select -
      // te bez tokenu (np. stworzone recznie przez kogos innego bez uprawnien do odczytu tokenu) trzeba pominac.
      hasToken: !!w.token
    })).filter(w => w.hasToken)
  });
}
