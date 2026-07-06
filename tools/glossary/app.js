(function () {
  const terms = (window.GA_I18N && window.GA_I18N.terms) || {};
  const entries = Object.keys(terms).map((key) => {
    const { jp, desc } = terms[key];
    const { jpCore, en } = splitTerm(key, jp);
    return { jpCore, en, desc };
  });

  const list = document.getElementById("list");
  const empty = document.getElementById("empty");
  const count = document.getElementById("count");
  const q = document.getElementById("q");

  // jp は "日本語（English）" の形が多いが、括弧の中身が日本語の補足（例: マテリアライズ（実体化））な
  // エントリや、括弧が無いエントリもある。括弧の中身がASCII（英字）に見える場合だけそれを英語名として扱い、
  // それ以外は辞書キーから英語名を組み立てる（キー自体が正式な英語キーワードのため）。
  function splitTerm(key, jp) {
    const m = jp.match(/^(.*?)（(.+)）$/);
    if (m && /^[A-Za-z0-9 .,'\-\/]+$/.test(m[2])) {
      return { jpCore: m[1].trim(), en: m[2].trim() };
    }
    return { jpCore: jp, en: titleCaseFromKey(key) };
  }

  function titleCaseFromKey(key) {
    return key.replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function render(filterText) {
    const needle = (filterText || "").trim().toLowerCase();
    const shown = needle
      ? entries.filter((t) =>
          t.jpCore.toLowerCase().includes(needle) ||
          t.en.toLowerCase().includes(needle) ||
          t.desc.toLowerCase().includes(needle))
      : entries;

    list.innerHTML = shown
      .map((t) => {
        const href = `../../index.html?qtext=${encodeURIComponent(t.jpCore)}`;
        return `<li>
          <div class="term-head">
            <a class="term-jp" href="${escapeHtml(href)}" title="効果テキスト検索でこの用語を検索">${escapeHtml(t.jpCore)}</a>
            <span class="term-en">${escapeHtml(t.en)}</span>
          </div>
          <span class="term-desc">${escapeHtml(t.desc)}</span>
        </li>`;
      })
      .join("");
    empty.hidden = shown.length !== 0;
    count.textContent = `${shown.length} / ${entries.length} 件`;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  q.addEventListener("input", () => render(q.value));
  render("");
})();
