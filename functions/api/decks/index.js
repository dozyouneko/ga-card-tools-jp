// /api/decks
//   GET  — 自分のデッキ一覧（要ログイン）
//   POST — デッキ新規作成（要ログイン）

import { all, batch, one } from "../../_lib/db.js";
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
// 1回の作成でまとめて受け付けるカード種数の上限(巨大ボディ対策)
const MAX_BULK_CARDS = 200;

// deck_cards への UPSERT。同じ (deck_id, card_slug, board) は枚数を加算する
// (cards エンドポイントと同一ロジック)。
const INSERT_CARD_SQL =
  `INSERT INTO deck_cards (deck_id, card_slug, board, qty, art_image) VALUES (?, ?, ?, ?, ?)
   ON CONFLICT(deck_id, card_slug, board) DO UPDATE SET qty = qty + excluded.qty`;

// 初期カード配列を検証して deck_cards INSERT 用ステートメントに変換する。
// 不正な要素があれば { error } を返し、呼び出し側で 400 応答する。
function buildCardStatements(deckId, cards) {
  if (cards === undefined || cards === null) return { stmts: [] };
  if (!Array.isArray(cards)) return { error: "invalid_cards" };
  if (cards.length > MAX_BULK_CARDS) return { error: "too_many_cards" };

  const stmts = [];
  for (const c of cards) {
    const cardSlug = typeof c?.card_slug === "string" ? c.card_slug.trim() : "";
    if (!cardSlug) return { error: "card_slug_required" };
    const board = typeof c.board === "string" && c.board.trim() ? c.board.trim() : "main";
    const qty = c.qty === undefined ? 1 : c.qty;
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) return { error: "invalid_qty" };
    const artImage = c.art_image === undefined || c.art_image === null ? null : c.art_image;
    if (artImage !== null && !isValidArtImage(artImage)) return { error: "invalid_art_image" };
    stmts.push({ sql: INSERT_CARD_SQL, params: [deckId, cardSlug, board, qty, artImage] });
  }
  return { stmts };
}

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
  const cardResult = buildCardStatements(id, body.cards);
  if (cardResult.error) return error(400, cardResult.error);

  // デッキ本体 + 初期カードを1トランザクションでまとめて投入する。
  await batch(env.DB, [
    {
      sql: `INSERT INTO decks (id, user_id, name, champion_slug, thumb_image, description, is_public)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      params: [
        id,
        user.id,
        name,
        typeof body.champion_slug === "string" ? body.champion_slug : null,
        thumbImage,
        typeof body.description === "string" ? body.description : null,
        body.is_public === true ? 1 : 0, // 未指定はデフォルト非公開
      ],
    },
    ...cardResult.stmts,
  ]);
  return json({ deck: await getDeck(env, id) }, 201);
}
