// POST /api/auth/logout
// セッションをD1から削除し、Cookieも消す。GETにしないのはリンク踏みだけで
// ログアウトさせられるのを避けるため（フロントからは fetch(..., {method:'POST'}) で呼ぶ）。

import { destroySession } from "../../_lib/session.js";

export async function onRequestPost({ request, env }) {
  const clearCookie = await destroySession(env, request);
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": clearCookie,
    },
  });
}
