// タスク#14: 大会入賞デッキ検索(設計: docs/design/14-大会入賞デッキ検索/大会入賞デッキ検索_設計.md)
//
//   node scripts/build-tournament-pages.mjs           … 新規大会をスキャンしてデータ更新→ページ生成
//   node scripts/build-tournament-pages.mjs --no-scan … APIを叩かず data/tournaments/ からページだけ生成
//   node scripts/build-tournament-pages.mjs --limit N … 1回のスキャンで見るid数の上限(初回分割取得用)
//   node scripts/build-tournament-pages.mjs --refresh … 収録済みの全大会を取り直す(保存項目を増やしたとき用)
//
// 生成物: /tournaments/index.html(一覧) /tournaments/<id>/index.html(大会詳細・概要+順位表)
//         /tournaments/<id>/decks.html(全大会・デッキのHTML断片。順位表からダイアログで表示する)
//         /tournaments/tournaments.css /.js
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

// 収録対象カテゴリ。Omnidex側は自由文字列のため許可リスト方式
// (2026-07-20: nationals・ascent を追加。invitational/worlds は未検出のため見送り)
const CATEGORIES = ["store-championships", "regionals", "nationals", "ascent"];
// カテゴリの表示名(一覧・詳細のバッジ)
const CATEGORY_JP = {
  "store-championships": { label: "Store Champs", full: "Store Championship", cls: "store" },
  regionals: { label: "Regionals", full: "Regionals", cls: "regional" },
  nationals: { label: "Nationals", full: "Nationals", cls: "nationals" },
  ascent: { label: "Ascent", full: "Ascent", cls: "ascent" },
};

// 国コード → 日本語国名(2026-07-22: 国旗絵文字はWindowsにグリフが無く「JP JP」と重複表示に
// なるため廃止)。収録実績のある31カ国を定数で持ち、未知のコードはそのまま表示する。
// 列幅が安定するよう正式名称ではなく日常的な通称を使う(例: アメリカ合衆国→アメリカ)
const COUNTRY_JP = {
  AE: "UAE", AU: "オーストラリア", BE: "ベルギー", BN: "ブルネイ", CA: "カナダ",
  CL: "チリ", CZ: "チェコ", DE: "ドイツ", DK: "デンマーク", ES: "スペイン", GB: "イギリス",
  HK: "香港", HR: "クロアチア", HU: "ハンガリー", ID: "インドネシア", IT: "イタリア", JP: "日本",
  KR: "韓国", KW: "クウェート", LB: "レバノン", MY: "マレーシア", NL: "オランダ", NO: "ノルウェー",
  NZ: "ニュージーランド", PH: "フィリピン", PL: "ポーランド", PR: "プエルトリコ", SG: "シンガポール",
  SI: "スロベニア", TW: "台湾", US: "アメリカ",
};

// 順位表を折りたたむ行数の単位(この人数を超える大会のみブロック分割する)
const RANK_BLOCK_SIZE = 100;

// シーズン期間(omni.gatcg.com/api/season?id=N の実測値)。startAt から season を導出する
const SEASONS = [
  { id: 7, code: "RDO", name: "Radiant Origins", start: "2026-04-10", end: "2026-08-21" },
  { id: 6, code: "PTM", name: "Phantom Monarchs", start: "2025-12-12", end: "2026-04-03" },
  { id: 5, code: "DTR", name: "Distorted Reflections", start: "2025-08-01", end: "2025-12-05" },
  { id: 4, code: "AWH", name: "Abyssal Heaven", start: "2025-03-14", end: "2025-07-26" },
];

// 収録対象は現行のRDOシーズン以降(設計 2026-07-20: PTM以前への拡張は容量増になるため別途検討)。
// idは「作成順」で開催日と一致せず、nationals/ascent級の大会は数ヶ月前に作成されるため、
// スキャンする下限idはシーズン開始よりかなり手前に取り、収録可否は startAt で判定する。
const INITIAL_MIN_ID = 46500;
const INCLUDE_FROM_DATE = "2026-04-10"; // = RDOシーズン開始
const PROBE_MISS_LIMIT = 60;  // 上端探索: 連続でこの数だけ404が続いたら終端とみなす
const PENDING_EXPIRE_DAYS = 60; // 確定しないまま経過したpendingを破棄するまでの日数
const CONCURRENCY = 6;

const NO_SCAN = process.argv.includes("--no-scan");
const REFRESH = process.argv.includes("--refresh");
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

// 開催日から所属シーズンのコード(RDO等)を返す。どのシーズンにも該当しなければ null
function seasonOf(startAt) {
  const d = day(startAt);
  const hit = SEASONS.find((s) => d >= s.start && d <= s.end);
  return hit ? hit.code : null;
}

