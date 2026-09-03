/* モック（PC左ペイン＋HeroUI案A）— 候補CSSを実物（iframe内の index.html）へ注入する。
 *
 * ⚠️ これは設計検討用のモック。実装ではない。本番の配信対象でもない。
 * ⭐ 実物を iframe で読み込むので、モックが本体から陳腐化しない（コピーを持たない）。
 *
 * ⚠️ index.html の CSP は style-src 'self' なので <style> 要素の注入はブロックされる。
 *    そのため既存シート（style.css）へ CSSOM の insertRule で足す（実測で通ることを確認済み）。
 *
 * 2026-09-03 追記: ユーザー指摘の3点を追加した（設計書 §11〜§13）
 *   ① ヘッダ固定（アプリシェル化。スクロールするのは検索結果だけ）
 *   ② 絞り込みのアコーディオン化 ＋ 選択中の表示（4案）
 *   ③ レアリティ絞り込み（⚠️ モックでは見た目のみ。実フィルタは未配線＝設計書 §13）
 */
"use strict";

const F = document.getElementById("frame");
const wrap = document.getElementById("frame-wrap");
const sizeTag = document.getElementById("size-tag");
const noteEl = document.getElementById("note");

const state = {
  layout: "pane1", pane: 320, skin: 0, vw: "full",
  shell: "fixed",  /* scroll | fixed */
  acc: "on",       /* on | off  … 1つ開いたら他を閉じる */
  sel: "pane",     /* none | pane | count | summary | both */
  rarity: "on",
};
let baseRuleCount = null;

/* 参考: shared/js/card-i18n.js の RARITY_CODE と同じ並び */
const RARITIES = [
  ["1", "コモン", "C"], ["2", "アンコモン", "U"], ["3", "レア", "R"],
  ["4", "スーパーレア", "SR"], ["5", "ウルトラレア", "UR"], ["6", "プロモ", "PR"],
  ["7", "コレクターSR", "CSR"], ["8", "コレクターUR", "CUR"], ["9", "コレクターPR", "CPR"],
];

/* ================= 候補CSS ================= */

