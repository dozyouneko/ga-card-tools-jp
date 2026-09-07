"use strict";
/* モック（1.5案：表示モードの二値化 ＋ F：ペイン下部のアクションバー）の操作部。
 *
 * ⚠️ 設計検討用のモックであり実装ではない。本番の配信対象でもない。
 *
 * ⭐ 見比べたいのは2つ:
 *    ① **1199px以下を「スマホ表示」に統一**したときの見え方（現行の中間幅＝上部パネルを廃止する）
 *    ② **1200〜1279px で左ペインが成立するか**（デッキ構築の境界を 1280 → 1200 に下げる）
 *
 * ⭐ やっていること:
 *    (a) 実物を iframe で開く（トップは素の src=、デッキ構築は <base>＋スタブ入りの srcdoc）
 *    (b) 実物のシートの **@media の条件文（mediaText）を書き換える**
 *        （⭐ ルールを複製せずに帯を動かせるので、モックが本体から陳腐化しない）
 *    (c) ⚠️ 帯を広げると「寸法まわり」まで一緒に広がってしまうので、
 *        **広げる前の実測値を読み取って 641〜1199px にだけ戻す**（→ RESTORE）
 *    (d) F の候補CSSを CSSOM の insertRule で足す
 *        （⚠️ <style> 注入は CSP style-src 'self' に阻まれて無言で無視される）
 *
 * ⚠️ ⭐ (c) があるのは、**実装では「絞り込みの導線だけ」を広げる**ため。
 *    このモックは近似であり、ヘッダ・モーダル・タップ領域は 641〜1199px でも
 *    スマホ側の値のまま出る（＝実装後の姿より「スマホ寄り」に見える）。
 */

const TOP_SRC = "/";
const DECK_SRC = "/tools/deck-builder/";
const STUB_URL = "/docs/design/未採番-デッキ構築ツールUI刷新/モック_左ペイン化_2026-09-05.stub.js";

const state = { page: "top", mode: "v15", f: "on", vw: "1240x900" };

const frame = document.getElementById("frame");
const wrap = document.getElementById("wrap");
const tag = document.getElementById("tag");
const note = document.getElementById("note");
const out = document.getElementById("measure-out");

/* ⚠️ 帯を広げたときに 641〜1199px へ戻す寸法。⭐ 値はハードコードせず、
   広げる前の getComputedStyle から読む（本体の値が変わっても追随する） */
const RESTORE = {
  top: [
    [".grid", ["grid-template-columns", "gap", "padding"]],
    [".controls", ["padding"]],
    [".controls input, .controls select, .controls button", ["font-size", "padding"], "#q"],
    [".card-name", ["font-size"]],
    [".card-name-en", ["font-size"]],
  ],
  deck: [
    [".artgrid", ["grid-template-columns", "gap"]],
    [".modal-body", ["width", "max-width", "height", "max-height", "border-radius", "padding"]],
    [".search-top input, .search-top select, .search-top .btn", ["font-size"], "#s-name"],
  ],
};

/* ================= iframe の組み立て ================= */

let deckHtml = null;
async function deckSource() {
  if (!deckHtml) deckHtml = await (await fetch(DECK_SRC)).text();
  /* ⭐ <base> が要るのは srcdoc の基準URLが親ドキュメントになるため（無いと相対パスが全部壊れる）。
     ⭐ スタブを <script src> で足せるのは同一オリジン＝CSP script-src 'self' を満たすから。 */
  return deckHtml.replace(/<head>/i, `<head><base href="${DECK_SRC}"><script src="${STUB_URL}"><\/script>`);
}

let injectBase = null;   // 実物のシートに注入する前のルール数（戻すときの目印）
let mediaRules = [];     // 条件文を書き換えた @media ルールと、その元の条件文

async function buildFrame() {
  injectBase = null;
  mediaRules = [];
  const loaded = new Promise((res) => frame.addEventListener("load", res, { once: true }));
  if (state.page === "deck") {
    frame.dataset.deck = "std";
    frame.dataset.name = "normal";
    frame.removeAttribute("src");
    frame.srcdoc = await deckSource();
  } else {
    frame.removeAttribute("srcdoc");
    frame.src = TOP_SRC;
  }
  /* ⚠️ load を待たずに中を触ると「前のドキュメント」に当たり、新しい方には何も適用されない */
  await loaded;
  await waitReady();
  apply();
}

function waitReady(timeoutMs = 30000) {
  const sel = state.page === "deck" ? "#s-g-subtype .chip" : "#g-subtype .chip";
  const t0 = Date.now();
  return new Promise((resolve) => {
    const tick = () => {
      const d = frame.contentDocument;
      if ((d && d.querySelector(sel)) || Date.now() - t0 > timeoutMs) { resolve(); return; }
      setTimeout(tick, 120);
    };
    tick();
  });
}

