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
// 同型で meta.rarities（レアリティ絞り込みの選択肢）が実データの全レアリティを覆っているかも検査する。
// さらに data/card-meta-index.json の並び替えキー（8要素・数値4項目・フリップ面）の内部整合を検査する。
// 加えて cronワークフローの git add 対象と README.md / CLAUDE.md の列挙が一致するかを検査する（#70）。
// 続いて docs/design/** の起票案の1行目から索引（待ち行列と復旧手順.md）§1 の生成部を作り直し、書かれているものと一致するかを検査する。
// 続いて工程記録（未採番-*/ と 待ち行列/ の 承認_・実装報告_ 等）の1行目の宣言と、起票案の状態行を突き合わせる。
// 続いてコード内に「<file>.js:<行番号>」の形の参照が残っていないかを検査する（行番号は腐るため）。
// 続いて共有トークン shared/css/tokens.css の集約状態を検査する（未定義参照と :root の持ち主）。
// 続いてUI規約の自動検査3本（onRemoveOne の配線・左ペインの閾値・スマホ表示の帯）を行う。
// 最後に、生成済みカードページの日本語効果文に「ハイライトされていない用語」が残っていないかを
// 検査する（用語ハイライトの語形ずれ・片方向）。⚠ この検査だけ非同期（並列読み込み）。
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadI18n } from "./lib/load-i18n.mjs";
import { buildTlJson, serialize, NAMES_FILE, EFFECTS_FILE } from "./gen-tl-json.mjs";
import {
  QUEUE_INDEX,
  STATES,
  readDrafts,
  countByState,
  buildSection,
  inspectIndex,
  headingProblems,
  firstDiff,
  driftMessage as queueDriftMessage,
  readRecords,
  matchRecords,
  countDecls,
  SKIP_BY_DRAFTS,
  skipByRecords,
} from "./gen-queue-index.mjs";

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

