export async function onRequest(context) {
  const { request } = context;
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  
  try {
    const { botToken, channelId } = await request.json();
    if (!botToken || !channelId) throw new Error("Brak tokenu bota lub ID kanału");

    const headers = {
      'Authorization': `Bot ${botToken}`,
      'Content-Type': 'application/json'
    };

    let allThreads = [];

    // 1. Pobieramy AKTYWNE wątki i posty
    const activeRes = await fetch(`https://discord.com/api/v10/channels/${channelId}/threads/active`, { headers });
    if (activeRes.ok) {
      const activeData = await activeRes.json();
      if (activeData.threads) allThreads.push(...activeData.threads);
    }

    // 2. Pobieramy ZARCHIWIZOWANE posty (Discord usypia posty na forum po np. 3 dniach ciszy)
    const archRes = await fetch(`https://discord.com/api/v10/channels/${channelId}/threads/archived/public`, { headers });
    if (archRes.ok) {
      const archData = await archRes.json();
      if (archData.threads) allThreads.push(...archData.threads);
    }

    // Mapujemy na prostą tablicę do wyświetlenia w <select> na froncie
    const mappedThreads = allThreads.map(t => ({ id: t.id, name: t.name }));

    return new Response(JSON.stringify({ threads: mappedThreads }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}