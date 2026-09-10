export async function onRequest(context) {
  const { request, env, params } = context;
  
  try {
    if (!env.DB) throw new Error("Brak podpiętej bazy D1 (zmienna env.DB jest pusta).");

    if (request.method === 'GET') {
      const config = await env.DB.prepare('SELECT data FROM config_maker WHERE id = ?').bind(params.id).first();
      if (!config) throw new Error('Nie znaleziono configu o podanym ID');
      return new Response(JSON.stringify({ data: config.data }), { status: 200 });
    }

    // Nowa metoda - Aktualizowanie / Nadpisywanie
    if (request.method === 'PUT') {
      const { data } = await request.json();
      if (!data) throw new Error('Brak wymaganych danych do nadpisania');
      await env.DB.prepare('UPDATE config_maker SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(JSON.stringify(data), params.id).run();
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }
    
    if (request.method === 'DELETE') {
      await env.DB.prepare('DELETE FROM config_maker WHERE id = ?').bind(params.id).run();
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: 'Niedozwolona metoda' }), { status: 405 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}