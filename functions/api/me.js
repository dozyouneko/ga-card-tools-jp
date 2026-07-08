// GET /api/me
// ログイン中ユーザーの情報を返す。未ログインは401。
// フロントはこのエンドポイントでログイン状態を判定する。

import { getSessionUser } from "../_lib/session.js";

export async function onRequestGet({ request, env }) {
  const user = await getSessionUser(env, request);
  if (!user) {
    return new Response(JSON.stringify({ error: "not_logged_in" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ user }), {
    headers: { "Content-Type": "application/json" },
  });
}
