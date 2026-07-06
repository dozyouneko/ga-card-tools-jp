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
  modal: document.getElementById("modal"),
  controls: document.getElementById("controls"),
  filterToggle: document.getElementById("filter-toggle"),
};

// エキスパンション定義（製品ライン → prefix 群）
const SETS = (I18N.meta && I18N.meta.sets) || [];

// 検索・ページングの状態
const pager = { page: 1, total: 0, shown: 0, hasMore: false, shownSlugs: new Set() };

function hasJapanese(s) {
  return /[぀-ヿ㐀-鿿ｦ-ﾝ]/.test(s || "");
}
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

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// 効果テキストの簡易マークダウン（**太字** / *斜体* / 改行）を安全にHTML化
// name を渡すと、API 原文中のプレースホルダ CARDNAME を実カード名に置換する。
function renderEffect(text, name) {
  if (!text) return '<span class="muted">（効果テキストなし）</span>';
  const raw = name ? String(text).split("CARDNAME").join(name) : text;
  let html = escapeHtml(raw);
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(/\n/g, "<br>");
  return html;
}

function tr(card) {
  return (I18N.cards && I18N.cards[card.slug]) || null;
}

// 訳データが存在し、かつ name か effect のどちらかが埋まっているか
// （空欄スキャフォルドは「未訳＝翻訳募集中」として扱う）
function isTranslated(card) {
  const t = tr(card);
  return !!(t && (t.name || t.effect));
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

// レアリティ番号 → 略号（gatcg 準拠）。C/UC/R/SR/UR/PR/CSR/CUR/CPR
const RARITY_CODE = { 1: "C", 2: "U", 3: "R", 4: "SR", 5: "UR", 6: "PR", 7: "CSR", 8: "CUR", 9: "CPR" };
function rarityCode(r) {
  if (r == null) return "";
  return RARITY_CODE[r] || `R${r}`; // 未知の番号は R+数値でフォールバック
}

// 使用禁止（legality の limit が 0）判定
const FORMAT_JP = { STANDARD: "スタンダード", PANTHEON: "パンテオン", DRAFT: "ドラフト" };
function bannedFormats(card) {
  const leg = card.legality || {};
  return Object.keys(leg).filter((f) => leg[f] && leg[f].limit === 0);
}
function isBannedStandard(card) {
  const leg = card.legality || {};
  return !!(leg.STANDARD && leg.STANDARD.limit === 0);
}
// Pantheon 専用カード判定：スタンダードもドラフトも使用不可（limit 0）だが
// Pantheon は制限リストに載らない＝Pantheonでのみ使用できるカード。
// （通常の禁止カードはスタンダードのみ limit 0 で、ドラフト/Pantheonでは使える）
function isPantheonOnly(card) {
  const leg = card.legality || {};
  return !!(leg.STANDARD && leg.STANDARD.limit === 0 && leg.DRAFT && leg.DRAFT.limit === 0);
}

function imageUrl(card) {
  const ed = firstEdition(card);
  return ed && ed.image ? IMG_BASE + ed.image : null;
}

// カードの全イラスト/版を {url, label, back} で返す（画像URLで重複排除）。
// back は両面カードで、その版に対応する裏面画像URL（無ければ null）。
function cardImages(card) {
  const eds = card.editions || card.result_editions || [];
  const seen = new Set();
  const out = [];
  eds.forEach((ed) => {
    if (!ed.image || seen.has(ed.image)) return;
    seen.add(ed.image);
    const set = ed.set && ed.set.prefix ? ed.set.prefix : "";
    const num = ed.collector_number ? ` #${ed.collector_number}` : "";
    const bo = ed.other_orientations && ed.other_orientations[0];
    const backUrl = bo && bo.edition && bo.edition.image ? IMG_BASE + bo.edition.image : null;
    out.push({ url: IMG_BASE + ed.image, prefix: set || "?", label: (set + num).trim() || "版", back: backUrl });
  });
  return out;
}

// ---------- 両面（flip）カード ----------
// 公式APIは常に「表面」のカードを返し、裏面は edition.other_orientations[0] に格納する。
// 画像は other_orientations[0].edition.image、裏面は独自の slug/name/effect を持つ。

// flip 構成（表面）を持つ edition を返す。無ければ null。
function flipEdition(card) {
  const eds = card.editions || card.result_editions || [];
  return eds.find((ed) => ed.configuration === "flip" && ed.other_orientations && ed.other_orientations.length) || null;
}
function isFlip(card) {
  return !!flipEdition(card);
}
// 裏面を card 形状に正規化して返す（既存の tr/jpName/label/speedLabel/matchedTerms を流用可能に）。
function backFace(card) {
  const ed = flipEdition(card);
  const b = ed && ed.other_orientations[0];
  if (!b) return null;
  const bed = b.edition || {};
  return {
    slug: b.slug,
    name: b.name,
    effect: b.effect,
    classes: b.classes || [],
    elements: b.elements || [],
    types: b.types || [],
    subtypes: b.subtypes || [],
    cost: b.cost,
    level: b.level,
    power: b.power,
    life: b.life,
    durability: b.durability,
    speed: b.speed,
    flavor: b.flavor || bed.flavor || null,
    image: bed.image ? IMG_BASE + bed.image : null,
  };
}

// スピード: API は boolean（true=Fast / false=Slow）
function speedLabel(card) {
  if (card.speed === true) return "Fast";
  if (card.speed === false) return "Slow";
  return "";
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

// class/element/type/set の絞り込みにカードが合致するか（JPモードの客側フィルタ用）
// 名前/効果の一致は localJpSlugs 側で処理済みのため、ここでは再適用しない。
function matchesActiveFilters(card) {
  if (el.fClass.value && !(card.classes || []).includes(el.fClass.value)) return false;
  if (el.fElement.value && !(card.elements || []).includes(el.fElement.value)) return false;
  if (el.fType.value && !(card.types || []).includes(el.fType.value)) return false;
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
    const img = imgs.length ? imgs[0].url : null;
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
        ${isPantheonOnly(card)
          ? `<span class="pantheon-badge" title="Pantheon専用（スタンダード・ドラフトでは使用不可）">🏛 Pantheon</span>`
          : isBannedStandard(card)
          ? `<span class="banned-badge" title="スタンダードで使用禁止">🚫 禁止</span>`
          : ""}
        ${imgs.length > 1 ? `<button class="art-badge" type="button" title="イラスト/版を切り替え（${imgs.length}種）" aria-label="イラストを切り替え">🎨 ${imgs.length}・${escapeHtml(imgs[0].prefix)}</button>` : ""}
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
    cardEl.addEventListener("click", () => openDetail(card));
    cardEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDetail(card); }
    });
    const addBtn = cardEl.querySelector(".card-add");
    if (addBtn) addBtn.addEventListener("click", (e) => { e.stopPropagation(); addToPrint(card); });
    // イラスト切替（🎨）と表裏切替（🔄）は同じ <img> を共有するため、
    // 状態（表面アート番号 ai / 裏面表示 showingBack）を一元管理して衝突を防ぐ。
    const artBadge = cardEl.querySelector(".art-badge");
    const flipBadge = cardEl.querySelector(".flip-badge");
    const imgEl = cardEl.querySelector(".card-img img");
    if (imgEl && (artBadge || flipBadge)) {
      let ai = 0;              // 選択中の版（イラスト）番号
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

function metaRow(label, value) {
  if (value == null || value === "" ) return "";
  return `<div class="meta-row"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;
}

function openDetail(card) {
  const t = tr(card);
  const imgs = cardImages(card);
  const img = imgs.length ? imgs[0].url : null;
  const dImg = document.getElementById("d-img");
  // 空文字の src は現在ページURL（file://index.html 等）に解決され警告を出すため、
  // 画像が無いときは src 属性ごと外して非表示にする。
  if (img) {
    dImg.src = img;
    dImg.hidden = false;
  } else {
    dImg.removeAttribute("src");
    dImg.hidden = true;
  }
  dImg.alt = jpName(card);

  // イラスト/版の切り替えサムネイル
  const artsEl = document.getElementById("d-arts");
  if (imgs.length > 1) {
    artsEl.innerHTML = imgs
      .map((im, i) => `<button class="art-thumb${i === 0 ? " active" : ""}" type="button" data-url="${escapeHtml(im.url)}" data-back="${escapeHtml(im.back || "")}" title="${escapeHtml(im.label)}"><img loading="lazy" crossorigin="anonymous" src="${escapeHtml(im.url)}" alt=""><span>${escapeHtml(im.label)}</span></button>`)
      .join("");
    artsEl.hidden = false;
  } else {
    artsEl.innerHTML = "";
    artsEl.hidden = true;
  }

  const translated = isTranslated(card);
  const badge = document.getElementById("d-badge");
  badge.textContent = translated ? "日本語訳あり" : "未翻訳";
  badge.className = "badge " + (translated ? "badge-yes" : "badge-no");

  document.getElementById("d-name").textContent = jpName(card);
  document.getElementById("d-name-en").textContent = card.name;

  // 使用可否の表示（Pantheon専用カードは禁止ではなくPantheon表示にする）
  const banned = bannedFormats(card);
  const bannedEl = document.getElementById("d-banned");
  if (isPantheonOnly(card)) {
    bannedEl.textContent = "🏛 Pantheon専用（スタンダード・ドラフトでは使用不可）";
    bannedEl.classList.add("pantheon-banner");
    bannedEl.hidden = false;
  } else if (banned.length) {
    bannedEl.textContent = `🚫 使用禁止：${banned.map((f) => FORMAT_JP[f] || f).join("・")}`;
    bannedEl.classList.remove("pantheon-banner");
    bannedEl.hidden = false;
  } else {
    bannedEl.classList.remove("pantheon-banner");
    bannedEl.hidden = true;
  }

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
    metaRow("スピード", speedLabel(card));

  // 効果（日本語 / 英語原文）。日本語文中の用語は強調表示する。
  const jpEffect = t && t.effect ? t.effect : null;
  const jpBox = document.getElementById("d-effect-jp");
  const terms = matchedTerms(card);
  if (jpEffect) {
    jpBox.innerHTML = highlightTerms(renderEffect(jpEffect), terms);
  } else {
    jpBox.innerHTML = '<span class="muted">日本語訳はまだありません（翻訳募集中）。下の英語原文をご覧ください。</span>';
  }
  document.getElementById("d-effect-en").innerHTML = renderEffect(card.effect, card.name);

  // フレーバー
  const flavor = (t && t.flavor) || card.flavor;
  const flavorWrap = document.getElementById("d-flavor-wrap");
  if (flavor) {
    document.getElementById("d-flavor").textContent = flavor;
    flavorWrap.hidden = false;
  } else {
    flavorWrap.hidden = true;
  }

  renderTerms(card, terms);
  renderEditions(card);
  renderBackFace(card);

  // 印刷リスト追加ボタンの状態
  currentDetailCard = card;
  const addBtn = document.getElementById("d-add-print");
  addBtn.disabled = !img;
  addBtn.textContent = img ? "🖨️ 印刷リストに追加" : "画像がないため追加できません";

  el.modal.hidden = false;
  document.body.classList.add("no-scroll");
  if (card.slug) history.replaceState(null, "", "#card/" + encodeURIComponent(card.slug));
}

// 効果文中に登場するゲーム用語（terms辞書のキーが英語効果文に含まれるもの）を抽出
function matchedTerms(card) {
  // マークダウンの強調記号(*)を除去してから判定する。
  // API原文は "**buff** counter" のように語の一部だけを太字化するため、
  // 除去しないと "buff counter" 等の複数語キーが分断されて一致しない。
  const haystack = `${card.effect || ""}`.replace(/\*/g, "").toLowerCase();
  const found = [];
  Object.keys(I18N.terms || {}).forEach((key) => {
    // 語頭のワード境界(\b)で判定して英単語の途中でのヒットを防ぐ。
    // 例: "age counter" は "damage counter" に、"charge" は "discharge" に誤ヒットしない。
    // 語尾は境界を課さないため、複数形・活用（banished / materializes 等）は引き続き一致する。
    if (new RegExp("\\b" + escapeRegExp(key)).test(haystack)) found.push(I18N.terms[key]);
  });
  return found;
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// 日本語効果テキスト（レンダリング済みHTML）内の用語語句を強調する。
// 用語の jp から「（…）」より前の見出し語を取り出して着色する。
function highlightTerms(html, terms) {
  if (!terms || !terms.length) return html;
  const cores = [...new Set(
    terms.map((t) => String(t.jp || "").split("（")[0].trim()).filter((c) => c.length >= 2)
  )].sort((a, b) => b.length - a.length);
  if (!cores.length) return html;
  // katakana/漢字の見出し語のみを対象にするため、ASCIIのHTMLタグとは衝突しない
  const re = new RegExp("(" + cores.map(escapeRegExp).join("|") + ")", "g");
  return html.replace(re, '<span class="term-hl">$1</span>');
}

// 効果文中に登場するゲーム用語を検出して解説を並べる（日本語DBの付加価値）
function renderTerms(card, terms) {
  const wrap = document.getElementById("d-terms-wrap");
  const list = document.getElementById("d-terms");
  const found = terms || matchedTerms(card);
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
      const rarity = ed.rarity != null ? ` ・${rarityCode(ed.rarity)}` : "";
      const illus = ed.illustrator ? ` ・絵：${ed.illustrator}` : "";
      return `<li>${escapeHtml(set + num + rarity + illus)}</li>`;
    })
    .join("");
}

// 両面カードの裏面を詳細モーダル下部にスタック表示（表面と同じ体裁）。
function renderBackFace(card) {
  const wrap = document.getElementById("d-back-wrap");
  const box = document.getElementById("d-back");
  const back = backFace(card);
  if (!back) { wrap.hidden = true; box.innerHTML = ""; return; }

  const t = tr(back);
  const translated = isTranslated(back);
  const classes = back.classes.map((c) => label("classes", c)).join("・");
  const elements = back.elements.map((e) => label("elements", e)).join("・");
  const types = back.types.map((x) => label("types", x)).join("・");
  const subtypes = back.subtypes.map((x) => label("subtypes", x)).join("・");
  const cost = back.cost ? `${back.cost.value}（${back.cost.type}）` : "";
  const meta =
    metaRow("タイプ", types) +
    metaRow("クラス", classes) +
    metaRow("エレメント", elements) +
    metaRow("サブタイプ", subtypes) +
    metaRow("レベル", back.level) +
    metaRow("コスト", cost) +
    metaRow("パワー", back.power) +
    metaRow("ライフ", back.life) +
    metaRow("耐久", back.durability) +
    metaRow("スピード", speedLabel(back));

  const terms = matchedTerms(back);
  const jpEffect = t && t.effect ? t.effect : null;
  const jpHtml = jpEffect
    ? highlightTerms(renderEffect(jpEffect), terms)
    : '<span class="muted">日本語訳はまだありません（翻訳募集中）。下の英語原文をご覧ください。</span>';
  const imgHtml = back.image
    ? `<img id="d-back-img" crossorigin="anonymous" src="${escapeHtml(back.image)}" alt="${escapeHtml(jpName(back))}">`
    : `<div class="noimg">画像なし</div>`;

  box.innerHTML = `
    <div class="detail back-detail">
      <div class="detail-image">${imgHtml}</div>
      <div class="detail-info">
        <span class="badge ${translated ? "badge-yes" : "badge-no"}">${translated ? "日本語訳あり" : "未翻訳"}</span>
        <h2>${escapeHtml(jpName(back))}</h2>
        <p class="name-en">${escapeHtml(back.name || "")}</p>
        <dl class="meta">${meta}</dl>
        <section class="effect-block">
          <h3>効果（日本語訳）</h3>
          <div class="effect">${jpHtml}</div>
          <details class="orig">
            <summary>英語原文を表示</summary>
            <div class="effect effect-en">${renderEffect(back.effect, back.name)}</div>
          </details>
        </section>
      </div>
    </div>`;
  wrap.hidden = false;
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
  el.fSet.value = "";
  el.sort.value = "name";
  el.order.dataset.dir = "ASC";
  el.order.textContent = "▲ 昇順";
}

// 他ページ（キーワード集など）からのリンクで ?qtext=... が付いていれば、効果テキスト検索欄に反映する
function applyUrlQuery() {
  const qtext = new URLSearchParams(location.search).get("qtext");
  if (qtext) el.qtext.value = qtext;
}

function init() {
  fillSelect(el.fClass, "classes");
  fillSelect(el.fElement, "elements");
  fillSelect(el.fType, "types");
  fillSetSelect();
  resetControls(); // 起動時は必ず「全て」から開始（前回選択の復元を打ち消す）
  applyUrlQuery();

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

  el.modal.querySelectorAll("[data-close]").forEach((n) => n.addEventListener("click", closeDetail));

  // 詳細モーダルのイラスト/版サムネイル切り替え
  document.getElementById("d-arts").addEventListener("click", (e) => {
    const btn = e.target.closest(".art-thumb");
    if (!btn) return;
    document.getElementById("d-img").src = btn.dataset.url;
    // 両面カード：裏面画像も選択した版に追従させる
    const backImg = document.getElementById("d-back-img");
    if (backImg && btn.dataset.back) backImg.src = btn.dataset.back;
    document.getElementById("d-arts").querySelectorAll(".art-thumb").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  });

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
  // bfcache 復帰時（戻る/進む等）にブラウザがフォームを復元することがあるため、初期化し直す
  window.addEventListener("pageshow", (e) => { if (e.persisted) { resetControls(); runSearch(true); } });

  updatePrintBar(); // localStorage から復元
  runSearch(true); // 初期表示（名前順の先頭ページ）
  handleHash(); // 共有リンク（#card/<slug>）で開かれた場合は該当カードを表示
}

init();
