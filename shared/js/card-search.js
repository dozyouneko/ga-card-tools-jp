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
 *     onResults(cards, { reset, jpMode, total, hasMore, andMode, approxTotal, blocked }),
 *     onError(err, { reset }),
 *   });
 *   ctl.run(true);       // 新規検索
 *   ctl.loadMore();      // 次ページ追記
 *
 * els.set の value は I18N.meta.sets のインデックス。els.order は dataset.dir に "ASC"/"DESC" を持つボタン。
 *
 * cls/element/type/subtype は <select>(単一選択)でも、fillChips() が作るチップ群
 * (複数選択+AND/OR)でも渡せる。デッキ構築ツールは前者、カードDBは後者を使う。
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

  // ---------- 複数選択（チップ群 + AND/OR）----------

  // 属性玉アイコン(shared/css/element-orbs.css)がある属性。EXALTED は玉画像が無いため含まない。
  // scripts/lib/element-orbs.json のキーと対応する。
  const ORB_ELEMENTS = ["NORM", "FIRE", "WATER", "WIND", "ARCANE", "ASTRA", "CRUX", "EXIA", "LUXEM", "NEOS", "TERA", "UMBRA"];

  // サブタイプは146種あるため既定は出現頻度の上位20種だけ出す(残りは「すべて表示」で開く)。
  // tmp/api-cache/cards-snapshot.json（2,240枚・2026-07-22）から出現数の降順で算出したもの。
  // この20種で 2,239/2,240 枚(=ほぼ全カード)がいずれかに該当する。
  const SUBTYPE_TOP = [
    "CLERIC", "SPELL", "HUMAN", "MAGE", "TAMER", "WARRIOR", "GUARDIAN", "SKILL", "RANGER", "ASSASSIN",
    "REACTION", "SWORD", "ANIMAL", "ACCESSORY", "AUTOMATON", "ARTIFACT", "SPECTER", "BEAST", "CHESSMAN", "SPIRIT",
  ];

  // 複属性カードは EXALTED+基本属性 の70枚しか存在しないため、
  // それ以外のエレメントANDは検索するまでもなく0件になる（この文言を出して検索を止める）。
  const ELEMENT_AND_MESSAGE =
    "この組み合わせに該当するカードはありません。複数エレメントを持つカードは「EXALTED＋基本属性（NORM/FIRE/WATER/WIND）」の組み合わせのみです。";

  function chipLabel(key, jp, orb) {
    const label = document.createElement("label");
    label.className = "chip";
    const box = document.createElement("input");
    box.type = "checkbox";
    box.value = key;
    label.appendChild(box);
    if (orb) {
      const i = document.createElement("i");
      i.className = `orb orb-${key.toLowerCase()}`;
      label.appendChild(i);
    }
    const jpSpan = document.createElement("span");
    jpSpan.textContent = jp || key;
    label.appendChild(jpSpan);
    const en = document.createElement("em");
    en.textContent = key;
    label.appendChild(en);
    return label;
  }

  // <details> の中に「見出し+選択件数バッジ+AND/ORトグル」と選択チップ群を構築する。
  // 返り値は details 要素そのもの。getValues()/getMode()/reset()/onChange() を生やしてあり、
  // create({ els: { element: group } }) にそのまま渡せる。
  //   opts.label … 見出し（必須）
  //   opts.orbs  … true なら属性玉アイコンを付ける（エレメント用）
  //   opts.top   … 既定で表示するキーの配列（残りは「すべて表示」で開く。サブタイプ用）
  function fillChips(details, kind, opts) {
    opts = opts || {};
    const map = (I18N.meta && I18N.meta[kind]) || {};
    const keys = kind === "elements" ? elementKeys(map) : Object.keys(map).sort();
    const head = opts.top ? opts.top.filter((k) => keys.includes(k)) : keys;
    const rest = opts.top ? keys.filter((k) => !head.includes(k)) : [];

    details.className = "fgroup";
    const summary = document.createElement("summary");
    const flabel = document.createElement("span");
    flabel.className = "flabel";
    flabel.textContent = opts.label || kind;
    const badge = document.createElement("span");
    badge.className = "fbadge";
    badge.hidden = true;
    const andor = document.createElement("span");
    andor.className = "andor";
    andor.setAttribute("role", "group");
    andor.setAttribute("aria-label", `${opts.label || kind}の複数選択をANDとORのどちらで扱うか`);
    const modeBtns = ["AND", "OR"].map((m) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = m;
      b.dataset.mode = m;
      andor.appendChild(b);
      return b;
    });
    summary.append(flabel, badge, andor);

    const chips = document.createElement("div");
    chips.className = "chips";
    head.forEach((k) => chips.appendChild(chipLabel(k, map[k], opts.orbs && ORB_ELEMENTS.includes(k))));

    details.append(summary, chips);

    let restChips = null;
    let moreBtn = null;
    if (rest.length) {
      restChips = document.createElement("div");
      restChips.className = "chips chips-rest";
      restChips.hidden = true;
      rest.forEach((k) => restChips.appendChild(chipLabel(k, map[k], false)));
      const more = document.createElement("p");
      more.className = "more";
      moreBtn = document.createElement("button");
      moreBtn.type = "button";
      moreBtn.className = "morebtn";
      moreBtn.textContent = `＋ すべて表示（${keys.length}種）`;
      const hint = document.createElement("span");
      hint.className = "hint";
      hint.textContent = `よく使う${head.length}種を表示中`;
      more.append(moreBtn, hint);
      details.append(restChips, more);
    }

    // エレメントANDで0件が確定する組み合わせの警告（グループを閉じていても分かるよう status にも出す）
    const warn = document.createElement("p");
    warn.className = "fwarn";
    warn.setAttribute("role", "status");
    warn.hidden = true;
    details.appendChild(warn);

    let mode = "OR"; // 既定はOR（要望の主目的「norm or wind」が直感的に動くように）
    let changed = null;

    const boxes = () => details.querySelectorAll('.chip input[type="checkbox"]');
    const getValues = () => Array.from(boxes()).filter((b) => b.checked).map((b) => b.value);

    function sync() {
      const n = getValues().length;
      badge.hidden = n === 0;
      badge.textContent = String(n);
      // 値が1つ以下ならAND/ORの区別が無意味なので操作させない
      modeBtns.forEach((b) => {
        b.disabled = n < 2;
        const on = b.dataset.mode === mode;
        b.classList.toggle("on", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
      andor.classList.toggle("idle", n < 2);
      Array.from(boxes()).forEach((b) => b.closest(".chip").classList.toggle("on", b.checked));
    }

    details.addEventListener("change", (e) => {
      if (e.target.type !== "checkbox") return;
      sync();
      if (changed) changed();
    });
    modeBtns.forEach((b) => {
      b.addEventListener("click", (e) => {
        e.preventDefault(); // summary 内のボタンなので、既定動作(details の開閉)を止める
        if (b.disabled || mode === b.dataset.mode) return;
        mode = b.dataset.mode;
        sync();
        if (changed) changed();
      });
    });
    if (moreBtn) {
      moreBtn.addEventListener("click", () => {
        restChips.hidden = !restChips.hidden;
        moreBtn.textContent = restChips.hidden ? `＋ すべて表示（${keys.length}種）` : "− よく使う分だけ表示";
      });
    }

    details.getValues = getValues;
    details.getMode = () => mode;
    details.onChange = (cb) => { changed = cb; };
    details.warnEl = warn;
    details.reset = () => {
      Array.from(boxes()).forEach((b) => { b.checked = false; });
      mode = "OR";
      details.open = false;
      warn.hidden = true;
      if (restChips) {
        restChips.hidden = true;
        moreBtn.textContent = `＋ すべて表示（${keys.length}種）`;
      }
      sync();
    };
    sync();
    return details;
  }

  // <select>（単一選択）とチップ群（複数選択）の両方から選択値・AND/ORを取り出す
  function valuesOf(elm) {
    if (!elm) return [];
    if (typeof elm.getValues === "function") return elm.getValues();
    return elm.value ? [elm.value] : [];
  }
  function modeOf(elm) {
    return elm && typeof elm.getMode === "function" ? elm.getMode() : "OR";
  }

  // 複数選択できる絞り込み項目（els のキー / APIのクエリ名 / カードの配列プロパティ）
  const MULTI = [
    ["cls", "class", "classes"],
    ["element", "element", "elements"],
    ["type", "type", "types"],
    ["subtype", "subtype", "subtypes"],
  ];

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

    const vals = (key) => valuesOf(els[key]);
    // 2値以上をANDで指定している項目か。1値ならAND/ORで結果は変わらない
    const isAnd = (key) => modeOf(els[key]) === "AND" && vals(key).length > 1;
    const anyAnd = () => MULTI.some(([key]) => isAnd(key));

    // ANDのときにAPIへ送る1値。返るのはANDの結果を必ず包含する上位集合になる。
    // エレメントは EXALTED を優先する（成立するANDは必ずEXALTEDを含み、かつEXALTEDは全70枚と最も絞れるため）。
    function andSeed(key, list) {
      if (key === "element" && list.includes("EXALTED")) return "EXALTED";
      return list[0];
    }

    // エレメントANDのうち、構造的に必ず0件になる組み合わせか（複属性は EXALTED+基本属性 のみ）
    function elementAndBlocked() {
      const list = vals("element");
      if (modeOf(els.element) !== "AND" || list.length < 2) return false;
      if (list.length > 2) return true;
      if (!list.includes("EXALTED")) return true;
      const other = list[0] === "EXALTED" ? list[1] : list[0];
      return !BASIC_ELEMENTS.includes(other);
    }

    // カードの配列プロパティが選択値に合致するか（AND=すべて含む / OR=いずれかを含む）
    function matchesMulti(card, key, field) {
      const list = vals(key);
      if (!list.length) return true;
      const have = card[field] || [];
      return modeOf(els[key]) === "AND"
        ? list.every((v) => have.includes(v))
        : list.some((v) => have.includes(v));
    }

    // APIレスポンスの後段フィルタ。APIはANDに非対応なのでAND指定の項目だけを客側で間引く
    // （フォーマット・エキスパンションはAPI側で正しく絞られているため触らない）
    function matchesAndFilters(card) {
      return MULTI.every(([key, , field]) => !isAnd(key) || matchesMulti(card, key, field));
    }

    // 総件数が実際の該当件数より多く出る状態か（客側フィルタが後段に入るため正確に出せない）
    function isApproxTotal(jp) {
      if (!jp) return anyAnd();
      return MULTI.some(([key]) => vals(key).length > 0)
        || !!val(els.format)
        || setPrefixes(val(els.set)).length > 0;
    }

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
      // 複数値: ORは同名パラメータの繰り返しでAPIが処理する（エキスパンションの prefix と同じ方式）。
      // ANDはAPIが非対応のため1値だけ送り、残りは run() の後段フィルタで間引く。
      MULTI.forEach(([key, param]) => {
        const list = vals(key);
        if (!list.length) return;
        if (isAnd(key)) p.append(param, andSeed(key, list));
        else list.forEach((v) => p.append(param, v));
      });
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
      for (const [key, , field] of MULTI) {
        if (!matchesMulti(card, key, field)) return false;
      }
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
        if (elementAndBlocked()) {
          // 検索するまでもなく0件が確定する組み合わせ。APIを叩かずに結果なしとして返す
          pager.total = 0;
          pager.hasMore = false;
          opts.onResults([], {
            reset, jpMode: false, total: 0, hasMore: false,
            andMode: true, approxTotal: false, blocked: "element-and",
          });
          return;
        }
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
          // AND指定はAPIが上位集合しか返せないため、このページ分をここで間引く。
          // 取得したページ内で間引くので、ページごとの表示件数は不揃いになる
          if (anyAnd()) cards = cards.filter(matchesAndFilters);
          total = json.total_cards || 0;
          hasMore = !!json.has_more;
        }
        pager.total = total;
        pager.hasMore = hasMore;
        opts.onResults(cards, {
          reset, jpMode: !!jpSlugs, total, hasMore,
          andMode: anyAnd(), approxTotal: isApproxTotal(!!jpSlugs), blocked: null,
        });
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

  return {
    create, fillSelect, fillChips, fillSetSelect, fillFormatSelect, setPrefixes,
    SUBTYPE_TOP, ELEMENT_AND_MESSAGE,
  };
})();
