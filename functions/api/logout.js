import { parseCookies, clearSessionCookie, json } from '../_utils.js';

export async function onRequestPost({ request, env }) {
  const cookies = parseCookies(request);
  const sid = cookies['session'];
  if (sid) await env.DB.prepare(`DELETE FROM sessions WHERE session_id = ?`).bind(sid).run();
  return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie() });
}
