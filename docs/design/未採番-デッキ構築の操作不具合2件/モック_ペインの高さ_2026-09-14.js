"use strict";
/* モック（左ペインの高さ・不具合2の3案）の操作部。
 *
 * ⚠️ 設計検討用のモックであり実装ではない。本番の配信対象でもない。
 *
 * ⭐ 左の枠＝現状（何も注入しない）／右の枠＝選んだ案を注入する。
 *    案1: ペインの max-height を「実際の上端」から計算する（CSSOM の insertRule ＋ scroll リスナーで --mock-pane-top を更新）
 *    案2: 結果ダイアログを開いても body の overflow を固定しない（1200px以上のとき）
 *    案3: ペインの max-height を「ページ最上部での上端」で固定する（常にヘッダぶん短い）
 *
 * ⚠️ 実装では変数名は --pane-top（設計書 §4-4）。モックは実物と衝突しないよう --mock-pane-top を使う。
 */

const DECK_SRC = "/tools/deck-builder/";
const STUB_URL = "/docs/design/未採番-デッキ構築ツールUI刷新/モック_左ペイン化_2026-09-05.stub.js";
const PANE_MIN = 1200; // ⚠️ 実物の PANE_MIN_WIDTH と同じ値

const state = { plan: "p1", vw: "1440x900", name: "normal", zoom: "0.75" };
const frames = { cur: document.getElementById("frame-cur"), new: document.getElementById("frame-new") };
const boxes = { cur: document.getElementById("box-cur"), new: document.getElementById("box-new") };
const note = document.getElementById("note");
const out = document.getElementById("measure-out");
const PLAN_LABEL = { p1: "案1：ペインの高さを実際の位置に追従", p2: "案2：結果ダイアログ中もページをスクロール可", p3: "案3：ペインを常にヘッダぶん短く" };
const PLAN_NOTE = {
  p1: "⭐ 案1：ページのどの位置でも、ボタン行がペインの下端＝画面の下端に来る。ページを下へ送ると、ヘッダが消えるぶんだけペインが伸びる。",
  p2: "⚠️ 案2：見た目は現状と同じ。結果ダイアログを開いたまま、ペインの上でホイールを回すとページが下へ送られてボタンが出てくる（＝自分でスクロールすれば届く）。⚠️ ページ最上部のままでは隠れたまま。",
  p3: "⚠️ 案3：ボタン行は常に見えるが、ページを下へ送ってもペインは伸びない（ヘッダ約121px ぶん、チップの見える量が常に少ない）。",
};

let deckHtml = null;
async function deckSource() {
  if (!deckHtml) deckHtml = await (await fetch(DECK_SRC)).text();
  // ⭐ <base> が要るのは srcdoc の基準URLが親ドキュメントになるため
  return deckHtml.replace(/<head>/i, `<head><base href="${DECK_SRC}"><script src="${STUB_URL}"><\/script>`);
}

function size() { const [w, h] = state.vw.split("x").map(Number); return { w, h }; }

function layout() {
  const { w, h } = size();
  const z = Number(state.zoom);
  for (const k of ["cur", "new"]) {
    frames[k].style.width = `${w}px`;
    frames[k].style.height = `${h}px`;
    frames[k].style.transform = `scale(${z})`;
    boxes[k].style.width = `${Math.round(w * z)}px`;
    boxes[k].style.height = `${Math.round(h * z)}px`;
  }
  document.getElementById("tag-new").textContent = PLAN_LABEL[state.plan];
  note.textContent = PLAN_NOTE[state.plan] + (w < PANE_MIN ? "\n⚠️ この幅はスマホ表示（左ペインが無い）。3案とも何も変わらないのが正しい。" : "");
}

async function load(k) {
  const f = frames[k];
  f.dataset.deck = "std";
  f.dataset.name = state.name;
  const loaded = new Promise((res) => f.addEventListener("load", res, { once: true }));
  f.srcdoc = await deckSource();
  await loaded; // ⚠️ load を待たずに触ると前のドキュメントに当たる
  await waitReady(f);
  if (k === "new") applyPlan(f);
}

function waitReady(f, timeoutMs = 30000) {
  const t0 = Date.now();
  return new Promise((resolve) => {
    const tick = () => {
      const d = f.contentDocument;
      if ((d && d.querySelector("#s-g-subtype .chip") && d.querySelector(".zone[data-zone=main] .gtile")) || Date.now() - t0 > timeoutMs) { resolve(); return; }
      setTimeout(tick, 150);
    };
    tick();
  });
}

function sheetOf(d) { return [...d.styleSheets].find((s) => (s.href || "").endsWith("/tools/deck-builder/style.css")) || null; }

