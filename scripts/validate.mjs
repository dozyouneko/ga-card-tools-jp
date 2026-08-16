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
// さらに meta.sets（エキスパンション絞り込みの選択肢）が全セットを覆っているかを検査する（#40）。
// 加えて cronワークフローの git add 対象と README.md / CLAUDE.md の列挙が一致するかを検査する（#70）。
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

// エキスパンション絞り込みの網羅性チェック（#40）
// セットページ・sitemap・トップの静的リンクは API の editions 由来で日次cronが自動更新するが、
// エキスパンション絞り込み（#f-set）の選択肢は data/translations.js の meta.sets を手で書く。
// 更新の号令が無いため「ページはあるのに絞り込めない」状態が静かに続きうる（SP4 で約1か月）。
// cards/index.html の /sets/<slug>/ リンク（＝APIに実在するセット）を正として、meta.sets の
// prefixes を slug 化した集合が覆っているかを検査する。
if (loaded) {
  // build-card-pages.mjs の setSlug と同一規則。独自に厳しくすると（例 ReC-BRV → rec-brv の
  // ハイフンまで潰すと）一致しなくなり検査が嘘をつく。
  const setSlug = (prefix) => prefix.toLowerCase().replace(/\s+/g, "-");
  const bad = [];
  try {
    const index = readFileSync(path.join(root, "cards", "index.html"), "utf8");
    const actual = new Set([...index.matchAll(/href="\/sets\/([^"/]+)\/"/g)].map((m) => m[1]));
    const registered = new Set();
    ((loaded.meta && loaded.meta.sets) || []).forEach((s) =>
      (s.prefixes || []).forEach((p) => registered.add(setSlug(p)))
    );
    const missing = [...actual].filter((s) => !registered.has(s));
    if (missing.length) {
      bad.push(`セットページはあるが data/translations.js の meta.sets に無い: ${missing.join(" ")}`);
    } else {
      console.log(`meta.sets covers all sets — ${actual.size}件`);
    }
  } catch (e) {
    bad.push(`読み込みに失敗: ${e.message}`);
  }
  if (bad.length) {
    problems++;
    console.error(`\nUNREGISTERED SETS (meta.sets):`);
    bad.forEach((m) => console.error(`  - ${m}`));
    console.error(`  → data/translations.js の meta.sets に { label: "…（PREFIX）", prefixes: ["PREFIX"] } を`);
    console.error(`    発売日の新しい順の位置へ追記し、npm run build:cards を実行してコミットしてください`);
  }
}

// メタ索引の並び替えキーの内部整合チェック（#43）
// この索引は日次cronが毎日再生成するため、生成スクリプトのデグレで中身だけ壊れても
// 「jobは緑・差分も出る（＝正常に見える）」経路ができる。JPモードの並び替えが常に0件になったり、
// レアリティ順だけ静かに間違ったりする形で現れるので、ここで人を止める。
// ⚠ 生成スクリプトを呼んで結果を突き合わせない（両辺が同源になり常に通る）。
//    索引ファイルだけを読んで、それ自身の内部整合を見る。
{
  const bad = [];
  try {
    const idx = JSON.parse(readFileSync(path.join(root, "data", "card-meta-index.json"), "utf8"));
    const entries = Object.entries(idx.m || {});
    const NUM_FIELDS = ["level", "power", "life", "cost_memory"];
    const nonNull = [0, 0, 0, 0];
    let shortEntry = 0;
    let rarityMismatch = 0;
    let numsLen = 0;
    let badRarity = 0;
    let flipCount = 0;
    for (const [slug, e] of entries) {
      if (!Array.isArray(e) || e.length < 8) { shortEntry++; continue; }
      if (!Array.isArray(e[6]) || e[6].length !== 4) numsLen++;
      else e[6].forEach((v, i) => { if (v != null) nonNull[i]++; });
      // entry[7] は entry[4]（setPrefix）と同じ並びでなければ、レアリティ順が別のセットの値で並ぶ
      if (!Array.isArray(e[7]) || e[7].length !== (e[4] || []).length) rarityMismatch++;
      else if (e[7].some((v) => v != null && !(Number.isInteger(v) && v >= 1 && v <= 9))) badRarity++;
      if (rarityMismatch === 1 && bad.length === 0) bad.push(`entry[7] の要素数が entry[4] と一致しません（例: ${slug}）`);
    }
    if (shortEntry) bad.push(`8要素になっていないエントリが ${shortEntry}件（旧形式のまま？）`);
    if (numsLen) bad.push(`entry[6] が4要素でないエントリが ${numsLen}件`);
    if (rarityMismatch) bad.push(`entry[7] と entry[4] の要素数が違うエントリが ${rarityMismatch}件`);
    if (badRarity) bad.push(`entry[7] に 1〜9 以外の値を持つエントリが ${badRarity}件`);
    // 件数の固定値は新セットで動くので使わない。「全滅」だけを見る（生成デグレの現実的な形）
    NUM_FIELDS.forEach((f, i) => {
      if (nonNull[i] === 0) bad.push(`${f} を持つカードが索引に1件もありません（生成デグレの疑い）`);
    });
    // フリップ面の対応表（#45）。これが壊れると「全N件」が行数と合わない状態に戻る
    const f = idx.f;
    if (!f || typeof f !== "object" || Array.isArray(f)) {
      bad.push("f（フリップ面の対応表）がありません（旧形式のまま？）");
    } else {
      const keys = Object.keys(f);
      const self = keys.filter((k) => f[k] === k);
      // ⚠ foldFlip は1回しか引かないので、連鎖があると畳み残る
      const chain = keys.filter((k) => f[f[k]] !== undefined);
      const notInM = keys.filter((k) => !idx.m[k]);
      const frontNotInM = keys.filter((k) => !idx.m[f[k]]);
      if (self.length) bad.push(`f が自分自身を指すエントリが ${self.length}件（例: ${self[0]}）`);
      if (chain.length) bad.push(`f に連鎖があります（1回の置換で収束しません・例: ${chain[0]} → ${f[chain[0]]} → ${f[f[chain[0]]]}）`);
      if (notInM.length) bad.push(`f のキーが m にありません: ${notInM.length}件（例: ${notInM[0]}）`);
      if (frontNotInM.length) bad.push(`f の指す表面slugが m にありません: ${frontNotInM.length}件（例: ${frontNotInM[0]}）`);
      // 件数は固定値で照合しない（フリップ面カードは増減する）。「全滅」だけを見る
      if (keys.length === 0) bad.push("f が空です（生成デグレの疑い。フリップ面は実測22件）");
      if (!bad.length) flipCount = keys.length;
    }
    if (!bad.length) {
      console.log(`card-meta-index sort keys OK — ${entries.length}slug / ${NUM_FIELDS.map((f2, i) => `${f2} ${nonNull[i]}`).join(" / ")} / flip ${flipCount}`);
    }
  } catch (e) {
    bad.push(`読み込みに失敗: ${e.message}`);
  }
  if (bad.length) {
    problems++;
    console.error(`\nBROKEN META INDEX (data/card-meta-index.json):`);
    bad.forEach((m) => console.error(`  - ${m}`));
    console.error(`  → node scripts/gen-card-meta-index.mjs を実行して生成し直し、コミットしてください`);
  }
}

// --- cronの git add 対象とドキュメント列挙の一致（#70） ---------------------
// .github/workflows/build-tournaments.yml の git add 行（＝日次cronが自動publishする範囲）は
// README.md「大会データの自動更新」節と CLAUDE.md「cronがコミットする範囲」に書き写されており、
// #30 → #69 と2回ドリフトした（README は「カードページは含めません」と事実と正反対の断定を
// 約3週間掲げていた）。ワークフローを書き換えるのは常に人なので、ここで人を止める。
// ⚠ 抽出に失敗したときに「一致」へ倒さないこと。検査が壊れて黙って通るのが最悪の失敗
//   （行が消えた・分割された・マーカーが無い・列挙が空 のすべてを exit 1 にする）。
const CRON_WORKFLOW = ".github/workflows/build-tournaments.yml";
{
  const bad = [];
  // 末尾スラッシュだけ正規化する。cards と cards/ の差はパスの増減を隠さないため
  const norm = (p) => p.replace(/\/+$/, "");
  // マーカー間のインラインコード `…` を拾う。**`x`** のような強調は外側なので影響しない
  const codesIn = (s) => [...s.matchAll(/`([^`\n]+)`/g)].map((m) => norm(m[1].trim())).filter(Boolean);
  let wfPaths = null;
  try {
    const yml = readFileSync(path.join(root, CRON_WORKFLOW), "utf8");
    // ⚠ 行頭指定は必須。外すと「下の git add 対象(#30)」というコメント行まで拾う
    const lines = yml.split(/\r?\n/).filter((l) => /^\s*git add /.test(l));
    if (lines.length !== 1) {
      bad.push(`git add 行が1行ではありません（${lines.length}行）— 抽出規則が陳腐化しています`);
    } else {
      wfPaths = lines[0].replace(/^\s*git add\s+/, "").trim().split(/\s+/).map(norm).filter(Boolean);
      if (!wfPaths.length) bad.push("git add 行にパスがありません — 抽出規則が陳腐化しています");
    }
  } catch (e) {
    bad.push(`読み込みに失敗: ${e.message}`);
  }
  if (wfPaths) {
    for (const file of ["README.md", "CLAUDE.md"]) {
      let text;
      try {
        text = readFileSync(path.join(root, file), "utf8");
      } catch (e) {
        bad.push(`${file} の読み込みに失敗: ${e.message}`);
        continue;
      }
      const s = text.indexOf("<!-- CRON-ADD:START -->");
      const t = text.indexOf("<!-- CRON-ADD:END -->");
      if (s < 0 || t < 0 || t < s) {
        bad.push(`${file} にマーカーがありません`);
        continue;
      }
      const docPaths = codesIn(text.slice(s + "<!-- CRON-ADD:START -->".length, t));
      if (!docPaths.length) {
        bad.push(`${file} のマーカー間に列挙がありません`);
        continue;
      }
      // 順序・重複は問わない（順序が違っても情報は欠けない）。集合として比較する
      const docSet = new Set(docPaths);
      const wfSet = new Set(wfPaths);
      const missing = wfPaths.filter((p) => !docSet.has(p));
      const extra = docPaths.filter((p) => !wfSet.has(p));
      if (missing.length) bad.push(`${file} に無い: ${[...new Set(missing)].join(" ")}`);
      if (extra.length) bad.push(`${file} にだけある: ${[...new Set(extra)].join(" ")}`);
    }
    if (!bad.length) {
      console.log(`cron git add paths in sync — ${wfPaths.length}パス（README.md / CLAUDE.md）`);
    }
  }
  if (bad.length) {
    problems++;
    console.error(`\nCRON PATH DRIFT (${CRON_WORKFLOW}):`);
    bad.forEach((m) => console.error(`  - ${m}`));
    console.error(`  → 正はワークフローの git add 行です。README.md「大会データの自動更新」節と`);
    console.error(`    CLAUDE.md「cronがコミットする範囲」のマーカー間の列挙を合わせてください`);
  }
}

if (problems > 0) {
  console.error(`\n${problems} problem(s) found.`);
  process.exit(1);
}
console.log("\nall checks passed.");
