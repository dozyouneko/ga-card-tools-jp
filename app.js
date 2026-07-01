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
  fSet: document.getElementById("f-set"),
  sort: document.getElementById("f-sort"),
  order: document.getElementById("order"),
  reset: document.getElementById("reset"),
  status: document.getElementById("status"),
  grid: document.getElementById("grid"),
  loadMore: document.getElementById("load-more"),
  langEn: document.getElementById("lang-en"),
  modal: document.getElementById("modal"),
};

// エキスパンション定義（製品ライン → prefix 群）
const SETS = (I18N.meta && I18N.meta.sets) || [];

// 検索・ページングの状態
const pager = { page: 1, total: 0, shown: 0, hasMore: false, shownSlugs: new Set() };

function hasJapanese(s) {
  return /[぀-ヿ㐀-鿿ｦ-ﾝ]/.test(s || "");
}
// 効果テキスト欄に日本語が含まれる → ローカル訳のみを検索するモード
function isJpTextMode() {
  const t = el.qtext.value.trim();
  return !!t && hasJapanese(t);
}
function setPrefixes(val) {
  const s = SETS[Number(val)];
  return s ? s.prefixes : [];
}

// ---------- ユーティリティ ----------

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// 効果テキストの簡易マークダウン（**太字** / *斜体* / 改行）を安全にHTML化
function renderEffect(text) {
  if (!text) return '<span class="muted">（効果テキストなし）</span>';
  let html = escapeHtml(text);
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(/\n/g, "<br>");
  return html;
}

function tr(card) {
  return (I18N.cards && I18N.cards[card.slug]) || null;
}

function jpName(card) {
  const t = tr(card);
  return t && t.name ? t.name : card.name;
}

// 「英語（和訳）」形式で表示。和訳が無ければ英語のみ。 例: FIRE（火）
function label(kind, value) {
  const map = (I18N.meta && I18N.meta[kind]) || {};
  return map[value] ? `${value}（${map[value]}）` : value;
}

function firstEdition(card) {
  const eds = card.editions || card.result_editions || [];
  return eds[0] || null;
}

function imageUrl(card) {
  const ed = firstEdition(card);
  return ed && ed.image ? IMG_BASE + ed.image : null;
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
  if (isJpTextMode()) { runLocalJpSearch(); return; }

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
async function runLocalJpSearch() {
  const seq = ++reqSeq;
  el.status.textContent = "日本語テキストで検索中…";
  el.loadMore.hidden = true;
  el.grid.innerHTML = "";
  pager.shownSlugs = new Set();
  pager.total = 0;
  pager.hasMore = false;
  try {
    const cards = await fetchLocalJpMatches(seq);
    if (seq !== reqSeq) return;
    appendGrid(cards);
    const n = el.grid.childElementCount;
    el.status.textContent = n === 0
      ? "日本語テキストに一致する翻訳済みカードが見つかりませんでした（未翻訳のカードは日本語検索できません。英語での検索もお試しください）。"
      : `${n} 件を表示（日本語テキスト一致・翻訳済みのみ）`;
  } catch (err) {
    if (seq !== reqSeq) return;
    el.status.textContent = `検索に失敗しました（${err.message}）。`;
  }
}

// ローカル訳を部分一致検索して slug の配列を返す
function localJpSlugs(query) {
  const q = query.toLowerCase();
  const cards = I18N.cards || {};
  const out = [];
  for (const slug in cards) {
    const c = cards[slug];
    const hay = `${c.name || ""}\n${c.effect || ""}`.toLowerCase();
    if (hay.includes(q)) out.push(slug);
  }
  return out;
}

// ローカル一致した slug のカードを取得し、他の絞り込み条件で客側フィルタして返す
async function fetchLocalJpMatches(seq) {
  const q = el.qtext.value.trim();
  const slugs = localJpSlugs(q).slice(0, 30);
  const results = [];
  for (const slug of slugs) {
    try {
      const res = await fetch(`${API}/cards/${encodeURIComponent(slug)}`);
      if (seq !== reqSeq) return results;
      if (!res.ok) continue;
      const card = await res.json();
      if (matchesActiveFilters(card)) results.push(card);
    } catch { /* 個別失敗はスキップ */ }
  }
  return results;
}

// class/element/type/set/name の各絞り込みにカードが合致するか（JPモードの客側フィルタ用）
function matchesActiveFilters(card) {
  if (el.fClass.value && !(card.classes || []).includes(el.fClass.value)) return false;
  if (el.fElement.value && !(card.elements || []).includes(el.fElement.value)) return false;
  if (el.fType.value && !(card.types || []).includes(el.fType.value)) return false;
  const pre = setPrefixes(el.fSet.value);
  if (pre.length) {
    const eds = card.editions || card.result_editions || [];
    if (!eds.some((e) => e.set && pre.includes(e.set.prefix))) return false;
  }
  const nq = el.q.value.trim().toLowerCase();
  if (nq) {
    const nm = `${card.name || ""}\n${jpName(card)}`.toLowerCase();
    if (!nm.includes(nq)) return false;
  }
  return true;
}

function updateSearchStatus() {
  pager.shown = el.grid.childElementCount;
  if (pager.shown === 0) {
    el.status.textContent = "該当するカードがありません。条件を変えてお試しください。";
    el.loadMore.hidden = true;
    return;
  }
  const totalPart = pager.total > pager.shown ? ` / 全 ${pager.total} 件` : "";
  el.status.textContent = `${pager.shown} 件を表示${totalPart}`;
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
    const translated = !!tr(card);
    const img = imageUrl(card);

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
        <span class="tl-badge ${translated ? "tl-yes" : "tl-no"}">${translated ? "日本語訳あり" : "翻訳募集中"}</span>
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
    cardEl.addEventListener("click", () => openDetail(card));
    cardEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDetail(card); }
    });
    const addBtn = cardEl.querySelector(".card-add");
    if (addBtn) addBtn.addEventListener("click", (e) => { e.stopPropagation(); addToPrint(card); });
    frag.appendChild(cardEl);
  });
  el.grid.appendChild(frag);
  applyLangPref();
}