function layoutCss(kind, w, bp, shell) {
  if (kind === "none") return [];
  const M = `@media (min-width:${bp}px)`;
  const css = [
    `${M}{ body > *{ grid-column:2; } }`,
    `${M}{ .site-header{ grid-column:1 / -1; grid-row:1; } }`,
    `${M}{ .filter-row{ grid-template-columns:minmax(0,1fr); } }`,
    `${M}{ .controls-row{ flex-direction:column; align-items:stretch; } }`,
    `${M}{ #q,#qtext{ flex:0 0 auto; width:100%; min-width:0; } }`,
    `${M}{ .filter-rest{ display:grid; grid-template-columns:1fr 1fr; gap:8px; } }`,
    `${M}{ .filter-rest select{ grid-column:1 / -1; } }`,
    `${M}{ .controls .fgroup .chips{ max-height:200px; overflow-y:auto; } }`,
    `${M}{ .status,.grid,.load-more-wrap{ padding-left:20px; padding-right:20px; } }`,
  ];

  if (shell === "fixed") {
    /* ⭐ アプリシェル：ヘッダとペインは固定、スクロールするのは結果側だけ。
       右列をひとまとまりにスクロールさせるので #results のラッパが要る（設計書 §11） */
    css.push(
      `${M}{ html,body{ height:100%; } }`,
      `${M}{ body{ display:grid; grid-template-columns:${w}px minmax(0,1fr);
               grid-template-rows:auto minmax(0,1fr); overflow:hidden; } }`,
      `${M}{ .controls{ grid-column:1; grid-row:2; position:static; overflow-y:auto;
               border-bottom:none; border-right:1px solid var(--border); padding:14px 16px 24px; gap:12px; } }`,
      `${M}{ #mock-results{ grid-column:2; grid-row:2; overflow-y:auto; } }`,
    );
  } else {
    css.push(
      `${M}{ body{ display:grid; grid-template-columns:${w}px minmax(0,1fr); align-content:start; } }`,
      `${M}{ .controls{ grid-column:1; grid-row:2 / span 50; align-self:start;
               position:sticky; top:0; max-height:100vh; overflow-y:auto;
               border-bottom:none; border-right:1px solid var(--border); padding:14px 16px 24px; gap:12px; } }`,
    );
  }

  if (kind === "pane2") {
    css.push(
      `${M}{ #mock-topsearch{ grid-column:2; padding:14px 20px 0; } }`,
      `${M}{ #mock-topsearch .controls-row{ flex-direction:row; max-width:720px; } }`,
      `${M}{ #mock-topsearch input{ flex:1 1 280px; min-width:200px;
               background:var(--panel); color:var(--text); border:1px solid var(--border);
               border-radius:8px; padding:10px 12px; font-size:.95rem; } }`,
    );
  }

  /* 選択中の表示 */
  css.push(
    `#mock-selected{ display:none; }`,
    `${M}{ #mock-selected.on{ display:block; border:1px solid var(--accent);
             background:rgba(217,164,65,.08); border-radius:10px; padding:9px 11px; } }`,
    `#mock-selected h3{ margin:0 0 7px; font-size:.74rem; color:var(--muted); font-weight:700; letter-spacing:.04em; }`,
    `#mock-selected .selwrap{ display:flex; flex-wrap:wrap; gap:6px; }`,
    `#mock-selected button, #mock-count-sel button{ display:inline-flex; align-items:center; gap:6px;
       background:var(--panel); color:var(--text); border:1px solid var(--accent); border-radius:999px;
       padding:4px 9px; font:inherit; font-size:.79rem; cursor:pointer; }`,
    `#mock-selected button:hover, #mock-count-sel button:hover{ background:rgba(217,164,65,.2); }`,
    `#mock-selected .x, #mock-count-sel .x{ color:var(--muted); font-weight:700; }`,
    `#mock-selected .clr{ border-style:dashed; border-color:var(--border); color:var(--muted); }`,
    `#mock-count-sel{ display:inline-flex; flex-wrap:wrap; gap:6px; margin-left:10px; vertical-align:middle; }`,
    /* ⚠️ 320px のペインでは見出し行に入りきらず AND/OR が押し出される（実測）。
       ⭐ そこで項目名は「2行目」に回す（summary を折り返し可にして全幅を取る） */
    `.fgroup summary{ flex-wrap:wrap; }`,
    `.fgroup .mock-sum{ flex:1 0 100%; color:var(--accent); font-size:.76rem;
       overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }`,
  );
  return css;
}

function skinCss(level) {
  if (!level) return [];
  /* ⚠️ HeroUI の影スケール（黒 alpha .02〜.08）は暗色地では見えない。
     暗色テーマの立体感は「面の明度差」で作るのが定石なので、そちらへ翻案している。 */
  const css = [
    `:root{ --border:rgba(255,255,255,.11); --panel:#1b1f28; --panel-2:#232834; --radius:14px; }`,
    `.controls input,.controls select,.controls button{ border-radius:10px; }`,
    `.fgroup{ border-radius:12px; }`,
    `.controls input:focus,.controls select:focus{ outline:2px solid var(--accent-2); outline-offset:2px; }`,
    `.fgroup summary:focus-visible{ outline:2px solid var(--accent-2); outline-offset:2px; }`,
    `.card,.fgroup{ box-shadow:inset 0 1px 0 rgba(255,255,255,.045); }`,
  ];
  if (level >= 2) {
    css.push(
      `.controls input,.controls select,.controls button{ padding:10px 14px; font-size:.875rem; line-height:1.25rem; }`,
      `.fgroup summary{ padding:11px 14px; }`,
      `.flabel{ font-size:.875rem; }`,
      `.fgroup .chip{ padding:6px 12px 6px 9px; font-size:.8125rem; border-radius:10px; }`,
      `.fgroup .chips{ gap:7px; padding:0 14px 14px; }`,
      `.site-header{ background:#191d25; border-bottom:1px solid var(--border); }`,
      `.controls{ background:#161a22; }`,
      `.card{ background:#1b1f28; border-color:rgba(255,255,255,.09); }`,
      `.card:hover{ border-color:var(--accent); transform:translateY(-2px); }`,
      `.grid{ gap:18px; }`,
    );
  }
  return css;
}

/* ================= DOM 加工（モック内だけ） ================= */

function doc() { return F.contentDocument; }
function sheet() {
  const d = doc();
  return d ? [...d.styleSheets].find((s) => String(s.href).includes("/style.css")) || null : null;
}

