// SEOフェーズ1: カード個別ページ静的生成スクリプト(要件: tmp/SEOフェーズ1要件.md)
//
//   node scripts/build-card-pages.mjs            … スナップショットから生成(API不要)
//   node scripts/build-card-pages.mjs --refresh  … 公式APIを叩いてスナップショット更新→生成
//
// 生成物: /cards/<slug>/index.html(全カード) /cards/index.html(セット別索引)
//         /sets/<set-slug>/index.html(セット別一覧) /cards/cards.css /cards/cards.js  sitemap.xml
// 翻訳と表示規則は data/translations.js + data/tl/*.js + shared/js/card-i18n.js を
// window スタブ経由でそのまま読み込む(ブラウザ表示と同一ロジック)。
// 効果文の用語ハイライト等は shared/js/card-detail.js の実装を移植(同一規則)。

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadCards, fetchJson } from "./lib/cards-snapshot.mjs";
import { loadPageI18n } from "./lib/page-i18n.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://ga-card-tools-jp.pages.dev";
const API = "https://api.gatcg.com";
const FEATURED = path.join(ROOT, "tmp", "api-cache", "featured-sets.json");
const REFRESH = process.argv.includes("--refresh");

// ---------- 翻訳・共通ヘルパーの読み込み(ブラウザと同じ順序) ----------
// 実体は scripts/lib/page-i18n.mjs(build-tournament-pages.mjs と共用)

const { I18N, CI } = loadPageI18n(ROOT);
const esc = CI.escapeHtml;

// ---------- スナップショット取得 ----------
// 取得・保存の実体は scripts/lib/cards-snapshot.mjs(build-tournament-pages.mjs と共用)

// エキスパンショングループ(公式ロゴ付き)。--refresh 時またはキャッシュ未生成時に取得
async function loadFeaturedSets() {
  if (!REFRESH && existsSync(FEATURED)) {
    return JSON.parse(readFileSync(FEATURED, "utf8"));
  }
  try {
    const groups = await fetchJson(`${API}/featured-sets`);
    mkdirSync(path.dirname(FEATURED), { recursive: true });
    writeFileSync(FEATURED, JSON.stringify(groups));
    process.stderr.write(`エキスパンショングループ取得: ${groups.length}件(公式ロゴ付き)\n`);
    return groups;
  } catch (e) {
    process.stderr.write(`featured-sets 取得失敗(ロゴなしで続行): ${e.message}\n`);
    return [];
  }
}

// ---------- 汎用 ----------

const setSlug = (prefix) => prefix.toLowerCase().replace(/\s+/g, "-");

// meta.sets(発売日の新しい順)から prefix → {label, order} を引く
const SET_LABELS = new Map();
(I18N.meta.sets || []).forEach((s, i) => {
  (s.prefixes || []).forEach((p) => { if (!SET_LABELS.has(p)) SET_LABELS.set(p, { label: s.label, order: i }); });
});
const setLabel = (prefix) => (SET_LABELS.get(prefix) || {}).label || prefix;
const setOrder = (prefix) => SET_LABELS.has(prefix) ? SET_LABELS.get(prefix).order : 9999;

// 効果テキストのプレーン化(description用): マークダウン記号を除去
function plainEffect(text, name) {
  if (!text) return "";
  let s = name ? String(text).split("CARDNAME").join(name) : String(text);
  return s.replace(/\*+/g, "").replace(/\s+/g, " ").trim();
}

function truncate(s, n) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

// API側で日付が未設定のセットは epoch 0 が返るため、日付なし("")として扱う。
// 空文字は降順ソートで末尾に来るので、newestFirst() の並び順は従来(1970-01-01)と変わらない。
const day = (iso) => {
  const d = (iso || "").slice(0, 10);
  return d === "1970-01-01" ? "" : d;
};

// 版を「所属セットの発売日が新しい順」に並べたカードのビューを返す。
// 代表画像・パンくず・収録一覧すべて最新版基準(指摘: 最古版だと旧セットの絵柄になる)。
function newestFirst(card) {
  const eds = [...(card.editions || card.result_editions || [])].sort((a, b) =>
    day(b.set && b.set.release_date).localeCompare(day(a.set && a.set.release_date))
  );
  return { ...card, editions: eds, result_editions: eds };
}

// ---------- 効果文ハイライト(shared/js/card-detail.js から移植・同一規則) ----------

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// 効果文中に登場するゲーム用語(terms辞書のキーが英語効果文に含まれるもの)を抽出
function matchedTerms(card) {
  const haystack = `${card.effect || ""}`.replace(/\*/g, "").toLowerCase();
  const found = [];
  Object.keys(I18N.terms || {}).forEach((key) => {
    if (new RegExp("\\b" + escapeRegExp(key)).test(haystack)) found.push(I18N.terms[key]);
  });
  return found;
}

