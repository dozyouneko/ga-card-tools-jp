/* モック（デッキ構築ツールの左ペイン化）— 候補CSSを実物（iframe内の /tools/deck-builder/）へ注入する。
 *
 * ⚠️ これは設計検討用のモックであり、実装ではない。本番の配信対象でもない。
 * ⭐ 決めたいのは Q2（omnidex提出用コピー・共有リンク・デッキ画像出力の3ボタンの置き場）。
 *    判断材料は 検討メモ_左ペイン化Q1-Q6_2026-09-05.md §3。
 *
 * ⭐ 実物を取ってきて動かすので、モックが本体から陳腐化しない（HTMLのコピーを持たない）。
 *    ⚠️ ただしデッキ構築ツールは Discord ログインが前提で、そのままでは編集画面に到達できない
 *       （CLAUDE.md「環境の注意」）。そこで取得したHTMLに
 *         ① <base href="/tools/deck-builder/">（srcdoc は親のURLが基準になるため相対パスが壊れる）
 *         ② スタブ（モック_左ペイン化_2026-09-05.stub.js）
 *       を差し込んだ srcdoc として読み込む。スタブは /api/me と /api/decks/<id> だけを差し替える。
 *
 * ⚠️ CSP は style-src 'self' なので <style> 要素の注入はブロックされる（無言で無視される）。
 *    そのため既存シート（/tools/deck-builder/style.css）へ CSSOM の insertRule で足す。
 *    ⭐ スタブを <script src> で足せるのは、同一オリジン＝'self' に当たるため（実測済み）。
 */
"use strict";

const SRC = "/tools/deck-builder/";
const STUB_URL = new URL("モック_左ペイン化_2026-09-05.stub.js", location.href).href;

/* ⭐ 確定したブレークポイント（Q3・2026-09-05 ユーザー回答）と、左ペインの幅（トップと同じ320px） */
const BP = 1280;
const PANE_W = 320;

const state = {
  q2: "bottom",     /* bottom | top | stay … ⭐ 今回の主役 */
  layout: "pane",   /* now | pane */
  compare: "one",   /* one | two */
  sort: "pane",     /* modal | pane … Q4 */
  vw: "1280x900",
  zoom: 1,
  deck: "std",      /* std | pan */
  name: "normal",   /* normal | long */
};

const noteEl = document.getElementById("note");
const measureOut = document.getElementById("measure-out");
const colA = document.getElementById("col-a");
const colB = document.getElementById("col-b");
const tagB = document.getElementById("tag-b");
const frames = {
  a: { el: document.getElementById("frame-a"), wrap: document.getElementById("wrap-a"), mode: "now", base: null },
  b: { el: document.getElementById("frame-b"), wrap: document.getElementById("wrap-b"), mode: "pane", base: null },
};

/* ================= iframe の組み立て ================= */

let pageHtml = null;
async function pageSource() {
  if (!pageHtml) pageHtml = await (await fetch(SRC)).text();
  return pageHtml.replace(/<head>/i, `<head><base href="${SRC}"><script src="${STUB_URL}"><\/script>`);
}

async function buildFrame(f) {
  const html = await pageSource();
  f.base = null;
  f.el.dataset.deck = state.deck;
  f.el.dataset.name = state.name;
  f.el.srcdoc = html;
  /* ⚠️ load を待たずに中を見ると「前のドキュメント」に当たる（＝古い方へCSSを注入して、
        新しい方には何も当たらない）。デッキ/デッキ名の切り替えで実際に踏んだ */
  await new Promise((res) => f.el.addEventListener("load", res, { once: true }));
  await waitReady(f);
  applyTo(f);
}

/* 実物の初期化（訳データ・チップ157種・ゾーンのカード取得）を待つ。
   ⚠️ カードは api.gatcg.com から取るので初回は数秒かかる（2回目以降は localStorage キャッシュ） */
function waitReady(f, timeoutMs = 20000) {
  const t0 = Date.now();
  return new Promise((resolve) => {
    const tick = () => {
      const d = f.el.contentDocument;
      const ok = d && d.querySelector("#s-g-subtype .chip") && d.querySelector(".zone-grid .gtile");
      if (ok || Date.now() - t0 > timeoutMs) { resolve(!!ok); return; }
      setTimeout(tick, 120);
    };
    tick();
  });
}

