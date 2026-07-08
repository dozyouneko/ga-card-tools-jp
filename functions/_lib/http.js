// JSONレスポンスの定型をまとめたヘルパー。

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// エラーは { error: "snake_case_code" } の形で返す（/api/me の not_logged_in と同じ流儀）。
// 人向けの文言に整えるのはフロントエンド側の仕事。
export function error(status, code) {
  return json({ error: code }, status);
}

// リクエストボディをJSONとして読む（不正なJSONや空ボディは null）
export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