function highlightTerms(html, terms) {
  if (!terms || !terms.length) return html;
  const cores = [...new Set(
    terms.map((t) => String(t.jp || "").split("（")[0].trim()).filter((c) => c.length >= 2)
  )].sort((a, b) => b.length - a.length);
  if (!cores.length) return html;
  const re = new RegExp("(" + cores.map(escapeRegExp).join("|") + ")", "g");
  return html.replace(re, '<span class="term-hl">$1</span>');
}

function highlightSubtypes(html, card) {
  const map = (I18N.meta && I18N.meta.subtypes) || {};
  const cores = [...new Set(
    (card.subtypes || []).map((code) => map[code]).filter((jp) => jp && jp.length >= 2)
  )].sort((a, b) => b.length - a.length);
  if (!cores.length) return html;
  const re = new RegExp("(" + cores.map(escapeRegExp).join("|") + ")", "g");
  return html.replace(re, '<span class="subtype-hl">$1</span>');
}

function highlightCardName(html, card) {
  const name = CI.jpName(card).trim();
  if (name.length < 2 || !CI.hasJapanese(name)) return html;
  const re = new RegExp(escapeRegExp(name), "g");
  return html.replace(re, '<span class="card-name-hl">$&</span>');
}

function applyOutsideSpans(html, className, fn) {
  const re = new RegExp(`(<span class="${className}">.*?</span>)`, "g");
  return html.split(re).map((seg, i) => (i % 2 === 1 ? seg : fn(seg))).join("");
}

// 日本語効果テキスト一式(用語・サブタイプ・自己参照のハイライト込み)をHTML化
function jpEffectHtml(face, terms) {
  const t = CI.tr(face);
  const jpEffect = t && t.effect ? t.effect : null;
  if (jpEffect) {
    let html = CI.renderEffect(jpEffect);
    html = highlightCardName(html, face);
    html = applyOutsideSpans(html, "card-name-hl", (seg) => highlightTerms(seg, terms));
    html = applyOutsideSpans(html, "card-name-hl", (seg) => highlightSubtypes(seg, face));
    return html;
  }
  if (!face.effect) return '<span class="cp-muted">（効果テキストなし）</span>';
  return '<span class="cp-muted">日本語訳はまだありません（翻訳募集中）。下の英語原文をご覧ください。</span>';
}

// ---------- head 共通(フェーズ0と同型のOGP) ----------

function headMeta({ title, description, canonical, ogImage }) {
  return `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data: https://api.gatcg.com; script-src 'self' https://static.cloudflareinsights.com; connect-src 'self' https://cloudflareinsights.com; style-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="no-referrer">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Grand Archive 日本語カードDB">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${ogImage}">
<meta property="og:locale" content="ja_JP">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${ogImage}">
<link rel="stylesheet" href="/cards/cards.css">
<script src="/cards/cards.js" defer></script>
<!-- Cloudflare Web Analytics -->
<script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "79f367803da7466d9b8edd3476edb554"}'></script>`;
}

function breadcrumbLd(items) {
  return `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map(([name, url], i) => ({
      "@type": "ListItem", position: i + 1, name, ...(url ? { item: SITE + url } : {}),
    })),
  })}</script>`;
}

function siteHeader() {
  return `<header class="cp-site"><a href="/" class="cp-brand"><span class="cp-mark">GA</span>Grand Archive 日本語カードDB</a><nav><a href="/cards/">エキスパンション一覧</a><a href="/tools/deck-builder/">デッキ構築</a></nav></header>`;
}

function siteFooter() {
  return `<footer class="cp-foot"><p>本サイトは非公式のファンサイトです。カードの著作権は <a href="https://grandarchivetcg.com/" rel="external">Weebs of the Shore</a> に帰属します。カードデータは公式API(api.gatcg.com)を利用しています。カード名・効果の日本語訳は当サイトによる非公式の独自翻訳です（公式の訳ではありません）。プレイの際は英語原文をご確認ください。</p></footer>`;
}

// ---------- カード面(表/裏共通)の描画部品 ----------

function infoTable(face) {
  const rows = [];
  const push = (k, v) => { if (v !== "" && v != null) rows.push(`<tr><th>${k}</th><td>${v}</td></tr>`); };
  push("タイプ", (face.types || []).map((v) => esc(CI.label("types", v))).join("、"));
  push("クラス", (face.classes || []).map((v) => esc(CI.label("classes", v))).join("、"));
  push("エレメント", (face.elements || []).map((v) => esc(CI.label("elements", v))).join("、"));
  push("サブタイプ", (face.subtypes || []).map((v) => esc(CI.label("subtypes", v))).join("、"));
  if (face.cost_memory != null) push("メモリーコスト", face.cost_memory);
  if (face.cost_reserve != null) push("リザーブコスト", face.cost_reserve);
  if (face.cost_memory == null && face.cost_reserve == null && face.cost) {
    push("コスト", `${esc(String(face.cost.value))}（${esc(String(face.cost.type))}）`);
  }
  push("レベル", face.level != null ? face.level : "");
  push("ライフ", face.life != null ? face.life : "");
  push("パワー", face.power != null ? face.power : "");
  push("耐久", face.durability != null ? face.durability : "");
  push("スピード", CI.speedLabel(face));
  return `<table class="cp-table cp-info"><tbody>${rows.join("")}</tbody></table>`;
}

