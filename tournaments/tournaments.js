// 大会一覧のクライアント側フィルタ。生成元: scripts/build-tournament-pages.mjs
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
  const about = document.getElementById("about-box");
  const emptyEl = document.getElementById("ev-empty");
  const count = document.getElementById("f-count");
  // <select id="f-xxx"> と行の data-xxx を対応づける
  const selects = [["cat", "cat"], ["country", "country"], ["format", "format"], ["season", "season"]]
    .map(([id, key]) => [document.getElementById("f-" + id), key])
    .filter(([el]) => el);
  // クエリ名 → 入力要素(復元・書き戻しの対応表)
  const fields = [...selects.map(([el, key]) => [key, el]), ["q", text], ["from", from], ["to", to]];

  // ---- 並べ替え(#16) ----
  // 列キー → 行の dataset 名・数値比較か・初回クリック時の既定方向
  const SORT_COLS = {
    date: { attr: "date", num: false, def: "desc" },
    name: { attr: "name", num: false, def: "asc" },
    country: { attr: "countrySort", num: false, def: "asc" },
    format: { attr: "formatSort", num: false, def: "asc" },
    cat: { attr: "catSort", num: true, def: "desc" },
    players: { attr: "players", num: true, def: "desc" },
  };
  const DEFAULT_SORT = "date-desc"; // 既定(=SSRの開催日降順)。この値のときはURLに書かない
  const headers = table.tHead ? Array.from(table.tHead.querySelectorAll("th[data-sort]")) : [];
  const sortSelect = document.getElementById("f-sort");
  // 取得時のDOM順(既定の開催日降順・id降順)を安定タイブレークの基準として記憶する
  const rowOrder = new Map(rows.map((r, i) => [r, i]));
  let sortKey = "date", sortDir = "desc";

  function sortBy(key, dir) {
    const col = SORT_COLS[key];
    if (!col) return;
    sortKey = key;
    sortDir = dir === "asc" ? "asc" : "desc";
    const sign = sortDir === "asc" ? 1 : -1;
    const tbody = table.tBodies[0];
    rows.slice().sort((a, b) => {
      const va = a.dataset[col.attr] ?? "", vb = b.dataset[col.attr] ?? "";
      let c = col.num ? Number(va) - Number(vb) : String(va).localeCompare(String(vb), "ja");
      if (c) return sign * c;
      return rowOrder.get(a) - rowOrder.get(b); // 同値は取得時DOM順で安定化
    }).forEach((r) => tbody.appendChild(r)); // appendChild は既存要素を移動(hidden状態は保持=絞り込みと独立)
    headers.forEach((th) => {
      if (th.dataset.sort === sortKey) th.setAttribute("aria-sort", sortDir === "asc" ? "ascending" : "descending");
      else th.removeAttribute("aria-sort");
    });
    if (sortSelect) sortSelect.value = sortKey + "-" + sortDir;
    saveQuery();
  }

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
    // 絞り込んでいないときは全体の収録件数、絞り込み中は結果件数を出す
    hits.textContent = n === rows.length ? `全 ${rows.length} 件` : `検索結果：${n}件`;
    // 0件で画面が空になるのを防ぐ(収録0件のときは表内の案内が出るので二重に出さない)
    emptyEl.hidden = n !== 0 || rows.length === 0;
    saveQuery();
  }

  // 現在の絞り込みをURLに反映(履歴を増やさない replaceState。空の条件は書かない)。
  // 併せて、絞り込み件数のバッジと各大会へのリンクにも同じクエリを反映する
  function saveQuery() {
    const p = new URLSearchParams();
    let active = 0;
    fields.forEach(([name, el]) => { if (el.value) { p.set(name, el.value); active++; } });
    // 並べ替えは既定(date-desc)以外のときだけURLに残す(既定でURLを汚さない)。件数バッジには数えない
    const curSort = sortKey + "-" + sortDir;
    if (curSort !== DEFAULT_SORT) p.set("sort", curSort);
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
    // 並べ替えの復元。sort が無ければ既定に戻す(popstateで既定URLへ戻ったときに前の並びが残らないように)
    sortKey = "date"; sortDir = "desc";
    const s = p.get("sort");
    if (s) {
      const [k, d] = s.split("-");
      if (SORT_COLS[k] && (d === "asc" || d === "desc")) { sortKey = k; sortDir = d; }
    }
  }

  selects.forEach(([el]) => el.addEventListener("change", apply));
  [text, from, to].forEach((el) => el.addEventListener("input", apply));
  reset.addEventListener("click", () => {
    fields.forEach(([, el]) => { el.value = ""; });
    apply();
  });
  // 見出しクリック(button なのでキーボードEnter/Spaceでも発火): 同じ列なら方向反転、別列ならその列の既定方向
  headers.forEach((th) => {
    const btn = th.querySelector(".th-sort");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const key = th.dataset.sort;
      const col = SORT_COLS[key];
      if (!col) return;
      sortBy(key, key === sortKey ? (sortDir === "asc" ? "desc" : "asc") : col.def);
    });
  });
  // スマホ用select: "key-dir" を分解して適用(見出しクリックとは sortBy 経由で相互同期)
  if (sortSelect) sortSelect.addEventListener("change", () => {
    const [key, dir] = sortSelect.value.split("-");
    if (SORT_COLS[key]) sortBy(key, dir);
  });
  // bfcacheが効かない環境での復帰(履歴移動でURLだけ変わった場合も追従する)
  addEventListener("popstate", () => { loadQuery(); sortBy(sortKey, sortDir); apply(); });
  loadQuery();
  sortBy(sortKey, sortDir); // URL(または既定)の並べ替えを初期反映してから絞り込みを適用する

  // 行全体をクリックできるようにする(セル内リンクのクリックはそのまま活かす)
  rows.forEach((r) => {
    r.addEventListener("click", (e) => {
      if (e.target.closest("a")) return;
      location.href = r.dataset.url || r.dataset.href;
    });
  });

  // スマホ幅では絞り込みと説明文を畳んでおく(HTMLは open で出力してJS無効時も使えるようにしてある)
  const narrow = matchMedia("(max-width:640px)");
  const fitViewport = () => { box.open = !narrow.matches; about.open = !narrow.matches; };
  narrow.addEventListener("change", fitViewport);
  fitViewport();

  apply();
})();