/* ① アプリシェル：右列を1つのスクロール領域にまとめるラッパ */
function ensureResultsWrap(on) {
  const d = doc();
  if (!d) return;
  const has = d.querySelector("#mock-results");
  if (on && !has) {
    const box = d.createElement("div");
    box.id = "mock-results";
    const first = d.querySelector("#status");
    first.parentNode.insertBefore(box, first);
    /* status 以降の「流れの中にある」要素だけを入れる（fixed/none は body 直下に残す） */
    for (const sel of ["#status", "#grid", ".load-more-wrap", ".setlinks", ".site-footer"]) {
      const e = d.querySelector(sel);
      if (e) box.appendChild(e);
    }
  } else if (!on && has) {
    while (has.firstChild) has.parentNode.insertBefore(has.firstChild, has);
    has.remove();
  }
}

/* 案2：検索入力の行だけを .controls の外へ出す */
let moved = null;
function moveSearch(on) {
  const d = doc();
  if (!d) return;
  if (on && !moved) {
    const row = d.querySelector("#controls > .controls-row");
    if (!row) return;
    const host = d.createElement("div");
    host.id = "mock-topsearch";
    const controls = d.querySelector("#controls");
    controls.parentNode.insertBefore(host, controls);
    moved = { row, parent: row.parentNode, next: row.nextSibling };
    host.appendChild(row);
  } else if (!on && moved) {
    moved.parent.insertBefore(moved.row, moved.next);
    d.querySelector("#mock-topsearch")?.remove();
    moved = null;
  }
}

/* ③ レアリティ群（⚠️ 見た目のみ。実フィルタは未配線） */
function ensureRarity(on) {
  const d = doc();
  if (!d) return;
  const has = d.querySelector("#g-rarity");
  if (on && !has) {
    const g = d.createElement("details");
    g.id = "g-rarity";
    g.className = "fgroup";
    const sum = d.createElement("summary");
    const lb = d.createElement("span");
    lb.className = "flabel"; lb.textContent = "レアリティ";
    const bd = d.createElement("span");
    bd.className = "fbadge"; bd.hidden = true;
    const ao = d.createElement("span");
    ao.className = "andor";
    ["AND", "OR"].forEach((m) => {
      const b = d.createElement("button");
      b.type = "button"; b.textContent = m; b.dataset.mode = m;
      if (m === "OR") b.className = "on";
      ao.appendChild(b);
    });
    sum.append(lb, bd, ao);
    const chips = d.createElement("div");
    chips.className = "chips";
    for (const [v, ja, code] of RARITIES) {
      const lab = d.createElement("label");
      lab.className = "chip";
      const inp = d.createElement("input");
      inp.type = "checkbox"; inp.value = v;
      const em = d.createElement("em");
      em.textContent = code;
      lab.append(inp, d.createTextNode(ja + " "), em);
      chips.appendChild(lab);
    }
    g.append(sum, chips);
    d.querySelector("#g-subtype").after(g);
  } else if (!on && has) {
    has.remove();
  }
}

/* ② アコーディオン：1つ開いたら他を閉じる */
let accBound = false;
function bindAccordion() {
  const d = doc();
  if (!d || accBound) return;
  accBound = true;
  d.addEventListener("toggle", (e) => {
    const g = e.target;
    if (!(g instanceof d.defaultView.HTMLDetailsElement) || !g.classList.contains("fgroup")) return;
    if (state.acc === "on" && g.open) {
      d.querySelectorAll(".fgroup[open]").forEach((o) => { if (o !== g) o.open = false; });
    }
    renderSelected();
  }, true);
  d.addEventListener("change", () => setTimeout(renderSelected, 0), true);
}

/* ② 選択中の表示 */
function selectedItems() {
  const d = doc();
  if (!d) return [];
  const out = [];
  d.querySelectorAll(".fgroup").forEach((g) => {
    const label = g.querySelector(".flabel")?.textContent || "";
    g.querySelectorAll('.chip input:checked').forEach((inp) => {
      const chip = inp.closest(".chip");
      const name = (chip.textContent || "").trim().replace(/\s+/g, " ");
      out.push({ group: label, name, inp });
    });
  });
  return out;
}

