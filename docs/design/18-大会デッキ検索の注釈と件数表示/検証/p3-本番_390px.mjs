// P3: 本番URLをスマホ390pxで確認(実機の代替・設計担当が実施)
// 実行: リポジトリルートで node "docs/design/18-大会デッキ検索の注釈と件数表示/検証/p3-本番_390px.mjs"
// (playwright は作業ディレクトリの node_modules を使うためルートから実行すること)
import { chromium } from "playwright";
const BASE = "https://ga-card-tools-jp.pages.dev";
const browser = await chromium.launch({ args: ["--ignore-certificate-errors"] });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  ignoreHTTPSErrors: true,
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 3,
});
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
p.on("requestfailed", (r) => errs.push("REQFAIL " + r.url()));

await p.goto(BASE + "/tournaments/", { waitUntil: "networkidle" });
const s = await p.evaluate(() => {
  const about = document.getElementById("about-box");
  const hits = document.getElementById("f-hits");
  return {
    aboutOpen: about.open,
    summaryText: about.querySelector("summary").textContent,
    filterBoxOpen: document.getElementById("filter-box").open,
    hitsText: hits.textContent,
    hitsVisible: hits.checkVisibility(),
    // アドレスバー等を除いた実可視領域(844px)の中に件数と表が入っているか
    hitsTop: Math.round(hits.getBoundingClientRect().top),
    tableTop: Math.round(document.querySelector(".cp-scroll").getBoundingClientRect().top),
    firstRowText: document.querySelector("#ev-table tbody tr .ev-name")?.textContent.trim().slice(0, 24),
    firstRowBottom: Math.round(document.querySelector("#ev-table tbody tr").getBoundingClientRect().bottom),
    overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  };
});
console.log("[一覧・初期表示]", JSON.stringify(s, null, 1));

// タップ操作(実機と同じ touch で開く)
await p.locator("#about-box > summary").tap();
await p.waitForTimeout(300);
const t = await p.evaluate(() => ({
  open: document.getElementById("about-box").open,
  subVisible: document.querySelector("#about-box .sub").checkVisibility(),
}));
console.log("[注釈をタップ]", JSON.stringify(t));
await p.screenshot({ path: "docs/design/18-大会デッキ検索の注釈と件数表示/検証/P3本番_一覧_390px.png" });

// 絞り込み中(URL復元)
const p2 = await ctx.newPage();
await p2.goto(BASE + "/tournaments/?country=JP", { waitUntil: "networkidle" });
const s2 = await p2.evaluate(() => ({
  hits: document.getElementById("f-hits").textContent,
  hitsVisible: document.getElementById("f-hits").checkVisibility(),
  filterBoxOpen: document.getElementById("filter-box").open,
  rows: Array.from(document.querySelectorAll("#ev-table tbody tr")).filter((r) => r.dataset.href && !r.hidden).length,
}));
console.log("[?country=JP]", JSON.stringify(s2));

// 詳細ページ
const p3 = await ctx.newPage();
await p3.goto(BASE + "/tournaments/50047/", { waitUntil: "networkidle" });
const s3 = await p3.evaluate(() => {
  const wrap = document.getElementById("standings-wrap");
  const muted = Array.from(document.querySelectorAll(".cp-muted"));
  const above = muted.filter((m) => m.compareDocumentPosition(wrap) === Node.DOCUMENT_POSITION_FOLLOWING);
  return {
    aboveCount: above.length,
    aboveText: above.map((m) => m.textContent.trim()),
    aboveHeight: above.length ? Math.round(above[0].getBoundingClientRect().height) : null,
    standingsTop: Math.round(wrap.getBoundingClientRect().top + scrollY),
    disclaimerBelow: muted.some((m) => wrap.compareDocumentPosition(m) === Node.DOCUMENT_POSITION_FOLLOWING && m.textContent.includes("当時のフォーマット")),
  };
});
console.log("[詳細 50047]", JSON.stringify(s3, null, 1));
await p3.screenshot({ path: "docs/design/18-大会デッキ検索の注釈と件数表示/検証/P3本番_詳細_390px.png" });

console.log("[エラー]", errs.length ? errs : "なし");
await browser.close();
