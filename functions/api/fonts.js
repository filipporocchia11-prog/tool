export async function onRequestGet(context) {
  try {
    const db = context.env.DB || context.env.DATABASE || context.env.D1;
    const { results } = await db.prepare("SELECT * FROM fonts ORDER BY created_at DESC").all();
    return new Response(JSON.stringify({ fonts: results }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

export async function onRequestPost(context) {
  try {
    const db = context.env.DB || context.env.DATABASE || context.env.D1;
    const data = await context.request.json();
    await db.prepare("INSERT OR REPLACE INTO fonts (name, base64) VALUES (?, ?)").bind(data.name, data.base64).run();
    return new Response(JSON.stringify({ success: true }));
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

export async function onRequestDelete(context) {
  try {
    const db = context.env.DB || context.env.DATABASE || context.env.D1;
    const data = await context.request.json();
    await db.prepare("DELETE FROM fonts WHERE name = ?").bind(data.name).run();
    return new Response(JSON.stringify({ success: true }));
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}