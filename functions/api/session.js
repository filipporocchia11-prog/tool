import { requireSession, countOtherActiveSessions, json } from '../_utils.js';

export async function onRequestGet({ request, env }) {
  const session = await requireSession(request, env);
  if (!session) return json({ error: 'Brak sesji.' }, 401);
  const otherActiveSessions = await countOtherActiveSessions(env, session.username, session.sessionId);
  return json({ username: session.username, role: session.role, otherActiveSessions });
}
