// POST /api/decks/:deckId/cards — カード追加（所有者のみ）
// 同じ (card_slug, board) が既にあれば枚数を加算する。

import { one, run } from "../../../../_lib/db.js";
import { getDeck } from "../../../../_lib/decks.js";
import { error, json, readJson } from "../../../../_lib/http.js";
import { getSessionUser } from "../../../../_lib/session.js";

export async function onRequestPost({ request, env, params }) {
  const user = await getSessionUser(env, request);
  if (!user) return error(401, "login_required");
  const deck = await getDeck(env, params.deckId);
  if (!deck) return error(404, "deck_not_found");
  if (deck.user_id !== user.id) return error(403, "forbidden");

  const body = await readJson(request);
  const cardSlug = typeof body?.card_slug === "string" ? body.card_slug.trim() : "";
  if (!cardSlug) return error(400, "card_slug_required");
  const board = typeof body.board === "string" && body.board.trim() ? body.board.trim() : "main";
  const qty = body.qty === undefined ? 1 : body.qty;
  if (!Number.isInteger(qty) || qty < 1 || qty > 99) return error(400, "invalid_qty");

  await run(
    env.DB,
    `INSERT INTO deck_cards (deck_id, card_slug, board, qty) VALUES (?, ?, ?, ?)
     ON CONFLICT(deck_id, card_slug, board) DO UPDATE SET qty = qty + excluded.qty`,
    deck.id,
    cardSlug,
    board,
    qty
  );
  await run(env.DB, `UPDATE decks SET updated_at = datetime('now') WHERE id = ?`, deck.id);

  const card = await one(
    env.DB,
    `SELECT card_slug, board, qty FROM deck_cards WHERE deck_id = ? AND card_slug = ? AND board = ?`,
    deck.id,
    cardSlug,
    board
  );
  return json({ card });
}
