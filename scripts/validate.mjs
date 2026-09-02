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
// 同型で meta.subtypes（サブタイプ行の訳語）が実データの全サブタイプを覆っているかも検査する。
// 加えて cronワークフローの git add 対象と README.md / CLAUDE.md の列挙が一致するかを検査する（#70）。
// 続いて docs/design/** の起票案の状態行と、索引（待ち行列と復旧手順.md）の整合を検査する（収録漏れと件数一致）。
// 最後に、生成済みカードページの日本語効果文に「ハイライトされていない用語」が残っていないかを
// 検査する（用語ハイライトの語形ずれ・片方向）。⚠ この検査だけ非同期（並列読み込み）。
import { readFileSync, readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
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

// サブタイプ辞書の網羅性チェック（#40 と同型）
// カードページ・詳細モーダルのサブタイプ行は data/translations.js の meta.subtypes を手で書く。
// 新セットで新しいサブタイプが増えても英字のまま出るだけなので画面は壊れず、更新の号令も無い
// （実測: PRD 系の10種／94枚が登録されないまま気づかれなかった）。ここで人を止める。
// ⚠ 正はコミット済みの data/card-meta-index.json（日次cronが毎日再生成する）。生成スクリプトを
//   呼んで突き合わせない（両辺が同源になり常に通る）。
// ⚠ 片方向にする。辞書にあるが実データに無いコード（SHENJU 等）は報告しない
//   ——新セットの訳を先回りで入れておくのは正当な運用で、ここで落とすとそれが止まる。
if (loaded) {
  const bad = [];
  try {
    const idx = JSON.parse(readFileSync(path.join(root, "data", "card-meta-index.json"), "utf8"));
    const dict = idx.d || [];
    const used = new Set();
    for (const e of Object.values(idx.m || {})) {
      // entry[3] がサブタイプのトークンID列（#27 の形式）。旧形式・壊れた行は飛ばす
      if (!Array.isArray(e) || !Array.isArray(e[3])) continue;
      for (const i of e[3]) if (dict[i] != null) used.add(dict[i]);
    }
    // ⚠ 抽出に失敗したときに「一致」へ倒さない。0件は索引の破損であって「網羅できている」ではない
    if (used.size === 0) {
      bad.push("索引からサブタイプを1件も取り出せません（索引の破損か形式変更の疑い）");
    } else {
      const registered = (loaded.meta && loaded.meta.subtypes) || {};
      const missing = [...used].filter((code) => !registered[code]).sort();
      if (missing.length) {
        bad.push(`実データにあるが data/translations.js の meta.subtypes に無い: ${missing.join(" ")}`);
      } else {
        console.log(`meta.subtypes covers all subtypes — ${used.size}種`);
      }
    }
  } catch (e) {
    bad.push(`読み込みに失敗: ${e.message}`);
  }
  if (bad.length) {
    problems++;
    console.error(`\nUNREGISTERED SUBTYPES (meta.subtypes):`);
    bad.forEach((m) => console.error(`  - ${m}`));
    console.error(`  → data/translations.js の meta.subtypes に CODE: "訳語" をアルファベット順の位置へ追記し、`);
    console.error(`    npm run build:cards を実行してコミットしてください（サブタイプ行が素の英字のまま出ています）`);
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
      // ⚠ 出現数まで数える。indexOf は最初の1組しか見ないので、2組目に古い列挙を残すと
      //   検査が黙って通ってしまう（#70 のレビュー指摘 S1）。1組だけを許す
      const START = "<!-- CRON-ADD:START -->";
      const END = "<!-- CRON-ADD:END -->";
      const countOf = (needle) => text.split(needle).length - 1;
      const sn = countOf(START);
      const en = countOf(END);
      if (sn === 0 || en === 0) {
        bad.push(`${file} にマーカーがありません`);
        continue;
      }
      if (sn !== 1 || en !== 1) {
        bad.push(`${file} にマーカーが複数あります（START ${sn}個 / END ${en}個）— 1組だけにしてください`);
        continue;
      }
      const s = text.indexOf(START);
      const t = text.indexOf(END);
      if (t < s) {
        bad.push(`${file} にマーカーがありません`);
        continue;
      }
      const docPaths = codesIn(text.slice(s + START.length, t));
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

// --- 起票案の状態行と索引の整合検査（未採番・起票案の整合検査） ---------------
// docs/design/** の起票案（起票案*.md / 派生起票案*.md）の状態は「各ファイルの1行目」が正で、
// docs/design/待ち行列/待ち行列と復旧手順.md がその一覧（索引）を持つ。索引は人が手で書き写す
// ので必ずドリフトする（#70 の git add 列挙と同型）。ここで人を止める。見るのは2点だけ:
//   A 収録漏れ … 起票案が索引にリンクされているか
//   B 件数一致 … 索引の見出し（**N件**）と、状態行から数えた実数
// ⚠ 照合は「パスの完全一致」。基名の部分一致は採らない（誤検知1件・見逃し1件を実測）。
//   基名 起票案_2026-08-26.md は2ファイルあり、さらに 派生起票案_2026-08-26.md の部分文字列。
//   索引のリンクは索引の位置から解決して正規化する（同フォルダのスラッシュ無しリンクも通す）。
// ⚠ 索引の表構造・列は見ない（索引を整形しただけで落ちる検査にしない）。
// ⚠ 抽出に失敗したときに「一致」へ倒さないこと（#40 の教訓）。索引が読めない・見出しが取れない・
//   見出しが複数ある・起票案が0件 のすべてを exit 1 にする（fail-open は1つも無い）。
// ⚠ この検査のため「起票案」で始まる名前の .md は起票案以外の目的で置けない。除外リストで逃げると
//   本物を取りこぼす穴が増えるので、名前のほうを直す（設計書自身がこれを踏んで改名した）。
const DRAFT_INDEX = "docs/design/待ち行列/待ち行列と復旧手順.md";
const DRAFT_ROOT = "docs/design";
{
  const bad = [];
  // 1行目の状態行。⚠ 日付は形式だけ見る（値の妥当性も「最終確認からN日」の鮮度も見ない
  //   ＝その日の変更と無関係に時計だけで赤くなる検査にしない）
  const STATUS_RE = /^\*\*状態: (生きている|完了|取り下げ)\*\*（最終確認 (\d{4}-\d{2}-\d{2})）/;
  const IS_DRAFT = /^(派生)?起票案/; // ⚠ 前方一致。「含む」だと無関係な文書まで拾う
  const LINK_RE = /\]\(([^)\s#]+\.md)[)#]/g; // ](path.md) と ](path.md#anchor) の両方
  const toRel = (p) => path.relative(root, p).split(path.sep).join("/");

  // --- 起票案を集める（再帰・リポジトリ相対パスに正規化して昇順） ---
  const drafts = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch (e) {
      bad.push(`走査に失敗: ${toRel(dir)}（${e.message}）`);
      return;
    }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (ent.isFile() && ent.name.endsWith(".md") && IS_DRAFT.test(ent.name)) drafts.push(toRel(full));
    }
  };
  walk(path.join(root, DRAFT_ROOT));
  drafts.sort(); // 出力を決定的にする
  // ⚠ 0件を「全部一致」に倒さない。走査の壊れ（パス定数の誤り・実行位置違い）が黙って緑になる
  if (!drafts.length) bad.push(`起票案が1件も見つかりません: ${DRAFT_ROOT}`);

  // --- 状態行を読む ---
  const counted = { 生きている: 0, 完了: 0, 取り下げ: 0 };
  let unreadable = 0;
  for (const rel of drafts) {
    let first;
    try {
      // ⚠ BOM 付きで保存されると「1行目が無い」に見えて原因が分かりにくい。先に除去する
      first = readFileSync(path.join(root, rel), "utf8").replace(/^\uFEFF/, "").split(/\r?\n/)[0] || "";
    } catch (e) {
      bad.push(`起票案の読み込みに失敗: ${rel}（${e.message}）`);
      unreadable++;
      continue;
    }
    const m = STATUS_RE.exec(first);
    if (!m) {
      // ⭐ この検査のいちばんの効き目＝状態行なしの起票案を新規に作れなくなる
      bad.push(`起票案の1行目に状態行がありません: ${rel}`);
      unreadable++;
      continue;
    }
    counted[m[1]]++;
  }

  // --- 索引を読む ---
  let idx = null;
  try {
    idx = readFileSync(path.join(root, DRAFT_INDEX), "utf8");
  } catch {
    bad.push(`索引が見つかりません: ${DRAFT_INDEX}`);
  }
  // ⚠ 見出しの語は索引側が「完了済み」、状態行側が「完了」。ラベルは状態行側に寄せる。
  // ⚠ 閉じ括弧まで要求しないこと（全件見出しは ** の直後が「）」ではなく「・」で 0回一致になる）。
  // ⚠ 逆に緩めると索引の別の見出し2本（「#### ②-A 完了済みタスク **5件**」と
  //   「### ② issueを起票する（**完了済み5件 …**）」）を拾って壊れる。緩めた瞬間に
  //   「見出しが N個 あります」で赤くなる。
  const HEAD_RES = [
    ["全件", /^#{2,3} .*起票案の一覧（\*\*全(\d+)件\*\*/gm],
    ["生きている", /^#{2,3} .*生きている（\*\*(\d+)件\*\*/gm],
    ["完了", /^#{2,3} .*完了済み（\*\*(\d+)件\*\*/gm],
    ["取り下げ", /^#{2,3} .*取り下げ（\*\*(\d+)件\*\*/gm],
  ];
  let idxCounts = idx === null ? null : {};
  if (idx !== null) {
    for (const [label, re] of HEAD_RES) {
      const hits = [...idx.matchAll(re)];
      if (hits.length === 0) {
        bad.push(`索引に「${label}」の件数見出しが見つかりません`);
        idxCounts = null;
      } else if (hits.length > 1) {
        bad.push(`索引に「${label}」の件数見出しが ${hits.length}個 あります（1個だけにしてください）`);
        idxCounts = null;
      } else if (idxCounts) {
        idxCounts[label] = Number(hits[0][1]);
      }
    }
  }

  // ⚠ 索引が読めない／見出しが取れないときは A・B とも実行しない（「一致」に倒さないため）
  if (idxCounts) {
    const base = path.posix.dirname(DRAFT_INDEX);
    const linked = new Set(
      [...idx.matchAll(LINK_RE)].map((m) => path.posix.normalize(path.posix.join(base, m[1]))),
    );
    // A 収録漏れ（⚠ 基名ではなくパスを出す。基名は重複するのでどちらの話か判別できない）
    for (const rel of drafts) if (!linked.has(rel)) bad.push(`索引に載っていない起票案: ${rel}`);
    // B 件数一致（⚠ 実数が確定しないまま比較すると1つの原因で2種類のエラーが出る）
    if (unreadable) {
      bad.push(`件数の比較を省略しました（状態行を読めない起票案が ${unreadable}件 あるため）`);
    } else {
      const actual = { 全件: drafts.length, ...counted };
      for (const [label] of HEAD_RES) {
        if (idxCounts[label] !== actual[label]) {
          bad.push(`索引の件数が実数と一致しません: ${label} 索引${idxCounts[label]} / 実数${actual[label]}`);
        }
      }
    }
  }

  if (bad.length) {
    problems++;
    console.error(`\nISSUE DRAFT DRIFT (${DRAFT_INDEX}):`);
    bad.forEach((m) => console.error(`  - ${m}`));
    console.error(`  → 状態の正は各起票案の1行目です。索引 §1 の一覧と見出しの件数を合わせてください`);
    console.error(`    （手順は ${DRAFT_INDEX} §4）`);
    console.error(`  → 「起票案」で始まる名前の .md はすべて起票案として扱われます。設計書・解説文書には別の名前を付けてください`);
  } else {
    console.log(
      `issue drafts in sync — 起票案${drafts.length}件（生きている${counted["生きている"]} / 完了${counted["完了"]} / 取り下げ${counted["取り下げ"]}）`,
    );
  }
}

// --- カードページの用語ハイライトの取りこぼし検査（用語ハイライトの語形ずれ） -------------
// 日本語効果文に用語がはっきり書かれているのにハイライトも用語解説も出ない、という欠落が
// 155件/140枚あった（英語原文の語形がずれてキーが当たらない／英語原文に該当語が無い）。
// fail-open なので画面は壊れず、黙って出ないだけ＝人が気づけない。ここで止める。
//
// ⚠ 正はコミット済みの cards/<slug>/index.html（日次cronが毎日再生成する）。生成関数を呼んで
//   突き合わせない（両辺が同源になり常に通る）。この検査が赤くなるのは主に次の3つ:
//     1. 照合規則の回帰（matchedTerms() が英語ゲートだけに戻った）
//     2. data/translations.js に用語を足した／data/tl/*.js に訳を足したのに build:cards 未実行
//     3. ハイライト実装のデグレ
// ⚠ 片方向にする。「用語解説に出ているのに訳文に中核語が無い」（無害・実測11件）では落とさない
//   ——辞書に先回りで用語を入れておくのは正当な運用（meta.subtypes 検査と同じ方針）。
// ⚠ この検査は shadowstrike の1枚を原理的に拾えない（既に「プレパレーション」が term-hl に
//   包まれており、span の内側を除くと中核語「プレパレーションカウンター」が現れないため）。
//   ＝緑になっても占有判定の順序が正しい保証にはならない。
if (loaded) {
  const bad = [];
  const cores = [
    ...new Set(
      Object.values(loaded.terms || {})
        .map((t) => String((t && t.jp) || "").split("（")[0].trim())
        .filter((c) => c.length >= 2)
    ),
  ];
  // ⚠ grep 'term-hl">核' の形では判定できない。subtype-hl が内側に入ると文字列が割れて0件に
  //   見える。タグを走査して「term-hl / card-name-hl の内側か」を判定し、内側は捨てる。
  //   残りのタグは境界（改行）に潰す（タグをまたいだ偶然の連結を用語と誤認しないため）。
  const visibleText = (html) => {
    let out = "";
    let depth = 0;
    let prot = -1; // 保護spanが開いた深さ（-1 = 保護外）
    const re = /<[^>]*>/g;
    let last = 0;
    let m;
    while ((m = re.exec(html))) {
      if (prot < 0) out += html.slice(last, m.index);
      out += "\n";
      const tag = m[0];
      if (/^<span[\s>]/.test(tag)) {
        depth++;
        if (prot < 0 && /class="(?:term-hl|card-name-hl)"/.test(tag)) prot = depth;
      } else if (/^<\/span>/.test(tag)) {
        if (prot === depth) prot = -1;
        depth--;
      }
      last = m.index + tag.length;
    }
    if (prot < 0) out += html.slice(last);
    return out
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
  };
  // ⚠ 効果（日本語）の節は1ページに複数ある（両面カードは裏面にも出る）。全部見る。
  const SECTION = /<h2>効果（日本語）<\/h2><p class="cp-effect">([\s\S]*?)<\/p>/g;
  const scan = (html) => {
    const hits = new Set();
    for (const m of html.matchAll(SECTION)) {
      const text = visibleText(m[1]);
      for (const c of cores) if (text.includes(c)) hits.add(c);
    }
    return [...hits];
  };

  let pages = 0;
  const missed = [];
  try {
    const cardsDir = path.join(root, "cards");
    const slugs = readdirSync(cardsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
    // ⚠ 逐次 readFileSync は 2,495ファイルで約7秒かかる（validate 全体が約1秒）。並列8で読む。
    // ⚠ `n += await readFile(...)` と書かないこと（+= は await の前に左辺を読むため集計が壊れる）。
    let next = 0;
    const worker = async () => {
      for (;;) {
        const i = next++;
        if (i >= slugs.length) return;
        let html;
        try {
          html = await readFile(path.join(cardsDir, slugs[i], "index.html"), "utf8");
        } catch {
          continue; // index.html が無いディレクトリは対象外
        }
        pages++;
        const hits = scan(html);
        if (hits.length) missed.push(`${slugs[i]}（${hits.join("・")}）`);
      }
    };
    await Promise.all(Array.from({ length: 8 }, worker));
    missed.sort(); // 並列実行なので順序は不定。表示を決定的にする
    if (!pages) bad.push("cards/ にカードページが1枚もありません（生成前？）");
    else if (missed.length) {
      bad.push(`日本語効果文にあるのにハイライトされていない用語: ${missed.length}ページ`);
      bad.push(`  例: ${missed.slice(0, 5).join(" / ")}`);
    } else {
      console.log(`card term highlights up to date — ${pages} ページ`);
    }
  } catch (e) {
    bad.push(`読み込みに失敗: ${e.message}`);
  }
  if (bad.length) {
    problems++;
    console.error(`\nUNHIGHLIGHTED TERMS (cards/<slug>/index.html):`);
    bad.forEach((m) => console.error(`  - ${m}`));
    console.error(`  → 用語を足した/訳を足した場合は npm run build:cards を実行してコミットしてください`);
    console.error(`    件数が多い場合は matchedTerms()（shared/js/card-detail.js / scripts/build-card-pages.mjs）の回帰を疑ってください`);
  }
}

if (problems > 0) {
  console.error(`\n${problems} problem(s) found.`);
  process.exit(1);
}
console.log("\nall checks passed.");
