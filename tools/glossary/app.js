(function () {
  const terms = (window.GA_I18N && window.GA_I18N.terms) || {};
  const entries = Object.keys(terms).map((key) => terms[key]);

  const list = document.getElementById("list");
  const empty = document.getElementById("empty");
  const count = document.getElementById("count");
  const q = document.getElementById("q");

  function render(filterText) {
    const needle = (filterText || "").trim().toLowerCase();
    const shown = needle
      ? entries.filter((t) => t.jp.toLowerCase().includes(needle) || t.desc.toLowerCase().includes(needle))
      : entries;

    list.innerHTML = shown
      .map((t) => `<li><span class="term-jp">${escapeHtml(t.jp)}</span><span class="term-desc">${escapeHtml(t.desc)}</span></li>`)
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