// 一覧のシーズン絞り込み用のキー・表示名(どのシーズンにも属さない大会は「その他」にまとめる)
const seasonKey = (ev) => ev.season || "OTHER";
const seasonLabel = (code) => {
  const s = SEASONS.find((x) => x.code === code);
  return s ? `${s.name}（${s.code}）` : "その他";
};

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
  if (ev.status === "canceled") return null;         // 中止・テストイベントはpendingに残さず即除外
  if (day(ev.startAt) < INCLUDE_FROM_DATE) return null; // 前シーズン以前の大会は対象外

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
  // standings は statsScore(勝ち点)の降順で返る。同点はタイブレーカー(GW%/MW%)で並ぶ
  const standings = rows.map((r, i) => ({
    rank: i + 1,
    player: r.id,
    wins: r.statsWins ?? 0,
    losses: r.statsLosses ?? 0,
    ties: r.statsTies ?? 0,
    // 勝ち点と不戦勝。byeは勝敗数に現れないため、これが無いと戦績と順位が食い違って見える
    score: r.statsScore ?? null,
    byes: r.statsByes ?? 0,
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
      season: seasonOf(ev.startAt),
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

// 収録済みの大会を取り直して events/<id>.json を上書きする(--refresh)。
// 保存項目を増やしたとき(例: 2026-07-22の statsScore・statsByes 追加)に使う。
// 全idの再スキャン(約12,000リクエスト)ではなく既知のidだけを引き直す(420件×4=約1,700)。
async function refreshEvents(byName, unresolved) {
  const ids = readdirSync(EVENTS_DIR).filter((f) => f.endsWith(".json")).map((f) => parseInt(f, 10));
  log(`--refresh: 収録済み ${ids.length} 大会を取り直します`);
  let done = 0, updated = 0, failed = 0;
  await pool(ids, async (id) => {
    const ev = await getEvent(id).catch(() => null);
    const r = ev && await collectEvent(ev, byName, unresolved).catch(() => null);
    if (++done % 50 === 0) log(`  取り直し ${done}/${ids.length}`);
    if (!r || r.pending || !r.event) { failed++; log(`  ⚠ 取り直し失敗(既存を維持): #${id}`); return; }
    writeFileSync(path.join(EVENTS_DIR, `${id}.json`), JSON.stringify(r.event) + "\n");
    updated++;
  });
  log(`--refresh: ${updated}件を更新 / ${failed}件は取得できず既存データを維持`);
}

async function scan(byName) {
  mkdirSync(EVENTS_DIR, { recursive: true });
  const index = readJson(INDEX_JSON, { updatedAt: "", scan: { minId: null, maxId: null }, events: [] });
  const pending = readJson(PENDING_JSON, []);
  const unresolved = new Set();

  if (REFRESH) await refreshEvents(byName, unresolved);

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
    writeFileSync(file, JSON.stringify(ev) + "\n"); // 非整形(容量削減。読むときは jq . で整形する)
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
    startAt: e.startAt, season: e.season, country: e.host.country, host: e.host.name,
    playerCount: e.playerCount, deckCount: e.decklists.length,
  }));
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(INDEX_JSON, JSON.stringify(index, null, 2) + "\n");
}

// ---------- 表示用ヘルパー ----------

const day = (iso) => (iso || "").slice(0, 10);
const formatJp = (f) => CI.FORMAT_JP[String(f || "").toUpperCase()] || f || "—";
const catInfo = (c) => CATEGORY_JP[c] || { label: c, full: c, cls: "store" };
const pct = (v) => (v == null ? "—" : `${Math.round(v * 10) / 10}%`);
const RANK_ICON = { 1: "🥇", 2: "🥈", 3: "🥉" };

// 国コード → 日本語国名。国旗絵文字は環境によってグリフが無く国コード2文字に
// フォールバックする(Windowsで「JP JP」に見える)ため使わない。未知のコードは素通し
function countryLabel(cc) {
  if (!cc) return "—";
  return esc(COUNTRY_JP[cc.toUpperCase()] || cc);
}

// 「2-0-1（うち不戦勝1）」形式の戦績表示
function recordLabel(s) {
  // APIの statsWins は不戦勝を含まないが勝ち点には含まれるため、表示の勝ち数には不戦勝を足す
  // (足さないと戦績と勝ち点・順位が食い違って見える)。不戦勝0のときは注記を出さない
  return `${s.wins + s.byes}-${s.losses}-${s.ties}` + (s.byes ? `（うち不戦勝${s.byes}）` : "");
}

