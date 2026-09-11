// 使い方: node scripts/gen-queue-index.mjs            # 索引 §1 の生成部を作り直す（同じなら書かない）
//        node scripts/gen-queue-index.mjs --check    # 書かずに比べる（古ければ exit 1）
//
// 索引 docs/design/待ち行列/待ち行列と復旧手順.md の §1（起票案の一覧）を、各起票案の1行目から生成する
// （未採番「索引の転記ドリフト防止」単位1。設計書 docs/design/未採番-索引の転記ドリフト防止/ §3・§5）。
//
// ⭐ 状態の正は各起票案（docs/design/**/起票案*.md・派生起票案*.md）の1行目だけ:
//      **状態: <状態>**（最終確認 YYYY-MM-DD）— 呼び名「<呼び名>」<自由記述>
//    索引に手で書き写すと必ずずれる（改版履歴で7回是正した）ので、索引側は生成物にした。
// ⭐ validate.mjs も同じ関数で生成部を作り直して比べる（gen-tl-json.mjs の buildTlJson と同じ型）。
//    比べる両辺は「索引に書かれている文字列」と「起票案から今作った文字列」＝別の出所なので空回りしない。
//
// ⚠ Node の標準モジュール以外を import しないこと。設計書 V1 の②で、設計コミットのツリーへ
//   このファイルだけをコピーして動かす（正解データとのバイト一致の確認）。
// ⚠ 出力は決定的であること（時刻・日数など実行のたびに変わる値を入れない）。
// ⚠ 起票案の問題・マーカーの問題があるときは、どの起動でも索引を書かない（壊れた入力で上書きしない）。
// ⚠ 書き込みは <索引>.tmp に書いてから renameSync で置き換える。/workspaces は 9p マウントで、
//   VS Code が開いているファイルを直接上書きすると EINVAL で失敗する（CLAUDE.md「環境の注意」）。
import { readFileSync, readdirSync, writeFileSync, renameSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

/** 索引（リポジトリ相対） */
export const QUEUE_INDEX = "docs/design/待ち行列/待ち行列と復旧手順.md";
/** 起票案の走査ルート（リポジトリ相対・再帰）。⚠ 変えると validate も同じ値を使う */
export const DRAFT_ROOT = "docs/design";
/** 状態の語彙。⚠ この順＝生成部の並び順。`公開済み` や手番（実装待ち等）は足さない（設計書 D3） */
export const STATES = ["実装中", "設計中", "生きている", "完了", "取り下げ"];
/** マーカー。⭐ 行全体がこの文字列と完全一致する行だけをマーカーと数える */
export const MARKER_START = "<!-- QUEUE-INDEX:START -->";
export const MARKER_END = "<!-- QUEUE-INDEX:END -->";

// 1行目の書式。呼び名には「」|`* と空白を使えない（表と正規表現を壊すため）。
// ⚠ 日付は形式だけ見る（値の妥当性も鮮度も見ない＝時計だけで赤くなる検査にしない）
const DRAFT_RE = /^\*\*状態: ([^*]+)\*\*（最終確認 (\d{4}-\d{2}-\d{2})）— 呼び名「([^「」|`*\s]+)」/;
// ⚠ 前方一致。「含む」だと無関係な文書まで拾う。「起票案」で始まる .md は起票案以外の目的で置けない
const IS_DRAFT = /^(派生)?起票案/;
// パスに使えない文字（表のセル・Markdown のリンクを壊す）
const BAD_PATH_RE = /[\s()|#]/;

// 見出しの語。⚠ 状態「完了」の見出しは「完了済み」（旧検査の見出しの形を保った）。
// ⚠ 絵文字に異体字セレクタ（U+FE0F）を付けないこと。コピーで混ざらないようエスケープで書く
const HEADINGS = {
  実装中: "### \u{1F527} 実装中",
  設計中: "### \u{1F4DD} 設計中",
  生きている: "### \u{1F7E2} 生きている",
  完了: "### ✅ 完了済み",
  取り下げ: "### \u{1F6AB} 取り下げ",
};

/**
 * 起票案を集めて1行目を読む。
 * 問題は「1ファイルにつき高々1行」（設計書 §3-3 の順に判定）→ 呼び名の重複 → 0件 の順に並ぶ。
 * @param {string} [root]
 * @returns {{ drafts: {path:string, state:string, date:string, name:string}[], problems: string[] }}
 *   drafts は問題の無い起票案だけ（リポジトリ相対パスの昇順）
 */
export function readDrafts(root = ROOT) {
  const problems = [];
  const toRel = (p) => path.relative(root, p).split(path.sep).join("/");

  // --- 走査（再帰）。⚠ 読めないディレクトリを黙って飛ばさない（fail-closed） ---
  const found = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch (e) {
      problems.push(`起票案の走査に失敗: ${toRel(dir)}（${e.message}）`);
      return;
    }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (ent.isFile() && ent.name.endsWith(".md") && IS_DRAFT.test(ent.name)) found.push(toRel(full));
    }
  };
  walk(path.join(root, DRAFT_ROOT));
  found.sort(); // ⭐ JS 既定の sort()＝生成部の行の順（決定的にする）

  // --- 1行目を読む（1ファイルにつき高々1行） ---
  const drafts = [];
  const named = []; // 書式に一致した（呼び名が取れた）起票案。重複の判定に使う
  for (const rel of found) {
    let first;
    try {
      // ⚠ BOM 付きで保存されると「1行目が無い」に見えて原因が分かりにくい。先に除去する
      first = readFileSync(path.join(root, rel), "utf8").replace(/^\uFEFF/, "").split(/\r?\n/)[0] || "";
    } catch (e) {
      problems.push(`起票案の読み込みに失敗: ${rel}（${e.message}）`);
      continue;
    }
    if (BAD_PATH_RE.test(rel)) {
      problems.push(`起票案のパスに使えない文字があります: ${rel}`);
      continue;
    }
    if (!first.startsWith("**状態: ")) {
      // ⭐ 状態行なしの起票案を新規に作れなくなる（前方一致の規約が黙って通らない理由）
      problems.push(`起票案の1行目に状態行がありません: ${rel}`);
      continue;
    }
    const m = DRAFT_RE.exec(first);
    if (!m) {
      problems.push(`起票案の1行目の書式が違います: ${rel}`);
      continue;
    }
    const [, state, date, name] = m;
    named.push({ path: rel, name });
    if (!STATES.includes(state)) {
      problems.push(`起票案の状態が不明です: ${rel}（「${state}」）`);
      continue;
    }
    drafts.push({ path: rel, state, date, name });
  }

  // --- 呼び名の重複（呼び名はタスクの識別子＝一意でなければならない） ---
  const byName = new Map();
  for (const d of named) {
    if (!byName.has(d.name)) byName.set(d.name, []);
    byName.get(d.name).push(d.path);
  }
  const dups = [...byName.entries()]
    .filter(([, paths]) => paths.length > 1)
    .map(([name, paths]) => [name, [...paths].sort()])
    .sort((a, b) => (a[1][0] < b[1][0] ? -1 : a[1][0] > b[1][0] ? 1 : 0));
  for (const [name, paths] of dups) problems.push(`呼び名が重複しています: 「${name}」（${paths.join(" / ")}）`);

  // ⚠ 0件を「全部一致」に倒さない。走査の壊れ（定数の誤り・実行位置違い）が黙って緑になる
  if (!found.length) problems.push(`起票案が1件も見つかりません: ${DRAFT_ROOT}`);

  return { drafts, problems };
}

/** 状態ごとの件数（STATES の順のキーを持つ） */
export function countByState(drafts) {
  const counts = Object.fromEntries(STATES.map((s) => [s, 0]));
  for (const d of drafts) counts[d.state]++;
  return counts;
}

/**
 * 生成部（START の次の行から END の前の行まで）の行の配列を作る。
 * ⭐ 設計コミットの索引に入っている生成部が正解データ（バイト一致）。
 * @param {{path:string, state:string, date:string, name:string}[]} drafts 問題の無い起票案（パス昇順）
 * @returns {string[]} 各行（最後の要素は END の直前の空行＝ ""）
 */
export function buildSection(drafts) {
  const indexDir = path.posix.dirname(QUEUE_INDEX);
  const sorted = [...drafts].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const out = [
    "",
    "> **この節は生成部**（次の「生成部ここまで」まで）。`node scripts/gen-queue-index.mjs` が作るので**手で編集しない**。",
    "> 状態の正は各起票案の1行目。状態を変えるときは起票案を直してから生成し直す（古いままだと `npm run validate` が exit 1）。",
    "",
    `## 1. 起票案の一覧（**全${sorted.length}件**）`,
  ];
  for (const state of STATES) {
    const rows = sorted.filter((d) => d.state === state);
    out.push("", `${HEADINGS[state]}（**${rows.length}件**）`, "");
    if (!rows.length) {
      out.push("（該当なし）");
      continue;
    }
    out.push("| 呼び名 | 起票案 | 最終確認 |", "|---|---|---|");
    for (const d of rows) {
      const shown = path.posix.relative(DRAFT_ROOT, d.path);
      const href = path.posix.relative(indexDir, d.path);
      out.push(`| **${d.name}** | [\`${shown}\`](${href}) | ${d.date} |`);
    }
  }
  out.push("", "> **生成部ここまで**", "");
  return out;
}

/**
 * 索引のマーカーを調べる。
 * @param {string} text 索引の全文
 * @returns {{ lines: string[], start: number, end: number, problems: string[] }}
 *   start / end はマーカー行の添字（0始まり）。problems が空のときだけ有効
 */
export function inspectIndex(text) {
  // ⚠ 行の分割は "\n" だけで行い、書き戻しで他の行を1バイトも変えない
  const lines = text.split("\n");
  const starts = [];
  const ends = [];
  lines.forEach((l, i) => {
    // ⭐ 行全体の完全一致だけを数える。マーカーの後ろに同じ行で文字を書くと、その文字の
    //   Markdown が描画で死ぬ（設計書 M8）。その置き方は数えずに exit 1 にする
    if (l === MARKER_START) starts.push(i);
    if (l === MARKER_END) ends.push(i);
  });
  const problems = [];
  if (starts.length !== 1 || ends.length !== 1) {
    problems.push(`索引の生成部のマーカーが1組ではありません（START ${starts.length}個 / END ${ends.length}個）`);
  } else if (ends[0] < starts[0]) {
    problems.push("索引の生成部のマーカーの順序が逆です（END が START より前にあります）");
  }
  return { lines, start: starts[0] ?? -1, end: ends[0] ?? -1, problems };
}

/**
 * 生成部の外にある「件数を書いた見出し」を探す（設計書 D12。散文の件数は検査できないので見出しだけ）。
 * @returns {string[]} 問題の行（n は索引の1始まりの行番号）
 */
export function headingProblems(lines, start, end) {
  const out = [];
  lines.forEach((l, i) => {
    if (i > start && i < end) return; // 生成部の中
    if (/^#{1,6} .*\d+件/.test(l)) out.push(`件数を書いた見出しが生成部の外にあります: ${i + 1}行目「${l}」`);
  });
  return out;
}

/**
 * 2つの行の配列の最初の差（1始まり）。一致すれば 0。
 * K は START の次の行を1とした行番号（片方が短いときは短いほうの末尾の次）。
 */
export function firstDiff(actual, expected) {
  const n = Math.max(actual.length, expected.length);
  for (let i = 0; i < n; i++) if (actual[i] !== expected[i]) return i + 1;
  return 0;
}

/** 生成部の比較に失敗したときの1行 */
export const driftMessage = (k) => `索引の生成部が起票案と一致しません（最初の差: 生成部の${k}行目）`;

function usage() {
  console.error("使い方: node scripts/gen-queue-index.mjs [--check]");
  console.error("  （引数なし）… 索引 §1 の生成部を起票案の1行目から作り直す（同じなら書かない）");
  console.error("  --check      … 書かずに比べる（古ければ exit 1）");
  process.exit(2);
}

function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== "--check")) usage();
  const check = args[0] === "--check";

  const { drafts, problems } = readDrafts(ROOT);
  const indexAbs = path.join(ROOT, QUEUE_INDEX);
  let text = null;
  try {
    text = readFileSync(indexAbs, "utf8");
  } catch {
    problems.push(`索引が見つかりません: ${QUEUE_INDEX}`);
  }
  let idx = null;
  if (text !== null) {
    idx = inspectIndex(text);
    problems.push(...idx.problems);
  }
  if (problems.length) {
    problems.forEach((p) => console.error(p));
    console.error("索引は書き換えていません");
    process.exit(1);
  }

  const n = drafts.length;
  const generated = buildSection(drafts);
  const current = idx.lines.slice(idx.start + 1, idx.end);
  const k = firstDiff(current, generated);
  if (k === 0) {
    // ⭐ 同じなら書かない（mtime を変えない）
    console.log(`索引の生成部は最新です（起票案${n}件）`);
    return;
  }
  if (check) {
    console.error(driftMessage(k));
    process.exit(1);
  }
  const next = [...idx.lines.slice(0, idx.start + 1), ...generated, ...idx.lines.slice(idx.end)].join("\n");
  const tmp = `${indexAbs}.tmp`;
  try {
    writeFileSync(tmp, next);
    renameSync(tmp, indexAbs);
  } catch (e) {
    rmSync(tmp, { force: true });
    throw e;
  }
  console.log(`索引の生成部を更新しました（起票案${n}件）`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
