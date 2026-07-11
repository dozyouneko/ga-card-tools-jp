// /api/decks
//   GET  — 自分のデッキ一覧（要ログイン）
//   POST — デッキ新規作成（要ログイン）

import { all, one, run } from "../../_lib/db.js";
import { generateDeckId, getDeck, isValidArtImage } from "../../_lib/decks.js";
import { error, json, readJson } from "../../_lib/http.js";
import { getSessionUser } from "../../_lib/session.js";

export async function onRequestGet({ request, env }) {
  const user = await getSessionUser(env, request);
  if (!user) return error(401, "login_required");

  const decks = await all(
    env.DB,
    `SELECT d.id, d.name, d.champion_slug, d.thumb_image, d.description, d.is_public,
            d.created_at, d.updated_at, COALESCE(SUM(c.qty), 0) AS card_count,
            COALESCE(SUM(CASE WHEN c.board = 'main' THEN c.qty ELSE 0 END), 0) AS main_count,
            COALESCE(SUM(CASE WHEN c.board = 'material' THEN c.qty ELSE 0 END), 0) AS material_count
       FROM decks d LEFT JOIN deck_cards c ON c.deck_id = d.id
      WHERE d.user_id = ?
      GROUP BY d.id
      ORDER BY d.updated_at DESC`,
    user.id
  );
  return json({ decks });
}

// 1ユーザーが保存できるデッキ数の上限(悪意ある大量作成への保険)
const DECK_LIMIT = 100;

export async function onRequestPost({ request, env }) {
  const user = await getSessionUser(env, request);
  if (!user) return error(401, "login_required");

  const { n } = await one(env.DB, `SELECT COUNT(*) AS n FROM decks WHERE user_id = ?`, user.id);
  if (n >= DECK_LIMIT) return error(403, "deck_limit_reached");

  const body = await readJson(request);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return error(400, "name_required");
  if (name.length > 100) return error(400, "name_too_long");

  const thumbImage = typeof body.thumb_image === "string" ? body.thumb_image : null;
  if (thumbImage !== null && !isValidArtImage(thumbImage)) return error(400, "invalid_thumb_image");

  const id = generateDeckId();
  await run(
    env.DB,
    `INSERT INTO decks (id, user_id, name, champion_slug, thumb_image, description, is_public)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id,
    user.id,
    name,
    typeof body.champion_slug === "string" ? body.champion_slug : null,
    thumbImage,
    typeof body.description === "string" ? body.description : null,
    body.is_public === true ? 1 : 0 // 未指定はデフォルト非公開
  );
  return json({ deck: await getDeck(env, id) }, 201);
}
