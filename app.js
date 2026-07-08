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
  fClass: document.getElementById("f-class"),
  fElement: document.getElementById("f-element"),
  fType: document.getElementById("f-type"),
  fSubtype: document.getElementById("f-subtype"),
  fSet: document.getElementById("f-set"),
  sort: document.getElementById("f-sort"),
  order: document.getElementById("order"),
  reset: document.getElementById("reset"),
  status: document.getElementById("status"),
  grid: document.getElementById("grid"),
  loadMore: document.getElementById("load-more"),
  controls: document.getElementById("controls"),
  filterToggle: document.getElementById("filter-toggle"),
};

// エキスパンション定義（製品ライン → prefix 群）
const SETS = (I18N.meta && I18N.meta.sets) || [];

// 検索・ページングの状態
const pager = { page: 1, total: 0, shown: 0, hasMore: false, shownSlugs: new Set() };

// 共通ヘルパー(shared/js/card-i18n.js)。トップページとデッキ構築ツールで共用
const {
  tr, jpName, firstEdition, imageUrl, flipEdition, backFace,
  escapeHtml, hasJapanese, renderEffect, label, isTranslated,
  cardImages, rarityCode, speedLabel, formatBadgeHtml,
} = window.GA_CARD_I18N;

// 名前欄・効果テキスト欄それぞれの日本語入力を返す（無ければ ""）
// サーバーは英語データのみのため、日本語はローカル訳（name/effect）から検索する。
function jpNameQuery() {
  const n = el.q.value.trim();
  return n && hasJapanese(n) ? n : "";
}
function jpEffectQuery() {
  const t = el.qtext.value.trim();
  return t && hasJapanese(t) ? t : "";
}
// いずれかの欄に日本語が入っている → ローカル訳を検索するモード
function isJpTextMode() {
  return jpNameQuery() !== "" || jpEffectQuery() !== "";
}
function setPrefixes(val) {
  if (val === "" || val == null) return []; // 「全て」（Number("") が 0 になる罠を回避）
  const i = Number(val);
  const s = Number.isInteger(i) ? SETS[i] : null;
  return s ? s.prefixes : [];
}

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

// ---------- フィルタ選択肢の生成 ----------

function fillSelect(select, kind) {
  const map = (I18N.meta && I18N.meta[kind]) || {};
  Object.keys(map).sort().forEach((key) => {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = `${key}（${map[key]}）`;
    select.appendChild(opt);
  });
}

// エキスパンション選択肢（value は SETS のインデックス）
function fillSetSelect() {
  SETS.forEach((s, i) => {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = s.label;
    el.fSet.appendChild(opt);
  });
}

// ---------- API 呼び出し ----------

let reqSeq = 0; // 競合するリクエストの取り違え防止

function buildQuery(page) {
  const p = new URLSearchParams();
  const q = el.q.value.trim();
  if (q) p.set("name", q);
  const text = el.qtext.value.trim();
  if (text) p.set("effect", text); // 効果テキスト検索（英語）。日本語は JP モードで別処理
  if (el.fClass.value) p.set("class", el.fClass.value);
  if (el.fElement.value) p.set("element", el.fElement.value);
  if (el.fType.value) p.set("type", el.fType.value);
  if (el.fSubtype.value) p.set("subtype", el.fSubtype.value);
  setPrefixes(el.fSet.value).forEach((pre) => p.append("prefix", pre)); // エキスパンション（複数prefix）
  p.set("sort", el.sort.value || "name");
  p.set("order", el.order.dataset.dir || "ASC");
  p.set("page", String(page));
  p.set("page_size", "50");
  return p.toString();
}

