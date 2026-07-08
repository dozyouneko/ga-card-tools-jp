// GET /api/auth/discord/authorize
// CSRF対策の state を生成して HttpOnly Cookie に入れ、Discord の認可画面へリダイレクトする。
// フロント側からは fetch ではなく <a href="/api/auth/discord/authorize"> の通常遷移で呼ぶこと。

import { buildAuthorizeUrl } from "../../../_lib/discord.js";
import { randomToken } from "../../../_lib/session.js";

export function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  // ローカル(localhost:8788)と本番の両方で動くよう、リダイレクトURIはOriginから組み立てる
  const redirectUri = `${url.origin}/api/auth/discord/callback`;
  const state = randomToken(16);

  const headers = new Headers({
    Location: buildAuthorizeUrl({ clientId: env.DISCORD_CLIENT_ID, redirectUri, state }),
  });
  headers.append(
    "Set-Cookie",
    `oauth_state=${state}; Path=/api/auth/discord; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
  );

  // ?return=/tools/deck-builder/ のように指定すると、ログイン完了後にそのページへ戻す。
  // オープンリダイレクト防止のため、サイト内パス("/"始まり・"//"以外)のみ許可。
  const ret = url.searchParams.get("return");
  if (ret && ret.startsWith("/") && !ret.startsWith("//")) {
    headers.append(
      "Set-Cookie",
      `login_return=${encodeURIComponent(ret)}; Path=/api/auth/discord; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
    );
  }
  return new Response(null, { status: 302, headers });
}
