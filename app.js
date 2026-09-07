"use strict";
/*
 * Grand Archive 日本語カードDB — フロントエンドロジック
 * 公式API(api.gatcg.com)をブラウザから直接叩き、翻訳レイヤー(GA_I18N)を重ねて表示する。
 * 依存ゼロ・ビルド不要。index.html をブラウザで開くだけで動作する。
 */

const API = "https://api.gatcg.com";
const IMG_BASE = "https://api.gatcg.com";
const I18N = window.GA_I18N || { meta: {}, terms: {}, cards: {} };

const el = {
  q: document.getElementById("q"),
  qtext: document.getElementById("qtext"),
  // クラス/エレメント/タイプ/サブタイプ/レアリティは複数選択（AND/OR）のチップ群。
  // 中身は GA_CARD_SEARCH.fillChips() が構築し、getValues()/getMode()/setValues()/setMode()/reset() を持つ
  gClass: document.getElementById("g-class"),
  gElement: document.getElementById("g-element"),
  gType: document.getElementById("g-type"),
  gSubtype: document.getElementById("g-subtype"),
  // レアリティは editions[].rarity（card 直下に無い）。判定は card-search.js が版の集合ごと行う（意味統一 §4）
  gRarity: document.getElementById("g-rarity"),
  fFormat: document.getElementById("f-format"),
  fSet: document.getElementById("f-set"),
  sort: document.getElementById("f-sort"),
  order: document.getElementById("order"),
  reset: document.getElementById("reset"),
  status: document.getElementById("status"),
  grid: document.getElementById("grid"),
  loadMore: document.getElementById("load-more"),
  controls: document.getElementById("controls"),
  filterToggle: document.getElementById("filter-toggle"),
  filterToggleLabel: document.getElementById("filter-toggle-label"),
  filterToggleBadge: document.getElementById("filter-toggle-badge"),
  // スマホの絞り込みボトムシート（PC幅では #filter-sheet が display:contents で無効化される）
  filterSheet: document.getElementById("filter-sheet"),
  filterSheetClose: document.getElementById("filter-sheet-close"),
  filterApply: document.getElementById("filter-apply"),
  filterFab: document.getElementById("filter-fab"),
  filterFabBadge: document.getElementById("filter-fab-badge"),
  filterVeil: document.getElementById("filter-veil"),
  // 選択中の絞り込み条件（PC左ペインの最上部・設計書 §12-2 案A）
  selectedFilters: document.getElementById("selected-filters"),
  selectedFiltersList: document.getElementById("selected-filters-list"),
};

// 共通ヘルパー(shared/js/card-i18n.js)。トップページとデッキ構築ツールで共用
const {
  tr, jpName, firstEdition, imageUrl, flipEdition, backFace,
  escapeHtml, hasJapanese, renderEffect, label, isTranslated, translationsReady,
  cardImages, rarityCode, speedLabel, formatBadgeHtml, seasonalBadgeHtml,
} = window.GA_CARD_I18N;

// クエリ構築・日本語ローカル検索・ページング・setPrefixes は shared/js/card-search.js に共通化
const { setPrefixes } = window.GA_CARD_SEARCH;

// 訳データ(#22 フェーズ2)。data/tl/*.js 38本の <script> をやめ、生成物のJSONを読む。
// 名前はグリッド描画に要るのでここ(app.js 評価時＝最速)で取得を開始し、初期表示の前に待つ。
// 効果は詳細ダイアログ・日本語効果検索でしか要らないので、URLを渡すだけで取得はしない。
const TL_NAMES_URL = "data/tl-names.json";
const TL_EFFECTS_URL = "data/tl-effects.json";
const namesReady = window.GA_CARD_I18N.loadNames(TL_NAMES_URL);

// シーズン禁止(#34)。公式APIに無い情報なので自前JSONを読む。300バイト程度なので
// 初期表示の前に待ち合わせる(バッジが「たまに出ない」状態を作らないため)。
// 取得失敗は空リストに倒れる＝バッジが出ないだけで既存表示は無傷(fail-open)
const SEASONAL_URL = "data/seasonal-banlist.json";
const seasonalReady = window.GA_CARD_I18N.loadSeasonalBanlist(SEASONAL_URL);

// ---------- ユーティリティ ----------
// escapeHtml / renderEffect / isTranslated / label / rarityCode / フォーマット判定 /
// cardImages / speedLabel は shared/js/card-i18n.js に共通化済み。

// エキスパンション（版）で絞り込み検索している場合、その版のイラストを初期表示にする。
// 絞り込みが無い、または一致する版が無い場合は先頭（imgs[0]）にフォールバック。
// ⚠ 「版レベルの絞り込み」（エキスパンション・レアリティ）に一致する版を選ぶ（設計書 §5 P5 の D-4）。
// ⭐ タイルの初期表示・🎨バッジの版表示・印刷リストに入る版は、すべてこの戻り値から決まる。
// ⚠ 両方が有効なときは AND —— 片方だけ一致する版を選ばない。一致が無ければ従来どおり先頭へ。
// ⚠ 署名は (imgs) のまま。shared/js/card-detail.js（詳細モーダル）が同じ関数を受け取るので、
//   ここを直すとモーダル側も改造なしで追従する。
// ⚠ 根拠は editions（cardImages 経由）だけにする。result_editions は全件取得経路で
//   delete されるため、並び替えを変えると絵柄が変わることになる（#44・設計書 §5 P5）。
function preferredArtIndex(imgs) {
  const pre = setPrefixes(el.fSet.value);
  const rar = el.gRarity ? el.gRarity.getValues().map(String) : [];
  if (!pre.length && !rar.length) return 0;
  const idx = imgs.findIndex((im) =>
    (!pre.length || pre.includes(im.prefix)) &&
    (!rar.length || (im.rarity != null && rar.includes(String(im.rarity)))));
  return idx >= 0 ? idx : 0;
}

// ---------- 両面（flip）カード ----------
// flipEdition/backFace は shared/js/card-i18n.js に共通化済み。
function isFlip(card) {
  return !!flipEdition(card);
}

// ---------- 検索（共通コントローラ） ----------
// クエリ構築・日本語ローカル検索・ページングは shared/js/card-search.js に共通化。
// このページは結果のグリッド描画と件数表示のみを担当する。

const shownSlugs = new Set(); // 重複表示を防ぐ（appendGrid で使用）