function translationBadge(face) {
  const yes = CI.isTranslated(face);
  return `<span class="cp-badge ${yes ? "cp-badge-yes" : "cp-badge-no"}">${yes ? "日本語訳あり" : "未翻訳"}</span>`;
}

// 使用可否バナー(専用フォーマット or 使用禁止。モーダルと同じ判定)
function formatBanner(card) {
  const excl = CI.exclusiveFormat(card);
  if (excl) {
    const info = CI.EXCLUSIVE_FORMAT_INFO[excl];
    return `<p class="cp-banner cp-banner-${info.cls}">${info.icon} ${esc(info.label + CI.exclusiveNote(excl))}</p>`;
  }
  const banned = CI.bannedFormats(card);
  if (banned.length) {
    return `<p class="cp-banner">🚫 使用禁止：${esc(banned.map((f) => CI.FORMAT_JP[f] || f).join("・"))}</p>`;
  }
  return "";
}

function effectSections(face, terms) {
  const enBlock = face.effect
    ? `<section class="cp-block"><h2>効果（英語原文）</h2><p class="cp-effect cp-en">${CI.renderEffect(face.effect, face.name)}</p></section>`
    : "";
  return `<section class="cp-block"><h2>効果（日本語）</h2><p class="cp-effect">${jpEffectHtml(face, terms)}</p></section>${enBlock}`;
}

function termsBlock(terms) {
  if (!terms.length) return "";
  const items = terms.map((t) => `<li><span class="cp-term-jp">${esc(t.jp)}</span><span class="cp-term-desc">${esc(t.desc)}</span></li>`).join("");
  return `<section class="cp-block"><h2>このカードの用語</h2><ul class="cp-terms">${items}</ul></section>`;
}

// ---------- カード個別ページ ----------

