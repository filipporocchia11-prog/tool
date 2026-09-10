// Wspólne funkcje pomocnicze używane przez endpointy w functions/api/*.
// Działają w środowisku Cloudflare Workers (Web Crypto API, brak Node.js).

const PBKDF2_ITERATIONS = 100000;
export const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60; // sesja wygasa po 12h bezczynności
export const ACTIVE_WINDOW_MS = 2 * 60 * 1000; // "aktywna sesja" = ping w ciągu ostatnich 2 minut

function hexToBytes(hex) {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) arr[i] = parseInt(hex.substr(i * 2, 2), 16);
  return arr;
}
function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}
function timingSafeEqualHex(a, b) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export async function pbkdf2Hash(password, saltHex) {
  const enc = new TextEncoder();
  const salt = saltHex ? hexToBytes(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return { hash: bytesToHex(new Uint8Array(bits)), salt: bytesToHex(salt) };
}

export async function verifyPassword(password, hashHex, saltHex) {
  const { hash } = await pbkdf2Hash(password, saltHex);
  return timingSafeEqualHex(hash, hashHex);
}

export function parseCookies(request) {
  const header = request.headers.get('Cookie') || '';
  const cookies = {};
  header.split(';').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx > -1) cookies[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
  });
  return cookies;
}

export function sessionCookie(sessionId) {
  return `session=${sessionId}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}`;
}
export function clearSessionCookie() {
  return `session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders }
  });
}

export function shortUA(request) {
  const ua = request.headers.get('User-Agent') || '';
  let browser = 'Nieznana przeglądarka';
  if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('OPR/') || ua.includes('Opera')) browser = 'Opera';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Safari/')) browser = 'Safari';
  let os = '';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  return browser + (os ? ' • ' + os : '');
}

// Odczytuje sesję z ciasteczka, sprawdza czy nie wygasła i "dotyka" ją (aktualizuje last_seen).
export async function requireSession(request, env) {
  const cookies = parseCookies(request);
  const sid = cookies['session'];
  if (!sid) return null;

  const row = await env.DB.prepare(
    `SELECT s.session_id, s.username, s.last_seen, a.role
     FROM sessions s JOIN accounts a ON a.username = s.username
     WHERE s.session_id = ?`
  ).bind(sid).first();
  if (!row) return null;

  const now = Date.now();
  if (now - row.last_seen > SESSION_MAX_AGE_SECONDS * 1000) {
    await env.DB.prepare(`DELETE FROM sessions WHERE session_id = ?`).bind(sid).run();
    return null;
  }
  await env.DB.prepare(`UPDATE sessions SET last_seen = ? WHERE session_id = ?`).bind(now, sid).run();
  return { sessionId: sid, username: row.username, role: row.role };
}

export async function countOtherActiveSessions(env, username, sessionId) {
  const since = Date.now() - ACTIVE_WINDOW_MS;
  const res = await env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM sessions WHERE username = ? AND session_id != ? AND last_seen > ?`
  ).bind(username, sessionId, since).first();
  return res ? res.cnt : 0;
}

export async function countAdmins(env) {
  const res = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM accounts WHERE role = 'admin'`).first();
  return res ? res.cnt : 0;
}

// --- Biblioteka zasobow ---
export const MAX_ASSET_BYTES = 8 * 1024 * 1024; // 8 MB na plik - to biblioteka ikon/tel/log, nie wideo
const ALLOWED_ASSET_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];
export function isAllowedAssetType(mimeType) {
  return ALLOWED_ASSET_TYPES.includes(mimeType);
}
export function extFromMime(mimeType) {
  const map = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg'
  };
  return map[mimeType] || 'bin';
}
