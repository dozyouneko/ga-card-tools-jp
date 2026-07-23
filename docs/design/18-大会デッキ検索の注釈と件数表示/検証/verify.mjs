// issue#18 検証: 大会デッキ検索の注釈削減と件数表示
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const BASE = "http://localhost:3000";
const LIST = BASE + "/tournaments/";
const DETAIL = BASE + "/tournaments/50047/";
const results = [];
function ok(n, title, cond, note = "") {
  results.push({ n, title, pass: !!cond, note });
  console.log(`${cond ? "PASS" : "FAIL"} [${n}] ${title}${note ? " — " + note : ""}`);
}

const browser = await chromium.launch({ args: ["--ignore-certificate-errors"] });
const mobile = { viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true };
const desktop = { viewport: { width: 1280, height: 900 }, ignoreHTTPSErrors: true };

async function page(opts, url) {
  const ctx = await browser.newContext(opts);
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(url, { waitUntil: "networkidle" });
  await p.waitForTimeout(500);
  p.__errs = errs;
  return p;
}

// ---- 1 / 3 / 5 / 6 / 8 / 10: スマホ幅の一覧 ----
const m = await page(mobile, LIST);
const s1 = await m.evaluate(() => {
  const about = document.getElementById("about-box");
  const sum = about.querySelector("summary");
  const hits = document.getElementById("f-hits");
  return {
    aboutOpen: about.open,
    summaryVisible: sum.checkVisibility(),
    summaryText: sum.textContent,
    closedHeight: Math.round(about.getBoundingClientRect().height),
    subVisible: about.querySelector(".sub").checkVisibility(),
    tableTop: Math.round(document.querySelector(".cp-scroll").getBoundingClientRect().top + scrollY),
    hitsVisible: hits.checkVisibility(),
    hitsText: hits.textContent,
    hitsRole: hits.getAttribute("role"),
    hitsInFilterBox: !!hits.closest("#filter-box"),
    hitsBeforeTable: hits.compareDocumentPosition(document.querySelector(".cp-scroll")) === Node.DOCUMENT_POSITION_FOLLOWING,
    bodyHasOld: /収録\s*420\s*大会/.test(document.body.innerText),
    filterBoxOpen: document.getElementById("filter-box").open,
  };
});
ok(1, "注釈がスマホで折りたたまれる（閉=25px前後・タップで開く）",
  s1.aboutOpen === false && s1.summaryVisible === true && s1.summaryText === "ℹ️ このページについて" &&
  s1.closedHeight <= 30 && s1.subVisible === false, JSON.stringify(s1));
await m.locator("#about-box > summary").click();
await m.waitForTimeout(300);
const s1b = await m.evaluate(() => ({
  open: document.getElementById("about-box").open,
  subVisible: document.querySelector("#about-box .sub").checkVisibility(),
  text: document.querySelector("#about-box .sub").textContent.slice(0, 24),
}));
ok(1, "タップで全文が開く", s1b.open && s1b.subVisible && s1b.text.startsWith("主要大会"), JSON.stringify(s1b));
ok(3, "表の上端が上がる（355px → 実測値）", s1.tableTop < 355, `355px → ${s1.tableTop}px（差 -${355 - s1.tableTop}px）`);
ok(5, "件数が絞り込み枠の外・表の直上にあり、枠を閉じても見える",
  s1.hitsInFilterBox === false && s1.hitsBeforeTable === true && s1.filterBoxOpen === false && s1.hitsVisible === true,
  JSON.stringify({ inBox: s1.hitsInFilterBox, beforeTable: s1.hitsBeforeTable, filterBoxOpen: s1.filterBoxOpen, visible: s1.hitsVisible }));
ok(6, "絞り込みなしで『全 420 件』", s1.hitsText === "全 420 件", `"${s1.hitsText}"`);
ok(8, "画面に『収録 420 大会』が残っていない", s1.bodyHasOld === false, `bodyHasOld=${s1.bodyHasOld}`);
ok(10, 'role="status" が残っている', s1.hitsRole === "status", `role=${s1.hitsRole}`);

// ---- 7 / 11: 絞り込み中の件数（URL復元経由）----
const m2 = await page(mobile, LIST + "?country=JP");
const s7 = await m2.evaluate(() => ({
  hits: document.getElementById("f-hits").textContent,
  hitsVisible: document.getElementById("f-hits").checkVisibility(),
  visibleRows: Array.from(document.querySelectorAll("#ev-table tbody tr"))
    .filter((r) => r.dataset.href && !r.hidden).length,
  countBadge: document.getElementById("f-count").textContent,
  filterBoxOpen: document.getElementById("filter-box").open,
  emptyHidden: document.getElementById("ev-empty").hidden,
}));
ok(7, "開催国=日本で『検索結果：8件』・表示行数と一致",
  s7.hits === "検索結果：8件" && s7.visibleRows === 8, JSON.stringify(s7));
