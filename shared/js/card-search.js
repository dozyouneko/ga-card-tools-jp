"use strict";
/*
 * カード検索コントローラ — トップページとデッキ構築ツールで共用。
 * 公式API(api.gatcg.com)の検索と、日本語入力時のローカル訳検索(I18N.cards)を
 * 同じページング(run/loadMore)で扱う。描画はページ側(onResults)が行う。
 *
 * 使い方:
 *   const ctl = GA_CARD_SEARCH.create({
 *     els: { q, cls, element, type, subtype, set, sort, order }, // 使わない欄は省略可
 *     pageSize: 50, jpPageSize: 40,
 *     metaIndexUrl,      // JP検索の取得前フィルタ用メタ索引(#27)
 *     effectsUrl,        // 訳の効果JSON(#22)。JPモードに入ったら取得する(#111 §5-7)
 *     fetchCard(slug),   // 日本語検索時のカード取得(省略時は公式APIをfetch)
 *     onStart(reset),
 *     onProgress({ done, total }),  // 数値ソートの全件取得中の進捗(ページ数)。省略可(#44)
 *     onResults(cards, { reset, jpMode, total, hasMore, andMode, approxTotal, blocked }),
 *     onError(err, { reset }),
 *   });
 *   ctl.run(true);       // 新規検索
 *   ctl.loadMore();      // 次ページ追記
 *
 * このほかに、左ペインの部品を2つ提供する(どちらもオプトイン・左ペイン化_設計 §7-3 / §7-4):
 *   GA_CARD_SEARCH.createSelectedFilters({ container, list, groups, onChange, onRemoveOne }) → { render }
 *   GA_CARD_SEARCH.initAccordion({ groups, minWidth })
 *
 * els.q は「カード名＋効果テキスト」をまとめて検索する入力欄1つ（#111）。
 * ⚠ かつての els.name（名前欄）／els.text（効果欄）は無い。渡しても一切見ないので、
 *   移行し忘れたページでは「入力しても1件も絞られない」という誰でも気づく壊れ方になる。
 * els.set の value は I18N.meta.sets のインデックス。els.order は dataset.dir に "ASC"/"DESC" を持つボタン。
 *
 * cls/element/type/subtype/rarity は fillChips() が作るチップ群(複数選択+AND/OR)を渡す。
 * ⭐ rarity はトップ・デッキ構築の両方が渡す(左ペイン化_設計 §7-1 でデッキ構築にも足した)。
 * ⚠ 渡さないページがあっても valuesOf(null)=[] / modeOf(null)="OR" で完全な no-op になる
 *   (#S1・出したくなったら els に足すだけ)。
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

  // ---------- 版レベルの絞り込みに合わせた絵柄の選択（#41 → #97 で一本化）----------

  // ⭐ 「版レベルの絞り込み」＝ 版（editions[]）の属性で絞る条件の、唯一の定義（#97）。
  // ⚠ 項目を足すときはここだけを直す。npm run validate が許可リスト（ART_COND_ALLOW）と
  //   双方向に突き合わせ、「そのキーだけで先頭以外が選ばれる」行動フィクスチャも要求する。
  // ⚠ ⭐ ここをページ側（app.js / tools/deck-builder/app.js）へコピーで戻さないこと——
  //   かつて2つに分かれていて、片方だけ直すと画面によって別の絵柄が出る状態だった（#97）。
  //   [cond のキー, imgs[] の属性名, els のキー, els からの読み方]
  const ART_COND = [
    ["prefixes", "prefix", "set", (els) => setPrefixes(els.set ? els.set.value : "")],
    ["rarities", "rarity", "rarity", (els) => valuesOf(els.rarity).map(String)],
  ];

  // 絞り込みUIの要素群（els）から「版レベルの絞り込み条件」を取り出す。
  // ⭐ 取り出しと判定を分けているのは、デッキ構築ツールが条件を検索タブごとに凍結して
  //   持ち回るため（生の els を渡す形にすると「もっと見る」や裏のタブの絵柄が
  //   左ペインの「いま」で決まってしまう＝検索結果のタブ化_設計 V22 の不具合）。
  function artCondOf(els) {
    const src = els || {};
    const cond = {};
    for (const [key, , , read] of ART_COND) cond[key] = read(src);
    return cond;
  }

  // 版レベルの絞り込みで検索している場合、その条件に一致する版のイラストを初期表示にする。
  // 絞り込みが無い、または一致する版が無い場合は先頭（imgs[0]）にフォールバック。
  // ⚠ 有効な条件が複数あるときは AND —— 片方だけ一致する版を選ばない。
  // ⚠ その属性を持たない版（rarity が null 等）は選ばない。
  // ⭐ タイルの初期表示・🎨バッジの版表示・印刷リストに入る版・カード詳細モーダルの初期表示は、
  //   すべてこの戻り値から決まる。
  // ⚠ 根拠は editions（cardImages 経由）だけにする。result_editions は全件取得経路で
  //   delete されるため、並び替えを変えると絵柄が変わることになる（#44）。
  function preferredArtIndex(imgs, cond) {
    const src = cond || {};
    const active = ART_COND
      .map(([key, attr]) => [attr, (src[key] || []).map(String)])
      .filter(([, v]) => v.length);
    if (!active.length) return 0;
    const list = imgs || [];
    const idx = list.findIndex((im) =>
      active.every(([attr, v]) => im[attr] != null && v.includes(String(im[attr]))));
    return idx >= 0 ? idx : 0;
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

  // 「選択肢が多い群」に出す絞り込み欄の閾値（設計書「チップ絞り込み欄」§2）。
  // ⚠ サブタイプ決め打ちにしない。⭐ 将来ほかの群がここを超えた日に、何もしなくても欄が現れる
  //   （＝#40 のような「新しい値が来たら手で足す」箇所を増やさない）。
  //   実測（2026-09-03）: エレメント13 / クラス9 / タイプ13 / レアリティ9 / サブタイプ157
  const SEARCH_MIN = 30;

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
  //   opts.search … true なら「選択肢を絞り込む入力欄」を出す（オプトイン）。
  //     ⚠ 渡しても実際に出るのは選択肢が SEARCH_MIN 種を超える群だけ（下記）。
  //     ⚠ 渡さない呼び出し側（デッキ構築ツール）では要素そのものが作られない＝完全な no-op。
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
    let moreHint = null;
    let moreWrap = null;   // 「すべて表示」ボタンを包む <p>（絞り込み中は隠す）
    if (rest.length) {
      restChips = document.createElement("div");
      restChips.className = "chips chips-rest";
      restChips.hidden = true;
      rest.forEach((k) => restChips.appendChild(chipLabel(k, map[k], false)));
      moreWrap = document.createElement("p");
      moreWrap.className = "more";
      moreBtn = document.createElement("button");
      moreBtn.type = "button";
      moreBtn.className = "morebtn";
      moreHint = document.createElement("span");
      moreHint.className = "hint";
      moreWrap.append(moreBtn, moreHint);
      details.append(restChips, moreWrap);
    }

    // 「すべて表示」の文言を1か所で決める。⚠ 開閉は click / setValues / reset の3か所から
    // 起こるので、各所に文言を書き分けない（2026-09-03: 補助テキストだけ更新漏れがあり、
    // 展開後も「よく使う20種を表示中」が出たままだった）
    function syncMore() {
      if (!moreBtn) return;
      const expanded = !restChips.hidden;
      moreBtn.textContent = expanded ? "− よく使う分だけ表示" : `＋ すべて表示（${keys.length}種）`;
      moreHint.textContent = expanded ? `全${keys.length}種を表示中` : `よく使う${head.length}種を表示中`;
    }
    syncMore();

    // ---------- 選択肢を絞り込む入力欄（設計書「チップ絞り込み欄」§3〜§5）----------
    // ⭐ 絞るのは「選択肢」であってカードではない。入力しても再検索は走らない（C3）。
    // ⚠ .chips-rest の表示状態を書く4人目になる（他は moreBtn の click / setValues / reset）。
    //   文言は syncMore() だけが書く。ここは件数を別要素（.cfhint）に出す（S-2）。
    let cfInput = null;
    let cfHint = null;
    // 検索を始める直前の restChips.hidden。入力が空に戻ったらここへ復元する（S-1）。
    // ⚠ 「常に畳む」にすると、ユーザーが自分で開いた状態を検索が勝手に畳んでしまう。
    let restBeforeSearch = null;
    const allChips = () => Array.from(details.querySelectorAll(".chip"));
    // 入力が空のときの .cfhint。⭐ その群の選択肢の総数を出し、「絞る対象はカードではなく
    // 選択肢である」ことを数で伝える（C1 の訂正・1.1）。⚠ ハードコードしない
    const emptyHint = () => `${keys.length}種`;

    // 絞り込みを「掛けていない状態」に戻す（入力・件数・チップの hidden を素に戻す）。
    // ⚠ restChips.hidden はここでは触らない（reset / setValues 側の既存処理に任せる）
    function clearChipFilter() {
      if (!cfInput) return;
      cfInput.value = "";
      cfHint.textContent = emptyHint();
      restBeforeSearch = null;
      if (moreWrap) moreWrap.hidden = false;
      allChips().forEach((c) => { c.hidden = false; });
    }

    function applyChipFilter() {
      const q = cfInput.value.trim().toLowerCase();
      const searching = q !== "";
      if (searching && restBeforeSearch === null) {
        restBeforeSearch = restChips ? restChips.hidden : false;
      }
      if (restChips) {
        // C-A: 検索中は「よく使う分」の外まで対象にする（隠れたままだと残りを取りこぼす）
        if (searching) restChips.hidden = false;
        else if (restBeforeSearch !== null) restChips.hidden = restBeforeSearch;
        syncMore();
      }
      if (moreWrap) moreWrap.hidden = searching;
      if (!searching) restBeforeSearch = null;
      let shown = 0;
      let keptSelected = 0; // 一致しないが選択済みなので残したチップ（C-B・C7）
      allChips().forEach((c) => {
        const hit = !searching || c.textContent.toLowerCase().includes(q);
        const box = c.querySelector('input[type="checkbox"]');
        // C-B: 選択済みは一致しなくても残す（消すと「選んだのに外せない」状態になる）
        const keep = hit || (box && box.checked);
        c.hidden = !keep;
        if (hit) shown += 1;
        else if (keep) keptSelected += 1;
      });
      // ⚠ 「一致なし」なのにチップが見えている状態は紛らわしいので、選択済みが残っている
      //   ことを文言で明かす（C7・1.1）
      cfHint.textContent = !searching ? emptyHint()
        : shown ? `${shown}件が一致`
        : keptSelected ? "一致なし（選択中のみ表示）"
        : "一致なし";
    }

    if (opts.search && keys.length > SEARCH_MIN) {
      const cfBox = document.createElement("div");
      cfBox.className = "cfilter";
      cfInput = document.createElement("input");
      cfInput.type = "search";
      cfInput.className = "cfinput";
      // ⚠ 「カードを検索する欄」と誤解されないよう、群の内側に置き破線の枠にする（C1）。
      // ⚠ ⭐ 1.1 の訂正: 320pxの左ペインでは長い文言が見切れ、「英字でも一致する」手がかりが
      //   消えていた。⭐ 日本語と英字を両方見せることを最優先にし、それ以外は削る。
      //   選択肢の総数は .cfhint 側（emptyHint）が担う。⚠ title 属性は付けない
      //   （マウスオーバー前提の情報はスマホで見えない）
      cfInput.placeholder = "絞り込む… ドラゴン / dragon";
      // ⚠ aria-live は付けない。一致件数が打鍵ごとに読み上げられると邪魔になる（C5）
      cfInput.setAttribute("aria-label", `${opts.label || kind}の選択肢を絞り込む`);
      cfHint = document.createElement("span");
      cfHint.className = "cfhint";
      cfHint.textContent = emptyHint();
      cfBox.append(cfInput, cfHint);
      summary.after(cfBox);
      cfInput.addEventListener("input", applyChipFilter);
      cfInput.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;
        // ⚠ 入力があるときだけ止めて中身を消す。空のときは止めない
        //   （スマホのボトムシートを Esc で閉じたいため・C4）
        if (!cfInput.value) return;
        e.stopPropagation();
        // ⚠ ⭐ ここで clearChipFilter() を呼んではいけない（2026-09-03 のレビュー M1-1）。
        //   同関数は restBeforeSearch を null に戻すため、続く applyChipFilter() の
        //   復元条件（restBeforeSearch !== null）が成立せず、⚠ Esc のときだけ
        //   「検索前の展開状態に戻す」（S-1）が効かなくなる。
        //   ⭐ Backspace / ネイティブの ✕ と同じ経路（値を空にして input 相当の再判定）に揃える。
        //   ⚠ clearChipFilter() は reset()/setValues() 専用（あちらは復元してはいけない）。
        cfInput.value = "";
        applyChipFilter();
      });
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
        syncMore();
      });
    }

    details.getValues = getValues;
    details.getMode = () => mode;
    // URLからの復元用（#20）。復元中に1項目ずつ検索が走らないよう onChange は発火させない
    details.setValues = (list) => {
      // ⚠ 復元前に絞り込みを解除する（S-4）。絞ったままだと「選択済みは残す」（C-B）と
      //   競合し、復元した値だけが見えて他が消えた状態になる
      clearChipFilter();
      const want = new Set((list || []).map((v) => String(v).toUpperCase()));
      let inRest = false;
      Array.from(boxes()).forEach((b) => {
        b.checked = want.has(b.value.toUpperCase());
        if (b.checked && restChips && restChips.contains(b)) inRest = true;
      });
      // 「すべて表示」に隠れた値を復元したときは展開する（バッジだけ増えてチップが見えないのを防ぐ）
      if (inRest && restChips.hidden) {
        restChips.hidden = false;
        syncMore();
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
      clearChipFilter(); // ⚠ 検索欄も空にする（S-3）。忘れると選択肢が絞られたまま残る
      Array.from(boxes()).forEach((b) => { b.checked = false; });
      mode = "OR";
      details.open = false;
      warn.hidden = true;
      if (restChips) {
        restChips.hidden = true;
        syncMore();
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
  // ⚠ 第3要素が null の項目は「カード直下に配列プロパティが無い」＝ 版（editions[]）を見る項目で、
  //   create() 内の editionSetOf()／rarityMatchesIn() が2段階で判定する（意味統一の設計書 §4）。
  //   同時に「メタ索引に列挙値が無い」印でもあり、metaMatches() は候補を落とさない（fail-open）。
  const MULTI = [
    ["cls", "class", "classes"],
    ["element", "element", "elements"],
    ["type", "type", "types"],
    ["subtype", "subtype", "subtypes"],
    // レアリティは card 直下に無く editions[].rarity にある（card.rarities は存在しない）
    ["rarity", "rarity", null],
  ];

  // ⭐ 「メタ索引には見えない条件」の唯一の定義（設計書 §5 P4）。第3要素が null＝カード直下に
  //    配列プロパティが無く、索引の列挙値にも入っていない項目のこと。
  // ⚠ この判定を使う場所は3つある（metaMatches の読み飛ばし／D-1 の概算判定／D-2 の想定内除外）。
  //    ⭐ 必ずこの関数から導くこと——別々にハードコードすると片方だけ直したときに静かにずれる。
  const isIndexBlind = (entry) => entry[2] === null;

  // ---------- テキスト検索（カード名と効果テキストの一本化・#111）----------

  // ⭐ トークン化の唯一の出所。JPモードとENモードが同じものを使う（#111 §5-1）。
  //   - 空白（半角・全角）で語に分ける＝語ごとに AND・場所は問わない（ユーザー決定 D3）
  //   - "…" で囲んだ部分は1トークン（句）として扱う。閉じ忘れも句として拾う
  // ⭐ 引用符が要る理由: 空白を素直に AND にすると「ひとくちキーワード解説」の用語リンク
  //   134本のうち 74本が壊れる（On Banish が 3件 → 569件・#111 N-j）。
  // ⚠ 小文字化して返す。呼び出し側で toLowerCase しないこと（二重に書くと片方だけ直る）。
  function textTokens(s) {
    const out = [];
    const src = String(s == null ? "" : s).replace(/　/g, " "); // 全角空白も区切りにする
    const re = /"([^"]*)"?|([^\s"]+)/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      const t = (m[1] !== undefined ? m[1] : m[2]).trim().toLowerCase();
      if (t) out.push(t);
    }
    return out;
  }

  // ⭐ 一致の述語の唯一の出所（#111 §3-1）。
  //     nameTexts   = card.name ∪ 裏面（editions[].other_orientations[]）の name
  //     effectTexts = card.effect_raw ∪ 版ごとの effect_raw ∪ 裏面の effect_raw
  //     hit(card, t) = そのいずれかが t を部分文字列として含む（小文字化）
  // ⭐ これで公式APIの name= / effect= と完全に同じ結果になることを 40語・2,495枚で実測した
  //   （不一致 0。うち12語は slug 集合まで突き合わせて完全一致・#111 §3-2）。
  // ⚠ effect ではなく effect_raw を見る。effect は **太字** マークを持ち、自カード名が
  //   CARDNAME というプレースホルダになっているので、effect を見ると取りこぼす
  //   （実測: "buff counter" が 157件 → 1件 ／ under-fire が fire に当たらなくなる・N-b）。
  // ⚠ 裏面と版ごとの効果文を外すと APIより狭くなる（fire 111→110 ／ counter 583→582・N-c/N-d）。
  // ⚠ result_editions は見ない（全件取得路で delete されるため・#44 §2.4）。
  // ⚠ card.editions を破壊しない（card-cache.js が同じオブジェクトを持ち回る・#107）。読むだけ。
  const lcText = (s) => String(s == null ? "" : s).toLowerCase();
  function searchTextsOf(card) {
    const out = [card.name, card.effect_raw || card.effect];
    for (const e of card.editions || []) {
      out.push(e.effect_raw || e.effect);
      for (const o of e.other_orientations || []) out.push(o.name, o.effect_raw || o.effect);
    }
    return out;
  }
  function matchesText(card, tokens) {
    if (!tokens || !tokens.length) return true;
    if (!card) return false;
    const texts = searchTextsOf(card).map(lcText);
    return tokens.every((t) => texts.some((x) => x.includes(t)));
  }

  // ⭐ 旧 qtext（効果テキスト欄）を新しい1欄の文字列へ畳む（#111 §9-1）。
  //   共有URL・「ひとくちキーワード解説」の旧リンク・デッキ構築の localStorage に保存済みの
  //   検索タブが、いずれも qtext を持っている。
  // ⚠ ⭐ 変換はここ1か所。2つの app.js にコピーしないこと
  //   （0件文言・用語ハイライト・preferredArtIndex に続く二重定義を増やさない）。
  // ⭐ 旧 qtext は「効果テキストの句」の意味だったので、空白があれば " で囲んで句にする。
  // ⚠ すでに " を含むときは触らない（新しい形の値をそのまま尊重する）。
  function mergeLegacyText(q, qtext) {
    const a = String(q == null ? "" : q).trim();
    const b = String(qtext == null ? "" : qtext).trim();
    if (!b) return a;
    const phrase = !b.includes('"') && /\s/.test(b) ? `"${b}"` : b;
    return a ? `${a} ${phrase}` : phrase;
  }

  // ---------- 数値項目の並び替え（#39 → #44 で全件取得に変更）----------

  // 公式APIは PostgreSQL 既定の null 順序で返すため、降順にすると
  // 「その項目を持たないカード」が先頭を全部埋めてしまう（level なら 2,116枚）。
  // そこで数値項目で並べ替えるときは、その項目を持たないカードを結果から除く。
  // API自身が sort=cost_memory で既にこの挙動をしている（473件しか返さない）。
  //
  // ⚠ さらに公式APIは数値項目でソートすると**ページングが壊れる**（#44）。同点行の第2ソートキーが
  //   無いため、同点がページ境界に当たると1枚が2ページに重複し、代わりに別の1枚が一度も返らない
  //   （実測: level昇順・全2,240件で4枚が欠落 / type=champion併用で125件中2枚）。
  //   → APIには**安定キー `collector_number`** を送って絞り込み結果を全件取り、
  //     除外・並び替え・ページングは**すべてローカルで行う**（fetchAllPages / sortNumeric）。
  const NUMERIC_SORTS = ["level", "power", "life", "cost_memory"];

  // 数値ソートの全件取得（#44）
  const STABLE_SORT = "collector_number"; // 全2,240件を捲り切って重複0・欠落0（実測）
  const ALL_PAGE_SIZE = 50;               // 公式APIの page_size 上限
  const ALL_CONCURRENCY = 6;              // 並列度。12でも17.2秒→18.6秒とほぼ変わらない（実測2026-08-06・429なし）
  const MAX_PAGES = 60;                   // 暴走止め。2,240件÷50=45が現状の上限
  // 絞り込みを変えるたび全件集合が積み上がるのを防ぐ。
  // ⚠ ⭐ 4 では足りない（#111 §5-3）。union 路は1回の検索で2キー使うので、FIFO 4 のままだと
  //   全件路の集合がすぐ追い出される。⭐ ヒット時にキーを入れ直して LRU にしてある。
  const ALL_CACHE_MAX = 6;

  // ⭐ ENテキストモードで union 路（最安トークンの name= ∪ effect=）を使う上限ページ数（#111 §5-3）。
  // ⭐ 定数でよい理由: name=t / effect=t はどちらも「絞り込みだけの集合」の部分集合なので、
  //   union 路のページ数は全件路の2倍を超えない＝定数で切っても最適な路より最大2倍しか損しない。
  const TEXT_UNION_MAX_PAGES = 20;
  // ⭐ ENテキストモードで検索を始める最小のトークン長（#111 §5-6）。
  //   実測（カード名の先頭N文字）: 全件路（50ページ・約40秒）に落ちる割合は
  //   1文字 84.6% / 2文字 33.0% / 3文字 1.5% / 4文字 0.1% / 5文字 0%。
  // ⚠ JPモードには適用しない（1文字でも全部ローカル照合＝0リクエスト）。
  const TEXT_MIN_LEN = 3;

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

  // 取得後に落ちた件数の注記（#45）。フリップ面を畳んだあとは「出たら異常」の信号になる
  // （索引の腐りによる過剰包含・取得失敗・畳み漏れのいずれか）
  function jpDropNote(info) {
    if (!info || !info.jpMode || !info.jpDropped) return "";
    return `（うち${info.jpDropped}件は取得後の判定で除いたため表示されていません）`;
  }

  // 数値ソートの全件取得が total_cards と食い違ったときの注記（#44 §5）。
  // `collector_number` の安定性は実測でありAPIの保証ではないため、取得後に必ず突き合わせる。
  // ⚠ ここは fail-open —— 注記を出して結果は表示する（黙って落とさない・エラーにもしない）
  function fetchGapNote(info) {
    const gap = info && info.fetchGap;
    if (!gap) return "";
    return `（APIの申告は ${gap.total} 件ですが ${gap.unique} 件しか取得できませんでした）`;
  }


  // SEARCH-STATUS:START
  // 検索結果の件数欄に出す文言と「もっと見る」の出し分け（#101）。
  // ⚠ トップ（app.js）とデッキ構築（tools/deck-builder/app.js）が同じ文言を丸ごと複製していたのを
  //   ここ1箇所へ寄せた。⚠ 呼び出し側へ文言を書き戻さないこと——npm run validate が
  //   このマーカーの中の文言を2つの app.js から探し、見つかったら exit 1 にする（#101 §6）。
  // ⚠ shown は DOM 由来（タイルの枚数）なので呼び出し側が数えて渡す。この関数は DOM を触らない。
  // ⚠ 分岐の順序を入れ替えないこと（element-and → short-text → shown === 0 → 件数行）。とくに
  //   element-and / short-text の早期returnは shown を問わず先頭で判定するのが役割で、後ろへ
  //   動かすと前の検索のタイルが残ったまま「N 件を表示」が出る。
  // ⚠ 同じファイル内の注記関数は ?. を付けずに直接呼ぶ（消したときに無言で空文字にしないため）。
  // 戻り値の showLoadMore は今日の全経路で !!info.hasMore と一致するが、「文言は出すが
  // 『もっと見る』は隠す」分岐を片方の画面にだけ書く穴を塞ぐために2値で返す（#101 D2）。
  function searchStatus(info, shown) {
    if (info.blocked === "element-and") {
      return { text: ELEMENT_AND_MESSAGE, showLoadMore: false };
    }
    if (info.blocked === "short-text") {
      // ⭐ ENテキストモードの3文字ガード（#111 §5-6）。公式APIを1回も叩いていない状態の案内。
      // ⚠ これは「0件」ではなく「検索していない」である（#114 のユーザー決定A/B で
      //   0件文言は増やさないと決まっているので、0件側の分岐には足さない）。
      return {
        text: "英語で検索するときは3文字以上入力してください。",
        showLoadMore: false,
      };
    }
    if (shown === 0) {
      // AND条件や取得後の判定は取得済みのページに対して適用するため、このページに1件も
      // 残らないことがある。⚠ 続きのページに該当が残っているなら「もっと見る」を必ず残す——
      //   ここで「ありません」と言い切ると、実際には次のページに出るのに探すのをやめさせる
      //   （1画面目0枚→もっと見る→3枚、という実例が再現している＝#114 V16）。
      // ⚠ 候補を自動で追い掛けない（0件の間だけ次ページを取る案は明示的に不採用）。
      //   良かれと思って自動追従を足すと、操作なしで外部APIへの待ちが発生する
      // ⚠ 候補件数・確認済み件数は出さない（#114 のユーザー決定B）。
      if (info.hasMore) {
        return {
          text: "このページに条件に合うカードはありませんでした。「もっと見る」で続きを確認できます。",
          showLoadMore: true,
        };
      }
      // 0件が確定した（「もっと見る」が出ない）ときは、短い1文だけを出す（#114 のユーザー決定A）。
      // ⚠ 原因の説明とヒントの括弧書きは意図的に落としてある——数値並び替えで全滅(#43)・
      //   絞り込みで全滅・未翻訳・カード情報の取得失敗の4つを1文にまとめる、という決定。
      //   ⚠ jpMode で出し分けない・取得失敗だけ例外にしない。「親切だから」と分岐を戻さないこと
      //   （戻すのは仕様の判断なので設計へ差し戻す。トレードオフは設計書 §3 に記録してある）
      return {
        text: "条件に合うカードがありませんでした。",
        showLoadMore: false,
      };
    }
    // 客側で後段フィルタが入る場合（日本語モードでの絞り込み）は総件数を正確に出せない。
    // ⭐ AND指定は #102 単位1 で上位集合の全件に対して間引くようになったので正確に出せる
    const totalPart = !info.approxTotal && info.total > shown ? ` / 全 ${info.total} 件` : "";
    let suffix = info.jpMode ? "（日本語テキスト一致・翻訳済みのみ）" : "";
    // 数値項目の並び替えは、その項目を持たないカードを除くので総件数が減る(#39)。理由を添える
    suffix += numericSortNote(info.numericSort);
    // JPモードの並び替えキーが取れなかった/一部欠けたときの注記(#43)
    suffix += jpSortNote(info);
    // 取得後に落ちた件数の注記(#45)。フリップ面を畳んだあとは「出たら異常」の信号
    suffix += jpDropNote(info);
    // 数値ソートの全件取得がAPIの申告件数と食い違ったときの注記(#44)。これも「出たら異常」の信号
    suffix += fetchGapNote(info);
    if (info.approxTotal) {
      // JPモードは索引で取得前に絞るためANDも件数を出せる。
      // 概算になるのは索引が使えない/未収録slugが混じるときだけ(#27)。
      // ⚠ ⭐ 非JPモード用の「（AND条件などは取得済みのページに適用するため、総件数は表示できません）」は
      //   #102 単位1 で撤去した——AND も上位集合の全件路へ寄せたので、非JPモードで
      //   approxTotal が立つ経路が1本も無くなった。⚠ 到達できない分岐は誰も試せないので
      //   「守られている文言」として残さない（#101 の字面検査が数え続けるだけになる）。
      //   ⚠ 戻すときは scripts/validate.mjs の SS_MIN も同じコミットで直す（5 → 6）
      suffix += "（一部のカードは取得後に判定するため総件数は概算です）";
    }
    return { text: `${shown} 件を表示${totalPart}${suffix}`, showLoadMore: !!info.hasMore };
  }
  // SEARCH-STATUS:END

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
    let jpDropped = 0;         // JPモードで取得後に落ちた件数(めくったページまでの累計・#45)
    let jpBlindDropped = 0;    // うち「索引が見られない条件だけが理由」の想定内の除外(D-2)。
                               // ⚠ 画面には出さない —— 新しい注記は増やさない(設計書 §5 P4)
    let jpSeen = null;         // 取得できた表面slug(重複の検出用・#45)
    let jpSortUnknown = 0;     // JPモードで並び替えキーが不明だった件数(末尾へ回した数・#43)
    let jpSortDropped = false; // 索引が全く使えず並び替え自体を諦めたか(#43)
    let jpBackHit = null;      // 裏面だけが一致した {表面slug: 裏面slug}(#46)。描画側へ info で渡す
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
    // ⚠ 版レベルの項目（isIndexBlind＝第3要素が null）はここを通さない。版の候補集合 E を
    //   先に作る必要があるため、editionSetOf()／rarityMatchesIn() が判定する（意味統一 §4）。
    //   呼び出し側は必ず isIndexBlind() で読み飛ばすが、万一通っても「絞らない」に倒す（fail-open）。
    function matchesMulti(card, key, field) {
      const list = vals(key);
      if (!list.length) return true;
      if (!field) return true; // 版レベルの項目（呼び出し側が2段階で別に判定する）
      const have = card[field] || [];
      return modeOf(els[key]) === "AND"
        ? list.every((v) => have.includes(v))
        : list.some((v) => have.includes(v));
    }

    // ---------- 版レベルの絞り込み（エキスパンション × レアリティ）----------
    // ⭐ 意味統一の設計書 §4: 版レベルの条件は「項目ごとに独立」ではなく2段階で評価する。
    //     ① エキスパンションで版の候補集合 E を作る（絞り込みが無効なら E = 全版）
    //     ② その E の中でレアリティを判定する
    // ⚠ レアリティを MULTI の一般ループに戻してはいけない。項目ごとに独立に判定すると
    //   「PTM版を持ち、かつ（別の版が）CSR」まで通り、同じ条件でも公式API＝英語モードと
    //   結果が食い違う（427通り中351通り＝82.2%で食い違っていた）。
    // ⚠ 逆に「全部を同じ版で束ねる」のも誤り。レアリティのAND指定（CでもSRでも刷られている）は
    //   複数の版にまたがる意味なので、同じ版に束ねると必ず0件になる。
    function editionSetOf(card) {
      const eds = card.editions || card.result_editions || [];
      const pre = setPrefixes(val(els.set));
      if (!pre.length) return eds; // エキスパンション絞り込みが無効 → E = 全版
      return eds.filter((e) => e.set && pre.includes(e.set.prefix));
    }

    // E の中でレアリティ条件が成立するか。
    //   OR  … ∃e∈E: rarity(e) ∈ R  （＝公式APIの prefix + rarity と完全一致）
    //   AND … ∀r∈R: ∃e∈E: rarity(e) = r（「その版群の中で両方刷られている」）
    // ⚠ els.rarity を持たないページでは valuesOf(null)=[] で常に true＝no-op
    //   （2026-09-06 以降、トップ・デッキ構築のどちらも渡している）。
    function rarityMatchesIn(eds) {
      const list = vals("rarity");
      if (!list.length) return true;
      const have = new Set(eds.map((e) => String(e.rarity)));
      return modeOf(els.rarity) === "AND"
        ? list.every((v) => have.has(v))
        : list.some((v) => have.has(v));
    }

    // APIレスポンスの後段フィルタ。APIはANDに非対応なのでAND指定の項目だけを客側で間引く
    // （フォーマット・エキスパンションはAPI側で正しく絞られているため触らない）
    // ⚠ レアリティのANDは「E（＝APIが prefix で絞ったのと同じ版群）の中で」判定する（意味統一 §4）。
    //   新しい規則はAPIの絞り込みと整合する（APIの結果は必ず上位集合）ので取りこぼさない。
    function matchesAndFilters(card) {
      for (const m of MULTI) {
        if (isIndexBlind(m)) continue; // 版レベルは下でまとめて判定
        if (isAnd(m[0]) && !matchesMulti(card, m[0], m[2])) return false;
      }
      return !isAnd("rarity") || rarityMatchesIn(editionSetOf(card));
    }

    // JPモードで class/element/type/subtype/rarity/format/set のいずれかを絞り込んでいるか。
    // 総件数が概算になるか(jpApprox)の判定に使う。
    // ⚠ ⭐ 非JPモードには概算になる経路が1本も無い（#102 単位1 で AND も全件路へ寄せた）。
    function hasJpFilters() {
      return MULTI.some(([key]) => vals(key).length > 0)
        || !!val(els.format)
        || setPrefixes(val(els.set)).length > 0;
    }

    // ⭐ D-1（§5 P4）: 索引が判定できない絞り込み（レアリティ）が有効か。
    //    有効なら候補数は実数より多くなるので、総件数を「概算」として扱う。
    // ⚠ els にその項目が無いページ（デッキ構築ツール）では valuesOf(null)=[] で常に false＝no-op。
    function indexBlindActive() {
      return MULTI.filter(isIndexBlind).some(([key]) => vals(key).length > 0);
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
      for (const m of MULTI) {
        // ⚠ 索引に列挙値が無い項目でここを絞ってはいけない。レアリティは索引の entry[7] が
        //   「prefix別の最小」しか持たないため、最小以外で刷られた版が候補から落ちる。
        //   ⭐ 落ちた候補はそもそも取得されず、取得後フィルタでは救えない（#27 の原則）。
        //   代償（件数が概算になる・想定内の除外が出る）は D-1 / D-2 で受け止める（§5 P4）。
        if (isIndexBlind(m)) continue;
        if (!matchesMulti(pseudo, m[0], m[2])) return false;
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

    // ---------- テキスト欄（カード名＋効果の一本化・#111 §5-0 / §5-6 / §5-7）----------
    // ⭐ 欄は els.q の1つだけ。⚠ els.name / els.text は見ない（上のモジュールコメント）。
    const textQuery = () => trimmed(els.q);

    // サーバーは英語データのみのため、日本語を含む入力はローカル訳（name/effect）から検索する。
    // ⚠ ⭐ 混在入力（「ロレイン draw」）も JPモードになり、全トークンを訳に当てる＝
    //   draw は訳文に無いので 0件になる。今日は英語が黙って無視されて 7件（既存の fail-open）で、
    //   0件のほうが正直だが変化である（#111 §5-7・検証項目 V13）。
    function isJpTextMode() {
      const s = textQuery();
      return s !== "" && hasJapanese(s);
    }

    // ENテキストモードのトークン。日本語を含むときは空＝JPモードが担当する。
    // ⚠ 入力が " や空白だけのときも空になる（＝テキスト条件なしとして既存の経路を通る）。
    function enTokens() {
      const s = textQuery();
      if (!s || hasJapanese(s)) return [];
      return textTokens(s);
    }

    // ⭐ ENテキストモードでは「TEXT_MIN_LEN 文字以上のトークンが1つも無い」とき検索しない
    //   （公式APIを1回も叩かない・#111 §5-6）。
    // ⚠ 短いトークンそのものは禁止しない——「a draw」は draw が種になり、a はローカルで当たる。
    // ⚠ 今日できて明日できなくなるのは英語2文字の名前検索（ab → 70件）。D2 に伴う影響として受ける。
    function shortTextBlocked() {
      const toks = enTokens();
      return toks.length > 0 && !toks.some((t) => t.length >= TEXT_MIN_LEN);
    }

    const sortField = () => (els.sort ? (els.sort.value || "name") : "name");
    const orderDir = () => (els.order ? (els.order.dataset.dir || "ASC") : "ASC");
    // 数値項目での並び替えか（JPモードでもメタ索引の値で同じ規則が効く・#43）
    const isNumericSort = () => NUMERIC_SORTS.includes(sortField());

    // sort/order/page/page_size を除いた絞り込みだけのパラメータ。
    // N のキャッシュキーにも使うため、並び替えの指定はここに含めない
    // ⚠ ⭐ テキスト欄（name= / effect=）はここに入れないこと（#111 §5-3・破壊試験 B7）。
    //   これが鍵で、全件路のキャッシュキーが「絞り込みだけ」になる＝テキストを打ち換えても
    //   再取得が起きない（実測: 2回目が 40秒 → 1.85秒）。
    //   ⭐ テキストは enTextPool() が name= / effect= を自分で足して上位集合を取り、
    //   最終的な一致は matchesText() がローカルで判定する。
    function filterParams() {
      const p = new URLSearchParams();
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

    // 非数値ソート（name / rarity）の1ページ分のクエリ。数値ソートは fetchAllPages が
    // 安定キーで全件取るため、この関数を通らない（#44）
    function buildQuery(page) {
      const p = filterParams();
      p.set("sort", sortField());
      p.set("order", orderDir());
      p.set("page", String(page));
      p.set("page_size", String(PAGE_SIZE));
      return p.toString();
    }

    // ローカル訳を検索して slug の配列を返す（#111 §5-7）。
    // ⭐ トークンごとに「訳の name ∪ 訳の effect」・トークン間は AND。
    //   ENモードの matchesText() と同じ規則を、カード本体の代わりに訳データへ適用している。
    // ⚠ ⭐ 欄が1つなので「名前だけを探している」と知る術が無い＝ #22 フェーズ2 の
    //   「名前だけの日本語検索では効果JSONを取らない」という方針は一本化で手放した
    //   （run() の loadEffects の待ちが JPモードで常に入る・破壊試験 B9）。
    function localJpSlugs() {
      const toks = textTokens(textQuery());
      const cards = I18N.cards || {};
      const out = [];
      for (const slug in cards) {
        const c = cards[slug];
        const name = String(c.name || "").toLowerCase();
        const eff = String(c.effect || "").toLowerCase();
        if (!toks.every((t) => name.includes(t) || eff.includes(t))) continue;
        out.push(slug);
      }
      return out.sort();
    }

    // フリップ面（裏面）のslugを表面slugへ畳んで重複を除く（#45）。
    // 裏面は独自の name/effect を持つので検索の対象には残すが、表示は表面カード1枚に集約される
    // （fetchCard は常に表面を返し、タイルの 🔄 両面 バッジで裏面を見られる）。
    // ⚠ 索引に f が無い（旧形式）ときは畳まない＝現状の挙動に劣化する（fail-open）。
    //   その場合の重複は取得後カウント（jpDropped）が拾う
    function foldFlip(idx, list) {
      const f = idx && idx.f;
      if (!f) return list;
      const out = [];
      const seen = new Set();
      for (const slug of list) {
        const front = f[slug] || slug;
        if (seen.has(front)) continue;
        seen.add(front);
        out.push(front);
      }
      return out;
    }

    // 「裏面だけが一致した」カードを {表面slug: 裏面slug} で返す（#46）。
    // 表面も一致しているとき（リュ・ブ／方天画戟）は入れない —— 検索語はすでにタイルに見えており、
    // 注記を出すとノイズにしかならない。
    // ⚠ 索引に f が無い（旧形式・取得失敗）ときは空を返す＝注記が出ないだけ（fail-open）
    // ⚠ 渡すのは foldFlip する前の list（folded は裏面slugを失っている）
    function backOnlyHits(idx, list) {
      const f = idx && idx.f;
      const out = {};
      if (!f) return out;
      const matched = new Set(list);
      for (const slug of list) {
        const front = f[slug];
        if (!front) continue;             // 裏面slugではない
        if (matched.has(front)) continue; // 表面も一致した → 注記なし
        if (!out[front]) out[front] = slug; // 先勝ち（list は sort 済みなので決定的）
      }
      return out;
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

    // class/element/type/subtype/rarity/set の絞り込みにカードが合致するか（JPモードの客側フィルタ用）
    // ⚠ JPモードのレアリティはここだけが判定する（metaMatches は候補を落とさない＝上の fail-open）
    // ⚠ skipIndexBlind: 索引が見られない条件（レアリティ）だけを外して判定し直すための旗（D-2）。
    //   ⭐ 通常の呼び出しでは全条件を見る。旗を立てた判定と結果が食い違ったカードは
    //     「索引の盲点だけが理由で落ちた＝想定内」であって、索引の腐りではない。
    //   ⚠ 意味は「レアリティを完全に無視する」。E の絞り込み（エキスパンション）は残す——
    //     ここで E まで外すと、エキスパンション違いで落ちたカードまで「想定内」に数えてしまう。
    function matchesActiveFilters(card, o) {
      const skipBlind = !!(o && o.skipIndexBlind);
      for (const m of MULTI) {
        if (isIndexBlind(m)) continue; // 版レベルは下の2段階でまとめて判定する
        if (!matchesMulti(card, m[0], m[2])) return false;
      }
      if (val(els.format)) {
        // bannedFormats()=limit0判定はAPIのRESTRICTEDと同義。LEGAL=禁止でない／RESTRICTED=禁止
        const [fmt, state] = val(els.format).split(":");
        const banned = bannedFormats(card).includes(fmt);
        if (state === "LEGAL" ? banned : !banned) return false;
      }
      // ① 版の候補集合 E をエキスパンションで作る（意味統一 §4）
      const eds = editionSetOf(card);
      if (setPrefixes(val(els.set)).length && !eds.length) return false;
      // ② その E の中でレアリティを判定する
      if (!skipBlind && !rarityMatchesIn(eds)) return false;
      return true;
    }

    function fetchCard(slug) {
      if (opts.fetchCard) return opts.fetchCard(slug);
      return fetch(`${API}/cards/${encodeURIComponent(slug)}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
    }

    // ---------- 数値ソートの全件取得（#44）----------

    // 取得した集合は「絞り込みだけ」をキーに保持する（並び替えの指定は filterParams に入らない）。
    // ⭐ そのため並び替えの項目・方向を変えても再取得は起きない（ローカルで並べ直すだけ＝0リクエスト）
    const allCache = new Map();

    // first を渡すと「1ページ目はもう取ってある」として再取得を省く（#111 §5-3 の
    // プローブ兼1ページ目）。⚠ キャッシュにあるときは first を無視する（既にある集合が正）。
    function fetchAll(key, first) {
      if (allCache.has(key)) {
        // ⚠ ⭐ ヒット時はキーを入れ直して LRU にする（#111 §5-3）。union 路は1回の検索で
        //   2キー使うので、FIFO のままだと全件路の集合がすぐ追い出される。
        const hit = allCache.get(key);
        allCache.delete(key);
        allCache.set(key, hit);
        return hit;
      }
      const p = fetchAllPages(key, first).catch((err) => {
        allCache.delete(key); // 失敗を焼き付けない（再検索でやり直せるように）
        throw err;
      });
      allCache.set(key, p);
      // Map は挿入順を保つので、あふれたら最も古いキーから捨てる
      while (allCache.size > ALL_CACHE_MAX) {
        allCache.delete(allCache.keys().next().value);
      }
      return p;
    }

    // 進捗の購読先。取得中の run() が1つだけ受け取る。
    // ⚠ 進行中のPromiseを別の run() が使い回すことがあるため、購読者は「発火時」に引く
    //   （開始時に捕まえた callback を持ち回すと、古いシーケンス宛てに出続ける）
    // ⭐ union 路は1回の検索で2キーを取るので、購読は複数キーを持てるようにして合算して出す
    //   （#111 §5-4）。⚠ 1キーのとき（全件路・数値ソート）は done/total がそのまま出る。
    let progressSub = null;
    function subscribeProgress(keys, fn) {
      progressSub = { keys, fn, done: new Map(), total: new Map() };
    }
    function emitProgress(key, done, total) {
      if (!progressSub || !progressSub.keys.includes(key)) return;
      progressSub.done.set(key, done);
      progressSub.total.set(key, total);
      let d = 0;
      let t = 0;
      for (const k of progressSub.keys) {
        d += progressSub.done.get(k) || 0;
        t += progressSub.total.get(k) || 0;
      }
      progressSub.fn(d, t);
    }

    // 安定キー（collector_number）で絞り込み結果を全ページ取得する。
    // ⚠ base は呼び出し元が固定した絞り込み条件。ここで現在のUIを読み直してはいけない
    //   （読み直すと、取得中の絞り込み変更で誤った集合が「変更前のキー」で焼き付く）
    async function fetchAllPages(base, first) {
      // ⚠ 1ページでも失敗したらこの検索全体を失敗させる（fail-fast）。
      //   部分集合で並べると「順位は正しいが歯抜け」という最も気づきにくい壊れ方になる
      const get = async (k) => {
        const res = await fetch(`${API}/cards/search?${base}&sort=${STABLE_SORT}&order=ASC&page=${k}&page_size=${ALL_PAGE_SIZE}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      };
      const cards = [];
      const seen = new Set();
      const push = (json) => {
        for (const c of json.data || []) {
          // result_editions は `card.editions || card.result_editions` というフォールバック専用で、
          // 検索応答には editions が必ず入るため実際には使われない。展開後サイズの43%を占めるので、
          // 全件を抱えるこの経路では捨てる（#44 §2.4）。⚠ editions は捨てられない（画像・版・prefix が要る）
          delete c.result_editions;
          const slug = c.slug || c.uuid;
          if (seen.has(slug)) continue; // 安定性はAPIの保証ではないので重複は落とす（件数の突き合わせで表に出る）
          seen.add(slug);
          cards.push(c);
        }
      };
      // ⭐ 1ページ目は呼び出し元が取っていることがある（#111 のプローブ）。あれば再取得しない
      const head = first || await get(1);
      const total = head.total_cards || 0;
      push(head);
      const pages = Math.min(Math.ceil(total / ALL_PAGE_SIZE), MAX_PAGES); // MAX_PAGES は暴走止め
      if (pages > 0) emitProgress(base, 1, pages); // 0件のときは「0/0ページ」を出さない
      const nums = [];
      for (let k = 2; k <= pages; k += 1) nums.push(k);
      let done = 1;
      for (let i = 0; i < nums.length; i += ALL_CONCURRENCY) {
        const chunk = nums.slice(i, i + ALL_CONCURRENCY);
        const jsons = await Promise.all(chunk.map(get));
        jsons.forEach(push);
        done += chunk.length;
        emitProgress(base, done, pages);
      }
      return { cards, total };
    }

    // 数値項目で並べ替える。⚠ 比較関数は必ず全順序にする（同点は slug）——
    // 怠ると Array#sort の安定性に依存した「元の並び次第で変わる」順序になる。
    // 同点も含めて slug で決めるので、降順は昇順の完全な逆順になる（sortJpCand と同じ規則）
    function sortNumeric(list, field) {
      const dir = orderDir() === "DESC" ? -1 : 1;
      list.sort((a, b) => {
        const ka = a[field];
        const kb = b[field];
        if (ka !== kb) return (ka < kb ? -1 : 1) * dir;
        const sa = a.slug || "";
        const sb = b.slug || "";
        return (sa < sb ? -1 : sa > sb ? 1 : 0) * dir;
      });
      return list;
    }

    // ---------- テキスト検索のローカル並べ替え（#111 §5-5）----------
    // ⭐ 比較器は実測で確定した。⚠ 比較関数は必ず全順序にする（同点は slug）——
    //   怠ると Array#sort の安定性に依存した順序になる。同点も slug で決めるので
    //   降順は昇順の完全な逆順（sortNumeric / sortJpCand と同じ規則）。

    // 名前順。⭐ このキー（小文字化 → 英数以外を除去）で公式APIの sort=name と
    //   2,495件の隣接ペアの逆転 0（実測）。
    // ⚠ localeCompare（105組ずれる）・素の <（119組ずれる）に替えないこと（N-g・破壊試験 B4）。
    // ⚠ 非ASCIIのカード名は今日1件も無い（実測0件）。将来現れたら除去でその文字が消えたキーに
    //   なるので、見つかった時点で測り直す。
    // ⚠ 同キーになるのは Nameless Champion の18枚だけで、そこだけ APIの内部順序と並びが違う
    //   （APIは slug 順でもない）。残り 2,477枚は API と完全に同順（#111 N1 で受けた）。
    const localNameKey = (card) => String(card.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");

    // レアリティ順。⭐ 公式APIの sort=rarity は「エキスパンション絞り込み後の版群の最小」。
    // ⚠ 「全版の最小」にすると prefix=ALC で2組逆転する（N-h・破壊試験 B5）。
    // ⭐ 規則は JPモードの sortKeyOf()（メタ索引の entry[7] の最小）と同じ。
    //   ⚠ 一本化はしない——あちらは取得前に slug を並べるのでメタ索引の値を使い、こちらは
    //   取得後にカードを並べるのでカード本体を使う＝入力が別物（#111 §5-5）。
    function localRarityKey(card) {
      const have = editionSetOf(card)
        .map((e) => Number(e.rarity))
        .filter((v) => Number.isFinite(v));
      return have.length ? Math.min(...have) : Infinity; // 版が無い/値が無い → 末尾
    }

    function sortLocal(list) {
      const field = sortField();
      if (isNumericSort()) return sortNumeric(list, field);
      const dir = orderDir() === "DESC" ? -1 : 1;
      const keyOf = field === "rarity" ? localRarityKey : localNameKey;
      list.sort((a, b) => {
        const ka = keyOf(a);
        const kb = keyOf(b);
        if (ka !== kb) return (ka < kb ? -1 : 1) * dir;
        const sa = a.slug || a.uuid || "";
        const sb = b.slug || b.uuid || "";
        return (sa < sb ? -1 : sa > sb ? 1 : 0) * dir;
      });
      return list;
    }

    // ---------- ENテキストモードの候補集合（上位集合）・#111 §5-3 ----------
    // ⭐ #44 の数値ソートと同じ形: 安定キーで上位集合を全件取り、一致・除外・並び替え・
    //   ページングはすべてローカルで行う。
    // ⭐ 路は2つあり、どちらも必ず同じ答えを返す（#111 §3-2 の帰結・検証項目 V9）:
    //     union 路 … 最安トークン t の name=t ∪ effect=t
    //                （1語の答えは union と厳密に等しく、複数語の答えはどれか1語の union の部分集合）
    //     全件路   … 絞り込みだけの全件（⭐ キーにテキストが入らないので、同じ絞り込みのまま
    //                語を変えても 0リクエストになる）
    // ⚠ ①のプローブは「1ページ目そのもの」なので、1語の検索は合計2リクエストで終わる。
    // ⚠ page_size=1 を使わないこと——公式APIは page_size=1 のとき total_cards を 1 と返す（N-e）。
    async function enTextPool(toks, base, onProg, isStale) {
      const keyOf = (field, t) => {
        const p = new URLSearchParams(base);
        p.set(field, t); // ⚠ base にテキストは入っていないので必ず末尾に付く＝キーは決定的
        return p.toString();
      };
      const probe = async (key) => {
        const res = await fetch(`${API}/cards/search?${key}&sort=${STABLE_SORT}&order=ASC&page=1&page_size=${ALL_PAGE_SIZE}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      };
      // ① プローブ兼1ページ目（2 × トークン数 のリクエストを並列で）
      const keys = [];
      toks.forEach((t) => keys.push(keyOf("name", t), keyOf("effect", t)));
      const jsons = await Promise.all(keys.map(probe));
      if (isStale()) return null;
      const firsts = new Map();
      keys.forEach((k, i) => firsts.set(k, jsons[i]));

      // ② 路を決める（cost が最小のトークン。⚠ 同値なら先頭＝ < で比べる）
      const pagesOf = (n) => Math.ceil(n / ALL_PAGE_SIZE);
      let best = null;
      for (const t of toks) {
        const n = firsts.get(keyOf("name", t)).total_cards || 0;
        const e = firsts.get(keyOf("effect", t)).total_cards || 0;
        const cost = pagesOf(n) + pagesOf(e);
        if (!best || cost < best.cost) best = { t, cost };
      }

      // ⚠ 突き合わせは #44 と同じ「APIの申告件数 vs 取得できたユニーク件数」を路の全辺で見る
      //   （fail-open の注記＝出たら異常の信号。union 路でも突き合わせる・#111 §5-4）。
      //   ⭐ ページングが健全なら辺ごとに等しいので、和も必ず等しい＝重なりでは点灯しない。
      const gapOf = (parts) => {
        const unique = parts.reduce((s, r) => s + r.cards.length, 0);
        const total = parts.reduce((s, r) => s + r.total, 0);
        return unique === total ? null : { unique, total };
      };

      // ③ 取得（どちらも既存の fetchAll / allCache を通す）
      if (best.cost <= TEXT_UNION_MAX_PAGES) {
        const kn = keyOf("name", best.t);
        const ke = keyOf("effect", best.t);
        subscribeProgress([kn, ke], onProg);
        const [N, E] = await Promise.all([
          fetchAll(kn, firsts.get(kn)),
          fetchAll(ke, firsts.get(ke)),
        ]);
        const m = new Map();
        for (const c of N.cards.concat(E.cards)) m.set(c.slug || c.uuid, c);
        return { cards: Array.from(m.values()), gap: gapOf([N, E]), route: "union" };
      }
      subscribeProgress([base], onProg);
      const all = await fetchAll(base);
      return { cards: all.cards, gap: gapOf([all]), route: "all" };
    }

    async function run(reset) {
      const mySeq = ++seq;
      // onStart は「検索中…」表示とグリッドのクリアを行うため、効果JSONの取得(下)より前に呼ぶ。
      // 初回の日本語効果検索はここで待ちが入るので、その間もユーザーには進行中と分かる(R1)
      if (opts.onStart) opts.onStart(reset);
      if (reset) {
        // 日本語検索は I18N.cards[].name と .effect を走査する。効果は遅延読み込みなので
        // ここで取得を待つ。
        // ⚠ ⭐ #111 で「JPモードに入ったら常に待つ」に変えた（#22 フェーズ2 の
        //   「名前だけの日本語検索では取得しない」を一本化で手放した）。欄が1つになり
        //   「名前だけを探している」と知る術が無いため。⭐ effectsPromise によりセッション中1回だけ。
        //   ⚠ 「効果に日本語があるときだけ」に戻すと「ロレイン」が 13件 → 7件になる（破壊試験 B9）。
        if (isJpTextMode()) {
          await loadEffects(opts.effectsUrl);
          if (mySeq !== seq) return;
        }
        pager.page = 1;
        jpSlugs = isJpTextMode() ? localJpSlugs() : null;
        jpCand = null;   // 索引での取得前絞り込みは jpSlugs 確定後に1回だけ作る
        jpApprox = false;
        jpSortUnknown = 0;
        jpSortDropped = false;
        jpBackHit = null;
        jpDropped = 0;
        jpBlindDropped = 0;
        jpSeen = new Set();
      }
      try {
        let cards, total, hasMore;
        let fetchGap = null; // 全件取得と total_cards の食い違い（#44 §5・fail-open の注記用）
        // JPモードで「候補のうち確認し終えた件数」（読み取り専用）。
        // ⚠ いまは表示に使っていない——#114 で0件文言から件数を落としたため消費側が無い。
        //   検証・デバッグから観測できるように残してある（jpBlindDropped と同じ扱い）
        // ⚠ 非JPモードでは 0 のまま返す（jpMatched 等と同じ扱い）
        let jpChecked = 0;
        // ENテキストモードのトークン（JPモード中は空＝あちらが担当する）。
        // ⚠ reset で固定しないのは isNumericSort() と同じ扱い（els を毎回読む）。
        const enToks = jpSlugs ? [] : enTokens();
        if (elementAndBlocked()) {
          // 検索するまでもなく0件が確定する組み合わせ。APIを叩かずに結果なしとして返す
          pager.total = 0;
          pager.hasMore = false;
          opts.onResults([], {
            reset, jpMode: false, total: 0, hasMore: false,
            andMode: true, approxTotal: false, blocked: "element-and", fetchGap: null,
            numericSort: null, jpSortUnknown: 0, jpSortDropped: false, jpMatched: 0, jpDropped: 0,
          });
          return;
        }
        if (shortTextBlocked()) {
          // ⭐ ENテキストモードの3文字ガード（#111 §5-6）。公式APIを1回も叩かずに返す。
          // ⚠ これは「0件」ではない——searchStatus() の short-text 分岐が案内を出す。
          // ⚠ 判定は element-and の後・取得の前。後ろへ動かすとAPIを叩いてしまう。
          pager.total = 0;
          pager.hasMore = false;
          opts.onResults([], {
            reset, jpMode: false, total: 0, hasMore: false,
            andMode: anyAnd(), approxTotal: false, blocked: "short-text", fetchGap: null,
            numericSort: null, jpSortUnknown: 0, jpSortDropped: false, jpMatched: 0, jpDropped: 0,
          });
          return;
        }
        if (jpSlugs) {
          // 候補は新規検索(reset)時に1回だけ作って保持する。loadMore で作り直すと、
          // その間に絞り込みUIが変わった場合にページ境界がずれるため。
          if (jpCand === null) {
            const idx = await metaIndex();
            if (mySeq !== seq) return;
            // フリップ面を表面へ畳んでから絞り込む（#45）。索引の裏面エントリは表面と同内容なので
            // 畳む位置が絞り込みの前後どちらでも結果は同じ。候補が減ってからのほうが後段が軽い
            const folded = foldFlip(idx, jpSlugs);
            // 「なぜ出たか」の注記用（#46）。⚠ folded ではなく畳む前の jpSlugs から作る
            jpBackHit = backOnlyHits(idx, jpSlugs);
            let base;
            if (idx) {
              base = folded.filter((s) => metaMatches(idx, s));
              // 索引未収録slug（新規翻訳・フリップ面漏れ等）が絞り込み下で候補に残ると総数が過大に出る
              jpApprox = hasJpFilters() && folded.some((s) => !idx.m[s]);
            } else {
              // 索引が使えない → 現状の挙動に劣化（全件を候補にして取得後フィルタに委ねる）
              base = folded;
              jpApprox = hasJpFilters();
            }
            // ⭐ D-1（§5 P4）: 索引が判定できない絞り込み（レアリティ）が有効なら、候補には
            //    条件に合わないカードが必ず残っている＝ jpCand.length は実数より多い。
            //    ⚠ 目的は「誤った『全N件』を出さない」こと。正確な総数を数え直すのではない
            //    （数えるには全候補を取得するしかなく、JPモードの構造上それは高くつく）。
            if (indexBlindActive()) jpApprox = true;
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
          // 索引はコミット済みの静的データで古くなり得るため、取得後フィルタを最終判断として残す。
          // ⚠ 落ちた件数を数えて画面に出す（#45）。フリップ面を畳んだあとは、ここで落ちる＝
          //   索引の腐り・取得失敗・畳み漏れのいずれかで、黙って消えると誰も気づけない
          cards = [];
          for (const c of fetched) {
            if (!c) { jpDropped += 1; continue; }                       // 取得失敗
            if (jpSeen.has(c.slug)) { jpDropped += 1; continue; }       // 畳み漏れ（表面が重複）
            if (!matchesActiveFilters(c)) {
              // ⭐ D-2（§5 P4）: 索引が見られない条件（レアリティ）だけが理由なら「想定内」。
              //   ⚠ jpDropped に混ぜない —— この注記は「出たら異常」の信号で、レアリティを
              //     使うたびに点灯させると異常検出の経路が1本死ぬ。
              //   取得失敗・畳み漏れ・索引の腐りは上と下のとおり従来どおり jpDropped に数える。
              if (matchesActiveFilters(c, { skipIndexBlind: true })) jpBlindDropped += 1;
              else jpDropped += 1;
              continue;
            }
            jpSeen.add(c.slug);
            cards.push(c);
          }
          // ⚠ total は減らさない。jpDropped は「めくったページまで」の累計なので、引くと
          //   スクロールのたびに総数が減るという、より分かりにくい表示になる
          total = jpCand.length;
          hasMore = from + JP_PAGE_SIZE < jpCand.length;
          // 候補 jpCand のうち、ここまでに確認し終えた件数（jpChecked）。
          // ⚠ これを出す文言は #114 で無くなった。値は検証・デバッグ用に残している
          // ⚠ 候補の件数は概算にならない。approxTotal が立つのは *結果* 件数が概算という意味で、
          //   ここで数えているのは jpCand（候補）そのものなので言い切ってよい
          jpChecked = Math.min(from + JP_PAGE_SIZE, jpCand.length);
        } else if (enToks.length) {
          // ⭐ ENテキストモード（#111 §5-3）。上位集合を全件取り、一致・除外・並び替え・
          //   ページングはローカルで行う（#44 の数値ソートと同じ形）。
          const base = filterParams().toString();
          const got = await enTextPool(enToks, base, (done, pages) => {
            if (mySeq !== seq || !opts.onProgress) return;
            opts.onProgress({ done, total: pages });
          }, () => mySeq !== seq);
          if (mySeq !== seq || !got) return;
          const field = sortField();
          // ⭐ 一致の判定はここ1回だけ（matchesText が唯一の出所・#111 §5-2）
          let pool = got.cards.filter((c) => matchesText(c, enToks));
          // 数値項目で並べ替えるときは、その項目を持たないカードを除く（#39 の規則）
          if (isNumericSort()) pool = pool.filter((c) => !isNullish(field, c));
          // AND指定はAPIが上位集合しか返せないため客側で間引く。
          // ⭐ 上位集合の全件に対して間引けるので総件数は概算にならない（approxTotal: false）
          if (anyAnd()) pool = pool.filter(matchesAndFilters);
          sortLocal(pool);
          const from = (pager.page - 1) * PAGE_SIZE;
          cards = pool.slice(from, from + PAGE_SIZE);
          total = pool.length;
          hasMore = from + PAGE_SIZE < pool.length;
          fetchGap = got.gap;
        } else if (isNumericSort() || anyAnd()) {
          // 安定キーで絞り込み結果を全件取り、除外・並び替え・ページングはローカルで行う（#44）。
          // ⚠ APIの数値ソートは同点行でページングが壊れるため使わない
          // ⭐ AND指定もここを通す（#102 単位1）。公式APIはANDを解けないので上位集合しか返せず、
          //   1ページだけ取って間引くと「答えが1画面目に出そろわない」（実測: WIND∩EXALTED は
          //   17枚のうち12枚しか出ず、総件数も出せなかった）。上位集合の全件に対して間引けば
          //   件数を言い切れる＝「もっと見る」が「まだ分からない」ではなく「本当に続きがある」になる。
          // ⚠ ここを isNumericSort() だけに戻すと症状がそのまま戻る（警告も注記も出ない無言の劣化）。
          //   npm run validate の `and filters resolve before render` が行動で止める（#102 §5-5）。
          const key = filterParams().toString();
          subscribeProgress([key], (done, pages) => {
            if (mySeq !== seq || !opts.onProgress) return;
            opts.onProgress({ done, total: pages });
          });
          const all = await fetchAll(key);
          if (mySeq !== seq) return;
          const field = sortField();
          let pool = all.cards;
          // 数値項目で並べ替えるときは、その項目を持たないカードを除く（昇順・降順とも）。#39 の規則。
          // ⚠ ⭐ isNumericSort() の条件を外して無条件にしないこと（ENテキスト路と同じ形）。
          //   ⚠ 無条件にすると「レアリティ順のAND」が必ず0件になる——card 直下に rarity は
          //   無く（版ごとの editions[].rarity が正）、isNullish は undefined を nullish と
          //   判定するので全部落ちる。実測: WIND∩EXALTED のレアリティ順が 17件 → 0件
          //   （名前順は文字列なので落ちず 17件のまま＝名前順だけ見ていると気づけない）
          if (isNumericSort()) pool = pool.filter((c) => !isNullish(field, c));
          // AND指定はAPIが上位集合しか返せないため客側で間引く。
          // ⭐ 全件に対して間引けるので総件数が概算にならない（approxTotal: false）
          if (anyAnd()) pool = pool.filter(matchesAndFilters);
          // ⭐ 並べ替えは sortLocal に委ねる（#111 §5-5）。数値ソートなら sortNumeric、
          //   rarity なら localRarityKey、それ以外（name）は localNameKey。
          // ⚠ sortNumeric(pool, field) に戻さないこと——name 順のANDで並びが崩れる
          //   （件数は変わらないので件数だけ見ていると気づけない）
          sortLocal(pool);
          const from = (pager.page - 1) * PAGE_SIZE;
          cards = pool.slice(from, from + PAGE_SIZE);
          total = pool.length;
          hasMore = from + PAGE_SIZE < pool.length;
          // ⚠ collector_number の安定性は実測でありAPIの保証ではない。必ず突き合わせる（fail-open）。
          //   ⚠ ⭐ 消さないこと（#102 §8-2）—— MAX_PAGES で切り落ちた場合もここに出る＝唯一の信号。
          //   今日 gap は出ないので、消しても検証項目は1つも落ちない（守っているのは diff を読む人だけ）
          if (all.cards.length !== all.total) {
            fetchGap = { unique: all.cards.length, total: all.total };
          }
        } else {
          // ⚠ ⭐ ここには「AND指定が1つも無いもの」しか来ない（上の分岐が全部拾う）。
          //   そのため間引きは1件も起きず、total は API の申告値をそのまま言い切ってよい
          //   （approxTotal が非JPモードで立つ経路は1本も無い＝#102 §5-3）。
          // ⚠ ⭐ ここに「念のため」のAND間引き（matchesAndFilters を通す安全弁）を書き戻さない
          //   こと（#102 §5-6・追補 P1 で撤去した）。到達しない分岐は誰も試せないうえ、
          //   上の分岐の条件を狭めた日の壊れ方が——安全弁ありなら
          //   「行は正しいが足りず総件数が嘘」（＝症状③ そのもの＝誰も気づけない静かな側）、
          //   撤去済みなら「ANDに一致しない行が混じる」（＝画面を見た人に即分かるうるさい側）。
          //   うるさい側を選ぶ（#116 §12-1 と同じ流儀）。検出は安全弁の有無に依らない
          //   （npm run validate の `and filters resolve before render` が3組とも落ちる）。
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
        opts.onResults(cards, {
          reset, jpMode: !!jpSlugs, total, hasMore,
          // ⭐ 全件路（数値ソート・ENテキスト・AND）は上位集合の全件に対して間引けるため
          //   件数が正確になる（#44 §6 → #111 → #102 単位1 で AND まで広げた）。
          andMode: anyAnd(),
          // ⭐ ENテキストモードも上位集合の全件に対して間引くので概算にならない（#111 §5-4）
          // ⭐ #102 単位1 で AND も全件路へ寄せたので、非JPモードで概算になる経路は1本も残らない。
          //   ⚠ anyAnd() に戻さないこと——戻すと「/ 全 N 件」が出なくなる（撤去した文言も無いので
          //     件数だけの行になる＝症状③ が注記すら無い形で戻る）
          approxTotal: jpSlugs ? jpApprox : false,
          blocked: null,
          // 全件取得がAPIの申告件数と食い違ったとき（#44 §5）。出たら異常の信号（通常は null）
          fetchGap,
          // 件数表示の注記用（#39）。JPモードでも除外が効くようになった（#43）が、
          // 並び替え自体を諦めたとき（jpSortDropped）は除外も起きていないので付けない
          // — 付けると「全 577 件（レベルを持つカードのみ）」という嘘の注記になる
          numericSort: isNumericSort() && !jpSortDropped ? sortField() : null,
          jpSortUnknown: jpSlugs ? jpSortUnknown : 0,
          jpSortDropped: jpSlugs ? jpSortDropped : false,
          // 日本語テキストに一致した件数（絞り込み・除外の前）。
          // ⚠ いまは表示に使っていない（#114 で0件文言から件数と原因の説明を落とした）。
          //   検証・デバッグから観測できるように残してある
          // ⚠ jpMode は「JPモードか」でしかなく、日本語一致が0件でも true になる（#43 §7.3）
          jpMatched: jpSlugs ? jpSlugs.length : 0,
          // 「JPモードで絞り込みが1つ以上効いているか」の読み取り専用の2値
          //（絞り込みの結果は1件も変えない）。
          // ⚠ いまは表示に使っていない（#114 で0件文言から原因の説明を落とした）。
          //   検証・デバッグから観測できるように残してある
          // ⚠ jpFiltered をページ側で数え直さないこと —— hasJpFilters() は概算判定(jpApprox)も
          //   使う単一の出所で、絞り込みが1つ増えた日にここへ乗せておけば一緒に効く。
          //   数え直すと、足し忘れた日に概算判定とだけ食い違う
          jpFiltered: jpSlugs ? hasJpFilters() : false,
          jpChecked,
          jpDropped: jpSlugs ? jpDropped : 0,
          // ⚠ 表示には使わない（新しい注記は増やさない・設計書 §5 P4）。D-2 が正しく効いているかを
          //   検証・デバッグから観測できるようにするためだけの値
          jpBlindDropped: jpSlugs ? jpBlindDropped : 0,
          // 裏面だけが一致したカードの {表面slug: 裏面slug}（#46）。
          // ⚠ カードオブジェクトに印を付けてはいけない（fetchCard の結果はキャッシュされるため、
          //   前回の検索の印が次の検索に残る）。必ずこの info 経由で渡す
          jpBackHit: jpSlugs ? jpBackHit : null,
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

  // ---------- 選択中の絞り込み条件（左ペイン化_設計 §7-3・元はトップの app.js）----------
  // ⚠ アコーディオン（1つ開いたら他は閉じる）にすると、閉じたグループの選択内容が
  //   数字バッジだけになる。左ペインの最上部に全条件を集め、✕で個別に外せるようにする。
  // ⚠ 出す・出さないは各ページのCSS（既定 display:none、左ペインが出る幅でだけ表示）が決める。
  //   ここで幅を見ない——幅の行き来のたびに作り直すと状態がずれるため。
  // ⚠ トップとデッキ構築で違うのは「対象の群」と「解除したあと何をするか」の2つだけ。
  //   コピーせずこの1か所に置く（card-badges.css・用語ハイライト・0件文言に続く二重定義を増やさない）。
  //
  //   GA_CARD_SEARCH.createSelectedFilters({
  //     container,        // .has-selection を付け外しする器
  //     list,             // チップを並べる箱
  //     groups: () => [...],  // 対象の <details>（fillChips が作ったもの）
  //     onChange,         // 「すべて解除」で全群を空にしたあとに1回だけ呼ぶ
  //     onRemoveOne,      // 個別の✕を押した「後」に1回だけ呼ぶ（省略可・左ペイン化_設計 §11-4）
  //   }) → { render }
  // ⚠ ⭐ onRemoveOne をトップ（app.js）に渡さないこと。個別の✕は input.click() 経由で
  //   グループ側の onChange（updateFilterBadge + runSearch）が既に再検索している。
  //   渡すと ✕1回でAPI検索が2回走る（＝リクエストが倍になる）。
  //   ⭐ 「デッキ構築に渡したのだから対称にしよう」と足したくなる形なので、必ずここを読むこと。
  function createSelectedFilters(opts) {
    const container = opts.container;
    const list = opts.list;
    const groups = opts.groups || (() => []);
    const onChange = opts.onChange || (() => {});
    // 個別✕の後始末。渡さないページ（トップ）では完全な no-op になる
    const onRemoveOne = opts.onRemoveOne || (() => {});

    function items() {
      const out = [];
      groups().forEach((g) => {
        if (!g) return;
        const flabel = g.querySelector(".flabel");
        const group = flabel ? flabel.textContent : "";
        g.querySelectorAll('.chip input[type="checkbox"]').forEach((input) => {
          if (!input.checked) return;
          // ⚠ チップは <input><i.orb><span>日本語</span><em>キー</em> の並び（fillChips）。
          //   textContent をそのまま使うと「ノームNORM」と繋がるので、面ごとに取り出す
          const chip = input.closest(".chip");
          const jp = chip && chip.querySelector("span") ? chip.querySelector("span").textContent.trim() : "";
          const code = chip && chip.querySelector("em") ? chip.querySelector("em").textContent.trim() : "";
          const name = jp || code || String(input.value || "");
          out.push({ group, name, code: code === name ? "" : code, input });
        });
      });
      return out;
    }

    function chipFor(item) {
      const b = document.createElement("button");
      b.type = "button";
      const desc = `${item.group}: ${item.name}${item.code ? `（${item.code}）` : ""}`;
      b.title = desc;
      b.setAttribute("aria-label", `${desc} を外す`);
      b.append(document.createTextNode(item.name + " "));
      if (item.code) {
        const em = document.createElement("em");
        em.textContent = item.code;
        b.appendChild(em);
      }
      const x = document.createElement("span");
      x.className = "x";
      x.setAttribute("aria-hidden", "true");
      x.textContent = "✕";
      b.appendChild(x);
      // ⚠ チェックボックスを click() して外す。change を経由するので、グループ側の
      //   sync()（バッジ・チップの on）と onChange（ページ側の再検索やバッジ更新）が両方そのまま走る
      // ⚠ onRemoveOne はその「後」に1回だけ呼ぶ。群側の onChange が再検索しないページ
      //   （デッキ構築）だけが渡す——トップに渡すと1回の✕で2回検索する（上の注意書き）
      b.addEventListener("click", () => { item.input.click(); onRemoveOne(); });
      return b;
    }

    function render() {
      if (!container || !list) return;
      const cur = items();
      container.classList.toggle("has-selection", cur.length > 0);
      list.textContent = "";
      cur.forEach((it) => list.appendChild(chipFor(it)));
      if (cur.length > 1) {
        const clear = document.createElement("button");
        clear.type = "button";
        clear.className = "clear-all";
        clear.textContent = "すべて解除";
        // ⚠ 1件ずつ click() すると解除のたびにページ側の onChange が走る（トップでは
        //   選択件数ぶんのAPIリクエストになる）。setValues([]) は onChange を発火させないので、
        //   まとめて外してからページ側の onChange を1回だけ呼ぶ
        clear.addEventListener("click", () => {
          groups().forEach((g) => { if (g) g.setValues([]); });
          onChange();
        });
        list.appendChild(clear);
      }
    }

    return { render };
  }

  // ---------- 絞り込みグループのアコーディオン（左ペイン化_設計 §7-4・元はトップの app.js）----------
  // 1つ開いたら他は閉じる。
  // ⚠ 効かせるのは左ペインが出る幅だけ。狭い幅では今までどおり複数開ける——
  //   閉じたグループの中身を補う「選択中の条件」が左ペインの幅にしか出ないため、
  //   狭い幅で畳むと何を選んだのか分からなくなる。
  // ⚠ ⭐ minWidth を必ず引数で受ける。ハードコードするとページごとの左ペインの閾値
  //   とずれ、「左ペインが無いのにアコーディオンだけ効く」帯ができる
  //   （＝選んだ条件が画面のどこにも見えなくなる無言の劣化）。
  // ⭐ G-2（左ペイン化_設計 §14-2）でトップもデッキ構築も 1200px に統一したが、
  //   ページごとに閾値が違いうるという前提は残す（＝ここにハードコードしない）。
  function initAccordion(opts) {
    const groups = opts.groups || (() => []);
    const mq = window.matchMedia(`(min-width: ${Number(opts.minWidth)}px)`);
    groups().forEach((g) => {
      if (!g) return;
      g.addEventListener("toggle", () => {
        if (!g.open || !mq.matches) return;
        groups().forEach((other) => { if (other && other !== g) other.open = false; });
      });
    });
    return { mq };
  }

  return {
    create, fillChips, fillSetSelect, fillFormatSelect,
    createSelectedFilters, initAccordion,
    setPrefixes, setKeyOf, setIndexOf, numericSortNote, numericSortLabel, jpSortNote, jpDropNote,
    fetchGapNote,
    // 件数欄の文言（#101）。⚠ 呼び出し側に書き戻さないこと（npm run validate が落とす）
    searchStatus,
    // ⭐ テキスト検索の一本化（#111）。トークン化・一致の述語・旧 qtext の畳み込みは
    //   どれもここ1か所に置く。⚠ 2つの app.js に書き戻さないこと（二重定義を増やさない）。
    textTokens, matchesText, mergeLegacyText,
    SUBTYPE_TOP, ELEMENT_AND_MESSAGE,
    // ⭐ 版レベル項目（isIndexBlind）の一覧。npm run validate が読んで、第2段
    //    （rarityMatchesIn）が名指ししているキーとずれていないかを検査する（#93）。
    // ⚠ ここに配列リテラルを書き写さないこと——MULTI から導くから検査が意味を持つ。
    INDEX_BLIND_KEYS: MULTI.filter(isIndexBlind).map(([k]) => k),
    // ⭐ 版レベルの絞り込みに合わせた絵柄の選択（#97）。⚠ 呼び出し側に規則を書き戻さないこと
    //    （npm run validate が「定義は1ファイルだけ」を双方向に検査して落とす）。
    artCondOf, preferredArtIndex,
    // ⭐ ART_COND が見ている els のキー。npm run validate が許可リストと突き合わせる。
    // ⚠ ここに配列リテラルを書き写さないこと——ART_COND から導くから検査が意味を持つ。
    ART_COND_KEYS: ART_COND.map(([, , elsKey]) => elsKey),
  };
})();
