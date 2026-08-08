// tmp/api-cache/ の一時キャッシュに共通する「原子的な書き込み」と「安全な読み込み」(#54)。
//
// ⚠ ここが担うのは入出力の頑健性だけ。**キャッシュの形(スキーマ)と有効期限の判断は
//   各呼び出し元に残す**(#53・#54 設計 §4-1)。cards-snapshot.json のオンディスク形式を
//   変えないための意図的な線引きで、共通化を広げると #52 で通した検証がまるごと無効になる。
//
// 背景: 書き込みが writeFileSync 1発だったため、中断すると壊れたJSONが残り、
//   loadCards() を使う4スクリプトすべてが SyntaxError で起動不能になっていた(#54)。
import { readFileSync, writeFileSync, renameSync, unlinkSync, mkdirSync } from "node:fs";
import path from "node:path";

/**
 * JSONを原子的に書き込む。同じディレクトリに一時ファイルを書いてから rename する
 * (同一ファイルシステム内の rename は原子的なので、読み手は「古い完全な内容」か
 *  「新しい完全な内容」のどちらかしか見ない)。
 * ⚠ 失敗したら一時ファイルを片付けてから例外を投げる(ゴミを残さない・#54 V4/V5)。
 * @param {string} file 書き込み先の絶対パス
 * @param {unknown} obj JSON化する値
 */
export function writeJsonAtomic(file, obj) {
  const dir = path.dirname(file);
  mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `${path.basename(file)}.tmp-${process.pid}-${Math.random().toString(36).slice(2, 10)}`);
  try {
    writeFileSync(tmp, JSON.stringify(obj));
    renameSync(tmp, file);
  } catch (e) {
    try { unlinkSync(tmp); } catch { /* 一時ファイルが無ければ何もしない */ }
    throw e;
  }
}

/**
 * JSONを安全に読む。ファイルが無い・読めない・JSON.parse に失敗 → **null**。
 * ⚠ 例外を投げない。「取り直すかどうか」は呼び出し元が判断する(#54)。
 * ⚠ 握りつぶした理由はログに出さない(呼び出し元が「取り直します」を出すので二重になる・U2)。
 * @param {string} file 読み込み元の絶対パス
 * @returns {any|null}
 */
export function readJsonSafe(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}
