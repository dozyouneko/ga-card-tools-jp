"use strict";
/* モック（検索結果のタブ化）の操作部。
 *
 * ⚠️ 設計検討用のモックであり実装ではない。本番の配信対象でもない。
 *
 * ⭐ 左の枠＝現状（何も注入しない・結果はモーダル）／右の枠＝タブ化の候補（inject.js）を注入する。
 * ⭐ 候補の挙動は iframe の data-* 属性で切り替える（inject.js の冒頭コメント）。
 */

const DECK_SRC = "/tools/deck-builder/";
const STUB_URL = "/docs/design/未採番-デッキ構築ツールUI刷新/モック_左ペイン化_2026-09-05.stub.js";
const INJECT_URL = "/docs/design/未採番-検索結果のタブ化/モック_検索結果のタブ化_2026-09-15.inject.js";
const STUB_CARDS_URL = "/docs/design/未採番-検索結果のタブ化/モック_検索結果のタブ化_2026-09-15.stub-cards.js";

const state = { cmp: "one", vw: "1440x900", zoom: "0.75", deck: "std", link: "b", scope: "deck", num: "reset", reload: "last", switch: "on", chip: "off", icons: "off" };
const frames = { cur: document.getElementById("frame-cur"), new: document.getElementById("frame-new") };
const boxes = { cur: document.getElementById("box-cur"), new: document.getElementById("box-new") };
const colCur = document.getElementById("col-cur");
const note = document.getElementById("note");
const out = document.getElementById("measure-out");

let deckHtml = null;
async function deckSource(inject) {
  if (!deckHtml) deckHtml = await (await fetch(DECK_SRC, { cache: "no-store" })).text();
  // ⭐ <base> が要るのは srcdoc の基準URLが親ドキュメントになるため。
  // ⭐ スタブは本体より先（fetch の差し替え）、候補実装は app.js の後（defer の順で実行される）
  let html = deckHtml.replace(/<head>/i, `<head><base href="${DECK_SRC}"><script src="${STUB_URL}"><\/script><script src="${STUB_CARDS_URL}"><\/script>`);
  if (inject) html = html.replace(/(<script defer src="app\.js"><\/script>)/, `$1<script defer src="${INJECT_URL}?v=${Date.now()}"><\/script>`);
  return html;
}

function size() { const [w, h] = state.vw.split("x").map(Number); return { w, h }; }

function layout() {
  const { w, h } = size();
  const z = Number(state.zoom);
  colCur.hidden = state.cmp !== "both";
  for (const k of ["cur", "new"]) {
    frames[k].style.width = `${w}px`;
    frames[k].style.height = `${h}px`;
    frames[k].style.transform = `scale(${z})`;
    boxes[k].style.width = `${Math.round(w * z)}px`;
    boxes[k].style.height = `${Math.round(h * z)}px`;
  }
}

async function load(k) {
  const f = frames[k];
  f.dataset.deck = state.deck;
  f.dataset.name = "normal";
  if (k === "new") ["link", "scope", "num", "reload", "switch", "chip", "icons"].forEach((x) => { f.dataset[x] = state[x]; });
  const loaded = new Promise((res) => f.addEventListener("load", res, { once: true }));
  f.srcdoc = await deckSource(k === "new");
  await loaded; // ⚠️ load を待たずに触ると前のドキュメントに当たる
  await waitReady(f, k === "new");
}

function waitReady(f, needMock, timeoutMs = 60000) {
  const t0 = Date.now();
  return new Promise((resolve) => {
    const tick = () => {
      const d = f.contentDocument;
      const ok = d && d.querySelector("#s-g-subtype .chip") && d.querySelector(".zone[data-zone=main] .gtile") && (!needMock || d.documentElement.dataset.mockReady === "1");
      if (ok || Date.now() - t0 > timeoutMs) { resolve(); return; }
      setTimeout(tick, 150);
    };
    tick();
  });
}

async function reloadAll(only) {
  layout();
  out.hidden = true;
  note.textContent = "読み込み中…（カードの取得に数秒かかります）";
  const ks = only ? [only] : (state.cmp === "both" ? ["cur", "new"] : ["new"]);
  await Promise.all(ks.map(load));
  layout();
  const m = frames.new.contentWindow && frames.new.contentWindow.__mockTabs;
  note.textContent = m ? `準備できました。保存キー: ${m.state().key}（復元したタブ ${m.state().tabs.length}件）` : "⚠️ 候補の注入に失敗しました（コンソールを確認）";
}

// ---------- 操作（変更後の枠へ。「現状と並べる」ときは同じ検索を左にも） ----------
function frameCtx(k) { const f = frames[k]; return f.contentDocument ? { d: f.contentDocument, w: f.contentWindow } : null; }
function targets() { return state.cmp === "both" ? ["new", "cur"] : ["new"]; }