// reset=true で新規検索（1ページ目・グリッド全消去）、false で「もっと見る」（追記）
async function runSearch(reset) {
  // 効果テキスト欄が日本語 → サーバーは英語のみのため、ローカル訳から検索するモードに切替
  if (isJpTextMode()) { runLocalJpSearch(reset); return; }

  const seq = ++reqSeq;
  if (reset) { pager.page = 1; pager.shownSlugs = new Set(); }
  el.status.textContent = reset ? "検索中…" : "読み込み中…";
  el.loadMore.disabled = true;
  try {
    const res = await fetch(`${API}/cards/search?${buildQuery(pager.page)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (seq !== reqSeq) return; // 古いレスポンスは破棄
    const cards = json.data || [];
    pager.total = json.total_cards || 0;
    pager.hasMore = !!json.has_more;
    if (reset) el.grid.innerHTML = "";
    appendGrid(cards);
    updateSearchStatus();
  } catch (err) {
    if (seq !== reqSeq) return;
    if (!reset && pager.page > 1) pager.page -= 1; // 追記失敗はページを戻して再試行可能に
    el.status.textContent = `読み込みに失敗しました（${err.message}）。時間をおいて再度お試しください。`;
    if (reset) { el.grid.innerHTML = ""; el.loadMore.hidden = true; }
  } finally {
    if (seq === reqSeq) el.loadMore.disabled = false;
  }
}

// 日本語テキスト検索：ローカル訳（name/effect）の部分一致 → 該当カードを取得して表示
// English/API検索と同じ pager（page/total/hasMore）を使い、"もっと見る" でページ送りできるようにする。
const JP_PAGE_SIZE = 40;

async function runLocalJpSearch(reset) {
  const seq = ++reqSeq;
  if (reset) {
    pager.page = 1;
    pager.shownSlugs = new Set();
    el.grid.innerHTML = "";
    el.loadMore.hidden = true;
  }
  el.status.textContent = reset ? "日本語テキストで検索中…" : "読み込み中…";
  el.loadMore.disabled = true;
  try {
    const slugs = localJpSlugs();
    pager.total = slugs.length; // class/element/type/set の絞り込みはこの後クライアント側で適用されるため、この総数には反映されない
    const from = (pager.page - 1) * JP_PAGE_SIZE;
    const batch = slugs.slice(from, from + JP_PAGE_SIZE);
    const cards = await fetchLocalJpMatches(seq, batch);
    if (seq !== reqSeq) return;
    pager.hasMore = from + JP_PAGE_SIZE < pager.total;
    appendGrid(cards);
    updateSearchStatus("（日本語テキスト一致・翻訳済みのみ）", "日本語テキストに一致する翻訳済みカードが見つかりませんでした（未翻訳のカードは日本語検索できません。英語での検索もお試しください）。");
  } catch (err) {
    if (seq !== reqSeq) return;
    if (!reset && pager.page > 1) pager.page -= 1;
    el.status.textContent = `検索に失敗しました（${err.message}）。`;
  } finally {
    if (seq === reqSeq) el.loadMore.disabled = false;
  }
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
  return out;
}

// ローカル一致した slug（1ページ分）のカードを取得し、他の絞り込み条件で客側フィルタして返す（並列取得）
async function fetchLocalJpMatches(seq, slugs) {
  const cards = await Promise.all(slugs.map(async (slug) => {
    try {
      const res = await fetch(`${API}/cards/${encodeURIComponent(slug)}`);
      return res.ok ? await res.json() : null;
    } catch { return null; }
  }));
  if (seq !== reqSeq) return [];
  return cards.filter((c) => c && matchesActiveFilters(c));
}

// class/element/type/subtype/set の絞り込みにカードが合致するか（JPモードの客側フィルタ用）
// 名前/効果の一致は localJpSlugs 側で処理済みのため、ここでは再適用しない。
function matchesActiveFilters(card) {
  if (el.fClass.value && !(card.classes || []).includes(el.fClass.value)) return false;
  if (el.fElement.value && !(card.elements || []).includes(el.fElement.value)) return false;
  if (el.fType.value && !(card.types || []).includes(el.fType.value)) return false;
  if (el.fSubtype.value && !(card.subtypes || []).includes(el.fSubtype.value)) return false;
  const pre = setPrefixes(el.fSet.value);
  if (pre.length) {
    const eds = card.editions || card.result_editions || [];
    if (!eds.some((e) => e.set && pre.includes(e.set.prefix))) return false;
  }
  return true;
}

// suffix: 件数表示の末尾に添える注記（JP検索モード用）。emptyMessage: 0件時の文言差し替え（省略時は既定文言）。
function updateSearchStatus(suffix, emptyMessage) {
  pager.shown = el.grid.childElementCount;
  if (pager.shown === 0) {
    el.status.textContent = emptyMessage || "該当するカードがありません。条件を変えてお試しください。";
    el.loadMore.hidden = true;
    return;
  }
  const totalPart = pager.total > pager.shown ? ` / 全 ${pager.total} 件` : "";
  el.status.textContent = `${pager.shown} 件を表示${totalPart}${suffix || ""}`;
  el.loadMore.hidden = !pager.hasMore;
}

function loadMore() {
  if (!pager.hasMore) return;
  pager.page += 1;
  runSearch(false);
}

// ---------- グリッド描画 ----------

function appendGrid(cards) {
  if (!cards.length) return;
  const frag = document.createDocumentFragment();
  cards.forEach((card) => {
    const slug = card.slug || card.uuid;
    if (slug && pager.shownSlugs.has(slug)) return; // 重複表示を防ぐ
    if (slug) pager.shownSlugs.add(slug);
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
  const id = card.slug || card.uuid;
  const existing = printList.find((x) => x.id === id);
  if (existing) existing.qty = Math.min(existing.qty + 1, 99);
  else printList.push({ id, name: jpName(card), image, qty: 1 });
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
  el.fClass.value = "";
  el.fElement.value = "";
  el.fType.value = "";
  el.fSubtype.value = "";
  el.fSet.value = "";
  el.sort.value = "name";
  el.order.dataset.dir = "ASC";
  el.order.textContent = "▲ 昇順";
}

// 他ページ（ひとくちキーワード解説など）からのリンクで ?qtext=... が付いていれば、効果テキスト検索欄に反映する
function applyUrlQuery() {
  const qtext = new URLSearchParams(location.search).get("qtext");
  if (qtext) el.qtext.value = qtext;
}

function init() {
  fillSelect(el.fClass, "classes");
  fillSelect(el.fElement, "elements");
  fillSelect(el.fType, "types");
  fillSelect(el.fSubtype, "subtypes");
  fillSetSelect();
  resetControls(); // 起動時は必ず「全て」から開始（前回選択の復元を打ち消す）
  applyUrlQuery();

  el.q.addEventListener("input", debounce(() => runSearch(true), 350));
  el.qtext.addEventListener("input", debounce(() => runSearch(true), 350));
  [el.fClass, el.fElement, el.fType, el.fSubtype, el.fSet, el.sort].forEach((s) => s.addEventListener("change", () => runSearch(true)));
  el.order.addEventListener("click", () => {
    const next = (el.order.dataset.dir || "ASC") === "ASC" ? "DESC" : "ASC";
    el.order.dataset.dir = next;
    el.order.textContent = next === "ASC" ? "▲ 昇順" : "▼ 降順";
    runSearch(true);
  });
  el.loadMore.addEventListener("click", loadMore);
  el.reset.addEventListener("click", () => {
    resetControls();
    runSearch(true);
  });

  // 絞り込み・並び替えパネルの開閉（スマホのみトグル表示。PCでは常時表示）
  if (el.filterToggle && el.controls) {
    el.filterToggle.addEventListener("click", () => {
      const open = el.controls.classList.toggle("filters-open");
      el.filterToggle.setAttribute("aria-expanded", open ? "true" : "false");
      el.filterToggle.textContent = "絞り込み・並び替え " + (open ? "▲" : "▾");
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
  // bfcache 復帰時（戻る/進む等）にブラウザがフォームを復元することがあるため、初期化し直す
  window.addEventListener("pageshow", (e) => { if (e.persisted) { resetControls(); runSearch(true); } });

  updatePrintBar(); // localStorage から復元
  runSearch(true); // 初期表示（名前順の先頭ページ）
  handleHash(); // 共有リンク（#card/<slug>）で開かれた場合は該当カードを表示
}

init();