ok(11, "?country=JP で開いた直後から件数が出ている（#14のURL復元と整合）",
  s7.hits === "検索結果：8件" && s7.hitsVisible === true && s7.countBadge === "1", JSON.stringify(s7));

// ---- 9: 0件 ----
const m3 = await page(mobile, LIST + "?q=" + encodeURIComponent("zzzz該当なしzzzz"));
const s9 = await m3.evaluate(() => {
  const e = document.getElementById("ev-empty");
  return {
    hits: document.getElementById("f-hits").textContent,
    hitsVisible: document.getElementById("f-hits").checkVisibility(),
    emptyVisible: e.checkVisibility(),
    emptyText: e.textContent,
    filterBoxOpen: document.getElementById("filter-box").open,
    visibleRows: Array.from(document.querySelectorAll("#ev-table tbody tr")).filter((r) => r.dataset.href && !r.hidden).length,
  };
});
ok(9, "0件で『検索結果：0件』と案内文が出る（絞り込みを閉じていても見える）",
  s9.hits === "検索結果：0件" && s9.emptyVisible === true && s9.hitsVisible === true &&
  s9.emptyText === "該当する大会がありません。条件を変えてお試しください。" &&
  s9.filterBoxOpen === false && s9.visibleRows === 0, JSON.stringify(s9));
// 絞り込みを解除すると案内が消えること
await m3.evaluate(() => { document.getElementById("f-reset").click(); });
await m3.waitForTimeout(300);
const s9b = await m3.evaluate(() => ({
  emptyHidden: document.getElementById("ev-empty").hidden,
  hits: document.getElementById("f-hits").textContent,
}));
ok(9, "リセットで案内が消え『全 420 件』に戻る", s9b.emptyHidden === true && s9b.hits === "全 420 件", JSON.stringify(s9b));

// ---- 2 / 17: PC幅 ----
const d = await page(desktop, LIST);
const s2 = await d.evaluate(() => {
  const about = document.getElementById("about-box");
  const sum = about.querySelector("summary");
  const hits = document.getElementById("f-hits");
  const sub = about.querySelector(".sub");
  return {
    aboutOpen: about.open,
    summaryDisplay: getComputedStyle(sum).display,
    summaryVisible: sum.checkVisibility(),
    subVisible: sub.checkVisibility(),
    subHeight: Math.round(sub.getBoundingClientRect().height),
    subLines: Math.round(sub.getBoundingClientRect().height / parseFloat(getComputedStyle(sub).lineHeight)),
    filterBoxOpen: document.getElementById("filter-box").open,
    hitsVisible: hits.checkVisibility(),
    hitsText: hits.textContent,
    hitsTop: Math.round(hits.getBoundingClientRect().top + scrollY),
    tableTop: Math.round(document.querySelector(".cp-scroll").getBoundingClientRect().top + scrollY),
    overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    rowsVisible: Array.from(document.querySelectorAll("#ev-table tbody tr")).filter((r) => r.dataset.href && !r.hidden).length,
  };
});
ok(2, "PC幅では注釈が1行のテキストとして常時表示（トグルの見出しは出ない）",
  s2.aboutOpen === true && s2.summaryDisplay === "none" && s2.summaryVisible === false &&
  s2.subVisible === true && s2.subLines === 1, JSON.stringify(s2));
ok(17, "PC幅の回帰（絞り込み枠は開いたまま・件数は表の直上・横スクロールなし・420行）",
  s2.filterBoxOpen === true && s2.hitsVisible === true && s2.hitsText === "全 420 件" &&
  s2.hitsTop < s2.tableTop && s2.overflowX === false && s2.rowsVisible === 420 && d.__errs.length === 0,
  JSON.stringify({ ...s2, pageerrors: d.__errs.length }));

// ---- 4: JS無効時 ----
const nojs = await browser.newContext({ ...mobile, javaScriptEnabled: false });
const nj = await nojs.newPage();
await nj.goto(LIST, { waitUntil: "domcontentloaded" });
await nj.waitForTimeout(300);
const s4 = await nj.evaluate(() => ({
  aboutOpen: document.getElementById("about-box").open,
  subVisible: document.querySelector("#about-box .sub").checkVisibility(),
  subText: document.querySelector("#about-box .sub").textContent.slice(0, 20),
  emptyHidden: document.getElementById("ev-empty").hidden,
  rows: Array.from(document.querySelectorAll("#ev-table tbody tr")).filter((r) => r.dataset.href && !r.hidden).length,
  hitsText: document.getElementById("f-hits").textContent,
  hitsVisible: document.getElementById("f-hits").checkVisibility(),
}));
ok(4, "JS無効でも注釈は開いたまま読め、表も出る",
  s4.aboutOpen === true && s4.subVisible === true && s4.subText.startsWith("主要大会") &&
  s4.emptyHidden === true && s4.rows === 420, JSON.stringify(s4));