const searchCtl = GA_CARD_SEARCH.create({
  els: {
    name: el.q, text: el.qtext,
    cls: el.gClass, element: el.gElement, type: el.gType, subtype: el.gSubtype,
    rarity: el.gRarity,
    format: el.fFormat, set: el.fSet, sort: el.sort, order: el.order,
  },
  pageSize: 50,
  jpPageSize: 40,
  metaIndexUrl: "data/card-meta-index.json", // JP検索の取得前フィルタ用メタ索引(#27)
  effectsUrl: TL_EFFECTS_URL, // 効果欄に日本語が入ったときだけ取得する訳データ(#22)
  onStart: (reset) => {
    // 絞り込みを変える経路（チップ・セレクト・並び替え・テキスト入力・リセット）は
    // すべて runSearch(true) を通るため、URLへの書き戻しはここ1箇所に集約する
    if (reset) saveQuery();
    el.status.textContent = reset ? "検索中…" : "読み込み中…";
    el.loadMore.disabled = true;
    if (reset) {
      shownSlugs.clear();
      el.grid.innerHTML = "";
      el.loadMore.hidden = true;
    }
  },
  // 数値ソートは絞り込み結果を全件取ってからローカルで並べる（#44）。絞り込みなしだと
  // 45リクエスト＝約18秒かかるため、無言で待たせず取得済みページ数を出す
  onProgress: ({ done, total }) => {
    el.status.textContent = `読み込み中 ${done}/${total} ページ…`;
  },
  onResults: (cards, info) => {
    appendGrid(cards, info);
    updateElementWarn(info);
    updateSearchStatus(info);
    el.loadMore.disabled = false;
  },
  onError: (err, { reset }) => {
    el.status.textContent = `読み込みに失敗しました（${err.message}）。時間をおいて再度お試しください。`;
    if (reset) { el.grid.innerHTML = ""; el.loadMore.hidden = true; }
    el.loadMore.disabled = false;
  },
});

// 既存の呼び出し箇所(入力イベント等)のための薄いラッパー
function runSearch(reset) { searchCtl.run(reset); }

// エレメントANDで0件が確定する組み合わせの注意書き。
// グループを閉じていると見えないので、そのときは開いて気づけるようにする
function updateElementWarn(info) {
  const warn = el.gElement.warnEl;
  if (!warn) return;
  const blocked = info.blocked === "element-and";
  warn.hidden = !blocked;
  if (blocked) {
    warn.textContent = `⚠️ ${GA_CARD_SEARCH.ELEMENT_AND_MESSAGE}`;
    el.gElement.open = true;
  }
}

function updateSearchStatus(info) {
  const shown = el.grid.childElementCount;
  if (info.blocked === "element-and") {
    el.status.textContent = GA_CARD_SEARCH.ELEMENT_AND_MESSAGE;
    el.loadMore.hidden = true;
    return;
  }
  if (shown === 0) {
    // AND条件は取得済みのページに対して適用するため、このページに1件も残らないことがある。
    // 続きのページに該当が残っている場合は「もっと見る」を残す
    if (info.hasMore) {
      // 日本語には一致していて、絞り込みで落ちている場合は「あと何件確認すれば終わるか」を出す。
      // ⚠ 候補を自動で追い掛けない（0件の間だけ次ページを取る案は明示的に不採用）。
      //   良かれと思って自動追従を足すと、操作なしで外部APIへの待ちが発生する
      if (info.jpMode && info.jpMatched > 0 && info.jpFiltered) {
        el.status.textContent = `候補 ${info.total} 件のうち ${info.jpChecked} 件を確認しましたが、絞り込み条件に合うカードはまだありません。「もっと見る」で続きを確認できます。`;
        el.loadMore.hidden = false;
        return;
      }
      el.status.textContent = "このページには該当がありませんでした。「もっと見る」で続きを検索できます。";
      el.loadMore.hidden = false;
      return;
    }
    // 日本語には一致したのに、数値項目の並び替えでその項目を持つカードが0件になった場合(#43)。
    // 従来の文言だと「一致しなかった」と嘘になり、原因(並び替え)が画面のどこにも出ない
    if (info.jpMode && info.numericSort && info.jpMatched > 0) {
      const label = GA_CARD_SEARCH.numericSortLabel?.(info.numericSort) || "";
      el.status.textContent = `日本語テキストには一致しましたが、${label}を持つカードはありませんでした（並び替えを「名前順」に戻すと表示できます）。`;
      el.loadMore.hidden = true;
      return;
    }
    // 日本語には一致したのに、絞り込み条件で全部落ちた場合。従来の文言だと「一致しなかった」と
    // 嘘になり、「英語で検索し直す」という的外れな行動に誘導してしまう
    if (info.jpMode && info.jpMatched > 0 && info.jpFiltered) {
      el.status.textContent = "日本語テキストには一致しましたが、絞り込み条件に合うカードはありませんでした（絞り込みを外すと表示できます）。";
      el.loadMore.hidden = true;
      return;
    }
    // 日本語に一致し、絞り込みも1つも無いのに0件＝候補を1件も取得できなかったときだけ。
    // ⚠ ここで上の「絞り込みを外すと表示できます」を出すと、外す絞り込みが無いので新しい嘘になる
    if (info.jpMode && info.jpMatched > 0) {
      el.status.textContent = "日本語テキストには一致しましたが、カード情報を取得できませんでした（時間をおいて再度お試しください）。";
      el.loadMore.hidden = true;
      return;
    }
    el.status.textContent = info.jpMode
      ? "日本語テキストに一致する翻訳済みカードが見つかりませんでした（未翻訳のカードは日本語検索できません。英語での検索もお試しください）。"
      : "該当するカードがありません。条件を変えてお試しください。";
    el.loadMore.hidden = true;
    return;
  }
  // 客側で後段フィルタが入る場合（AND指定・日本語モードでの絞り込み）は総件数を正確に出せない
  const totalPart = !info.approxTotal && info.total > shown ? ` / 全 ${info.total} 件` : "";
  let suffix = info.jpMode ? "（日本語テキスト一致・翻訳済みのみ）" : "";
  // 数値項目の並び替えは、その項目を持たないカードを除くので総件数が減る(#39)。理由を添える
  // ?. は push直後の伝播ラグ対策（新しい app.js と古い card-search.js が数十秒だけ組み合わさる）
  suffix += GA_CARD_SEARCH.numericSortNote?.(info.numericSort) || "";
  // JPモードの並び替えキーが取れなかった/一部欠けたときの注記(#43)
  suffix += GA_CARD_SEARCH.jpSortNote?.(info) || "";
  // 取得後に落ちた件数の注記(#45)。フリップ面を畳んだあとは「出たら異常」の信号
  suffix += GA_CARD_SEARCH.jpDropNote?.(info) || "";
  // 数値ソートの全件取得がAPIの申告件数と食い違ったときの注記(#44)。これも「出たら異常」の信号
  suffix += GA_CARD_SEARCH.fetchGapNote?.(info) || "";
  if (info.approxTotal) {
    // JPモードは索引で取得前に絞るためANDも件数を出せる。概算になるのは索引が使えない/未収録slugが混じるときだけ
    suffix += info.jpMode
      ? "（一部のカードは取得後に判定するため総件数は概算です）"
      : "（AND条件などは取得済みのページに適用するため、総件数は表示できません）";
  }
  el.status.textContent = `${shown} 件を表示${totalPart}${suffix}`;
  el.loadMore.hidden = !info.hasMore;
}

