// 静的ページ生成用の翻訳ロード。index.html の <script src="data/..."> の並びを
// そのまま使うことで、ブラウザ表示とマージ順(=訳の優先順位)を一致させる。
// lib/load-i18n.mjs との違いはこの読み込み順と、shared/js/card-i18n.js まで評価して
// GA_CARD_I18N(表示ヘルパー)を返すこと。build-card-pages / build-tournament-pages が共用する。
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

/**
 * @param {string} root リポジトリのルート絶対パス
 * @returns {{ I18N: any, CI: any, dataFiles: string[] }} dataFiles は index.html 基準の相対パス
 */
export function loadPageI18n(root) {
  const html = readFileSync(path.join(root, "index.html"), "utf8");
  const dataFiles = [...html.matchAll(/<script src="(data\/[^"]+)"><\/script>/g)].map((m) => m[1]);
  if (!dataFiles.length) throw new Error("index.html から data/ スクリプトを検出できません");
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  for (const f of [...dataFiles, "shared/js/card-i18n.js"]) {
    vm.runInContext(readFileSync(path.join(root, f), "utf8"), sandbox, { filename: f });
  }
  return { I18N: sandbox.window.GA_I18N, CI: sandbox.window.GA_CARD_I18N, dataFiles };
}