function cardPage(rawCard) {
  const card = newestFirst(rawCard); // 代表=最新セットの版
  const t = CI.tr(card);
  const translated = CI.isTranslated(card);
  const jpNm = translated && t.name ? t.name : "";
  const enName = card.name;
  const h1 = jpNm || enName;
  const url = `/cards/${card.slug}/`;
  const eds = card.editions;
  const primary = eds[0] || null;
  const primaryPrefix = primary && primary.set ? primary.set.prefix : "";
  const imgs = CI.cardImages(card);
  const mainImg = imgs.length ? imgs[0].url : null;

  const title = jpNm
    ? `${jpNm} | ${enName} - Grand Archive 日本語カードDB`
    : `${enName} - Grand Archive 日本語カードDB`;
  const kind = [
    (card.types || []).join("/"),
    (card.classes || []).join("/"),
    card.element || "",
  ].filter(Boolean).join(" / ");
  const effDesc = plainEffect((t && t.effect) || card.effect, enName);
  const description = truncate(
    `Grand Archive「${enName}${jpNm ? `（${jpNm}）` : ""}」の日本語効果テキスト・収録セット${card.rule && card.rule.length ? "・裁定" : ""}。${kind}。${effDesc}`,
    160
  );

  // イラスト/版の切り替えサムネイル(2枚以上のときのみ。#art=<set-slug> で初期選択)
  const thumbs = imgs.length > 1
    ? `<div class="cp-arts">${imgs.map((im, i) =>
        `<button class="cp-thumb${i === 0 ? " active" : ""}" type="button" data-url="${esc(im.url)}" data-prefix="${esc(setSlug(im.prefix === "?" ? "" : im.prefix))}" title="${esc(im.label)}"><img loading="lazy" src="${esc(im.url)}" alt=""><span>${esc(im.label)}</span></button>`
      ).join("")}</div>`
    : "";

  const terms = matchedTerms(card);
  const flavor = (t && t.flavor) || card.flavor;
  const flavorBlock = flavor
    ? `<section class="cp-block"><h2>フレーバーテキスト</h2><p class="cp-flavor">${esc(flavor)}</p></section>`
    : "";

  // 収録セットと版(最新順)
  const edRows = eds.map((ed) => {
    const set = ed.set || {};
    return `<tr><td><a href="/sets/${setSlug(set.prefix || "")}/">${esc(setLabel(set.prefix || ""))}</a></td><td>${day(set.release_date) || "—"}</td><td>#${esc(ed.collector_number || "")}</td><td>${esc(CI.rarityCode(ed.rarity))}</td><td>${esc(ed.illustrator || "")}</td></tr>`;
  }).join("");
  const editions = eds.length
    ? `<section class="cp-block"><h2>収録セットと版</h2><div class="cp-scroll"><table class="cp-table"><thead><tr><th>セット</th><th>発売日</th><th>番号</th><th>レア</th><th>イラスト</th></tr></thead><tbody>${edRows}</tbody></table></div></section>`
    : "";

  // 公式裁定
  const rules = (card.rule || []).filter((r) => r && r.description);
  const ruleBlock = rules.length
    ? `<section class="cp-block"><h2>公式裁定（${rules.length}件）</h2><p class="cp-muted">※裁定は英語原文です。</p>${rules.map((r) => `<div class="cp-rule"><span class="cp-rule-date">${day(r.date_added)}</span><p>${esc(r.description)}</p></div>`).join("")}</section>`
    : "";

  // 両面カードの裏面(モーダルと同様に表面と同じ体裁でスタック表示)
  const back = CI.backFace(card);
  let backBlock = "";
  let backTerms = [];
  if (back) {
    backTerms = matchedTerms(back);
    const backJp = CI.jpName(back);
    backBlock = `<section class="cp-block cp-back"><h2>裏面</h2>
  <article class="cp-card">
    <div class="cp-media">${back.image ? `<img src="${esc(back.image)}" alt="${esc(backJp)} のカード画像" width="360" loading="lazy">` : ""}</div>
    <div class="cp-body">
      <h3 class="cp-back-name">${esc(backJp)}${backJp !== back.name ? `<span class="cp-en-name">${esc(back.name || "")}</span>` : ""}</h3>
      ${translationBadge(back)}
      ${infoTable(back)}
      ${effectSections(back, backTerms)}
    </div>
  </article></section>`;
  }

  // 用語解説(表裏の用語をマージ・重複排除)
  const allTerms = [...terms];
  for (const bt of backTerms) if (!allTerms.some((x) => x.jp === bt.jp)) allTerms.push(bt);

  // 関連カード
  const rel = [];
  for (const list of [card.references, card.referenced_by]) {
    for (const r of list || []) {
      const c = r && r.slug ? r : r && r.card ? r.card : null;
      if (c && c.slug && c.name && !rel.some((x) => x.slug === c.slug)) rel.push(c);
    }
  }
  const relBlock = rel.length
    ? `<section class="cp-block"><h2>関連カード</h2><ul class="cp-links">${rel.map((c) => `<li><a href="/cards/${c.slug}/">${esc(CI.jpName(c))}</a></li>`).join("")}</ul></section>`
    : "";

  return `<!DOCTYPE html>
<html lang="ja">
<head>
${headMeta({ title, description, canonical: SITE + url, ogImage: mainImg || `${SITE}/ogp.png` })}
${breadcrumbLd([["トップ", "/"], ["エキスパンション一覧", "/cards/"], [setLabel(primaryPrefix), primaryPrefix ? `/sets/${setSlug(primaryPrefix)}/` : null], [h1]])}
</head>
<body>
${siteHeader()}
<nav class="cp-crumb"><a href="/">トップ</a> › <a href="/cards/">エキスパンション一覧</a> › ${primaryPrefix ? `<a href="/sets/${setSlug(primaryPrefix)}/">${esc(setLabel(primaryPrefix))}</a>` : ""} › <span>${esc(h1)}</span></nav>
<main class="cp-main">
  <article class="cp-card">
    <div class="cp-media">${mainImg ? `<img id="cp-main-img" src="${mainImg}" alt="${esc(h1)} のカード画像" width="360">` : ""}${thumbs}</div>
    <div class="cp-body">
      <h1>${esc(h1)}${jpNm ? `<span class="cp-en-name">${esc(enName)}</span>` : ""}</h1>
      ${translationBadge(card)}
      ${formatBanner(card)}
      ${infoTable(card)}
      ${effectSections(card, terms)}
      ${flavorBlock}
    </div>
  </article>
  ${backBlock}
  ${termsBlock(allTerms)}
  ${editions}
  ${ruleBlock}
  ${relBlock}
  <section class="cp-block cp-actions">
    <a class="cp-btn cp-btn-main" href="/#card/${card.slug}">カードDBの検索で詳細を開く</a>
    <a class="cp-btn" href="/tools/deck-builder/">デッキ構築ツールを開く</a>
  </section>
</main>
${siteFooter()}
</body>
</html>
`;
}

// ---------- セット一覧ページ・索引・sitemap ----------

