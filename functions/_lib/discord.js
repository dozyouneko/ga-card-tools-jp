// Discord OAuth2 のAPI呼び出しをまとめたヘルパー。
// スコープは identify のみ（メールアドレス等の個人情報は要求しない）。

const DISCORD_API = "https://discord.com/api";

// ユーザーをリダイレクトさせる認可URLを組み立てる
export function buildAuthorizeUrl({ clientId, redirectUri, state }) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify",
    state,
  });
  return `${DISCORD_API}/oauth2/authorize?${params}`;
}

// 認可コードをアクセストークンに交換する（サーバー側のみで実行）
export async function exchangeCode(env, { code, redirectUri }) {
  const res = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.DISCORD_CLIENT_ID,
      client_secret: env.DISCORD_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) {
    throw new Error(`Discord token exchange failed: ${res.status} ${await res.text()}`);
  }
  return res.json(); // { access_token, refresh_token, expires_in, ... }
}

// ログインしたユーザー自身のプロフィールを取得する
export async function fetchDiscordUser(accessToken) {
  const res = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Discord user fetch failed: ${res.status}`);
  }
  return res.json(); // { id, username, global_name, avatar, ... }
}

// プロフィールからアバター画像URLを組み立てる（未設定なら既定アバター）
export function avatarUrl(profile) {
  if (profile.avatar) {
    return `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png?size=128`;
  }
  // 新ユーザー名システムでは (user_id >> 22) % 6 が既定アバターの番号
  const index = Number(BigInt(profile.id) >> 22n) % 6;
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}