/* ================= 候補CSS ================= */

/* ⭐ 案Z′（検討メモ §7-3）: #view-editor の内側だけを2カラムGridにし、.editor-bar を sticky にする。
   ⚠️ body にクラスを付け外ししない（＝他3ビュー #view-login / #view-decks / #view-deck に
      セレクタが1本も届かないので、構造として崩れない）。 */
function layoutCss() {
  const M = `@media (min-width:${BP}px)`;
  return [
    /* 2カラム。⚠️ 既定を右列にしておく（要素が増えた日にその要素だけ左列へ落ちるのを防ぐ） */
    `${M}{ #view-editor{ display:grid; grid-template-columns:${PANE_W}px minmax(0,1fr); align-items:start; } }`,
    `${M}{ #view-editor > *{ grid-column:2; } }`,
    /* 見出し行は全幅＋固定（P10。⭐ 常設クロームは実測57px） */
    `${M}{ #view-editor .editor-bar{ grid-column:1 / -1; grid-row:1; position:sticky; top:0; z-index:6; } }`,
    /* 左ペイン。⚠️ 右列の行数は中身で変わるので span で広く取る */
    `${M}{ #view-editor #search-top{
         grid-column:1; grid-row:2 / span 50; align-self:start;
         position:sticky; top:var(--mock-bar-h,57px);
         max-height:calc(100vh - var(--mock-bar-h,57px)); overflow-y:auto;
         padding:14px 16px 24px; gap:12px;
         border-bottom:none; border-right:1px solid var(--border); } }`,
    /* ペインの中は縦1列 */
    `${M}{ #search-top .row{ flex-direction:column; align-items:stretch; } }`,
    /* ⚠️ 検討メモ §9-1: flex-basis 240px が「高さ240px」として効くので必ず打ち消す
       （無いと閉じたペインが 579px → 987px になる） */
    `${M}{ #s-name,#s-text{ flex:0 0 auto; width:100%; min-width:0; } }`,
    `${M}{ #search-top .filter-row{ grid-template-columns:minmax(0,1fr); } }`,
    /* リセット/検索の行だけは横並びに戻す。
       ⚠️ `.row:last-of-type` で書くと当たらない——3ボタンの箱を末尾に足した時点で
          「最後の div」がそちらになるため（このモックで実際に踏んだ）。
       ⭐ 実装では HTML の該当行にクラスを1つ足す（ここでは JS が同名のクラスを付けている）。 */
    `${M}{ #search-top > .row-actions{ flex-direction:row; } }`,
    `${M}{ #search-top > .row-actions .btn{ flex:1 1 0; text-align:center; } }`,
    /* ⚠️ §9-2: サブタイプ157種はペインに収まらないので丈の上限を付ける（ページ側で限定して書く） */
    `${M}{ #search-top .fgroup .chips{ max-height:200px; overflow-y:auto; } }`,
    /* §9-3: 「すべて表示」中は上限を外す（fail-open なので :has() 方針に適合） */
    `${M}{ #search-top .fgroup:has(.chips-rest:not([hidden])) .chips{ max-height:none; overflow-y:visible; } }`,
    /* §9-4: チップ領域がスクロールコンテナになると Tab フォーカスが枠外に出る */
    `${M}{ #search-top .fgroup .chip{ position:relative; } }`,
  ];
}

/* Q2: 移した3ボタンの見た目。⚠️ ペイン幅320pxでは横並びに入らない（実測 175+159+133+gap=491px）ので縦積み */
function actionsCss(where) {
  const M = `@media (min-width:${BP}px)`;
  const edge = where === "top"
    ? "border-bottom:1px solid var(--border); padding-bottom:12px;"
    : "border-top:1px solid var(--border); padding-top:12px; margin-top:2px;";
  return [
    `${M}{ #search-top .mock-actions{ display:flex; flex-direction:column; gap:8px; ${edge} } }`,
    `${M}{ #search-top .mock-actions .btn{ width:100%; text-align:center; } }`,
    /* ⚠️ 1279px以下ではペインが無いので、移した3ボタンは検索パネルの中に横並びで出る
       （DOMの位置は1つなので、実装でも同じ見え方になる＝この帯の見え方も判断材料） */
    `@media (max-width:${BP - 1}px){ #search-top .mock-actions{ display:flex; flex-wrap:wrap; gap:8px; } }`,
    `@media (max-width:${BP - 1}px){ #search-top .mock-actions .btn{ flex:1 1 auto; text-align:center; } }`,
  ];
}