function applyPlan(f) {
  const d = f.contentDocument, w = f.contentWindow;
  const sheet = sheetOf(d);
  const pane = d.getElementById("search-top");
  if (state.plan === "p1") {
    sheet.insertRule(`@media (min-width: ${PANE_MIN}px) { #view-editor #search-top { max-height: calc(100vh - var(--mock-pane-top, var(--editor-bar-h, 57px))); } }`, sheet.cssRules.length);
    let raf = 0;
    const upd = () => {
      raf = 0;
      if (!w.matchMedia(`(min-width: ${PANE_MIN}px)`).matches || !pane.getClientRects().length) return;
      const barH = parseFloat(w.getComputedStyle(d.documentElement).getPropertyValue("--editor-bar-h")) || 57;
      d.documentElement.style.setProperty("--mock-pane-top", `${Math.max(barH, Math.ceil(pane.getBoundingClientRect().top))}px`);
    };
    w.addEventListener("scroll", () => { if (!raf) raf = w.requestAnimationFrame(upd); }, { passive: true });
    w.addEventListener("resize", () => { if (!raf) raf = w.requestAnimationFrame(upd); });
    upd();
  } else if (state.plan === "p2") {
    const modal = d.getElementById("result-modal");
    new w.MutationObserver(() => {
      if (w.innerWidth >= PANE_MIN && !modal.hidden && d.body.style.overflow === "hidden") d.body.style.overflow = "";
    }).observe(d.body, { attributes: true, attributeFilter: ["style"] });
  } else if (state.plan === "p3") {
    const y = w.scrollY; w.scrollTo(0, 0);
    const top0 = Math.ceil(pane.getBoundingClientRect().top);
    w.scrollTo(0, y);
    sheet.insertRule(`@media (min-width: ${PANE_MIN}px) { #view-editor #search-top { max-height: calc(100vh - ${top0}px); } }`, sheet.cssRules.length);
  }
}

function each(fn) { for (const k of ["cur", "new"]) { const f = frames[k]; if (f.contentDocument) fn(f.contentDocument, f.contentWindow, k); } }

const ACT = {
  top: () => each((d, w) => w.scrollTo(0, 0)),
  y60: () => each((d, w) => w.scrollTo(0, 60)),
  y400: () => each((d, w) => w.scrollTo(0, 400)),
  search: () => each((d) => { d.getElementById("s-name").value = "fire"; d.getElementById("s-search").click(); }),
  element: () => each((d) => { const g = d.getElementById("s-g-element"); if (!g.open) g.querySelector("summary").click(); }),
  subtype: () => each((d) => {
    const g = d.getElementById("s-g-subtype"); if (!g.open) g.querySelector("summary").click();
    setTimeout(() => { const b = [...g.querySelectorAll("button")].find((x) => /すべて表示/.test(x.textContent)); if (b) b.click(); }, 100);
  }),
  measure: () => {
    const lines = [];
    each((d, w, k) => {
      const b = d.getElementById("s-search").getBoundingClientRect();
      const p = d.getElementById("search-top");
      const e = b.bottom <= w.innerHeight ? d.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2) : null;
      lines.push(`${k === "cur" ? "現状" : PLAN_LABEL[state.plan]}: scrollY=${Math.round(w.scrollY)} / 画面の高さ ${w.innerHeight} / 🔍検索 ${Math.round(b.top)}〜${Math.round(b.bottom)} → ${b.bottom <= w.innerHeight ? "画面内" : "⚠️ 画面外"}・${e && (e.id === "s-search") ? "押せる" : "⚠️ 押せない"} / ペイン ${p.clientHeight}px（中身 ${p.scrollHeight}px）/ 結果ダイアログ ${d.getElementById("result-modal").hidden ? "閉" : "開"}・body overflow="${d.body.style.overflow}"`);
    });
    out.hidden = false;
    out.textContent = lines.join("\n");
  },
  reload: () => reloadAll(),
};

async function reloadAll() {
  layout();
  out.hidden = true;
  note.textContent = "読み込み中…（カードの取得に数秒かかります）";
  await Promise.all([load("cur"), load("new")]);
  layout();
}

document.querySelectorAll(".seg[data-g]").forEach((seg) => {
  seg.addEventListener("click", (ev) => {
    const b = ev.target.closest("button"); if (!b) return;
    seg.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
    state[seg.dataset.g] = b.dataset.v;
    if (seg.dataset.g === "zoom") { layout(); return; }
    if (seg.dataset.g === "plan") { layout(); load("new"); return; }
    reloadAll();
  });
});
document.querySelectorAll("button[data-act]").forEach((b) => b.addEventListener("click", () => ACT[b.dataset.act]()));

reloadAll();
