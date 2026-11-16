// 日次cronが「今日コミット・pushするか」を決める(#147 W1)。
// 設計: docs/design/147-日次バッチの再開/日次バッチの再開_設計.md §3
//
//   node scripts/cron-commit-decision.mjs   … ステージ済みの差分を見て stdout に commit / skip を1行出す
//                                              (理由は stderr。ワークフローは stdout だけを使う)
//
// 規則(§3-2):
//   - ステージされた差分が無い                                     → skip
//   - data/tournaments/index.json だけが変わり、その中の変化が
//     updatedAt と scan(minId / maxId)だけ                         → skip
//       ただし HEAD 側の updatedAt から 7日以上経っていれば        → commit(週1の位置保存・§3-3)
//   - それ以外(events / pending.json / ページ等が変わった)        → commit
//
// ⚠ 判定に失敗したら(パース不能・HEAD 側の日付が読めない・例外)必ず commit に倒す(fail-safe)。
//   旧来の「差分があれば毎日コミット」に戻るだけで、データは失われない。
//   逆(skip に倒す)にすると、大会の取り込みが黙って止まる。
// ⚠ 行の差分を数えない。JSON をパースして、updatedAt と scan.minId / scan.maxId を除いた残りを深く比べる。
// ⚠ HEAD 側は git show で読む。actions/checkout は履歴1件の浅いクローンなので、
//   「前回のコミット日」を git log で引く実装は動かない。
import { execFileSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const INDEX_PATH = "data/tournaments/index.json";
/** スキャン位置だけの日でも、この日数が経っていれば位置をコミットする(§3-3・設計書 §11 D1) */
export const POSITION_SAVE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 配列・オブジェクトを再帰的に比べる(キーの順序は問わない) */
function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
    return true;
  }
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!deepEqual(a[k], b[k])) return false;
  }
  return true;
}

/** updatedAt と scan.minId / scan.maxId を取り除いた複製(それ以外の scan のキーは比較に残す) */
function withoutPosition(idx) {
  if (typeof idx !== "object" || idx === null || Array.isArray(idx)) {
    throw new Error("index.json がオブジェクトではありません");
  }
  const { updatedAt, scan, ...rest } = idx;
  if (scan !== undefined) {
    if (typeof scan !== "object" || scan === null || Array.isArray(scan)) {
      throw new Error("scan がオブジェクトではありません");
    }
    const { minId, maxId, ...scanRest } = scan;
    if (Object.keys(scanRest).length) rest.scan = scanRest;
  }
  return rest;
}

/**
 * 判定本体(git を使わない純関数。fixture で検証するため切り出してある)。
 * @param {object} o
 * @param {string[]} o.stagedPaths     ステージされたパス(リポジトリ相対)
 * @param {string|null} o.headIndexText HEAD 側の index.json の本文(HEAD に無ければ null)
 * @param {string|null} o.stagedIndexText ステージ側の index.json の本文
 * @param {number} [o.now]             現在時刻(ms)
 * @returns {{decision: "commit"|"skip", reason: string}}
 */
export function decide({ stagedPaths, headIndexText, stagedIndexText, now = Date.now() }) {
  try {
    const paths = (stagedPaths || []).filter(Boolean);
    if (!paths.length) return { decision: "skip", reason: "差分なし" };
    if (paths.length !== 1 || paths[0] !== INDEX_PATH) {
      return { decision: "commit", reason: `index.json 以外の変更あり(${paths.length}パス)` };
    }
    if (headIndexText == null) return { decision: "commit", reason: "HEAD に index.json が無い(初回)" };
    if (stagedIndexText == null) return { decision: "commit", reason: "ステージ側の index.json が読めない" };

    const head = JSON.parse(headIndexText);
    const staged = JSON.parse(stagedIndexText);
    if (!deepEqual(withoutPosition(head), withoutPosition(staged))) {
      return { decision: "commit", reason: "index.json の updatedAt・scan 以外が変化(events 等)" };
    }

    const headAt = Date.parse(head.updatedAt);
    if (!Number.isFinite(headAt)) {
      return { decision: "commit", reason: "HEAD の updatedAt が日付として読めない(fail-safe)" };
    }
    const age = now - headAt;
    const days = (age / DAY_MS).toFixed(2);
    if (age >= POSITION_SAVE_DAYS * DAY_MS) {
      return { decision: "commit", reason: `週1の位置保存(前回の位置保存から ${days}日)` };
    }
    return { decision: "skip", reason: `スキャン位置だけの変化(前回の位置保存から ${days}日)` };
  } catch (e) {
    return { decision: "commit", reason: `判定に失敗したため commit に倒す(fail-safe): ${e.message}` };
  }
}

function gitShow(spec, cwd) {
  try {
    return execFileSync("git", ["show", spec], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 });
  } catch {
    return null;
  }
}

function main() {
  let result;
  try {
    const cwd = process.cwd();
    const out = execFileSync("git", ["diff", "--cached", "--name-only", "-z"], { cwd, encoding: "utf8" });
    const stagedPaths = out.split("\0").filter(Boolean);
    result = decide({
      stagedPaths,
      headIndexText: gitShow(`HEAD:${INDEX_PATH}`, cwd),
      stagedIndexText: gitShow(`:${INDEX_PATH}`, cwd),
    });
  } catch (e) {
    result = { decision: "commit", reason: `判定に失敗したため commit に倒す(fail-safe): ${e.message}` };
  }
  process.stderr.write(`[cron-commit-decision] ${result.decision}: ${result.reason}\n`);
  process.stdout.write(`${result.decision}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