/* Q4: 並び替え・昇降順をペインへ（検討メモ §5-3） */
function sortCss() {
  const M = `@media (min-width:${BP}px)`;
  return [
    `${M}{ #search-top .result-sort{ display:grid; grid-template-columns:1fr auto; gap:8px; align-items:center; } }`,
    `${M}{ #search-top .result-sort label{ grid-column:1 / -1; font-size:.74rem; color:var(--muted); } }`,
    `${M}{ #search-top .result-sort select{ width:100%; min-width:0; } }`,
  ];
}

/* ================= DOM の移動 ================= */

const BTN_IDS = ["ed-copy-text", "ed-copy-link", "ed-image"];

function moveActions(d, where) {
  const bar = d.querySelector(".editor-bar");
  const top = d.getElementById("search-top");
  if (!bar || !top) return;
  let box = d.querySelector(".mock-actions");
  const btns = BTN_IDS.map((id) => d.getElementById(id)).filter(Boolean);

  if (where === "stay") {                      /* 案3: 元どおり .editor-bar の末尾へ戻す */
    btns.forEach((b) => bar.appendChild(b));
    if (box) box.remove();
    return;
  }
  if (!box) { box = d.createElement("div"); box.className = "mock-actions"; }
  btns.forEach((b) => box.appendChild(b));
  if (where === "top") top.insertBefore(box, top.firstChild);
  else top.appendChild(box);
}

function moveSort(d, where) {
  const row = d.querySelector(".result-sort");
  const top = d.getElementById("search-top");
  const modalBody = d.querySelector("#result-modal .modal-body");
  if (!row || !top || !modalBody) return;
  if (where === "pane") {
    /* 絞り込みの下・リセット/検索の上に置く（トップページの .filter-rest と同じ位置づけ） */
    const anchor = d.querySelector("#search-top > .row-actions");
    top.insertBefore(row, anchor);
  } else {
    modalBody.insertBefore(row, d.getElementById("result-count"));
  }
}

/* ================= 注入 ================= */

function sheetOf(d) {
  return [...d.styleSheets].find((s) => (s.href || "").includes("/tools/deck-builder/style.css")) || null;
}

function applyTo(f) {
  const d = f.el.contentDocument;
  if (!d) return;
  const s = sheetOf(d);
  if (!s) return;
  if (f.base === null) f.base = s.cssRules.length;
  while (s.cssRules.length > f.base) s.deleteRule(s.cssRules.length - 1);

  const pane = f.mode === "pane";
  /* ⭐ リセット/検索の行に印を付ける（順序に依存するセレクタを使わないため。上の注意書き参照） */
  const searchBtn = d.getElementById("s-search");
  if (searchBtn && searchBtn.closest(".row")) searchBtn.closest(".row").classList.add("row-actions");
  moveActions(d, pane ? state.q2 : "stay");
  moveSort(d, pane && state.sort === "pane" ? "pane" : "modal");

  if (pane) {
    const rules = [...layoutCss(), ...(state.q2 === "stay" ? [] : actionsCss(state.q2))]
      .concat(state.sort === "pane" ? sortCss() : []);
    for (const r of rules) {
      try { s.insertRule(r, s.cssRules.length); } catch (e) { console.warn("注入失敗:", r, e.message); }
    }
    /* .editor-bar の実測高さを変数に入れる（固定値にしない＝スマホ絞り込み導線の --printbar-h と同じ流儀） */
    const bar = d.querySelector(".editor-bar");
    if (bar) d.documentElement.style.setProperty("--mock-bar-h", `${Math.round(bar.getBoundingClientRect().height)}px`);
  } else {
    d.documentElement.style.removeProperty("--mock-bar-h");
  }
}

