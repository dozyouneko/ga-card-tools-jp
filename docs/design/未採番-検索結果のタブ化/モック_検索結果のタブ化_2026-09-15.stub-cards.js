"use strict";
/* モック（検索結果のタブ化）— カードの追加・枚数変更・削除を「その場だけ」成功させるスタブ。
 *
 * ⚠️ 設計検討用のモックの部品であり、実装ではない。本番の配信対象でもない。
 *
 * ⭐ 共用のスタブ（../未採番-デッキ構築ツールUI刷新/モック_左ペイン化_2026-09-05.stub.js）は保存系を
 *    `{ ok: true, card: null }` で握りつぶすため、検索結果から「＋メイン」を押すと
 *    「追加に失敗しました(Cannot read properties of undefined (reading 'qty'))」になる（2026-09-15 実測）。
 *    ⭐ R1（検索結果タブからデッキへ投入できる）をモック上で試せるよう、カードの3操作だけ応答を作る。
 *    ⚠️ 共用スタブは他のモックが使っているので直さず、その「後」にこのファイルを重ねる。
 *
 * ⚠️ 保存はしない（再読込するとデッキは元の中身に戻る）。
 */
(function () {
  const inner = window.fetch; // ＝共用スタブが差し替えた fetch
  const json = (obj) => Promise.resolve(new Response(JSON.stringify(obj), { status: 200, headers: { "Content-Type": "application/json" } }));
  window.fetch = function (input, init) {
    const url = String(typeof input === "string" ? input : (input && input.url) || "");
    const method = String((init && init.method) || "GET").toUpperCase();
    const m = /\/api\/decks\/[^/]+\/cards(?:\/([^/?]+))?/.exec(url);
    if (m && method !== "GET") {
      let body = {};
      try { body = JSON.parse((init && init.body) || "{}"); } catch (e) { body = {}; }
      // deckData は app.js のトップレベルの let（後から読むスクリプトから名前で見える）
      // eslint-disable-next-line no-undef
      const cards = (typeof deckData !== "undefined" && deckData && deckData.cards) || [];
      if (method === "POST") {
        const cur = cards.find((c) => c.card_slug === body.card_slug && c.board === body.board);
        return json({ card: { card_slug: body.card_slug, board: body.board, qty: (cur ? cur.qty : 0) + (Number(body.qty) || 1), art_image: body.art_image || (cur ? cur.art_image : null) } });
      }
      if (method === "PATCH") {
        const slug = decodeURIComponent(m[1] || "");
        const cur = cards.find((c) => c.card_slug === slug && c.board === body.board);
        return json({ card: { card_slug: slug, board: body.board, qty: Number(body.qty) || 0, art_image: cur ? cur.art_image : null } });
      }
      if (method === "DELETE") return json({ ok: true });
    }
    return inner.call(window, input, init);
  };
})();
