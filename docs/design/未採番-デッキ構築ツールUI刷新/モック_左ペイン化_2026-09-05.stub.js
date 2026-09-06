"use strict";
/* モック（デッキ構築の左ペイン化）— iframe の中で先に走らせるスタブ。
 *
 * ⚠️ これは設計検討用のモックの部品であり、実装ではない。本番の配信対象でもない
 *    （docs/ 配下は functions/docs/[[path]].js が404を返す）。
 *
 * ⭐ 役割は2つだけ:
 *    ① デッキ構築ツールは Discord ログインが前提で、ヘッドレスでもローカルでも編集画面に到達できない
 *       （CLAUDE.md「環境の注意」）。そこで /api/me と /api/decks/<id> だけを差し替えて
 *       「ログイン済み・デッキを1つ開いた状態」を作る。
 *    ② それ以外（api.gatcg.com のカード取得・訳データ・シーズン禁止）は素通しする。
 *       ⭐ カードの絵柄・日本語名・バッジは本物がそのまま出る。
 *
 * ⚠️ このファイルは <base href="/tools/deck-builder/"> を差し込んだ srcdoc の中で、
 *    本体の <script defer> より前に実行される（＝/api/me が呼ばれる前に必ず差し替わる）。
 *
 * ⭐ デッキの中身は実データ:
 *    data/tournaments/events/60368.json（Quicksilver Cup Auckland 2026・player 184）の
 *    マテリアル12 / メイン60 / サイド9 をそのまま使う。
 *    パンテオン用は同イベントのメインから重複なしで60種を集め、Boon 2枚を足したもの
 *    （⚠️ こちらは実在のデッキではなく、実在のカードで組んだシングルトン構築）。
 */
