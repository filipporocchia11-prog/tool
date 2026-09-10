export async function onRequest(context) {
  const { request } = context;
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  
  try {
    const { botToken, guildId } = await request.json();
    if (!botToken || !guildId) throw new Error("Brak tokenu bota lub ID serwera");

    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      const err = await res.json().catch(()=>({}));
      throw new Error(err.message || 'Błąd API Discorda przy pobieraniu kanałów');
    }

    const allChannels = await res.json();
    
    // Zbieramy pozycje samych Kategorii (typ 4), by poprawnie grupować w nich kanały
    const catPositions = {};
    allChannels.forEach(c => {
      if (c.type === 4) catPositions[c.id] = c.position;
    });
    
    // Typy: 0 = Tekstowy, 5 = Ogłoszeniowy, 15 = Forum
    const allowedTypes = [0, 5, 15]; 
    
    const channels = allChannels
      .filter(c => allowedTypes.includes(c.type))
      .map(c => ({ 
        id: c.id, 
        name: c.name, 
        type: c.type, 
        pos: c.position, 
        catPos: c.parent_id ? (catPositions[c.parent_id] || 0) : -1 
      }))
      // Sortujemy najpierw po pozycji kategorii, a potem po pozycji kanału w tej kategorii
      .sort((a, b) => {
        if (a.catPos !== b.catPos) return a.catPos - b.catPos;
        return a.pos - b.pos;
      })
      .map(c => ({ id: c.id, name: c.name, type: c.type }));

    return new Response(JSON.stringify({ channels }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}