"use strict";
/*
 * カード検索コントローラ — トップページとデッキ構築ツールで共用。
 * 公式API(api.gatcg.com)の検索と、日本語入力時のローカル訳検索(I18N.cards)を
 * 同じページング(run/loadMore)で扱う。描画はページ側(onResults)が行う。
 *
 * 使い方:
 *   const ctl = GA_CARD_SEARCH.create({
 *     els: { name, text, cls, element, type, subtype, set, sort, order }, // 使わない欄は省略可
 *     pageSize: 50, jpPageSize: 40,
 *     fetchCard(slug),   // 日本語検索時のカード取得(省略時は公式APIをfetch)
 *     onStart(reset),
 *     onResults(cards, { reset, jpMode, total, hasMore }),
 *     onError(err, { reset }),
 *   });
 *   ctl.run(true);       // 新規検索
 *   ctl.loadMore();      // 次ページ追記
 *
 * els.set の value は I18N.meta.sets のインデックス。els.order は dataset.dir に "ASC"/"DESC" を持つボタン。
 */
window.GA_CARD_SEARCH = (() => {
  const API = "https://api.gatcg.com";
  const I18N = window.GA_I18N || { meta: {}, terms: {}, cards: {} };
  const { hasJapanese, bannedFormats } = window.GA_CARD_I18N;

  // エキスパンション定義（製品ライン → prefix 群）
  const SETS = (I18N.meta && I18N.meta.sets) || [];

  function setPrefixes(val) {
    if (val === "" || val == null) return []; // 「全て」（Number("") が 0 になる罠を回避）
    const i = Number(val);
    const s = Number.isInteger(i) ? SETS[i] : null;
    return s ? s.prefixes : [];
  }

  // ---------- フィルタ選択肢の生成 ----------

  // エレメントの表示順: 基本属性(ノーム→火→水→風)→上級属性(アルファベット順)→EXALTED。
  // デッキ構築ツールのゾーン内ソート(BASIC_ELEMENT_ORDER)と同じ考え方。
  // EXALTEDは常に基本属性と組で付く修飾属性のため末尾に置く。
  const BASIC_ELEMENTS = ["NORM", "FIRE", "WATER", "WIND"];
  function elementKeys(map) {
    const keys = Object.keys(map);
    const head = BASIC_ELEMENTS.filter((k) => keys.includes(k));
    const tail = keys.filter((k) => !BASIC_ELEMENTS.includes(k) && k !== "EXALTED").sort();
    if (keys.includes("EXALTED")) tail.push("EXALTED");
    return head.concat(tail);
  }

  function fillSelect(select, kind) {
    const map = (I18N.meta && I18N.meta[kind]) || {};
    const keys = kind === "elements" ? elementKeys(map) : Object.keys(map).sort();
    keys.forEach((key) => {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = `${key}（${map[key]}）`;
      select.appendChild(opt);
    });
  }

  // エキスパンション選択肢（value は SETS のインデックス）
  function fillSetSelect(select) {
    SETS.forEach((s, i) => {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = s.label;
      select.appendChild(opt);
    });
  }

  // フォーマット絞り込み（使用可3種＋禁止2種）。value は "<FORMAT>:<STATE>" 形式。
  // データ列挙値ではなく意味的フィルタのため「KEY（訳）」形式にせず日本語のみ。
  const FORMAT_FILTERS = [
    ["STANDARD:LEGAL", "スタンダードで使用可"],
    ["PANTHEON:LEGAL", "パンテオンで使用可"],
    ["DRAFT:LEGAL", "ドラフトで使用可"],
    ["STANDARD:RESTRICTED", "スタンダード禁止"],
    ["PANTHEON:RESTRICTED", "パンテオン禁止"],
  ];
  function fillFormatSelect(select) {
    FORMAT_FILTERS.forEach(([value, text]) => {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = text;
      select.appendChild(opt);
    });
  }

  // ---------- コントローラ ----------

  function create(opts) {
    const els = opts.els || {};
    const PAGE_SIZE = opts.pageSize || 50;
    const JP_PAGE_SIZE = opts.jpPageSize || 40;
    const pager = { page: 1, total: 0, hasMore: false };
    let seq = 0;       // 競合するリクエストの取り違え防止
    let jpSlugs = null; // 日本語検索モード中のローカル一致slug一覧(新規検索ごとに作り直す)

    const trimmed = (elm) => (elm ? elm.value.trim() : "");
    const val = (elm) => (elm ? elm.value : "");

    // 名前欄・効果テキスト欄それぞれの日本語入力を返す（無ければ ""）
    // サーバーは英語データのみのため、日本語はローカル訳（name/effect）から検索する。
    function jpNameQuery() {
      const n = trimmed(els.name);
      return n && hasJapanese(n) ? n : "";
    }
    function jpEffectQuery() {
      const t = trimmed(els.text);
      return t && hasJapanese(t) ? t : "";
    }
    function isJpTextMode() {
      return jpNameQuery() !== "" || jpEffectQuery() !== "";
    }

    function buildQuery(page) {
      const p = new URLSearchParams();
      const q = trimmed(els.name);
      if (q) p.set("name", q);
      const text = trimmed(els.text);
      if (text) p.set("effect", text); // 効果テキスト検索（英語）。日本語はJPモードで別処理
      if (val(els.cls)) p.set("class", val(els.cls));
      if (val(els.element)) p.set("element", val(els.element));
      if (val(els.type)) p.set("type", val(els.type));
      if (val(els.subtype)) p.set("subtype", val(els.subtype));
      if (val(els.format)) {
        // "<FORMAT>:<STATE>"。サーバー側で legality_format × legality_state 絞り込み（ページング正確）
        const [fmt, state] = val(els.format).split(":");
        p.set("legality_format", fmt);
        p.set("legality_state", state);
      }
      setPrefixes(val(els.set)).forEach((pre) => p.append("prefix", pre)); // エキスパンション（複数prefix）
      p.set("sort", els.sort ? (els.sort.value || "name") : "name");
      p.set("order", els.order ? (els.order.dataset.dir || "ASC") : "ASC");
      p.set("page", String(page));
      p.set("page_size", String(PAGE_SIZE));
      return p.toString();
    }

    // ローカル訳を検索して slug の配列を返す。
    // 名前欄の日本語は name のみ、効果欄の日本語は effect のみに一致させる（両方あれば AND）。
    function localJpSlugs() {
      const nq = jpNameQuery().toLowerCase();
      const eq = jpEffectQuery().toLowerCase();
      const cards = I18N.cards || {};
      const out = [];
      for (const slug in cards) {
        const c = cards[slug];
        if (nq && !String(c.name || "").toLowerCase().includes(nq)) continue;
        if (eq && !String(c.effect || "").toLowerCase().includes(eq)) continue;
        out.push(slug);
      }
      return out.sort();
    }

    // class/element/type/subtype/set の絞り込みにカードが合致するか（JPモードの客側フィルタ用）
    function matchesActiveFilters(card) {
      if (val(els.cls) && !(card.classes || []).includes(val(els.cls))) return false;
      if (val(els.element) && !(card.elements || []).includes(val(els.element))) return false;
      if (val(els.type) && !(card.types || []).includes(val(els.type))) return false;
      if (val(els.subtype) && !(card.subtypes || []).includes(val(els.subtype))) return false;
      if (val(els.format)) {
        // bannedFormats()=limit0判定はAPIのRESTRICTEDと同義。LEGAL=禁止でない／RESTRICTED=禁止
        const [fmt, state] = val(els.format).split(":");
        const banned = bannedFormats(card).includes(fmt);
        if (state === "LEGAL" ? banned : !banned) return false;
      }
      const pre = setPrefixes(val(els.set));
      if (pre.length) {
        const eds = card.editions || card.result_editions || [];
        if (!eds.some((e) => e.set && pre.includes(e.set.prefix))) return false;
      }
      return true;
    }

    function fetchCard(slug) {
      if (opts.fetchCard) return opts.fetchCard(slug);
      return fetch(`${API}/cards/${encodeURIComponent(slug)}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
    }

    async function run(reset) {
      const mySeq = ++seq;
      if (reset) {
        pager.page = 1;
        jpSlugs = isJpTextMode() ? localJpSlugs() : null;
      }
      if (opts.onStart) opts.onStart(reset);
      try {
        let cards, total, hasMore;
        if (jpSlugs) {
          const from = (pager.page - 1) * JP_PAGE_SIZE;
          const batch = jpSlugs.slice(from, from + JP_PAGE_SIZE);
          const fetched = await Promise.all(batch.map((s) => fetchCard(s)));
          if (mySeq !== seq) return;
          cards = fetched.filter((c) => c && matchesActiveFilters(c));
          total = jpSlugs.length; // 追加の絞り込みは客側適用のため、総数には反映されない
          hasMore = from + JP_PAGE_SIZE < jpSlugs.length;
        } else {
          const res = await fetch(`${API}/cards/search?${buildQuery(pager.page)}`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = await res.json();
          if (mySeq !== seq) return;
          cards = json.data || [];
          total = json.total_cards || 0;
          hasMore = !!json.has_more;
        }
        pager.total = total;
        pager.hasMore = hasMore;
        opts.onResults(cards, { reset, jpMode: !!jpSlugs, total, hasMore });
      } catch (err) {
        if (mySeq !== seq) return;
        if (!reset && pager.page > 1) pager.page -= 1; // 追記失敗はページを戻して再試行可能に
        if (opts.onError) opts.onError(err, { reset });
      }
    }

    function loadMore() {
      if (!pager.hasMore) return;
      pager.page += 1;
      run(false);
    }

    return { run, loadMore, pager, isJpTextMode };
  }

  return { create, fillSelect, fillSetSelect, fillFormatSelect, setPrefixes };
})();