// ---------- 詳細モーダル ----------

function metaRow(label, value) {
  if (value == null || value === "" ) return "";
  return `<div class="meta-row"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;
}

function openDetail(card) {
  const t = tr(card);
  const img = imageUrl(card);
  document.getElementById("d-img").src = img || "";
  document.getElementById("d-img").alt = jpName(card);

  const badge = document.getElementById("d-badge");
  badge.textContent = t ? "日本語訳あり" : "翻訳募集中";
  badge.className = "badge " + (t ? "badge-yes" : "badge-no");

  document.getElementById("d-name").textContent = jpName(card);
  document.getElementById("d-name-en").textContent = card.name;

  // メタ情報
  const classes = (card.classes || []).map((c) => label("classes", c)).join("・");
  const elements = (card.elements || []).map((e) => label("elements", e)).join("・");
  const types = (card.types || []).map((x) => label("types", x)).join("・");
  const subtypes = (card.subtypes || []).map((x) => label("subtypes", x)).join("・");
  const cost = card.cost ? `${card.cost.value}（${card.cost.type}）` : "";
  document.getElementById("d-meta").innerHTML =
    metaRow("タイプ", types) +
    metaRow("クラス", classes) +
    metaRow("エレメント", elements) +
    metaRow("サブタイプ", subtypes) +
    metaRow("レベル", card.level) +
    metaRow("コスト", cost) +
    metaRow("パワー", card.power) +
    metaRow("ライフ", card.life) +
    metaRow("耐久", card.durability) +
    metaRow("スピード", card.speed);

  // 効果（日本語 / 英語原文）
  const jpEffect = t && t.effect ? t.effect : null;
  const jpBox = document.getElementById("d-effect-jp");
  if (jpEffect) {
    jpBox.innerHTML = renderEffect(jpEffect);
  } else {
    jpBox.innerHTML = '<span class="muted">日本語訳はまだありません（翻訳募集中）。下の英語原文をご覧ください。</span>';
  }
  document.getElementById("d-effect-en").innerHTML = renderEffect(card.effect);

  // フレーバー
  const flavor = (t && t.flavor) || card.flavor;
  const flavorWrap = document.getElementById("d-flavor-wrap");
  if (flavor) {
    document.getElementById("d-flavor").textContent = flavor;
    flavorWrap.hidden = false;
  } else {
    flavorWrap.hidden = true;
  }

  renderTerms(card);
  renderEditions(card);

  // 印刷リスト追加ボタンの状態
  currentDetailCard = card;
  const addBtn = document.getElementById("d-add-print");
  addBtn.disabled = !img;
  addBtn.textContent = img ? "🖨️ 印刷リストに追加" : "画像がないため追加できません";

  el.modal.hidden = false;
  document.body.classList.add("no-scroll");
  if (card.slug) history.replaceState(null, "", "#card/" + encodeURIComponent(card.slug));
}

// 効果文中に登場するゲーム用語を検出して解説を並べる（日本語DBの付加価値）
function renderTerms(card) {
  const wrap = document.getElementById("d-terms-wrap");
  const list = document.getElementById("d-terms");
  const haystack = `${card.effect || ""}`.toLowerCase();
  const found = [];
  Object.keys(I18N.terms || {}).forEach((key) => {
    if (haystack.includes(key)) found.push(I18N.terms[key]);
  });
  if (!found.length) {
    wrap.hidden = true;
    return;
  }
  list.innerHTML = found
    .map((term) => `<li><span class="term-jp">${escapeHtml(term.jp)}</span><span class="term-desc">${escapeHtml(term.desc)}</span></li>`)
    .join("");
  wrap.hidden = false;
}

function renderEditions(card) {
  const eds = card.editions || card.result_editions || [];
  const list = document.getElementById("d-editions");
  if (!eds.length) {
    list.innerHTML = '<li class="muted">情報なし</li>';
    return;
  }
  list.innerHTML = eds
    .map((ed) => {
      const set = ed.set ? `${ed.set.name}（${ed.set.prefix}）` : "";
      const num = ed.collector_number ? ` #${ed.collector_number}` : "";
      const rarity = ed.rarity != null ? ` ・レアリティ${ed.rarity}` : "";
      const illus = ed.illustrator ? ` ・絵：${ed.illustrator}` : "";
      return `<li>${escapeHtml(set + num + rarity + illus)}</li>`;
    })
    .join("");
}