function setPage(prefix, entries, logoUrl) {
  const label = setLabel(prefix);
  const url = `/sets/${setSlug(prefix)}/`;
  const title = `${label} カードリスト - Grand Archive 日本語カードDB`;
  const description = truncate(`Grand Archive「${label}」収録カード${entries.length}枚の日本語カードリスト。カード名・効果の日本語訳を掲載。`, 160);
  const rows = entries.map(({ card, ed }) => {
    const jp = CI.isTranslated(card) && I18N.cards[card.slug].name ? I18N.cards[card.slug].name : "";
    const img = ed.image ? `${API}${ed.image}` : "";
    return `<tr><td>#${esc(ed.collector_number || "")}</td><td><a href="/cards/${card.slug}/#art=${setSlug(prefix)}"${img ? ` data-img="${esc(img)}"` : ""}>${esc(jp || card.name)}</a>${jp ? `<span class="cp-en-inline">${esc(card.name)}</span>` : ""}</td><td>${esc((card.types || []).map((v) => CI.label("types", v)).join("、"))}</td><td>${esc(CI.rarityCode(ed.rarity))}</td></tr>`;
  }).join("");
  return `<!DOCTYPE html>
<html lang="ja">
<head>
${headMeta({ title, description, canonical: SITE + url, ogImage: logoUrl || `${SITE}/ogp.png` })}
${breadcrumbLd([["トップ", "/"], ["エキスパンション一覧", "/cards/"], [label]])}
</head>
<body>
${siteHeader()}
<nav class="cp-crumb"><a href="/">トップ</a> › <a href="/cards/">エキスパンション一覧</a> › <span>${esc(label)}</span></nav>
<main class="cp-main">
  ${logoUrl ? `<img class="cp-logo cp-logo-page" src="${esc(logoUrl)}" alt="${esc(label)} ロゴ" loading="lazy">` : ""}
  <h1>${esc(label)} カードリスト</h1>
  <p class="cp-muted">収録 ${entries.length} 枚。カード名にマウスを載せるとカード画像を表示、クリックで日本語の詳細ページを開きます。カード番号は公式データに準拠しています（関連製品側の番号などによる欠番があります）。</p>
  <p class="cp-searchbar"><input type="search" class="cp-search" data-filter=".cp-table tbody tr" placeholder="カード名・番号・タイプで絞り込み"></p>
  <div class="cp-scroll"><table class="cp-table"><thead><tr><th>番号</th><th>カード名</th><th>タイプ</th><th>レア</th></tr></thead><tbody>${rows}</tbody></table></div>
</main>
${siteFooter()}
</body>
</html>
`;
}

// エキスパンショングループ(公式 featured-sets)ごとにセクション分けした索引。
// groups: [{name, logoUrl, sets:[prefix,...]}] ("その他" はロゴなしで最後)
function indexPage(groups, setsByPrefix, totalCards) {
  const title = "エキスパンション一覧 - Grand Archive 日本語カードDB";
  const description = `Grand Archive 全${totalCards}枚のカードを日本語で。エキスパンション一覧から各カードの日本語効果・収録情報を確認できます。`;
  const sections = groups.map((g) => {
    const items = g.sets.map((prefix) =>
      `<li><a href="/sets/${setSlug(prefix)}/">${esc(setLabel(prefix))}</a><span class="cp-count">${setsByPrefix.get(prefix).length}枚</span></li>`
    ).join("");
    const heading = g.logoUrl
      ? `<h2 class="cp-group-head"><img class="cp-logo" src="${esc(g.logoUrl)}" alt="${esc(g.name)} ロゴ" loading="lazy"><span class="cp-group-name">${esc(g.name)}</span></h2>`
      : `<h2 class="cp-group-head"><span class="cp-group-name cp-group-name-plain">${esc(g.name)}</span></h2>`;
    return `<section class="cp-group">${heading}<ul class="cp-setlist">${items}</ul></section>`;
  }).join("\n");
  return `<!DOCTYPE html>
<html lang="ja">
<head>
${headMeta({ title, description, canonical: `${SITE}/cards/`, ogImage: `${SITE}/ogp.png` })}
${breadcrumbLd([["トップ", "/"], ["エキスパンション一覧"]])}
</head>
<body>
${siteHeader()}
<nav class="cp-crumb"><a href="/">トップ</a> › <span>エキスパンション一覧</span></nav>
<main class="cp-main">
  <h1>エキスパンション一覧</h1>
  <p class="cp-muted">全 ${totalCards} 枚。<a href="/">トップページの検索</a>では条件を組み合わせた絞り込みができます。</p>
  <p class="cp-searchbar"><input type="search" class="cp-search" data-filter=".cp-setlist li" placeholder="セット名・略称で絞り込み（例: RDO）"></p>
  ${sections}
</main>
${siteFooter()}
</body>
</html>
`;
}