/* ================= シートの操作 ================= */

function sheetOf(d) {
  const want = state.page === "deck" ? "/tools/deck-builder/style.css" : "/style.css";
  return [...d.styleSheets].find((s) => (s.href || "").endsWith(want)) || null;
}

/* 条件文を書き換える @media ルールを集める（元の条件文を覚えておいて戻せるようにする） */
function collectMediaRules(sheet) {
  if (mediaRules.length) return;
  for (const rule of sheet.cssRules) {
    if (rule.type !== 4) continue;
    const t = rule.media.mediaText;
    if (/max-width:\s*640px/.test(t) || /max-width:\s*860px/.test(t) || /min-width:\s*1280px/.test(t)) {
      mediaRules.push({ rule, orig: t });
    }
  }
}
function resetMediaRules() { mediaRules.forEach((m) => { m.rule.media.mediaText = m.orig; }); }

/* ⭐ 広げる前の実測値を読む（RESTORE 用）。⚠️ 必ず「現状の条件文に戻した状態」で呼ぶこと */
function captureRestore(d) {
  const decls = [];
  for (const [sel, props, probeSel] of RESTORE[state.page]) {
    const probe = d.querySelector(probeSel || sel.split(",")[0].trim());
    if (!probe) continue;
    const cs = getComputedStyle(probe);
    const body = props.map((pr) => `${pr}: ${cs.getPropertyValue(pr)}`).join("; ");
    decls.push(`${sel} { ${body}; }`);
  }
  return decls;
}

/* ================= 候補CSS ================= */

function paneMin() {
  // 1.5案では境界を 1200px に統一する（デッキ構築の 1280px を下げる）
  return state.mode === "v15" ? 1200 : (state.page === "deck" ? 1280 : 1200);
}

/* F：ペイン下部にリセット（＋検索）を貼る。⭐ 1.5案では中間幅が無くなるので、これ1本だけ */
function fRules() {
  const min = paneMin();
  if (state.page === "deck") {
    return [`@media (min-width:${min}px){
      #view-editor #search-top { padding-bottom: 0; scroll-padding-bottom: 5rem; }
      #search-top > .row-actions {
        position: sticky; bottom: 0; z-index: 3;
        margin: 0 -16px; padding: 12px 16px;
        background: var(--panel); border-top: 1px solid var(--border);
      }
    }`];
  }
  return [`@media (min-width:${min}px){
      .page-top .controls { padding-bottom: 0; scroll-padding-bottom: 5rem; }
      .page-top .filter-rest #reset { display: none; }
      .page-top .filter-rest #order { grid-column: 1 / -1; }
      .page-top .controls > .pane-actions {
        display: flex; gap: 8px; position: sticky; bottom: 0; z-index: 3;
        margin: 0 -16px; padding: 12px 16px;
        background: var(--panel); border-top: 1px solid var(--border);
      }
      .page-top .controls > .pane-actions > button { flex: 1 1 0; }
    }`,
    `@media (max-width:${min - 1}px){ .controls > .pane-actions { display: none; } }`];
}

/* トップだけ、ペイン下部に置くバー（リセットの複製）を作る。
   ⚠️ 実装でも「移動」ではなく「複製」にする（#reset は #filter-sheet の中にあり、
      動かすと 1199px以下のボトムシートからリセットが消える＝設計書 §12-4） */
function ensurePaneActions(d) {
  if (state.page !== "top") return;
  if (d.querySelector(".controls > .pane-actions")) return;
  const c = d.querySelector(".controls");
  const reset = d.getElementById("reset");
  if (!c || !reset) return;
  const bar = d.createElement("div");
  bar.className = "pane-actions";
  const clone = reset.cloneNode(true);
  clone.id = "reset-pane";
  clone.addEventListener("click", () => reset.click());
  bar.appendChild(clone);
  c.appendChild(bar);
}

/* ⭐ FAB は app.js の MOBILE_MQ（640px 固定）が出し入れを決めるので、
   帯だけ広げても 1199px では出てこない。モックではスクロールに合わせて自分で出し入れする。
   ⚠️ 実装では MOBILE_MQ を 1199px に変える（設計書 §14-3）。 */
let fabHook = null;
function hookFab(d, w) {
  if (fabHook) { w.removeEventListener("scroll", fabHook); fabHook = null; }
  if (state.page !== "top" || state.mode !== "v15") return;
  const fab = d.getElementById("filter-fab");
  const controls = d.querySelector(".controls");
  if (!fab || !controls) return;
  const sync = () => {
    const out = controls.getBoundingClientRect().bottom <= 0;
    fab.classList.toggle("is-hidden", !(out && w.innerWidth <= 1199));
  };
  fabHook = () => requestAnimationFrame(sync);
  w.addEventListener("scroll", fabHook, { passive: true });
  sync();
}

