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
        // 検索は英語キーワードで行う(英語原文には必ず含まれるため、和訳の言い回し差で取りこぼさない)
        // ⭐ 検索欄が1つになったので q= に書く(#111 §4-3)。
        // ⚠️ ⭐ 空白を含む英語名は " で囲んで「句」として渡す。囲まないと語ごとの AND になり、
        //    134本のうち 74本が壊れる(実測: On Banish が 3件 → 569件)。
        // ⚠️ 旧 ?qtext= のリンク(ブックマーク・外部から貼られたURL)もトップ側が読む。
        //    変換は共有側 GA_CARD_SEARCH.mergeLegacyText() の1か所に置いてある。
        const term = /\s/.test(t.en) ? `"${t.en}"` : t.en;
        const href = `../../index.html?q=${encodeURIComponent(term)}`;
        return `<li>
          <div class="term-head">
            <a class="term-jp" href="${escapeHtml(href)}" title="この用語でカードを検索">${escapeHtml(t.jpCore)}</a>
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