const CARDS_CSS = `/* カード個別ページ・セット一覧(静的生成)用。生成元: scripts/build-card-pages.mjs */
:root { --bg:#12141a; --panel:#171a21; --line:#262b36; --text:#e6e8ee; --muted:#9aa2b1; --accent:#d9a441; --accent-2:#6ea8fe; --accent-3:#e07bd0; }
* { box-sizing:border-box; }
[hidden] { display:none !important; } /* 絞り込みJSのhidden属性がdisplay指定に負けないように */
body { margin:0; background:var(--bg); color:var(--text); font:15px/1.7 system-ui,-apple-system,"Segoe UI",sans-serif; }
a { color:var(--accent-2); text-decoration:none; }
a:hover { text-decoration:underline; }
.cp-site { display:flex; flex-wrap:wrap; gap:10px 16px; align-items:center; justify-content:space-between; padding:12px 20px; border-bottom:1px solid var(--line); }
.cp-brand { display:flex; align-items:center; gap:10px; color:var(--text); font-weight:700; }
.cp-mark { display:grid; place-items:center; width:34px; height:34px; border-radius:8px; background:var(--accent); color:#201a0a; font-weight:800; letter-spacing:1px; }
.cp-site nav { display:flex; gap:14px; font-size:.9rem; }
.cp-crumb { padding:10px 20px; font-size:.82rem; color:var(--muted); max-width:1000px; margin:0 auto; }
.cp-crumb span { color:var(--text); }
.cp-main { max-width:1000px; margin:0 auto; padding:8px 20px 40px; }
h1 { font-size:1.45rem; margin:.2em 0 .5em; line-height:1.35; }
.cp-en-name { display:block; font-size:.95rem; font-weight:400; color:var(--muted); margin-top:2px; }
.cp-en-inline { display:block; font-size:.78rem; color:var(--muted); }
h2 { font-size:1.02rem; border-left:3px solid var(--accent); padding-left:10px; margin:26px 0 10px; }
.cp-card { display:grid; grid-template-columns:minmax(220px,360px) 1fr; gap:24px; align-items:start; }
.cp-media img { width:100%; height:auto; border-radius:12px; border:1px solid var(--line); }
.cp-arts { display:flex; flex-wrap:wrap; gap:8px; margin-top:10px; }
.cp-thumb { width:74px; background:var(--panel); border:2px solid var(--line); border-radius:8px; padding:4px; cursor:pointer; color:var(--muted); font-size:.62rem; line-height:1.3; }
.cp-thumb img { width:100%; height:auto; border-radius:4px; display:block; }
.cp-thumb span { display:block; text-align:center; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.cp-thumb.active { border-color:var(--accent); color:var(--text); }
.cp-table { width:100%; border-collapse:collapse; font-size:.9rem; }
.cp-table th, .cp-table td { text-align:left; padding:7px 10px; border-bottom:1px solid var(--line); vertical-align:top; }
.cp-table thead th { color:var(--muted); font-size:.78rem; }
.cp-info th { width:9em; color:var(--muted); font-weight:600; }
.cp-effect { background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:12px 14px; margin:0; }
.cp-en { color:var(--muted); }
.cp-effect .term-hl { color:var(--accent-2); font-weight:600; background:color-mix(in srgb, var(--accent-2) 14%, transparent); border-radius:4px; padding:0 2px; }
.cp-effect .subtype-hl { color:var(--accent); font-weight:600; background:color-mix(in srgb, var(--accent) 14%, transparent); border-radius:4px; padding:0 2px; }
.cp-effect .card-name-hl { color:var(--accent-3); font-weight:600; background:color-mix(in srgb, var(--accent-3) 14%, transparent); border-radius:4px; padding:0 2px; }
.cp-flavor { color:var(--muted); font-style:italic; }
.cp-muted { color:var(--muted); font-size:.88rem; }
.cp-badge { display:inline-block; color:#fff; font-size:.72rem; font-weight:700; padding:2px 10px; border-radius:999px; margin:0 0 10px; }
.cp-badge-yes { background:#2f9e6b; }
.cp-badge-no { background:#7a6320; }
.cp-banner { margin:0 0 12px; padding:8px 12px; background:rgba(185,28,28,.15); border:1px solid #b91c1c; border-radius:8px; color:#fca5a5; font-weight:700; font-size:.9rem; }
.cp-banner-pantheon { background:rgba(124,58,237,.15); border-color:#7c3aed; color:#c4b5fd; }
.cp-banner-draft { background:rgba(14,116,144,.15); border-color:#0e7490; color:#67e8f9; }
.cp-banner-standard { background:rgba(180,83,9,.15); border-color:#b45309; color:#fcd34d; }
.cp-terms { list-style:none; padding:0; margin:0; }
.cp-terms li { padding:7px 0; border-bottom:1px dashed var(--line); }
.cp-term-jp { display:block; font-weight:700; color:var(--accent-2); }
.cp-term-desc { color:var(--muted); font-size:.88rem; }
.cp-back-name { font-size:1.15rem; margin:.2em 0 .5em; }
.cp-rule { display:flex; gap:12px; padding:8px 0; border-bottom:1px dashed var(--line); }
.cp-rule-date { color:var(--muted); font-size:.8rem; white-space:nowrap; padding-top:2px; }
.cp-rule p { margin:0; font-size:.9rem; }
.cp-links { list-style:none; padding:0; margin:0; display:flex; flex-wrap:wrap; gap:8px 16px; }
.cp-actions { display:flex; flex-wrap:wrap; gap:12px; margin-top:28px; }
.cp-btn { display:inline-block; padding:10px 18px; border-radius:10px; border:1px solid var(--line); background:var(--panel); color:var(--text); font-weight:600; }
.cp-btn:hover { border-color:var(--accent); text-decoration:none; }
.cp-btn-main { background:var(--accent); border-color:var(--accent); color:#201a0a; }
.cp-group { margin:26px 0 6px; }
.cp-group-head { display:flex; align-items:center; gap:14px; border-left:none; padding-left:0; margin:0 0 4px; }
.cp-logo { max-height:64px; max-width:240px; width:auto; filter:drop-shadow(0 2px 6px rgba(0,0,0,.5)); }
.cp-logo-page { display:block; max-height:80px; margin:14px 0 2px; }
.cp-group-name { color:var(--muted); font-size:.85rem; font-weight:600; }
.cp-group-name-plain { color:var(--text); font-size:1.02rem; border-left:3px solid var(--accent); padding-left:10px; }
.cp-setlist { list-style:none; padding:0; margin:10px 0 16px; display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:10px; }
.cp-setlist li { display:flex; justify-content:space-between; gap:10px; background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:10px 14px; }
.cp-count { color:var(--muted); font-size:.85rem; white-space:nowrap; }
.cp-searchbar { margin:14px 0 6px; }
.cp-search { width:100%; max-width:420px; padding:9px 12px; border-radius:10px; border:1px solid var(--line); background:var(--panel); color:var(--text); font-size:.95rem; }
.cp-search:focus { outline:2px solid var(--accent-2); outline-offset:1px; }
.cp-scroll { overflow-x:auto; }
#cp-preview { position:fixed; z-index:50; pointer-events:none; width:240px; border-radius:10px; border:1px solid var(--line); box-shadow:0 8px 28px rgba(0,0,0,.55); display:none; }
.cp-foot { border-top:1px solid var(--line); margin-top:30px; padding:16px 20px; color:var(--muted); font-size:.8rem; }
.cp-foot p { max-width:1000px; margin:0 auto; }
@media (max-width:640px) { .cp-card { grid-template-columns:1fr; } .cp-media { max-width:320px; } }
`;

