import { requireSession, json } from '../../_utils.js';

// Token bota jest uzywany wylacznie do tego jednego zapytania do API Discorda -
// nigdzie nie jest zapisywany ani logowany.
export async function onRequestPost({ request, env }) {
  const session = await requireSession(request, env);
  if (!session) return json({ error: 'Brak sesji.' }, 401);

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'Nieprawidłowe dane.' }, 400); }
  const botToken = (body && body.botToken || '').trim();
  if (!botToken) return json({ error: 'Podaj token bota.' }, 400);

  let res;
  try {
    res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: { Authorization: `Bot ${botToken}` }
    });
  } catch (e) {
    return json({ error: 'Nie udało się połączyć z Discordem: ' + e.message }, 502);
  }

  if (res.status === 401) return json({ error: 'Discord odrzucił ten token bota (401) - sprawdź czy jest poprawny.' }, 400);
  if (!res.ok) return json({ error: `Discord odpowiedział błędem ${res.status} przy pobieraniu serwerów.` }, 502);

  const guilds = await res.json();
  return json({ guilds: guilds.map(g => ({ id: g.id, name: g.name, icon: g.icon })) });
}
