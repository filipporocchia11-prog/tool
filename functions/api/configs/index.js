export async function onRequest(context) {
  const { request, env } = context;
  
  if (request.method === 'GET') {
    const { results } = await env.DB.prepare('SELECT id, name, updated_at FROM config_maker ORDER BY updated_at DESC').all();
    return new Response(JSON.stringify({ configs: results }), { status: 200 });
  }
  
  if (request.method === 'POST') {
    const { name, data } = await request.json();
    if (!name || !data) return new Response(JSON.stringify({ error: 'Brak danych' }), { status: 400 });
    
    await env.DB.prepare('INSERT INTO config_maker (name, data) VALUES (?, ?)').bind(name, JSON.stringify(data)).run();
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }

  return new Response('Method Not Allowed', { status: 405 });
}