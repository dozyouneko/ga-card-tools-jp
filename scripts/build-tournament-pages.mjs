// タスク#14: 大会入賞デッキ検索(設計: docs/design/14-大会入賞デッキ検索/大会入賞デッキ検索_設計.md)
//
//   node scripts/build-tournament-pages.mjs           … 新規大会をスキャンしてデータ更新→ページ生成
//   node scripts/build-tournament-pages.mjs --no-scan … APIを叩かず data/tournaments/ からページだけ生成
//   node scripts/build-tournament-pages.mjs --limit N … 1回のスキャンで見るid数の上限(初回分割取得用)
//
// 生成物: /tournaments/index.html(一覧) /tournaments/<id>/index.html(大会詳細・順位表)
//         /tournaments/<id>/decks/<player-id>/index.html(デッキ詳細) /tournaments/tournaments.css /.js
// データ : data/tournaments/index.json(一覧+スキャン位置) events/<id>.json pending.json(未確定大会)
//
// 公式Omnidex API(api-docs.gatcg.com/endpoints/omnidex)には一覧・検索がないため、
// イベントidを昇順に走査して対象カテゴリの大会を見つける。取得済みidは index.json に記録し、
// 2回目以降は新規id + pending のみを見る(既存の events/<id>.json は書き換えない)。

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadCards } from "./lib/cards-snapshot.mjs";
import { loadPageI18n } from "./lib/page-i18n.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://ga-card-tools-jp.pages.dev";
const API = "https://api.gatcg.com";
const DATA_DIR = path.join(ROOT, "data", "tournaments");
const EVENTS_DIR = path.join(DATA_DIR, "events");
const INDEX_JSON = path.join(DATA_DIR, "index.json");
const PENDING_JSON = path.join(DATA_DIR, "pending.json");
const OUT_DIR = path.join(ROOT, "tournaments");

// 収録対象カテゴリ。Omnidex側は自由文字列のため許可リスト方式(nationals等は実データ確認後に追加)
const CATEGORIES = ["store-championships", "regionals"];
// カテゴリの表示名(一覧・詳細のバッジ)
const CATEGORY_JP = {
  "store-championships": { label: "Store Champs", full: "Store Championship", cls: "store" },
  regionals: { label: "Regionals", full: "Regionals", cls: "regional" },
};

// 初回スキャンの下限id。id 49500 が概ね2026-04-04開催ぶん = RDOシーズン開始(2026-04-10)の直前。
// idは「作成順」で開催日と厳密には一致しないため、シーズン開始より少し手前を下限にしている。
const INITIAL_MIN_ID = 49500;
const PROBE_MISS_LIMIT = 60;  // 上端探索: 連続でこの数だけ404が続いたら終端とみなす
const PENDING_EXPIRE_DAYS = 60; // 確定しないまま経過したpendingを破棄するまでの日数
const CONCURRENCY = 6;

const NO_SCAN = process.argv.includes("--no-scan");
const LIMIT = (() => {
  const i = process.argv.indexOf("--limit");
  return i >= 0 ? parseInt(process.argv[i + 1], 10) : Infinity;
})();

const log = (s) => process.stderr.write(s + "\n");

// ---------- 翻訳・共通ヘルパー(build-card-pages.mjs と共用) ----------

const { CI, dataFiles } = loadPageI18n(ROOT);
const esc = CI.escapeHtml;

// ---------- API ----------

async function fetchJson(url, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (i >= tries) throw new Error(`${url}: ${e.message}`);
      await new Promise((r) => setTimeout(r, 500 * i));
    }
  }
}

const getEvent = (id) => fetchJson(`${API}/omnidex/events/${id}`);
const getSub = (id, sub) => fetchJson(`${API}/omnidex/events/${id}/${sub}`);

// 並列プールで ids を処理する(順序は保証しない)
async function pool(ids, worker) {
  let idx = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (idx < ids.length) {
      const i = idx++;
      await worker(ids[i], i);
    }
  }));
}

// ---------- カード名 → slug 解決 ----------

// 記号・大小の揺れを吸収(tools/deck-builder/app.js の normCardName と同一規則)
const normCardName = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "");

function indexCards(cards) {
  const byName = new Map();
  const bySlug = new Map();
  for (const card of cards) {
    bySlug.set(card.slug, card);
    const key = normCardName(card.name);
    if (!byName.has(key)) byName.set(key, card); // 同名は先頭のみ(完全一致のみ採用の方針を踏襲)
  }
  return { byName, bySlug };
}

// Omnidexの {card, quantity} 配列 → {slug, name, qty} 配列。未解決は slug: null
function resolveZone(entries, byName, unresolved) {
  return (entries || []).map((e) => {
    const card = byName.get(normCardName(e.card));
    if (!card) unresolved.add(e.card);
    return { slug: card ? card.slug : null, name: e.card, qty: e.quantity };
  });
}

// ---------- スキャン ----------