function closeDetail() {
  el.modal.hidden = true;
  document.body.classList.remove("no-scroll");
  if (location.hash.startsWith("#card/")) {
    history.replaceState(null, "", location.pathname + location.search);
  }
}

// 共有可能URL（#card/<slug>）からカード詳細を開く
async function openCardBySlug(slug) {
  try {
    const res = await fetch(`${API}/cards/${encodeURIComponent(slug)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    openDetail(await res.json());
  } catch (err) {
    console.error("カードの取得に失敗:", err);
  }
}

// URLハッシュに応じて詳細を開閉（共有リンク・戻る/進む対応）
function handleHash() {
  const m = location.hash.match(/^#card\/(.+)$/);
  if (m) {
    const slug = decodeURIComponent(m[1]);
    if (el.modal.hidden || !currentDetailCard || currentDetailCard.slug !== slug) {
      openCardBySlug(slug);
    }
  } else if (!el.modal.hidden) {
    closeDetail();
  }
}

// ---------- 印刷リスト（カードDB → プロキシPDF 連携） ----------

const PRINT_KEY = "ga_print_list_v1";
let printList = loadPrintList();
let currentDetailCard = null;

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

// ---------- 言語表示切替 ----------

function applyLangPref() {
  const en = el.langEn.checked;
  document.body.classList.toggle("show-en-primary", en);
  const state = document.querySelector(".lang-state");
  if (state) state.textContent = en ? "英語" : "日本語";
}

// ---------- イベント配線 ----------

function debounce(fn, ms) {
  let id;
  return (...args) => {
    clearTimeout(id);
    id = setTimeout(() => fn(...args), ms);
  };
}

function init() {
  fillSelect(el.fClass, "classes");
  fillSelect(el.fElement, "elements");
  fillSelect(el.fType, "types");
  fillSetSelect();

  el.q.addEventListener("input", debounce(() => runSearch(true), 350));
  el.qtext.addEventListener("input", debounce(() => runSearch(true), 350));
  [el.fClass, el.fElement, el.fType, el.fSet, el.sort].forEach((s) => s.addEventListener("change", () => runSearch(true)));
  el.order.addEventListener("click", () => {
    const next = (el.order.dataset.dir || "ASC") === "ASC" ? "DESC" : "ASC";
    el.order.dataset.dir = next;
    el.order.textContent = next === "ASC" ? "▲ 昇順" : "▼ 降順";
    runSearch(true);
  });
  el.loadMore.addEventListener("click", loadMore);
  el.reset.addEventListener("click", () => {
    el.q.value = "";
    el.qtext.value = "";
    el.fClass.value = "";
    el.fElement.value = "";
    el.fType.value = "";
    el.fSet.value = "";
    el.sort.value = "name";
    el.order.dataset.dir = "ASC";
    el.order.textContent = "▲ 昇順";
    runSearch(true);
  });
  el.langEn.addEventListener("change", applyLangPref);

  el.modal.querySelectorAll("[data-close]").forEach((n) => n.addEventListener("click", closeDetail));

  // 印刷リスト関連の配線
  document.getElementById("d-add-print").addEventListener("click", () => {
    if (currentDetailCard) addToPrint(currentDetailCard);
  });
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
    else if (!el.modal.hidden) closeDetail();
  });

  window.addEventListener("hashchange", handleHash);

  updatePrintBar(); // localStorage から復元
  runSearch(true); // 初期表示（名前順の先頭ページ）
  handleHash(); // 共有リンク（#card/<slug>）で開かれた場合は該当カードを表示
}

init();
