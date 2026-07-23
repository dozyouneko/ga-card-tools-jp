// #18: 変更前後で同じ指標を測る(スマホ390px)
import { chromium } from "playwright";
const label = process.argv[2] || "?";
const b = await chromium.launch({ args: ["--ignore-certificate-errors"] });
const ctx = await b.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 } });

const p = await ctx.newPage();
await p.goto("http://localhost:3000/tournaments/", { waitUntil: "networkidle" });
await p.waitForTimeout(600);
const list = await p.evaluate(() => {
  const top = (sel) => { const e = document.querySelector(sel); return e ? Math.round(e.getBoundingClientRect().top + scrollY) : null; };
  const h = (sel) => { const e = document.querySelector(sel); return e ? Math.round(e.getBoundingClientRect().height) : null; };
  const about = document.querySelector(".about") || document.querySelector("p.sub");
  return {
    表の上端: top(".cp-scroll"),
    注釈の高さ: about ? Math.round(about.getBoundingClientRect().height) : null,
    注釈の占有: about ? Math.round(about.getBoundingClientRect().height) + 18 : null,
    件数の可視: document.getElementById("f-hits") ? document.getElementById("f-hits").checkVisibility() : null,
    件数文言: document.getElementById("f-hits") ? document.getElementById("f-hits").textContent : null,
    絞り込み枠高さ: h(".filter-box"),
  };
});

const d = await ctx.newPage();
await d.goto("http://localhost:3000/tournaments/50047/", { waitUntil: "networkidle" });
await d.waitForTimeout(600);
const detail = await d.evaluate(() => {
  const first = document.querySelector("h2 + .cp-muted, h2 ~ .cp-muted");
  const wrap = document.getElementById("standings-wrap");
  return {
    上部注釈の高さ: first ? Math.round(first.getBoundingClientRect().height) : null,
    上部注釈の文字数: first ? first.textContent.trim().length : null,
    順位表の上端: wrap ? Math.round(wrap.getBoundingClientRect().top + scrollY) : null,
  };
});
console.log(label, JSON.stringify({ list, detail }, null, 1));
await b.close();