const eventUrl = (id) => `/tournaments/${id}/`;
const deckAnchor = (player) => `deck-${player}`; // 大会詳細ページ内のアコーディオンのid
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
  return `<header class="cp-site"><a href="/" class="cp-brand"><span class="cp-mark">GA</span>Grand Archive 日本語カードDB</a><nav><a href="/cards/">エキスパンション一覧</a><a href="/tools/deck-builder/">デッキ構築</a><a href="/tournaments/">大会デッキ</a></nav></header>`;
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
  const title = "大会デッキ検索 - Grand Archive 日本語カードDB";
  const description = `Grand Archive の主要大会(Store Championship・Regionals・Nationals・Ascent)${events.length}件の提出デッキを日本語訳付きで検索・閲覧できます。`;
  const cats = [...new Set(events.map((e) => e.category))];
  const countries = [...new Set(events.map((e) => e.host.country).filter(Boolean))].sort();
  const formats = [...new Set(events.map((e) => e.format).filter(Boolean))].sort();
  const seasons = [...new Set(events.map(seasonKey))]
    .sort((a, b) => SEASONS.findIndex((s) => s.code === a) - SEASONS.findIndex((s) => s.code === b));
  const opt = (v, label) => `<option value="${esc(v)}">${esc(label)}</option>`;

  const rows = events.map((e) => {
    const c = catInfo(e.category);
    return `<tr class="tr-link" data-href="${eventUrl(e.id)}" data-cat="${esc(e.category)}" data-country="${esc(e.host.country)}" data-format="${esc(e.format)}" data-season="${esc(seasonKey(e))}" data-date="${esc(day(e.startAt))}" data-search="${esc(searchBlob(e))}">
        <td class="date">${esc(day(e.startAt))}</td>
        <td>
          <div class="ev-name"><a href="${eventUrl(e.id)}">${esc(e.name)}</a></div>
          <div class="ev-host">${esc(e.host.name)}</div>
        </td>
        <td class="country">${countryLabel(e.host.country)}</td>
        <td class="format">${esc(formatJp(e.format))}</td>
        <td class="cat"><span class="cat-badge cat-${c.cls}"><span class="cat-short">${esc(c.label)}</span><span class="cat-full">${esc(c.full)}</span></span></td>
        <td class="num">${e.playerCount}名</td>
      </tr>`;
  }).join("\n");

  const seasonFilter = `\n      <select id="f-season" aria-label="シーズンで絞り込み">${opt("", "シーズン（全て）")}${seasons.map((s) => opt(s, seasonLabel(s))).join("")}</select>`;

  return `<!DOCTYPE html>
<html lang="ja">
<head>
${headMeta({ title, description, canonical: `${SITE}/tournaments/` })}
<script src="/tournaments/tournaments.js" defer></script>
${breadcrumbLd([["トップ", "/"], ["大会デッキ"]])}
</head>
<body>
${siteHeader()}
${crumb([["トップ", "/"], ["大会デッキ"]])}
<main class="cp-main">
  <h1>🏆 大会デッキ検索</h1>
  <p class="sub">主要大会(Store Championship・Regionals・Nationals・Ascent)の提出デッキを日本語訳付きで見られます。収録 ${events.length} 大会。</p>

  <details class="filter-box" id="filter-box" open>
    <summary>絞り込み<span class="filter-count" id="f-count" hidden></span></summary>
    <div class="filter-row">
      <select id="f-cat" aria-label="カテゴリで絞り込み">${opt("", "カテゴリ（全て）")}${cats.map((c) => opt(c, catInfo(c).full)).join("")}</select>
      <select id="f-country" aria-label="開催国で絞り込み">${opt("", "開催国（全て）")}${countries.map((c) => opt(c, countryLabel(c))).join("")}</select>
      <select id="f-format" aria-label="フォーマットで絞り込み">${opt("", "フォーマット（全て）")}${formats.map((f) => opt(f, formatJp(f))).join("")}</select>${seasonFilter}
      <input type="search" id="f-text" placeholder="大会名・主催・プレイヤー名・大会IDで検索…" aria-label="大会名・主催・プレイヤー名・大会IDで検索">
      <button type="button" id="f-reset">リセット</button>
    </div>
    <div class="filter-row filter-period">
      <label for="f-from">期間</label>
      <input type="date" id="f-from" aria-label="開催日の開始">
      <span>〜</span>
      <input type="date" id="f-to" aria-label="開催日の終了">
    </div>
    <p class="filter-hits" id="f-hits" role="status"></p>
  </details>

  <div class="cp-scroll"><table id="ev-table">
    <thead><tr><th>開催日</th><th>大会名</th><th>開催国</th><th>フォーマット</th><th>種別</th><th>参加</th></tr></thead>
    <tbody>
${rows || '<tr><td colspan="6">収録済みの大会がありません。</td></tr>'}
    </tbody>
  </table></div>
</main>
${siteFooter()}
</body>
</html>
`;
}

// 一覧のテキスト検索でプレイヤー名・大会idも引けるようにするため、各行に検索用の文字列を持たせる
function searchBlob(ev) {
  return [ev.id, ev.name, ev.host.name, ev.host.country, countryLabelText(ev.host.country),
    formatJp(ev.format), catInfo(ev.category).full, ...Object.values(ev.players)].join(" ");
}

// searchBlob用(esc前の生文字列)
const countryLabelText = (cc) => (cc ? COUNTRY_JP[cc.toUpperCase()] || cc : "");

// ---------- 大会詳細ページ ----------

// デッキ表示用のダイアログ(中身は decks.html から取得して描画する)。
// 体裁・重ね順は shared/css/card-detail.css の .gacd-modal に合わせ、その下(z-index)に置く
function deckModal() {
  return `<div class="deck-modal" id="deck-modal" hidden data-decks-src="decks.html">
  <div class="deck-backdrop" data-deck-close></div>
  <div class="deck-body" role="dialog" aria-modal="true" aria-labelledby="deck-modal-title">
    <button class="deck-close" type="button" data-deck-close aria-label="閉じる">×</button>
    <h3 class="deck-modal-title" id="deck-modal-title"></h3>
    <div class="deck-modal-content"></div>
  </div>
</div>`;
}