function readJson(file, fallback) {
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : fallback;
}

const today = () => new Date().toISOString().slice(0, 10);

function daysSince(iso) {
  return Math.floor((Date.now() - new Date(iso + "T00:00:00Z").getTime()) / 86400000);
}

// 大会1件を取得して「確定(event)」か「保留(pending)」かを判定する。
// 対象カテゴリ外・中止は null(=収録しない)。
async function collectEvent(ev, byName, unresolved) {
  if (!CATEGORIES.includes(ev.category)) return null;
  if (ev.status === "canceled") return null;

  const incomplete = ev.status !== "complete" || !ev.decklists;
  if (incomplete) return { pending: true };

  const [players, standingsRes, decklists] = await Promise.all([
    getSub(ev.id, "players"), getSub(ev.id, "standings"), getSub(ev.id, "decklists"),
  ]);
  const rows = (standingsRes && standingsRes.standings) || [];
  const decks = Array.isArray(decklists) ? decklists : [];
  if (!rows.length || !decks.length) return { pending: true };

  const nameById = {};
  for (const p of Array.isArray(players) ? players : []) nameById[p.id] = p.username;

  // standings は順位順に並んで返る(rankフィールドはないため配列順を順位として扱う)
  const standings = rows.map((r, i) => ({
    rank: i + 1,
    player: r.id,
    wins: r.statsWins ?? 0,
    losses: r.statsLosses ?? 0,
    ties: r.statsTies ?? 0,
    gwPercent: r.statsPercentGW ?? null,
    mwPercent: r.statsPercentMW ?? null,
    hasDeck: !!r.hasSubmittedDecklist && r.isDecklistPublic !== false,
    status: r.status || "",
  }));

  const zones = ["material", "main", "sideboard"];
  const deckByPlayer = decks
    .filter((d) => d && d.decklist)
    .map((d) => {
      const out = { player: d.player };
      for (const z of zones) out[z] = resolveZone(d.decklist[z], byName, unresolved);
      return out;
    });

  return {
    event: {
      id: ev.id,
      name: ev.name,
      category: ev.category,
      format: ev.format || "",
      startAt: ev.startAt || "",
      host: {
        name: (ev.host && ev.host.name) || "",
        address: (ev.host && ev.host.address) || "",
        country: (ev.host && ev.host.addressCountryCode) || "",
      },
      playerCount: Array.isArray(ev.players) ? ev.players.length : standings.length,
      swissRounds: ev.swissRounds ?? null,
      cutSize: ev.singleEliminationCutSize ?? null,
      url: ev.url || "",
      players: nameById,
      standings,
      decklists: deckByPlayer,
    },
  };
}

// [from, from+span) に存在するidが1つでもあるか(欠番をまたいで判定するため)。
// idは概ね密に埋まっているので、少数ずつ並列に見て見つかり次第打ち切る。
async function anyExists(from, span) {
  for (let i = 0; i < span; i += CONCURRENCY) {
    const chunk = Array.from({ length: Math.min(CONCURRENCY, span - i) }, (_, k) => from + i + k);
    const res = await Promise.all(chunk.map((id) => getEvent(id)));
    if (res.some(Boolean)) return true;
  }
  return false;
}

// 上端(現在の最大id)を探す。1件ずつ舐めると数千リクエストになるため、
// 指数的に飛ばして範囲を挟み込んでから二分探索する(欠番対策に PROBE_MISS_LIMIT 幅で判定)。
async function findTopId(startId) {
  let lo = startId - 1;                    // これ以下には存在するとみなす
  let hi = startId;                        // 存在しない領域が見つかるまで広げる
  let step = 64;
  while (await anyExists(hi, PROBE_MISS_LIMIT)) {
    lo = hi;
    hi += step;
    step *= 2;
  }
  while (lo + 1 < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (await anyExists(mid, PROBE_MISS_LIMIT)) lo = mid; else hi = mid;
  }
  // ここで [lo+1, lo+1+PROBE_MISS_LIMIT) は空と分かっているため、実在しうる最大idは lo
  return (await getEvent(lo)) ? lo : lo - 1;
}