/* ================= 適用 ================= */

function apply() {
  const d = frame.contentDocument;
  const w = frame.contentWindow;
  if (!d || !w) return;
  const s = sheetOf(d);
  if (!s) { note.textContent = "⚠️ 実物のスタイルシートに触れませんでした（同一オリジンで開いていますか？）"; return; }

  collectMediaRules(s);
  ensurePaneActions(d);
  if (injectBase === null) injectBase = s.cssRules.length;
  while (s.cssRules.length > injectBase) s.deleteRule(s.cssRules.length - 1);

  /* ⚠️ 必ず「現状」に戻してから実測する（広げた状態で読むとスマホ側の値を読んでしまう） */
  resetMediaRules();
  const restore = state.mode === "v15" ? captureRestore(d) : [];

  const rules = [];
  if (state.mode === "v15") {
    // ① スマホ表示の帯を 1199px まで広げる（トップ 640→1199 / デッキ構築 860→1199）
    // ② 左ペインの境界を 1200px に統一（デッキ構築 1280→1200）
    mediaRules.forEach((m) => {
      if (/max-width:\s*(640|860)px/.test(m.orig)) m.rule.media.mediaText = "(max-width: 1199px)";
      if (/min-width:\s*1280px/.test(m.orig)) m.rule.media.mediaText = "(min-width: 1200px)";
    });
    // ③ ⚠️ 寸法まわりだけ 641〜1199px に戻す（実装では帯を広げるのは絞り込み導線だけ）
    if (restore.length) rules.push(`@media (min-width:641px) and (max-width:1199px){ ${restore.join(" ")} }`);
  }
  if (state.f === "on") rules.push(...fRules());

  for (const r of rules) {
    try { s.insertRule(r, s.cssRules.length); } catch (e) { console.warn("注入失敗:", r, e.message); }
  }

  const bar = d.querySelector(".controls > .pane-actions");
  if (bar) bar.style.display = state.f === "on" ? "" : "none";

  hookFab(d, w);
  renderNote();
}

/* ================= 最悪ケース・実測 ================= */

function openWorst() {
  const d = frame.contentDocument;
  if (!d) return;
  // スマホ表示では絞り込みが畳まれているので先に開く
  const toggle = d.getElementById(state.page === "deck" ? "s-toggle" : "filter-toggle");
  if (toggle && getComputedStyle(toggle).display !== "none") toggle.click();
  const g = d.getElementById(state.page === "deck" ? "s-g-subtype" : "g-subtype");
  if (!g) return;
  g.open = true;
  const more = [...g.querySelectorAll("button")].find((b) => /すべて表示/.test(b.textContent));
  if (more) more.click();
}

function actionEl(d) {
  if (state.page === "deck") return d.querySelector("#search-top > .row-actions");
  const bar = d.querySelector(".controls > .pane-actions");
  /* ⚠️ 貼っていない帯では実際に見えている元の #reset を測る
     （0×0 の矩形を測って「画面内」と誤報しないため） */
  return bar && getComputedStyle(bar).display !== "none" ? bar : d.getElementById("reset");
}

