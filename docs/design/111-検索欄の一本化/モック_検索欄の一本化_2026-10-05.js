"use strict";
/* モック: 検索欄の一本化（#111）の §3「実際に検索してみる」
 *
 * ⚠️ これは設計の説明用のモックで、本番コードではない。
 *    設計書 §5 のアルゴリズムをそのまま最小実装して、公式APIを本当に叩く。
 *    絞り込み（チップ・エキスパンション等）と日本語モードは載せていない。
 */
(() => {
  const API = "https://api.gatcg.com/cards/search";
  const PAGE_SIZE = 50;           // 本番の ALL_PAGE_SIZE
  const CONCURRENCY = 6;          // 本番の ALL_CONCURRENCY
  const UNION_MAX_PAGES = 20;     // 設計書 §5-3 の TEXT_UNION_MAX_PAGES
  const MIN_LEN = 3;              // 設計書 §5-6 の TEXT_MIN_LEN（英語のみ）

  const el = {
    q: document.getElementById("live-q"),
    go: document.getElementById("live-go"),
    status: document.getElementById("live-status"),
    meta: document.getElementById("live-meta"),
    list: document.getElementById("live-list"),
  };

  // ---------- 設計書 §5-1 トークン化 ----------
  function textTokens(s) {
    const out = [];
    const src = String(s || "").replace(/　/g, " ");
    const re = /"([^"]*)"?|([^\s"]+)/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      const t = (m[1] !== undefined ? m[1] : m[2]).trim().toLowerCase();
      if (t) out.push(t);
    }
    return out;
  }

  // ---------- 設計書 §5-2 一致の述語 ----------
  const lc = (s) => String(s || "").toLowerCase();
  const eds = (c) => c.editions || [];
  const oo = (c) => eds(c).reduce((a, e) => a.concat(e.other_orientations || []), []);
  const nameTexts = (c) => [c.name].concat(oo(c).map((o) => o.name));
  const effectTexts = (c) =>
    [c.effect_raw || c.effect]
      .concat(eds(c).map((e) => e.effect_raw || e.effect))
      .concat(oo(c).map((o) => o.effect_raw || o.effect));
  const hitsName = (c, t) => nameTexts(c).some((x) => lc(x).includes(t));
  const hitsEffect = (c, t) => effectTexts(c).some((x) => lc(x).includes(t));
  const hitsBack = (c, t) =>
    oo(c).some((o) => lc(o.name).includes(t) || lc(o.effect_raw || o.effect).includes(t));
  const matchesText = (c, toks) => toks.every((t) => hitsName(c, t) || hitsEffect(c, t));

  // ---------- 取得（本番の fetchAllPages / allCache 相当） ----------
  let reqCount = 0;
  const cache = new Map();
  async function getPage(base, k) {
    reqCount += 1;
    const url = `${API}?${base}${base ? "&" : ""}sort=collector_number&order=ASC&page=${k}&page_size=${PAGE_SIZE}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }
  function fetchAll(base, first, onProgress) {
    if (cache.has(base)) return cache.get(base);
    const p = (async () => {
      const f = first || (await getPage(base, 1));
      const cards = (f.data || []).slice();
      const seen = new Set(cards.map((c) => c.slug));
      const pages = Math.min(Math.ceil((f.total_cards || 0) / PAGE_SIZE), 60);
      const nums = [];
      for (let k = 2; k <= pages; k += 1) nums.push(k);
      let done = 1;
      if (onProgress && pages > 0) onProgress(done, pages);
      for (let i = 0; i < nums.length; i += CONCURRENCY) {
        const chunk = nums.slice(i, i + CONCURRENCY);
        const js = await Promise.all(chunk.map((k) => getPage(base, k)));
        js.forEach((j) => (j.data || []).forEach((c) => {
          delete c.result_editions;
          if (!seen.has(c.slug)) { seen.add(c.slug); cards.push(c); }
        }));
        done += chunk.length;
        if (onProgress) onProgress(done, pages);
      }
      return { cards, total: f.total_cards || 0, pages };
    })();
    cache.set(base, p);
    return p;
  }

  // ---------- 設計書 §5-5 名前順の比較器 ----------
  const nameKey = (c) => lc(c.name).replace(/[^a-z0-9]/g, "");
  function sortByName(list) {
    list.sort((a, b) => {
      const ka = nameKey(a);
      const kb = nameKey(b);
      if (ka !== kb) return ka < kb ? -1 : 1;
      const sa = a.slug || "";
      const sb = b.slug || "";
      return sa < sb ? -1 : sa > sb ? 1 : 0;
    });
    return list;
  }

  // ---------- 本体 ----------
  let seq = 0;
  async function run() {
    const mySeq = ++seq;
    reqCount = 0;
    const raw = el.q.value;
    const toks = textTokens(raw);
    el.list.innerHTML = "";
    el.meta.textContent = "";
    if (!toks.length) {
      el.status.textContent = "入力がありません（絞り込みなしの全件表示に相当）。";
      return;
    }
    if (/[ぁ-んァ-ヶ一-龥々ー]/.test(raw)) {
      el.status.textContent =
        "日本語モードです。本番はローカルの訳データ（0リクエスト）で照合しますが、このモックは訳を読み込まないので件数は §4 の表を見てください。";
      return;
    }
    if (!toks.some((t) => t.length >= MIN_LEN)) {
      // 設計書 §5-6 / §8-2（searchStatus の blocked: "short-text"）
      el.status.textContent = "英語で検索するときは3文字以上入力してください。";
      el.meta.textContent = "（リクエスト 0件 — 公式APIを叩いていません）";
      return;
    }

    const t0 = performance.now();
    el.status.textContent = "検索中…";
    const key = (t, field) => `${field}=${encodeURIComponent(t)}`;

    // ① 各トークンの name / effect の1ページ目を並列で取る（= プローブ兼1ページ目）
    const firsts = new Map();
    await Promise.all(
      toks.flatMap((t) => ["name", "effect"].map(async (f) => {
        const b = key(t, f);
        firsts.set(b, await getPage(b, 1));
      }))
    );
    if (mySeq !== seq) return;

    const pg = (n) => Math.ceil(n / PAGE_SIZE);
    const costs = toks.map((t) => {
      const n = firsts.get(key(t, "name")).total_cards || 0;
      const e = firsts.get(key(t, "effect")).total_cards || 0;
      return { t, n, e, pages: pg(n) + pg(e) };
    });
    const best = costs.reduce((a, b) => (a.pages <= b.pages ? a : b));

    // ② 候補集合（上位集合）を全件取る
    let pool;
    let route;
    const prog = (done, total) => {
      if (mySeq === seq) el.status.textContent = `読み込み中 ${done}/${total} ページ…`;
    };
    if (best.pages <= UNION_MAX_PAGES) {
      const kn = key(best.t, "name");
      const ke = key(best.t, "effect");
      const [N, E] = await Promise.all([
        fetchAll(kn, firsts.get(kn), prog),
        fetchAll(ke, firsts.get(ke), prog),
      ]);
      const m = new Map();
      N.cards.concat(E.cards).forEach((c) => m.set(c.slug, c));
      pool = Array.from(m.values());
      route = `union 路 — 「${best.t}」の name ${N.total}件 ∪ effect ${E.total}件 = 候補 ${pool.length}件（${best.pages} ページ）`;
    } else {
      const A = await fetchAll("", null, prog);
      pool = A.cards;
      route = `全件路 — 候補 ${pool.length}件（${A.pages} ページ）。最安の union 路が ${best.pages} ページで上限 ${UNION_MAX_PAGES} を超えたため`;
    }
    if (mySeq !== seq) return;

    // ③ ローカルで述語を当てて並べる
    const res = sortByName(pool.filter((c) => matchesText(c, toks)));
    const ms = Math.round(performance.now() - t0);

    el.status.textContent = `${res.length} 件`;
    el.meta.textContent = `${route} / リクエスト ${reqCount}件 / ${(ms / 1000).toFixed(2)} 秒 / トークン [${toks.map((t) => `"${t}"`).join(", ")}]`;
    el.list.innerHTML = "";
    res.slice(0, 60).forEach((c) => {
      const li = document.createElement("li");
      const where = toks.map((t) => {
        const tags = [];
        if (hitsName(c, t)) tags.push('<span class="mk-hit">名前</span>');
        if (hitsEffect(c, t)) tags.push('<span class="mk-hit-eff">効果</span>');
        if (hitsBack(c, t)) tags.push('<span class="mk-hit-back">裏面</span>');
        return `"${t}" → ${tags.join("・")}`;
      }).join(" / ");
      li.innerHTML = `<strong>${escapeHtml(c.name)}</strong> <span class="mk-dim">${escapeHtml(c.slug)}</span><br>${where}`;
      el.list.appendChild(li);
    });
    if (res.length > 60) {
      const li = document.createElement("li");
      li.className = "mk-dim";
      li.textContent = `…（残り ${res.length - 60} 件は省略。本番は「もっと見る」で 50 件ずつ）`;
      el.list.appendChild(li);
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  el.go.addEventListener("click", run);
  el.q.addEventListener("keydown", (e) => { if (e.key === "Enter") run(); });
  document.querySelectorAll(".mk-chip").forEach((b) => {
    b.addEventListener("click", () => { el.q.value = b.dataset.q; run(); });
  });
})();
