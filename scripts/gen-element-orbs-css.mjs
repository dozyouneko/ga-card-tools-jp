// 属性玉(#15)のCSSを生成する。
//   node scripts/gen-element-orbs-css.mjs
//
// scripts/lib/element-orbs.json(コミット済み)を読み、shared/css/element-orbs.css を書き出す。
// 画像取得もsharpも使わないため、gen-element-orbs.mjs と違いオフラインで実行できる。
// 出力CSSもコミットする(サイト側はこのCSSを <link> するだけ)。
// 属性玉そのものを作り直したいときは先に scripts/gen-element-orbs.mjs を実行すること。
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "scripts", "lib", "element-orbs.json");
const OUT = path.join(ROOT, "shared", "css", "element-orbs.css");

const { generatedAt, size, orbs } = JSON.parse(readFileSync(SRC, "utf8"));

const rules = Object.entries(orbs)
  .map(([el, o]) => `.orb-${el.toLowerCase()} { background-image: url("data:image/webp;base64,${o.b64}"); }`)
  .join("\n");

const css = `/* 属性玉アイコン(${size}px WebP・data URI)。
   自動生成: node scripts/gen-element-orbs-css.mjs — 直接編集しないこと。
   元データ: scripts/lib/element-orbs.json (${generatedAt} 生成) */
.orb {
  display: inline-block;
  width: 18px; height: 18px;
  border-radius: 50%;
  background-size: cover;
  box-shadow: 0 0 0 1px rgba(0,0,0,.55);
  flex: 0 0 auto;
}
${rules}
`;

writeFileSync(OUT, css);
process.stderr.write(`書き出し: ${path.relative(ROOT, OUT)}（${Object.keys(orbs).length}属性 / ${(css.length / 1024).toFixed(1)}KB）\n`);