async function scan(byName) {
  mkdirSync(EVENTS_DIR, { recursive: true });
  const index = readJson(INDEX_JSON, { updatedAt: "", scan: { minId: null, maxId: null }, events: [] });
  const pending = readJson(PENDING_JSON, []);
  const unresolved = new Set();

  const first = index.scan.maxId == null;
  const from = first ? INITIAL_MIN_ID : index.scan.maxId + 1;
  log(first ? `初回スキャン: id ${INITIAL_MIN_ID} から上端を探索します` : `前回の続き: id ${from} から`);
  const top = await findTopId(from);
  log(`上端 id = ${top}`);

  let ids = [];
  for (let id = from; id <= top; id++) ids.push(id);
  const capped = ids.length > LIMIT;
  if (capped) ids = ids.slice(0, LIMIT);

  // 新規idのスキャン
  const found = [];
  const stillPending = [];
  let done = 0;
  await pool(ids, async (id) => {
    const ev = await getEvent(id);
    if (++done % 500 === 0) log(`  スキャン ${done}/${ids.length}`);
    if (!ev) return;
    const r = await collectEvent(ev, byName, unresolved);
    if (!r) return;
    if (r.pending) {
      stillPending.push({ id, firstSeenAt: today(), category: ev.category, startAt: ev.startAt || "" });
      return;
    }
    found.push(r.event);
  });

  // pending の再チェック(未確定だった大会が確定したか)
  const keptPending = [];
  await pool(pending, async (p) => {
    const ev = await getEvent(p.id);
    if (!ev) return; // 消えたイベントは破棄
    const r = await collectEvent(ev, byName, unresolved);
    if (r && !r.pending) { found.push(r.event); return; }
    if (!r) return; // 中止・カテゴリ変更で対象外になった
    if (daysSince(p.firstSeenAt) > PENDING_EXPIRE_DAYS) {
      log(`  pending 期限切れで破棄: #${p.id} (${p.firstSeenAt} 初検出)`);
      return;
    }
    keptPending.push({ ...p, category: ev.category, startAt: ev.startAt || "" });
  });

  // 保存(既存の events/<id>.json は上書きしない=冪等)
  let added = 0;
  for (const ev of found) {
    const file = path.join(EVENTS_DIR, `${ev.id}.json`);
    if (existsSync(file)) continue;
    writeFileSync(file, JSON.stringify(ev, null, 2) + "\n");
    added++;
    log(`  収録: #${ev.id} ${ev.startAt.slice(0, 10)} ${ev.name} [${ev.category}] ${ev.playerCount}名`);
  }

  const pendingOut = [...keptPending, ...stillPending]
    .filter((p, i, a) => a.findIndex((x) => x.id === p.id) === i)
    .sort((a, b) => a.id - b.id);
  writeFileSync(PENDING_JSON, JSON.stringify(pendingOut, null, 2) + "\n");

  index.scan = {
    minId: index.scan.minId == null ? INITIAL_MIN_ID : Math.min(index.scan.minId, INITIAL_MIN_ID),
    maxId: ids.length ? ids[ids.length - 1] : index.scan.maxId,
  };
  log(`\n新規収録 ${added}件 / 保留 ${pendingOut.length}件${capped ? ` / --limit により id ${index.scan.maxId} で打ち切り` : ""}`);
  if (unresolved.size) {
    log(`⚠ slug未解決のカード名 ${unresolved.size}件: ${[...unresolved].slice(0, 20).join(" / ")}${unresolved.size > 20 ? " …" : ""}`);
  }
  return index;
}

// ---------- データ読み込み(生成用) ----------

function loadEvents() {
  if (!existsSync(EVENTS_DIR)) return [];
  return readdirSync(EVENTS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(path.join(EVENTS_DIR, f), "utf8")))
    .sort((a, b) => (b.startAt || "").localeCompare(a.startAt || "") || b.id - a.id);
}

function writeIndexJson(index, events) {
  index.updatedAt = new Date().toISOString();
  index.events = events.map((e) => ({
    id: e.id, name: e.name, category: e.category, format: e.format,
    startAt: e.startAt, country: e.host.country, host: e.host.name,
    playerCount: e.playerCount, deckCount: e.decklists.length,
  }));
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(INDEX_JSON, JSON.stringify(index, null, 2) + "\n");
}

// ---------- 表示用ヘルパー ----------

const day = (iso) => (iso || "").slice(0, 10);
const formatJp = (f) => CI.FORMAT_JP[String(f || "").toUpperCase()] || f || "—";
const catInfo = (c) => CATEGORY_JP[c] || { label: c, full: c, cls: "store" };
const record = (s) => `${s.wins}-${s.losses}-${s.ties}`;
const pct = (v) => (v == null ? "—" : `${Math.round(v * 10) / 10}%`);
const RANK_ICON = { 1: "🥇", 2: "🥈", 3: "🥉" };

// 国コード → 表示用の国旗絵文字(regional indicator symbolへの機械変換)
function flag(cc) {
  if (!/^[A-Za-z]{2}$/.test(cc || "")) return "";
  return [...cc.toUpperCase()].map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)).join("");
}

const eventUrl = (id) => `/tournaments/${id}/`;
const deckUrl = (id, player) => `/tournaments/${id}/decks/${player}/`;
const playerName = (ev, id) => ev.players[id] || `Player #${id}`;

// ---------- ページ共通(cards/ の静的ページと同型) ----------

