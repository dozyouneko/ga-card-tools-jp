"use strict";
/* モック（F：リセット・検索ボタンをスクロールに影響されない位置へ）の操作部。
 *
 * ⚠️ 設計検討用のモックであり実装ではない。本番の配信対象でもない。
 *
 * ⭐ やっていることは3つだけ:
 *    ① 実物を iframe で開く（トップは素の src=、デッキ構築は <base>＋スタブ入りの srcdoc）
 *    ② F の候補CSSを、実物のシートへ CSSOM の insertRule で足す
 *       （⚠️ <style> 注入は CSP style-src 'self' に阻まれて無言で無視される）
 *    ③ トップだけ、ペイン下部に置く .pane-actions（リセットの複製）を DOM で作る
 *       ⚠️ 実装でも「移動」ではなく「複製」にする。#reset は #filter-sheet の中にあり、
 *          動かすと 640px以下のボトムシートからリセットが消えるため（設計書 §11-2）
 *
 * ⚠️ A〜D は実装済みなので、左ペイン化そのものは注入しない（二重適用になる）。
 */

const TOP_SRC = "/";
const DECK_SRC = "/tools/deck-builder/";
const STUB_URL = "/docs/design/未採番-デッキ構築ツールUI刷新/モック_左ペイン化_2026-09-05.stub.js";

const state = { page: "top", f: "on", mid: "an2", vw: "1440x900" };

const frame = document.getElementById("frame");
const wrap = document.getElementById("wrap");
const tag = document.getElementById("tag");
const note = document.getElementById("note");
const out = document.getElementById("measure-out");

/* ================= iframe の組み立て ================= */

let deckHtml = null;
async function deckSource() {
  if (!deckHtml) deckHtml = await (await fetch(DECK_SRC)).text();
  /* ⭐ <base> が要るのは srcdoc の基準URLが親ドキュメントになるため（無いと相対パスが全部壊れる）。
     ⭐ スタブを <script src> で足せるのは同一オリジン＝CSP script-src 'self' を満たすから。 */
  return deckHtml.replace(/<head>/i, `<head><base href="${DECK_SRC}"><script src="${STUB_URL}"><\/script>`);
}

let injectBase = null; // 実物のシートに注入する前のルール数（戻すときの目印）

async function buildFrame() {
  injectBase = null;
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
  /* ⚠️ load を待たずに中を触ると「前のドキュメント」に当たり、新しい方には何も適用されない
        （モック_左ペイン化_2026-09-05.js で実際に踏んだ） */
  await loaded;
  await waitReady();
  apply();
}

/* 実物の初期化（訳データ・チップ157種）を待つ。
   ⚠️ カードは api.gatcg.com から取るので初回は数秒かかる */
function waitReady(timeoutMs = 25000) {
  const sel = state.page === "deck" ? "#s-g-subtype .chip" : "#g-subtype .chip";
  const t0 = Date.now();
  return new Promise((resolve) => {
    const tick = () => {
      const d = frame.contentDocument;
      const ok = d && d.querySelector(sel);
      if (ok || Date.now() - t0 > timeoutMs) { resolve(!!ok); return; }
      setTimeout(tick, 120);
    };
    tick();
  });
}

/* ================= 候補CSS ================= */

/* トップ（/style.css）。⚠️ .controls の padding は
   既定 16px 24px ／ 1200px以上 14px 16px 24px。負のマージンはそれぞれに合わせる */
