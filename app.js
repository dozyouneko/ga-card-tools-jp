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
  // クラス/エレメント/タイプ/サブタイプは複数選択（AND/OR）のチップ群。
  // 中身は GA_CARD_SEARCH.fillChips() が構築し、getValues()/getMode()/setValues()/setMode()/reset() を持つ
  gClass: document.getElementById("g-class"),
  gElement: document.getElementById("g-element"),
  gType: document.getElementById("g-type"),
  gSubtype: document.getElementById("g-subtype"),
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
};

// 共通ヘルパー(shared/js/card-i18n.js)。トップページとデッキ構築ツールで共用
const {
  tr, jpName, firstEdition, imageUrl, flipEdition, backFace,
  escapeHtml, hasJapanese, renderEffect, label, isTranslated,
  cardImages, rarityCode, speedLabel, formatBadgeHtml,
} = window.GA_CARD_I18N;

// クエリ構築・日本語ローカル検索・ページング・setPrefixes は shared/js/card-search.js に共通化
const { setPrefixes } = window.GA_CARD_SEARCH;

// ---------- ユーティリティ ----------
// escapeHtml / renderEffect / isTranslated / label / rarityCode / フォーマット判定 /
// cardImages / speedLabel は shared/js/card-i18n.js に共通化済み。

// エキスパンション（版）で絞り込み検索している場合、その版のイラストを初期表示にする。
// 絞り込みが無い、または一致する版が無い場合は先頭（imgs[0]）にフォールバック。
function preferredArtIndex(imgs) {
  const pre = setPrefixes(el.fSet.value);
  if (!pre.length) return 0;
  const idx = imgs.findIndex((im) => pre.includes(im.prefix));
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
    format: el.fFormat, set: el.fSet, sort: el.sort, order: el.order,
  },
  pageSize: 50,
  jpPageSize: 40,
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
  onResults: (cards, info) => {
    appendGrid(cards);
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
      el.status.textContent = "このページには該当がありませんでした。「もっと見る」で続きを検索できます。";
      el.loadMore.hidden = false;
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
  if (info.approxTotal) suffix += "（AND条件などは取得済みのページに適用するため、総件数は表示できません）";
  el.status.textContent = `${shown} 件を表示${totalPart}${suffix}`;
  el.loadMore.hidden = !info.hasMore;
}

// ---------- グリッド描画 ----------

