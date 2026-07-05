// 使い方: node scripts/scaffold.mjs <prefix> [outFile]
//   例:  node scripts/scaffold.mjs FTC ftc
//        npm run scaffold -- "AMB Alter" ambalter
//
// 指定 prefix のカードを公式APIから取得し、既訳（data/tl/*.js + translations.js）と
// 突き合わせ、未翻訳カードの一覧を scratch_ref_<outFile> に書き出す。
// 旧 scaffold.ps1 と同じ出力フォーマット・同じ判定ロジックの Node 版。
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadI18n } from "./lib/load-i18n.mjs";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

const [prefix, outArg] = process.argv.slice(2);
if (!prefix) {
  console.error("usage: node scripts/scaffold.mjs <prefix> [outFile]");
  process.exit(2);
}
// outFile 省略時は prefix から生成（英数字のみ小文字化）
const outFile = outArg || prefix.toLowerCase().replace(/[^a-z0-9]+/g, "");

const { i18n } = loadI18n(root);
const translated = new Set(Object.keys(i18n.cards));
console.log(`translated slugs: ${translated.size}`);

// ページネーションで全件取得
const cards = new Map();
let page = 1;
for (;;) {
  const url = `https://api.gatcg.com/cards/search?prefix=${encodeURIComponent(
    prefix
  )}&page=${page}&page_size=50`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`fetch failed: ${res.status} ${res.statusText} (page ${page})`);
    process.exit(1);
  }
  const json = await res.json();
  for (const c of json.data || []) cards.set(c.slug, c);
  if (!json.has_more) break;
  page++;
}
console.log(`fetched: ${cards.size}`);

const untranslated = [...cards.values()]
  .filter((c) => !translated.has(c.slug))
  .sort((a, b) => a.slug.localeCompare(b.slug));
console.log(`untranslated: ${untranslated.length}`);

let out = "";
for (const c of untranslated) {
  const en = String(c.effect || "").replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
  const types = (c.types || []).join("/");
  const elements = (c.elements || []).join("/");
  out += `  // [${c.slug}] ${c.name} | ${types} | ${elements} | lv${c.level ?? ""}\n`;
  out += `  //   EN: ${en}\n`;
}
writeFileSync(path.join(root, "scratch_ref_" + outFile), out); // UTF-8 no BOM
console.log("DONE");