// ---------- グリッド描画 ----------

// info は検索コントローラが渡すメタ情報。裏面だけが一致したカードの注記(#46)に使う
function appendGrid(cards, info) {
  if (!cards.length) return;
  const frag = document.createDocumentFragment();
  cards.forEach((card) => {
    const slug = card.slug || card.uuid;
    if (slug && shownSlugs.has(slug)) return; // 重複表示を防ぐ
    if (slug) shownSlugs.add(slug);
    // 訳データが読めていないときは「未翻訳」を出さない。エントリの不在が「未訳」なのか
    // 「名前JSONが取れなかった」のか区別できず、訳のあるカードを誤って未翻訳と示すため（変更6・#22）
    const showUntranslated = !isTranslated(card) && translationsReady();
    const imgs = cardImages(card);
    const initialAi = preferredArtIndex(imgs);
    const back = backFace(card); // 両面カードなら裏面（無ければ null）
    // 日本語検索で「裏面だけが一致した」カード（#46）。検索語がタイルのどこにも出ないため、
    // 本文に裏面名の行を足し、画像も最初から裏面で開く。
    // ⚠ カードオブジェクトではなく info 側のマップで受け取る（fetchCard の結果はキャッシュされる）
    const hitSlug = info && info.jpBackHit ? info.jpBackHit[card.slug] : null;
    const backHit = !!(hitSlug && back);
    // その版に裏面画像が無ければ表面のまま開く（注記だけ出す・fail-open）
    const startBack = !!(backHit && imgs[initialAi] && imgs[initialAi].back);
    const img = imgs.length ? (startBack ? imgs[initialAi].back : imgs[initialAi].url) : null;
    const backName = backHit ? jpName(back) : "";

    const cardEl = document.createElement("div");
    cardEl.className = "card";
    cardEl.setAttribute("role", "button");
    cardEl.setAttribute("tabindex", "0");
    cardEl.setAttribute("aria-label", jpName(card));
    // 絞り込みで選ばれた版を、🎨 で切り替えたときと同じ扱いで保持する(#42・#41 と同方式)。
    // ⚠ この初期値が無いと、エキスパンション絞り込みで初期表示が既定版以外になっていても
    //   🎨 を押さない限り既定版が印刷リストに入る
    if (imgs.length) cardEl.dataset.artUrl = imgs[initialAi].url;

    const typeChips = (card.types || []).map((t) => label("types", t)).join(" / ");
    const levelChip = card.level != null ? `Lv.${card.level}` : "";
    const elemChips = (card.elements || []).map((e) => label("elements", e)).join("・");

    cardEl.innerHTML = `
      <div class="card-img">
        ${img ? `<img loading="lazy" crossorigin="anonymous" src="${escapeHtml(img)}" alt="">` : `<div class="noimg">画像なし</div>`}
        <div class="badges-bl">
          ${formatBadgeHtml(card)}
          ${seasonalBadgeHtml(card)}
          ${back ? `<button class="flip-badge" type="button" title="両面カード：表裏を切り替え" aria-label="${startBack ? "表面を表示" : "裏面を表示"}">${startBack ? "🔄 裏面" : "🔄 両面"}</button>` : ""}
          ${imgs.length > 1 ? `<button class="art-badge" type="button" title="イラスト/版を切り替え（${imgs.length}種）" aria-label="イラストを切り替え">🎨 ${imgs.length}・${escapeHtml(imgs[initialAi].prefix)}</button>` : ""}
        </div>
        <div class="badges-tr">
          ${img ? `<button class="card-add" type="button" title="印刷リストに追加" aria-label="印刷リストに追加">＋🖨️</button>` : ""}
        </div>
      </div>
      <div class="card-body">
        <p class="card-name">${showUntranslated ? `<span class="badge-untranslated">未翻訳</span>` : ""}${escapeHtml(jpName(card))}</p>
        <p class="card-name-en">${escapeHtml(card.name)}</p>
        ${backName ? `<p class="flip-hit"><span class="flip-hit-lbl">🔄 裏:</span><span class="flip-hit-name">${escapeHtml(backName)}</span></p>` : ""}
        <p class="card-chips">
          ${typeChips ? `<span class="chip">${escapeHtml(typeChips)}</span>` : ""}
          ${levelChip ? `<span class="chip">${escapeHtml(levelChip)}</span>` : ""}
          ${elemChips ? `<span class="chip chip-elem">${escapeHtml(elemChips)}</span>` : ""}
        </p>
      </div>`;
    cardEl.addEventListener("click", () => GA_CARD_DETAIL.open(card));
    cardEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); GA_CARD_DETAIL.open(card); }
    });
    // 表示中の「版」と「面」。⚠ ＋🖨️ も参照するため、切替バッジの if ブロックの外で宣言する（#47）。
    // ブロック内で let を再宣言すると内側が外側を隠し、画像は裏返るのに ＋🖨️ は表面のまま＝
    // 元の症状と見分けがつかない状態になる（例外も出ない）
    let ai = initialAi;          // 選択中の版（イラスト）番号
    let showingBack = startBack; // 裏面を表示中か（#46 で裏面一致なら最初から裏面）

    const addBtn = cardEl.querySelector(".card-add");
    if (addBtn) {
      addBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        // 表示中の版（🎨 の切り替え結果・絞り込みによる初期表示）をそのまま印刷リストへ
        const artUrl = cardEl.dataset.artUrl || null;
        const cur = artUrl ? imgs.find((im) => im.url === artUrl) : null;
        // 表示中の「面」も反映する（#47）。規則は詳細モーダルの backAction と同一 ——
        // その版に裏面画像が無ければ既定版の裏面に倒し、そのときは版ラベルを付けない（実物と食い違うため）
        if (showingBack && back) {
          const useSel = !!(cur && cur.back);
          addToPrintItem(back.slug, jpName(back), useSel ? cur.back : back.image, useSel ? cur.label : null);
          return;
        }
        addToPrint(card, artUrl, cur && cur.label);
      });
    }
    // イラスト切替（🎨）と表裏切替（🔄）は同じ <img> を共有するため、
    // 状態（表面アート番号 ai / 裏面表示 showingBack）を一元管理して衝突を防ぐ。
    const artBadge = cardEl.querySelector(".art-badge");
    const flipBadge = cardEl.querySelector(".flip-badge");
    const imgEl = cardEl.querySelector(".card-img img");
    if (imgEl && (artBadge || flipBadge)) {
      const syncImg = () => {
        const cur = imgs[ai] || imgs[0];
        if (!cur) return;
        // 裏面画像は選択中の版に紐づく（例：CSR表面→CSR裏面）。無ければ表面にフォールバック。
        imgEl.src = showingBack && cur.back ? cur.back : cur.url;
        if (flipBadge) {
          flipBadge.textContent = showingBack ? "🔄 裏面" : "🔄 両面";
          // ⚠ ラベルも同期する。裏面で開く（#46）と初期表示と状態がずれるため
          flipBadge.setAttribute("aria-label", showingBack ? "表面を表示" : "裏面を表示");
        }
      };
      if (artBadge) {
        artBadge.addEventListener("click", (e) => {
          e.stopPropagation();
          ai = (ai + 1) % imgs.length; // 版を切替。表裏の状態(showingBack)は保持
          syncImg();
          cardEl.dataset.artUrl = imgs[ai].url; // 追加時に「表示中の版」を使うため保持(#42)
          artBadge.textContent = `🎨 ${imgs.length}・${imgs[ai].prefix}`;
          artBadge.title = `イラスト/版を切り替え（${ai + 1}/${imgs.length}：${imgs[ai].label}）`;
        });
      }
      if (flipBadge && back) {
        flipBadge.addEventListener("click", (e) => {
          e.stopPropagation();
          showingBack = !showingBack; // 選択中の版 ai は保持したまま表裏だけ切替
          syncImg();
        });
      }
    }
    frag.appendChild(cardEl);
  });
  el.grid.appendChild(frag);
}

