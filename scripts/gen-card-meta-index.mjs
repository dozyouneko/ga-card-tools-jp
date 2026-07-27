// issue#27: 日本語効果検索×絞り込みの「取得前フィルタ」用メタ索引を生成する。
//
//   node scripts/gen-card-meta-index.mjs
//
// 出力: data/card-meta-index.json（コミットする）。
// shared/js/card-search.js の JPモードが、slug列挙のあと「取得前」に絞り込むために読む。
// 索引は候補を絞るだけで、最終判断は取得後の matchesActiveFilters が行う二段構え
// （索引が古くても誤結果は出ない設計）。詳細は
// docs/design/27-JP検索の絞り込み埋もれ/JP検索の絞り込み埋もれ_設計.md を参照。
//
// 日次cron（build-tournaments.yml）が毎日実行する（#29）。禁止改定・再録で索引の
// bannedFormats / setPrefixes が腐ると、該当カードが取得前フィルタで黙って候補から落ちるため、
// 鮮度を24時間以内に回復させる。手動実行は「訳を追記して即日反映したいとき」の任意手段。
// ⚠ 出力は決定的でなければならない（中身が変わらない日に差分が出るとcronが毎日ノイズコミットする）。
//    タイムスタンプを入れず、列挙値はソートしてからトークン化すること。
//
// 形式（トークン辞書 + ID配列。生の列挙値をそのまま持つとサイズが倍近くなるため辞書化）:
//   { d: [token,...], m: { slug: [[c],[e],[t],[s],[p],[b]] } }
//   各配列は d のインデックス。順序は classes / elements / types / subtypes / setPrefixes / bannedFormats で固定。
//
// 対象は翻訳済みslugのみ（JP検索の対象がそれだけ）。スナップショット（/cards/search）に
// 無いフリップ面のslugは /cards/:slug で個別取得する。返るのは表面カードで、実行時の
// fetchCard(slug) が表面カードを返して matchesActiveFilters を適用する挙動と一致する。

import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadCards, fetchJson } from "./lib/cards-snapshot.mjs";
import { loadPageI18n } from "./lib/page-i18n.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "data", "card-meta-index.json");
const API = "https://api.gatcg.com";

// bannedFormats() = limit0判定（card-i18n.js:110 と同義）をビルド時に評価する
const ALL_FORMATS = ["STANDARD", "DRAFT", "PANTHEON"];

const log = (s) => process.stderr.write(s + "\n");

// カード（スナップショット or /cards/:slug の応答）から絞り込みに使うメタ情報を取り出す。
// matchesActiveFilters（card-search.js:432）が参照するフィールドと同じものだけを拾う。
//
// 各配列はソートして返す（#29）。公式APIが classes / elements / editions を返す順序に
// 保証がなく、順序が変わるだけで辞書のトークンID採番がずれて全ファイル差分になるため。
// 読み手（card-search.js:403-415）は includes() の集合判定なので順序は意味を持たない。
const sorted = (a) => [...a].sort();

function metaOf(card) {
  const eds = card.editions || card.result_editions || [];
  const prefixes = [...new Set(eds.map((e) => e.set && e.set.prefix).filter(Boolean))];
  const leg = card.legality || {};
  const banned = ALL_FORMATS.filter((f) => leg[f] && leg[f].limit === 0);
  return {
    classes: sorted(card.classes || []),
    elements: sorted(card.elements || []),
    types: sorted(card.types || []),
    subtypes: sorted(card.subtypes || []),
    prefixes: sorted(prefixes),
    banned: sorted(banned),
  };
}

async function main() {
  // 翻訳済みslug（name か effect が埋まっているもの。空欄スキャフォルドは対象外）
  const { I18N } = loadPageI18n(ROOT);
  const cards18n = I18N.cards || {};
  const translated = Object.keys(cards18n)
    .filter((s) => cards18n[s] && (cards18n[s].name || cards18n[s].effect))
    .sort();
  log(`翻訳済みslug: ${translated.length}件`);

  const cards = await loadCards(ROOT);
  const bySlug = new Map(cards.map((c) => [c.slug, c]));

  const meta = {};
  const missing = [];
  for (const slug of translated) {
    const c = bySlug.get(slug);
    if (c) meta[slug] = metaOf(c);
    else missing.push(slug);
  }

  // スナップショットに無い翻訳済みslug（フリップ面など）を個別取得。
  // 返る表面カードのメタを、そのslugのキーに格納する（実行時の fetchCard と一致）。
  if (missing.length) {
    log(`スナップショット未収録slug: ${missing.length}件 → /cards/:slug で個別取得`);
    for (const slug of missing) {
      const c = await fetchJson(`${API}/cards/${encodeURIComponent(slug)}`);
      meta[slug] = metaOf(c);
      log(`  ${slug} → ${c.slug}`);
    }
  }

  // トークン辞書化（初出順にID採番）
  const d = [];
  const dictIndex = new Map();
  const tok = (s) => {
    if (!dictIndex.has(s)) { dictIndex.set(s, d.length); d.push(s); }
    return dictIndex.get(s);
  };
  const m = {};
  for (const slug of Object.keys(meta).sort()) {
    const x = meta[slug];
    m[slug] = [
      x.classes.map(tok),
      x.elements.map(tok),
      x.types.map(tok),
      x.subtypes.map(tok),
      x.prefixes.map(tok),
      x.banned.map(tok),
    ];
  }

  const json = JSON.stringify({ d, m });
  writeFileSync(OUT, json + "\n");
  log(`\n生成: ${Object.keys(m).length}slug / 辞書${d.length}トークン / ${(json.length / 1024).toFixed(1)}KB → ${path.relative(ROOT, OUT)}`);
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
