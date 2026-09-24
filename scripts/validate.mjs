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
// 続いてコード内に「<file>.js:<行番号>」の形の参照が残っていないかを検査する（行番号は腐るため）。
// 続いて CLAUDE.md に現在形の公開状態（「未push」と公開状態を否定する語の同居）が無いかを検査する（#87）。
// 続いて共有トークン shared/css/tokens.css の集約状態を検査する（未定義参照と :root の持ち主）。
// 続いてUI規約の自動検査3本（onRemoveOne の配線・左ペインの閾値・スマホ表示の帯）を行う。
// 続いて版レベルの絞り込み項目（MULTI の第3要素が null）が想定どおりか、実際に絞れるかを検査する（#93）。
// 続いて版の正規順序 editionOrder() が全順序であること（＝比較器が簡略化されていないこと）を検査する（#108）。
// 続いて検索結果の件数欄の文言が shared/js/card-search.js 1か所だけに書かれているかを検査する（#101）。
// 最後に、生成済みカードページの日本語効果文に「ハイライトされていない用語」が残っていないかを
// 検査する（用語ハイライトの語形ずれ・片方向）。⚠ この検査だけ非同期（並列読み込み）。
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
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

// --- CLAUDE.md に現在形の公開状態を書かせない検査（未採番・未公開注記の陳腐化 B2） -------
// 「⚠ 未pushなので本番にはまだ出ていない」という注記が CLAUDE.md に10箇所あり、10箇所とも
// 誤りだった。誤記ではなく陳腐化で、「push していない ⇒ 本番に出ていない」という推論が
// 2026-08-27 の経路②（wrangler pages deploy）で成立しなくなったことが原因。以後、経路②で
// 公開するたびに、この形の注記は書いた本人に無断で誤りへ変わる（09-06 / 09-09 / 09-17 と
// 人は3回続けて気づかずに同じ形を書き足した＝規約では止まらなかった）。
// ⚠ 真偽は検査できない。本番位置 P はネットワークと Cloudflare トークンが要り、索引 §3 が
//   「書かずに測る」と決めている。しかもローカルで測れる origin/main..HEAD は（GitHub 停止中は
//   常に）真なので、素朴な検査は誤りを緑で追認する。→ LINEREF と同じく「書き方そのもの」を禁じる。
// ⚠ 走査するのは CLAUDE.md だけ。docs/ は対象外にする——設計書・工程記録・起票案は「その時点の
//   実測」を書く文書なので、古くなっても誤りではない（LINEREF が docs/ を除外しているのと同じ理屈）。
//   本件の起票案だけでこの文言を7回引用しており、広げると本件の記録自体が落ちる。
// ⚠ 「未push」を含まない行は見ない（裁定①）。「push」と「本番公開」の同居は CLAUDE.md に
//   7行あり、いずれも正当な運用説明（「mainへのpushは…そのまま本番公開になる」など）。
//   逆に完全一致だけにすると「未pushなので本番には出ていません」で抜けられる。
// ⚠ 否定語が無い行も見ない。push待ち の目的説明（「未pushの本番配信物が、issueを見ただけで
//   分かる」）は正当な記述で、落としてはいけない。
// ⚠ 抽出に失敗したときに「合格」へ倒さないこと（#40・#70・LINEREF と同じ方針）。読めない・
//   マーカーが0組／2組以上・END が先・マーカーが行頭・マーカー間が空 のすべてを exit 1 にする。
const PUBSTATE_FILE = "CLAUDE.md";
const PUBSTATE_START = "<!-- PUBSTATE-NOTE:START -->";
const PUBSTATE_END = "<!-- PUBSTATE-NOTE:END -->";
// 「未push」と同じ行に同居したら落とす語（裁定①）
const PUBSTATE_DENY = ["本番にはまだ出ていない", "本番にまだ出ていない", "未公開", "公開されていない", "出ていません"];
{
  const bad = [];
  const hits = [];
  let text = null;
  try {
    text = readFileSync(path.join(root, PUBSTATE_FILE), "utf8");
  } catch (e) {
    bad.push(`${PUBSTATE_FILE} の読み込みに失敗: ${e.message} — 走査対象の指定が陳腐化しています`);
  }
  if (text !== null) {
    // ⚠ 出現数まで数える（CRON-ADD の S1 と同型）。2組目に古い案内を残すと黙って通る
    const countOf = (needle) => text.split(needle).length - 1;
    const sn = countOf(PUBSTATE_START);
    const en = countOf(PUBSTATE_END);
    const lines = text.split(/\r?\n/);
    if (sn === 0 || en === 0) {
      bad.push(`${PUBSTATE_FILE} に注記ブロックのマーカーがありません（START ${sn}個 / END ${en}個）— 案内ごと消えています`);
    } else if (sn !== 1 || en !== 1) {
      bad.push(`${PUBSTATE_FILE} に注記ブロックのマーカーが複数あります（START ${sn}個 / END ${en}個）— 1組だけにしてください`);
    } else {
      const s = text.indexOf(PUBSTATE_START);
      const t = text.indexOf(PUBSTATE_END);
      if (t < s) {
        bad.push(`${PUBSTATE_FILE} の注記ブロックのマーカーが逆順です（END が START より前）`);
      } else if (!text.slice(s + PUBSTATE_START.length, t).trim()) {
        bad.push(`${PUBSTATE_FILE} の注記ブロックのマーカー間が空です — 案内の中身が消えています`);
      }
      // ⚠ マーカーを行頭に置くと CommonMark の HTMLブロック(type 2)に入り、その行の Markdown が
      //   死ぬ（#70 の実測）。⚠ 実測（2026-09-20・GitHub の /markdown API）では「- <!-- … -->本文」
      //   のようにリストの記号だけが前にある場合も同じく死ぬ（**強調** が生のまま・`code` が
      //   <code> にならない）ので、記号だけの前置きも行頭として落とす。見た目では気づけない。
      for (const marker of [PUBSTATE_START, PUBSTATE_END]) {
        lines.forEach((line, i) => {
          const col = line.indexOf(marker);
          if (col < 0) return;
          // 前置きから空白とリスト/引用の記号を除いて、何も残らなければ行頭扱い
          const before = line.slice(0, col).replace(/^[\s>]*(?:[-*+]|\d+[.)])?\s*/, "");
          if (!before.trim()) {
            bad.push(`${PUBSTATE_FILE}:${i + 1} — マーカー ${marker} が行頭にあります（その行の Markdown が死にます）`);
          }
        });
      }
    }

    // 判定はマーカーの内側を除いた各行。ブロックが壊れているときは除外せず全行を見る
    const inBlock = (idx) => {
      if (sn !== 1 || en !== 1) return false;
      const s = text.indexOf(PUBSTATE_START);
      const t = text.indexOf(PUBSTATE_END);
      if (t < s) return false;
      let off = 0;
      for (let i = 0; i < idx; i++) off += lines[i].length + 1;
      return off + lines[idx].length > s && off < t + PUBSTATE_END.length;
    };
    lines.forEach((line, i) => {
      if (!line.includes("未push")) return;
      if (inBlock(i)) return;
      const word = PUBSTATE_DENY.find((w) => line.includes(w));
      if (!word) return;
      const snippet = line.trim().length > 60 ? `${line.trim().slice(0, 60)}…` : line.trim();
      hits.push(`${PUBSTATE_FILE}:${i + 1} — 「未push」と「${word}」が同居: ${snippet}`);
    });
  }

  if (hits.length) {
    bad.push(`公開状態の主張: ${hits.length}件`);
    // 件数が多いときも先頭20件だけ出す（LINEREF と同じ）
    hits.slice(0, 20).forEach((h) => bad.push(`  ${h}`));
    if (hits.length > 20) bad.push(`  …ほか ${hits.length - 20}件`);
  }

  if (bad.length) {
    problems++;
    console.error(`\nPUBLICATION STATE CLAIMS (${PUBSTATE_FILE}):`);
    bad.forEach((m) => console.error(`  - ${m}`));
    console.error(`  → 公開状態は CLAUDE.md に書かないでください。経路②があるので、pushの状態から公開状態は導けません`);
    console.error(`    測り方は docs/design/待ち行列/待ち行列と復旧手順.md §3（本番位置 P を測って祖先判定）`);
  } else {
    console.log(`no publication-state claims in ${PUBSTATE_FILE} — 0件（注記ブロック1組）`);
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

  // --- (iii) トークン色の rgb()/rgba() リテラルが残っていないか（#105） ---
  // トークンと同じ色を手で書いたリテラルは、トークンを変えた日にそれだけが古い色で残る。
  // 画面は壊れず警告も出ない（fail-open）ので、ここで人を止める。
  // ⚠ 直し方は color-mix(in srgb, var(--トークン) N%, transparent)。
  //   rgba(var(--accent), .08) は成立せず、ページCSSの :root への派生色の定義は (ii) が落とす。
  // ⚠ 生成CSS（cards.css / tournaments.css）は生成元を直さないと次のビルドで戻る。だから生成元も走査する。
  // ⚠ ⭐ 生成元の .mjs はコメントを除去せず生テキストで走査する（#117: JS のコメント除去は
  //   行コメント中の /* を後方の */ と誤対応させて計609行を検査から消していた。そもそもパースしない）。
  //   代わりに「生成元の .mjs にはトークン色のリテラルをコメントにも書かない」という規約が1つ増える。
  // ⚠ hex の直書き（color: #fca5a5）はこの検査の視野の外。緑を「全部トークン参照になった」と読まないこと。
  const CSS_GENERATORS = {
    "scripts/build-tournament-pages.mjs": "tournaments/tournaments.css",
    "scripts/build-card-pages.mjs": "cards/cards.css",
    "scripts/gen-element-orbs-css.mjs": "shared/css/element-orbs.css",
  };
  const bad3 = [];
  let scannedGen = 0;
  {
    // 行番号を保つコメント除去（既存の stripComments は改行ごと潰すので位置が出せない）
    const stripKeepLines = (t) => t.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
    const hexRgb = (v) => {
      const t = String(v).trim().replace(/^#/, "");
      if (!/^([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(t)) return null;
      const f = t.length === 3 ? t.split("").map((c) => c + c).join("") : t;
      return [parseInt(f.slice(0, 2), 16), parseInt(f.slice(2, 4), 16), parseInt(f.slice(4, 6), 16)].join(",");
    };
    // rel の :root が定義するトークンのうち、hex で書かれたものを "r,g,b" → 名前 で引けるようにする
    const rootColorsCache = new Map();
    const rootColorsOf = (rel) => {
      if (rootColorsCache.has(rel)) return rootColorsCache.get(rel);
      let map = null;
      try {
        const src = stripComments(readFileSync(path.join(root, rel), "utf8"));
        const m = src.match(/:root\b[^{};]*\{([\s\S]*?)\}/);
        map = new Map();
        if (m) for (const d of m[1].matchAll(/(--[A-Za-z0-9_-]+)\s*:\s*([^;]+)/g)) {
          const k = hexRgb(d[2]);
          if (k) map.set(k, d[1]);
        }
      } catch (e) {
        bad3.push(`${rel} を読めません: ${e.message}`);
      }
      rootColorsCache.set(rel, map);
      return map;
    };
    // そのファイルを支配する :root の出所（§3 の表と同じ導出。新しい一覧は作らない）
    const ownerOf = (rel) => (ROOT_OWNERS.includes(rel) ? rel : TOKENS_FILE);
    const LITERAL = /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*[,)]/gi;
    const scan = (rel, text, owner) => {
      const colors = rootColorsOf(owner);
      if (!colors) return;
      if (!colors.size) { bad3.push(`${owner} の :root に hex のトークンが1つもありません — 走査の基準が壊れています`); return; }
      text.split("\n").forEach((ln, i) => {
        for (const m of ln.matchAll(LITERAL)) {
          const key = [m[1], m[2], m[3]].map(Number).join(",");
          const tok = colors.get(key);
          if (tok) bad3.push(`${rel}:${i + 1} — ${m[0]}… は ${owner} の ${tok} と同じ色です`);
        }
      });
    };
    for (const rel of cssFiles) {
      let raw;
      try { raw = readFileSync(path.join(root, rel), "utf8"); } catch (e) { bad3.push(`${rel} を読めません: ${e.message}`); continue; }
      scan(rel, stripKeepLines(raw), ownerOf(rel));
    }
    for (const [gen, produced] of Object.entries(CSS_GENERATORS)) {
      let raw;
      try { raw = readFileSync(path.join(root, gen), "utf8"); } catch (e) { bad3.push(`生成元 ${gen} を読めません: ${e.message}`); continue; }
      scannedGen++;
      scan(gen, raw, ownerOf(produced)); // ⭐ 生テキスト（コメントも走査する）
    }
    if (scannedGen !== Object.keys(CSS_GENERATORS).length) bad3.push(`生成元を ${scannedGen} ファイルしか走査できませんでした`);

    // ⭐ 迷子検査: CSS_GENERATORS は片側だけの手書き一覧なので、そのままでは「消せば黙る」。
    //   scripts/ の .mjs のうち「writeFileSync を呼び、かつ .css の文字列リテラルを持つ」ファイルの集合が
    //   CSS_GENERATORS のキーと一致することを見る（増えても減っても落とす）。両辺が別ファイルなので空回りしない。
    const mjs = [];
    const walkScripts = (rel) => {
      const abs = path.join(root, rel);
      let st;
      try { st = statSync(abs); } catch { return; }
      if (st.isDirectory()) {
        for (const d of readdirSync(abs, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) walkScripts(`${rel}/${d.name}`);
      } else if (rel.endsWith(".mjs")) mjs.push(rel);
    };
    walkScripts("scripts");
    if (!mjs.length) bad3.push("scripts/ の .mjs が1つもありません — 迷子検査の走査範囲が陳腐化しています");
    const writers = mjs.filter((rel) => {
      const t = readFileSync(path.join(root, rel), "utf8");
      return /writeFileSync\s*\(/.test(t) && /["'][^"']*\.css["']/.test(t);
    });
    const listed = Object.keys(CSS_GENERATORS).sort();
    const found = [...writers].sort();
    found.filter((f) => !listed.includes(f)).forEach((f) => bad3.push(`.css を書き出すのに CSS_GENERATORS に無い: ${f}`));
    listed.filter((f) => !found.includes(f)).forEach((f) => bad3.push(`CSS_GENERATORS にあるのに .css を書き出していない: ${f}`));
  }

  // --- (iv) フォールバック無しの var(--X) が、そのファイルを支配する :root に在るか（#105） ---
  // ⚠ 本タスクは自分で穴を1つ開ける: tournaments.css の :root に --accent-3 / --yes を足して
  //   同ファイルから参照するが、(i) は shared/css/** しか見ないので、消えても何も止まらない。
  //   消えると var() が IACVT → unset になり、背景が透明・枠線が currentColor になる（fail-open）。
  // ⚠ var(--X, 既定値) の形は見ない。--printbar-h / --editor-bar-h / --pane-top の3つは
  //   JS が実行時に書き込む変数で、:root に定義されないのが正しい（落とすと必ず exit 1 になる）。
  // ⚠ 限界: 「:root に在るか」しか見ない。値が正しいか・そのページが実際にそのCSSを読むかは見ない。
  const bad4 = [];
  let varRefs = 0;
  {
    const nameCache = new Map();
    const namesOf = (rel) => {
      if (nameCache.has(rel)) return nameCache.get(rel);
      let set = null;
      try {
        const src = stripComments(readFileSync(path.join(root, rel), "utf8"));
        const m = src.match(/:root\b[^{};]*\{([\s\S]*?)\}/);
        set = new Set();
        if (m) for (const d of m[1].matchAll(/(--[A-Za-z0-9_-]+)\s*:/g)) set.add(d[1]);
      } catch (e) {
        bad4.push(`${rel} を読めません: ${e.message}`);
      }
      nameCache.set(rel, set);
      return set;
    };
    for (const rel of cssFiles) {
      const owner = ROOT_OWNERS.includes(rel) ? rel : TOKENS_FILE;
      const names = namesOf(owner);
      if (!names) continue;
      if (!names.size) { bad4.push(`${owner} の :root にトークンの定義がありません`); continue; }
      const src = stripComments(readFileSync(path.join(root, rel), "utf8"));
      for (const m of src.matchAll(/var\(\s*(--[A-Za-z0-9_-]+)\s*([,)])/g)) {
        if (m[2] !== ")") continue; // フォールバック付きは対象外
        varRefs++;
        if (!names.has(m[1])) bad4.push(`${rel} — ${m[1]} が ${owner} の :root にありません`);
      }
    }
    if (!varRefs) bad4.push("フォールバック無しの var(--…) が1つも見つかりません — 走査が空回りしています");
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

  if (bad3.length) {
    problems++;
    console.error(`\nTOKEN-COLORED CSS LITERALS:`);
    bad3.forEach((m) => console.error(`  - ${m}`));
    console.error(`  → color-mix(in srgb, var(--トークン) N%, transparent) に直してください`);
    console.error(`    （rgba(var(--x), .08) は成立せず、ページCSSの :root に派生色を定義するのも :root owners が落とします）`);
    console.error(`    生成CSS（${Object.values(CSS_GENERATORS).join(" / ")}）は生成元を直してから再生成してください`);
    console.error(`    生成元を増減したときは scripts/validate.mjs の CSS_GENERATORS も同時に直してください`);
  } else {
    console.log(`no token-colored rgb() literals — 0件（${cssFiles.length}ファイル + 生成元${scannedGen}ファイル走査 / :root出所 ${ROOT_OWNERS.length}）`);
  }

  if (bad4.length) {
    problems++;
    console.error(`\nCSS VAR REFS:`);
    bad4.forEach((m) => console.error(`  - ${m}`));
    console.error(`  → 参照するトークンは、そのCSSを支配する :root に定義してください`);
    console.error(`    （解決できない var() は IACVT → unset になり、背景が透明・枠線が currentColor になります）`);
    console.error(`    JS が実行時に書き込む変数は var(--x, 既定値) の形で参照してください（フォールバック付きは対象外）`);
  } else {
    console.log(`css var refs resolve — 未定義0（${cssFiles.length}ファイル走査 / フォールバック無し ${varRefs}参照）`);
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
// ⚠ ⭐ 2026-09-16 に①の期待値が「0ファイル（どのページも渡さない）」に変わった
//   （検索結果のタブ化_設計 §8-5・§8-5-1・§8-6）。デッキ構築の✕は再検索しなくなったので、
//   渡してよいページが無くなった＝非対称そのものが消えた。
//   ⚠️ ⭐ それでも検査は消さない——消すと後から誰かが渡したときに止まらなくなる
//   （＝1回の✕でAPI検索が2回走る状態に無言で戻る）。⭐ 許可リストが空でも検査の目的は変わらない。
const UI_PAGES = [
  { name: "トップ", js: "app.js", css: "style.css" },
  { name: "デッキ構築", js: "tools/deck-builder/app.js", css: "tools/deck-builder/style.css" },
];
// ①の走査範囲（ブラウザに配られるページコード）。⚠ scripts/ は入れない——ビルドスクリプトは
//   絞り込みUIを組み立てないうえ、この検査自身が識別子を文字列で持つため自己検出になる。
const REMOVEONE_ROOTS = ["app.js", "shared/js", "tools", "functions"];
const REMOVEONE_EXCLUDE = ["shared/vendor"];
// ⚠ 増やすときは「そのページの群側 onChange が再検索しないこと」を実測してから足す。
// ⭐ 2026-09-16〜 空（どのページも渡さない）。デッキ構築の✕は「何も起きない」が正になったため
//   （検索結果のタブ化_設計 §2-3 のユーザー決定 → §8-5・§8-6）。
const REMOVEONE_ALLOW = [];
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
    console.log(`onRemoveOne wiring in sync — 渡しているのは ${passers.length}ファイル（${passers.join(" / ") || "なし"}）／${jsTargets.length}ファイル走査`);
    console.log(`pane threshold in sync — ${paneLog.length}ページ（${paneLog.join(" / ")}）`);
    console.log(`mobile band marker in sync — ${bandLog.length}組（${bandLog.join(" / ")}）`);
  }
}

// --- 版レベルの絞り込み項目の配線検査（#93） -------------------------------
// shared/js/card-search.js の MULTI は「第3要素が null ＝ 版レベル（editions[] を見る）」で、
// 一般ループは isIndexBlind() で読み飛ばす。ところが第2段（rarityMatchesIn / matchesAndFilters）は
// キー名 rarity を名指ししているので、版レベル項目を2つ目に足しても・rarity を改名しても、
// 「選んでも1件も落ちないのに警告も注記も出ない」状態になる（実測済み・fail-open）。
//
// ⚠ ブラウザ側では落とさない（throw すると window.GA_CARD_SEARCH が undefined になり、
//   app.js 冒頭の分割代入が TypeError で落ちてトップもデッキ構築も丸ごと死ぬ＝実測）。
//   落とすのはこの validate の中だけ。
// ⚠ 字句検査にしない。vm で本物のモジュールを読み、MULTI から導いた INDEX_BLIND_KEYS を
//   そのまま読む（#108 と同じ「実物を動かして測る」方針。整形で壊れない）。
// ⚠ 許可リストの照合だけでは空回りする。第2段の呼び出しを消しても MULTI は無傷なので
//   照合は緑のまま絞り込みだけが死ぬ。だから「実際に絞れること」を行動で確かめる（下の F1/F2）。
// ⚠ ネットワークは使わない。fetch はフィクスチャを返すスタブで塞ぐ。

// ⚠ 増やすときは第2段（rarityMatchesIn）の一般化とセット。表だけ増やすと無言で効かなくなる（#93）
const INDEX_BLIND_ALLOW = ["rarity"];

// 行動フィクスチャ用のカード3枚。a・b はレアリティ3、c は8。和名の「ー」で JPモードを作る。
// ⚠ 許可リストにあるのにフィクスチャが無いキーは exit 1（fail-closed）。将来2つ目の版レベル
//   項目を足した人は「検査がその項目の判定の仕方を知らない」と言われて必ず止まる＝本件の目的。
const IB_CARDS = {
  a: { slug: "a", name: "Alpha", editions: [{ slug: "a-1", rarity: 3 }] },
  b: { slug: "b", name: "Bravo", editions: [{ slug: "b-1", rarity: 3 }] },
  c: { slug: "c", name: "Charlie", editions: [{ slug: "c-1", rarity: 8 }] },
};
const IB_JP = { a: { name: "アルファ" }, b: { name: "ブラボー" }, c: { name: "チャーリー" } };
const ibChip = (values, mode) => ({ getValues: () => values, getMode: () => mode });
const INDEX_BLIND_FIXTURES = {
  rarity: [
    // F1: JPモード（matchesActiveFilters が判定する経路）。名前「ー」で候補は b・c の2枚。
    //     rarity=3（OR）なので c が落ちて b だけが残る。
    // ⚠ metaIndexUrl は null にする。索引があると候補が畳まれ、第2段だけを裸で測れない
    { label: "F1（JPモード・OR）", expect: ["b"], els: { name: { value: "ー" }, rarity: ibChip(["3"], "OR") } },
    // F2: ENモード AND（matchesAndFilters が判定する経路）。偽APIは rarity を解釈して a・b を
    //     返すが、どのカードも3と8の両方では刷られていないので0件になる。
    { label: "F2（ENモード・AND）", expect: [], els: { rarity: ibChip(["3", "8"], "AND") } },
  ],
};

{
  const bad = [];
  const CS_FILE = "shared/js/card-search.js";
  let search = null;
  try {
    const sb = { console, setTimeout, clearTimeout, URLSearchParams };
    sb.window = sb;
    sb.GA_I18N = { meta: { sets: [] }, terms: {}, cards: IB_JP };
    sb.GA_CARD_I18N = {
      hasJapanese: (s) => /[ぁ-んァ-ヶ一-龠ー]/.test(String(s || "")),
      bannedFormats: () => [],
      loadEffects: () => Promise.resolve(),
    };
    // 偽の公式API。実物と同じく rarity は解釈し、知らないパラメータは無視する。
    // ⚠ 外へ出ない（validate はオフライン前提）
    sb.fetch = (url) => {
      const q = new URLSearchParams(String(url).split("?")[1] || "");
      const want = q.getAll("rarity");
      const data = Object.values(IB_CARDS).filter(
        (c) => !want.length || c.editions.some((e) => want.includes(String(e.rarity)))
      );
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data, total_cards: data.length, has_more: false }),
      });
    };
    vm.createContext(sb);
    vm.runInContext(readFileSync(path.join(root, CS_FILE), "utf8"), sb, { filename: "card-search.js" });
    search = sb.window.GA_CARD_SEARCH;
    if (!search || typeof search.create !== "function") throw new Error("GA_CARD_SEARCH が組み立てられていません");
  } catch (e) {
    // ⚠ 素の例外でクラッシュさせない。原因が分かる1行を出してから problems に数える
    bad.push(`モジュールを読み込めません: ${e.message}`);
  }

  // (b) 版レベル項目の集合と許可リストの双方向の一致
  // ⚠ 片方向にしない。「rarity を別名に改名した」（個数は1のまま）も落とすため
  let keys = null;
  if (search) {
    keys = search.INDEX_BLIND_KEYS;
    if (!Array.isArray(keys)) {
      bad.push("INDEX_BLIND_KEYS が配列ではありません（公開されていない／形が変わった）");
      keys = null;
    } else if (!keys.length) {
      bad.push("INDEX_BLIND_KEYS が空です（MULTI から版レベル項目が消えた？）");
      keys = null;
    }
  }
  if (keys) {
    for (const k of keys) {
      if (!INDEX_BLIND_ALLOW.includes(k)) {
        bad.push(`許可リストに無い版レベル項目: ${k} — 第2段（rarityMatchesIn）は評価しないので無言で効かなくなります`);
      }
    }
    for (const k of INDEX_BLIND_ALLOW) {
      if (!keys.includes(k)) {
        bad.push(`許可リストにあるのに MULTI の版レベル項目に無い: ${k} — 改名か削除の疑い（第2段は今もこの名前を名指ししています）`);
      }
    }
  }

  // (c) 行動フィクスチャ — 許可リストの各キーが「実際に絞れる」ことを本物の create()/run() で確かめる
  let fixtureCount = 0;
  if (search) {
    for (const key of INDEX_BLIND_ALLOW) {
      const fixtures = INDEX_BLIND_FIXTURES[key];
      if (!Array.isArray(fixtures) || !fixtures.length) {
        bad.push(`${key} の行動フィクスチャがありません — この項目が実際に絞れるかを検査できません（fail-closed）`);
        continue;
      }
      for (const f of fixtures) {
        fixtureCount++;
        let got;
        try {
          got = await new Promise((resolve, reject) => {
            const ctl = search.create({
              els: f.els,
              metaIndexUrl: null,
              fetchCard: (s) => Promise.resolve(IB_CARDS[s] || null),
              onResults: (cards) => resolve(cards.map((c) => c.slug)),
              onError: (err) => reject(err),
            });
            ctl.run(true);
          });
        } catch (e) {
          bad.push(`${key} の行動フィクスチャ ${f.label} が失敗しました: ${e.message}`);
          continue;
        }
        const exp = f.expect.join(",");
        const act = [...got].sort().join(",");
        if (exp !== act) {
          bad.push(
            `${key} の行動フィクスチャ ${f.label} が期待どおり絞っていません（期待 [${exp}] / 実際 [${act}]）` +
            ` — 第2段の判定が効いていません`
          );
        }
      }
    }
  }

  if (bad.length) {
    problems++;
    console.error(`\nINDEX-BLIND FILTER WIRING (${CS_FILE}):`);
    bad.forEach((m) => console.error(`  - ${m}`));
    console.error(`  → 版レベル項目（MULTI の第3要素が null）を足すときは、第2段の判定も一般化してください。`);
    console.error(`    表だけ足すと「選んでも1件も落ちない」状態になり、警告も注記も出ません（#93）`);
  } else {
    console.log(`index-blind filters in sync — ${keys.length}項目（${keys.join(" / ")}）／行動フィクスチャ ${fixtureCount}組`);
  }
}

// --- preferredArtIndex が1か所だけで定義されていることの検査（#97） ----------
// 「版レベルの絞り込みに一致する版のイラストを初期表示にする」規則(#41)は、かつて
// app.js と tools/deck-builder/app.js に同じ5行で二重定義されていた。片方だけ直すと
// 画面によって別の絵柄が出るのに、どちらも動くので誰も気づけない（実際に、デッキ構築の
// カード詳細モーダルだけが絞り込みに追従しない状態が長く残った＝#97）。
//
// ⚠ #101（0件文言）のような字面検査は使えない。文言ではなく規則なので、同じ字面で
//   書き直すとは限らない。だから3段にする:
//   (a) 定義の一意性  … 走査範囲の .js/.mjs に function preferredArtIndex が現れるファイルの集合
//                       ↔ 許可リスト（双方向。足しても・消しても・改名しても落ちる）
//   (b) 条件キーの一致 … vm で本物を読んだ ART_COND_KEYS ↔ 許可リスト（双方向）
//   (c) 行動フィクスチャ … 本物の preferredArtIndex() に合成 imgs[] を通した結果 ↔ 期待値
//                       （(a)(b) を通しても中身を骨抜きにできないようにする）
//
// ⚠ ⭐ (a) は生テキストに当てる。stripJs を再利用しないこと——あれは app.js の
//   60〜335行（行コメント中の data/tl/*.js の /* が 335行目の */ と対になる）を丸ごと
//   消すので、その範囲に再定義されても見逃す（#97 設計書 §2-4）。
//   ⭐ 生テキストで誤検出が無いことは実測済み（現在のヒットは削除対象の2箇所だけだった）。
// ⚠ 走査範囲は①（onRemoveOne）と同じ定数を使い回す。成功行のファイル数が一致するのはそのため。
const ART_DEFINE_ALLOW = ["shared/js/card-search.js"];
// ⚠ 増やすときは ART_COND の表と、下の行動フィクスチャをセットで足す。
//   表だけ足すと「その項目では絵柄が追従しない」状態に無言でなる（#93 と同じ型）。
const ART_COND_ALLOW = ["set", "rarity"];
// 行動フィクスチャ。imgs は [{prefix, rarity}, …]、cond は preferredArtIndex の第2引数。
// ⚠ 組数を増減させたら成功行の期待値も直すこと。
// ⚠ ART_COND_ALLOW の各キーは「そのキーだけで先頭以外が選ばれる」ケースを1つ以上持つこと
//   （fail-closed。許可リストに足して黙らせる逃げ道を塞ぐ）。
const ART_FIXTURES_BY_KEY = {
  set: [
    { label: "F2（set キーが効く）", imgs: [{ prefix: "A", rarity: 1 }, { prefix: "B", rarity: 2 }, { prefix: "C", rarity: 3 }], cond: { prefixes: ["B"] }, expect: 1 },
  ],
  rarity: [
    { label: "F3（rarity キーが効く）", imgs: [{ prefix: "A", rarity: 1 }, { prefix: "B", rarity: 2 }, { prefix: "C", rarity: 3 }], cond: { rarities: ["3"] }, expect: 2 },
    { label: "F6（rarity が null の版は選ばない）", imgs: [{ prefix: "A", rarity: null }, { prefix: "B", rarity: 2 }], cond: { rarities: ["2"] }, expect: 1 },
  ],
};
const ART_FIXTURES_COMMON = [
  { label: "F1（条件なし → 先頭）", imgs: [{ prefix: "A", rarity: 1 }, { prefix: "B", rarity: 2 }], cond: {}, expect: 0 },
  // ⚠ F4 は「AND が OR に退化していないか」を見る唯一のケース（every → some にすると 0 を返す）
  { label: "F4（AND・片方だけ一致する版を選ばない）", imgs: [{ prefix: "A", rarity: 9 }, { prefix: "B", rarity: 1 }, { prefix: "A", rarity: 1 }], cond: { prefixes: ["A"], rarities: ["1"] }, expect: 2 },
  { label: "F5（一致が無ければ先頭へフォールバック）", imgs: [{ prefix: "A", rarity: 1 }, { prefix: "B", rarity: 2 }], cond: { prefixes: ["Z"] }, expect: 0 },
];

{
  const bad = [];
  const CS_FILE = "shared/js/card-search.js";

  // ---- (a) 定義の一意性（生テキスト・双方向） ----
  const artTargets = [];
  const artExcluded = (rel) => REMOVEONE_EXCLUDE.some((p) => rel === p || rel.startsWith(`${p}/`));
  const artWalk = (rel) => {
    if (artExcluded(rel)) return;
    let st;
    try {
      st = statSync(path.join(root, rel));
    } catch (e) {
      bad.push(`${rel} を読めません: ${e.message} — 走査対象の指定が陳腐化しています`);
      return;
    }
    if (st.isDirectory()) {
      for (const d of readdirSync(path.join(root, rel), { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
        artWalk(`${rel}/${d.name}`);
      }
    } else if (/\.(?:js|mjs)$/.test(rel)) {
      artTargets.push(rel);
    }
  };
  for (const r of REMOVEONE_ROOTS) artWalk(r);
  if (!artTargets.length) bad.push("走査対象の .js が1つもありません — REMOVEONE_ROOTS が陳腐化しています");

  const DEFINE_RE = /function\s+preferredArtIndex\s*\(/;
  const definers = artTargets.filter((rel) => DEFINE_RE.test(readFileSync(path.join(root, rel), "utf8")));
  const defAllow = [...ART_DEFINE_ALLOW].sort();
  const defFound = [...definers].sort();
  for (const f of defFound) {
    if (!defAllow.includes(f)) {
      bad.push(`許可されていない場所に preferredArtIndex が定義されています: ${f} — 規則は ${CS_FILE} の1本だけです`);
    }
  }
  for (const f of defAllow) {
    if (!defFound.includes(f)) {
      bad.push(`許可リストにあるのに preferredArtIndex の定義がありません: ${f} — 改名か削除の疑い（呼び出し側は今もこの名前を呼んでいます）`);
    }
  }

  // ---- (b)(c) 本物のモジュールを vm で読んで確かめる ----
  // ⚠ 字句検査にしない（#93・#108 と同じ「実物を動かして測る」方針。整形では壊れない）。
  // ⚠ ネットワークは使わない。create() を呼ばないので fetch も要らない。
  let artSearch = null;
  try {
    const sb = { console, setTimeout, clearTimeout, URLSearchParams };
    sb.window = sb;
    sb.GA_I18N = { meta: { sets: [] }, terms: {}, cards: {} };
    sb.GA_CARD_I18N = {
      hasJapanese: () => false,
      bannedFormats: () => [],
      loadEffects: () => Promise.resolve(),
    };
    vm.createContext(sb);
    vm.runInContext(readFileSync(path.join(root, CS_FILE), "utf8"), sb, { filename: "card-search.js" });
    artSearch = sb.window.GA_CARD_SEARCH;
    if (!artSearch || typeof artSearch.preferredArtIndex !== "function") {
      throw new Error("preferredArtIndex が公開されていません");
    }
    if (typeof artSearch.artCondOf !== "function") {
      throw new Error("artCondOf が公開されていません");
    }
  } catch (e) {
    bad.push(`モジュールを読み込めません: ${e.message}`);
    artSearch = null;
  }

  let condKeys = null;
  if (artSearch) {
    condKeys = artSearch.ART_COND_KEYS;
    if (!Array.isArray(condKeys)) {
      bad.push("ART_COND_KEYS が配列ではありません（公開されていない／形が変わった）");
      condKeys = null;
    } else if (!condKeys.length) {
      bad.push("ART_COND_KEYS が空です（ART_COND から版レベル項目が消えた？）");
      condKeys = null;
    }
  }
  if (condKeys) {
    for (const k of condKeys) {
      if (!ART_COND_ALLOW.includes(k)) {
        bad.push(`許可リストに無い版レベルの絵柄条件: ${k} — 行動フィクスチャが無いので「実際に効くか」を検査できません`);
      }
    }
    for (const k of ART_COND_ALLOW) {
      if (!condKeys.includes(k)) {
        bad.push(`許可リストにあるのに ART_COND に無い条件キー: ${k} — 改名か削除の疑い（その項目では絵柄が追従しなくなります）`);
      }
    }
  }

  // (c) 行動フィクスチャ。⚠ 許可リストのキーに専用フィクスチャが無ければ exit 1（fail-closed）
  let artFixtureCount = 0;
  if (artSearch) {
    const runOne = (f) => {
      artFixtureCount++;
      let got;
      try {
        got = artSearch.preferredArtIndex(f.imgs, f.cond);
      } catch (e) {
        bad.push(`行動フィクスチャ ${f.label} が失敗しました: ${e.message}`);
        return;
      }
      if (got !== f.expect) {
        bad.push(`行動フィクスチャ ${f.label} が期待どおりの版を選んでいません（期待 ${f.expect} / 実際 ${got}）`);
      }
    };
    for (const key of ART_COND_ALLOW) {
      const fixtures = ART_FIXTURES_BY_KEY[key];
      if (!Array.isArray(fixtures) || !fixtures.length) {
        bad.push(`${key} の行動フィクスチャがありません — この項目で実際に絵柄が追従するかを検査できません（fail-closed）`);
        continue;
      }
      // ⚠ 「先頭が選ばれる」だけのケースは、規則が死んでいても通ってしまう
      if (!fixtures.some((f) => f.expect !== 0)) {
        bad.push(`${key} の行動フィクスチャが「先頭以外が選ばれる」ケースを持っていません（fail-closed）`);
      }
      fixtures.forEach(runOne);
    }
    ART_FIXTURES_COMMON.forEach(runOne);
  }

  if (bad.length) {
    problems++;
    console.error(`\nPREFERRED ART INDEX SINGLE SOURCE (${CS_FILE}):`);
    bad.forEach((m) => console.error(`  - ${m}`));
    console.error(`  → 「絞り込みに一致する版のイラストを初期表示にする」規則は ${CS_FILE} に1本だけ置きます。`);
    console.error(`    ページ側（app.js / tools/deck-builder/app.js）へコピーで戻すと、片方だけ直したときに`);
    console.error(`    画面によって別の絵柄が出ます。どちらも動くので人の目では気づけません（#97）`);
  } else {
    console.log(
      `preferredArtIndex is single-sourced — 定義 ${definers.length}ファイル（${definers.join(" / ") || "なし"}）`
      + `／条件キー ${condKeys ? condKeys.length : 0}項目（${condKeys ? condKeys.join(" / ") : "不明"}）`
      + `／行動フィクスチャ ${artFixtureCount}組／${artTargets.length}ファイル走査`
    );
  }
}

// --- 版の正規順序が全順序であることの検査（#108） ---------------------------
// scripts/lib/edition-order.mjs の editionOrder() は5段の全順序で、1段でも削ると
// 公式APIの editions 配列順が生成物に漏れる（中身が変わらない日に差分が出る＝#71 の正体）。
// 守っていたのはコメントだけだったので、ここで止める。
//
// ⚠ 比較器は build-card-pages.mjs から import しないこと。あれは import しただけで
//   カード2,495ページのビルドが走る（だから scripts/lib/edition-order.mjs へ切り出した）。
// ⚠ fail-open にしない。合成フィクスチャ（案A）はスナップショットが無くても必ず走る。
//   スナップショットを使う実データ走査（案B）だけがスキップされ、それは成功行に明記する。
// ⭐ 案A と案B は目的が違う: 案A は「人が比較器を簡略化した」、案B は「データが最終決着キー
//   （版slug）の一意性を破った」を捕まえる。実測では案B の検出力は5キー中1キーだけなので、
//   案B を本体にしてはいけない（K1〜K4 を削っても実データの同値ペアは0組のまま）。
if (loaded) {
  const bad = [];
  const dataBad = [];
  const dataExamples = [];
  let editionOrder = null;
  let setOrder = null;
  try {
    const mod = await import("./lib/edition-order.mjs");
    setOrder = mod.makeSetOrder((loaded.meta && loaded.meta.sets) || []).setOrder;
    editionOrder = mod.makeEditionOrder(setOrder);
    if (typeof editionOrder !== "function") throw new Error("makeEditionOrder() が関数を返しません");
  } catch (e) {
    // ⚠ 素の例外でクラッシュさせない。原因が分かる1行を出してから problems に数える
    bad.push(`比較器を読み込めません: ${e.message}`);
  }

  // K2 のフィクスチャには order の異なる prefix が2つ要る。
  // ⚠ 取れないまま黙って K2 を飛ばすと、そこだけ無検査になる（fail-closed にする）。
  let prefixLow = null;
  let prefixHigh = null;
  if (editionOrder) {
    const prefixes = [];
    for (const st of (loaded.meta && loaded.meta.sets) || []) {
      for (const pfx of st.prefixes || []) prefixes.push(pfx);
    }
    const ranked = [...new Set(prefixes)].map((pfx) => [pfx, setOrder(pfx)]).sort((x, y) => x[1] - y[1]);
    if (ranked.length >= 2 && ranked[0][1] !== ranked[ranked.length - 1][1]) {
      prefixLow = ranked[0][0];
      prefixHigh = ranked[ranked.length - 1][0];
    } else {
      bad.push("meta.sets から order の異なる prefix が2つ取れません（K2 のフィクスチャを作れません）");
    }
  }

  // --- 案A: 合成フィクスチャ6組（必須・常に走る・スキップ不可） ---
  // ⚠ 観測フィールドはスナップショットから借りず明示的に書く（案B と独立させる）。
  const FIXTURE_FIELDS = [
    ["set.release_date", (e) => (e.set || {}).release_date],
    ["set.prefix", (e) => (e.set || {}).prefix],
    ["rarity", (e) => e.rarity],
    ["collector_number", (e) => e.collector_number],
    ["slug", (e) => e.slug],
  ];
  let fixtureCount = 0;
  if (editionOrder && prefixLow && prefixHigh) {
    const base = () => ({
      set: { release_date: "2025-01-01", prefix: prefixLow },
      rarity: 1,
      collector_number: "001",
      slug: "base-slug",
    });
    const vary = (mutate) => { const e = base(); mutate(e); return e; };
    const fixtures = [
      ["F1（発売日）", "set.release_date", base(), vary((e) => { e.set.release_date = "2024-01-01"; })],
      ["F2（meta.sets の並び）", "set.prefix", base(), vary((e) => { e.set.prefix = prefixHigh; })],
      ["F3（レアリティ）", "rarity", base(), vary((e) => { e.rarity = 2; })],
      ["F4（カード番号）", "collector_number", base(), vary((e) => { e.collector_number = "002"; })],
      ["F5（版slug）", "slug", base(), vary((e) => { e.slug = "zzz-slug"; })],
      // ⭐ F6 は numeric: true を突く。辞書順だと "10" < "9" なので 0 ではなく「向きが逆」で出る
      ["F6（カード番号の数値順）", "collector_number",
        vary((e) => { e.collector_number = "9"; }), vary((e) => { e.collector_number = "10"; })],
    ];
    fixtureCount = fixtures.length;
    for (const [label, field, a, b] of fixtures) {
      // ⭐ フィクスチャの自己検査。2フィールド違いのフィクスチャは、キーを1本潰しても差がついて
      //   しまい検査が空回りする。作り間違いを構造で塞ぐ。
      const diff = FIXTURE_FIELDS.filter(([, get]) => get(a) !== get(b)).map(([name]) => name);
      if (diff.length !== 1 || diff[0] !== field) {
        bad.push(
          `${label}が${diff.length}つのフィールドで違います（フィクスチャの作り間違い: ` +
          `${diff.join(" / ") || "なし"}。期待: ${field} だけ）`
        );
        continue; // ⚠ 作り間違ったフィクスチャの比較結果は意味を持たないので比較しない
      }
      const ab = editionOrder(a, b);
      const ba = editionOrder(b, a);
      if (ab === 0) {
        bad.push(`${label}で差がつきません（比較結果 0）`);
        continue;
      }
      if (ab > 0) {
        bad.push(`${label}の向きが逆です（cmp=${ab}・負であるべき）`);
        continue;
      }
      if (Math.sign(ab) !== -Math.sign(ba)) {
        bad.push(`${label}が反対称ではありません（cmp(a,b)=${ab} / cmp(b,a)=${ba}）`);
      }
    }
  }

  // --- 案B: スナップショットの実データで同値ペアを数える（あるときだけ・上乗せ） ---
  // ⚠ meta.rarities の検査とスナップショットを共有しない（既存検査に手を入れて回帰面を増やさない）。
  // ⚠ ペアは同一カード内だけでよい（並べ替えが起きるのはカード単位）。カード横断の全ペア
  //   （約1,200万組）を回さないこと。
  const SNAP_EO = path.join(root, "tmp", "api-cache", "cards-snapshot.json");
  let dataNote = `実データはスキップ（${path.relative(root, SNAP_EO)} がありません）`;
  if (editionOrder && existsSync(SNAP_EO)) {
    try {
      const snap = JSON.parse(readFileSync(SNAP_EO, "utf8"));
      const cards = Array.isArray(snap) ? snap : (snap.cards || []);
      let editions = 0;
      let pairs = 0;
      const ties = [];
      for (const c of cards) {
        const eds = c.editions || c.result_editions || [];
        editions += eds.length;
        for (let i = 0; i < eds.length; i++) {
          for (let j = i + 1; j < eds.length; j++) {
            pairs++;
            if (editionOrder(eds[i], eds[j]) === 0) {
              ties.push(`${c.slug}（${eds[i].slug} / ${eds[j].slug}）`);
            }
          }
        }
      }
      // ⚠ 抽出に失敗したときに「一致」へ倒さない。0件は破損であって決定性の証明ではない
      if (editions === 0) {
        dataBad.push("スナップショットから版を1件も取り出せません（破損か形式変更の疑い）");
      } else if (ties.length) {
        dataBad.push(`実データに同値ペアがあります: ${ties.length}組`);
        ties.slice(0, 3).forEach((t) => dataExamples.push(`例: ${t}`));
      } else {
        dataNote = `実データ ${editions}版・${pairs}ペア・同値0`;
      }
    } catch (e) {
      dataBad.push(`スナップショットの読み込みに失敗: ${e.message}`);
    }
  }

  if (bad.length || dataBad.length) {
    problems++;
    console.error(`\nNON-DETERMINISTIC EDITION ORDER (scripts/lib/edition-order.mjs):`);
    bad.forEach((m) => console.error(`  - ${m}`));
    dataBad.forEach((m) => console.error(`  - ${m}`));
    dataExamples.forEach((m) => console.error(`    ${m}`));
    // ⚠ 案A の失敗（人がコードを削った）と案B の失敗（データが変わった）は原因も対処も違う。
    //   同じ誘導文を出さないこと。
    if (bad.length) {
      console.error(`  → editionOrder() は5段すべてが必要です。1段でも削ると公式APIの editions 配列順が`);
      console.error(`    生成物に漏れ、中身が変わらない日に差分が出ます（#108 / 親タスク: 版順序の非決定性）`);
    }
    if (dataBad.length) {
      console.error(`  → 同一カード内で版slug が重複している可能性があります（比較器ではなくデータ側の事故）`);
    }
  } else {
    console.log(`edition order is a total order — 合成${fixtureCount}組 / ${dataNote}`);
  }
}

// --- 件数欄の文言が1か所でしか定義されていないことの検査（#101） -------------
// トップ（app.js）とデッキ構築（tools/deck-builder/app.js）は、検索結果の件数欄に出す文言を
// 長いあいだ丸ごと複製していた（0件の7分岐＋件数行）。片方だけ直した結果、実際に
// 「日本語テキスト一致」と「日本語一致」が画面で食い違っていた。文言は
// shared/js/card-search.js の searchStatus() へ寄せたので、呼び出し側へ書き戻されたら止める。
//
// ⭐ 両辺が別ファイルなので空回りしない（左辺＝共有側のマーカーで囲んだブロック、
//   右辺＝2つの app.js にその文言が現れないこと）。
// ⚠ この検査が見ないもの（承知のうえ・設計 §6-4）:
//   - 10文字未満の断片（呼び出し側のフォールバック `${shown} 件を表示` を許すため）
//   - 上の2ファイル以外（実際に複製していたのはこの2つだけ）
//   - 文言を「少し変えて」書き戻すこと（断片一致なので止められるのはコピペだけ）
// ⚠ 緑は「二重定義が無い」証明ではない。証明にいちばん近いのは破壊試験（設計 §7-5 V11）。
{
  const SS_SRC = "shared/js/card-search.js";
  const SS_TARGETS = ["app.js", "tools/deck-builder/app.js"];
  const SS_START = "SEARCH-STATUS:START";
  const SS_END = "SEARCH-STATUS:END";
  // ⚠ 下限。関数を骨抜きにして（文言を消して）検査を黙らせる逃げ道を塞ぐ。
  //   実測は5個（#114 で0件の7分岐を2つの1文にまとめたため 11個 → 5個。#101 設計書 §6-3 の
  //   11個は当時の記録で、現在の正は #114 設計書 §6-1）。残る5個はすべて画面に出る別々の
  //   文言なので余裕を持たせない＝1つでも減ったら exit 1。
  //   ⚠ 書き方を変えて増減したら、成功行と #114 設計書 §6-1 を同じコミットで直す。
  const SS_MIN = 5;
  // 日本語を含む断片だけを見る（変数名・CSSクラス名などを拾わないため）
  const SS_JP = /[ぁ-んァ-ヶ一-龥々ー]/;

  // 文字列リテラルの中身だけを取り出す（コメントは落とす）。
  // ⚠ 正規表現リテラルは扱わない——マーカーの中は文言を返す純関数だけに保つこと。
  const ssLiterals = (code) => {
    const out = [];
    for (let i = 0; i < code.length; ) {
      const c = code[i];
      if (c === "/" && code[i + 1] === "/") { while (i < code.length && code[i] !== "\n") i++; continue; }
      if (c === "/" && code[i + 1] === "*") {
        i += 2;
        while (i < code.length && !(code[i] === "*" && code[i + 1] === "/")) i++;
        i += 2; continue;
      }
      if (c === '"' || c === "'" || c === "`") {
        const q = c; i++;
        let buf = "";
        while (i < code.length && code[i] !== q) {
          if (code[i] === "\\") { buf += code[i] + (code[i + 1] || ""); i += 2; continue; }
          buf += code[i]; i++;
        }
        i++; out.push(buf); continue;
      }
      i++;
    }
    return out;
  };

  const bad = [];
  let frags = [];
  let src = null;
  try {
    src = readFileSync(path.join(root, SS_SRC), "utf8");
  } catch (e) {
    bad.push(`${SS_SRC} を読めません: ${e.message}`);
  }
  if (src != null) {
    // (a) マーカーはちょうど1組・順序どおり（0組・2組以上・逆順はいずれも exit 1＝fail-closed）
    const nStart = src.split(SS_START).length - 1;
    const nEnd = src.split(SS_END).length - 1;
    if (nStart !== 1 || nEnd !== 1) {
      bad.push(`マーカーがちょうど1組ではありません（START ${nStart}個 / END ${nEnd}個）`);
    } else if (src.indexOf(SS_END) < src.indexOf(SS_START)) {
      bad.push("マーカーが逆順です（END が START より前にあります）");
    } else {
      // (b) ブロック内の文字列リテラルから、${…} を除いた静的断片を集める
      const block = src.slice(src.indexOf(SS_START) + SS_START.length, src.indexOf(SS_END));
      const seen = new Set();
      for (const lit of ssLiterals(block)) {
        for (const part of lit.split(/\$\{[^{}]*\}/)) {
          const t = part.trim();
          if (t.length >= 10 && SS_JP.test(t)) seen.add(t);
        }
      }
      frags = [...seen].sort();
      if (frags.length < SS_MIN) {
        bad.push(`ブロック内の文言が ${frags.length}個しかありません（下限 ${SS_MIN}個）— 関数が骨抜きにされていませんか`);
      }
    }
  }
  // (c) 呼び出し側の2ファイルに、その文言が現れないこと
  if (frags.length) {
    for (const rel of SS_TARGETS) {
      let text = null;
      try {
        text = readFileSync(path.join(root, rel), "utf8");
      } catch (e) {
        bad.push(`${rel} を読めません: ${e.message}`);
        continue;
      }
      for (const f of frags) {
        if (text.includes(f)) {
          const head = f.length > 24 ? `${f.slice(0, 24)}…` : f;
          bad.push(`${rel} に件数欄の文言が書かれています: 「${head}」`);
        }
      }
    }
  }

  if (bad.length) {
    problems++;
    console.error(`\nSEARCH STATUS TEXT DUPLICATED (${SS_SRC} ↔ ${SS_TARGETS.join(" / ")}):`);
    bad.forEach((m) => console.error(`  - ${m}`));
    console.error(`  → 件数欄の文言は ${SS_SRC} の searchStatus() だけに書いてください（#101）。`);
    console.error(`    呼び出し側は GA_CARD_SEARCH.searchStatus?.(info, shown) の戻り値を使い、`);
    console.error(`    フォールバックには分岐を書かないこと（書いたら二重定義が戻ります）`);
  } else {
    console.log(`search status text is single-sourced — ${frags.length}断片 / ${SS_TARGETS.length}ファイル走査`);
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
