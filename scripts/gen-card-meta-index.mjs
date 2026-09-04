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
//   { d: [token,...], m: { slug: [[c],[e],[t],[s],[p],[b],[nums],[rarities]] }, f: { 裏面slug: 表面slug } }
//   先頭6つは d のインデックス。順序は classes / elements / types / subtypes / setPrefixes / bannedFormats で固定。
//   entry[6] = [level, power, life, cost_memory]（その項目を持たなければ null）… #43 の並び替え用
//   entry[7] = entry[4]（setPrefix）と同じ並びの「そのセット内の最小レアリティ」… #43
//   ⚠ nums / rarities は辞書化しない（数値なのでトークン化してもサイズが減らない）。
//   ⚠ entry[7] は entry[4] と要素数・順序が一致していること（消費側が添字で対応づける）。
//   f = フリップ面（裏面）slug → 表面slug の対応表（#45）。消費側が候補列を表面へ畳んで
//   「総件数と表示行数を一致させる」ために使う。
//   ⚠ m のエントリに9要素目として足さないこと（card-search.js の sortKeyOf が
//     entry.length < 8 で旧形式を判定しているため干渉する）。トップレベルの別キーにする。
//
// 対象は翻訳済みslugのみ（JP検索の対象がそれだけ）。スナップショット（/cards/search）に
// 無いフリップ面のslugは /cards/:slug で個別取得する。返るのは表面カードで、実行時の
// fetchCard(slug) が表面カードを返して matchesActiveFilters を適用する挙動と一致する。
// 個別取得に失敗したslugは索引から除外して続行する（消費側が fail-open するため安全。
// ここで exit 1 すると cron 上で索引だけが静かに更新されなくなる。詳細は main() 内のコメント）。

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
// matchesActiveFilters()（shared/js/card-search.js）が参照するフィールドと同じものだけを拾う。
//
// 各配列はソートして返す（#29）。公式APIが classes / elements / editions を返す順序に
// 保証がなく、順序が変わるだけで辞書のトークンID採番がずれて全ファイル差分になるため。
// 読み手（shared/js/card-search.js の metaMatches() → matchesMulti()）は includes() の
// 集合判定なので順序は意味を持たない。
// ⚠ 参照先は行番号ではなく関数名で書く（行番号は無関係なコミットで黙って腐る）。
const sorted = (a) => [...a].sort();

// #43: JPモードの並び替えキー。0 と null を混同しないこと
// （level 0・power 0・life 0・cost_memory 0 はいずれも実在する）。
const NUM_FIELDS = ["level", "power", "life", "cost_memory"];

function metaOf(card) {
  const eds = card.editions || card.result_editions || [];
  // ⚠ prefixes は先にソートしてから rarities を作る（entry[7] と並びを揃えるため）
  const prefixes = sorted([...new Set(eds.map((e) => e.set && e.set.prefix).filter(Boolean))]);
  const leg = card.legality || {};
  const banned = ALL_FORMATS.filter((f) => leg[f] && leg[f].limit === 0);
  return {
    classes: sorted(card.classes || []),
    elements: sorted(card.elements || []),
    types: sorted(card.types || []),
    subtypes: sorted(card.subtypes || []),
    prefixes,
    banned: sorted(banned),
    // #43: 並び替え用。null は「その項目を持たない」を意味し、消費側が #39 の規則で除外する
    nums: NUM_FIELDS.map((f) => (card[f] == null ? null : card[f])),
    // #43: prefixes と同じ並びの「そのセット内の最小レアリティ」。
    // 公式APIの sort=rarity が「絞り込み後のedition の min」で並ぶことに合わせる
    // （設計 §4.3 で実測。1カード1値＝全editionのmin にすると、エキスパンション絞り込み中に
    //  非JPモードと並びが食い違う）
    rarities: prefixes.map((p) => {
      const v = eds.filter((e) => e.set && e.set.prefix === p && e.rarity != null).map((e) => e.rarity);
      return v.length ? Math.min(...v) : null;
    }),
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
  const flip = {};   // 裏面slug → 表面slug（#45）
  const missing = [];
  for (const slug of translated) {
    const c = bySlug.get(slug);
    if (c) meta[slug] = metaOf(c);
    else missing.push(slug);
  }

  // スナップショットに無い翻訳済みslug（フリップ面など）を個別取得。
  // 返る表面カードのメタを、そのslugのキーに格納する（実行時の fetchCard と一致）。
  //
  // ⚠ 失敗したslugはスキップして続行する（スクリプト全体を exit 1 にしない）。
  //   ここで落とすと、日次cronは continue-on-error のため job が緑のまま索引だけが
  //   更新されなくなり、「索引が黙って腐る」状態に誰も気づけない。綴りミスや公式の
  //   slug変更で恒久的に失敗すると永久に回復しない（#29 のレビュー指摘1）。
  //   索引から漏れたslugは消費側が fail-open するので安全（card-search.js:396 の
  //   `if (!entry) return true;` により候補に残り、取得後フィルタで正しく判定される）。
  if (missing.length) {
    log(`スナップショット未収録slug: ${missing.length}件 → /cards/:slug で個別取得`);
    const failed = [];
    for (const slug of missing) {
      try {
        const c = await fetchJson(`${API}/cards/${encodeURIComponent(slug)}`);
        meta[slug] = metaOf(c);
        // #45: 返ってきたのが別のslug＝この slug はフリップ面（裏面）。消費側は候補列でこれを
        // 表面slugへ畳み、総件数と行数を一致させる（裏面は独自の name/effect を持つので
        // 検索の対象には残す。表示は fetchCard が返す表面カード1枚に集約される）
        if (c.slug && c.slug !== slug) flip[slug] = c.slug;
        log(`  ${slug} → ${c.slug}`);
      } catch (e) {
        failed.push(slug);
        log(`  ⚠ ${slug}: 取得失敗のため索引から除外して続行（${e.message}）`);
      }
    }
    if (failed.length) {
      log(`⚠ 個別取得に失敗: ${failed.length}/${missing.length}件 → ${failed.join(", ")}`);
      log("  これらのslugは索引に載りません（消費側が fail-open するため検索結果は正しいまま、");
      log("  取得前の絞り込みが効かず件数が概算になります）。恒久的に失敗する場合は綴り・公式のslug変更を確認してください。");
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
      x.nums,
      x.rarities,
    ];
  }

  // ⚠ キー順を固定する（#29 の決定性要件）。missing は translated 由来で実際にはソート済みだが依存しない
  const f = {};
  Object.keys(flip).sort().forEach((k) => { f[k] = flip[k]; });

  const json = JSON.stringify({ d, m, f });
  writeFileSync(OUT, json + "\n");
  log(`\n生成: ${Object.keys(m).length}slug / 辞書${d.length}トークン / ${(json.length / 1024).toFixed(1)}KB → ${path.relative(ROOT, OUT)}`);
  // 並び替えキーの件数をcronログに残す（#43）。生成デグレで全滅したときの痕跡になる。
  // ⚠ ここで exit 1 にしてはいけない（cronの後段に到達しないとその日の大会データの取り込みごと
  //   失われる）。人を止めるのは npm run validate の役
  const nonNull = (i) => Object.values(m).filter((e) => e[6][i] != null).length;
  const withRarity = Object.values(m).filter((e) => e[7].some((v) => v != null)).length;
  log(`並び替えキー: ${NUM_FIELDS.map((x, i) => `${x} ${nonNull(i)}`).join(" / ")} / rarity ${withRarity}`);
  log(`フリップ面: ${Object.keys(f).length}件を表面slugへ対応づけ`);
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