const CARDS_JS = `// カード個別ページ・セット一覧(静的生成)用の軽量スクリプト。生成元: scripts/build-card-pages.mjs
// 1) 文字列絞り込み  2) セット一覧のホバー画像プレビュー  3) 個別ページのイラスト切替(#art 初期選択)
"use strict";
(() => {
  // ---- 1) 絞り込み: <input data-filter="対象セレクタ"> の入力で対象行を表示/非表示 ----
  // グループ見出し(.cp-group)がある場合: グループ名がヒットしたら配下を全表示、
  // 全滅したグループはセクションごと隠す。
  document.querySelectorAll("input[data-filter]").forEach((input) => {
    const targets = Array.from(document.querySelectorAll(input.dataset.filter));
    input.addEventListener("input", () => {
      const q = input.value.trim().toLowerCase();
      targets.forEach((el) => {
        const group = el.closest(".cp-group");
        const groupName = group ? (group.querySelector(".cp-group-name") || {}).textContent || "" : "";
        el.hidden = q !== "" &&
          !el.textContent.toLowerCase().includes(q) &&
          !groupName.toLowerCase().includes(q);
      });
      document.querySelectorAll(".cp-group").forEach((g) => {
        g.hidden = q !== "" && !Array.from(g.querySelectorAll(".cp-setlist li")).some((li) => !li.hidden);
      });
    });
  });

  // ---- 2) ホバープレビュー: [data-img] にマウスを載せるとカード画像を表示(タッチ端末は無効) ----
  if (window.matchMedia("(hover: hover)").matches) {
    const links = document.querySelectorAll("[data-img]");
    if (links.length) {
      const img = document.createElement("img");
      img.id = "cp-preview";
      img.alt = "";
      document.body.appendChild(img);
      const move = (e) => {
        const pad = 16, w = 240, h = 336;
        let x = e.clientX + pad, y = e.clientY + pad;
        if (x + w > innerWidth) x = e.clientX - w - pad;
        if (y + h > innerHeight) y = Math.max(8, innerHeight - h - 8);
        img.style.left = x + "px";
        img.style.top = y + "px";
      };
      links.forEach((a) => {
        a.addEventListener("mouseenter", (e) => {
          img.src = a.dataset.img;
          img.style.display = "block";
          move(e);
        });
        a.addEventListener("mousemove", move);
        a.addEventListener("mouseleave", () => {
          img.style.display = "none";
          img.removeAttribute("src");
        });
      });
    }
  }

  // ---- 3) イラスト切替: サムネクリックで主画像を差し替え。#art=<set-slug> で初期選択 ----
  const main = document.getElementById("cp-main-img");
  const thumbs = Array.from(document.querySelectorAll(".cp-thumb"));
  if (main && thumbs.length) {
    const select = (btn) => {
      main.src = btn.dataset.url;
      thumbs.forEach((b) => b.classList.toggle("active", b === btn));
    };
    thumbs.forEach((btn) => btn.addEventListener("click", () => select(btn)));
    const m = location.hash.match(/^#art=([a-z0-9-]+)/);
    if (m) {
      const hit = thumbs.find((b) => b.dataset.prefix === m[1]);
      if (hit) select(hit);
    }
  }
})();
`;