// ---------- 詳細モーダル ----------
// 本体は shared/js/card-detail.js (GA_CARD_DETAIL) に共通化。ここではハッシュ連動のみ扱う。

// URLハッシュに応じて詳細を開閉（共有リンク・戻る/進む対応）
function handleHash() {
  const m = location.hash.match(/^#card\/(.+)$/);
  if (m) {
    const slug = decodeURIComponent(m[1]);
    const cur = GA_CARD_DETAIL.current();
    if (!GA_CARD_DETAIL.isOpen() || !cur || cur.slug !== slug) {
      GA_CARD_DETAIL.openBySlug(slug);
    }
  } else if (GA_CARD_DETAIL.isOpen()) {
    GA_CARD_DETAIL.close();
  }
}

// ---------- 印刷リスト（カードDB → プロキシPDF 連携） ----------

const PRINT_KEY = "ga_print_list_v1";
let printList = loadPrintList();

function loadPrintList() {
  try {
    const arr = JSON.parse(localStorage.getItem(PRINT_KEY) || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function savePrintList() {
  try { localStorage.setItem(PRINT_KEY, JSON.stringify(printList)); } catch { /* 保存不可でも継続 */ }
}

function totalCards() {
  return printList.reduce((n, x) => n + x.qty, 0);
}

// artUrl は「画面で表示中の版」の画像URL。省略・null のときは既定版(editions[0])を使う(#42)
function addToPrint(card, artUrl, verLabel) {
  const image = artUrl || imageUrl(card);
  if (!image) return; // 画像なしは追加不可
  addToPrintItem(card.slug || card.uuid, jpName(card), image, verLabel);
}

// 印刷リストへの追加の共通部。両面カードの裏面(card形状に正規化済み)からも使う。
// ⚠ 同一性キーは image(画像URL)。slug で判定すると同じカードの別の版が
//   既存行の数量に合算され、選んだイラストが捨てられる(#42)
function addToPrintItem(id, name, image, ver) {
  if (!id || !image) return;
  const existing = printList.find((x) => x.image === image);
  if (existing) {
    existing.qty = Math.min(existing.qty + 1, 99);
    // ver を持たない旧データに版ラベルを補う（マージ相手は同じ画像なので取り違えは起きない）。
    // ⚠ 無条件に上書きしない。裏面のフォールバックは意図的に ver=null を渡すため、
    //   既に入っている正しいラベルを消してしまう
    if (!existing.ver && ver) existing.ver = ver;
  } else {
    printList.push({ id, name, image, qty: 1, ver: ver || null });
  }
  savePrintList();
  updatePrintBar();
  renderTray();
}

// key は画像URL(= printList の同一性キー)
function setQty(key, qty) {
  const it = printList.find((x) => x.image === key);
  if (!it) return;
  it.qty = Math.max(1, Math.min(99, qty || 1));
  savePrintList();
  updatePrintBar();
  renderTray();
}
function changeQty(key, delta) {
  const it = printList.find((x) => x.image === key);
  if (it) setQty(key, it.qty + delta);
}
function removeFromPrint(key) {
  printList = printList.filter((x) => x.image !== key);
  savePrintList();
  updatePrintBar();
  renderTray();
}
function clearPrint() {
  printList = [];
  savePrintList();
  updatePrintBar();
  renderTray();
}

function updatePrintBar() {
  const bar = document.getElementById("print-bar");
  const n = totalCards();
  if (n === 0) { bar.hidden = true; syncPrintBarHeight(); return; }
  const pages = CardSheet.pageCountFor(n);
  document.getElementById("print-bar-text").textContent =
    `印刷リスト: ${printList.length}種 / ${n}枚（A4 ${pages}ページ）`;
  bar.hidden = false;
  syncPrintBarHeight();
}

// 印刷バーの実測高さを CSS カスタムプロパティに書き、FAB の退避量に使う。
// ⚠ 固定値（56px 等）にしてはいけない。文言が折り返すのでバーの高さは 60〜79px で変わり、
// 固定値だと長い文言のときに FAB がバーに重なる。
// ⚠ CSP が style-src 'self' なので style 属性は使えない。CSSOM（setProperty）で書く
function syncPrintBarHeight() {
  const bar = document.getElementById("print-bar");
  const h = bar && !bar.hidden ? bar.getBoundingClientRect().height : 0;
  document.documentElement.style.setProperty("--printbar-h", Math.round(h) + "px");
}

function renderTray() {
  const list = document.getElementById("tray-list");
  const summary = document.getElementById("tray-summary");
  if (printList.length === 0) {
    list.innerHTML = '<li class="tray-empty">まだカードがありません。一覧のカード右上「＋🖨️」か、カード詳細の「印刷リストに追加」から追加してください。</li>';
    summary.textContent = "";
    return;
  }
  list.innerHTML = printList.map((it) => `
    <li class="tray-item" data-key="${escapeHtml(it.image)}">
      <img crossorigin="anonymous" src="${escapeHtml(it.image)}" alt="" />
      <span class="tray-text">
        <span class="tray-name">${escapeHtml(it.name)}</span>
        ${it.ver ? `<span class="tray-ver">${escapeHtml(it.ver)}</span>` : ""}
      </span>
      <span class="qty">
        <button type="button" class="qty-dec" aria-label="減らす">−</button>
        <input type="number" class="qty-input" min="1" max="99" value="${it.qty}" />
        <button type="button" class="qty-inc" aria-label="増やす">＋</button>
      </span>
      <button type="button" class="tray-remove" aria-label="削除">×</button>
    </li>`).join("");
  const n = totalCards();
  summary.textContent = `合計 ${n}枚 ・ A4 ${CardSheet.pageCountFor(n)}ページ（1ページ 9枚）`;
}

// jsPDF（356KB）はPDF生成のときだけ要る。トップページの初期読み込みから外し、
// 「PDF生成」を押した時点で取得する（クロール予算とスマホの初期表示を軽くするため）
let jspdfPromise = null;
function loadJsPdf() {
  if (jspdfPromise) return jspdfPromise;
  jspdfPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "shared/vendor/jspdf.umd.min.js";
    s.onload = () => resolve(window.jspdf);
    s.onerror = () => { jspdfPromise = null; reject(new Error("PDFエンジンの読み込みに失敗しました")); };
    document.head.appendChild(s);
  });
  return jspdfPromise;
}

async function generateProxyPdf() {
  const status = document.getElementById("tray-status");
  const genBtn = document.getElementById("tray-generate");
  if (printList.length === 0) { status.textContent = "カードがありません。"; return; }

  genBtn.disabled = true;
  try {
    // 同一画像は1回だけ読み込む（数量分は同じ画像を使い回す）
    const cache = new Map();
    const flat = [];
    let done = 0;
    for (const it of printList) {
      status.textContent = `画像を取得中… (${done}/${printList.length}種)`;
      let img = cache.get(it.image);
      if (!img) { img = await CardSheet.loadImage(it.image); cache.set(it.image, img); }
      for (let i = 0; i < it.qty; i++) flat.push(img);
      done++;
    }
    // jsPDFの取得失敗は「画像取得に失敗」ではないので、下の catch に流さず個別に扱う
    // （genBtn の再有効化は外側の finally が確実に行う）
    let jsPDF;
    try {
      status.textContent = "PDFエンジンを読み込み中…";
      ({ jsPDF } = await loadJsPdf());
    } catch (err) {
      console.error(err);
      status.textContent = "❌ エラー: " + err.message;
      return;
    }
    const opt = {
      cutMarks: document.getElementById("t-cutmarks").checked,
      outline: document.getElementById("t-outline").checked,
    };
    status.textContent = "PDFを生成中…";
    const pdf = CardSheet.buildPdfPaged(flat, opt, jsPDF);
    pdf.save("grand-archive-proxies.pdf");
    status.textContent = `✅ ${CardSheet.pageCountFor(flat.length)}ページのPDFを保存しました`;
  } catch (err) {
    console.error(err);
    status.textContent = "❌ エラー: " + err.message + "（画像取得に失敗した可能性があります）";
  } finally {
    genBtn.disabled = false;
  }
}

function openTray() {
  renderTray();
  document.getElementById("tray").hidden = false;
  document.body.classList.add("no-scroll");
}
function closeTray() {
  document.getElementById("tray").hidden = true;
  // ⚠ 絞り込みシートも同じ no-scroll を使う。開いているなら外さない
  if (!isFilterSheetOpen()) document.body.classList.remove("no-scroll");
}

// ---------- イベント配線 ----------

function debounce(fn, ms) {
  let id;
  return (...args) => {
    clearTimeout(id);
    id = setTimeout(() => fn(...args), ms);
  };
}

// すべての検索コントロールを既定値へ戻す（ブラウザのフォーム状態復元対策も兼ねる）
function resetControls() {
  el.q.value = "";
  el.qtext.value = "";
  filterGroups().forEach((g) => g.reset()); // 選択チップ・AND/OR・開閉状態をまとめて戻す
  el.fFormat.value = "";
  el.fSet.value = "";
  el.sort.value = "name";
  setOrder("ASC");
}

function setOrder(dir) {
  el.order.dataset.dir = dir;
  el.order.textContent = dir === "ASC" ? "▲ 昇順" : "▼ 降順";
}

// ---------- 絞り込み条件のURL共有（#20）----------
// クエリ名はAPIのパラメータ名に合わせ、既定値（未選択・OR・名前順・昇順）は書かない。
// 値は内部表現のまま大文字で書き、読み取りは大文字小文字を無視する（手打ちURLで壊れないように）。

// URLのクエリ名 ⇔ 絞り込みグループ
const urlGroups = () => [
  ["element", el.gElement], ["class", el.gClass], ["type", el.gType], ["subtype", el.gSubtype],
  // ⚠ ここに足すとバッジ集計・リセット・「選択中の条件」・アコーディオン・URL共有の
  //    5経路が同時に対応する（filterGroups() が urlGroups() から作られるため）。足し忘れると
  //    スマホのバッジが数え落とし、リセットで選択が残る
  ["rarity", el.gRarity],
];
const filterGroups = () => urlGroups().map(([, g]) => g);

const currentQs = () => location.search.replace(/^\?/, "");
const hasOption = (sel, v) => Array.from(sel.options).some((o) => o.value === v);

// 現在の絞り込みをクエリ文字列にする
function queryString() {
  const p = new URLSearchParams();
  if (el.q.value.trim()) p.set("q", el.q.value.trim());
  if (el.qtext.value.trim()) p.set("qtext", el.qtext.value.trim());
  urlGroups().forEach(([name, g]) => {
    const list = g.getValues();
    if (!list.length) return;
    list.forEach((v) => p.append(name, v)); // 同名パラメータの繰り返し（buildQuery と同じ規約）
    if (g.getMode() === "AND") p.set(name + "_op", "AND"); // ORは既定なので書かない
  });
  if (el.fFormat.value) p.set("format", el.fFormat.value);
  const setKey = GA_CARD_SEARCH.setKeyOf(el.fSet.value); // 添字ではなく prefix を書く（並び順に依存しない）
  if (setKey) p.set("set", setKey);
  if (el.sort.value && el.sort.value !== "name") p.set("sort", el.sort.value);
  if ((el.order.dataset.dir || "ASC") === "DESC") p.set("order", "DESC");
  return p.toString();
}

// 現在の絞り込みをURLに反映する（履歴を増やさない replaceState）。
// ⚠️ location.hash の連結は必須。クエリだけを指定すると #card/<slug> が落ちる
function saveQuery() {
  const qs = queryString();
  history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
}

// URLのクエリから絞り込みを復元する（共有リンク・他ページからの ?qtext= リンク・履歴移動・bfcache復帰）。
// 選択肢に無い値・未知のパラメータは黙って無視する。復元中はイベントを発火させないため、
// 呼び出し側で updateFilterBadge() と runSearch(true) を1回だけ行う
function applyUrlQuery() {
  const p = new URLSearchParams(location.search);
  const q = p.get("q");
  if (q) el.q.value = q;
  const qtext = p.get("qtext"); // 「ひとくちキーワード解説」からのリンクで従来から使われている
  if (qtext) el.qtext.value = qtext;
  urlGroups().forEach(([name, g]) => {
    const list = p.getAll(name);
    if (list.length) g.setValues(list);
    g.setMode(p.get(name + "_op") || "OR");
    // 受け取った人が「何で絞られているか」を一目で確認できるよう、値のあるグループは開く
    if (g.getValues().length) g.open = true;
  });
  const format = p.get("format");
  if (format && hasOption(el.fFormat, format)) el.fFormat.value = format;
  const setIdx = GA_CARD_SEARCH.setIndexOf(p.get("set"));
  if (setIdx) el.fSet.value = setIdx;
  const sort = (p.get("sort") || "").toLowerCase();
  if (sort && hasOption(el.sort, sort)) el.sort.value = sort;
  const order = (p.get("order") || "").toUpperCase();
  if (order === "ASC" || order === "DESC") setOrder(order);
}

// URL（クエリ）を唯一の入力として画面を作り直す。履歴移動・bfcache復帰の共通処理
function reloadFromUrl() {
  resetControls();
  applyUrlQuery();
  updateFilterBadge();
  runSearch(true);
}

// スマホでは絞り込み全体が畳まれるため、畳んだ状態でも選択件数が分かるようにトグルへバッジを出す。
// ⚠ 件数の出所を分けない。インラインのトグルと FAB の2つのバッジに「同じ n」を書く
function updateFilterBadge() {
  const n = filterGroups().reduce((sum, g) => sum + g.getValues().length, 0);
  const text = String(n);
  el.filterToggleBadge.hidden = n === 0;
  el.filterToggleBadge.textContent = text;
  if (el.filterFabBadge) {
    el.filterFabBadge.hidden = n === 0;
    el.filterFabBadge.textContent = text;
  }
  // バッジは数字だけなので、読み上げに件数が乗るよう FAB のアクセシブル名にも書く
  if (el.filterFab) {
    el.filterFab.setAttribute("aria-label", n === 0 ? "絞り込み・並び替え" : `絞り込み・並び替え（${n}件選択中）`);
  }
  // ⚠ 選択件数が変わる経路はここに全部集まっている（起動・URL復元・チップ変更・リセット）。
  //    「選択中の条件」の描き直しを各所に散らさず、この1か所から呼ぶ
  renderSelectedFilters();
}

// ---------- 選択中の絞り込み条件（設計書 §12-2 案A）----------
// ⚠ 実装は shared/js/card-search.js の createSelectedFilters()（左ペイン化_設計 §7-3 で移設）。
//   デッキ構築ツールも同じものを呼ぶ。⚠ ここへ書き戻さないこと（二重定義になる）。
// ⚠ 出す・出さないは style.css（#selected-filters は既定 display:none、1200px以上でだけ表示）が
//   決める。幅を見ない——幅の行き来のたびに作り直すと状態がずれるため。
const selectedFilters = GA_CARD_SEARCH.createSelectedFilters({
  container: el.selectedFilters,
  list: el.selectedFiltersList,
  groups: filterGroups,
  // 「すべて解除」で全群を空にしたあとの1回。⚠ 個別の✕は input.click() 経由なので
  //   グループ側の onChange（updateFilterBadge + runSearch）がそのまま走る＝ここは通らない
  onChange: () => { updateFilterBadge(); runSearch(true); },
});

function renderSelectedFilters() {
  selectedFilters.render();
}

// ---------- 絞り込みボトムシート（スマホ）----------
// ⚠ 状態は .controls の filters-open クラス1つだけ。FAB とインラインのトグルの
// どちらから開いても同じ関数を通す（入口ごとに状態を持つと2つのバッジ・aria が食い違う）
const MOBILE_MQ = window.matchMedia("(max-width: 640px)");
const SHEET_FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';
let filterOpener = null; // 閉じたときフォーカスを戻す先（開いた側のボタンを覚えておく）

function isFilterSheetOpen() {
  return !!(el.controls && el.controls.classList.contains("filters-open"));
}

function setFilterExpanded(open) {
  // ⚠ 片方だけ更新しない（FAB とトグルは同じシートを指している）
  if (el.filterToggle) el.filterToggle.setAttribute("aria-expanded", open ? "true" : "false");
  if (el.filterFab) el.filterFab.setAttribute("aria-expanded", open ? "true" : "false");
  if (el.filterToggleLabel) el.filterToggleLabel.textContent = "絞り込み・並び替え " + (open ? "▲" : "▾");
}

function openFilterSheet(opener) {
  if (!el.controls || isFilterSheetOpen()) return;
  filterOpener = opener || null;
  el.controls.classList.add("filters-open");
  setFilterExpanded(true);
  // ⚠ ダイアログ意味論はスマホで開いている間だけ。
  // PC では常時表示のインラインパネルであってダイアログではない
  if (MOBILE_MQ.matches && el.filterSheet) {
    el.filterSheet.setAttribute("role", "dialog");
    el.filterSheet.setAttribute("aria-modal", "true");
    el.filterSheet.setAttribute("aria-label", "絞り込み・並び替え");
    document.body.classList.add("no-scroll");
    if (el.filterSheetClose) el.filterSheetClose.focus();
  }
}

function closeFilterSheet() {
  if (!el.controls || !isFilterSheetOpen()) return;
  el.controls.classList.remove("filters-open");
  setFilterExpanded(false);
  if (el.filterSheet) {
    el.filterSheet.removeAttribute("role");
    el.filterSheet.removeAttribute("aria-modal");
    el.filterSheet.removeAttribute("aria-label");
  }
  // ⚠ 印刷トレイも同じ no-scroll を使う。開いているなら外さない
  const tray = document.getElementById("tray");
  if (!tray || tray.hidden) document.body.classList.remove("no-scroll");
  const back = filterOpener;
  filterOpener = null;
  // ⚠ どちらから開いたかを覚えて戻す（FAB から開いたら FAB へ、トグルからならトグルへ）
  if (back && document.contains(back) && back.getClientRects().length) back.focus();
}

function toggleFilterSheet(opener) {
  if (isFilterSheetOpen()) closeFilterSheet();
  else openFilterSheet(opener);
}

// シート内の「今フォーカスできる」要素。閉じた <details> の中は display:none なので矩形を持たない
function sheetFocusables() {
  if (!el.filterSheet) return [];
  return Array.from(el.filterSheet.querySelectorAll(SHEET_FOCUSABLE))
    .filter((n) => n.getClientRects().length > 0);
}

// FAB は「.controls が画面外に出たら」出す。スクロールイベントで毎フレーム測らないため
// IntersectionObserver を使う。⚠ PC幅では出さない（CSS と JS の両方でガードする）
let controlsIntersecting = true;
function updateFabVisibility() {
  if (!el.filterFab) return;
  const show = MOBILE_MQ.matches && !controlsIntersecting;
  el.filterFab.classList.toggle("is-hidden", !show);
}

function initFilterSheet() {
  if (el.filterToggle && el.controls) {
    el.filterToggle.addEventListener("click", () => toggleFilterSheet(el.filterToggle));
  }
  if (el.filterFab) el.filterFab.addEventListener("click", () => openFilterSheet(el.filterFab));
  if (el.filterSheetClose) el.filterSheetClose.addEventListener("click", closeFilterSheet);
  // 「この条件で見る」は閉じるだけ。チップ変更で既に即時検索が走っているので再検索しない
  if (el.filterApply) el.filterApply.addEventListener("click", closeFilterSheet);
  if (el.filterVeil) el.filterVeil.addEventListener("click", closeFilterSheet);

  // フォーカストラップ（Esc は既存のグローバル keydown 側で扱う）
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Tab" || !MOBILE_MQ.matches || !isFilterSheetOpen()) return;
    const nodes = sheetFocusables();
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const cur = document.activeElement;
    const inside = el.filterSheet.contains(cur);
    if (e.shiftKey) {
      if (!inside || cur === first) { e.preventDefault(); last.focus(); }
    } else if (!inside || cur === last) {
      e.preventDefault(); first.focus();
    }
  });

  if (el.controls && el.filterFab && "IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      controlsIntersecting = entries[entries.length - 1].isIntersecting;
      updateFabVisibility();
    }, { threshold: 0 }).observe(el.controls);
  }
  // 幅が PC 側へ移ったらダイアログ意味論を残さない（§6-3 は「スマホで開いている間だけ」）
  MOBILE_MQ.addEventListener("change", () => {
    if (!MOBILE_MQ.matches && isFilterSheetOpen()) closeFilterSheet();
    updateFabVisibility();
  });
  updateFabVisibility();
}

