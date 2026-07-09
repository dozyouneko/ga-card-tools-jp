"use strict";
/*
 * カード取得の共有キャッシュ。公式API(/cards/:slug)の結果を
 * メモリ + localStorage(TTL付き)に保存し、リロード後や翌日の
 * デッキ表示・カード詳細表示を速くする。
 * 利用側: GA_CARD_CACHE.getCard(slug) -> Promise<card|null>
 */
window.GA_CARD_CACHE = (() => {
  const API = "https://api.gatcg.com";
  const PREFIX = "ga_card_v1:"; // キャッシュ形式を変えるときはバージョン番号を上げる
  const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7日。カードデータはほぼ変わらない(禁止改定等は最長7日遅れ)
  const mem = new Map(); // slug -> Promise<card|null>

  // 起動時に期限切れ・壊れた項目を掃除しておく(項目数は高々カード総数なので軽い)
  try {
    const now = Date.now();
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(PREFIX)) continue;
      try {
        if (now - (JSON.parse(localStorage.getItem(key)).t || 0) > TTL_MS) localStorage.removeItem(key);
      } catch {
        localStorage.removeItem(key);
      }
    }
  } catch { /* localStorage が使えない環境でも動作は継続 */ }

  function readStore(slug) {
    try {
      const raw = localStorage.getItem(PREFIX + slug);
      if (!raw) return null;
      const { t, c } = JSON.parse(raw);
      if (!c || Date.now() - t > TTL_MS) return null;
      return c;
    } catch { return null; }
  }

  function writeStore(slug, card) {
    const value = JSON.stringify({ t: Date.now(), c: card });
    try {
      localStorage.setItem(PREFIX + slug, value);
      return;
    } catch { /* 容量超過 → 下で古い順に削って1回だけ再試行 */ }
    try {
      const entries = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(PREFIX)) continue;
        let t = 0;
        try { t = JSON.parse(localStorage.getItem(key)).t || 0; } catch { /* 壊れた項目は t=0 で最優先削除 */ }
        entries.push({ key, t });
      }
      entries.sort((a, b) => a.t - b.t);
      entries.slice(0, Math.max(1, Math.ceil(entries.length / 2))).forEach((e) => localStorage.removeItem(e.key));
      localStorage.setItem(PREFIX + slug, value);
    } catch { /* プライベートモード等で保存できなくても継続(毎回fetchになるだけ) */ }
  }

  function getCard(slug) {
    if (mem.has(slug)) return mem.get(slug);
    const cached = readStore(slug);
    if (cached) {
      const p = Promise.resolve(cached);
      mem.set(slug, p);
      return p;
    }
    const p = fetch(`${API}/cards/${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((card) => {
        if (card) writeStore(slug, card);
        return card;
      })
      .catch(() => null);
    mem.set(slug, p);
    return p;
  }

  return { getCard };
})();
