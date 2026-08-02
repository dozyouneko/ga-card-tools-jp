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
 *     metaIndexUrl,      // JP検索の取得前フィルタ用メタ索引(#27)
 *     effectsUrl,        // 訳の効果JSON(#22)。効果欄に日本語が入ったときだけ取得する
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
 * cls/element/type/subtype は fillChips() が作るチップ群(複数選択+AND/OR)を渡す。
 * カードDB・デッキ構築ツールとも同じ(#31 で統一)。
 * ⚠ modeOf()/valuesOf() は getMode()/getValues() を持たない素の <select> にも
 *   フォールバックするが、そのような呼び出し元は現在無い(#32 で fillSelect も削除済み)。
 * set/format は <select> のまま(fillSetSelect()/fillFormatSelect() が選択肢を構築する)。
 */
window.GA_CARD_SEARCH = (() => {
  const API = "https://api.gatcg.com";
  const I18N = window.GA_I18N || { meta: {}, terms: {}, cards: {} };
  const { hasJapanese, bannedFormats, loadEffects } = window.GA_CARD_I18N;

  // エキスパンション定義（製品ライン → prefix 群）
  const SETS = (I18N.meta && I18N.meta.sets) || [];

  function setPrefixes(val) {
    if (val === "" || val == null) return []; // 「全て」（Number("") が 0 になる罠を回避）
    const i = Number(val);
    const s = Number.isInteger(i) ? SETS[i] : null;
    return s ? s.prefixes : [];
  }

  // URL共有(#20)用の添字⇔キー変換。<select> の value は SETS の添字だが、
  // 添字はリストの並びが変わると別の版を指してしまうため、URLには prefixes[0]
  // （全55版で1個かつ一意）を安定キーとして書く。
  function setKeyOf(val) {
    const pre = setPrefixes(val);
    return pre.length ? pre[0] : "";
  }
  function setIndexOf(key) {
    if (!key) return "";
    const k = String(key).toUpperCase();
    const i = SETS.findIndex((s) => s.prefixes && s.prefixes.length && s.prefixes[0].toUpperCase() === k);
    return i >= 0 ? String(i) : ""; // 無ければ「全て」（古いURL・手打ちで壊れないように）
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

  // ---------- 複数選択（チップ群 + AND/OR）----------

  // 属性玉アイコン(shared/css/element-orbs.css)がある属性。EXALTED は玉画像が無いため含まない。
  // scripts/lib/element-orbs.json のキーと対応する。
  const ORB_ELEMENTS = ["NORM", "FIRE", "WATER", "WIND", "ARCANE", "ASTRA", "CRUX", "EXIA", "LUXEM", "NEOS", "TERA", "UMBRA"];

  // サブタイプは147種あるため既定は出現頻度の上位20種だけ出す(残りは「すべて表示」で開く)。
  // 下の順位は tmp/api-cache/cards-snapshot.json（2,240枚・2026-07-22）から出現数の降順で算出したもの。
  // ⚠ snapshot 側の異なり数は146。フリップ面22件を収録しないため SHENJU が現れないだけで、齟齬ではない。
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
      // AND/ORトグルは常時有効にする。1値以下では結果が変わらないので実害がなく、
      // 「先にANDを選んでから値を選ぶ」操作ができるほうが分かりやすいため
      modeBtns.forEach((b) => {
        const on = b.dataset.mode === mode;
        b.classList.toggle("on", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
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
        if (mode === b.dataset.mode) return;
        mode = b.dataset.mode;
        sync();
        // 1値以下では結果が変わらないので検索し直さない（無駄なAPIリクエストを出さない）
        if (changed && getValues().length > 1) changed();
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
    // URLからの復元用（#20）。復元中に1項目ずつ検索が走らないよう onChange は発火させない
    details.setValues = (list) => {
      const want = new Set((list || []).map((v) => String(v).toUpperCase()));
      let inRest = false;
      Array.from(boxes()).forEach((b) => {
        b.checked = want.has(b.value.toUpperCase());
        if (b.checked && restChips && restChips.contains(b)) inRest = true;
      });
      // 「すべて表示」に隠れた値を復元したときは展開する（バッジだけ増えてチップが見えないのを防ぐ）
      if (inRest && restChips.hidden) {
        restChips.hidden = false;
        moreBtn.textContent = "− よく使う分だけ表示";
      }
      sync();
    };
    details.setMode = (m) => {
      const up = String(m || "").toUpperCase();
      if (up !== "AND" && up !== "OR") return; // 不正値は無視
      mode = up;
      sync();
    };
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

  // ---------- 数値項目の並び替え（#39）----------

  // 公式APIは PostgreSQL 既定の null 順序で返すため、降順にすると
  // 「その項目を持たないカード」が先頭を全部埋めてしまう（level なら 2,116枚）。
  // そこで数値項目で並べ替えるときは、その項目を持たないカードを結果から除く:
  //   昇順 … APIの ASC を N件（=非nullの件数）で打ち切る
  //   降順 … APIには ASC を送り、位置 N-1 → 0 を逆順に読む
  // API自身が sort=cost_memory で既にこの挙動をしている（473件しか返さない）。
  const NUMERIC_SORTS = ["level", "power", "life", "cost_memory"];

  // 件数表示の注記に使う項目名（並び替えプルダウンの表記に合わせる）
  const NUMERIC_SORT_LABELS = {
    level: "レベル", power: "パワー", life: "ライフ", cost_memory: "コスト",
  };

  // cost_memory の -1 は Xコストの表現で、APIはこれを null と同じ位置に並べる（該当1枚）。
  // ⚠ 除外規則はここ1箇所。APIの応答（isNullish）とメタ索引の値（isNullishValue）の
  //   両方から使うので、片方に書き写さないこと（#43 §6.2。食い違うと片方だけ静かに壊れる）
  function isNullishValue(field, v) {
    return v == null || (field === "cost_memory" && v === -1);
  }
  function isNullish(field, card) {
    return isNullishValue(field, card ? card[field] : null);
  }

  // 「全 124 件（レベルを持つカードのみ）」の括弧部分。数値項目以外は空文字
  function numericSortNote(field) {
    const label = NUMERIC_SORT_LABELS[field];
    return label ? `（${label}を持つカードのみ）` : "";
  }

  // 0件メッセージ用の項目名（「パワーを持つカードはありませんでした」）。
  // ラベル表を各ページに書き写さないよう関数で公開する（#43 §7.3）
  function numericSortLabel(field) {
    return NUMERIC_SORT_LABELS[field] || "";
  }

  // JPモードの並び替えに関する注記（#43 §7.2）。索引が使えない/一部欠けるときだけ出る
  function jpSortNote(info) {
    if (!info || !info.jpMode) return "";
    if (info.jpSortDropped) return "（並び替えの情報を取得できなかったため、名前順で表示しています）";
    if (info.jpSortUnknown > 0) return `（うち${info.jpSortUnknown}件は並び替えの情報が無いため末尾にあります）`;
    return "";
  }

  // メタ索引の entry[6]（数値4項目）の並び。gen-card-meta-index.mjs の NUM_FIELDS と対応する
  const NUM_POS = { level: 0, power: 1, life: 2, cost_memory: 3 };

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
    let jpCand = null;  // 上記を索引で「取得前」に絞った候補(#27)。新規検索ごとに作り直す
    let jpApprox = false; // JPモードの件数が概算か(索引が使えず/未収録slugが混じるとき)
    let jpSortUnknown = 0;     // JPモードで並び替えキーが不明だった件数(末尾へ回した数・#43)
    let jpSortDropped = false; // 索引が全く使えず並び替え自体を諦めたか(#43)
    let metaIdxPromise = null; // 索引fetchのメモ化(初回JP検索のときだけ実行し以降は再利用)

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

    // JPモードで class/element/type/subtype/format/set のいずれかを絞り込んでいるか。
    // 総件数が概算になるか(jpApprox)の判定に使う。非JPモードの概算判定は anyAnd()。
    function hasJpFilters() {
      return MULTI.some(([key]) => vals(key).length > 0)
        || !!val(els.format)
        || setPrefixes(val(els.set)).length > 0;
    }

    // ---------- JPモードの取得前フィルタ用メタ索引（#27）----------
    // data/card-meta-index.json を「JPモードに初めて入ったとき」だけ fetch し、Promiseを保持して再利用する
    // （card-cache.js の mem と同じ方式）。失敗・不正・未設定は null に倒す（fail-open）。
    function metaIndex() {
      if (metaIdxPromise) return metaIdxPromise;
      const url = opts.metaIndexUrl;
      if (!url) { metaIdxPromise = Promise.resolve(null); return metaIdxPromise; }
      metaIdxPromise = fetch(url)
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => (j && Array.isArray(j.d) && j.m ? j : null))
        .catch(() => null);
      return metaIdxPromise;
    }

    // 索引エントリ（トークンID配列）に絞り込みが合致するか。matchesActiveFilters と同じ規則を、
    // カード本体の代わりに索引の列挙値へ適用する。索引に無いslugは true（候補に残す=fail-open）。
    function metaMatches(idx, slug) {
      const entry = idx.m[slug];
      if (!entry) return true; // 索引未収録は除外しない（取得後フィルタが判定する）
      const d = idx.d;
      const dec = (arr) => (arr || []).map((i) => d[i]);
      const pseudo = {
        classes: dec(entry[0]), elements: dec(entry[1]),
        types: dec(entry[2]), subtypes: dec(entry[3]),
      };
      for (const [key, , field] of MULTI) {
        if (!matchesMulti(pseudo, key, field)) return false;
      }
      if (val(els.format)) {
        const [fmt, state] = val(els.format).split(":");
        const banned = dec(entry[5]).includes(fmt);
        if (state === "LEGAL" ? banned : !banned) return false;
      }
      const pre = setPrefixes(val(els.set));
      if (pre.length) {
        const prefixes = dec(entry[4]);
        if (!pre.some((x) => prefixes.includes(x))) return false;
      }
      return true;
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

    const sortField = () => (els.sort ? (els.sort.value || "name") : "name");
    const orderDir = () => (els.order ? (els.order.dataset.dir || "ASC") : "ASC");
    // 数値項目での並び替えか（JPモードでもメタ索引の値で同じ規則が効く・#43）
    const isNumericSort = () => NUMERIC_SORTS.includes(sortField());

    // sort/order/page/page_size を除いた絞り込みだけのパラメータ。
    // N のキャッシュキーにも使うため、並び替えの指定はここに含めない
    function filterParams() {
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
      return p;
    }

    // opt.order / opt.pageSize で並び替え方向・件数を上書きできる（N の二分探索が使う）
    function buildQuery(page, opt) {
      const o = opt || {};
      const p = filterParams();
      p.set("sort", sortField());
      p.set("order", o.order || orderDir());
      p.set("page", String(page));
      p.set("page_size", String(o.pageSize || PAGE_SIZE));
      return p.toString();
    }

    async function apiSearch(page, opt) {
      const res = await fetch(`${API}/cards/search?${buildQuery(page, opt)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
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

    // ---------- JPモードの並び替え（#43）----------
    // JPモードは公式APIの検索を使わず「候補slugを決めてから1枚ずつ取得する」構造のため、
    // 取得前に全候補の並び替えキーを知っている必要がある。キーはメタ索引から取る。

    // 並び替えキーを索引から取り出す。
    //   数値/文字列 … キーが確定した
    //   null        … 「その項目を持たない」ことが確定した（数値項目のみ。#39 の規則で除外する）
    //   undefined   … 索引に無い・旧形式 ＝ 不明（除外せず末尾へ）
    function sortKeyOf(idx, slug, field) {
      if (field === "name") return slug;                // 索引不要（slug順のまま・#43 §6.1）
      const entry = idx && idx.m[slug];
      if (!entry || entry.length < 8) return undefined; // 未収録 or 旧形式（fail-open）
      if (field === "rarity") {
        const names = (entry[4] || []).map((i) => idx.d[i]);
        const rar = entry[7] || [];
        const pre = setPrefixes(val(els.set));
        // エキスパンション絞り込み中は、そのセット内の min で並べる
        // （公式APIの sort=rarity が「絞り込み後のedition の min」で並ぶため）
        const use = names.map((p, i) => ((!pre.length || pre.includes(p)) ? rar[i] : null))
          .filter((v) => v != null);
        return use.length ? Math.min(...use) : undefined;
      }
      const pos = NUM_POS[field];
      if (pos === undefined) return undefined;
      return (entry[6] || [])[pos];                     // 値 or null or undefined
    }

    // 候補slug列を並べ替える。reset のときに1回だけ呼ぶ（loadMore では呼ばない）。
    // ⚠ 比較関数は必ず全順序にする（同点は slug で決める）。怠ると Array#sort の安定性に
    //   依存した「元の並び次第で変わる」順序になる
    function sortJpCand(idx, list) {
      const field = sortField();
      const dir = orderDir() === "DESC" ? -1 : 1;
      const numeric = isNumericSort();
      const keys = new Map();
      const known = [];
      const unknown = [];
      for (const slug of list) {
        const k = sortKeyOf(idx, slug, field);
        if (k === undefined) { unknown.push(slug); continue; } // 不明 → 末尾（除外しない）
        if (numeric && isNullishValue(field, k)) continue;     // その項目を持たない → 除外（#39）
        keys.set(slug, k);
        known.push(slug);
      }
      known.sort((a, b) => {
        const ka = keys.get(a);
        const kb = keys.get(b);
        if (ka !== kb) return (ka < kb ? -1 : 1) * dir;
        return (a < b ? -1 : a > b ? 1 : 0) * dir; // 同点は slug（降順＝昇順の完全な逆順）
      });
      unknown.sort(); // 索引が無いので方向に依らず slug 昇順で固定
      return { list: known.concat(unknown), unknown: unknown.length };
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

    // ---------- 数値ソートの N（その項目を持つカードの件数）----------

    // N は絞り込みの組み合わせごとに変わるので、絞り込み＋sort をキーにセッション内でキャッシュする。
    // これが無いと昇順⇄降順を切り替えるたびに最大15リクエストの二分探索が走る
    const nCache = new Map();

    function countNonNull() {
      // ⚠ キーと探索条件は「同じスナップショット」から作る。二分探索は最大15回の逐次リクエスト
      // （数秒）なので、途中でUIを触られても探索条件が動かないよう、ここで固定して渡す
      const base = filterParams().toString();
      const field = sortField();
      const key = `${base}|${field}`;
      if (nCache.has(key)) return nCache.get(key);
      const p = probeNonNullCount(base, field).catch((err) => {
        nCache.delete(key); // 失敗を焼き付けない（再検索でやり直せるように）
        throw err;
      });
      nCache.set(key, p);
      return p;
    }

    // 位置 k（1始まり）のカードが nullish かを1枚ずつ引いて二分探索する。
    // 昇順では非nullが位置 0..N-1 に連続し、以降が全部 null になる（境界は1点だけ）。
    // ⚠ base/field は呼び出し元が固定した探索条件。ここで現在のUIを読み直してはいけない
    //   （読み直すと、探索中の絞り込み変更で誤った N が「変更前のキー」で焼き付く）
    async function probeNonNullCount(base, field) {
      const fetchAt = async (page, pageSize) => {
        const res = await fetch(`${API}/cards/search?${base}&sort=${encodeURIComponent(field)}&order=ASC&page=${page}&page_size=${pageSize}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      };
      // ⚠ page_size=1 は total_cards が常に 1 になるため、総数の取得には使えない
      const first = await fetchAt(1, 2);
      const total = first.total_cards || 0;
      if (!total) return 0;

      const probe = async (k) => {
        const json = await fetchAt(k, 1);
        const data = json.data || [];
        // 想定外の応答。並び順の正しさに関わるため黙って倒さず、エラーとして表に出す（#39 §9）
        if (!data.length) throw new Error(`並び替えの範囲を特定できませんでした（位置 ${k}）`);
        return isNullish(field, data[0]);
      };

      if (!(await probe(total))) return total; // null が1枚も無い
      if (await probe(1)) return 0;            // 全部 null
      let lo = 1;
      let hi = total;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (await probe(mid)) hi = mid;
        else lo = mid;
      }
      return lo;
    }

    // 数値ソートの1ページ分を取得する。降順はAPIに ASC を送り、位置を逆から読む。
    // 位置は0始まり。⚠ PAGE_SIZE はトップ50・デッキ構築24と異なるので定数を直接使うこと
    async function fetchNumericPage(page, n) {
      const P = PAGE_SIZE;
      if (orderDir() !== "DESC") {
        const start = (page - 1) * P;
        if (start >= n) return { cards: [], hasMore: false };
        const json = await apiSearch(page, { order: "ASC" });
        // ASC は N件で打ち切る（N以降は全部 nullish）
        return { cards: (json.data || []).slice(0, n - start), hasMore: start + P < n };
      }
      const from = n - 1 - (page - 1) * P; // 降順ページの先頭（大きい位置）
      if (from < 0) return { cards: [], hasMore: false };
      const to = Math.max(n - page * P, 0); // 下限（この位置を含む）
      const pageA = Math.floor(to / P) + 1;
      const pageB = Math.floor(from / P) + 1; // 範囲は高々P件なので、跨ぐのは高々2ページ
      const nums = pageA === pageB ? [pageA] : [pageA, pageB];
      const jsons = await Promise.all(nums.map((k) => apiSearch(k, { order: "ASC" })));
      // ページごとに自分の基準位置で引く（末尾ページが欠けても位置がずれないように）
      const parts = nums.map((k, i) => ({ base: (k - 1) * P, data: jsons[i].data || [] }));
      const at = (pos) => {
        for (const part of parts) {
          const i = pos - part.base;
          if (i >= 0 && i < part.data.length) return part.data[i];
        }
        return null;
      };
      const cards = [];
      for (let pos = from; pos >= to; pos -= 1) {
        const c = at(pos);
        if (c) cards.push(c);
      }
      return { cards, hasMore: to > 0 };
    }

    async function run(reset) {
      const mySeq = ++seq;
      // onStart は「検索中…」表示とグリッドのクリアを行うため、効果JSONの取得(下)より前に呼ぶ。
      // 初回の日本語効果検索はここで待ちが入るので、その間もユーザーには進行中と分かる(R1)
      if (opts.onStart) opts.onStart(reset);
      if (reset) {
        // 日本語の効果検索は I18N.cards[].effect を走査する。効果は遅延読み込みなので
        // 「効果欄に日本語が入っているときだけ」ここで取得を待つ(#22 フェーズ2)。
        // 名前だけの日本語検索では取得しない — ここが緩むとフェーズ2の意味が消える
        if (jpEffectQuery()) {
          await loadEffects(opts.effectsUrl);
          if (mySeq !== seq) return;
        }
        pager.page = 1;
        jpSlugs = isJpTextMode() ? localJpSlugs() : null;
        jpCand = null;   // 索引での取得前絞り込みは jpSlugs 確定後に1回だけ作る
        jpApprox = false;
        jpSortUnknown = 0;
        jpSortDropped = false;
      }
      try {
        let cards, total, hasMore;
        if (elementAndBlocked()) {
          // 検索するまでもなく0件が確定する組み合わせ。APIを叩かずに結果なしとして返す
          pager.total = 0;
          pager.hasMore = false;
          opts.onResults([], {
            reset, jpMode: false, total: 0, hasMore: false,
            andMode: true, approxTotal: false, blocked: "element-and",
            numericSort: null, jpSortUnknown: 0, jpSortDropped: false, jpMatched: 0,
          });
          return;
        }
        if (jpSlugs) {
          // 候補は新規検索(reset)時に1回だけ作って保持する。loadMore で作り直すと、
          // その間に絞り込みUIが変わった場合にページ境界がずれるため。
          if (jpCand === null) {
            const idx = await metaIndex();
            if (mySeq !== seq) return;
            let base;
            if (idx) {
              base = jpSlugs.filter((s) => metaMatches(idx, s));
              // 索引未収録slug（新規翻訳・フリップ面漏れ等）が絞り込み下で候補に残ると総数が過大に出る
              jpApprox = hasJpFilters() && jpSlugs.some((s) => !idx.m[s]);
            } else {
              // 索引が使えない → 現状の挙動に劣化（全件を候補にして取得後フィルタに委ねる）
              base = jpSlugs;
              jpApprox = hasJpFilters();
            }
            // 並び替えは絞り込みの「後」に行う（除外で件数が減ってからのほうが比較回数が少ない）
            const s = sortJpCand(idx, base);
            jpCand = s.list;
            jpSortUnknown = s.unknown;
            // 全件のキーが不明＝並び替え自体を諦めた（索引が取れない/旧形式）。
            // ⚠ 候補0件のときは「諦めた」ではないので base.length > 0 を条件に含める
            jpSortDropped = base.length > 0 && s.unknown === base.length && sortField() !== "name";
          }
          const from = (pager.page - 1) * JP_PAGE_SIZE;
          const batch = jpCand.slice(from, from + JP_PAGE_SIZE);
          const fetched = await Promise.all(batch.map((s) => fetchCard(s)));
          if (mySeq !== seq) return;
          // 索引はコミット済みの静的データで古くなり得るため、取得後フィルタを最終判断として残す
          cards = fetched.filter((c) => c && matchesActiveFilters(c));
          total = jpCand.length;
          hasMore = from + JP_PAGE_SIZE < jpCand.length;
        } else if (isNumericSort()) {
          // その項目を持たないカードを結果から除く（昇順・降順とも）。#39
          const n = await countNonNull();
          if (mySeq !== seq) return;
          const res = await fetchNumericPage(pager.page, n);
          if (mySeq !== seq) return;
          cards = res.cards;
          if (anyAnd()) cards = cards.filter(matchesAndFilters);
          total = n;
          hasMore = res.hasMore;
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
          andMode: anyAnd(), approxTotal: jpSlugs ? jpApprox : anyAnd(), blocked: null,
          // 件数表示の注記用（#39）。JPモードでも除外が効くようになった（#43）が、
          // 並び替え自体を諦めたとき（jpSortDropped）は除外も起きていないので付けない
          // — 付けると「全 577 件（レベルを持つカードのみ）」という嘘の注記になる
          numericSort: isNumericSort() && !jpSortDropped ? sortField() : null,
          jpSortUnknown: jpSlugs ? jpSortUnknown : 0,
          jpSortDropped: jpSlugs ? jpSortDropped : false,
          // 日本語テキストに一致した件数（絞り込み・除外の前）。0件メッセージの出し分けに使う。
          // ⚠ jpMode は「JPモードか」でしかなく、日本語一致が0件でも true になる（#43 §7.3）
          jpMatched: jpSlugs ? jpSlugs.length : 0,
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
    create, fillChips, fillSetSelect, fillFormatSelect,
    setPrefixes, setKeyOf, setIndexOf, numericSortNote, numericSortLabel, jpSortNote,
    SUBTYPE_TOP, ELEMENT_AND_MESSAGE,
  };
})();
