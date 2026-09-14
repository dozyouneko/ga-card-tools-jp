"use strict";
/* モック（検索結果のタブ化）— iframe の中で、本物の app.js の「後」に走る候補実装。
 *
 * ⚠️ これは設計検討用のモックの部品であり、実装ではない。本番の配信対象でもない
 *    （docs/ 配下は functions/docs/[[path]].js が404を返す）。
 *    ⚠️ 実装はこのファイルを写さないこと。設計書（後日）の手順で app.js / style.css に書く。
 *
 * ⭐ 仕組み（次に同じことをする人へ）:
 *   - app.js のトップレベルの const / let / function は「グローバルな宣言」なので、後から読む
 *     classic script から名前で参照できる（el / searchCtl / deckData / appendResults / searchStatusText …）。
 *   - 検索の入口はすべて runSearch(reset) を名前で呼んでいる（🔍検索・Enter・並び替え・昇降順）。
 *     ⭐ runSearch と rerunIfResultOpen を差し替えるだけで、結果モーダルは二度と開かなくなる。
 *   - タブごとに GA_CARD_SEARCH.create() を1つ作り、els に「条件のスナップショットを返すだけの物」を渡す。
 *     ⭐ 共有モジュール（card-search.js）は els を値の読み出しにしか使わないので、無改修で動く
 *     （＝「もっと見る」が左ペインのいまの入力を読まない。モック説明 §3 の潜在不具合 P1 の直し方）。
 *   - 結果のタイルは本物の #result-grid（クリック委譲のリスナーが付いている要素）を1つだけ使い、
 *     タブを切り替えるときに中身（子要素）を出し入れする。🎨/🔄 のリスナーは子要素に付いているので移動しても生きる。
 *   - CSS は CSSOM の insertRule（⚠️ <style> 注入は CSP style-src 'self' に阻まれて無言で無視される）。
 *
 * つまみ（iframe の data-* 属性。親ページが設定する）:
 *   data-link   b=左ペインとタブを連動（推奨）/ a=独立
 *   data-scope  deck=デッキごとに保存（推奨）/ global=全デッキ共通
 *   data-num    reset=全部閉じたら1に戻す（推奨）/ keep=戻さない
 *   data-switch on=新しい検索のタブへ切り替える（推奨）/ off=切り替えない
 *   data-reload last=リロード後は最後に見ていたタブ（推奨）/ deck=デッキタブ
 *   data-chip   off=チップを押しても検索しない（現状どおり・推奨）/ on=表示中の検索タブを更新
 */