function renderSelected() {
  const d = doc();
  if (!d) return;
  const items = selectedItems();
  const showPane = state.sel === "pane" || state.sel === "both";
  const showCount = state.sel === "count";
  const showSum = state.sel === "summary" || state.sel === "both";

  /* --- 案A: 左ペイン上部 --- */
  let box = d.querySelector("#mock-selected");
  if (!box) {
    box = d.createElement("div");
    box.id = "mock-selected";
    const h = d.createElement("h3");
    h.textContent = "選択中の条件";
    const w = d.createElement("div");
    w.className = "selwrap";
    box.append(h, w);
    const controls = d.querySelector("#controls");
    controls.insertBefore(box, controls.firstChild);
  }
  const wrapEl = box.querySelector(".selwrap");
  box.classList.toggle("on", showPane && items.length > 0);
  if (showPane) {
    wrapEl.textContent = "";
    for (const it of items) wrapEl.appendChild(chipBtn(d, it));
    if (items.length > 1) {
      const clr = d.createElement("button");
      clr.type = "button"; clr.className = "clr"; clr.textContent = "すべて解除";
      clr.addEventListener("click", () => { items.forEach((i) => i.inp.click()); });
      wrapEl.appendChild(clr);
    }
  }

  /* --- 案B: 件数表示の横 --- */
  let cs = d.querySelector("#mock-count-sel");
  if (!cs) {
    cs = d.createElement("span");
    cs.id = "mock-count-sel";
    d.querySelector("#status")?.appendChild(cs);
  }
  cs.textContent = "";
  cs.style.display = showCount && items.length ? "inline-flex" : "none";
  if (showCount) for (const it of items) cs.appendChild(chipBtn(d, it));

  /* --- 案C: 閉じたグループの見出しに項目名 --- */
  d.querySelectorAll(".fgroup").forEach((g) => {
    let s = g.querySelector(".mock-sum");
    const names = [...g.querySelectorAll('.chip input:checked')]
      .map((i) => (i.closest(".chip").textContent || "").trim().replace(/\s+/g, " "));
    if (!showSum || g.open || !names.length) { s?.remove(); return; }
    if (!s) {
      s = d.createElement("span");
      s.className = "mock-sum";
      g.querySelector(".fbadge")?.after(s);
    }
    s.textContent = names.join("・");
    s.title = names.join("・");
  });
}

function chipBtn(d, it) {
  const b = d.createElement("button");
  b.type = "button";
  b.title = `${it.group}: ${it.name}`;
  b.append(d.createTextNode(it.name + " "));
  const x = d.createElement("span");
  x.className = "x"; x.textContent = "✕";
  b.appendChild(x);
  b.addEventListener("click", () => it.inp.click());
  return b;
}

/* ================= 注入 ================= */

function apply() {
  const s = sheet();
  if (!s) return;
  if (baseRuleCount === null) baseRuleCount = s.cssRules.length;
  while (s.cssRules.length > baseRuleCount) s.deleteRule(s.cssRules.length - 1);

  const pane = state.layout !== "none";
  ensureResultsWrap(pane && state.shell === "fixed");
  moveSearch(state.layout === "pane2");
  ensureRarity(state.rarity === "on");
  bindAccordion();

  for (const r of [...layoutCss(state.layout, state.pane, 1200, state.shell), ...skinCss(state.skin)]) {
    try { s.insertRule(r, s.cssRules.length); } catch (e) { console.warn("注入失敗:", r, e.message); }
  }
  renderSelected();
  renderNote();
}

/* ================= 画面幅 ================= */

function setViewport() {
  const v = state.vw;
  if (v === "full") {
    wrap.classList.add("full");
    F.style.width = "100%"; F.style.height = "100%";
    sizeTag.textContent = "フル幅（このウィンドウに追従）";
  } else {
    const [w, h] = v.split("x").map(Number);
    wrap.classList.remove("full");
    F.style.width = w + "px"; F.style.height = h + "px";
    sizeTag.textContent = `${w} × ${h}`;
  }
}

/* ================= 注記 ================= */