ok("4b", "JS無効でも件数が読める（#f-hits の初期値）",
  s4.hitsText === "全 420 件" && s4.hitsVisible === true, `"${s4.hitsText}" visible=${s4.hitsVisible}`);
// HTMLの静的な中身にも総件数が入っていること（JS実行前・クローラ向け）
const listHtml = readFileSync("/workspaces/claude-test-vsc/tournaments/index.html", "utf8");
ok("4b", "生成HTMLの本文に総件数が含まれる（JS実行前・ちらつき防止）",
  /<p class="filter-hits" id="f-hits" role="status">全 420 件<\/p>/.test(listHtml),
  (listHtml.match(/<p class="filter-hits"[^>]*>[^<]*<\/p>/) || ["(見つからない)"])[0]);

// ---- 12 / 13: 大会詳細ページ ----
const dt = await page(mobile, DETAIL);
const s12 = await dt.evaluate(() => {
  const muted = Array.from(document.querySelectorAll(".cp-muted"));
  const top = muted.find((p) => p.compareDocumentPosition(document.getElementById("standings-wrap")) === Node.DOCUMENT_POSITION_FOLLOWING);
  const wrap = document.getElementById("standings-wrap");
  const below = muted.filter((p) => wrap.compareDocumentPosition(p) === Node.DOCUMENT_POSITION_FOLLOWING);
  return {
    topText: top ? top.textContent.trim() : null,
    topHeight: top ? Math.round(top.getBoundingClientRect().height) : null,
    topCount: muted.filter((p) => p.compareDocumentPosition(wrap) === Node.DOCUMENT_POSITION_FOLLOWING).length,
    standingsTop: Math.round(wrap.getBoundingClientRect().top + scrollY),
    belowTexts: below.map((p) => p.textContent.trim().slice(0, 22)),
    disclaimerBelow: below.some((p) => p.textContent.includes("当時のフォーマットで提出されたリストのため、現行ルールでの使用可否は判定していません")),
    disclaimerAbove: top ? top.textContent.includes("当時のフォーマット") : null,
  };
});
ok(12, "詳細ページ上部の注釈が1文だけになり順位表が上がる",
  s12.topText === "カードをクリックすると日本語の詳細が開きます。" && s12.topCount === 1 &&
  s12.topHeight <= 30 && s12.standingsTop < 587,
  JSON.stringify({ topText: s12.topText, topHeight: `94px → ${s12.topHeight}px`, standingsTop: `587px → ${s12.standingsTop}px`, topCount: s12.topCount }));
ok(13, "免責文が表の下の注釈群に移って残っている",
  s12.disclaimerBelow === true && s12.disclaimerAbove === false, JSON.stringify({ below: s12.belowTexts, disclaimerBelow: s12.disclaimerBelow }));

// ---- 16: CSP（style属性・インラインstyleを使っていない）----
const s16 = await d.evaluate(() => ({
  styleAttrs: document.querySelectorAll("[style]").length,
  inlineStyleTags: document.querySelectorAll("style").length,
}));
const s16d = await dt.evaluate(() => ({
  styleAttrs: document.querySelectorAll("[style]").length,
  inlineStyleTags: document.querySelectorAll("style").length,
}));
ok(16, "style属性・インライン<style>を使っていない（一覧・詳細とも）",
  s16.styleAttrs === 0 && s16.inlineStyleTags === 0 && s16d.styleAttrs === 0 && s16d.inlineStyleTags === 0,
  `一覧=${JSON.stringify(s16)} 詳細=${JSON.stringify(s16d)}`);

// ---- 14: カテゴリ名の残存（生成ファイルを直接数える）----
const html = readFileSync("/workspaces/claude-test-vsc/tournaments/index.html", "utf8");
const cnt = (s) => (html.match(new RegExp(s, "g")) || []).length;
const s14 = { "Store Championship": cnt("Store Championship"), Regionals: cnt("Regionals"), Nationals: cnt("Nationals"), Ascent: cnt("Ascent") };
ok(14, "カテゴリ名が従来どおり多数出現（SEO面の後退なし）",
  s14["Store Championship"] > 1000 && s14.Regionals > 200 && s14.Nationals > 15 && s14.Ascent > 5, JSON.stringify(s14));

await browser.close();
console.log("\n==== まとめ ====");
const failed = results.filter((r) => !r.pass);
console.log(`${results.length - failed.length}/${results.length} PASS`);
failed.forEach((f) => console.log(`  FAIL [${f.n}] ${f.title} — ${f.note}`));
process.exit(failed.length ? 1 : 0);