function applyAll() {
  Object.values(frames).forEach((f) => { if (!f.el.closest(".frame-col").hidden) applyTo(f); });
  renderNote();
}

/* ================= 画面幅・並べ方 ================= */

function setViewport() {
  const two = state.compare === "two";
  colA.hidden = !two;
  frames.b.mode = two ? "pane" : state.layout;
  tagB.textContent = two ? "変更後（左ペイン化）" : (state.layout === "pane" ? "変更後（左ペイン化）" : "現状（変更なし）");

  const v = state.vw;
  [["a", frames.a], ["b", frames.b]].forEach(([, f]) => {
    const col = f.el.closest(".frame-col");
    if (v === "full") {
      col.classList.add("full");
      f.el.style.transform = "none";
      f.el.style.width = "100%"; f.el.style.height = "100%";
      f.wrap.style.width = ""; f.wrap.style.height = "";
      return;
    }
    col.classList.remove("full");
    const [w, h] = v.split("x").map(Number);
    const z = state.zoom;
    f.el.style.width = w + "px"; f.el.style.height = h + "px";
    f.el.style.transform = z === 1 ? "none" : `scale(${z})`;
    f.wrap.style.width = Math.round(w * z) + "px";
    f.wrap.style.height = Math.round(h * z) + "px";
  });
  applyAll();
}

/* ================= 実測（判断材料をその場で出す） ================= */

function measureFrame(f) {
  const d = f.el.contentDocument;
  if (!d) return "（読み込み中）";
  const r = (sel) => { const e = d.querySelector(sel); return e ? e.getBoundingClientRect() : null; };
  const bar = r(".editor-bar"), top = r("#search-top"), deck = r("#ed-pane-deck");
  const grid = d.querySelector('.zone[data-zone="main"] .zone-grid');
  const cols = grid ? getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length : 0;
  const st = d.getElementById("search-top");
  const line = (n) => Math.round(n);
  return [
    `.editor-bar  高さ ${line(bar ? bar.height : 0)}px（52〜60pxなら1行）`,
    `#search-top  left ${line(top ? top.left : 0)} / width ${line(top ? top.width : 0)}`,
    `右列(デッキ)  left ${line(deck ? deck.left : 0)} / width ${line(deck ? deck.width : 0)} / メイン ${cols}列`,
    `ペイン内スクロール  scrollHeight ${st ? st.scrollHeight : 0} / clientHeight ${st ? st.clientHeight : 0}`,
  ].join("\n");
}

function runMeasure() {
  const parts = [];
  if (!colA.hidden) parts.push("【現状】\n" + measureFrame(frames.a));
  parts.push(`【${tagB.textContent}】\n` + measureFrame(frames.b));
  measureOut.hidden = false;
  measureOut.textContent = parts.join("\n\n");
}

/* ================= 注記 ================= */

/* ⭐ 注記の数値は、このモックで実測したもの（1280×900・実データのデッキ・2026-09-05）。
      推測は書かない——「実測する」ボタンでいつでも取り直せる。 */
const Q2 = {
  bottom: "<b>案1：ペイン最下部（推奨）</b>。検索条件は毎回・何度も使い、コピー系は最後に1回。"
    + "⭐ 実測: 絞り込みの開始 <b>y=108px</b>／3ボタンは <b>y=572px</b>（閉じた状態ならスクロールなしで届く）。"
    + "⚠️ <b class='warn'>4群を全部開いて「すべて表示」まで押すと 3ボタンは y=4993px</b>＝ペインをかなり送らないと出てこない。",
  top: "<b>案2：ペイン最上部</b>。⭐ 3ボタンは常に見えている（y=14px）。"
    + "⚠️ <b class='warn'>絞り込みの開始が y=108 → 246px（+138px）に押し下がる</b>。"
    + "⚠️ <b class='warn'>トップの左ペイン最上部は「選択中の条件」の指定席</b>（P9・案A）なので、Q5でそれを入れると場所が競合する。",
  stay: "<b>案3：移さない</b>（.editor-bar のまま）。⚠️ <b class='warn'>最長デッキ名では 1280px でも 1366px でも .editor-bar が2行＝102px</b>"
    + "（通常のデッキ名なら57px＝1行。1920pxまで広げれば最長名でも1行）。3ボタンが横幅要求の大半（実測491px）を占めるため。"
    + "⚠️ ユーザー要望「納められるなら納める」も満たさない。",
};