// ---------- 絞り込みグループのアコーディオン（設計書 §12-1）----------
// 1つ開いたら他は閉じる。⚠ 実装は shared/js/card-search.js の initAccordion()
// （左ペイン化_設計 §7-4 で移設。デッキ構築ツールも同じものを 1200px で呼ぶ＝§14-2 の G-2 で統一）。
// ⚠ 効かせるのは左ペインが出る 1200px 以上だけ。狭い幅では今までどおり複数開ける——
//   閉じたグループの中身を補う「選択中の条件」（案A）が PC幅にしか出ないため、
//   スマホで畳むと何を選んだのか分からなくなる（設計書 §3-3「1200px未満は現状のまま」）。
// ⚠ 閾値 1200 は style.css の #selected-filters の閾値と必ず揃える
const PANE_MIN_WIDTH = 1200;

function init() {
  // 複数選択（AND/OR）の絞り込みグループ。既定は閉じた状態（開くとチップが50個以上並ぶため）
  // ⚠ search: true は「選択肢を絞り込む欄」のオプトイン。⭐ 全群に渡し、実際にどれへ出すかは
  //   fillChips() 側の閾値（SEARCH_MIN=30種）が決める。ここで群を名指ししない——
  //   将来ほかの群が閾値を超えた日に、何もしなくても欄が現れるようにするため（設計書 §2）
  GA_CARD_SEARCH.fillChips(el.gElement, "elements", { label: "エレメント", orbs: true, search: true });
  GA_CARD_SEARCH.fillChips(el.gClass, "classes", { label: "クラス", search: true });
  GA_CARD_SEARCH.fillChips(el.gType, "types", { label: "タイプ", search: true });
  GA_CARD_SEARCH.fillChips(el.gSubtype, "subtypes", { label: "サブタイプ", top: GA_CARD_SEARCH.SUBTYPE_TOP, search: true });
  GA_CARD_SEARCH.fillChips(el.gRarity, "rarities", { label: "レアリティ", search: true });
  GA_CARD_SEARCH.fillFormatSelect(el.fFormat);
  GA_CARD_SEARCH.fillSetSelect(el.fSet);
  resetControls(); // 起動時は必ず「全て」から開始（前回選択の復元を打ち消す）
  applyUrlQuery(); // URLに条件が書いてあるときだけ復元する（順序を入れ替えると復元が消える）
  updateFilterBadge();

  el.q.addEventListener("input", debounce(() => runSearch(true), 350));
  el.qtext.addEventListener("input", debounce(() => runSearch(true), 350));
  [el.fFormat, el.fSet, el.sort].forEach((s) => s.addEventListener("change", () => runSearch(true)));
  filterGroups().forEach((g) => g.onChange(() => { updateFilterBadge(); runSearch(true); }));
  el.order.addEventListener("click", () => {
    setOrder((el.order.dataset.dir || "ASC") === "ASC" ? "DESC" : "ASC");
    runSearch(true);
  });
  el.loadMore.addEventListener("click", () => searchCtl.loadMore());
  el.reset.addEventListener("click", () => {
    resetControls();
    updateFilterBadge();
    runSearch(true);
  });

  // 絞り込みグループのアコーディオン（PC幅のみ。1つ開いたら他は閉じる）
  GA_CARD_SEARCH.initAccordion({ groups: filterGroups, minWidth: PANE_MIN_WIDTH });

  // 絞り込み・並び替えパネルの開閉（スマホのみ。PCでは常時表示）。
  // インラインのトグル・FAB・×・ベール・Esc をまとめて配線する
  initFilterSheet();

  // ヘッダのツールリンクの開閉（スマホのみトグル表示。PCでは常時表示）
  const toolsToggle = document.getElementById("tools-toggle");
  const siteHeader = document.querySelector(".site-header");
  if (toolsToggle && siteHeader) {
    toolsToggle.addEventListener("click", () => {
      const open = siteHeader.classList.toggle("tools-open");
      toolsToggle.setAttribute("aria-expanded", open ? "true" : "false");
      toolsToggle.textContent = "ツール " + (open ? "▲" : "▾");
    });
  }

  // カード詳細モーダル（共通コンポーネント）。印刷ボタンとハッシュ連動はこのページ固有
  GA_CARD_DETAIL.init({
    preferredArtIndex,
    namesUrl: TL_NAMES_URL,
    effectsUrl: TL_EFFECTS_URL, // 日本語の効果・フレーバーはダイアログを開くときに取得する(#22)
    seasonalUrl: SEASONAL_URL, // シーズン禁止(#34)。初期表示で取得済みのためここでは待たずに解決する
    action: {
      label: (card) => (imageUrl(card) ? "🖨️ 印刷リストに追加" : "画像がないため追加できません"),
      disabled: (card) => !imageUrl(card),
      // sel はサムネイルで選択中の版（shared/js/card-detail.js が渡す。無ければ null＝既定版）
      onClick: (card, sel) => addToPrint(card, sel && sel.url, sel && sel.label),
    },
    backAction: {
      label: (back) => (back.image ? "🖨️ 裏面を印刷リストに追加" : "画像がないため追加できません"),
      disabled: (back) => !back.image,
      // 裏面は sel.back（選択中の版に対応する裏面）を使う。その版に裏面画像が無ければ
      // 既定版の裏面(back.image)に倒す＝そのとき版ラベルは付けない（実物と食い違うため）
      onClick: (back, sel) => {
        const useSel = !!(sel && sel.back);
        addToPrintItem(back.slug, jpName(back), useSel ? sel.back : back.image, useSel ? sel.label : null);
      },
    },
    onAfterOpen: (card) => {
      if (card.slug) history.replaceState(null, "", "#card/" + encodeURIComponent(card.slug));
    },
    onAfterClose: () => {
      if (location.hash.startsWith("#card/")) {
        history.replaceState(null, "", location.pathname + location.search);
      }
    },
  });

  // 印刷リスト関連の配線
  document.getElementById("open-tray").addEventListener("click", openTray);
  document.getElementById("tray").querySelectorAll("[data-tray-close]").forEach((n) => n.addEventListener("click", closeTray));
  document.getElementById("tray-clear").addEventListener("click", clearPrint);
  document.getElementById("tray-generate").addEventListener("click", generateProxyPdf);

  const trayList = document.getElementById("tray-list");
  trayList.addEventListener("click", (e) => {
    const li = e.target.closest(".tray-item");
    if (!li) return;
    const key = li.getAttribute("data-key");
    if (e.target.classList.contains("tray-remove")) removeFromPrint(key);
    else if (e.target.classList.contains("qty-inc")) changeQty(key, +1);
    else if (e.target.classList.contains("qty-dec")) changeQty(key, -1);
  });
  trayList.addEventListener("change", (e) => {
    if (!e.target.classList.contains("qty-input")) return;
    const li = e.target.closest(".tray-item");
    if (li) setQty(li.getAttribute("data-key"), parseInt(e.target.value, 10));
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!document.getElementById("tray").hidden) closeTray();
    else if (GA_CARD_DETAIL.isOpen()) GA_CARD_DETAIL.close();
    else if (MOBILE_MQ.matches && isFilterSheetOpen()) closeFilterSheet();
  });

  window.addEventListener("hashchange", handleHash);
  // bfcache 復帰時（戻る/進む等）にブラウザがフォームを復元することがあるため、初期化し直す。
  // bfcache はURLごと復元するので、初期化のあとURLの条件を復元し直す（クリアされないように）
  window.addEventListener("pageshow", (e) => { if (e.persisted) reloadFromUrl(); });
  // bfcacheが効かない環境での復帰（履歴移動でクエリだけ変わった場合も追従する）。
  // 画面が既にURLどおりなら何もしない（ハッシュ操作で無駄な検索を走らせないため）
  window.addEventListener("popstate", () => { if (currentQs() !== queryString()) reloadFromUrl(); });

  updatePrintBar(); // localStorage から復元
  // 幅が変わるとバーの文言の折り返しが変わり高さも変わる。FAB の退避量を追従させる
  window.addEventListener("resize", syncPrintBarHeight);

  // 名前の訳が入る前に描画すると英語名のグリッドが一瞬出るため、初期表示だけは取得を待つ。
  // シーズン禁止(#34)のバッジも描画時に要るので同じ便で待つ（描画とのレースを作らない）。
  // 取得失敗時も resolve する（fail-open＝英語名で描画されるだけ・#22 R3）
  Promise.all([namesReady, seasonalReady]).then(() => {
    runSearch(true); // 初期表示（名前順の先頭ページ）
    handleHash(); // 共有リンク（#card/<slug>）で開かれた場合は該当カードを表示
  });
}

init();