function appendGrid(cards) {
  if (!cards.length) return;
  const frag = document.createDocumentFragment();
  cards.forEach((card) => {
    const slug = card.slug || card.uuid;
    if (slug && shownSlugs.has(slug)) return; // 重複表示を防ぐ
    if (slug) shownSlugs.add(slug);
    const translated = isTranslated(card);
    const imgs = cardImages(card);
    const initialAi = preferredArtIndex(imgs);
    const img = imgs.length ? imgs[initialAi].url : null;
    const back = backFace(card); // 両面カードなら裏面（無ければ null）

    const cardEl = document.createElement("div");
    cardEl.className = "card";
    cardEl.setAttribute("role", "button");
    cardEl.setAttribute("tabindex", "0");
    cardEl.setAttribute("aria-label", jpName(card));

    const typeChips = (card.types || []).map((t) => label("types", t)).join(" / ");
    const levelChip = card.level != null ? `Lv.${card.level}` : "";
    const elemChips = (card.elements || []).map((e) => label("elements", e)).join("・");

    cardEl.innerHTML = `
      <div class="card-img">
        ${img ? `<img loading="lazy" crossorigin="anonymous" src="${escapeHtml(img)}" alt="">` : `<div class="noimg">画像なし</div>`}
        <span class="tl-badge ${translated ? "tl-yes" : "tl-no"}">${translated ? "日本語訳あり" : "未翻訳"}</span>
        ${formatBadgeHtml(card)}
        ${imgs.length > 1 ? `<button class="art-badge" type="button" title="イラスト/版を切り替え（${imgs.length}種）" aria-label="イラストを切り替え">🎨 ${imgs.length}・${escapeHtml(imgs[initialAi].prefix)}</button>` : ""}
        ${back ? `<button class="flip-badge" type="button" title="両面カード：表裏を切り替え" aria-label="裏面を表示">🔄 両面</button>` : ""}
        ${img ? `<button class="card-add" type="button" title="印刷リストに追加" aria-label="印刷リストに追加">＋🖨️</button>` : ""}
      </div>
      <div class="card-body">
        <p class="card-name">${escapeHtml(jpName(card))}</p>
        <p class="card-name-en">${escapeHtml(card.name)}</p>
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
    const addBtn = cardEl.querySelector(".card-add");
    if (addBtn) addBtn.addEventListener("click", (e) => { e.stopPropagation(); addToPrint(card); });
    // イラスト切替（🎨）と表裏切替（🔄）は同じ <img> を共有するため、
    // 状態（表面アート番号 ai / 裏面表示 showingBack）を一元管理して衝突を防ぐ。
    const artBadge = cardEl.querySelector(".art-badge");
    const flipBadge = cardEl.querySelector(".flip-badge");
    const imgEl = cardEl.querySelector(".card-img img");
    if (imgEl && (artBadge || flipBadge)) {
      let ai = initialAi;      // 選択中の版（イラスト）番号
      let showingBack = false; // 裏面を表示中か
      const syncImg = () => {
        const cur = imgs[ai] || imgs[0];
        if (!cur) return;
        // 裏面画像は選択中の版に紐づく（例：CSR表面→CSR裏面）。無ければ表面にフォールバック。
        imgEl.src = showingBack && cur.back ? cur.back : cur.url;
        if (flipBadge) flipBadge.textContent = showingBack ? "🔄 裏面" : "🔄 両面";
      };
      if (artBadge) {
        artBadge.addEventListener("click", (e) => {
          e.stopPropagation();
          ai = (ai + 1) % imgs.length; // 版を切替。表裏の状態(showingBack)は保持
          syncImg();
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

function addToPrint(card) {
  const image = imageUrl(card);
  if (!image) return; // 画像なしは追加不可
  addToPrintItem(card.slug || card.uuid, jpName(card), image);
}

// 印刷リストへの追加の共通部。両面カードの裏面(card形状に正規化済み)からも使う
function addToPrintItem(id, name, image) {
  if (!id || !image) return;
  const existing = printList.find((x) => x.id === id);
  if (existing) existing.qty = Math.min(existing.qty + 1, 99);
  else printList.push({ id, name, image, qty: 1 });
  savePrintList();
  updatePrintBar();
  renderTray();
}

function setQty(id, qty) {
  const it = printList.find((x) => x.id === id);
  if (!it) return;
  it.qty = Math.max(1, Math.min(99, qty || 1));
  savePrintList();
  updatePrintBar();
  renderTray();
}
function changeQty(id, delta) {
  const it = printList.find((x) => x.id === id);
  if (it) setQty(id, it.qty + delta);
}
function removeFromPrint(id) {
  printList = printList.filter((x) => x.id !== id);
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
  if (n === 0) { bar.hidden = true; return; }
  const pages = CardSheet.pageCountFor(n);
  document.getElementById("print-bar-text").textContent =
    `印刷リスト: ${printList.length}種 / ${n}枚（A4 ${pages}ページ）`;
  bar.hidden = false;
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
    <li class="tray-item" data-id="${escapeHtml(it.id)}">
      <img crossorigin="anonymous" src="${escapeHtml(it.image)}" alt="" />
      <span class="tray-name">${escapeHtml(it.name)}</span>
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
    const { jsPDF } = window.jspdf;
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
  document.body.classList.remove("no-scroll");
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

// スマホでは絞り込み全体が畳まれるため、畳んだ状態でも選択件数が分かるようにトグルへバッジを出す
function updateFilterBadge() {
  const n = filterGroups().reduce((sum, g) => sum + g.getValues().length, 0);
  el.filterToggleBadge.hidden = n === 0;
  el.filterToggleBadge.textContent = String(n);
}

function init() {
  // 複数選択（AND/OR）の絞り込みグループ。既定は閉じた状態（開くとチップが50個以上並ぶため）
  GA_CARD_SEARCH.fillChips(el.gElement, "elements", { label: "エレメント", orbs: true });
  GA_CARD_SEARCH.fillChips(el.gClass, "classes", { label: "クラス" });
  GA_CARD_SEARCH.fillChips(el.gType, "types", { label: "タイプ" });
  GA_CARD_SEARCH.fillChips(el.gSubtype, "subtypes", { label: "サブタイプ", top: GA_CARD_SEARCH.SUBTYPE_TOP });
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

  // 絞り込み・並び替えパネルの開閉（スマホのみトグル表示。PCでは常時表示）
  if (el.filterToggle && el.controls) {
    el.filterToggle.addEventListener("click", () => {
      const open = el.controls.classList.toggle("filters-open");
      el.filterToggle.setAttribute("aria-expanded", open ? "true" : "false");
      el.filterToggleLabel.textContent = "絞り込み・並び替え " + (open ? "▲" : "▾");
    });
  }

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
    action: {
      label: (card) => (imageUrl(card) ? "🖨️ 印刷リストに追加" : "画像がないため追加できません"),
      disabled: (card) => !imageUrl(card),
      onClick: (card) => addToPrint(card),
    },
    backAction: {
      label: (back) => (back.image ? "🖨️ 裏面を印刷リストに追加" : "画像がないため追加できません"),
      disabled: (back) => !back.image,
      onClick: (back) => addToPrintItem(back.slug, jpName(back), back.image),
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
    const id = li.getAttribute("data-id");
    if (e.target.classList.contains("tray-remove")) removeFromPrint(id);
    else if (e.target.classList.contains("qty-inc")) changeQty(id, +1);
    else if (e.target.classList.contains("qty-dec")) changeQty(id, -1);
  });
  trayList.addEventListener("change", (e) => {
    if (!e.target.classList.contains("qty-input")) return;
    const li = e.target.closest(".tray-item");
    if (li) setQty(li.getAttribute("data-id"), parseInt(e.target.value, 10));
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!document.getElementById("tray").hidden) closeTray();
    else if (GA_CARD_DETAIL.isOpen()) GA_CARD_DETAIL.close();
  });

  window.addEventListener("hashchange", handleHash);
  // bfcache 復帰時（戻る/進む等）にブラウザがフォームを復元することがあるため、初期化し直す。
  // bfcache はURLごと復元するので、初期化のあとURLの条件を復元し直す（クリアされないように）
  window.addEventListener("pageshow", (e) => { if (e.persisted) reloadFromUrl(); });
  // bfcacheが効かない環境での復帰（履歴移動でクエリだけ変わった場合も追従する）。
  // 画面が既にURLどおりなら何もしない（ハッシュ操作で無駄な検索を走らせないため）
  window.addEventListener("popstate", () => { if (currentQs() !== queryString()) reloadFromUrl(); });

  updatePrintBar(); // localStorage から復元
  runSearch(true); // 初期表示（名前順の先頭ページ）
  handleHash(); // 共有リンク（#card/<slug>）で開かれた場合は該当カードを表示
}

init();
