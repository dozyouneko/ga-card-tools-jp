// 大会詳細ページのデッキ表示まわり。生成元: scripts/build-tournament-pages.mjs
// 1) 順位表「デッキを見る」→ decks.html(全デッキのHTML断片)から該当1件だけをダイアログに描画
// 2) ダイアログ内のカードクリック → shared/js/card-detail.js の詳細ダイアログが上に重なる
// 3) 順位表の折りたたみ(101名以上の大会)の排他制御
//
// decks.html は取得後もテキストのまま持ち、DOMParser で解析した文書(非表示・レイアウトなし)から
// 該当デッキだけを複製する。断片全体をページのDOMへ差し込まない(422デッキ=カード約25,000枚)。
"use strict";
(() => {
  // 一覧から絞り込み条件付き(?cat=…)で来た場合、パンくずの一覧リンクにも同じ条件を付け直す
  // (ブラウザバックだけでなくパンくずから戻っても絞り込みが復元されるようにする)
  if (location.search) {
    document.querySelectorAll('.cp-crumb a[href="/tournaments/"]')
      .forEach((a) => { a.href = "/tournaments/" + location.search; });
  }

  const modal = document.getElementById("deck-modal");
  if (!modal) return;
  const src = modal.dataset.decksSrc;
  const titleEl = modal.querySelector(".deck-modal-title");
  const contentEl = modal.querySelector(".deck-modal-content");
  const DECK_HASH = /^deck-\d+$/;

  let fetching = null;   // 取得中/取得済みのPromise(解析済みDocument)
  let openedByHashChange = false; // 履歴を1つ進めて開いたか(閉じるときに戻るかの判断)

  const fetchDecks = () => {
    if (!fetching) {
      fetching = fetch(src)
        .then((r) => { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); })
        .then((html) => new DOMParser().parseFromString(html, "text/html"))
        .catch((e) => { fetching = null; throw e; }); // 失敗は握らず再試行できるようにする
    }
    return fetching;
  };

  const message = (text, retryId) => {
    contentEl.textContent = "";
    const p = document.createElement("p");
    p.className = "deck-msg";
    p.textContent = text;
    if (retryId) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "deck-retry";
      btn.textContent = "再試行";
      btn.addEventListener("click", () => render(retryId));
      p.appendChild(btn);
    }
    contentEl.appendChild(p);
  };

  // 解析済み文書から該当デッキ1件を複製してダイアログに描画する
  function render(id) {
    titleEl.textContent = "デッキ";
    message("デッキを読み込んでいます…");
    return fetchDecks().then((doc) => {
      const deck = doc.getElementById(id);
      if (!deck) { message("このデッキは見つかりませんでした。"); return; }
      const summary = deck.querySelector("summary");
      titleEl.innerHTML = summary ? summary.innerHTML : "デッキ";
      contentEl.textContent = "";
      deck.querySelectorAll(".view-zone").forEach((z) => contentEl.appendChild(document.importNode(z, true)));
      contentEl.scrollTop = 0;
      modal.querySelector(".deck-body").scrollTop = 0;
    }).catch((e) => {
      console.error(e);
      message("デッキの読み込みに失敗しました。", id);
    });
  }

  function openDeck(id) {
    openRankBlockOf(id);
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    render(id);
  }

  function closeDeck() {
    if (modal.hidden) return;
    modal.hidden = true;
    contentEl.textContent = "";
    document.body.style.overflow = "";
    if (!DECK_HASH.test(location.hash.slice(1))) return;
    // 「デッキを見る」で進んだ履歴は戻す(ブラウザバックと同じ状態にする)
    if (openedByHashChange) { openedByHashChange = false; history.back(); }
    else history.replaceState(null, "", location.pathname + location.search);
  }

  // 折りたたまれた順位表で開かれた場合、該当プレイヤーを含むブロックを開く
  function openRankBlockOf(id) {
    const row = document.querySelector('tr[data-player="' + id.slice(5) + '"]');
    const block = row && row.closest("details.rank-block");
    if (block && !block.open) block.open = true; // toggleハンドラが他ブロックを閉じる
  }

  const syncFromHash = () => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (DECK_HASH.test(id)) openDeck(id);
    else closeDeck();
  };
  addEventListener("hashchange", () => { openedByHashChange = true; syncFromHash(); });
  syncFromHash(); // 共有された #deck-123 付きURLで直接開かれた場合

  modal.addEventListener("click", (e) => { if (e.target.closest("[data-deck-close]")) closeDeck(); });
  // 同じハッシュの「デッキを見る」を再クリックしても hashchange が出ないため個別に拾う
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a.deck-link");
    if (a && a.hash.slice(1) === location.hash.slice(1)) syncFromHash();
  });

  // ---- 順位表の折りたたみ: 1つ開いたら他を閉じる ----
  const blocks = Array.from(document.querySelectorAll("details.rank-block"));
  blocks.forEach((b) => b.addEventListener("toggle", () => {
    if (b.open) blocks.forEach((o) => { if (o !== b) o.open = false; });
  }));

  if (!window.GA_CARD_DETAIL) return;
  // カード詳細を閉じてもデッキダイアログが開いていれば背面のスクロール停止を維持する
  GA_CARD_DETAIL.init({ onAfterClose: () => { if (!modal.hidden) document.body.style.overflow = "hidden"; } });
  // ---- カードタイル。1ダイアログに数百個並びうるため個別登録せず文書単位で委譲する ----
  const tileOf = (e) => e.target.closest(".cardph[data-slug]");
  document.addEventListener("click", (e) => {
    const tile = tileOf(e);
    if (tile) GA_CARD_DETAIL.openBySlug(tile.dataset.slug);
  });
  document.addEventListener("keydown", (e) => {
    // Escapeは内側(カード詳細)から順に閉じる
    if (e.key === "Escape") {
      if (GA_CARD_DETAIL.isOpen()) GA_CARD_DETAIL.close();
      else closeDeck();
      return;
    }
    if (e.key !== "Enter" && e.key !== " ") return;
    const tile = tileOf(e);
    if (tile) { e.preventDefault(); GA_CARD_DETAIL.openBySlug(tile.dataset.slug); }
  });

  // 回線が空いたら取得・解析だけ済ませておく(初回表示の待ち時間を消す)
  const prefetch = () => fetchDecks().catch(() => {});
  if (window.requestIdleCallback) requestIdleCallback(prefetch, { timeout: 3000 });
  else addEventListener("load", () => setTimeout(prefetch, 500));
})();