function topRules() {
  const r = [];
  // --- ペイン幅（1200px以上）: ペイン内スクロールの下端に貼る ---
  r.push(`@media (min-width:1200px){
    .page-top .controls { padding-bottom: 0; scroll-padding-bottom: 5rem; }
    .page-top .filter-rest #reset { display: none; }
    .page-top .filter-rest #order { grid-column: 1 / -1; }
    .page-top .controls > .pane-actions {
      display: flex; gap: 8px; position: sticky; bottom: 0; z-index: 3;
      margin: 0 -16px; padding: 12px 16px;
      background: var(--panel); border-top: 1px solid var(--border);
    }
    .page-top .controls > .pane-actions > button { flex: 1 1 0; }
  }`);
  if (state.mid === "an3") {
    // 中間幅は据え置き＝複製したバーを出さない
    r.push(`@media (max-width:1199px){ .controls > .pane-actions { display: none; } }`);
    return r;
  }
  const mid = "@media (min-width:641px) and (max-width:1199px)";
  r.push(`${mid}{ .filter-rest #reset { display: none; } }`);
  if (state.mid === "an1") {
    /* ⚠️ ⭐ .controls の backdrop-filter を外さないと position: fixed が効かない
       （包含ブロックができてバーがページと一緒に流れる。2026-09-07 実測）。
       ⭐ 代償は「中間幅で上部バーのぼかしが消える」こと。 */
    r.push(`${mid}{
      .controls { -webkit-backdrop-filter: none; backdrop-filter: none; }
      body { padding-bottom: 76px; }
      .controls > .pane-actions {
        display: flex; gap: 8px; position: fixed; left: 0; right: 0; bottom: 0; z-index: 30;
        padding: 12px 24px; background: var(--panel); border-top: 1px solid var(--border);
      }
      .controls > .pane-actions > button { flex: 1 1 0; }
    }`);
  } else {
    r.push(`${mid}{
      .controls > .pane-actions {
        display: flex; gap: 8px; position: sticky; bottom: 0; z-index: 6;
        margin: 0 -24px -16px; padding: 12px 24px;
        background: var(--panel); border-top: 1px solid var(--border);
      }
      .controls > .pane-actions > button { flex: 1 1 0; }
    }`);
  }
  r.push(`@media (max-width:640px){ .controls > .pane-actions { display: none; } }`);
  return r;
}

/* デッキ構築（/tools/deck-builder/style.css）。
   ⭐ .row-actions は既に #search-top 直下の最後の子なので DOM の変更は要らない。
   ⚠️ .search-top の padding は 既定 14px 24px ／ 1280px以上 14px 16px 24px */
function deckRules() {
  const r = [];
  r.push(`@media (min-width:1280px){
    #view-editor #search-top { padding-bottom: 0; scroll-padding-bottom: 5rem; }
    #search-top > .row-actions {
      position: sticky; bottom: 0; z-index: 3;
      margin: 0 -16px; padding: 12px 16px;
      background: var(--panel); border-top: 1px solid var(--border);
    }
  }`);
  if (state.mid === "an3") return r;
  const mid = "@media (min-width:641px) and (max-width:1279px)";
  if (state.mid === "an1") {
    /* ⭐ .search-top には backdrop-filter が無いので、こちらは外す必要がない
       （＝案1 の代償はトップ側にしか出ない。ページ間で非対称） */
    r.push(`${mid}{
      body { padding-bottom: 76px; }
      #search-top > .row-actions {
        position: fixed; left: 0; right: 0; bottom: 0; z-index: 30; margin: 0;
        padding: 12px 24px; background: var(--panel); border-top: 1px solid var(--border);
      }
      #search-top > .row-actions .btn { flex: 1 1 0; text-align: center; }
    }`);
  } else {
    r.push(`${mid}{
      #search-top > .row-actions {
        position: sticky; bottom: 0; z-index: 6;
        margin: 0 -24px -14px; padding: 12px 24px;
        background: var(--panel); border-top: 1px solid var(--border);
      }
      #search-top > .row-actions .btn { flex: 1 1 0; text-align: center; }
    }`);
  }
  return r;
}

/* ================= 注入 ================= */

function sheetOf(d) {
  const want = state.page === "deck" ? "/tools/deck-builder/style.css" : "/style.css";
  return [...d.styleSheets].find((s) => (s.href || "").endsWith(want)) || null;
}

/* トップだけ、ペイン下部に置くバー（リセットの複製）を作る。
   ⚠️ 実装でも複製にする理由は設計書 §11-2（#reset を動かすと 640px以下のシートから消える） */
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

function apply() {
  const d = frame.contentDocument;
  if (!d) return;
  const s = sheetOf(d);
  if (!s) { note.textContent = "⚠️ 実物のスタイルシートに触れませんでした（同一オリジンで開いていますか？）"; return; }
  ensurePaneActions(d);
  /* ⚠️ 「現状（変更なし）」のときは複製したバーを消す。
     出したままだと、実物には無いリセットがペイン下部に増えて before/after の比較が壊れる
     （⭐ CSP style-src 'self' でも style プロパティ経由は通る） */
  const bar = d.querySelector(".controls > .pane-actions");
  if (bar) bar.style.display = state.f === "on" ? "" : "none";
  if (injectBase === null) injectBase = s.cssRules.length;
  while (s.cssRules.length > injectBase) s.deleteRule(s.cssRules.length - 1);
  if (state.f === "on") {
    for (const r of (state.page === "deck" ? deckRules() : topRules())) {
      try { s.insertRule(r, s.cssRules.length); } catch (e) { console.warn("注入失敗:", r, e.message); }
    }
  }
  renderNote();
}

/* ================= 最悪ケース・実測 ================= */