(function () {
  const cfg = (window.frameElement && window.frameElement.dataset) || {};
  const OPT = {
    link: cfg.link === "a" ? "a" : "b",
    scope: cfg.scope === "global" ? "global" : "deck",
    num: cfg.num === "keep" ? "keep" : "reset",
    switchTo: cfg.switch !== "off",
    reload: cfg.reload === "deck" ? "deck" : "last",
    chip: cfg.chip === "on",
  };
  const MAX_TABS = 5; // ⭐ ユーザー決定（2026-09-15）: PC・スマホとも5
  // ⚠️ 実装ではキー名を設計書で決める。モックは実物と衝突しないよう mock- を付ける
  const STORE_KEY = OPT.scope === "global"
    ? "mock-search-tabs:v1:all"
    : `mock-search-tabs:v1:deck:${cfg.deck === "pan" ? "pan" : "std"}`;
  const PANE_MIN = 1200; // ⚠️ 実物の PANE_MIN_WIDTH と同じ値

  // ---------- 起動待ち（app.js の init() が終わり、デッキが開くまで） ----------
  const t0 = Date.now();
  (function wait() {
    let ready = false;
    try {
      ready = typeof el === "object" && typeof deckData !== "undefined" && deckData && deckData.cards
        && document.querySelector("#s-g-subtype .chip") && document.querySelector(".zone[data-zone=main] .gtile");
    } catch (e) { ready = false; }
    if (ready) { start(); return; }
    if (Date.now() - t0 > 60000) { console.warn("[mock] 起動待ちがタイムアウトしました"); return; }
    setTimeout(wait, 120);
  })();

  function start() {
    const doc = document;
    const $ = (id) => doc.getElementById(id);
    const sheet = [...doc.styleSheets].find((s) => (s.href || "").endsWith("/tools/deck-builder/style.css"));
    const css = (rule) => { try { sheet.insertRule(rule, sheet.cssRules.length); } catch (e) { console.warn("[mock] css", rule, e); } };

    // ---------- 候補CSS ----------
    css(`#view-editor .deck-tabs { align-items: flex-end; }`);
    css(`#view-editor .deck-tabs > button[role="tab"] { flex: none; }`);
    // ⭐ 検索結果タブの部分だけが横スクロールする（デッキ・統計は flex:none で固定）
    css(`.mk-stabs { display: flex; gap: 6px; flex: 1 1 auto; min-width: 0; overflow-x: auto; overflow-y: hidden;
      margin-bottom: -1px; padding-left: 8px; margin-left: 2px; border-left: 1px solid var(--border);
      scrollbar-width: thin; overscroll-behavior-x: contain; }`);
    css(`.mk-stabs:empty { display: none; }`);
    css(`.mk-stab { flex: none; display: flex; align-items: center; border: 1px solid transparent; border-bottom: none;
      border-radius: 8px 8px 0 0; }`);
    css(`.mk-stab[data-selected="true"] { background: var(--panel); border-color: var(--border); box-shadow: inset 0 2px 0 var(--accent); }`);
    css(`.deck-tabs .mk-stab > button { margin: 0; border: none; background: transparent; font: inherit; cursor: pointer; color: var(--muted); }`);
    css(`.deck-tabs .mk-stab > button[role="tab"] { padding: 8px 4px 8px 14px; font-size: .92rem; white-space: nowrap; border-radius: 8px 0 0 0; }`);
    css(`.deck-tabs .mk-stab[data-selected="true"] > button[role="tab"] { color: var(--text); font-weight: 700; }`);
    css(`.deck-tabs .mk-stab > button[role="tab"]:hover { color: var(--text); }`);
    css(`.deck-tabs .mk-stab > .mk-x { width: 28px; height: 28px; margin-right: 4px; border-radius: 50%; font-size: 1rem; line-height: 1; display: grid; place-items: center; }`);
    css(`.deck-tabs .mk-stab > .mk-x:hover { background: var(--panel-2); color: var(--text); }`);
    css(`.deck-tabs .mk-stab > button:focus-visible { outline: 2px solid var(--accent-2); outline-offset: -2px; }`);
    css(`.mk-stab.mk-new { animation: tile-flash 1.2s ease-out; }`);
    // 検索結果パネル
    css(`#ed-pane-search { padding: 16px 24px 56px; }`);
    css(`#ed-pane-search[hidden] { display: none; }`);
    css(`.mk-cond { border: 1px solid var(--accent); background: rgba(217,164,65,.08); border-radius: 10px; padding: 9px 11px; margin: 0 0 12px; }`);
    css(`.mk-cond-head { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; margin: 0 0 7px; }`);
    css(`.mk-cond-title { margin: 0; font-size: .74rem; font-weight: 700; letter-spacing: .04em; color: var(--muted); }`);
    css(`.mk-cond-load { margin-left: auto; font: inherit; font-size: .74rem; color: var(--accent); background: transparent; border: 1px dashed var(--border); border-radius: 999px; padding: 2px 9px; cursor: pointer; }`);
    css(`.mk-cond-list { display: flex; flex-wrap: wrap; gap: 6px; }`);
    css(`.mk-cond-list > span { display: inline-flex; align-items: baseline; gap: 5px; background: var(--panel); color: var(--text); border: 1px solid var(--border); border-radius: 999px; font-size: .79rem; line-height: 1.4; padding: 3px 9px; max-width: 100%; overflow-wrap: anywhere; }`);
    css(`.mk-cond-list > span b { font-weight: 400; color: var(--muted); font-size: .72rem; white-space: nowrap; }`);
    css(`.mk-cond-list > span em { font-style: normal; color: var(--muted); font-size: .72rem; }`);
    css(`.mk-cond-list > .mk-none { color: var(--muted); border-style: dashed; }`);
    css(`@media (max-width: 620px) { #ed-pane-search { padding: 12px 16px 48px; } }`);

    // ---------- DOM ----------
    const strip = doc.querySelector("#view-editor .deck-tabs");
    const deckTab = $("ed-tab-deck");
    const statsTab = $("ed-tab-stats");
    const deckPane = $("ed-pane-deck");
    const statsPane = el.edPaneStats;
    const stabs = doc.createElement("div");
    stabs.className = "mk-stabs";
    stabs.setAttribute("role", "presentation");
    strip.appendChild(stabs);

    const pane = doc.createElement("div");
    pane.id = "ed-pane-search";
    pane.className = "search-pane";
    pane.setAttribute("role", "tabpanel");
    pane.hidden = true;
    const cond = doc.createElement("div");
    cond.className = "mk-cond";
    pane.appendChild(cond);
    // ⭐ 本物の件数・グリッド・もっと見るをモーダルから移す（グリッドのクリック委譲はそのまま生きる）
    const grid = el.resultGrid;
    const moreWrap = el.resultMore.parentElement;
    pane.append(el.resultCount, grid, moreWrap);
    statsPane.after(pane);
    // 「もっと見る」は元のリスナー（searchCtl.loadMore）を外すため複製に差し替える
    const moreBtn = el.resultMore.cloneNode(true);
    el.resultMore.replaceWith(moreBtn);
    el.resultMore = moreBtn;
    moreBtn.addEventListener("click", () => { const t = activeTab(); if (t && t.ctl) t.ctl.loadMore(); });

    // ---------- 条件（スナップショット）----------
    // ⭐ 保存形式はトップの共有URL（#20・app.js の queryString）と同じクエリ文字列にする
    const GROUPS = [["element", "sGElement", "element"], ["class", "sGClass", "cls"], ["type", "sGType", "type"], ["subtype", "sGSubtype", "subtype"], ["rarity", "sGRarity", "rarity"]];
    function readForm() {
      const c = { q: el.sName.value.trim(), qtext: el.sText.value.trim(), g: {}, format: el.sFormat.value,
        set: GA_CARD_SEARCH.setKeyOf(el.sSet.value), sort: el.sSort.value || "name", order: el.sOrder.dataset.dir || "ASC" };
      GROUPS.forEach(([name, key]) => { const g = el[key]; const v = g.getValues(); if (v.length) c.g[name] = { v, m: g.getMode() }; });
      return c;
    }
    function toQs(c) {
      const p = new URLSearchParams();
      if (c.q) p.set("q", c.q);
      if (c.qtext) p.set("qtext", c.qtext);
      GROUPS.forEach(([name]) => { const g = c.g[name]; if (!g) return; g.v.forEach((v) => p.append(name, v)); if (g.m === "AND") p.set(name + "_op", "AND"); });
      if (c.format) p.set("format", c.format);
      if (c.set) p.set("set", c.set);
      if (c.sort && c.sort !== "name") p.set("sort", c.sort);
      if (c.order === "DESC") p.set("order", "DESC");
      return p.toString();
    }
    function fromQs(qs) {
      const p = new URLSearchParams(qs);
      const c = { q: p.get("q") || "", qtext: p.get("qtext") || "", g: {}, format: p.get("format") || "", set: p.get("set") || "", sort: p.get("sort") || "name", order: p.get("order") === "DESC" ? "DESC" : "ASC" };
      GROUPS.forEach(([name]) => { const v = p.getAll(name); if (v.length) c.g[name] = { v, m: p.get(name + "_op") === "AND" ? "AND" : "OR" }; });
      return c;
    }
    function applyForm(c) {
      el.sName.value = c.q; el.sText.value = c.qtext;
      GROUPS.forEach(([name, key]) => { const g = el[key]; const x = c.g[name]; g.setValues(x ? x.v : []); g.setMode(x ? x.m : "OR"); });
      el.sFormat.value = [...el.sFormat.options].some((o) => o.value === c.format) ? c.format : "";
      el.sSet.value = GA_CARD_SEARCH.setIndexOf(c.set);
      el.sSort.value = c.sort;
      el.sOrder.dataset.dir = c.order;
      el.sOrder.textContent = c.order === "ASC" ? "▲ 昇順" : "▼ 降順";
      updateFilterBadge();
    }
    const pseudoGroup = (c, name) => ({ getValues: () => (c.g[name] ? c.g[name].v.slice() : []), getMode: () => (c.g[name] ? c.g[name].m : "OR") });
    function pseudoEls(c) {
      const e = { name: { value: c.q }, text: { value: c.qtext }, format: { value: c.format },
        set: { value: GA_CARD_SEARCH.setIndexOf(c.set) }, sort: { value: c.sort }, order: { dataset: { dir: c.order } } };
      GROUPS.forEach(([name, , elsKey]) => { e[elsKey] = pseudoGroup(c, name); });
      return e;
    }

    // 条件の表示（Q4）。⭐ 「選択中の条件」と同じ見た目の丸ピル。⚠️ 押しても何も起きない（表示だけ）
    const SORT_LABEL = { name: "名前順", cost_memory: "コスト順", level: "レベル順", power: "パワー順", life: "ライフ順", rarity: "レアリティ順" };
    function chipJp(groupEl, value) {
      const input = [...groupEl.querySelectorAll('.chip input[type="checkbox"]')].find((i) => i.value.toUpperCase() === String(value).toUpperCase());
      const chip = input && input.closest(".chip");
      const jp = chip && chip.querySelector("span") ? chip.querySelector("span").textContent.trim() : "";
      return jp || String(value);
    }
    function condItems(c) {
      const out = [];
      if (c.q) out.push(["カード名", `「${c.q}」`]);
      if (c.qtext) out.push(["効果", `「${c.qtext}」`]);
      GROUPS.forEach(([name, key]) => {
        const x = c.g[name]; if (!x) return;
        const g = el[key]; const label = g.querySelector(".flabel") ? g.querySelector(".flabel").textContent : name;
        const joiner = x.m === "AND" ? " かつ " : "・";
        out.push([label + (x.v.length > 1 ? (x.m === "AND" ? "（すべて）" : "（いずれか）") : ""), x.v.map((v) => chipJp(g, v)).join(joiner)]);
      });
      if (c.format) { const o = [...el.sFormat.options].find((x) => x.value === c.format); out.push(["フォーマット", o ? o.textContent : c.format]); }
      if (c.set) { const i = GA_CARD_SEARCH.setIndexOf(c.set); const o = i !== "" ? el.sSet.options[[...el.sSet.options].findIndex((x) => x.value === i)] : null; out.push(["エキスパンション", o ? o.textContent : c.set]); }
      return out;
    }
    const sortText = (c) => `${SORT_LABEL[c.sort] || c.sort} ${c.order === "ASC" ? "▲昇順" : "▼降順"}`;
    const condSummary = (c) => condItems(c).map(([k, v]) => `${k}: ${v}`).concat(`並び: ${sortText(c)}`).join(" / ");

    // ---------- タブの状態 ----------
    let tabs = [];      // [{ id, n, cond, frag, count, more, moreDisabled, loaded, ctl, gen }]
    let next = 1;       // 次に振る連番
    let activeId = null; // 表示中の検索タブ（デッキ・統計を表示中なら null）
    let lastActiveId = null;
    let uid = 0;
    const byId = (id) => tabs.find((t) => t.id === id) || null;
    const activeTab = () => byId(activeId);

    function save() {
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify({ v: 1, next, tabs: tabs.map((t) => ({ n: t.n, qs: toQs(t.cond) })), active: activeTab() ? activeTab().n : null }));
      } catch (e) { /* ⚠️ 保存できなくても動く（その場限りのタブになるだけ）＝fail-open */ }
    }
    function restore() {
      let data = null;
      try { data = JSON.parse(localStorage.getItem(STORE_KEY) || "null"); } catch (e) { data = null; }
      if (!data || data.v !== 1 || !Array.isArray(data.tabs)) return null;
      tabs = data.tabs.slice(-MAX_TABS).map((x) => newTab(Number(x.n), fromQs(String(x.qs || ""))));
      next = Math.max(Number(data.next) || 1, ...tabs.map((t) => t.n + 1), 1);
      return data.active;
    }
    function newTab(n, c) {
      return { id: `st${++uid}`, n, cond: c, frag: doc.createDocumentFragment(), count: "", more: false, moreDisabled: false, loaded: false, ctl: null, gen: 0 };
    }

    // ---------- 描画 ----------
    function renderStrip(flashId) {
      stabs.textContent = "";
      tabs.forEach((t) => {
        const wrap = doc.createElement("div");
        wrap.className = "mk-stab" + (t.id === flashId ? " mk-new" : "");
        wrap.dataset.selected = String(t.id === activeId);
        const b = doc.createElement("button");
        b.type = "button";
        b.setAttribute("role", "tab");
        b.id = `ed-tab-${t.id}`;
        b.setAttribute("aria-selected", String(t.id === activeId));
        b.setAttribute("aria-controls", "ed-pane-search");
        b.title = condSummary(t.cond);
        b.textContent = `検索${t.n}`;
        b.addEventListener("click", () => activate(t.id));
        const x = doc.createElement("button");
        x.type = "button";
        x.className = "mk-x";
        x.setAttribute("aria-label", `検索${t.n}を閉じる`);
        x.title = `検索${t.n}を閉じる`;
        x.textContent = "×";
        x.addEventListener("click", (e) => { e.stopPropagation(); closeTab(t.id); });
        wrap.append(b, x);
        stabs.appendChild(wrap);
      });
      if (activeTab()) { deckTab.setAttribute("aria-selected", "false"); statsTab.setAttribute("aria-selected", "false"); }
      scrollStripTo(flashId || activeId);
    }
    function scrollStripTo(id) {
      if (!id) return;
      const btn = $(`ed-tab-${id}`);
      if (!btn) return;
      const w = btn.parentElement;
      const l = w.offsetLeft - stabs.offsetLeft, r = l + w.offsetWidth;
      // ⚠️ scrollIntoView はページ（縦）までスクロールするので使わない
      if (l < stabs.scrollLeft) stabs.scrollLeft = l - 8;
      else if (r > stabs.scrollLeft + stabs.clientWidth) stabs.scrollLeft = r - stabs.clientWidth + 8;
    }
    function renderPane() {
      const t = activeTab();
      if (!t) return;
      cond.textContent = "";
      const head = doc.createElement("div");
      head.className = "mk-cond-head";
      const h = doc.createElement("h3");
      h.className = "mk-cond-title";
      h.textContent = `検索${t.n} の条件`;
      head.appendChild(h);
      if (OPT.link === "a") {
        const load = doc.createElement("button");
        load.type = "button";
        load.className = "mk-cond-load";
        load.textContent = "↩ この条件を左ペインに読み込む";
        load.addEventListener("click", () => applyForm(t.cond));
        head.appendChild(load);
      }
      cond.appendChild(head);
      const list = doc.createElement("div");
      list.className = "mk-cond-list";
      const items = condItems(t.cond);
      if (!items.length) { const s = doc.createElement("span"); s.className = "mk-none"; s.textContent = "絞り込みなし（全カード）"; list.appendChild(s); }
      items.forEach(([k, v]) => { const s = doc.createElement("span"); const b = doc.createElement("b"); b.textContent = k; s.append(b, doc.createTextNode(v)); list.appendChild(s); });
      const s = doc.createElement("span"); const b = doc.createElement("b"); b.textContent = "並び"; s.append(b, doc.createTextNode(sortText(t.cond))); list.appendChild(s);
      cond.appendChild(list);
      paintCount(t);
    }
    function paintCount(t) {
      if (t.id !== activeId) return;
      el.resultCount.textContent = t.count;
      moreBtn.hidden = !t.more;
      moreBtn.disabled = !!t.moreDisabled;
    }

    // ---------- 検索の実行（タブごとのコントローラ）----------
    function withTabGrid(t, fn) {
      // ⭐ preferredArtIndex() は el.sSet / el.sGRarity を読むので、そのタブの条件に一時的に差し替える
      //    （差し替えないと「左ペインのいまの条件」で絵柄が決まる＝P5 と同じ不具合の再発）
      const saveSet = el.sSet, saveRar = el.sGRarity;
      el.sSet = { value: GA_CARD_SEARCH.setIndexOf(t.cond.set) };
      el.sGRarity = pseudoGroup(t.cond, "rarity");
      try {
        if (t.id === activeId) { fn(); return; }
        const tmp = doc.createElement("div");
        tmp.append(t.frag);
        el.resultGrid = tmp;
        try { fn(); } finally { el.resultGrid = grid; t.frag = doc.createDocumentFragment(); t.frag.append(...tmp.childNodes); }
      } finally { el.sSet = saveSet; el.sGRarity = saveRar; }
    }
    function runTab(t) {
      const gen = ++t.gen;
      const live = () => gen === t.gen && tabs.includes(t);
      t.ctl = GA_CARD_SEARCH.create({
        els: pseudoEls(t.cond),
        pageSize: 24, jpPageSize: 24,
        metaIndexUrl: "../../data/card-meta-index.json",
        effectsUrl: TL_EFFECTS_URL,
        fetchCard: getCard,
        onStart: (reset) => {
          if (!live()) return;
          if (reset) { if (t.id === activeId) grid.innerHTML = ""; else t.frag = doc.createDocumentFragment(); }
          t.count = "検索中…"; t.moreDisabled = true; paintCount(t);
        },
        onProgress: ({ done, total }) => { if (!live()) return; t.count = `読み込み中 ${done}/${total} ページ…`; paintCount(t); },
        onResults: (cards, info) => {
          if (!live()) return;
          cards.forEach((card) => { cardCache.set(card.slug, Promise.resolve(card)); });
          withTabGrid(t, () => { appendResults(cards, info); t.count = searchStatusText(info); });
          t.more = info.hasMore; t.moreDisabled = false; t.loaded = true;
          if (t.id === activeId) updateElementWarn(info);
          paintCount(t);
        },
        onError: (err) => { if (!live()) return; t.count = `検索に失敗しました(${err.message})`; t.moreDisabled = false; paintCount(t); },
      });
      t.loaded = true; // 実行を始めた＝もう「未取得」ではない（二重に走らせない）
      t.ctl.run(true);
    }

    // ---------- タブ操作 ----------
    function stashActive() {
      const cur = activeTab();
      if (cur) { cur.frag = doc.createDocumentFragment(); cur.frag.append(...grid.childNodes); }
    }
    function showPane(on) {
      pane.hidden = !on;
      if (on) { deckPane.hidden = true; statsPane.hidden = true; deckTab.setAttribute("aria-selected", "false"); statsTab.setAttribute("aria-selected", "false"); }
    }
    async function refreshBadges() {
      // ⭐ 他のタブ・デッキ側で枚数が変わっていることがあるので、表示のたびに追加ボタン行と「n枚」を描き直す
      const items = [...grid.querySelectorAll(".result")];
      for (const item of items) {
        const card = await getCard(item.dataset.slug);
        if (!item.isConnected) return;
        renderAddRow(item, card);
        updateResultBadge(item, item.dataset.slug);
      }
    }
    function scrollToStrip(force) {
      const wide = window.matchMedia(`(min-width: ${PANE_MIN}px)`).matches;
      const bar = doc.querySelector("#view-editor .editor-bar");
      const barH = wide && bar ? bar.getBoundingClientRect().height : 0;
      const top = strip.getBoundingClientRect().top;
      // ⭐ スマホ表示は検索フォームが上にあり結果が画面の下に出るので必ず送る。
      //    左ペイン表示は、タブ帯が画面の上半分に見えていれば動かさない
      if (force || !wide || top < barH || top > window.innerHeight / 2) {
        window.scrollTo({ top: Math.max(0, window.scrollY + top - barH - 4), behavior: "auto" });
      }
    }
    function activate(id, opts) {
      opts = opts || {};
      const t = byId(id);
      if (!t) return;
      if (activeId !== id) {
        stashActive();
        grid.append(t.frag);
        t.frag = doc.createDocumentFragment();
      }
      activeId = id; lastActiveId = id;
      showPane(true);
      if (OPT.link === "b" && !opts.keepForm) applyForm(t.cond);
      renderStrip(opts.flash ? id : null);
      renderPane();
      if (!t.loaded) runTab(t);
      else refreshBadges();
      if (opts.scroll) scrollToStrip();
      save();
    }
    function leaveSearch() {
      if (!activeId) return;
      stashActive();
      activeId = null;
      pane.hidden = true;
      renderStrip();
      save();
    }
    function closeTab(id) {
      const i = tabs.findIndex((t) => t.id === id);
      if (i < 0) return;
      const wasActive = id === activeId;
      if (wasActive) { grid.innerHTML = ""; activeId = null; }
      const [gone] = tabs.splice(i, 1);
      gone.gen++; // 走っている検索の結果を捨てる
      if (!tabs.length && OPT.num === "reset") next = 1;
      if (wasActive) {
        const nb = tabs[i] || tabs[i - 1];
        if (nb) activate(nb.id);
        else { pane.hidden = true; deckTab.click(); }
      }
      renderStrip();
      save();
      const btn = wasActive && activeId ? $(`ed-tab-${activeId}`) : null;
      if (btn) btn.focus();
    }
    function newSearch() {
      const c = readForm();
      const t = newTab(next++, c);
      tabs.push(t);
      let dropped = null;
      while (tabs.length > MAX_TABS) {
        const old = tabs.shift();
        old.gen++;
        if (old.id === activeId) { grid.innerHTML = ""; activeId = null; }
        dropped = old;
      }
      if (dropped) showToast(`タブは${MAX_TABS}つまでです — いちばん古い「検索${dropped.n}」を閉じました`);
      if (OPT.switchTo || !activeId) {
        activate(t.id, { flash: true, keepForm: true, scroll: true });
        if (!OPT.switchTo) showToast(`「検索${t.n}」を作りました`);
      } else {
        runTab(t);
        renderStrip(t.id);
        save();
        showToast(`「検索${t.n}」を裏で開きました（タブを押すと表示）`);
      }
    }
    function rerunActive(c) {
      const t = activeTab();
      if (!t) return false;
      t.cond = c;
      renderStrip();
      renderPane();
      runTab(t);
      save();
      return true;
    }

    // ---------- 入口の差し替え ----------
    let trigger = "search";
    doc.addEventListener("click", (e) => {
      if (e.target.closest("#s-search")) trigger = "search";
      else if (e.target.closest("#s-order")) trigger = "sort";
    }, true);
    doc.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.closest("#s-name, #s-text")) trigger = "search"; }, true);
    doc.addEventListener("change", (e) => { if (e.target.closest("#s-sort")) trigger = "sort"; }, true);

    // eslint-disable-next-line no-global-assign
    runSearch = function mockRunSearch() {
      const kind = trigger; trigger = "search";
      if (kind === "sort" && activeTab()) {
        // ⭐ 並び替え・昇降順は「表示中の検索タブ」を並べ替える（タブを増やさない）
        const t = activeTab();
        const c = OPT.link === "b" ? readForm() : Object.assign({}, t.cond, { sort: el.sSort.value || "name", order: el.sOrder.dataset.dir || "ASC" });
        rerunActive(c);
        return;
      }
      newSearch();
    };
    // 「選択中の条件」の✕・すべて解除（左ペイン化の単位E）。
    // ⭐ 連動(b)なら表示中の検索タブを更新する（今のモーダルを開いているときと同じ）。独立(a)なら左ペインの下書きを直すだけ
    // eslint-disable-next-line no-global-assign
    rerunIfResultOpen = function mockRerun() { if (OPT.link === "b" && activeTab()) rerunActive(readForm()); };
    // ⚠️ 結果モーダルはもう開かない（念のため）
    const origOpenModal = openModal;
    openModal = function mockOpenModal(m) { if (m === el.resultModal) return; origOpenModal(m); };

    if (OPT.chip) {
      $("s-filter-row").addEventListener("change", (e) => {
        // ⚠️ 「選択中の条件」の✕は input.click()（isTrusted=false）で外すので、ここでは数えない（二重検索になる）
        if (!e.isTrusted || e.target.type !== "checkbox" || !activeTab()) return;
        if (OPT.link === "b") rerunActive(readForm());
      });
    }

    // デッキ・統計タブ（本物の setupTabs のハンドラの「後」に、検索パネルを畳む）
    deckTab.addEventListener("click", () => { leaveSearch(); deckTab.setAttribute("aria-selected", "true"); });
    statsTab.addEventListener("click", () => { leaveSearch(); statsTab.setAttribute("aria-selected", "true"); });

    // キーボード（R5）: ← → でタブ間を移動、Delete で検索タブを閉じる
    strip.addEventListener("keydown", (e) => {
      const all = [...strip.querySelectorAll('[role="tab"]')];
      const i = all.indexOf(doc.activeElement);
      if (i < 0) return;
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        const j = (i + (e.key === "ArrowRight" ? 1 : -1) + all.length) % all.length;
        all[j].focus(); all[j].click();
      } else if (e.key === "Delete" && all[i].id.startsWith("ed-tab-st")) {
        e.preventDefault();
        closeTab(all[i].id.replace("ed-tab-", ""));
      }
    });

    // ---------- 復元（① B: ブラウザに残す）----------
    const restoredActiveN = restore();
    renderStrip();
    if (tabs.length && OPT.reload === "last" && restoredActiveN != null) {
      const t = tabs.find((x) => x.n === restoredActiveN);
      if (t) activate(t.id); // ⭐ 開いたタブだけ再検索する。ほかのタブは押したときに検索する
    }

    // 親ページ（モックの操作パネル）から触るための口
    window.__mockTabs = {
      state: () => ({ tabs: tabs.map((t) => ({ n: t.n, qs: toQs(t.cond), loaded: t.loaded, count: t.count })), next, active: activeTab() ? activeTab().n : null, key: STORE_KEY }),
      clearStore: () => { try { localStorage.removeItem(STORE_KEY); } catch (e) { /* noop */ } },
      closeAll: () => { [...tabs].forEach((t) => closeTab(t.id)); },
      opt: OPT,
    };
    doc.documentElement.dataset.mockReady = "1";
  }
})();
