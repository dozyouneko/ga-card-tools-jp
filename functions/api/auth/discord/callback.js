// GET /api/auth/discord/callback
// Discordからのリダイレクトを受け、state検証 → トークン交換 → プロフィール取得 →
// users/auth_identities のupsert → セッション作成、の順に処理してトップへ戻す。

import { one, run } from "../../../_lib/db.js";
import { avatarUrl, exchangeCode, fetchDiscordUser } from "../../../_lib/discord.js";
import { createSession, getCookie } from "../../../_lib/session.js";

// state用Cookieを消すためのSet-Cookie（authorize.jsと属性を揃えること）
const CLEAR_STATE_COOKIE =
  "oauth_state=; Path=/api/auth/discord; HttpOnly; Secure; SameSite=Lax; Max-Age=0";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);

  // ユーザーが認可画面でキャンセルした場合など。エラー扱いにせずトップへ戻す
  if (url.searchParams.get("error")) {
    return redirectHome([CLEAR_STATE_COOKIE]);
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = getCookie(request, "oauth_state");
  if (!code || !state || !cookieState || state !== cookieState) {
    return new Response("認証フローが不正です。もう一度ログインし直してください。", {
      status: 400,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Set-Cookie": CLEAR_STATE_COOKIE,
      },
    });
  }

  const redirectUri = `${url.origin}/api/auth/discord/callback`;
  const tokens = await exchangeCode(env, { code, redirectUri });
  const profile = await fetchDiscordUser(tokens.access_token);

  const displayName = profile.global_name || profile.username;
  const avatar = avatarUrl(profile);
  const tokenExpiresAt = `+${tokens.expires_in ?? 0} seconds`;

  // provider + provider_user_id で既存ユーザーを探し、いれば更新、いなければ新規作成
  const identity = await one(
    env.DB,
    `SELECT user_id FROM auth_identities WHERE provider = 'discord' AND provider_user_id = ?`,
    profile.id
  );

  let userId;
  if (identity) {
    userId = identity.user_id;
    await run(
      env.DB,
      `UPDATE auth_identities
          SET provider_username = ?, provider_avatar_url = ?,
              access_token = ?, refresh_token = ?,
              token_expires_at = datetime('now', ?), updated_at = datetime('now')
        WHERE provider = 'discord' AND provider_user_id = ?`,
      profile.username,
      avatar,
      tokens.access_token,
      tokens.refresh_token ?? null,
      tokenExpiresAt,
      profile.id
    );
    // 表示名・アバターはDiscord側の最新状態に追従させる
    await run(
      env.DB,
      `UPDATE users SET display_name = ?, avatar_url = ?, updated_at = datetime('now') WHERE id = ?`,
      displayName,
      avatar,
      userId
    );
  } else {
    const inserted = await run(
      env.DB,
      `INSERT INTO users (display_name, avatar_url) VALUES (?, ?)`,
      displayName,
      avatar
    );
    userId = inserted.meta.last_row_id;
    await run(
      env.DB,
      `INSERT INTO auth_identities
         (user_id, provider, provider_user_id, provider_username, provider_avatar_url,
          access_token, refresh_token, token_expires_at)
       VALUES (?, 'discord', ?, ?, ?, ?, ?, datetime('now', ?))`,
      userId,
      profile.id,
      profile.username,
      avatar,
      tokens.access_token,
      tokens.refresh_token ?? null,
      tokenExpiresAt
    );
  }

  const { cookie } = await createSession(env, userId, request.headers.get("User-Agent"));
  return redirectHome([CLEAR_STATE_COOKIE, cookie]);
}

function redirectHome(cookies) {
  const headers = new Headers({ Location: "/" });
  for (const c of cookies) headers.append("Set-Cookie", c);
  return new Response(null, { status: 302, headers });
}
