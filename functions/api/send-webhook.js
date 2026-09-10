export async function onRequest(context) {
  const { request } = context;
  
  if (request.method !== 'POST') {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const contentType = request.headers.get('content-type') || '';
    let webhookUrl, payload, viaBotWebhook;
    let discordFormData = new FormData();

    // Sprawdzamy czy przyleciały do nas pliki (FormData) czy zwykły JSON
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const jsonPart = JSON.parse(formData.get('payload_json'));
      
      webhookUrl = jsonPart.webhookUrl;
      payload = jsonPart.payload;
      viaBotWebhook = jsonPart.viaBotWebhook;

      discordFormData.append('payload_json', JSON.stringify(payload));

      // Doklejamy wszystkie pliki, które panel przeglądarki do nas wysłał
      for (const [key, value] of formData.entries()) {
        if (key.startsWith('file[')) {
          discordFormData.append(key, value);
        }
      }
    } else {
      const body = await request.json();
      webhookUrl = body.webhookUrl;
      payload = body.payload;
      viaBotWebhook = body.viaBotWebhook;
      discordFormData.append('payload_json', JSON.stringify(payload));
    }

    if (!webhookUrl) throw new Error("Missing webhookUrl");

    const urlObj = new URL(webhookUrl);
    urlObj.searchParams.set('wait', 'true');

    // Wysyłamy paczkę do Discorda
    const res = await fetch(urlObj.toString(), {
      method: 'POST',
      body: discordFormData // fetch sam ustawi odpowiednie nagłówki multipart
    });

    const responseText = await res.text();
    if (!res.ok) {
      throw new Error(`Discord API Error (${res.status}): ${responseText}`);
    }

    return new Response(JSON.stringify({ success: true, data: JSON.parse(responseText) }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });
    
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { 
      status: 400, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}