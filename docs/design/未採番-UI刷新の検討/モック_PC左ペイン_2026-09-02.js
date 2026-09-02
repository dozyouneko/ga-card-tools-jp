/* モック（PC左ペイン＋HeroUI案A）— 候補CSSを実物（iframe内の index.html）へ注入する。
 *
 * ⚠️ これは設計検討用のモック。実装ではない。本番の配信対象でもない。
 * ⭐ 実物を iframe で読み込むので、モックが本体から陳腐化しない（コピーを持たない）。
 *
 * ⚠️ index.html の CSP は style-src 'self' なので <style> 要素の注入はブロックされる。
 *    そのため既存シート（style.css）へ CSSOM の insertRule で足す（実測で通ることを確認済み）。
 */
"use strict";

const F = document.getElementById("frame");
const stage = document.getElementById("stage");
const wrap = document.getElementById("frame-wrap");
const sizeTag = document.getElementById("size-tag");
const noteEl = document.getElementById("note");

const state = { layout: "none", pane: 320, skin: 0, vw: "full" };
let baseRuleCount = null;

/* ---------- 候補CSS ---------- */

function layoutCss(kind, w, bp) {
  if (kind === "none") return [];
  const M = `@media (min-width:${bp}px)`;
  const css = [
    /* 2カラム化。⚠️ body > * で右列に送るので、body直下に要素が増えても壊れない */
    `${M}{ body{ display:grid; grid-template-columns:${w}px minmax(0,1fr); align-content:start; } }`,
    `${M}{ body > *{ grid-column:2; } }`,
    `${M}{ .site-header{ grid-column:1 / -1; } }`,
    /* 左ペイン。span 50 は「最後の行まで」の代用（-1 は暗黙グリッドでは使えない） */
    `${M}{ .controls{ grid-column:1; grid-row:2 / span 50; align-self:start;
             position:sticky; top:0; max-height:100vh; overflow-y:auto;
             border-bottom:none; border-right:1px solid var(--border);
             padding:14px 16px 24px; gap:12px; } }`,
    /* ペインの中は1列に積む */
    `${M}{ .filter-row{ grid-template-columns:minmax(0,1fr); } }`,
    `${M}{ .controls-row{ flex-direction:column; align-items:stretch; } }`,
    `${M}{ #q,#qtext{ flex:0 0 auto; width:100%; min-width:0; } }`,
    `${M}{ .filter-rest{ display:grid; grid-template-columns:1fr 1fr; gap:8px; } }`,
    `${M}{ .filter-rest select{ grid-column:1 / -1; } }`,
    /* チップ領域の丈を抑える（サブタイプ157個がペインを2,500px超にするため） */
    `${M}{ .controls .fgroup .chips{ max-height:200px; overflow-y:auto; } }`,
    /* 一覧側の横余白をペイン境界に合わせる */
    `${M}{ .status,.grid,.load-more-wrap{ padding-left:20px; padding-right:20px; } }`,
  ];
  if (kind === "pane2") {
    /* 検索入力だけ上部に残す案。⚠️ 間延びを防ぐため最大幅を掛ける */
    css.push(`${M}{ #mock-topsearch{ grid-column:2; padding:14px 20px 0; } }`);
    css.push(`${M}{ #mock-topsearch .controls-row{ flex-direction:row; max-width:720px; } }`);
    css.push(`${M}{ #mock-topsearch input{ flex:1 1 280px; min-width:200px;
               background:var(--panel); color:var(--text); border:1px solid var(--border);
               border-radius:8px; padding:10px 12px; font-size:.95rem; } }`);
  }
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
    /* フォーカスリング（HeroUI 相当：2px ＋ offset 2px） */
    `.controls input:focus,.controls select:focus{ outline:2px solid var(--accent-2); outline-offset:2px; }`,
    `.fgroup summary:focus-visible{ outline:2px solid var(--accent-2); outline-offset:2px; }`,
    /* 面の内側ハイライト（暗色地の elevation） */
    `.card,.fgroup{ box-shadow:inset 0 1px 0 rgba(255,255,255,.045); }`,
  ];
  if (level >= 2) {
    css.push(
      /* 余白・行高・文字サイズを HeroUI のスケール（.75/.875/1/1.125rem）に寄せる */
      `.controls input,.controls select,.controls button{ padding:10px 14px; font-size:.875rem; line-height:1.25rem; }`,
      `.fgroup summary{ padding:11px 14px; }`,
      `.flabel{ font-size:.875rem; }`,
      `.fgroup .chip{ padding:6px 12px 6px 9px; font-size:.8125rem; border-radius:10px; }`,
      `.fgroup .chips{ gap:7px; padding:0 14px 14px; }`,
      /* 面をもう一段はっきり分ける */
      `.site-header{ background:#191d25; border-bottom:1px solid var(--border); }`,
      `.controls{ background:#161a22; }`,
      `.card{ background:#1b1f28; border-color:rgba(255,255,255,.09); }`,
      `.card:hover{ border-color:var(--accent); transform:translateY(-2px); }`,
      `.grid{ gap:18px; }`,
    );
  }
  return css;
}