function eventPage(ev) {
  const c = catInfo(ev.category);
  const date = day(ev.startAt);
  const title = `${ev.name}（${date}） - 大会デッキ | Grand Archive 日本語カードDB`;
  const top = ev.standings.slice(0, 3).map((s) => playerName(ev, s.player)).join("・");
  const description = `${date}開催「${ev.name}」（${c.full}・${formatJp(ev.format)}・${ev.playerCount}名）の順位表と提出デッキ${ev.decklists.length}件を日本語訳付きで掲載。上位: ${top}。`;

  const deckPlayers = new Set(ev.decklists.map((d) => d.player));
  const row = (s) => {
    // デッキは別ファイル(decks.html)から取得してダイアログで表示する(tournaments/deck.js)。
    // ハッシュは共有・ブラウザバックのために残す
    const link = deckPlayers.has(s.player)
      ? `<a class="deck-link" href="#${deckAnchor(s.player)}">📄 デッキを見る</a>`
      : `<span class="no-deck">デッキ未提出</span>`;
    return `<tr${s.rank === 1 ? ' class="top1"' : ""} data-player="${s.player}">
        <td class="rank">${RANK_ICON[s.rank] || ""}${s.rank}</td>
        <td class="player-name">${esc(playerName(ev, s.player))}</td>
        <td class="score">${s.score == null ? "—" : s.score}</td>
        <td class="rec">${esc(recordLabel(s))}</td>
        <td class="pct">${esc(pct(s.gwPercent))}</td>
        <td class="pct">${esc(pct(s.mwPercent))}</td>
        <td>${link}</td>
      </tr>`;
  };
  const thead = `<thead><tr><th>順位</th><th>プレイヤー</th><th class="score">勝ち点</th><th>成績</th><th class="pct">GW%</th><th class="pct">MW%</th><th>デッキ</th></tr></thead>`;
  const table = (list) => `<div class="cp-scroll"><table class="standings">
    ${thead}
    <tbody>
${list.map(row).join("\n")}
    </tbody>
  </table></div>`;

  // 100名を超える大会は縦に長くなりすぎるため100行ごとに折りたたむ(先頭ブロックのみ開く)
  const standingsHtml = ev.standings.length <= RANK_BLOCK_SIZE ? table(ev.standings)
    : Array.from({ length: Math.ceil(ev.standings.length / RANK_BLOCK_SIZE) }, (_, i) => {
      const list = ev.standings.slice(i * RANK_BLOCK_SIZE, (i + 1) * RANK_BLOCK_SIZE);
      const range = `${list[0].rank}〜${list[list.length - 1].rank}位`;
      return `  <details class="rank-block"${i === 0 ? " open" : ""}>
    <summary>${range}<span class="cp-muted">（${list.length}名）</span></summary>
${table(list)}
  </details>`;
    }).join("\n");

  const structure = [
    ev.swissRounds ? `スイス${ev.swissRounds}回戦` : "",
    ev.cutSize ? `シングルエリミネーション(Top${ev.cutSize})` : "",
  ].filter(Boolean).join(" → ");

  return `<!DOCTYPE html>
<html lang="ja">
<head>
${headMeta({ title, description, canonical: SITE + eventUrl(ev.id), extraCss: `\n<link rel="stylesheet" href="/shared/css/card-detail.css">` })}
${breadcrumbLd([["トップ", "/"], ["大会デッキ", "/tournaments/"], [ev.name]])}
</head>
<body>
${siteHeader()}
${crumb([["トップ", "/"], ["大会デッキ", "/tournaments/"], [ev.name]])}
<main class="cp-main">
  <div class="ev-head">
    <h1>${esc(ev.name)}</h1>
    <div class="meta-row">
      <span class="cat-badge cat-${c.cls}">${esc(c.full)}</span>
      <span>${esc(date)}</span>
      <span>${[countryLabel(ev.host.country), esc(ev.host.name)].filter((v) => v && v !== "—").join("・")}</span>
      <span>フォーマット: ${esc(formatJp(ev.format))}</span>
      <span>参加${ev.playerCount}名</span>
      ${structure ? `<span>${esc(structure)}</span>` : ""}
    </div>
  </div>

  <h2>順位表（${ev.standings.length}名・スイス終了時点）</h2>
  <p class="cp-muted">「デッキを見る」で提出デッキ（${ev.decklists.length}件）をダイアログ表示します。カードをクリックすると日本語の詳細が開きます。当時のフォーマットで提出されたリストのため、現行ルールでの使用可否は判定していません。</p>
${standingsHtml}
  <p class="cp-muted">順位は勝ち点順で、同点はタイブレーカー（GW%＝ゲーム勝率、MW%＝マッチ勝率）によります。勝ち点には不戦勝（bye）を含みます。順位はスイスラウンド終了時点のもので、決勝トーナメントの結果は含みません。</p>

  <p class="cp-muted">出典: <a href="${esc(ev.url || `https://omni.gatcg.com/events/${ev.id}`)}" rel="external nofollow">Omnidex 公式イベントページ #${ev.id}</a></p>
</main>
${deckModal()}
${siteFooter()}
${[...dataFiles, "shared/js/card-i18n.js", "shared/js/card-detail.js"].map((f) => `<script src="/${f}"></script>`).join("\n")}
<script src="/tournaments/deck.js" defer></script>
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

// デッキ1件。decks.html(断片)にのみ出力し、順位表の「デッキを見る」から
// 該当する1件だけを取り出してダイアログに描画する(tournaments/deck.js)。
// summary = ダイアログの見出し / それ以降 = ダイアログの本文になる。
function deckAccordion(ev, deck, cardBySlug) {
  const name = playerName(ev, deck.player);
  const st = ev.standings.find((s) => s.player === deck.player);
  const rank = st ? st.rank : null;

  const zones = ZONES.map((z) => {
    const cards = deck[z.key] || [];
    if (!cards.length) return "";
    const count = cards.reduce((n, c) => n + c.qty, 0);
    return `      <section class="view-zone">
        <h4>${z.label} <b>${count}枚</b></h4>
        <div class="view-grid">
${cards.map((c) => "          " + cardTile(c, cardBySlug)).join("\n")}
        </div>
      </section>`;
  }).filter(Boolean).join("\n");

  const summary = [
    rank ? `<span class="rank-badge">${RANK_ICON[rank] || ""}${rank}位</span>` : "",
    `<span class="deck-player">${esc(name)}</span>`,
    st ? `<span class="cp-muted">${esc(recordLabel(st))}</span>` : "",
  ].filter(Boolean).join(" ");

  return `    <details class="deck-acc" id="${deckAnchor(deck.player)}">
      <summary>${summary}</summary>
${zones}
    </details>`;
}

// デッキ表示用のHTML断片(完全なHTMLドキュメントではなく <details> の連結のみ)。
// deckAccordion() の出力をそのまま使うことで、クライアント側にカード描画を二重実装しない。
function decksFragment(ev, cardBySlug) {
  return ev.decklists.map((d) => deckAccordion(ev, d, cardBySlug)).join("\n") + "\n";
}

// ---------- 静的アセット ----------

const CSS = `/* 大会デッキ検索(静的生成)用。生成元: scripts/build-tournament-pages.mjs
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
/* スマホでは縦に長くなりすぎるため折りたたむ(PC幅では summary を隠して常時展開) */
.filter-box > summary { display:none; cursor:pointer; font-weight:600; font-size:.9rem; }
.filter-count { display:inline-block; margin-left:8px; background:var(--accent); color:#201a0a; border-radius:999px; padding:0 8px; font-size:.75rem; font-weight:700; }
.filter-row { display:flex; flex-wrap:wrap; gap:8px 10px; }
.filter-row select, .filter-row input, .filter-row button { background:var(--panel-2); color:var(--text); border:1px solid var(--line); border-radius:8px; padding:7px 12px; font:inherit; font-size:.88rem; }
.filter-row input[type="search"] { flex:1; min-width:200px; }
.filter-row button { cursor:pointer; }
.filter-row button:hover { border-color:var(--accent); }
.filter-row select:focus, .filter-row input:focus, .filter-row button:focus-visible { outline:2px solid var(--accent-2); outline-offset:1px; }
.filter-hits { margin:10px 0 0; font-size:.82rem; color:var(--muted); }
.filter-period { align-items:center; margin-top:10px; font-size:.85rem; color:var(--muted); }
.filter-period input[type="date"] { background:var(--panel-2); color:var(--text); border:1px solid var(--line); border-radius:8px; padding:6px 10px; font:inherit; font-size:.85rem; }

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
/* 一覧の種別バッジ: 列が狭いPC幅は略称、カード表示になるスマホ幅は正式名を出す */
.cat-full { display:none; }
.cat-store { background:rgba(217,164,65,.15); color:var(--accent); border:1px solid rgba(217,164,65,.4); }
.cat-regional { background:rgba(110,168,254,.15); color:var(--accent-2); border:1px solid rgba(110,168,254,.4); }
.cat-nationals { background:rgba(47,158,107,.15); color:#7fd4a8; border:1px solid rgba(47,158,107,.4); }
.cat-ascent { background:rgba(224,123,208,.15); color:#e9a8dd; border:1px solid rgba(224,123,208,.4); }
td.country { white-space:nowrap; }

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

td.score, th.score { text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap; }
td.score { font-weight:600; }

/* 順位表の折りたたみ(101名以上の大会のみ。1つ開くと他は閉じる=tournaments/deck.js) */
.rank-block { border:1px solid var(--line); border-radius:12px; background:var(--panel); margin-bottom:8px; }
.rank-block > summary { cursor:pointer; padding:10px 16px; font-weight:600; font-size:.9rem; display:flex; gap:10px; align-items:baseline; }
.rank-block > summary:hover { background:rgba(255,255,255,.03); }
.rank-block > summary:focus-visible { outline:2px solid var(--accent-2); outline-offset:-2px; }
.rank-block[open] > summary { border-bottom:1px solid var(--line); }
.rank-block > .cp-scroll { padding:0 6px 6px; }

/* ---- デッキ(ダイアログ表示。中身は共有デッキ画面と同一の .view-grid/.cardph) ---- */
/* 重ね順はカード詳細(.gacd-modal = z-index 60)より下。カード詳細が上に重なる */
.deck-modal { position:fixed; inset:0; z-index:50; }
.deck-backdrop { position:absolute; inset:0; background:rgba(0,0,0,.6); }
.deck-body { position:relative; background:var(--panel); color:var(--text); border:1px solid var(--line); border-radius:14px; max-width:900px; max-height:90vh; margin:5vh auto; padding:18px 20px; overflow:auto; }
.deck-close { position:absolute; top:8px; right:10px; background:none; border:none; color:var(--muted); font-size:1.6rem; line-height:1; cursor:pointer; padding:4px 8px; }
.deck-close:hover { color:var(--text); }
.deck-modal-title { margin:0 30px .6em 0; font-size:1rem; display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
.deck-modal-content .view-zone:first-child { padding-top:0; }
.deck-modal-content .view-zone { padding-left:0; padding-right:0; }
.deck-msg { color:var(--muted); font-size:.88rem; padding:20px 0; }
.deck-retry { margin-left:10px; background:var(--panel-2); color:var(--text); border:1px solid var(--line); border-radius:8px; padding:4px 12px; font:inherit; font-size:.82rem; cursor:pointer; }
.deck-retry:hover { border-color:var(--accent); }
.deck-player { font-weight:600; }
.rank-badge { background:rgba(217,164,65,.15); color:var(--accent); border:1px solid rgba(217,164,65,.4); border-radius:999px; padding:1px 10px; font-size:.78rem; font-weight:700; white-space:nowrap; }
.view-zone { padding:14px 16px 0; }
.deck-acc > .view-zone:last-of-type { padding-bottom:16px; }
.view-zone h4 { font-size:.85rem; color:var(--muted); font-weight:600; letter-spacing:.04em; margin:0 0 10px; padding-bottom:8px; border-bottom:1px solid var(--line); }
.view-zone h4 b { color:var(--text); font-variant-numeric:tabular-nums; }
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
/* ---- スマホ幅(2026-07-22): 表のままでは列を削っても右が見切れるため、1件=1カードに組み替える ----
   HTMLは共通。表の各セルに付けたクラスを目印にgridへ再配置し、隠したヘッダの代わりに
   ラベルを ::before で補う(生成CSS内で完結するため style-src 'self' に抵触しない) */
@media (max-width:640px) {
  /* 絞り込みはトグルにする(既定は閉じる=tournaments.js。適用中の件数はバッジで見せる) */
  .filter-box > summary { display:block; }
  .filter-box[open] > summary { margin-bottom:12px; padding-bottom:10px; border-bottom:1px solid var(--line); }
  .cp-scroll { overflow-x:visible; }
  table, tbody, tr, td { display:block; }
  thead { display:none; }
  tbody td { border:none; padding:0; }
  tbody tr { border:1px solid var(--line); border-radius:12px; background:var(--panel); padding:12px 14px; margin-bottom:10px; }

  /* 一覧: 大会名 / 開催日・開催国・種別 / 主催 / フォーマット・参加者数 の4行。
     メタ行は幅が足りなければ自然に折り返させたいのでflexで並べる(種別バッジは分断しない) */
  #ev-table tbody tr.tr-link { display:flex; flex-wrap:wrap; align-items:baseline; column-gap:6px; row-gap:3px; }
  #ev-table tbody tr.tr-link > td:nth-child(2) { display:contents; } /* 大会名・主催を行の直接の子として並べる */
  .ev-name { flex-basis:100%; order:1; font-size:.95rem; }
  td.date, td.country, td.cat { order:2; }
  .ev-host { flex-basis:100%; order:3; }
  td.format, td.num { order:4; color:var(--muted); font-size:.82rem; }
  td.num { text-align:left; }
  /* 区切りの中点。種別はバッジ自体が独立して見えるため付けない(折り返したとき行頭に中点が残らない) */
  td.country::before, td.num::before { content:"・"; color:var(--muted); margin-right:6px; }
  .cat-short { display:none; }
  .cat-full { display:inline; }

  /* 順位表: 順位・プレイヤー名・デッキ導線 / 勝ち点・成績 の2行 */
  .standings tbody tr { display:grid; grid-template-columns:auto 1fr auto; gap:2px 8px; align-items:baseline; }
  .standings td.rank { grid-column:1; grid-row:1; }
  .standings td.player-name { grid-column:2; grid-row:1; }
  .standings tbody td:last-child { grid-column:3; grid-row:1; text-align:right; }
  .standings td.score { grid-column:1; grid-row:2; text-align:left; }
  .standings td.score::before { content:"勝ち点 "; color:var(--muted); font-weight:400; font-size:.82rem; }
  .standings td.rec { grid-column:2/-1; grid-row:2; white-space:normal; }
  .standings td.rec::before { content:"・"; color:var(--muted); margin-right:4px; }
  /* タイブレーカーの参考値(GW%・MW%)はスマホでは出さない */
  .standings th.pct, .standings td.pct { display:none; }
  .rank-block > .cp-scroll { padding:0; }

  .deck-body { margin:0; max-width:none; min-height:100%; max-height:100vh; border-radius:0; padding:16px; }
  .view-grid { grid-template-columns:repeat(auto-fill,minmax(104px,1fr)); gap:8px; }
}
`;

const LIST_JS = `// 大会一覧のクライアント側フィルタ。生成元: scripts/build-tournament-pages.mjs
// 収録件数が少ない(主要大会のみ)ため、サーバー往復なしで全行を即時に絞り込む。
// 絞り込み条件はURLのクエリに書き戻す(大会詳細から戻ったときに復元・URL共有もできる)。
"use strict";
(() => {
  const table = document.getElementById("ev-table");
  if (!table) return;
  const rows = Array.from(table.tBodies[0].rows).filter((r) => r.dataset.href);
  const text = document.getElementById("f-text");
  const hits = document.getElementById("f-hits");
  const reset = document.getElementById("f-reset");
  const from = document.getElementById("f-from");
  const to = document.getElementById("f-to");
  const box = document.getElementById("filter-box");
  const count = document.getElementById("f-count");
  // <select id="f-xxx"> と行の data-xxx を対応づける
  const selects = [["cat", "cat"], ["country", "country"], ["format", "format"], ["season", "season"]]
    .map(([id, key]) => [document.getElementById("f-" + id), key])
    .filter(([el]) => el);
  // クエリ名 → 入力要素(復元・書き戻しの対応表)
  const fields = [...selects.map(([el, key]) => [key, el]), ["q", text], ["from", from], ["to", to]];

  function apply() {
    const q = text.value.trim().toLowerCase();
    const lo = from.value, hi = to.value;
    let n = 0;
    rows.forEach((r) => {
      const d = r.dataset.date || "";
      const ok = selects.every(([el, key]) => !el.value || r.dataset[key] === el.value) &&
        (!q || (r.dataset.search || "").toLowerCase().includes(q)) &&
        (!lo || d >= lo) && (!hi || d <= hi);
      r.hidden = !ok;
      if (ok) n++;
    });
    hits.textContent = n === rows.length ? \`\${rows.length} 大会\` : \`\${n} / \${rows.length} 大会\`;
    saveQuery();
  }

  // 現在の絞り込みをURLに反映(履歴を増やさない replaceState。空の条件は書かない)。
  // 併せて、絞り込み件数のバッジと各大会へのリンクにも同じクエリを反映する
  function saveQuery() {
    const p = new URLSearchParams();
    let active = 0;
    fields.forEach(([name, el]) => { if (el.value) { p.set(name, el.value); active++; } });
    const qs = p.toString();
    history.replaceState(null, "", qs ? location.pathname + "?" + qs : location.pathname);
    count.hidden = !active;
    count.textContent = active;
    // 大会詳細に絞り込み条件を引き継ぐ(詳細のパンくずから戻ったときに復元するため)
    rows.forEach((r) => {
      const url = r.dataset.href + (qs ? "?" + qs : "");
      r.dataset.url = url;
      const a = r.querySelector(".ev-name a");
      if (a) a.href = url;
    });
  }

  // URLのクエリから復元(大会詳細からのブラウザバック・共有URLの両方でここを通る)
  function loadQuery() {
    const p = new URLSearchParams(location.search);
    fields.forEach(([name, el]) => {
      const v = p.get(name);
      if (v == null) return;
      // 選択肢に無い値は無視する(古いURL・手打ちで壊れないように)
      if (el.tagName === "SELECT" && !Array.from(el.options).some((o) => o.value === v)) return;
      el.value = v;
    });
  }

  selects.forEach(([el]) => el.addEventListener("change", apply));
  [text, from, to].forEach((el) => el.addEventListener("input", apply));
  reset.addEventListener("click", () => {
    fields.forEach(([, el]) => { el.value = ""; });
    apply();
  });
  // bfcacheが効かない環境での復帰(履歴移動でURLだけ変わった場合も追従する)
  addEventListener("popstate", () => { loadQuery(); apply(); });
  loadQuery();

  // 行全体をクリックできるようにする(セル内リンクのクリックはそのまま活かす)
  rows.forEach((r) => {
    r.addEventListener("click", (e) => {
      if (e.target.closest("a")) return;
      location.href = r.dataset.url || r.dataset.href;
    });
  });

  // スマホ幅では絞り込みを畳んでおく(HTMLは open で出力してJS無効時も使えるようにしてある)
  const narrow = matchMedia("(max-width:640px)");
  const fitViewport = () => { box.open = !narrow.matches; };
  narrow.addEventListener("change", fitViewport);
  fitViewport();

  apply();
})();
`;

const DECK_JS = `// 大会詳細ページのデッキ表示まわり。生成元: scripts/build-tournament-pages.mjs
// 1) 順位表「デッキを見る」→ decks.html(全デッキのHTML断片)から該当1件だけをダイアログに描画
// 2) ダイアログ内のカードクリック → shared/js/card-detail.js の詳細ダイアログが上に重なる
// 3) 順位表の折りたたみ(101名以上の大会)の排他制御
//
// decks.html は取得後もテキストのまま持ち、DOMParser で解析した文書(非表示・レイアウトなし)から
// 該当デッキだけを複製する。断片全体をページのDOMへ差し込まない(422デッキ=カード約25,000枚)。
"use strict";
(() => {
  // 一覧から絞り込み条件付き(?cat=…)で来た場合、パンくずの一覧リンクにも同じ条件を付け直す
  // (ブラウザバックだけでなくパンくずから戻っても絞り込みが復元されるようにする)
  if (location.search) {
    document.querySelectorAll('.cp-crumb a[href="/tournaments/"]')
      .forEach((a) => { a.href = "/tournaments/" + location.search; });
  }

  const modal = document.getElementById("deck-modal");
  if (!modal) return;
  const src = modal.dataset.decksSrc;
  const titleEl = modal.querySelector(".deck-modal-title");
  const contentEl = modal.querySelector(".deck-modal-content");
  const DECK_HASH = /^deck-\\d+$/;

  let fetching = null;   // 取得中/取得済みのPromise(解析済みDocument)
  let openedByHashChange = false; // 履歴を1つ進めて開いたか(閉じるときに戻るかの判断)

  const fetchDecks = () => {
    if (!fetching) {
      fetching = fetch(src)
        .then((r) => { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); })
        .then((html) => new DOMParser().parseFromString(html, "text/html"))
        .catch((e) => { fetching = null; throw e; }); // 失敗は握らず再試行できるようにする
    }
    return fetching;
  };

  const message = (text, retryId) => {
    contentEl.textContent = "";
    const p = document.createElement("p");
    p.className = "deck-msg";
    p.textContent = text;
    if (retryId) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "deck-retry";
      btn.textContent = "再試行";
      btn.addEventListener("click", () => render(retryId));
      p.appendChild(btn);
    }
    contentEl.appendChild(p);
  };

  // 解析済み文書から該当デッキ1件を複製してダイアログに描画する
  function render(id) {
    titleEl.textContent = "デッキ";
    message("デッキを読み込んでいます…");
    return fetchDecks().then((doc) => {
      const deck = doc.getElementById(id);
      if (!deck) { message("このデッキは見つかりませんでした。"); return; }
      const summary = deck.querySelector("summary");
      titleEl.innerHTML = summary ? summary.innerHTML : "デッキ";
      contentEl.textContent = "";
      deck.querySelectorAll(".view-zone").forEach((z) => contentEl.appendChild(document.importNode(z, true)));
      contentEl.scrollTop = 0;
      modal.querySelector(".deck-body").scrollTop = 0;
    }).catch((e) => {
      console.error(e);
      message("デッキの読み込みに失敗しました。", id);
    });
  }

  function openDeck(id) {
    openRankBlockOf(id);
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    render(id);
  }

  function closeDeck() {
    if (modal.hidden) return;
    modal.hidden = true;
    contentEl.textContent = "";
    document.body.style.overflow = "";
    if (!DECK_HASH.test(location.hash.slice(1))) return;
    // 「デッキを見る」で進んだ履歴は戻す(ブラウザバックと同じ状態にする)
    if (openedByHashChange) { openedByHashChange = false; history.back(); }
    else history.replaceState(null, "", location.pathname + location.search);
  }

  // 折りたたまれた順位表で開かれた場合、該当プレイヤーを含むブロックを開く
  function openRankBlockOf(id) {
    const row = document.querySelector('tr[data-player="' + id.slice(5) + '"]');
    const block = row && row.closest("details.rank-block");
    if (block && !block.open) block.open = true; // toggleハンドラが他ブロックを閉じる
  }

  const syncFromHash = () => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (DECK_HASH.test(id)) openDeck(id);
    else closeDeck();
  };
  addEventListener("hashchange", () => { openedByHashChange = true; syncFromHash(); });
  syncFromHash(); // 共有された #deck-123 付きURLで直接開かれた場合

  modal.addEventListener("click", (e) => { if (e.target.closest("[data-deck-close]")) closeDeck(); });
  // 同じハッシュの「デッキを見る」を再クリックしても hashchange が出ないため個別に拾う
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a.deck-link");
    if (a && a.hash.slice(1) === location.hash.slice(1)) syncFromHash();
  });

  // ---- 順位表の折りたたみ: 1つ開いたら他を閉じる ----
  const blocks = Array.from(document.querySelectorAll("details.rank-block"));
  blocks.forEach((b) => b.addEventListener("toggle", () => {
    if (b.open) blocks.forEach((o) => { if (o !== b) o.open = false; });
  }));

  if (!window.GA_CARD_DETAIL) return;
  // カード詳細を閉じてもデッキダイアログが開いていれば背面のスクロール停止を維持する
  GA_CARD_DETAIL.init({ onAfterClose: () => { if (!modal.hidden) document.body.style.overflow = "hidden"; } });
  // ---- カードタイル。1ダイアログに数百個並びうるため個別登録せず文書単位で委譲する ----
  const tileOf = (e) => e.target.closest(".cardph[data-slug]");
  document.addEventListener("click", (e) => {
    const tile = tileOf(e);
    if (tile) GA_CARD_DETAIL.openBySlug(tile.dataset.slug);
  });
  document.addEventListener("keydown", (e) => {
    // Escapeは内側(カード詳細)から順に閉じる
    if (e.key === "Escape") {
      if (GA_CARD_DETAIL.isOpen()) GA_CARD_DETAIL.close();
      else closeDeck();
      return;
    }
    if (e.key !== "Enter" && e.key !== " ") return;
    const tile = tileOf(e);
    if (tile) { e.preventDefault(); GA_CARD_DETAIL.openBySlug(tile.dataset.slug); }
  });

  // 回線が空いたら取得・解析だけ済ませておく(初回表示の待ち時間を消す)
  const prefetch = () => fetchDecks().catch(() => {});
  if (window.requestIdleCallback) requestIdleCallback(prefetch, { timeout: 3000 });
  else addEventListener("load", () => setTimeout(prefetch, 500));
})();
`;

// ---------- 生成 ----------

function build(events, cardBySlug) {
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(path.join(OUT_DIR, "index.html"), listPage(events));
  writeFileSync(path.join(OUT_DIR, "tournaments.css"), CSS);
  writeFileSync(path.join(OUT_DIR, "tournaments.js"), LIST_JS);
  writeFileSync(path.join(OUT_DIR, "deck.js"), DECK_JS);

  // 1大会 = 大会詳細(概要+順位表)と decks.html(デッキのHTML断片)の2ファイル。
  // デッキは順位表からダイアログで表示するため、詳細ページ本体には持たせない
  // (1デッキ=1ファイルにするとCloudflare Pagesのファイル数上限に近づく。設計「運用リスク」節)
  let decks = 0;
  for (const ev of events) {
    const dir = path.join(OUT_DIR, String(ev.id));
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "index.html"), eventPage(ev));
    writeFileSync(path.join(dir, "decks.html"), decksFragment(ev, cardBySlug));
    decks += ev.decklists.length;
  }
  log(`\n生成完了: 大会${events.length}ページ(概要+順位表) / decks.html ${events.length}件(デッキ${decks}件) / 一覧・CSS・JS`);
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