function openWorst() {
  const d = frame.contentDocument;
  if (!d) return;
  const g = d.getElementById(state.page === "deck" ? "s-g-subtype" : "g-subtype");
  if (!g) return;
  g.open = true;
  const more = [...g.querySelectorAll("button")].find((b) => /すべて表示/.test(b.textContent));
  if (more && /すべて表示/.test(more.textContent)) more.click();
}

function actionEl(d) {
  if (state.page === "deck") return d.querySelector("#search-top > .row-actions");
  /* ⚠️ 複製したバーが display:none の帯（640px以下・案3の中間幅）では、
     実際に見えている元の #reset を測る。ここを間違えると 0×0 の矩形を測って「画面内」と誤報する */
  const bar = d.querySelector(".controls > .pane-actions");
  const shown = bar && getComputedStyle(bar).display !== "none";
  return shown ? bar : d.getElementById("reset");
}

function measure() {
  const d = frame.contentDocument;
  const w = frame.contentWindow;
  if (!d || !w) return;
  const el = actionEl(d);
  if (!el) { out.hidden = false; out.textContent = "対象のボタンが見つかりません"; return; }
  const paneSel = state.page === "deck" ? "#search-top" : ".controls";
  const pane = d.querySelector(paneSel);
  const paneScrolls = pane && getComputedStyle(pane).overflowY === "auto";
  const lines = [];
  lines.push(`ページ=${state.page} 幅=${state.vw} F=${state.f} 中間幅=${state.mid}`);
  lines.push(`スクロールするのは ${paneScrolls ? "ペインの中（" + paneSel + "）" : "ページ全体（window）"}`);
  if (paneScrolls) {
    /* ⚠️ デッキ構築はサイトヘッダの下にペインが始まるので、ページを下げないとペインの下端が
       ビューポートの外に出たままになる（＝「画面内=いいえ」ばかりが並んで測定が無意味になる）。
       ⭐ ペインの下端がちょうど収まるところまでだけ下げる（固定値にしない） */
    const need = Math.max(0, pane.getBoundingClientRect().bottom - w.innerHeight);
    if (need > 0) { w.scrollBy(0, need); lines.push(`  （ペイン全体を出すためページを ${Math.round(need)}px 下げた）`); }
  }
  const spots = paneScrolls ? [0, 1200, pane.scrollHeight] : [0, 600, d.documentElement.scrollHeight];
  for (const t of spots) {
    if (paneScrolls) pane.scrollTop = t; else w.scrollTo(0, t);
    const r = el.getBoundingClientRect();
    const inView = r.top >= 0 && r.bottom <= w.innerHeight + 0.5;
    const hit = d.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2));
    lines.push(
      `  scroll=${Math.round(paneScrolls ? pane.scrollTop : w.scrollY).toString().padStart(5)}  top=${Math.round(r.top).toString().padStart(5)}  bottom=${Math.round(r.bottom).toString().padStart(5)}  画面内=${inView ? "はい" : "いいえ"}  当たり判定=${hit ? (hit.id || hit.className || hit.tagName) : "なし"}`
    );
  }
  lines.push(`  ビューポート高=${w.innerHeight}`);
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
  const paneMin = state.page === "deck" ? 1280 : 1200;
  let band;
  if (w >= paneMin) band = `ペイン幅（${paneMin}px以上）— ⭐ ここは決定済み。ペイン内スクロールの下端に貼る`;
  else if (w >= 641) band = `⭐ 中間幅（641〜${paneMin - 1}px）— ここが今回の判断対象（いま「${{ an1: "案1：画面下端に固定", an2: "案2：パネル末尾で貼り付く", an3: "案3：据え置き" }[state.mid]}」）`;
  else band = "スマホ幅（640px以下）— ⚠️ 触らない。F のルールはすべて min-width:641px の内側にある";
  const extra = state.mid === "an1" && state.page === "top" && w >= 641 && w < 1200
    ? "\n⚠️ 案1 はトップだけ代償がある: .controls の backdrop-filter（ぼかし）を外さないと position:fixed が効かない。上部バーのぼかしがこの帯で消える"
    : "";
  note.textContent = `いまの帯: ${band}${extra}`;
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
document.getElementById("panel-toggle").addEventListener("click", (e) => {
  const rows = document.querySelector(".rows");
  const hide = !rows.hidden;
  rows.hidden = hide;
  document.querySelector(".lead").hidden = hide;
  e.target.textContent = hide ? "▼ 操作パネルを開く" : "▲ 操作パネルを畳む";
});

applyViewport();
buildFrame();
