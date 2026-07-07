// 使い方: node scripts/check-terminology.mjs [prefix ...]
//   例:  node scripts/check-terminology.mjs            # 翻訳済み全カードをチェック
//        node scripts/check-terminology.mjs RDO RDOP   # 指定 prefix のカードのみ
//
// 公式API（英語原文）を取得し、app.js の matchedTerms() と同じロジックで
// 「英語効果文に terms 辞書のキーが含まれるか」を判定したうえで、
// 対応する日本語訳にその用語の見出し語（jp の「（」より前の部分）が
// 含まれているかを確認する。含まれていない場合、highlightTerms() による
// 用語ハイライト・解説リンクが本番サイト上で効かないため、表記揺れの
// 疑いがある箇所として報告する。
//
// 注意: 英語原文と日本語訳の対応をキーワード一致で機械的に見るだけなので、
// 「本当に表記が揺れている」か「その用語を訳文で言い換えている」かは
// 人間の確認が必要（誤検知を含む一覧として使う）。
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadI18n } from "./lib/load-i18n.mjs";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const API = "https://api.gatcg.com";

const prefixes = process.argv.slice(2);

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// app.js の matchedTerms() と同一のロジック（英語効果文とのマッチ判定）
function englishTermKeys(effectEn, termKeys) {
  const haystack = `${effectEn || ""}`.replace(/\*/g, "").toLowerCase();
  return termKeys.filter((key) => new RegExp("\\b" + escapeRegExp(key)).test(haystack));
}

// app.js の highlightTerms() と同一のロジック（見出し語の抽出）
function jpCore(jp) {
  return String(jp || "").split("（")[0].trim();
}

async function fetchAllCards() {
  const map = new Map();
  const prefixList = prefixes.length ? prefixes : [null];
  for (const prefix of prefixList) {
    let page = 1;
    for (;;) {
      const p = new URLSearchParams({ page: String(page), page_size: "50" });
      if (prefix) p.set("prefix", prefix);
      const res = await fetch(`${API}/cards/search?${p.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status} (prefix=${prefix}, page=${page})`);
      const json = await res.json();
      for (const c of json.data || []) {
        if (c.slug && typeof c.effect === "string") map.set(c.slug, c.effect);
      }
      if (!json.has_more) break;
      page++;
    }
  }
  return map;
}

async function main() {
  const { i18n } = loadI18n(root);
  const terms = i18n.terms || {};
  const cards = i18n.cards || {};
  const termKeys = Object.keys(terms);

  console.log(prefixes.length ? `対象 prefix: ${prefixes.join(", ")}` : "対象 prefix: 全件");
  const enMap = await fetchAllCards();
  console.log(`英語原文を取得: ${enMap.size}件`);

  let checked = 0;
  const problems = [];

  for (const [slug, card] of Object.entries(cards)) {
    const effectEn = enMap.get(slug);
    if (effectEn === undefined || !card.effect) continue;
    checked++;
    const jpEffect = String(card.effect);
    for (const key of englishTermKeys(effectEn, termKeys)) {
      const core = jpCore(terms[key].jp);
      if (core.length >= 2 && !jpEffect.includes(core)) {
        problems.push({ slug, name: card.name, key, core });
      }
    }
  }

  console.log(`日英とも訳文がある対象カード: ${checked}件`);
  console.log(`用語ハイライトが効かない疑いのある箇所: ${problems.length}件`);
  for (const p of problems) {
    console.log(`  [${p.slug}] ${p.name || ""} — EN に "${p.key}" あり / JP訳に「${p.core}」なし`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
