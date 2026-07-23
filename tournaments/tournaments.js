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

  // スマホ幅では絞り込みと説明文を畳んでおく(HTMLは open で出力してJS無効時も使えるようにしてある)
  const narrow = matchMedia("(max-width:640px)");
  const fitViewport = () => { box.open = !narrow.matches; about.open = !narrow.matches; };
  narrow.addEventListener("change", fitViewport);
  fitViewport();

  apply();
})();
