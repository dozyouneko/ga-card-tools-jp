// data/translations.js と data/tl/*.js をブラウザと同じ順で評価し、
// window.GA_I18N（meta / terms / cards）を組み立てて返す。
// 純粋な <script> 群なので vm コンテキストに window を与えて実行する。
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

/**
 * @param {string} root リポジトリのルート絶対パス
 * @returns {{ i18n: any, files: string[] }}
 */
export function loadI18n(root) {
  const ctx = { window: {}, console };
  vm.createContext(ctx);

  const files = [path.join(root, "data", "translations.js")];
  const tlDir = path.join(root, "data", "tl");
  for (const name of readdirSync(tlDir).filter((f) => f.endsWith(".js")).sort()) {
    files.push(path.join(tlDir, name));
  }

  for (const f of files) {
    const code = readFileSync(f, "utf8");
    vm.runInContext(code, ctx, { filename: f });
  }

  const i18n = ctx.window.GA_I18N || { meta: {}, terms: {}, cards: {} };
  i18n.cards = i18n.cards || {};
  return { i18n, files };
}
