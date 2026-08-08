// 公式APIの全カードスナップショット(tmp/api-cache/cards-snapshot.json)の取得・読み込み。
// build-card-pages.mjs と build-tournament-pages.mjs が共用する。
// tmp/ はgit管理外のため、CI(GitHub Actions)では毎回APIから取り直すことになる。
//
// ⚠ スナップショットは「1回のcron実行の中で3ステップがAPI取得を共有する」ための実行内キャッシュ。
//   ローカルでは tmp/ が日をまたいで残るため寿命が無限に化ける(#51 の静かな劣化)。
//   → 有効期限(既定60分)を持たせ、期限切れなら自動で取り直す(#52)。
//   CIの3ステップは実測75秒で完走するので、60分でも相乗りは維持される。
// ⚠ 読み書きは scripts/lib/api-cache.mjs 経由(#54)。書き込みは原子的・読み込みは
//   壊れていても例外を投げない(壊れたJSONが残ると4スクリプトすべてが起動不能になるため)。
import { existsSync } from "node:fs";
import path from "node:path";
import { writeJsonAtomic, readJsonSafe } from "./api-cache.mjs";

const API = "https://api.gatcg.com";
const CONCURRENCY = 4;
const DEFAULT_MAX_AGE_MIN = 60;

export const snapshotPath = (root) => path.join(root, "tmp", "api-cache", "cards-snapshot.json");

/**
 * スナップショットの有効期限(分)を解決する。
 * 環境変数 GA_SNAPSHOT_MAX_AGE_MIN: 未設定=60 / 0=無期限 / 正の整数=その分数。
 * ⚠ 不正値は既定に落とす(ここで落とすと4スクリプトすべてが止まるため)。
 * @returns {number} 分。0 は無期限
 */
export function maxAgeMinutes(env = process.env) {
  const raw = env.GA_SNAPSHOT_MAX_AGE_MIN;
  if (raw === undefined || String(raw).trim() === "") return DEFAULT_MAX_AGE_MIN;
  const n = Number(String(raw).trim());
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
    process.stderr.write(`GA_SNAPSHOT_MAX_AGE_MIN の値が不正です (${raw}) — 既定の${DEFAULT_MAX_AGE_MIN}分を使います\n`);
    return DEFAULT_MAX_AGE_MIN;
  }
  return n;
}

/**
 * 経過時間の相対表現。60分未満は「n分前」、24時間未満は「n時間前」、それ以上は「n日前」(切り捨て)。
 * @param {number} ms 経過ミリ秒
 */
export function relativeAge(ms) {
  const min = Math.floor(Math.max(0, ms) / 60000);
  if (min < 60) return `${min}分前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}時間前`;
  return `${Math.floor(hour / 24)}日前`;
}

// 直近に loadCards() が返したデータの取得時刻(ISO)。完走サマリの表示に使う(#52)
let lastFetchedAt = null;

/** 直近に loadCards() が返したカードデータの取得時刻(ISO文字列)。未ロードなら null */
export function lastFetchedIso() {
  return lastFetchedAt;
}

export async function fetchJson(url, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (i >= tries) throw new Error(`${url}: ${e.message}`);
      await new Promise((r) => setTimeout(r, 1000 * i));
    }
  }
}

async function refresh(root) {
  process.stderr.write("公式APIから全カードを取得中...\n");
  const first = await fetchJson(`${API}/cards/search?page=1`);
  const totalPages = first.total_pages;
  const cards = [...first.data];
  const pages = [];
  for (let p = 2; p <= totalPages; p++) pages.push(p);
  let idx = 0;
  async function worker() {
    while (idx < pages.length) {
      const p = pages[idx++];
      const d = await fetchJson(`${API}/cards/search?page=${p}`);
      cards.push(...d.data);
      if (p % 10 === 0) process.stderr.write(`  ${p}/${totalPages} ページ\n`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  cards.sort((a, b) => a.slug.localeCompare(b.slug));
  const file = snapshotPath(root);
  const fetchedAt = new Date().toISOString();
  // ⚠ オンディスクの形は変えない({fetched_at, total, cards})。書き方だけ原子的にする(#54 D2)
  writeJsonAtomic(file, { fetched_at: fetchedAt, total: cards.length, cards });
  lastFetchedAt = fetchedAt;
  process.stderr.write(`スナップショット保存: ${cards.length}枚 → ${path.relative(root, file)}\n`);
  return cards;
}

/**
 * カード一覧を返す。スナップショットが無い場合・force指定時・有効期限切れの場合は
 * APIから取得して保存する(#52)。
 * ⚠ 取り直しに失敗したときに古いキャッシュへ黙って落ちない(例外を投げる)。
 *   黙って古いデータで生成するのが #51/#52 の不具合そのもののため。
 * @param {string} root リポジトリのルート絶対パス
 * @param {{ force?: boolean }} [opts]
 * @returns {Promise<any[]>}
 */
export async function loadCards(root, opts = {}) {
  const file = snapshotPath(root);
  if (opts.force || !existsSync(file)) return refresh(root);
  // ⚠ 壊れたJSON(書き込み中断の残骸など)で例外を投げない(#54)。ここで落ちると
  //   loadCards() を使う4スクリプトすべてが SyntaxError で起動不能になる。
  //   cards が配列でない場合も同じ扱い(そのまま進むと snap.cards.length で落ちるため)。
  const snap = readJsonSafe(file);
  if (!snap || !Array.isArray(snap.cards)) {
    process.stderr.write("スナップショットを読めないため取り直します\n");
    return refresh(root);
  }

  const maxMin = maxAgeMinutes();
  const t = Date.parse(snap.fetched_at);
  // ⚠ fetched_at が壊れている・欠けている場合は「期限切れ」とみなして取り直す(fail-safe)。
  //   ここで例外を投げると loadCards() を使う4スクリプトすべてが止まる。
  if (!Number.isFinite(t)) {
    process.stderr.write(`スナップショットが古いため取り直します (取得時刻不明 / 有効期限${maxMin}分)\n`);
    return refresh(root);
  }
  const age = relativeAge(Date.now() - t);
  if (maxMin === 0) {
    lastFetchedAt = snap.fetched_at;
    process.stderr.write(`スナップショット使用: ${snap.cards.length}枚 (取得: ${snap.fetched_at} / ${age} / 有効期限なし)\n`);
    return snap.cards;
  }
  if (Date.now() - t > maxMin * 60000) {
    process.stderr.write(`スナップショットが古いため取り直します (${age} / 有効期限${maxMin}分)\n`);
    return refresh(root);
  }
  lastFetchedAt = snap.fetched_at;
  process.stderr.write(`スナップショット使用: ${snap.cards.length}枚 (取得: ${snap.fetched_at} / ${age})\n`);
  return snap.cards;
}