function doSearch(d, name) {
  d.getElementById("s-name").value = name;
  d.getElementById("s-search").click();
}
const ACT = {
  fire: () => targets().forEach((k) => { const c = frameCtx(k); if (c) doSearch(c.d, "fire"); }),
  six: async () => {
    const words = ["fire", "water", "wind", "sword", "dragon", "fairy"];
    const c = frameCtx("new");
    if (!c) return;
    const before = c.w.__mockTabs ? c.w.__mockTabs.state() : null;
    for (const wd of words) { doSearch(c.d, wd); await new Promise((r) => setTimeout(r, 350)); }
    const after = c.w.__mockTabs ? c.w.__mockTabs.state() : null;
    note.textContent = before && after
      ? `⭐ 6回検索しました（${words.join(" → ")}）。前: [${before.tabs.map((t) => "検索" + t.n).join(", ")}] → 後: [${after.tabs.map((t) => "検索" + t.n).join(", ")}]（上限5・古いものから閉じる・連番は続く）`
      : "6回検索しました。";
  },
  worst: () => targets().forEach((k) => {
    const c = frameCtx(k);
    if (!c) return;
    const d = c.d;
    // ⭐ 条件の表示（Q4）の最悪ケース: 全グループに複数値・AND 混在・効果テキスト・フォーマット・エキスパンション
    const pick = (id, n) => [...d.querySelectorAll(`#${id} .chip input[type="checkbox"]`)].slice(0, n).map((i) => i.value);
    const g = (id) => d.getElementById(id);
    d.getElementById("s-name").value = "";
    d.getElementById("s-text").value = "";
    g("s-g-element").setValues(pick("s-g-element", 4));
    g("s-g-class").setValues(pick("s-g-class", 6));
    g("s-g-type").setValues(pick("s-g-type", 5));
    g("s-g-subtype").setValues(pick("s-g-subtype", 12));
    g("s-g-rarity").setValues(pick("s-g-rarity", 5));
    const fmt = d.getElementById("s-format"); if (fmt.options.length > 1) fmt.value = fmt.options[1].value;
    const set = d.getElementById("s-set"); if (set.options.length > 1) set.value = set.options[1].value;
    if (typeof c.w.updateFilterBadge === "function") c.w.updateFilterBadge(); // 左ペインの「選択中の条件」も描き直す
    d.getElementById("s-search").click();
  }),
  sort: () => targets().forEach((k) => {
    const c = frameCtx(k); if (!c) return;
    const s = c.d.getElementById("s-sort");
    s.value = "cost_memory";
    s.dispatchEvent(new Event("change", { bubbles: true }));
  }),
  deck: () => { const c = frameCtx("new"); if (c) c.d.getElementById("ed-tab-deck").click(); },
  measure: () => {
    const c = frameCtx("new");
    if (!c) return;
    const { d, w } = c;
    const r = (e) => { if (!e) return "-"; const b = e.getBoundingClientRect(); return `x=${Math.round(b.left)} y=${Math.round(b.top)} w=${Math.round(b.width)} h=${Math.round(b.height)}`; };
    const stabs = d.querySelector(".mk-stabs");
    const tabsEls = [...d.querySelectorAll(".mk-stab")];
    const visible = stabs ? tabsEls.filter((t) => { const a = t.getBoundingClientRect(), s = stabs.getBoundingClientRect(); return a.left >= s.left - 1 && a.right <= s.right + 1; }).length : 0;
    const m = w.__mockTabs ? w.__mockTabs.state() : null;
    out.hidden = false;
    out.textContent = [
      `画面 ${w.innerWidth}×${w.innerHeight} / scrollY=${Math.round(w.scrollY)}`,
      `タブ帯 .deck-tabs: ${r(d.querySelector("#view-editor .deck-tabs"))}`,
      `  🃏 デッキ: ${r(d.getElementById("ed-tab-deck"))} / 📊 統計: ${r(d.getElementById("ed-tab-stats"))}`,
      `  検索タブの領域: ${r(stabs)} / 中身の幅 ${stabs ? stabs.scrollWidth : 0}px / スクロール位置 ${stabs ? Math.round(stabs.scrollLeft) : 0}`,
      `  検索タブ ${tabsEls.length}個（領域に全部見えているのは ${visible}個）: ${tabsEls.map((t) => `${t.textContent.replace("×", "")}=${Math.round(t.getBoundingClientRect().width)}px`).join(" ")}`,
      `条件の箱 .mk-cond: ${r(d.querySelector("#ed-pane-search:not([hidden]) .mk-cond"))}`,
      `結果グリッド: ${r(d.querySelector("#ed-pane-search:not([hidden]) #result-grid"))} / タイル ${d.querySelectorAll("#result-grid .result").length}枚`,
      `結果モーダル #result-modal: ${d.getElementById("result-modal").hidden ? "閉（開かない）" : "⚠️ 開"} / body overflow="${d.body.style.overflow}"`,
      m ? `保存: key=${m.key} next=${m.next} active=${m.active} tabs=${JSON.stringify(m.tabs.map((t) => [t.n, t.qs]))}` : "",
    ].join("\n");
  },
  reload: () => reloadAll("new"),
  clear: () => { const c = frameCtx("new"); if (c && c.w.__mockTabs) c.w.__mockTabs.clearStore(); reloadAll("new"); },
};

document.querySelectorAll(".seg[data-g]").forEach((seg) => {
  seg.addEventListener("click", (ev) => {
    const b = ev.target.closest("button"); if (!b) return;
    seg.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
    const g = seg.dataset.g;
    state[g] = b.dataset.v;
    if (g === "zoom") { layout(); return; }
    if (["link", "scope", "num", "reload", "switch", "chip", "icons"].includes(g)) { reloadAll("new"); return; }
    reloadAll();
  });
});
document.querySelectorAll("button[data-act]").forEach((b) => b.addEventListener("click", () => ACT[b.dataset.act]()));

reloadAll();
