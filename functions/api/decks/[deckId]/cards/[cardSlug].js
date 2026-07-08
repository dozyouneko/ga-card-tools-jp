// /api/decks/:deckId/cards/:cardSlug（所有者のみ）
//   PATCH  — 枚数・イラスト変更（body: { qty?, art_image?, board? } — qty/art_image のどちらかは必須）
//   DELETE — カード削除（クエリ ?board=... 省略時 'main'）

import { one, run } from "../../../../_lib/db.js";
import { getDeck, isValidArtImage } from "../../../../_lib/decks.js";
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
    `SELECT card_slug, board, qty, art_image FROM deck_cards WHERE deck_id = ? AND card_slug = ? AND board = ?`,
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
  const board = typeof body?.board === "string" && body.board.trim() ? body.board.trim() : "main";

  // 変更を許すフィールドだけ動的に組み立てる（qty / art_image。art_image は null で解除）
  const sets = [];
  const values = [];
  if (body && "qty" in body) {
    if (!Number.isInteger(body.qty) || body.qty < 1 || body.qty > 99) return error(400, "invalid_qty");
    sets.push("qty = ?");
    values.push(body.qty);
  }
  if (body && "art_image" in body) {
    if (body.art_image !== null && !isValidArtImage(body.art_image)) return error(400, "invalid_art_image");
    sets.push("art_image = ?");
    values.push(body.art_image);
  }
  if (sets.length === 0) return error(400, "no_fields");

  const card = await findCard(env, deck.id, params.cardSlug, board);
  if (!card) return error(404, "card_not_found");

  await run(
    env.DB,
    `UPDATE deck_cards SET ${sets.join(", ")} WHERE deck_id = ? AND card_slug = ? AND board = ?`,
    ...values,
    deck.id,
    params.cardSlug,
    board
  );
  await run(env.DB, `UPDATE decks SET updated_at = datetime('now') WHERE id = ?`, deck.id);
  return json({ card: await findCard(env, deck.id, params.cardSlug, board) });
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
