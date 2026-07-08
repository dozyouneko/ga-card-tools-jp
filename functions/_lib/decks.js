// デッキ関連の共通処理。所有者チェックは各ハンドラで明示的に行う方針のため、
// ここにはID生成と単純なクエリだけを置く。

import { one } from "./db.js";

// デッキID = 共有リンクにそのまま使う推測困難なランダム文字列（16byte → hex 32文字）
export function generateDeckId() {
  const buf = crypto.getRandomValues(new Uint8Array(16));
  return [...buf].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function getDeck(env, deckId) {
  return one(env.DB, `SELECT * FROM decks WHERE id = ?`, deckId);
}
