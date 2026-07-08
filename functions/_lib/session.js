// セッション管理。Cookie には生トークン（ランダム32byte の hex）を入れ、
// D1 の sessions.id にはその SHA-256 ハッシュのみを保存する。
// DB が漏れてもセッションを乗っ取れず、失効は行を消すだけで済む。

import { one, run } from "./db.js";

const SESSION_COOKIE = "session";
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30日

// 暗号学的に安全なランダムトークン（hex文字列）。OAuth の state にも使う。
export function randomToken(bytes = 32) {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  return [...buf].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Cookie ヘッダから指定した名前の値を取り出す（なければ null）
export function getCookie(request, name) {
  const header = request.headers.get("Cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}

function buildSessionCookie(value, maxAge) {
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

// セッションを作成し、Cookie に入れる生トークンと Set-Cookie 文字列を返す
export async function createSession(env, userId, userAgent) {
  const token = randomToken();
  const id = await sha256Hex(token);
  await run(
    env.DB,
    `INSERT INTO sessions (id, user_id, expires_at, user_agent)
     VALUES (?, ?, datetime('now', '+${SESSION_TTL_SECONDS} seconds'), ?)`,
    id,
    userId,
    userAgent ?? null
  );
  return { token, cookie: buildSessionCookie(token, SESSION_TTL_SECONDS) };
}

// リクエストの Cookie から有効なセッションを引き、ユーザー情報を返す（未ログインは null）
export async function getSessionUser(env, request) {
  const token = getCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const id = await sha256Hex(token);
  const user = await one(
    env.DB,
    `SELECT u.id, u.display_name, u.avatar_url
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.id = ? AND s.expires_at > datetime('now')`,
    id
  );
  if (!user) return null;
  await run(env.DB, `UPDATE sessions SET last_seen_at = datetime('now') WHERE id = ?`, id);
  return user;
}

// セッションを削除し、Cookie を消すための Set-Cookie 文字列を返す
export async function destroySession(env, request) {
  const token = getCookie(request, SESSION_COOKIE);
  if (token) {
    await run(env.DB, `DELETE FROM sessions WHERE id = ?`, await sha256Hex(token));
  }
  return buildSessionCookie("", 0);
}