function measure() {
  const d = frame.contentDocument;
  const w = frame.contentWindow;
  if (!d || !w) return;
  const el = actionEl(d);
  const lines = [];
  const px = (n) => Math.round(n);
  lines.push(`ページ=${state.page} 幅=${state.vw} 表示モード=${state.mode === "v15" ? "1.5案" : "現状"} F=${state.f}（左ペインの境界 ${paneMin()}px）`);

  /* 帯の状態 */
  const paneSel = state.page === "deck" ? "#search-top" : ".controls";
  const pane = d.querySelector(paneSel);
  const cs = getComputedStyle(pane);
  const paneScrolls = cs.overflowY === "auto";
  lines.push(`  ${paneSel}: position=${cs.position} overflow-y=${cs.overflowY} 幅=${px(pane.getBoundingClientRect().width)} 左=${px(pane.getBoundingClientRect().left)}`);
  const toggle = d.getElementById(state.page === "deck" ? "s-toggle" : "filter-toggle");
  if (toggle) lines.push(`  折りたたみトグル: display=${getComputedStyle(toggle).display}`);
  if (state.page === "top") {
    const sh = d.getElementById("filter-sheet");
    const fab = d.getElementById("filter-fab");
    if (sh) lines.push(`  ボトムシート: display=${getComputedStyle(sh).display} position=${getComputedStyle(sh).position}`);
    if (fab) lines.push(`  FAB: display=${getComputedStyle(fab).display} position=${getComputedStyle(fab).position}`);
  } else {
    const grids = [...d.querySelectorAll(".zone-grid")].filter((g) => g.getBoundingClientRect().width > 0);
    if (grids.length) {
      const g = grids.reduce((a, b) => (b.querySelectorAll(".gtile").length > a.querySelectorAll(".gtile").length ? b : a));
      lines.push(`  メインデッキ: 幅=${px(g.getBoundingClientRect().width)} 列数=${getComputedStyle(g).gridTemplateColumns.split(/\s+/).filter(Boolean).length}`);
    }
    const sp = d.getElementById("ed-pane-stats");
    if (sp && !sp.hidden) lines.push(`  統計パネル: 幅=${px(sp.getBoundingClientRect().width)}（max-width=${getComputedStyle(sp).maxWidth}）`);
  }

  /* アクションバーの位置 */
  if (el) {
    lines.push(`  スクロールするのは ${paneScrolls ? "ペインの中（" + paneSel + "）" : "ページ全体（window）"}`);
    if (paneScrolls) {
      const need = Math.max(0, pane.getBoundingClientRect().bottom - w.innerHeight);
      if (need > 0) { w.scrollBy(0, need); lines.push(`  （ペイン全体を出すためページを ${px(need)}px 下げた）`); }
    }
    const spots = paneScrolls ? [0, 1200, pane.scrollHeight] : [0, 600, d.documentElement.scrollHeight];
    for (const t of spots) {
      if (paneScrolls) pane.scrollTop = t; else w.scrollTo(0, t);
      const r = el.getBoundingClientRect();
      const hit = d.elementFromPoint(px(r.left + r.width / 2), px(r.top + r.height / 2));
      lines.push(`  scroll=${px(paneScrolls ? pane.scrollTop : w.scrollY).toString().padStart(5)}  top=${px(r.top).toString().padStart(5)}  bottom=${px(r.bottom).toString().padStart(5)}  画面内=${r.top >= 0 && r.bottom <= w.innerHeight + 0.5 ? "はい" : "いいえ"}  当たり判定=${hit ? (hit.id || hit.className || hit.tagName) : "なし"}`);
    }
  }
  lines.push(`  ビューポート=${w.innerWidth}×${w.innerHeight}`);
  out.hidden = false;
  out.textContent = lines.join("\n");
}

/* ================= 画面幅・注記 ================= */

function applyViewport() {
  const [w, h] = state.vw.split("x").map(Number);
  frame.style.width = `${w}px`;
  frame.style.height = `${h}px`;
  wrap.style.width = `${w}px`;
  wrap.style.maxWidth = "100%";
  tag.textContent = `${state.page === "deck" ? "デッキ構築" : "トップ（/）"} — ${w}×${h}`;
}

function renderNote() {
  const w = Number(state.vw.split("x")[0]);
  const min = paneMin();
  const band = w >= min ? `左ペイン表示（${min}px以上）` : (state.mode === "v15" ? "⭐ スマホ表示（1199px以下・1.5案で統一）" : (w >= 641 ? "⚠️ 中間幅＝上部の絞り込みパネル（1.5案で廃止する形）" : "スマホ表示（640px以下）"));
  const extra = state.mode === "v15"
    ? "\n⚠️ このモードは近似です: 帯ごと広げてから寸法（カード一覧・入力欄・モーダル）だけを 641〜1199px に戻しています。実装では『絞り込みの導線だけ』を広げるので、ヘッダ・タップ領域は現状のPC寄りのままになります"
    : "";
  const extra2 = (state.page === "deck" && state.mode === "v15" && w >= 1200 && w < 1280)
    ? "\n⭐ ここが今回の焦点: デッキ構築の境界を 1280→1200 に下げた帯（メインデッキの列数と統計パネルの幅を見てください）"
    : "";
  note.textContent = `いまの帯: ${band}${extra}${extra2}`;
}

/* ================= 配線 ================= */

document.querySelectorAll(".seg[data-g]").forEach((seg) => {
  seg.addEventListener("click", async (e) => {
    const b = e.target.closest("button[data-v]");
    if (!b) return;
    const g = seg.dataset.g;
    seg.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
    state[g] = b.dataset.v;
    if (g === "page") { applyViewport(); await buildFrame(); return; }
    if (g === "vw") applyViewport();
    apply();
  });
});
document.getElementById("worst").addEventListener("click", openWorst);
document.getElementById("measure").addEventListener("click", measure);
document.getElementById("reload").addEventListener("click", () => buildFrame());
/* ⚠️ 畳むのは class で行う。hidden 属性だと .rows の display:flex に負けて .lead しか畳まれない
   （2026-09-07 にユーザーが指摘）。旧モック（モック_左ペイン化_2026-09-05）と同じ方式 */
document.getElementById("panel-toggle").addEventListener("click", (e) => {
  const min = document.body.classList.toggle("panel-min");
  e.currentTarget.textContent = min ? "▼ 操作パネルを開く" : "▲ 操作パネルを畳む";
});

applyViewport();
buildFrame();
