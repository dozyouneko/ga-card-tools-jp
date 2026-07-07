// D1バインディングが正しく疎通しているかだけを確認する動作確認用エンドポイント。
// GET /api/health -> D1内のテーブル一覧をJSONで返す。
export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
  ).all();
  return new Response(JSON.stringify({ ok: true, tables: results.map((r) => r.name) }), {
    headers: { "Content-Type": "application/json" },
  });
}
