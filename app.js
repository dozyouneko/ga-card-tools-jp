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
  fClass: document.getElementById("f-class"),
  fElement: document.getElementById("f-element"),
  fType: document.getElementById("f-type"),
  reset: document.getElementById("reset"),
  status: document.getElementById("status"),
  grid: document.getElementById("grid"),
  langEn: document.getElementById("lang-en"),
  modal: document.getElementById("modal"),
};

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

// ---------- API 呼び出し ----------

let reqSeq = 0; // 競合するリクエストの取り違え防止

function buildQuery() {
  const p = new URLSearchParams();
  const q = el.q.value.trim();
  if (q) p.set("name", q);
  if (el.fClass.value) p.set("class", el.fClass.value);
  if (el.fElement.value) p.set("element", el.fElement.value);
  if (el.fType.value) p.set("type", el.fType.value);
  p.set("sort", "name");
  p.set("page", "1");
  p.set("page_size", "40");
  return p.toString();
}

async function search() {
  const seq = ++reqSeq;
  el.status.textContent = "検索中…";
  try {
    const res = await fetch(`${API}/cards/search?${buildQuery()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (seq !== reqSeq) return; // 古いレスポンスは破棄
    renderGrid(json.data || [], json.total_cards);
  } catch (err) {
    if (seq !== reqSeq) return;
    el.status.textContent = `読み込みに失敗しました（${err.message}）。時間をおいて再度お試しください。`;
    el.grid.innerHTML = "";
  }
}

// ---------- グリッド描画 ----------

function renderGrid(cards, total) {
  el.grid.innerHTML = "";
  if (!cards.length) {
    el.status.textContent = "該当するカードがありません。条件を変えてお試しください。";
    return;
  }
  const shownTotal = typeof total === "number" ? `（全 ${total} 件中 ${cards.length} 件表示）` : "";
  el.status.textContent = `${cards.length} 件のカード ${shownTotal}`;

  const frag = document.createDocumentFragment();
  cards.forEach((card) => {
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
  document.body.classList.toggle("show-en-primary", el.langEn.checked);
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

  el.q.addEventListener("input", debounce(search, 350));
  [el.fClass, el.fElement, el.fType].forEach((s) => s.addEventListener("change", search));
  el.reset.addEventListener("click", () => {
    el.q.value = "";
    el.fClass.value = "";
    el.fElement.value = "";
    el.fType.value = "";
    search();
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

  updatePrintBar(); // localStorage から復元
  search(); // 初期表示（名前順の先頭ページ）
}

init();
