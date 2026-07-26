// 静的ページ生成・JSON生成用の翻訳ロード。data/translations.js と data/tl/*.js を
// ファイル名の昇順で評価し、さらに shared/js/card-i18n.js まで評価して
// GA_CARD_I18N(表示ヘルパー)を返す。lib/load-i18n.mjs との違いは card-i18n.js を返すことだけ。
// build-card-pages / build-tournament-pages / gen-tl-json / gen-card-meta-index が共用する。
//
// ⚠️ #22フェーズ2以前は index.html の <script src="data/..."> の並びを読んでいたが、
// 同フェーズで index.html から data/tl/*.js の <script> を撤去した(JSON化・遅延読み込み)ため、
// 読み込み順の出所を lib/load-i18n.mjs と同じ「ファイル名の昇順」に統一した。
// 撤去前後で **マージ結果は同一**であることを確認済み(重複slugは astra-sight /
// stalwart-shieldmate / umbra-sight の3件のみで、どちらの順でも rdo.js が後勝ちになる)。
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { loadI18n } from "./load-i18n.mjs";

/**
 * @param {string} root リポジトリのルート絶対パス
 * @returns {{ I18N: any, CI: any, dataFiles: string[] }} dataFiles は root 基準の相対パス(昇順)
 */
export function loadPageI18n(root) {
  const { i18n, files } = loadI18n(root);
  // card-i18n.js は window.GA_I18N を参照するため、組み立て済みの i18n を渡した文脈で評価する
  const sandbox = { window: { GA_I18N: i18n } };
  vm.createContext(sandbox);
  const ciPath = path.join(root, "shared", "js", "card-i18n.js");
  vm.runInContext(readFileSync(ciPath, "utf8"), sandbox, { filename: "shared/js/card-i18n.js" });
  const dataFiles = files.map((f) => path.relative(root, f).split(path.sep).join("/"));
  return { I18N: i18n, CI: sandbox.window.GA_CARD_I18N, dataFiles };
}
