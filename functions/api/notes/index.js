export async function onRequestGet(context) {
  try {
    const db = context.env.DB || context.env.DATABASE || context.env.D1;
    
    // ZABEZPIECZENIE: Tworzy tabelę notatek, jeśli jej jeszcze nie było!
    await db.prepare("CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, title TEXT, content TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)").run();

    const username = context.request.headers.get('x-username');
    if (!username) return new Response(JSON.stringify({ error: "Brak użytkownika" }), { status: 401 });
    
    const { results } = await db.prepare("SELECT * FROM notes WHERE username = ? ORDER BY created_at DESC").bind(username).all();
    return new Response(JSON.stringify({ notes: results }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

export async function onRequestPost(context) {
  try {
    const db = context.env.DB || context.env.DATABASE || context.env.D1;
    
    // ZABEZPIECZENIE RÓWNIEŻ PRZY DODAWANIU
    await db.prepare("CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, title TEXT, content TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)").run();

    const username = context.request.headers.get('x-username');
    if (!username) return new Response(JSON.stringify({ error: "Brak użytkownika" }), { status: 401 });
    
    const data = await context.request.json();
    await db.prepare("INSERT INTO notes (username, title, content) VALUES (?, ?, ?)").bind(username, data.title, data.content).run();
    
    return new Response(JSON.stringify({ success: true }));
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}