/* ---------- 注入 ---------- */

function doc() { return F.contentDocument; }

function sheet() {
  const d = doc();
  if (!d) return null;
  return [...d.styleSheets].find((s) => String(s.href).includes("/style.css")) || null;
}

function apply() {
  const s = sheet();
  if (!s) return;
  if (baseRuleCount === null) baseRuleCount = s.cssRules.length;
  while (s.cssRules.length > baseRuleCount) s.deleteRule(s.cssRules.length - 1);

  moveSearch(state.layout === "pane2");

  const rules = [
    ...layoutCss(state.layout, state.pane, 1200),
    ...skinCss(state.skin),
  ];
  for (const r of rules) {
    try { s.insertRule(r, s.cssRules.length); } catch (e) { console.warn("注入失敗:", r, e.message); }
  }
  renderNote();
}

/* 案2：検索入力の行だけを .controls の外へ出す（モック内のDOM操作。実装方針は設計書 §5-L1） */
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
    const host = d.querySelector("#mock-topsearch");
    if (host) host.remove();
    moved = null;
  }
}

/* ---------- 画面幅 ---------- */

function setViewport() {
  const v = state.vw;
  if (v === "full") {
    wrap.classList.add("full");
    F.style.width = "100%";
    F.style.height = "100%";
    sizeTag.textContent = `フル幅（このウィンドウに追従）`;
  } else {
    const [w, h] = v.split("x").map(Number);
    wrap.classList.remove("full");
    F.style.width = w + "px";
    F.style.height = h + "px";
    sizeTag.textContent = `${w} × ${h}`;
  }
}

/* ---------- 注記 ---------- */

const NOTES = {
  none: "現状。検索入力とフィルタが画面上部に横並びで、<b>2560px幅では検索欄1本が1251px</b>まで伸びる。4グループを開くと <b class='warn'>カード一覧の開始が878px（1440x900でビューポートの98%）</b>まで押し下げられる。",
  pane1: "<b>案1：検索条件をまるごと左ペインへ。</b> 検索欄は幅271px固定になり間延びが消える。<b>4グループを全部開いてもカード一覧の開始位置は138pxのまま動かない</b>（ペインが縦に伸びても一覧に影響しない）。代償は<b class='warn'>カードの列が1〜2列減る</b>こと。",
  pane2: "<b>案2：絞り込みだけ左ペインへ、検索入力は上部に残す。</b> 検索の発見しやすさを優先する形。⚠️ 上部に残す以上、<b class='warn'>検索欄は最大幅720pxで抑える</b>必要がある（抑えないと現状の間延びが戻る）。",
};
const SKINS = ["見た目は現状のまま。", "<b>案A-最小</b>：区切り線を半透明に、面の明度差で階層を作り、角丸とフォーカスリングをHeroUI相当に。⚠️ HeroUIの影スケールは<b class='warn'>暗色地では見えない</b>ため翻案している（設計書 §6）。", "<b>案A-しっかり</b>：最小に加えて余白・行高・文字サイズをHeroUIのスケールに揃え、ヘッダ／ペイン／カードの面をはっきり分ける。"];

function renderNote() {
  let s = NOTES[state.layout];
  if (state.skin) s += "<br>" + SKINS[state.skin];
  if (state.layout !== "none") s += `<br>ペイン幅 <b>${state.pane}px</b>／左ペインに切り替わるのは <b>1200px以上</b>（それ未満は現状のまま＝設計書 §5-L4）。`;
  noteEl.innerHTML = s;
}

/* ---------- 操作 ---------- */

document.addEventListener("click", (e) => {
  const b = e.target.closest(".seg button");
  if (!b) return;
  const g = b.parentNode.dataset.g;
  for (const sib of b.parentNode.children) sib.classList.toggle("on", sib === b);
  if (g === "layout") state.layout = b.dataset.v;
  else if (g === "pane") state.pane = Number(b.dataset.v);
  else if (g === "skin") state.skin = Number(b.dataset.v);
  else if (g === "vw") { state.vw = b.dataset.v; setViewport(); return; }
  apply();
});

document.getElementById("worst").addEventListener("click", () => {
  const d = doc();
  if (!d) return;
  d.querySelectorAll(".fgroup").forEach((el) => { el.open = true; });
  d.querySelectorAll(".fgroup .morebtn").forEach((b) => b.click());
  d.querySelector("#controls")?.scrollIntoView({ block: "start" });
});

document.getElementById("reload").addEventListener("click", () => {
  baseRuleCount = null; moved = null;
  F.contentWindow.location.reload();
});

F.addEventListener("load", () => {
  baseRuleCount = null; moved = null;
  /* 検索結果が描画されてから注入する（fillChips がチップを組み立てるのを待つ） */
  setTimeout(apply, 1200);
});

setViewport();
renderNote();
