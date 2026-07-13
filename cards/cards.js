// カード個別ページ・セット一覧(静的生成)用の軽量スクリプト。生成元: scripts/build-card-pages.mjs
// 1) 文字列絞り込み  2) セット一覧のホバー画像プレビュー  3) 個別ページのイラスト切替(#art 初期選択)
"use strict";
(() => {
  // ---- 1) 絞り込み: <input data-filter="対象セレクタ"> の入力で対象行を表示/非表示 ----
  // グループ見出し(.cp-group)がある場合: グループ名がヒットしたら配下を全表示、
  // 全滅したグループはセクションごと隠す。
  document.querySelectorAll("input[data-filter]").forEach((input) => {
    const targets = Array.from(document.querySelectorAll(input.dataset.filter));
    input.addEventListener("input", () => {
      const q = input.value.trim().toLowerCase();
      targets.forEach((el) => {
        const group = el.closest(".cp-group");
        const groupName = group ? (group.querySelector(".cp-group-name") || {}).textContent || "" : "";
        el.hidden = q !== "" &&
          !el.textContent.toLowerCase().includes(q) &&
          !groupName.toLowerCase().includes(q);
      });
      document.querySelectorAll(".cp-group").forEach((g) => {
        g.hidden = q !== "" && !Array.from(g.querySelectorAll(".cp-setlist li")).some((li) => !li.hidden);
      });
    });
  });

  // ---- 2) ホバープレビュー: [data-img] にマウスを載せるとカード画像を表示(タッチ端末は無効) ----
  if (window.matchMedia("(hover: hover)").matches) {
    const links = document.querySelectorAll("[data-img]");
    if (links.length) {
      const img = document.createElement("img");
      img.id = "cp-preview";
      img.alt = "";
      document.body.appendChild(img);
      const move = (e) => {
        const pad = 16, w = 240, h = 336;
        let x = e.clientX + pad, y = e.clientY + pad;
        if (x + w > innerWidth) x = e.clientX - w - pad;
        if (y + h > innerHeight) y = Math.max(8, innerHeight - h - 8);
        img.style.left = x + "px";
        img.style.top = y + "px";
      };
      links.forEach((a) => {
        a.addEventListener("mouseenter", (e) => {
          img.src = a.dataset.img;
          img.style.display = "block";
          move(e);
        });
        a.addEventListener("mousemove", move);
        a.addEventListener("mouseleave", () => {
          img.style.display = "none";
          img.removeAttribute("src");
        });
      });
    }
  }

  // ---- 3) イラスト切替: サムネクリックで主画像を差し替え。#art=<set-slug> で初期選択 ----
  const main = document.getElementById("cp-main-img");
  const thumbs = Array.from(document.querySelectorAll(".cp-thumb"));
  if (main && thumbs.length) {
    const select = (btn) => {
      main.src = btn.dataset.url;
      thumbs.forEach((b) => b.classList.toggle("active", b === btn));
    };
    thumbs.forEach((btn) => btn.addEventListener("click", () => select(btn)));
    const m = location.hash.match(/^#art=([a-z0-9-]+)/);
    if (m) {
      const hit = thumbs.find((b) => b.dataset.prefix === m[1]);
      if (hit) select(hit);
    }
  }
})();