function headMeta({ title, description, canonical, extraCss = "" }) {
  return `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data: https://api.gatcg.com; script-src 'self' https://static.cloudflareinsights.com; connect-src 'self' https://api.gatcg.com https://cloudflareinsights.com; style-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'">
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
<meta property="og:image" content="${SITE}/ogp.png">
<meta property="og:locale" content="ja_JP">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${SITE}/ogp.png">
<link rel="stylesheet" href="/tournaments/tournaments.css">${extraCss}
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
  return `<header class="cp-site"><a href="/" class="cp-brand"><span class="cp-mark">GA</span>Grand Archive 日本語カードDB</a><nav><a href="/cards/">エキスパンション一覧</a><a href="/tools/deck-builder/">デッキ構築</a><a href="/tournaments/">大会入賞デッキ</a></nav></header>`;
}

function siteFooter() {
  return `<footer class="cp-foot"><p>本サイトは非公式のファンサイトです。カードの著作権は <a href="https://grandarchivetcg.com/" rel="external">Weebs of the Shore</a> に帰属します。大会結果・デッキリストは公式API(api.gatcg.com の Omnidex エンドポイント)を利用しています。カード名・効果の日本語訳は当サイトによる非公式の独自翻訳です（公式の訳ではありません）。プレイの際は英語原文をご確認ください。</p></footer>`;
}

function crumb(items) {
  return `<nav class="cp-crumb">${items.map(([name, url]) =>
    url ? `<a href="${url}">${esc(name)}</a>` : `<span>${esc(name)}</span>`).join(" › ")}</nav>`;
}

// ---------- 一覧ページ ----------

function listPage(events) {
  const title = "大会入賞デッキ検索 - Grand Archive 日本語カードDB";
  const description = `Grand Archive の主要大会(Store Championship・Regionals)${events.length}件の入賞デッキを日本語訳付きで検索・閲覧できます。`;
  const cats = [...new Set(events.map((e) => e.category))];
  const countries = [...new Set(events.map((e) => e.host.country).filter(Boolean))].sort();
  const formats = [...new Set(events.map((e) => e.format).filter(Boolean))].sort();
  const opt = (v, label) => `<option value="${esc(v)}">${esc(label)}</option>`;

  const rows = events.map((e) => {
    const c = catInfo(e.category);
    return `<tr class="tr-link" data-href="${eventUrl(e.id)}" data-cat="${esc(e.category)}" data-country="${esc(e.host.country)}" data-format="${esc(e.format)}" data-search="${esc(searchBlob(e))}">
        <td class="date">${esc(day(e.startAt))}</td>
        <td>
          <div class="ev-name"><a href="${eventUrl(e.id)}">${esc(e.name)}</a></div>
          <div class="ev-host">${esc([flag(e.host.country) + (e.host.country || ""), e.host.name].filter(Boolean).join("・"))}</div>
        </td>
        <td>${esc(formatJp(e.format))}</td>
        <td><span class="cat-badge cat-${c.cls}">${esc(c.label)}</span></td>
        <td class="num">${e.playerCount}名</td>
      </tr>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="ja">
<head>
${headMeta({ title, description, canonical: `${SITE}/tournaments/` })}
<script src="/tournaments/tournaments.js" defer></script>
${breadcrumbLd([["トップ", "/"], ["大会入賞デッキ"]])}
</head>
<body>
${siteHeader()}
${crumb([["トップ", "/"], ["大会入賞デッキ"]])}
<main class="cp-main">
  <h1>🏆 大会入賞デッキ検索</h1>
  <p class="sub">主要大会(Store Championship・Regionals)の入賞デッキを日本語訳付きで見られます。収録 ${events.length} 大会。</p>

  <div class="filter-box">
    <div class="filter-row">
      <select id="f-cat" aria-label="カテゴリで絞り込み">${opt("", "カテゴリ（全て）")}${cats.map((c) => opt(c, catInfo(c).full)).join("")}</select>
      <select id="f-country" aria-label="国で絞り込み">${opt("", "国（全て）")}${countries.map((c) => opt(c, `${flag(c)} ${c}`)).join("")}</select>
      <select id="f-format" aria-label="フォーマットで絞り込み">${opt("", "フォーマット（全て）")}${formats.map((f) => opt(f, formatJp(f))).join("")}</select>
      <input type="search" id="f-text" placeholder="大会名・主催・プレイヤー名で検索…" aria-label="大会名・主催・プレイヤー名で検索">
      <button type="button" id="f-reset">リセット</button>
    </div>
    <p class="filter-hits" id="f-hits" role="status"></p>
  </div>

  <div class="cp-scroll"><table id="ev-table">
    <thead><tr><th>開催日</th><th>大会名</th><th>フォーマット</th><th>種別</th><th>参加</th></tr></thead>
    <tbody>
${rows || '<tr><td colspan="5">収録済みの大会がありません。</td></tr>'}
    </tbody>
  </table></div>
</main>
${siteFooter()}
</body>
</html>
`;
}

// 一覧のテキスト検索でプレイヤー名も引けるようにするため、各行に検索用の文字列を持たせる
function searchBlob(ev) {
  return [ev.name, ev.host.name, ev.host.country, formatJp(ev.format), catInfo(ev.category).full,
    ...Object.values(ev.players)].join(" ");
}

// ---------- 大会詳細ページ ----------

function eventPage(ev) {
  const c = catInfo(ev.category);
  const date = day(ev.startAt);
  const title = `${ev.name}（${date}） - 大会入賞デッキ | Grand Archive 日本語カードDB`;
  const top = ev.standings.slice(0, 3).map((s) => playerName(ev, s.player)).join("・");
  const description = `${date}開催「${ev.name}」（${c.full}・${formatJp(ev.format)}・${ev.playerCount}名）の順位表と入賞デッキ${ev.decklists.length}件を日本語訳付きで掲載。上位: ${top}。`;

  const deckPlayers = new Set(ev.decklists.map((d) => d.player));
  const rows = ev.standings.map((s) => {
    const has = deckPlayers.has(s.player);
    const link = has
      ? `<a class="deck-link" href="${deckUrl(ev.id, s.player)}">📄 デッキを見る</a>`
      : `<span class="no-deck">デッキ未提出</span>`;
    return `<tr${s.rank === 1 ? ' class="top1"' : ""}>
        <td class="rank">${RANK_ICON[s.rank] || ""}${s.rank}</td>
        <td class="player-name">${esc(playerName(ev, s.player))}</td>
        <td class="rec">${esc(record(s))}</td>
        <td class="pct">${esc(pct(s.gwPercent))}</td>
        <td class="pct">${esc(pct(s.mwPercent))}</td>
        <td>${link}</td>
      </tr>`;
  }).join("\n");

  const structure = [
    ev.swissRounds ? `スイス${ev.swissRounds}回戦` : "",
    ev.cutSize ? `シングルエリミネーション(Top${ev.cutSize})` : "",
  ].filter(Boolean).join(" → ");

  return `<!DOCTYPE html>
<html lang="ja">
<head>
${headMeta({ title, description, canonical: SITE + eventUrl(ev.id) })}
${breadcrumbLd([["トップ", "/"], ["大会入賞デッキ", "/tournaments/"], [ev.name]])}
</head>
<body>
${siteHeader()}
${crumb([["トップ", "/"], ["大会入賞デッキ", "/tournaments/"], [ev.name]])}
<main class="cp-main">
  <div class="ev-head">
    <h1>${esc(ev.name)}</h1>
    <div class="meta-row">
      <span class="cat-badge cat-${c.cls}">${esc(c.full)}</span>
      <span>${esc(date)}</span>
      <span>${esc([flag(ev.host.country) + (ev.host.country || ""), ev.host.name].filter(Boolean).join("・"))}</span>
      <span>フォーマット: ${esc(formatJp(ev.format))}</span>
      <span>参加${ev.playerCount}名</span>
      ${structure ? `<span>${esc(structure)}</span>` : ""}
    </div>
  </div>

  <h2>順位表（${ev.standings.length}名・スイス終了時点）</h2>
  <div class="cp-scroll"><table>
    <thead><tr><th>順位</th><th>プレイヤー</th><th>成績</th><th>GW%</th><th>MW%</th><th>デッキ</th></tr></thead>
    <tbody>
${rows}
    </tbody>
  </table></div>
  <p class="cp-muted">GW%＝ゲーム勝率、MW%＝マッチ勝率（タイブレーカーの参考値。表示のみ）。順位はスイスラウンド終了時点のもので、決勝トーナメントの結果は含みません。</p>
  <p class="cp-muted">出典: <a href="${esc(ev.url || `https://omni.gatcg.com/events/${ev.id}`)}" rel="external nofollow">Omnidex 公式イベントページ #${ev.id}</a></p>
</main>
${siteFooter()}
</body>
</html>
`;
}

// ---------- デッキ詳細ページ ----------

const ZONES = [
  { key: "material", label: "マテリアルデッキ" },
  { key: "main", label: "メインデッキ" },
  { key: "sideboard", label: "サイドボード" },
];

// カードタイル(共有デッキ画面の .cardph/.view-grid と同じ体裁)
function cardTile(entry, cardBySlug) {
  const card = entry.slug ? cardBySlug.get(entry.slug) : null;
  if (!card) {
    // slug未解決: 画像なしで英語名のみ(既存 .noimg と同じ扱い)
    return `<div class="cardph"><div class="noimg">${esc(entry.name)}</div><span class="qty-badge">×${entry.qty}</span></div>`;
  }
  const jp = CI.jpName(card);
  const label = jp && jp !== card.name ? `${card.name}（${jp}）` : card.name;
  const imgs = CI.cardImages(card);
  const img = imgs.length
    ? `<img loading="lazy" src="${esc(imgs[0].url)}" alt="${esc(label)}" title="${esc(label)}">`
    : `<div class="noimg">${esc(label)}</div>`;
  return `<div class="cardph clickable" tabindex="0" role="button" data-slug="${esc(card.slug)}" aria-label="${esc(label)}">${img}<span class="qty-badge">×${entry.qty}</span></div>`;
}

function deckPage(ev, deck, cardBySlug) {
  const name = playerName(ev, deck.player);
  const st = ev.standings.find((s) => s.player === deck.player);
  const rank = st ? st.rank : null;
  const date = day(ev.startAt);
  const title = `${name}のデッキ（${rank ? `${rank}位・` : ""}${ev.name}） - Grand Archive 日本語カードDB`;

  const zones = ZONES.map((z) => {
    const cards = deck[z.key] || [];
    if (!cards.length) return { ...z, cards, count: 0, html: "" };
    const count = cards.reduce((n, c) => n + c.qty, 0);
    return {
      ...z, cards, count,
      html: `<section class="view-zone">
    <h3>${z.label} <b>${count}枚</b></h3>
    <div class="view-grid">
${cards.map((c) => "      " + cardTile(c, cardBySlug)).join("\n")}
    </div>
  </section>`,
    };
  });
  const mainZone = zones.find((z) => z.key === "main");
  const named = (mainZone.cards || []).slice(0, 5).map((c) => {
    const card = c.slug ? cardBySlug.get(c.slug) : null;
    return card ? CI.jpName(card) : c.name;
  }).join("・");
  const description = `${date}開催「${ev.name}」${rank ? `${rank}位` : ""} ${name} 選手のデッキリスト（メイン${mainZone.count}枚）を日本語カード名・カード画像付きで掲載。主な採用カード: ${named}。`;

  // カード詳細ダイアログ(既存 shared/js/card-detail.js)をそのまま組み込む
  const i18nScripts = [...dataFiles, "shared/js/card-i18n.js", "shared/js/card-detail.js"]
    .map((f) => `<script src="/${f}"></script>`).join("\n");

  return `<!DOCTYPE html>
<html lang="ja">
<head>
${headMeta({ title, description, canonical: SITE + deckUrl(ev.id, deck.player), extraCss: `\n<link rel="stylesheet" href="/shared/css/card-detail.css">` })}
${breadcrumbLd([["トップ", "/"], ["大会入賞デッキ", "/tournaments/"], [ev.name, eventUrl(ev.id)], [`${name} のデッキ`]])}
</head>
<body>
${siteHeader()}
${crumb([["トップ", "/"], ["大会入賞デッキ", "/tournaments/"], [ev.name, eventUrl(ev.id)], [`${name} のデッキ`]])}
<main class="cp-main">
  <div class="deck-head">
    <h1>${esc(name)} のデッキ${rank ? `<span class="rank-badge">${RANK_ICON[rank] || ""}${rank}位</span>` : ""}</h1>
    <div class="meta-row">
      ${st ? `<span>成績 ${esc(record(st))}</span>` : ""}
      <span><a href="${eventUrl(ev.id)}">${esc(ev.name)}</a></span>
      <span>${esc(date)}</span>
      <span>${esc(formatJp(ev.format))}</span>
    </div>
  </div>
${zones.map((z) => z.html).filter(Boolean).join("\n")}
  <p class="cp-muted">カードをクリックすると日本語の詳細が開きます。当時のフォーマットで提出されたリストのため、現行ルールでの使用可否は判定していません。</p>
  <p class="cp-muted">出典: <a href="${esc(ev.url || `https://omni.gatcg.com/events/${ev.id}`)}" rel="external nofollow">Omnidex 公式イベントページ #${ev.id}</a></p>
</main>
${siteFooter()}
${i18nScripts}
<script src="/tournaments/deck.js" defer></script>
</body>
</html>
`;
}

// ---------- 静的アセット ----------

const CSS = `/* 大会入賞デッキ検索(静的生成)用。生成元: scripts/build-tournament-pages.mjs
   トークン・共通部品は cards/cards.css と揃えている(cp- 接頭辞は共通) */
:root { --bg:#12141a; --panel:#171a21; --panel-2:#1f232c; --line:#262b36; --text:#e6e8ee; --muted:#9aa2b1; --accent:#d9a441; --accent-2:#6ea8fe; }
* { box-sizing:border-box; }
[hidden] { display:none !important; }
body { margin:0; background:var(--bg); color:var(--text); font:15px/1.7 system-ui,-apple-system,"Segoe UI",sans-serif; }
a { color:var(--accent-2); text-decoration:none; }
a:hover { text-decoration:underline; }
.cp-site { display:flex; flex-wrap:wrap; gap:10px 16px; align-items:center; justify-content:space-between; padding:12px 20px; border-bottom:1px solid var(--line); }
.cp-brand { display:flex; align-items:center; gap:10px; color:var(--text); font-weight:700; }
.cp-mark { display:grid; place-items:center; width:34px; height:34px; border-radius:8px; background:var(--accent); color:#201a0a; font-weight:800; letter-spacing:1px; }
.cp-site nav { display:flex; gap:14px; font-size:.9rem; }
.cp-crumb { padding:10px 20px; font-size:.82rem; color:var(--muted); max-width:1080px; margin:0 auto; }
.cp-crumb span { color:var(--text); }
.cp-main { max-width:1080px; margin:0 auto; padding:8px 20px 40px; }
.cp-scroll { overflow-x:auto; }
.cp-muted { color:var(--muted); font-size:.86rem; }
h1 { font-size:1.45rem; margin:.2em 0 .4em; line-height:1.35; }
h2 { font-size:1.02rem; border-left:3px solid var(--accent); padding-left:10px; margin:26px 0 10px; }
.sub { color:var(--muted); margin:0 0 18px; font-size:.92rem; }

/* ---- 一覧 ---- */
.filter-box { background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:14px 16px; margin-bottom:18px; }
.filter-row { display:flex; flex-wrap:wrap; gap:8px 10px; }
.filter-row select, .filter-row input, .filter-row button { background:var(--panel-2); color:var(--text); border:1px solid var(--line); border-radius:8px; padding:7px 12px; font:inherit; font-size:.88rem; }
.filter-row input[type="search"] { flex:1; min-width:200px; }
.filter-row button { cursor:pointer; }
.filter-row button:hover { border-color:var(--accent); }
.filter-row select:focus, .filter-row input:focus, .filter-row button:focus-visible { outline:2px solid var(--accent-2); outline-offset:1px; }
.filter-hits { margin:10px 0 0; font-size:.82rem; color:var(--muted); }

table { width:100%; border-collapse:collapse; font-size:.9rem; }
thead th { text-align:left; padding:8px 10px; color:var(--muted); font-weight:600; font-size:.78rem; letter-spacing:.04em; border-bottom:1px solid var(--line); white-space:nowrap; }
tbody td { padding:10px; border-bottom:1px solid var(--line); vertical-align:middle; }
tbody tr.tr-link { cursor:pointer; }
tbody tr.tr-link:hover { background:rgba(255,255,255,.04); }
td.date { white-space:nowrap; color:var(--muted); font-variant-numeric:tabular-nums; }
td.num { text-align:right; font-variant-numeric:tabular-nums; color:var(--muted); }
.ev-name { font-weight:600; }
.ev-name a { color:var(--text); }
.ev-name a:hover { color:var(--accent-2); }
.ev-host { color:var(--muted); font-size:.8rem; margin-top:2px; }
.cat-badge { display:inline-block; border-radius:999px; padding:2px 10px; font-size:.74rem; font-weight:600; white-space:nowrap; }
.cat-store { background:rgba(217,164,65,.15); color:var(--accent); border:1px solid rgba(217,164,65,.4); }
.cat-regional { background:rgba(110,168,254,.15); color:var(--accent-2); border:1px solid rgba(110,168,254,.4); }

/* ---- 大会詳細 ---- */
.ev-head { background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:16px 18px; }
.ev-head h1 { margin:0 0 6px; font-size:1.3rem; }
.meta-row { display:flex; flex-wrap:wrap; gap:8px 14px; align-items:center; font-size:.88rem; color:var(--muted); }
td.rank { font-weight:700; font-variant-numeric:tabular-nums; white-space:nowrap; }
tr.top1 { background:rgba(217,164,65,.08); }
.player-name { font-weight:600; }
td.rec, td.pct { font-variant-numeric:tabular-nums; color:var(--muted); white-space:nowrap; }
.deck-link { white-space:nowrap; }
.no-deck { color:var(--muted); font-size:.82rem; }

/* ---- デッキ詳細(共有デッキ画面の .view-grid/.cardph と同一) ---- */
.deck-head { background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:16px 18px; }
.deck-head h1 { margin:0 0 6px; font-size:1.3rem; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.rank-badge { background:rgba(217,164,65,.15); color:var(--accent); border:1px solid rgba(217,164,65,.4); border-radius:999px; padding:1px 10px; font-size:.78rem; font-weight:700; }
.view-zone { margin-top:18px; }
.view-zone h3 { font-size:.85rem; color:var(--muted); font-weight:600; letter-spacing:.04em; margin:0 0 10px; padding-bottom:8px; border-bottom:1px solid var(--line); }
.view-zone h3 b { color:var(--text); font-variant-numeric:tabular-nums; }
.view-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(124px,1fr)); gap:12px; }
.cardph { position:relative; border-radius:10px; overflow:hidden; border:1px solid var(--line); background:var(--panel-2); }
.cardph img { width:100%; aspect-ratio:63/88; object-fit:cover; display:block; }
.cardph .noimg { aspect-ratio:63/88; display:grid; place-items:center; padding:8px; color:var(--muted); font-size:.72rem; text-align:center; word-break:break-all; }
.qty-badge { position:absolute; top:8px; right:8px; background:rgba(8,9,12,.82); color:#fff; border:1px solid rgba(255,255,255,.35); font-size:.7rem; font-weight:800; border-radius:999px; padding:2px 8px; font-variant-numeric:tabular-nums; }
.cardph.clickable { cursor:pointer; }
.cardph.clickable:hover { border-color:var(--accent); }
.cardph.clickable:focus-visible { outline:2px solid var(--accent-2); outline-offset:2px; }

.cp-foot { border-top:1px solid var(--line); margin-top:30px; padding:16px 20px; color:var(--muted); font-size:.8rem; }
.cp-foot p { max-width:1080px; margin:0 auto; }
@media (max-width:640px) {
  thead th:nth-child(3), #ev-table td:nth-child(3) { display:none; } /* 一覧のフォーマット列 */
}
`;

const LIST_JS = `// 大会一覧のクライアント側フィルタ。生成元: scripts/build-tournament-pages.mjs
// 収録件数が少ない(主要大会のみ)ため、サーバー往復なしで全行を即時に絞り込む。
"use strict";
(() => {
  const table = document.getElementById("ev-table");
  if (!table) return;
  const rows = Array.from(table.tBodies[0].rows).filter((r) => r.dataset.href);
  const cat = document.getElementById("f-cat");
  const country = document.getElementById("f-country");
  const format = document.getElementById("f-format");
  const text = document.getElementById("f-text");
  const hits = document.getElementById("f-hits");
  const reset = document.getElementById("f-reset");

  function apply() {
    const q = text.value.trim().toLowerCase();
    let n = 0;
    rows.forEach((r) => {
      const ok = (!cat.value || r.dataset.cat === cat.value) &&
        (!country.value || r.dataset.country === country.value) &&
        (!format.value || r.dataset.format === format.value) &&
        (!q || (r.dataset.search || "").toLowerCase().includes(q));
      r.hidden = !ok;
      if (ok) n++;
    });
    hits.textContent = n === rows.length ? \`\${rows.length} 大会\` : \`\${n} / \${rows.length} 大会\`;
  }

  [cat, country, format].forEach((el) => el.addEventListener("change", apply));
  text.addEventListener("input", apply);
  reset.addEventListener("click", () => {
    cat.value = country.value = format.value = text.value = "";
    apply();
  });

  // 行全体をクリックできるようにする(セル内リンクのクリックはそのまま活かす)
  rows.forEach((r) => {
    r.addEventListener("click", (e) => {
      if (e.target.closest("a")) return;
      location.href = r.dataset.href;
    });
  });

  apply();
})();
`;

const DECK_JS = `// 大会デッキ詳細のカード詳細ダイアログ配線。生成元: scripts/build-tournament-pages.mjs
// 表示は共有デッキ画面と同じく shared/js/card-detail.js に任せる(fetchCard省略=公式APIを直接取得)。
"use strict";
(() => {
  if (!window.GA_CARD_DETAIL) return;
  GA_CARD_DETAIL.init({});
  document.querySelectorAll(".cardph[data-slug]").forEach((tile) => {
    tile.addEventListener("click", () => GA_CARD_DETAIL.openBySlug(tile.dataset.slug));
    tile.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); GA_CARD_DETAIL.openBySlug(tile.dataset.slug); }
    });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && GA_CARD_DETAIL.isOpen()) GA_CARD_DETAIL.close();
  });
})();
`;

// ---------- 生成 ----------

function build(events, cardBySlug) {
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(path.join(OUT_DIR, "index.html"), listPage(events));
  writeFileSync(path.join(OUT_DIR, "tournaments.css"), CSS);
  writeFileSync(path.join(OUT_DIR, "tournaments.js"), LIST_JS);
  writeFileSync(path.join(OUT_DIR, "deck.js"), DECK_JS);

  let decks = 0;
  for (const ev of events) {
    const dir = path.join(OUT_DIR, String(ev.id));
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "index.html"), eventPage(ev));
    for (const deck of ev.decklists) {
      const ddir = path.join(dir, "decks", String(deck.player));
      mkdirSync(ddir, { recursive: true });
      writeFileSync(path.join(ddir, "index.html"), deckPage(ev, deck, cardBySlug));
      decks++;
    }
  }
  log(`\n生成完了: 大会${events.length}ページ / デッキ${decks}ページ / 一覧・CSS・JS`);
}

// ---------- main ----------

async function main() {
  const { byName, bySlug } = indexCards(await loadCards(ROOT));
  let index = readJson(INDEX_JSON, { updatedAt: "", scan: { minId: null, maxId: null }, events: [] });
  if (!NO_SCAN) {
    index = await scan(byName);
  } else {
    log("--no-scan: 大会APIは叩かず既存データからページのみ生成します");
  }
  const events = loadEvents();
  writeIndexJson(index, events);
  build(events, bySlug);
}

main().catch((e) => { console.error(e); process.exit(1); });