const NOTES = {
  none: "現状。検索入力とフィルタが画面上部に横並びで、<b>2560px幅では検索欄1本が1251px</b>まで伸びる。4グループを開くと<b class='warn'>カード一覧の開始が878px</b>まで押し下げられる。",
  pane1: "<b>案1：検索条件をまるごと左ペインへ。</b> 検索欄は固定幅になり間延びが消える。4グループを全部開いてもカード一覧の開始位置は動かない。代償は<b class='warn'>カードの列が1〜2列減る</b>こと。",
  pane2: "<b>案2：絞り込みだけ左ペインへ、検索入力は上部に残す。</b> ⚠️ 上部に残す以上、<b class='warn'>検索欄は最大幅720pxで抑える</b>必要がある。",
};
const SHELL = {
  scroll: "ヘッダは<b class='warn'>スクロールで流れる</b>（ペインだけ sticky で追従）。",
  fixed: "⭐ <b>ヘッダとペインを固定</b>し、<b>スクロールするのは結果側だけ</b>（アプリシェル）。⚠️ 実装には結果側をまとめるラッパ要素が1つ要る（設計書 §11）。",
};
const SEL = {
  none: "選択中の表示なし。⚠️ アコーディオンだと<b class='warn'>何を選んだか見えなくなる</b>。",
  pane: "<b>案A：左ペインの最上部に「選択中の条件」</b>を出す。✕で個別解除・「すべて解除」つき。",
  count: "<b>案B：件数表示の横</b>に出す。⭐ 結果を見ながら条件を外せるが、<b class='warn'>ペインから視線が離れる</b>。",
  summary: "<b>案C：閉じたグループの見出しに項目名</b>を出す（今は数字バッジだけ）。⭐ 場所を増やさないが、<b class='warn'>長いと省略される</b>。",
  both: "<b>案D：案A＋案C の併用。</b> ペイン上部で全体を、各グループ見出しで内訳を見る。",
};

function renderNote() {
  let s = NOTES[state.layout];
  if (state.layout !== "none") {
    s += "<br>" + SHELL[state.shell];
    s += "<br>絞り込み: " + (state.acc === "on" ? "<b>アコーディオン（1つだけ開く）</b>" : "複数同時に開ける（現状）") + " ／ " + SEL[state.sel];
    if (state.rarity === "on") s += "<br>⚠️ <b>レアリティ群はモックでは見た目のみ</b>（選択しても結果は絞られない）。実装可能なことは実測ずみ＝設計書 §13。";
    if (state.skin) s += "<br>" + ["", "<b>案A-最小</b>：区切り線を半透明に、面の明度差で階層を作る。⚠️ HeroUIの影は<b class='warn'>暗色地では見えない</b>ため翻案（設計書 §5）。", "<b>案A-しっかり</b>：余白・行高・文字サイズもHeroUIのスケールに揃える。"][state.skin];
    s += `<br>ペイン幅 <b>${state.pane}px</b>／左ペインに切り替わるのは <b>1200px以上</b>。`;
  }
  noteEl.innerHTML = s;
}

/* ================= 操作 ================= */

document.addEventListener("click", (e) => {
  const b = e.target.closest(".seg button");
  if (!b || !b.parentNode.dataset.g) return;
  const g = b.parentNode.dataset.g;
  for (const sib of b.parentNode.children) sib.classList.toggle("on", sib === b);
  if (g === "pane") state.pane = Number(b.dataset.v);
  else if (g === "skin") state.skin = Number(b.dataset.v);
  else if (g === "vw") { state.vw = b.dataset.v; setViewport(); return; }
  else state[g] = b.dataset.v;
  apply();
});

document.getElementById("worst").addEventListener("click", () => {
  const d = doc();
  if (!d) return;
  const prev = state.acc;
  state.acc = "off";                       /* 全開にしたいので一時的にアコーディオンを外す */
  d.querySelectorAll(".fgroup").forEach((el) => { el.open = true; });
  d.querySelectorAll(".fgroup .morebtn").forEach((b) => b.click());
  state.acc = prev;
  renderSelected();
});

document.getElementById("reload").addEventListener("click", () => {
  baseRuleCount = null; moved = null; accBound = false;
  F.contentWindow.location.reload();
});

F.addEventListener("load", () => {
  baseRuleCount = null; moved = null; accBound = false;
  setTimeout(apply, 1200);   /* fillChips がチップを組み立てるのを待つ */
});

setViewport();
renderNote();
