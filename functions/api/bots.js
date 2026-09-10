async function getCryptoKey(secret) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.digest('SHA-256', enc.encode(secret));
  return await crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptToken(token, secret) {
  const key = await getCryptoKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(token)
  );
  return {
    encrypted: btoa(String.fromCharCode(...new Uint8Array(cipherBuffer))),
    iv: btoa(String.fromCharCode(...iv))
  };
}

async function decryptToken(encryptedBase64, ivBase64, secret) {
  const key = await getCryptoKey(secret);
  const iv = new Uint8Array(atob(ivBase64).split('').map(c => c.charCodeAt(0)));
  const cipherBuffer = new Uint8Array(atob(encryptedBase64).split('').map(c => c.charCodeAt(0)));
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    cipherBuffer
  );
  const dec = new TextDecoder();
  return dec.decode(decryptedBuffer);
}

export async function onRequest(context) {
  const { request, env } = context;
  const secret = env.ENCRYPTION_KEY;

  if (request.method === 'GET') {
    const { results } = await env.DB.prepare("SELECT * FROM saved_bots").all();
    const decryptedBots = [];
    
    for (const row of results) {
      try {
        const decToken = await decryptToken(row.encrypted_token, row.iv, secret);
        decryptedBots.push({ id: row.id, name: row.name, token: decToken });
      } catch (e) {}
    }
    return new Response(JSON.stringify({ bots: decryptedBots }), { status: 200 });
  }

  if (request.method === 'POST') {
    const body = await request.json();
    const { encrypted, iv } = await encryptToken(body.token, secret);
    const id = crypto.randomUUID();
    
    await env.DB.prepare(
      "INSERT INTO saved_bots (id, name, encrypted_token, iv) VALUES (?, ?, ?, ?)"
    ).bind(id, body.name, encrypted, iv).run();
    
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }

  if (request.method === 'DELETE') {
    const body = await request.json();
    const { results } = await env.DB.prepare("SELECT * FROM saved_bots").all();
    
    for (const row of results) {
      try {
        const decToken = await decryptToken(row.encrypted_token, row.iv, secret);
        if (decToken === body.token) {
          await env.DB.prepare("DELETE FROM saved_bots WHERE id = ?").bind(row.id).run();
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
      } catch (e) {}
    }
    return new Response(JSON.stringify({ error: "Bot not found" }), { status: 404 });
  }

  return new Response("Method not allowed", { status: 405 });
}