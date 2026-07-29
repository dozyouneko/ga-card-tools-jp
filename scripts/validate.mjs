// 使い方: node scripts/validate.mjs [file ...]
//   例:  node scripts/validate.mjs            # data/tl/*.js 全ファイル
//        node scripts/validate.mjs data/tl/ftc.js
//
// 各翻訳ファイルの構造チェック（旧 PowerShell 検証の Node 版）:
//   - 波括弧 {} / 全角括弧 （） のバランス一致
//   - エントリ数（"slug": の数）
//   - emptyEffect（effect: "" ＝バニラカード。数の報告のみ、エラー扱いにはしない）
//   - 韓国語混入（0 でなければ NG）
//   - BOM（先頭 U+FEFF があれば NG）
// さらに全ファイルを vm 評価して構文エラーが無いか（＝ブラウザで読めるか）を確認し、
// data/tl-*.json（ブラウザが読む生成物）が data/tl/*.js と一致しているかを検査する（#22 フェーズ2）。
// 加えて index.html のマーカー間の /sets/ リンクが cards/index.html と一致するかを検査する（#37）。
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadI18n } from "./lib/load-i18n.mjs";
import { buildTlJson, serialize, NAMES_FILE, EFFECTS_FILE } from "./gen-tl-json.mjs";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

const args = process.argv.slice(2);
const tlDir = path.join(root, "data", "tl");
const files =
  args.length > 0
    ? args.map((a) => path.resolve(root, a))
    : readdirSync(tlDir)
        .filter((f) => f.endsWith(".js"))
        .sort()
        .map((f) => path.join(tlDir, f));

const count = (s, re) => (s.match(re) || []).length;
let problems = 0;

console.log(
  "file".padEnd(18),
  "braces",
  "fparens",
  "entries",
  "empty",
  "korean",
  "BOM"
);
for (const f of files) {
  const t = readFileSync(f, "utf8");
  const bo = count(t, /\{/g);
  const bc = count(t, /\}/g);
  const pl = count(t, /（/g);
  const pr = count(t, /）/g);
  const entries = count(t, /^\s{2}"[a-z0-9-]+":/gm);
  const empty = count(t, /effect:\s*""/g);
  const korean = count(t, /[가-힣]/g);
  const bom = t.charCodeAt(0) === 0xfeff;

  const bad = bo !== bc || pl !== pr || korean > 0 || bom;
  if (bad) problems++;

  console.log(
    path.basename(f).padEnd(18),
    `${bo}/${bc}`.padEnd(6),
    `${pl}/${pr}`.padEnd(7),
    String(entries).padEnd(7),
    String(empty).padEnd(5),
    String(korean).padEnd(6),
    bom ? "YES" : "no",
    bad ? "  <-- NG" : ""
  );
}

// 構文（ブラウザ読み込み相当）チェック
let loaded = null;
try {
  const { i18n } = loadI18n(root);
  loaded = i18n;
  console.log(`\nloaded OK — total cards: ${Object.keys(i18n.cards).length}`);
} catch (e) {
  problems++;
  console.error(`\nLOAD ERROR: ${e.message}`);
}

// 生成物の陳腐化チェック（#22 フェーズ2）
// ブラウザは data/tl/*.js ではなく data/tl-*.json を読むため、訳を追記して再生成を忘れると
// 新しい訳が本番に出ない。ここで落として node scripts/gen-tl-json.mjs を促す。
if (loaded) {
  const { names, effects } = buildTlJson(loaded.cards || {});
  const expected = [[NAMES_FILE, names], [EFFECTS_FILE, effects]];
  const stale = [];
  for (const [rel, obj] of expected) {
    let actual = null;
    try {
      actual = readFileSync(path.join(root, rel), "utf8");
    } catch {
      stale.push(`${rel} がありません`);
      continue;
    }
    if (actual !== serialize(obj)) stale.push(`${rel} が data/tl/*.js と一致しません`);
  }
  if (stale.length) {
    problems++;
    console.error(`\nSTALE GENERATED JSON:`);
    stale.forEach((m) => console.error(`  - ${m}`));
    console.error(`  → node scripts/gen-tl-json.mjs を実行して生成し直し、コミットしてください`);
  } else {
    console.log(`generated JSON up to date — ${NAMES_FILE} / ${EFFECTS_FILE}`);
  }
}

// トップの静的セットリンクの陳腐化チェック（#37）
// ⚠️ マーカー方式は「失敗が差分に出ない形」で壊れうる:
//   - マーカーが消えている → 何も差し込まれないまま index.html は正常なHTMLとして出続ける
//   - 生成側の不具合でリンク0本になっても、HTMLとしては妥当なのでビルドは通る
// index.html と cards/index.html は同じ groups 配列から生成されるため、/sets/ リンクの集合は
// 完全一致するはずである。一致しなければ「マーカーが空」「index.html の再生成忘れ（＝新セットが
// 載っていない）」「生成ロジックの不具合」のいずれかが起きている。
{
  const setLinks = (html) => new Set([...html.matchAll(/href="(\/sets\/[^"]+\/)"/g)].map((m) => m[1]));
  const bad = [];
  try {
    const top = readFileSync(path.join(root, "index.html"), "utf8");
    const marked = top.match(/<!-- SETLINKS:START[^>]*-->([\s\S]*?)<!-- SETLINKS:END -->/);
    if (!marked) {
      bad.push("index.html に SETLINKS:START / SETLINKS:END のマーカーがありません");
    } else {
      const actual = setLinks(marked[1]);
      const expected = setLinks(readFileSync(path.join(root, "cards", "index.html"), "utf8"));
      const missing = [...expected].filter((u) => !actual.has(u));
      const extra = [...actual].filter((u) => !expected.has(u));
      if (missing.length || extra.length) {
        bad.push(`マーカー間の /sets/ リンクが cards/index.html と一致しません（トップ${actual.size}本 / 索引${expected.size}本）`);
        if (missing.length) bad.push(`  トップに無い: ${missing.slice(0, 5).join(" ")}${missing.length > 5 ? ` …他${missing.length - 5}件` : ""}`);
        if (extra.length) bad.push(`  トップにだけある: ${extra.slice(0, 5).join(" ")}${extra.length > 5 ? ` …他${extra.length - 5}件` : ""}`);
      } else {
        console.log(`top set links up to date — index.html に /sets/ リンク ${actual.size}本`);
      }
    }
  } catch (e) {
    bad.push(`読み込みに失敗: ${e.message}`);
  }
  if (bad.length) {
    problems++;
    console.error(`\nSTALE TOP SET LINKS:`);
    bad.forEach((m) => console.error(`  - ${m}`));
    console.error(`  → node scripts/build-card-pages.mjs を実行して生成し直し、コミットしてください`);
  }
}

if (problems > 0) {
  console.error(`\n${problems} problem(s) found.`);
  process.exit(1);
}
console.log("\nall checks passed.");
