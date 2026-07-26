// 使い方: node scripts/gen-tl-json.mjs
//
// data/tl/*.js(人間が訳を書く原本)から、ブラウザが読む2つのJSONを生成する(#22 フェーズ2)。
//
//   data/tl-names.json   … { slug: 名前 }            初期表示前に1回 fetch する(グリッド描画に必要)
//   data/tl-effects.json … { e:{slug:効果}, f:{slug:フレーバー} }
//                                                    詳細ダイアログ / 日本語効果検索のときだけ fetch する
//
// ⚠️ ネットワーク不要・オフラインで完結する(公式APIを叩かない)。
// ⚠️ 決定的な出力にするため generated_at のようなタイムスタンプは入れない(#29 の轍を踏まない)。
// ⚠️ 訳を追記したら再生成が要る。忘れても `npm run validate` が検出して落とす。
//
// tl-effects.json が {e,f} の入れ子なのは、詳細ダイアログが日本語フレーバー(t.flavor)も
// 使うため(card-detail.js:200)。フレーバーも効果と同じく「詳細を開いたときだけ」必要なので
// 効果側に同梱する。設計書は tl-effects.json を { slug: 効果 } としていたが、
// フレーバーの置き場が無くなるためこの形にした(issue #22 のコメントで報告済み)。
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPageI18n } from "./lib/page-i18n.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

/**
 * 訳データ(GA_I18N.cards)から2つのJSONの中身を組み立てる。
 * validate.mjs の陳腐化検査からも呼ぶため、書き出しとは分けてある。
 * @param {Record<string, {name?:string, effect?:string, flavor?:string}>} cards
 * @returns {{ names: object, effects: object }}
 */
export function buildTlJson(cards) {
  const names = {};
  const e = {};
  const f = {};
  // slug昇順で書き出して、生成のたびに並びが変わらないようにする
  for (const slug of Object.keys(cards).sort()) {
    const c = cards[slug] || {};
    // 空欄スキャフォルド(name/effect/flavor がすべて空)は「未訳」として出力しない。
    // 出力した slug は「訳が存在する」とみなされる(card-i18n.js の isTranslated)
    if (!c.name && !c.effect && !c.flavor) continue;
    names[slug] = c.name || "";
    if (c.effect) e[slug] = c.effect;
    if (c.flavor) f[slug] = c.flavor;
  }
  return { names, effects: { e, f } };
}

export const NAMES_FILE = "data/tl-names.json";
export const EFFECTS_FILE = "data/tl-effects.json";

// JSON.stringify の既定(空白なし)で書く。1行だが git 上で意味のある差分にはならないため、
// 差分の確認は data/tl/*.js 側(原本)で行う想定。
export const serialize = (obj) => JSON.stringify(obj) + "\n";

function main() {
  const { I18N } = loadPageI18n(ROOT);
  const cards = I18N.cards || {};
  const { names, effects } = buildTlJson(cards);

  const namesText = serialize(names);
  const effectsText = serialize(effects);
  writeFileSync(path.join(ROOT, NAMES_FILE), namesText);
  writeFileSync(path.join(ROOT, EFFECTS_FILE), effectsText);

  const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(1);
  console.log(`${NAMES_FILE}   ${Object.keys(names).length} 件  ${kb(namesText)} KB`);
  console.log(`${EFFECTS_FILE} 効果 ${Object.keys(effects.e).length} 件 / フレーバー ${Object.keys(effects.f).length} 件  ${kb(effectsText)} KB`);
  const skipped = Object.keys(cards).length - Object.keys(names).length;
  if (skipped > 0) console.log(`(空欄スキャフォルド ${skipped} 件は未訳として除外)`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