// 大会入賞デッキ(scripts/build-tournament-pages.mjs が生成)のURLを集める。
// データが無ければ何も返さない(大会スキャン→カードページ生成の順に実行する運用)。
function tournamentUrls() {
  const dir = path.join(ROOT, "data", "tournaments", "events");
  if (!existsSync(dir)) return [];
  const out = [{ loc: `${SITE}/tournaments/`, lastmod: null, changefreq: "daily", priority: "0.8" }];
  for (const f of readdirSync(dir).filter((n) => n.endsWith(".json"))) {
    const ev = JSON.parse(readFileSync(path.join(dir, f), "utf8"));
    const lastmod = day(ev.startAt) || null;
    out.push({ loc: `${SITE}/tournaments/${ev.id}/`, lastmod, changefreq: "yearly", priority: "0.7" });
    for (const d of ev.decklists || []) {
      out.push({ loc: `${SITE}/tournaments/${ev.id}/decks/${d.player}/`, lastmod, changefreq: "yearly", priority: "0.5" });
    }
  }
  return out;
}

function buildSitemap(cards, setsSorted) {
  const urls = [];
  const add = (loc, lastmod, changefreq, priority) => urls.push({ loc, lastmod, changefreq, priority });
  add(`${SITE}/`, null, "weekly", "1.0");
  add(`${SITE}/tools/deck-builder/`, null, "weekly", "0.8");
  add(`${SITE}/tools/glossary/`, null, "monthly", "0.6");
  add(`${SITE}/tools/print/`, null, "monthly", "0.5");
  add(`${SITE}/cards/`, null, "weekly", "0.8");
  urls.push(...tournamentUrls());
  for (const [prefix, entries] of setsSorted) {
    const lastmod = entries.reduce((m, { card }) => (day(card.last_update) > m ? day(card.last_update) : m), "");
    add(`${SITE}/sets/${setSlug(prefix)}/`, lastmod || null, "monthly", "0.6");
  }
  for (const c of cards) add(`${SITE}/cards/${c.slug}/`, day(c.last_update) || null, "monthly", "0.6");
  const body = urls.map((u) =>
    `  <url>\n    <loc>${u.loc}</loc>\n${u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>\n` : ""}    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
  ).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

// ---------- main ----------

async function main() {
  const cards = await loadCards(ROOT, { force: REFRESH });

  // セット別グルーピング(カードは版ごとに所属セットへ。同一セット内の重複版は先頭のみ)
  const bySets = new Map();
  for (const card of cards) {
    const seen = new Set();
    for (const ed of card.editions || card.result_editions || []) {
      const prefix = ed.set && ed.set.prefix;
      if (!prefix || seen.has(prefix)) continue;
      seen.add(prefix);
      if (!bySets.has(prefix)) bySets.set(prefix, []);
      bySets.get(prefix).push({ card, ed });
    }
  }
  for (const entries of bySets.values()) {
    entries.sort((a, b) => String(a.ed.collector_number || "").localeCompare(String(b.ed.collector_number || ""), "en", { numeric: true }));
  }
  const setsSorted = [...bySets.entries()].sort((a, b) => setOrder(a[0]) - setOrder(b[0]) || a[0].localeCompare(b[0]));

  // エキスパンショングループ(公式ロゴ)。カードが存在するprefixのみ拾い、残りは「その他」へ
  const featured = await loadFeaturedSets();
  const logoByPrefix = new Map(); // prefix → ロゴURL(セットページのog:image/見出しに使用)
  const groups = [];
  const grouped = new Set();
  for (const g of featured) {
    const prefixes = g.sets.map((s) => s.prefix).filter((p) => bySets.has(p))
      .sort((a, b) => setOrder(a) - setOrder(b) || a.localeCompare(b));
    if (!prefixes.length) continue;
    const logoUrl = g.image ? `${API}${g.image}` : null;
    prefixes.forEach((p) => { grouped.add(p); if (logoUrl) logoByPrefix.set(p, logoUrl); });
    groups.push({ name: g.name, logoUrl, sets: prefixes });
  }
  const rest = setsSorted.map(([p]) => p).filter((p) => !grouped.has(p));
  if (rest.length) groups.push({ name: "その他（プロモ・デモ・イベントパック等）", logoUrl: null, sets: rest });

  // 生成
  let n = 0;
  for (const card of cards) {
    const dir = path.join(ROOT, "cards", card.slug);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "index.html"), cardPage(card));
    if (++n % 500 === 0) process.stderr.write(`  カードページ ${n}/${cards.length}\n`);
  }
  for (const [prefix, entries] of setsSorted) {
    const dir = path.join(ROOT, "sets", setSlug(prefix));
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "index.html"), setPage(prefix, entries, logoByPrefix.get(prefix) || null));
  }
  writeFileSync(path.join(ROOT, "cards", "index.html"), indexPage(groups, bySets, cards.length));
  writeFileSync(path.join(ROOT, "cards", "cards.css"), CARDS_CSS);
  writeFileSync(path.join(ROOT, "cards", "cards.js"), CARDS_JS);
  writeFileSync(path.join(ROOT, "sitemap.xml"), buildSitemap(cards, setsSorted));

  const translated = cards.filter((c) => CI.isTranslated(c)).length;
  process.stderr.write(`\n生成完了: カード${cards.length}ページ(和訳あり${translated}) / セット${setsSorted.length}ページ / 索引 / sitemap.xml(${5 + setsSorted.length + cards.length}URL)\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