// レアリティ辞書の網羅性チェック（#40・meta.subtypes と同型）
// レアリティ絞り込み（#g-rarity）の選択肢は data/translations.js の meta.rarities を手で書く。
// 新しいレアリティ番号が公式APIに現れても、チップが1つ足りないだけで画面は壊れず更新の号令も無い。
// ⚠ 正にできるのはスナップショットだけ。メタ索引はレアリティを「prefix別の最小」しか持たないため
//   （設計書 §5 P2）、索引から全値を観測することは原理的にできない。
// ⚠ スナップショットは tmp/ 配下（gitignore）なので存在しないことがある。そのときは検査を
//   スキップするが、⭐ 黙って緑にしない——スキップしたことを成功行に明記する。
// ⚠ 片方向にする。辞書にあるが実データに無い番号は報告しない（先回りの登録は正当な運用）。
if (loaded) {
  const bad = [];
  const SNAP = path.join(root, "tmp", "api-cache", "cards-snapshot.json");
  const registered = (loaded.meta && loaded.meta.rarities) || {};
  if (!existsSync(SNAP)) {
    console.log(`meta.rarities check skipped — スナップショットがありません（${path.relative(root, SNAP)}）`);
  } else {
    try {
      const snap = JSON.parse(readFileSync(SNAP, "utf8"));
      const cards = Array.isArray(snap) ? snap : (snap.cards || []);
      const used = new Set();
      for (const c of cards) {
        for (const e of (c.editions || [])) {
          if (e && e.rarity != null) used.add(String(e.rarity));
        }
      }
      // ⚠ 抽出に失敗したときに「一致」へ倒さない。0件はスナップショットの破損であって網羅ではない
      if (used.size === 0) {
        bad.push("スナップショットからレアリティを1件も取り出せません（破損か形式変更の疑い）");
      } else {
        const missing = [...used].filter((r) => !registered[r]).sort();
        if (missing.length) {
          bad.push(`実データにあるが data/translations.js の meta.rarities に無い: ${missing.join(" ")}`);
        } else {
          console.log(
            `meta.rarities covers all rarities — ${used.size}種（スナップショット ${cards.length}枚から観測）`
          );
        }
      }
    } catch (e) {
      bad.push(`読み込みに失敗: ${e.message}`);
    }
  }
  // ⚠ 設計書 §5 P3。fillChips() は Object.keys(map).sort()（辞書順）で並べるため、キーが2桁に
  //   なると 1,10,2,… と並んで壊れる。9種までは1桁なので辞書順＝数値順で無害。
  //   ⭐ 辞書に10種目を足して上の検査を黙らせても、ここで必ず止まる。
  const regCount = Object.keys(registered).length;
  if (regCount >= 10) {
    bad.push(
      `meta.rarities が${regCount}種あります。fillChips() の .sort() は辞書順なので ` +
      `1,10,2,… と並びます（設計書 §5 P3。並び順の手当てが要ります）`
    );
  }
  if (bad.length) {
    problems++;
    console.error(`\nUNREGISTERED RARITIES (meta.rarities):`);
    bad.forEach((m) => console.error(`  - ${m}`));
    console.error(`  → data/translations.js の meta.rarities に "番号": "訳語（略号）" を追記してください`);
    console.error(`    （略号は shared/js/card-i18n.js の RARITY_CODE と揃える）`);
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

// --- 索引の生成部の検査（未採番・索引の転記ドリフト防止 単位1） -------------------
// docs/design/** の起票案（起票案*.md / 派生起票案*.md）の状態の正は「各ファイルの1行目」だけで、
// 索引 docs/design/待ち行列/待ち行列と復旧手順.md の §1 はそこから生成する（マーカー
// QUEUE-INDEX の間。作るのは scripts/gen-queue-index.mjs）。旧検査（収録漏れと件数一致の2点）は
// これに置き換えた——一覧・件数は「生成部が最新か」に含まれる。手で書き写す索引は、状態行と
// 整合したまま両方古い形でも改版履歴で7回ずれた（設計書 §1）。
// ⭐ 生成と検査で同じ関数を使う（gen-tl-json.mjs の buildTlJson と同じ型）。両辺は「索引に書かれて
//   いる文字列」と「起票案から今作った文字列」＝別の出所なので空回りしない。
// ⚠ 抽出に失敗したときに「一致」へ倒さないこと（#40 の教訓）。索引が読めない・マーカーが1組でない・
//   順序が逆・起票案が0件 のすべてを exit 1 にする（fail-open は1つも無い）。
// ⚠ 起票案に問題があるときは比較しない（1つの原因で2種類のエラーを出さない）。
// ⚠ 生成部の外の見出しに件数（N件）を書くと exit 1（件数の複製を許さない。散文は検査できない）。
// ⚠ この検査のため「起票案」で始まる名前の .md は起票案以外の目的で置けない。除外リストで逃げると
//   本物を取りこぼす穴が増えるので、名前のほうを直す。
// ⚠ 分割代入で problems と書かないこと（外側の problems カウンタを隠して problems++ が壊れる）
// ⭐ 起票案の読み取りは下の「工程記録の突き合わせ」でも使うので、ここで1回だけ読む
const { drafts: queueDrafts, problems: queueDraftProblems } = readDrafts(root);
{
  const draftBad = [...queueDraftProblems];
  const indexBad = [];
  const drafts = queueDrafts;

  let idxText = null;
  try {
    idxText = readFileSync(path.join(root, QUEUE_INDEX), "utf8");
  } catch {
    indexBad.push(`索引が見つかりません: ${QUEUE_INDEX}`);
  }
  if (idxText !== null) {
    const idx = inspectIndex(idxText);
    // ⚠ マーカーが1組でない・順序が逆なら、生成部の範囲が決まらないので後続は全部省略する
    if (idx.problems.length) {
      indexBad.push(...idx.problems);
    } else {
      indexBad.push(...headingProblems(idx.lines, idx.start, idx.end));
      if (draftBad.length) {
        indexBad.push(`生成部の比較を省略しました（起票案の問題が ${draftBad.length}件 あるため）`);
      } else {
        const k = firstDiff(idx.lines.slice(idx.start + 1, idx.end), buildSection(drafts));
        if (k) indexBad.push(queueDriftMessage(k));
      }
    }
  }

  const bad = [...draftBad, ...indexBad];
  if (bad.length) {
    problems++;
    console.error(`\nQUEUE INDEX DRIFT (${QUEUE_INDEX}):`);
    bad.forEach((m) => console.error(`  - ${m}`));
    console.error(`  → 状態の正は各起票案の1行目です。起票案を直し、node scripts/gen-queue-index.mjs で生成部を作り直してください`);
    console.error(`  → 「起票案」で始まる名前の .md はすべて起票案として扱われます。設計書・解説文書には別の名前を付けてください`);
    console.error(`  → 書式と手順は ${QUEUE_INDEX} §4`);
  } else {
    const c = countByState(drafts);
    console.log(
      `queue index up to date — 起票案${drafts.length}件（${STATES.map((s) => `${s}${c[s]}`).join(" / ")}）`,
    );
  }
}

// --- 工程記録と起票案の状態行の突き合わせ（未採番・索引の転記ドリフト防止 単位2） -------
// 工程記録（docs/design/未採番-*/ と 待ち行列/ の モック説明_ 設計完了_ 追加指示_ 実装報告_
// レビュー判定_ 再判定_ 承認_ 実物確認結果_ 取り下げ_）の1行目に **対象: 「呼び名」** を書かせ、
// 承認_ と 実物確認結果_ には（→ 完了）か（→ 継続）を、取り下げ_ には（→ 取り下げ）を必ず選ばせる。
// ⭐ ねらいは「完了したのに起票案の状態が古いまま」を止めること。索引 §1 は生成物なので状態行と
//   always 整合するが、⚠ 状態行そのものが古ければ索引も揃って古くなり、生成部の検査は緑になる
//   （2026-09-11 に実際に起きた。改版履歴で同型の是正が7回）。だから根拠を別のファイルに置く。
// ⭐ 比べる両辺は「工程記録の1行目の宣言」と「起票案の1行目の状態」＝別ファイル・別の書き手なので
//   空回りしない（同源で常に緑になる型ではない）。
// ⚠ 1つの原因で2種類のエラーを出さない: 起票案が読めないときは突き合わせをせず1行だけ、
//   記録に問題があるときはタスクごとの判定をしない。
// ⚠ 残る穴: 最後の承認で（→ 継続）を選び間違え、状態も直さないと整合したまま緑になる（設計書 §12）。
//   「選び間違える」まで潰そうとすると、承認のたびに別の根拠ファイルが要るので、ここで止めている。
{
  const bad = [];
  if (queueDraftProblems.length) {
    // ⚠ 起票案が読めないと呼び名の集合が作れない。QUEUE INDEX DRIFT 側で既に赤くなっている
    bad.push(SKIP_BY_DRAFTS);
  } else {
    const names = new Set(queueDrafts.map((d) => d.name));
    const { records, count, problems: recProblems } = readRecords(names, root);
    if (recProblems.length) {
      bad.push(...recProblems, skipByRecords(recProblems.length));
    } else {
      bad.push(...matchRecords(queueDrafts, records));
      if (!bad.length) {
        const c = countDecls(records);
        console.log(
          `task records in sync — 工程記録${count}件（完了の根拠${c.完了} / 継続${c.継続} / 取り下げの根拠${c.取り下げ}）`,
        );
      }
    }
  }
  if (bad.length) {
    problems++;
    console.error(`\nTASK RECORD DRIFT:`);
    bad.forEach((m) => console.error(`  - ${m}`));
    console.error(`  → 工程記録の1行目は **対象: 「呼び名」** です（承認_・実物確認結果_ は（→ 完了）か（→ 継続）、取り下げ_ は（→ 取り下げ）を付ける）`);
    console.error(`  → 状態を進める記録（設計完了_・（→ 完了））を書いたら、同じコミットで起票案の1行目を直し、node scripts/gen-queue-index.mjs を打ってください`);
  }
}

// --- コード内の「<file>.js:<行番号>」参照の検査（腐った行番号参照の是正・2026-09-04） -------
// コメントに書いた行番号は、指し先の行が動いた瞬間に無関係な場所を指す。実測した4件は
// 「3件が腐り ＋ 1件は導入コミット（9e835e56）の時点で既に19行ずれ」で、この書き方が
// 正しく保たれた例が1つも無かった。誰も気づかない（fail-open）ので、ここで人を止める。
// ⚠ docs/ は対象外にする。設計書・実測メモ・レビュー判定は「その時点の実測値」を記録する
//   文書なので、行番号が残るのはむしろ正常（2026-09-04 時点で約300件あり、記録を書くたびに
//   増える＝固定値として書く意味が無い）。ここへ広げると即座に赤くなるだけで、コード側の
//   腐りは1件も防げない。「docs も見たほうがよいのでは」で広げないこと。
// ⚠ shared/vendor/ も対象外。配布物にソースマップ由来の記述が入りうるが、自分では直せない。
//   ルートが shared/ なので、この除外を外すと配布物が走査対象に入る（成功行のファイル数が動く）。
//   整理目的で消さないこと。
// ⚠ 抽出に失敗したときに「合格」へ倒さないこと（#40・#70 と同じ方針）。ルートが読めない・
//   走査対象が0ファイル のいずれも exit 1 にする（改名や移動で黙って空回りするのが最悪の失敗）。
const LINEREF_ROOTS = ["scripts", "shared", "functions", "app.js", "tools"];
const LINEREF_EXCLUDE = ["shared/vendor"];
{
  const bad = [];
  const hits = [];
  // ⚠ 実装報告 T2 の grep と同じ形にする: [A-Za-z0-9_.-]+\.(js|mjs):[0-9]+(-[0-9]+)?
  const REF_RE = /[A-Za-z0-9_.-]+\.(?:js|mjs):\d+(?:-\d+)?/g;
  const excluded = (rel) => LINEREF_EXCLUDE.some((p) => rel === p || rel.startsWith(`${p}/`));
  const targets = [];
  const walk = (rel) => {
    if (excluded(rel)) return;
    const abs = path.join(root, rel);
    let st;
    try {
      st = statSync(abs);
    } catch (e) {
      bad.push(`${rel} を読めません: ${e.message} — 走査対象の指定が陳腐化しています`);
      return;
    }
    if (st.isDirectory()) {
      // 表示を決定的にするため名前順に降りる
      for (const d of readdirSync(abs, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
        walk(`${rel}/${d.name}`);
      }
    } else if (/\.(?:js|mjs)$/.test(rel)) {
      targets.push(rel);
    }
  };
  for (const r of LINEREF_ROOTS) walk(r);

  if (!targets.length) bad.push("走査対象の .js / .mjs が1つもありません — 走査対象の指定が陳腐化しています");
  for (const rel of targets) {
    let text;
    try {
      text = readFileSync(path.join(root, rel), "utf8");
    } catch (e) {
      bad.push(`${rel} の読み込みに失敗: ${e.message}`);
      continue;
    }
    text.split(/\r?\n/).forEach((line, i) => {
      for (const m of line.match(REF_RE) || []) hits.push(`${rel}:${i + 1} — ${m}`);
    });
  }

  if (hits.length) {
    bad.push(`行番号参照: ${hits.length}件`);
    // 件数が多いときも先頭20件だけ出す（全部出すと本来のエラーが流れる）
    hits.slice(0, 20).forEach((h) => bad.push(`  ${h}`));
    if (hits.length > 20) bad.push(`  …ほか ${hits.length - 20}件`);
  }

  if (bad.length) {
    problems++;
    console.error(`\nSTALE LINE REFS (${LINEREF_ROOTS.join(" / ")}):`);
    bad.forEach((m) => console.error(`  - ${m}`));
    console.error(`  → 行番号は腐ります。関数名で参照してください（例: card-i18n.js の bannedFormats()）`);
    console.error(`    「新しい行番号に直す」で済ませないこと。次のコミットでまた腐ります`);
    console.error(`    docs/ と shared/vendor/ は対象外です（設計書はその時点の実測値を記録する文書・配布物は直せない）`);
  } else {
    console.log(`no line-number refs in code comments — 0件（${targets.length}ファイル走査）`);
  }
}

// --- 共有トークン shared/css/tokens.css の検査2本（左ペイン化_設計 §3-5・Q1） -------------
// 2a057112 で style.css の :root だけが動き、--panel / --panel-2 / --border / --radius の4つが
// デッキ構築とズレた。その結果、同じ shared/css/filter-chips.css が2ページで違う色を出していた
// （本番で生きていた乖離）。トークンを1本に集約しただけでは同じことがまた起きるので、
// 「集約された状態」そのものをここで見張る。
//   (i)  shared/css/**.css が参照する var(--…) が、すべて tokens.css に定義されているか
//   (ii) :root を持つCSSファイルの集合が、許可リストと一致するか（増えても減っても落とす）
// ⚠ (ii) は「減った」でも落とす。許可リスト側の消し忘れ（別系統のCSSを消したのに残っている）を
//   検出するため。片方向にすると、許可リストだけが腐って何も守らなくなる。
// ⚠ 走査するのは配信されるCSSだけ。docs/ は対象外にする——設計モックの
//   モック_PC左ペイン_2026-09-02.css / モック_左ペイン化_2026-09-05.css が :root を持っており、
//   含めるとモックを1枚増やすたびに validate が落ちる（モックは配信されないので実害が無い）。
// ⚠ shared/vendor/ も対象外（配布物。自分では直せない）。
// ⚠ ⭐ :root も var(--…) も「コメントの中」に現れる。実測（2026-09-06）: shared/css/card-detail.css と
//   shared/css/filter-chips.css は、どちらも本文に :root ルールを持たないのに注意書きの文中に
//   :root と書いてある。素の文字列一致で数えると、この2枚が「持っている」側に混ざって (ii) が
//   常に落ちる。→ 両方の検査とも /* … */ を除去してから走査すること。
// ⚠ 抽出に失敗したときに「合格」へ倒さないこと（#40・#70・行番号参照の検査と同じ方針）。
//   走査対象が0ファイル・tokens.css が読めない のいずれも exit 1 にする。
// ⚠ cron は validate を実行しない。この2本が守るのは人が編集するときだけ（#40 と同じ制約）。
const TOKENS_FILE = "shared/css/tokens.css";
const TOKENS_SCOPE = "shared/css"; // (i) の走査範囲（tokens.css を参照する共有CSS）
const CSS_SKIP_DIRS = ["node_modules", ".git", "tmp", "docs", ".wrangler", "shared/vendor"];
// ⚠ ここを増やすときは「そのCSSがどのページから読まれ、なぜ別パレットなのか」を必ず書く。
const ROOT_OWNERS = [
  "shared/css/tokens.css",      // ⭐ 集約先。サイト本体3枚＋404が読む
  "cards/cards.css",            // 生成カードページ（別系統の配色）
  "tournaments/tournaments.css",// 生成大会ページ（別系統の配色）
  "tools/print/style.css",      // 印刷ツール（別系統の配色）
];
{
  const bad = [];
  // CSS のコメントは /* … */ だけ（// は無い）。文字列リテラル内の /* は実質使われないので考慮しない
  const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, " ");
  const cssFiles = [];
  const skipped = (rel) => CSS_SKIP_DIRS.some((p) => rel === p || rel.startsWith(`${p}/`));
  const walk = (rel) => {
    if (skipped(rel)) return;
    const abs = path.join(root, rel);
    let st;
    try {
      st = statSync(abs);
    } catch {
      return;
    }
    if (st.isDirectory()) {
      for (const d of readdirSync(abs, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
        walk(rel ? `${rel}/${d.name}` : d.name);
      }
    } else if (rel.endsWith(".css")) {
      cssFiles.push(rel);
    }
  };
  walk("");

  if (!cssFiles.length) bad.push("走査対象の .css が1つもありません — 走査範囲の指定が陳腐化しています");

  // --- (i) shared/css/**.css の var(--…) がすべて tokens.css に定義されているか ---
  let defined = null;
  try {
    const src = stripComments(readFileSync(path.join(root, TOKENS_FILE), "utf8"));
    defined = new Set([...src.matchAll(/(--[A-Za-z0-9_-]+)\s*:/g)].map((m) => m[1]));
    if (!defined.size) bad.push(`${TOKENS_FILE} にトークンの定義が1つもありません`);
  } catch (e) {
    bad.push(`${TOKENS_FILE} を読めません: ${e.message}`);
  }
  let refCount = 0;
  const undef = [];
  const scoped = cssFiles.filter((rel) => rel === TOKENS_SCOPE || rel.startsWith(`${TOKENS_SCOPE}/`));
  if (!scoped.length) bad.push(`${TOKENS_SCOPE} の .css が1つもありません — 走査範囲の指定が陳腐化しています`);
  if (defined) {
    for (const rel of scoped) {
      const src = stripComments(readFileSync(path.join(root, rel), "utf8"));
      for (const m of src.matchAll(/var\(\s*(--[A-Za-z0-9_-]+)/g)) {
        refCount++;
        if (!defined.has(m[1])) undef.push(`${rel} — ${m[1]}`);
      }
    }
  }
  if (undef.length) {
    bad.push(`${TOKENS_FILE} に定義が無いトークン参照: ${undef.length}件`);
    [...new Set(undef)].sort().forEach((u) => bad.push(`  ${u}`));
  }

  // --- (ii) :root を持つCSSファイルの集合が許可リストと一致するか ---
  // ⚠ `:root {` だけでなく `:root, html {` のようなセレクタリストも数える。
  //   [^{};]* は宣言をまたがないための歯止め（`--x: 1px` のような並びで誤爆させない）。
  const ROOT_RE = /:root\b[^{};]*\{/;
  const owners = cssFiles.filter((rel) => ROOT_RE.test(stripComments(readFileSync(path.join(root, rel), "utf8"))));
  const expect = [...ROOT_OWNERS].sort();
  const actual = [...owners].sort();
  const extra = actual.filter((f) => !expect.includes(f));
  const missing = expect.filter((f) => !actual.includes(f));
  if (extra.length) {
    bad.push(`許可リストに無いのに :root を持つCSS: ${extra.length}件`);
    extra.forEach((f) => bad.push(`  ${f}`));
  }
  if (missing.length) {
    bad.push(`許可リストにあるのに :root を持たないCSS: ${missing.length}件`);
    missing.forEach((f) => bad.push(`  ${f}`));
  }

  if (bad.length) {
    problems++;
    console.error(`\nSHARED CSS TOKENS (${TOKENS_FILE}):`);
    bad.forEach((m) => console.error(`  - ${m}`));
    console.error(`  → 共有CSSが使う変数は ${TOKENS_FILE} に定義してください（ページ側の :root に戻さないこと）`);
    console.error(`    :root を新しいCSSへ足す/消す場合は、scripts/validate.mjs の ROOT_OWNERS も同時に直してください`);
    console.error(`    docs/ と shared/vendor/ は対象外です（設計モックは配信されない・配布物は直せない）`);
  } else {
    console.log(`shared css tokens in sync — ${refCount} トークン参照 / 未定義 0`);
    console.log(`:root owners in sync — ${ROOT_OWNERS.length}ファイル`);
  }
}

// --- UI規約の自動検査3本（左ペイン化_設計 §11-9・E-add-1） -------------------
// 左ペイン化で「守っているのはコメントだけ」の規約が3つできた。どれも踏んでも画面は壊れず、
// 人の目では気づけない（fail-open）ので、ここで人を止める。
//   ① onRemoveOne の誤配線 … トップに渡すと1回の✕で検索が2回走る（APIリクエストが倍になるだけ）
//   ② 左ペインの閾値のずれ … CSS の @media と JS の PANE_MIN_WIDTH がずれると、
//      「左ペインは出るのにアコーディオンだけ効く（またはその逆）」帯ができ、
//      選んだ条件が画面のどこにも見えなくなる（G-2 のレビューが破壊試験で実在を示した）
//   ③ スマホ表示の帯のずれ … CSS の絞り込み導線の帯と JS の matchMedia がずれると、
//      FAB が永久に出ない。⚠ CSS を読むかぎり「直っている」ように見える（display は変わらない）
//
// ⚠ 3本とも「両辺が別の出所」であること（設計書 §11-9 の表）。片側だけを見て自分自身と
//   比べる検査は書かない——「書いても常に通る検査」を混ぜると緑が意味を失う。
//     ① コードの実態（渡しているか） ↔ ここの許可リスト（人が2か所を意識して初めて通る）
//     ② ページCSSの @media の値       ↔ ページJSの PANE_MIN_WIDTH（CSSとJSで別ファイル・別言語）
//     ③ ページCSSのマーカー直後の帯   ↔ ページJSの matchMedia(max-width)
// ⚠ fail-closed。走査対象が0件・目印が無い・形が想定と違う は、いずれも exit 1 にする。
// ⚠ ③の走査は「トップとデッキ構築の2ページ」に絞る。tournaments.js も
//   matchMedia("(max-width:640px)") を持つが、あれは表の列を畳むためのもので絞り込み導線とは
//   別の規約（マーカーを要求する筋合いが無い）。⭐ 一方でデッキ構築は走査対象に含めてあるので、
//   将来デッキ構築に JS 側の帯を足したら、覚えていなくてもマーカーが要求される。
// ⚠ タブ化で ①の非対称が消えたら、検査①も一緒に消す（動いていない規約を残さない・設計書 §13）。
const UI_PAGES = [
  { name: "トップ", js: "app.js", css: "style.css" },
  { name: "デッキ構築", js: "tools/deck-builder/app.js", css: "tools/deck-builder/style.css" },
];
// ①の走査範囲（ブラウザに配られるページコード）。⚠ scripts/ は入れない——ビルドスクリプトは
//   絞り込みUIを組み立てないうえ、この検査自身が識別子を文字列で持つため自己検出になる。
const REMOVEONE_ROOTS = ["app.js", "shared/js", "tools", "functions"];
const REMOVEONE_EXCLUDE = ["shared/vendor"];
// ⚠ 増やすときは「そのページの群側 onChange が再検索しないこと」を実測してから足す。
const REMOVEONE_ALLOW = ["tools/deck-builder/app.js"];
// ③のマーカー。⚠ この文字列は style.css 側にも同じ形で書いてある（片方だけ変えると exit 1）。
const MOBILE_BAND_MARKER = "MOBILE-BAND:START";
{
  const bad = [];
  // JS も CSS もコメントを剥いでから見る。コメントの中に規約の説明として同じ字面が書いてある
  // （実測: 両ページの style.css は注意書きの中に @media (max-width: 640px) と書いている）。
  const stripJs = (s) => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  const stripCss = (s) => s.replace(/\/\*[\s\S]*?\*\//g, " ");
  const read = (rel) => readFileSync(path.join(root, rel), "utf8");

  // ---- ① onRemoveOne を渡している呼び出しが許可リストと一致するか（双方向） ----
  const jsTargets = [];
  const excluded = (rel) => REMOVEONE_EXCLUDE.some((p) => rel === p || rel.startsWith(`${p}/`));
  const walkJs = (rel) => {
    if (excluded(rel)) return;
    let st;
    try {
      st = statSync(path.join(root, rel));
    } catch (e) {
      bad.push(`${rel} を読めません: ${e.message} — 走査対象の指定が陳腐化しています`);
      return;
    }
    if (st.isDirectory()) {
      for (const d of readdirSync(path.join(root, rel), { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
        walkJs(`${rel}/${d.name}`);
      }
    } else if (/\.(?:js|mjs)$/.test(rel)) {
      jsTargets.push(rel);
    }
  };
  for (const r of REMOVEONE_ROOTS) walkJs(r);
  if (!jsTargets.length) bad.push("①の走査対象の .js が1つもありません — REMOVEONE_ROOTS が陳腐化しています");

  // オプションとして渡している形（プロパティ名）だけを拾う。呼び出し・受け取りは対象外。
  const PASS_RE = /\bonRemoveOne\s*:/;
  const passers = jsTargets.filter((rel) => PASS_RE.test(stripJs(read(rel))));
  const allowSorted = [...REMOVEONE_ALLOW].sort();
  const passSorted = [...passers].sort();
  const passExtra = passSorted.filter((f) => !allowSorted.includes(f));
  const passMissing = allowSorted.filter((f) => !passSorted.includes(f));
  if (passExtra.length) {
    bad.push(`許可リストに無いのに onRemoveOne を渡しているページ: ${passExtra.length}件`);
    passExtra.forEach((f) => bad.push(`  ${f}`));
  }
  if (passMissing.length) {
    // ⚠ 片方向にしない。デッキ構築側から消えたら「✕を押しても結果が更新されない」に戻るので落とす。
    bad.push(`許可リストにあるのに onRemoveOne を渡していないページ: ${passMissing.length}件`);
    passMissing.forEach((f) => bad.push(`  ${f}`));
  }

  // ---- ②③ ページごとの閾値 ----
  const paneLog = [];
  const bandLog = [];
  const markerOwners = [];
  for (const page of UI_PAGES) {
    let js, css;
    try {
      js = stripJs(read(page.js));
    } catch (e) {
      bad.push(`${page.js} を読めません: ${e.message} — UI_PAGES が陳腐化しています`);
      continue;
    }
    try {
      css = read(page.css);
    } catch (e) {
      bad.push(`${page.css} を読めません: ${e.message} — UI_PAGES が陳腐化しています`);
      continue;
    }
    const cssNoComment = stripCss(css);

    // ② JS 側の PANE_MIN_WIDTH（定義はちょうど1つであること）
    const paneDefs = [...js.matchAll(/\bPANE_MIN_WIDTH\s*=\s*(\d+)\b/g)].map((m) => Number(m[1]));
    const paneUniq = [...new Set(paneDefs)];
    if (paneUniq.length !== 1) {
      bad.push(
        `${page.js} の PANE_MIN_WIDTH の定義が ${paneDefs.length}件（値 ${paneUniq.join(" / ") || "なし"}）です — ちょうど1つでなければ CSS と突き合わせられません`
      );
      continue;
    }
    const pane = paneUniq[0];

    // ② CSS 側の @media の prelude から min-width / max-width を集める
    const preludes = [...cssNoComment.matchAll(/@media\b([^{]*)\{/g)].map((m) => m[1]);
    const mins = [];
    const maxs = [];
    for (const p of preludes) {
      for (const m of p.matchAll(/\bmin-width\s*:\s*(\d+)px/g)) mins.push(Number(m[1]));
      for (const m of p.matchAll(/\bmax-width\s*:\s*(\d+)px/g)) maxs.push(Number(m[1]));
    }
    const minUniq = [...new Set(mins)].sort((a, b) => a - b);
    if (minUniq.length !== 1 || minUniq[0] !== pane) {
      bad.push(
        `${page.name}: ${page.css} の @media の min-width が [${minUniq.join(", ") || "なし"}] で、${page.js} の PANE_MIN_WIDTH（${pane}）ただ1つと一致しません`
      );
    }
    const overlap = [...new Set(maxs)].filter((v) => v >= pane).sort((a, b) => a - b);
    if (overlap.length) {
      bad.push(
        `${page.name}: ${page.css} の @media の max-width [${overlap.join(", ")}] が PANE_MIN_WIDTH（${pane}）以上です — スマホ表示の帯と左ペインの帯が重なります`
      );
    }
    paneLog.push(`${page.name} ${pane}px`);

    // ③ JS 側の matchMedia(max-width) → マーカー直後の @media と一致するか
    const mqVals = [
      ...new Set([...js.matchAll(/matchMedia\(\s*["'`]\s*\(\s*max-width\s*:\s*(\d+)px\s*\)\s*["'`]\s*\)/g)].map((m) => Number(m[1]))),
    ];
    const markerCount = css.split(MOBILE_BAND_MARKER).length - 1;
    if (mqVals.length > 1) {
      bad.push(
        `${page.name}: ${page.js} の matchMedia(max-width) の値が [${mqVals.join(", ")}] と複数あります — どの帯をマーカーと突き合わせるか決められません`
      );
      continue;
    }
    if (!mqVals.length) {
      // JS 側に帯が無いページにマーカーだけ残っているのは、規約が宙に浮いた状態。
      if (markerCount) bad.push(`${page.name}: ${page.js} に matchMedia(max-width) が無いのに ${page.css} にマーカーが ${markerCount}組あります`);
      continue;
    }
    markerOwners.push(page.css);
    if (markerCount !== 1) {
      bad.push(
        `${page.name}: ${page.css} のマーカー ${MOBILE_BAND_MARKER} が ${markerCount}組です — ちょうど1組でなければ、どの @media が絞り込み導線の帯なのか決められません`
      );
      continue;
    }
    const at = css.indexOf(MOBILE_BAND_MARKER);
    const open = css.lastIndexOf("/*", at);
    const close = css.indexOf("*/", at);
    if (open < 0 || close < 0 || css.slice(open, at).includes("*/")) {
      bad.push(`${page.name}: ${page.css} のマーカーが CSS コメント（/* … */）の中にありません`);
      continue;
    }
    const after = css.slice(close + 2);
    const m = after.match(/^\s*@media\b([^{]*)\{/);
    if (!m) {
      bad.push(
        `${page.name}: ${page.css} のマーカーの直後が @media ではありません — マーカーは帯の @media の直前の行にだけ置いてください（間に別の宣言やコメントを挟まない）`
      );
      continue;
    }
    const bandMax = [...new Set([...m[1].matchAll(/\bmax-width\s*:\s*(\d+)px/g)].map((v) => Number(v[1])))];
    if (bandMax.length !== 1) {
      bad.push(`${page.name}: ${page.css} のマーカー直後の @media の max-width が ${bandMax.length}個です（prelude: ${m[1].trim()}）`);
      continue;
    }
    if (bandMax[0] !== mqVals[0]) {
      bad.push(
        `${page.name}: ${page.css} のマーカー直後の帯は max-width ${bandMax[0]}px ですが、${page.js} の matchMedia は ${mqVals[0]}px です`
      );
      continue;
    }
    bandLog.push(`${page.css} ${bandMax[0]}px ↔ ${page.js} MOBILE_MQ ${mqVals[0]}px`);
  }

  // ③ 迷子のマーカー（UI_PAGES の外のCSSに置かれた／要求されていないページに残った）
  {
    const skip = ["node_modules", ".git", "tmp", "docs", ".wrangler", "shared/vendor"];
    const strayed = [];
    const walkCss = (rel) => {
      if (skip.some((p) => rel === p || rel.startsWith(`${p}/`))) return;
      let st;
      try {
        st = statSync(path.join(root, rel || "."));
      } catch {
        return;
      }
      if (st.isDirectory()) {
        for (const d of readdirSync(path.join(root, rel || "."), { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
          walkCss(rel ? `${rel}/${d.name}` : d.name);
        }
      } else if (rel.endsWith(".css") && read(rel).includes(MOBILE_BAND_MARKER) && !markerOwners.includes(rel)) {
        strayed.push(rel);
      }
    };
    walkCss("");
    if (strayed.length) {
      bad.push(`マーカー ${MOBILE_BAND_MARKER} が要求されていないCSSにあります: ${strayed.length}件`);
      strayed.forEach((f) => bad.push(`  ${f}`));
    }
  }

  if (bad.length) {
    problems++;
    console.error(`\nUI CONTRACTS (左ペイン化_設計 §11-9):`);
    bad.forEach((m) => console.error(`  - ${m}`));
    console.error(`  → ① onRemoveOne を渡してよいのは「群側の onChange が再検索しないページ」だけです`);
    console.error(`       （トップは群側が再検索するので、渡すと1回の✕で検索が2回走ります。画面は何も変わりません）`);
    console.error(`    ② 左ペインの閾値は CSS の @media と JS の PANE_MIN_WIDTH の2か所にあり、必ず同じ値でなければなりません`);
    console.error(`       （ずれると「左ペインは出るのにアコーディオンだけ効く」帯ができ、選んだ条件が画面のどこにも見えなくなります）`);
    console.error(`    ③ 絞り込み導線の帯は CSS のマーカー直後の @media と JS の matchMedia の2か所にあり、必ず同じ値でなければなりません`);
    console.error(`       （ずれても CSS 上は display が変わらないため、CSS を読むかぎり「直っている」ように見えます）`);
    console.error(`    検査を消して通さないこと。将来2つ目の min-width が本当に必要になったら、`);
    console.error(`    scripts/validate.mjs の UI_PAGES / REMOVEONE_ALLOW に「なぜ要るのか」を書いて足してください`);
  } else {
    console.log(`onRemoveOne wiring in sync — 渡しているのは ${passers.length}ファイル（${passers.join(" / ")}）／${jsTargets.length}ファイル走査`);
    console.log(`pane threshold in sync — ${paneLog.length}ページ（${paneLog.join(" / ")}）`);
    console.log(`mobile band marker in sync — ${bandLog.length}組（${bandLog.join(" / ")}）`);
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
  // ⚠ (b) の右辺。SECTION と「同じHTMLを別の数え方で数える」ことが要点。
  //   SECTION から見出し部分を切り出して使い回さないこと——両辺が同源になると常に一致し、
  //   この検査自体が新しい「無言の緑」になる。
  const JP_H2 = /<h2>効果（日本語）<\/h2>/g;
  const scan = (html) => {
    const hits = new Set();
    let sections = 0;
    for (const m of html.matchAll(SECTION)) {
      sections++;
      const text = visibleText(m[1]);
      for (const c of cores) if (text.includes(c)) hits.add(c);
    }
    return { hits: [...hits], sections };
  };

  let pages = 0;
  let sections = 0;
  const missed = [];
  const noSection = []; // (a) 効果（日本語）の節を1つも走査できないページ
  const partial = []; // (b) 見出しの数と走査できた節の数が食い違うページ
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
        // ⚠ 検査が空回りしていないことの確認（(a)(b)）。生成器のマークアップが変わると
        //   SECTION が1つも当たらなくなるが、それだけでは hits が空＝緑になってしまう。
        const h = [...html.matchAll(JP_H2)].length;
        const { hits, sections: s } = scan(html);
        sections += s;
        // ⚠ else if にする。節が0のページで (b) も積むと、1つの原因で2種類のエラーが出る。
        if (s === 0) noSection.push(slugs[i]);
        else if (s !== h) partial.push(`${slugs[i]}（節${s} / 見出し${h}）`);
        if (hits.length) missed.push(`${slugs[i]}（${hits.join("・")}）`);
      }
    };
    await Promise.all(Array.from({ length: 8 }, worker));
    // 並列実行なので順序は不定。表示を決定的にする
    missed.sort();
    noSection.sort();
    partial.sort();
    if (!pages) bad.push("cards/ にカードページが1枚もありません（生成前？）");
    else {
      // ⚠ else if で連ねない（併発しうる）。(c)→(a)→(b)→既存 の順に積む。
      if (!cores.length)
        bad.push("用語辞書から中核語を1つも取り出せません（data/translations.js の terms を確認してください）");
      if (noSection.length) {
        bad.push(`効果（日本語）の節を1つも走査できないページ: ${noSection.length}ページ`);
        bad.push(`  例: ${noSection.slice(0, 5).join(" / ")}`);
      }
      if (partial.length) {
        bad.push(`効果（日本語）の見出しの数と走査できた節の数が違うページ: ${partial.length}ページ`);
        bad.push(`  例: ${partial.slice(0, 5).join(" / ")}`);
      }
      if (missed.length) {
        bad.push(`日本語効果文にあるのにハイライトされていない用語: ${missed.length}ページ`);
        bad.push(`  例: ${missed.slice(0, 5).join(" / ")}`);
      }
      if (!bad.length) console.log(`card term highlights up to date — ${pages} ページ / ${sections} 節`);
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
    // ⚠ 条件付き。用語の取りこぼしだけで落ちたときに出すと原因と無関係な方向へ誘導する。
    if (noSection.length || partial.length)
      console.error(`    節を走査できない場合は build-card-pages.mjs の effectSections() のマークアップ変更を疑ってください（検査の SECTION 正規表現も同時に直す）`);
  }
}

if (problems > 0) {
  console.error(`\n${problems} problem(s) found.`);
  process.exit(1);
}
console.log("\nall checks passed.");