function renderNote() {
  let s = Q2[state.q2];
  if (frames.b.mode === "pane") {
    s += `<br>レイアウトは<b>案Z′</b>（#view-editor の内側だけ2カラム＋.editor-bar を sticky）。左ペインに切り替わるのは <b>${BP}px以上</b>（Q3で確定）。`;
    s += "<br>Q4 並び替え: " + (state.sort === "pane"
      ? "⭐ <b>左ペインへ移す</b>（トップと同じ＝並び替えは検索条件の一部）。"
      : "結果モーダル内のまま（現状）。⚠️ <b class='warn'>左ペインに並び替えだけ無い</b>状態になる。");
    if (state.q2 !== "stay") {
      s += `<br>⚠️ <b class='warn'>${BP - 1}px以下では3ボタンは検索パネルの中に横並びで出る</b>（DOMの位置は1つなので実装でも同じ）。<b>375px</b>で必ず確認する。`
        + "⭐ 実測: 375px の .editor-bar は <b>通常名 177→88px / 最長名 264→175px</b>（移すと半減する）。";
    }
  } else {
    s += "<br><b>現状</b>（変更なし）を表示中。⚠️ 1280pxでは .editor-bar が2行になる。";
  }
  s += `<br>デッキは<b>実データ</b>（大会60368 / player 184 のマテリアル12・メイン60・サイド9${state.deck === "pan" ? " …パンテオンは実在カードで組んだシングルトン60種＋Boon2枚" : ""}）。カード名・絵柄・チップ157種は本物。`;
  noteEl.innerHTML = s;
}

/* ================= 操作 ================= */

document.addEventListener("click", async (e) => {
  const b = e.target.closest(".seg button");
  if (!b || !b.parentNode.dataset.g) return;
  const g = b.parentNode.dataset.g;
  for (const sib of b.parentNode.children) sib.classList.toggle("on", sib === b);
  const v = b.dataset.v;

  if (g === "zoom") { state.zoom = Number(v); setViewport(); return; }
  if (g === "vw") { state.vw = v; setViewport(); return; }
  if (g === "compare") { state.compare = v; setViewport(); if (v === "two") await buildFrame(frames.a); return; }
  if (g === "deck" || g === "name") {           /* ⚠️ スタブが返す中身が変わるので作り直す */
    state[g] = v;
    measureOut.hidden = true;
    await Promise.all(Object.values(frames)
      .filter((f) => !f.el.closest(".frame-col").hidden)
      .map((f) => buildFrame(f)));
    renderNote();
    return;
  }
  state[g] = v;
  if (g === "layout") setViewport(); else applyAll();
});

document.getElementById("worst-subtype").addEventListener("click", () => {
  Object.values(frames).forEach((f) => {
    const d = f.el.contentDocument;
    if (!d) return;
    const g = d.getElementById("s-g-subtype");
    if (g) g.open = true;
  });
});

document.getElementById("worst-all").addEventListener("click", () => {
  Object.values(frames).forEach((f) => {
    const d = f.el.contentDocument;
    if (!d) return;
    d.querySelectorAll(".fgroup").forEach((g) => { g.open = true; });
    d.querySelectorAll(".fgroup .morebtn").forEach((b) => b.click());
  });
});

document.getElementById("measure").addEventListener("click", runMeasure);

document.getElementById("panel-toggle").addEventListener("click", (e) => {
  const min = document.body.classList.toggle("panel-min");
  e.currentTarget.textContent = min ? "▼ 操作パネルを開く" : "▲ 操作パネルを畳む";
});

document.getElementById("reload").addEventListener("click", async () => {
  measureOut.hidden = true;
  await Promise.all(Object.values(frames)
    .filter((f) => !f.el.closest(".frame-col").hidden)
    .map((f) => buildFrame(f)));
});

/* ================= 起動 ================= */

(async () => {
  setViewport();
  renderNote();
  await buildFrame(frames.b);
  applyAll();
})();