(function () {
  const cfg = (window.frameElement && window.frameElement.dataset) || {};

  const STD_ROWS = [{"card_slug":"spirit-of-fire","board":"material","qty":1},{"card_slug":"vanitas-obliviate-schemer","board":"material","qty":1},{"card_slug":"vanitas-convergent-ruin","board":"material","qty":1},{"card_slug":"vanitas-dominus-rex","board":"material","qty":1},{"card_slug":"censer-of-restful-peace","board":"material","qty":1},{"card_slug":"grand-crusaders-ring","board":"material","qty":1},{"card_slug":"safeguard-amulet","board":"material","qty":1},{"card_slug":"smoke-bombs","board":"material","qty":1},{"card_slug":"tariff-ring","board":"material","qty":1},{"card_slug":"beastsoul-visage","board":"material","qty":1},{"card_slug":"impact-hammer","board":"material","qty":1},{"card_slug":"purifying-thurible","board":"material","qty":1},{"card_slug":"dungeon-guide","board":"main","qty":4},{"card_slug":"fast-cure","board":"main","qty":4},{"card_slug":"fluffy-shopkeep","board":"main","qty":2},{"card_slug":"liminal-guide","board":"main","qty":4},{"card_slug":"undying-dreams","board":"main","qty":3},{"card_slug":"creative-shock","board":"main","qty":4},{"card_slug":"fiery-interference","board":"main","qty":2},{"card_slug":"flagrant-guide","board":"main","qty":3},{"card_slug":"fractal-of-sparks","board":"main","qty":2},{"card_slug":"lavasoul-tiger","board":"main","qty":2},{"card_slug":"red-hare-unrivaled-stallion","board":"main","qty":3},{"card_slug":"searing-rebuke","board":"main","qty":4},{"card_slug":"three-of-hearts","board":"main","qty":4},{"card_slug":"varuckan-acolyte","board":"main","qty":2},{"card_slug":"volda-smolders-spite","board":"main","qty":3},{"card_slug":"beseech-the-winds","board":"main","qty":1},{"card_slug":"brisk-windtrotter","board":"main","qty":4},{"card_slug":"dilu-auspicious-charger","board":"main","qty":4},{"card_slug":"dream-fairy","board":"main","qty":3},{"card_slug":"stifling-trap","board":"main","qty":2},{"card_slug":"morgan-soul-guide","board":"side","qty":2},{"card_slug":"nullifying-lantern","board":"side","qty":1},{"card_slug":"nullifying-mirror","board":"side","qty":1},{"card_slug":"orb-of-sealing","board":"side","qty":1},{"card_slug":"fractal-of-sparks","board":"side","qty":1},{"card_slug":"scatter-essence","board":"side","qty":3}];

  const PAN_ROWS = [
    ...["spirit-of-fire","vanitas-obliviate-schemer","vanitas-convergent-ruin","vanitas-dominus-rex","censer-of-restful-peace","grand-crusaders-ring","safeguard-amulet","smoke-bombs","tariff-ring","beastsoul-visage","impact-hammer","purifying-thurible"].map((s) => ({ card_slug: s, board: "material", qty: 1 })),
    ...["dungeon-guide","fast-cure","fluffy-shopkeep","liminal-guide","undying-dreams","creative-shock","fiery-interference","flagrant-guide","fractal-of-sparks","lavasoul-tiger","red-hare-unrivaled-stallion","searing-rebuke","three-of-hearts","varuckan-acolyte","volda-smolders-spite","beseech-the-winds","brisk-windtrotter","dilu-auspicious-charger","dream-fairy","stifling-trap","idle-thoughts","unbroken-mustang","cerulean-decree","conniving-plans","engulf","fractal-of-polar-depths","fractal-of-rain","fracturize","frostsworn-paladin","pelagic-fatestone","primordial-ritual","refracting-missile","resonating-fugue","seaside-ringleader","song-of-frost","spalling-cleanse","strategem-of-myriad-ice","thronekeeper-bullfrog","tidestone-bovine","fractal-of-insight","return-to-the-archive","shimmering-refraction","unstable-fractal","zhang-jiao-way-of-peace","acquiescing-rejection","burst-asunder","fractal-of-intrusion","fractal-of-refreshment","fractal-of-snow","glimmering-refusal","jianyu-fates-premonition","turbo-charge","aesan-protector","calming-breeze","displace","fairy-whispers","rally-the-peasants","reclaim","veiling-breeze","verdigris-decree"].map((s) => ({ card_slug: s, board: "main", qty: 1 })),
    { card_slug: "lesser-boon-of-agni", board: "pantheon", qty: 1 },
    { card_slug: "greater-boon-of-enki", board: "pantheon", qty: 1 },
    // ⭐ パンテオンでは使わない「サイドボード」にも2枚入れておく。
    //    ⚠️ 空だとゾーンごと隠れるため、5ゾーン（＝非アクティブ表示の警告つき）が見えなくなる
    { card_slug: "dungeon-guide", board: "side", qty: 1 },
    { card_slug: "fast-cure", board: "side", qty: 1 },
  ];

  const MAYBE = ["dungeon-guide","fast-cure"].map((s) => ({ card_slug: s, board: "maybe", qty: 1 }));

  // ⚠️ 36文字＝検討メモ §3-2 で実測した最長デッキ名（.editor-bar の最悪ケース）
  const NAMES = {
    normal: { STANDARD: "ヴァニタス炎獄コントロール", PANTHEON: "パンテオン・アストラ型" },
    long: { STANDARD: "ヴァニタス炎獄コントロール・地区大会優勝レシピ２０２６年８月版（暫定版）",
            PANTHEON: "ヴァニタス炎獄コントロール・地区大会優勝レシピ２０２６年８月版（暫定版）" },
  };

  const format = cfg.deck === "pan" ? "PANTHEON" : "STANDARD";
  const nameKind = cfg.name === "long" ? "long" : "normal";

  const DECK = {
    is_owner: true,
    owner: { display_name: "モックユーザー" },
    deck: {
      id: "mock",
      name: NAMES[nameKind][format],
      format,
      is_public: true,
      description: "モック用のメモ。実装ではありません。",
      // ⚠️ 空にすると autoAssignThumb() が PATCH を投げる。値を入れて経路ごと止める
      thumb_image: "/images/cards/mock.jpg",
      champion_slug: null,
      updated_at: "2026-09-05T00:00:00.000Z",
      created_at: "2026-08-14T00:00:00.000Z",
    },
    cards: (format === "PANTHEON" ? PAN_ROWS : STD_ROWS).concat(MAYBE),
  };

  const json = (obj, status) => Promise.resolve(new Response(JSON.stringify(obj), {
    status: status || 200, headers: { "Content-Type": "application/json" },
  }));

  const origFetch = window.fetch;
  window.fetch = function (input, init) {
    const url = String(typeof input === "string" ? input : (input && input.url) || "");
    // ⭐ 自前APIだけを差し替える。api.gatcg.com と data/*.json は素通し
    if (url.startsWith("/api/") || url.includes("/api/")) {
      if (url.includes("/api/me")) return json({ user: { display_name: "モックユーザー", avatar_url: "" } });
      if (/\/api\/decks\/[^/]+$/.test(url.split("?")[0])) return json(DECK);
      if (url.includes("/api/decks")) return json({ decks: [DECK.deck] });
      // 保存系（PATCH/POST/DELETE）は握りつぶす。モックでは永続化しない
      return json({ ok: true, deck: DECK.deck, card: null });
    }
    return origFetch.call(window, input, init);
  };

  // ⭐ 編集画面を開いた状態から始める（route() が読むのは location.hash だけ）
  try { location.hash = "#edit/mock"; } catch (e) { /* about:srcdoc でも動くことは実測済み */ }
})();
