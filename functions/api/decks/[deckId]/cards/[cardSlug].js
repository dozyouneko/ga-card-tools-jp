// /api/decks/:deckId/cards/:cardSlug（所有者のみ）
//   PATCH  — 枚数変更（body: { qty, board? }）
//   DELETE — カード削除（クエリ ?board=... 省略時 'main'）

import { one, run } from "../../../../_lib/db.js";
import { getDeck } from "../../../../_lib/decks.js";
import { error, json, readJson } from "../../../../_lib/http.js";
import { getSessionUser } from "../../../../_lib/session.js";

// PATCH/DELETE共通の認可チェック。通れば deck を、失敗ならレスポンスを返す
async function authorize({ request, env, params }) {
  const user = await getSessionUser(env, request);
  if (!user) return { response: error(401, "login_required") };
  const deck = await getDeck(env, params.deckId);
  if (!deck) return { response: error(404, "deck_not_found") };
  if (deck.user_id !== user.id) return { response: error(403, "forbidden") };
  return { deck };
}

function findCard(env, deckId, cardSlug, board) {
  return one(
    env.DB,
    `SELECT card_slug, board, qty FROM deck_cards WHERE deck_id = ? AND card_slug = ? AND board = ?`,
    deckId,
    cardSlug,
    board
  );
}

export async function onRequestPatch(context) {
  const { deck, response } = await authorize(context);
  if (response) return response;
  const { request, env, params } = context;

  const body = await readJson(request);
  const qty = body?.qty;
  if (!Number.isInteger(qty) || qty < 1 || qty > 99) return error(400, "invalid_qty");
  const board = typeof body.board === "string" && body.board.trim() ? body.board.trim() : "main";

  const card = await findCard(env, deck.id, params.cardSlug, board);
  if (!card) return error(404, "card_not_found");

  await run(
    env.DB,
    `UPDATE deck_cards SET qty = ? WHERE deck_id = ? AND card_slug = ? AND board = ?`,
    qty,
    deck.id,
    params.cardSlug,
    board
  );
  await run(env.DB, `UPDATE decks SET updated_at = datetime('now') WHERE id = ?`, deck.id);
  return json({ card: { ...card, qty } });
}

export async function onRequestDelete(context) {
  const { deck, response } = await authorize(context);
  if (response) return response;
  const { request, env, params } = context;

  const board = new URL(request.url).searchParams.get("board") || "main";
  const card = await findCard(env, deck.id, params.cardSlug, board);
  if (!card) return error(404, "card_not_found");

  await run(
    env.DB,
    `DELETE FROM deck_cards WHERE deck_id = ? AND card_slug = ? AND board = ?`,
    deck.id,
    params.cardSlug,
    board
  );
  await run(env.DB, `UPDATE decks SET updated_at = datetime('now') WHERE id = ?`, deck.id);
  return json({ ok: true });
}
