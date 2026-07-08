// /api/decks
//   GET  — 自分のデッキ一覧（要ログイン）
//   POST — デッキ新規作成（要ログイン）

import { all, run } from "../../_lib/db.js";
import { generateDeckId, getDeck } from "../../_lib/decks.js";
import { error, json, readJson } from "../../_lib/http.js";
import { getSessionUser } from "../../_lib/session.js";

export async function onRequestGet({ request, env }) {
  const user = await getSessionUser(env, request);
  if (!user) return error(401, "login_required");

  const decks = await all(
    env.DB,
    `SELECT d.id, d.name, d.champion_slug, d.description, d.is_public,
            d.created_at, d.updated_at, COALESCE(SUM(c.qty), 0) AS card_count
       FROM decks d LEFT JOIN deck_cards c ON c.deck_id = d.id
      WHERE d.user_id = ?
      GROUP BY d.id
      ORDER BY d.updated_at DESC`,
    user.id
  );
  return json({ decks });
}

export async function onRequestPost({ request, env }) {
  const user = await getSessionUser(env, request);
  if (!user) return error(401, "login_required");

  const body = await readJson(request);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return error(400, "name_required");
  if (name.length > 100) return error(400, "name_too_long");

  const id = generateDeckId();
  await run(
    env.DB,
    `INSERT INTO decks (id, user_id, name, champion_slug, description, is_public)
     VALUES (?, ?, ?, ?, ?, ?)`,
    id,
    user.id,
    name,
    typeof body.champion_slug === "string" ? body.champion_slug : null,
    typeof body.description === "string" ? body.description : null,
    body.is_public === false ? 0 : 1
  );
  return json({ deck: await getDeck(env, id) }, 201);
}
