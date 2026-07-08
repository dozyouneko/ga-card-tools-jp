// /api/decks/:deckId
//   GET    — デッキ閲覧（共有リンク。ログイン不要。非公開デッキは所有者のみ）
//   PATCH  — デッキ情報の更新（所有者のみ）
//   DELETE — デッキ削除（所有者のみ。deck_cards はFKのCASCADEで連動削除）

import { all, one, run } from "../../../_lib/db.js";
import { getDeck } from "../../../_lib/decks.js";
import { error, json, readJson } from "../../../_lib/http.js";
import { getSessionUser } from "../../../_lib/session.js";

export async function onRequestGet({ request, env, params }) {
  const deck = await getDeck(env, params.deckId);
  if (!deck) return error(404, "deck_not_found");

  const user = await getSessionUser(env, request);
  const isOwner = !!user && user.id === deck.user_id;
  // 非公開デッキは存在自体を漏らさないため403ではなく404にする
  if (!deck.is_public && !isOwner) return error(404, "deck_not_found");

  const cards = await all(
    env.DB,
    `SELECT card_slug, board, qty FROM deck_cards WHERE deck_id = ? ORDER BY board, card_slug`,
    deck.id
  );
  const owner = await one(
    env.DB,
    `SELECT display_name, avatar_url FROM users WHERE id = ?`,
    deck.user_id
  );
  return json({ deck, cards, owner, is_owner: isOwner });
}

export async function onRequestPatch({ request, env, params }) {
  const user = await getSessionUser(env, request);
  if (!user) return error(401, "login_required");
  const deck = await getDeck(env, params.deckId);
  if (!deck) return error(404, "deck_not_found");
  if (deck.user_id !== user.id) return error(403, "forbidden");

  const body = await readJson(request);
  if (!body) return error(400, "invalid_json");

  // 変更を許すフィールドだけを拾って動的にUPDATE文を組み立てる
  const sets = [];
  const values = [];
  if ("name" in body) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return error(400, "name_required");
    if (name.length > 100) return error(400, "name_too_long");
    sets.push("name = ?");
    values.push(name);
  }
  if ("champion_slug" in body) {
    sets.push("champion_slug = ?");
    values.push(typeof body.champion_slug === "string" ? body.champion_slug : null);
  }
  if ("description" in body) {
    sets.push("description = ?");
    values.push(typeof body.description === "string" ? body.description : null);
  }
  if ("is_public" in body) {
    sets.push("is_public = ?");
    values.push(body.is_public ? 1 : 0);
  }
  if (sets.length === 0) return error(400, "no_fields");

  await run(
    env.DB,
    `UPDATE decks SET ${sets.join(", ")}, updated_at = datetime('now') WHERE id = ?`,
    ...values,
    deck.id
  );
  return json({ deck: await getDeck(env, deck.id) });
}

export async function onRequestDelete({ request, env, params }) {
  const user = await getSessionUser(env, request);
  if (!user) return error(401, "login_required");
  const deck = await getDeck(env, params.deckId);
  if (!deck) return error(404, "deck_not_found");
  if (deck.user_id !== user.id) return error(403, "forbidden");

  await run(env.DB, `DELETE FROM decks WHERE id = ?`, deck.id);
  return json({ ok: true });
}
