// 公式APIの全カードスナップショット(tmp/api-cache/cards-snapshot.json)の取得・読み込み。
// build-card-pages.mjs と build-tournament-pages.mjs が共用する。
// tmp/ はgit管理外のため、CI(GitHub Actions)では毎回APIから取り直すことになる。
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";

const API = "https://api.gatcg.com";
const CONCURRENCY = 4;

export const snapshotPath = (root) => path.join(root, "tmp", "api-cache", "cards-snapshot.json");

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
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify({ fetched_at: new Date().toISOString(), total: cards.length, cards }));
  process.stderr.write(`スナップショット保存: ${cards.length}枚 → ${path.relative(root, file)}\n`);
  return cards;
}

/**
 * カード一覧を返す。スナップショットが無い場合・force指定時はAPIから取得して保存する。
 * @param {string} root リポジトリのルート絶対パス
 * @param {{ force?: boolean }} [opts]
 * @returns {Promise<any[]>}
 */
export async function loadCards(root, opts = {}) {
  const file = snapshotPath(root);
  if (opts.force || !existsSync(file)) return refresh(root);
  const snap = JSON.parse(readFileSync(file, "utf8"));
  process.stderr.write(`スナップショット使用: ${snap.cards.length}枚 (取得: ${snap.fetched_at})\n`);
  return snap.cards;
}
