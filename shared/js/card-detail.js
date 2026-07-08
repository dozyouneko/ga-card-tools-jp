"use strict";
/*
 * カード詳細モーダル — トップページとデッキ構築ツールで共用するコンポーネント。
 * init() で自身のDOM(#gacd-modal)を document.body に注入する。
 * CSSは shared/css/card-detail.css（.gacd-modal 名前空間でページ側と衝突しない）。
 *
 * 使い方:
 *   GA_CARD_DETAIL.init({
 *     fetchCard(slug),          // openBySlug用のカード取得(省略時は公式APIをfetch)
 *     preferredArtIndex(imgs),  // 初期表示するイラスト番号(省略時は0)
 *     action: { label(card), disabled(card), onClick(card) }, // 右下のアクションボタン(省略可)
 *     onAfterOpen(card), onAfterClose(),  // ハッシュ連動などページ固有の後処理
 *   });
 *   GA_CARD_DETAIL.open(card) / openBySlug(slug) / close() / isOpen() / current()
 *
 * Escキーでの close はページ側(モーダルの重なり順を知っている側)が行うこと。
 */
window.GA_CARD_DETAIL = (() => {
  const API = "https://api.gatcg.com";
  const {
    escapeHtml, hasJapanese, renderEffect,
    tr, isTranslated, jpName, label,
    cardImages, rarityCode, speedLabel,
    FORMAT_JP, EXCLUSIVE_FORMAT_INFO, bannedFormats, exclusiveFormat, exclusiveNote,
    backFace,
  } = window.GA_CARD_I18N;
  const I18N = window.GA_I18N || { meta: {}, terms: {}, cards: {} };

  let opts = {};
  let currentCard = null;
  let root = null; // #gacd-modal

  // ---------- 効果文中のハイライト ----------

  function escapeRegExp(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // 効果文中に登場するゲーム用語（terms辞書のキーが英語効果文に含まれるもの）を抽出
  function matchedTerms(card) {
    // マークダウンの強調記号(*)を除去してから判定する。
    // API原文は "**buff** counter" のように語の一部だけを太字化するため、
    // 除去しないと "buff counter" 等の複数語キーが分断されて一致しない。
    const haystack = `${card.effect || ""}`.replace(/\*/g, "").toLowerCase();
    const found = [];
    Object.keys(I18N.terms || {}).forEach((key) => {
      // 語頭のワード境界(\b)で判定して英単語の途中でのヒットを防ぐ。
      // 語尾は境界を課さないため、複数形・活用（banished / materializes 等）は引き続き一致する。
      if (new RegExp("\\b" + escapeRegExp(key)).test(haystack)) found.push(I18N.terms[key]);
    });
    return found;
  }

  // 日本語効果テキスト（レンダリング済みHTML）内の用語語句を強調する。
  function highlightTerms(html, terms) {
    if (!terms || !terms.length) return html;
    const cores = [...new Set(
      terms.map((t) => String(t.jp || "").split("（")[0].trim()).filter((c) => c.length >= 2)
    )].sort((a, b) => b.length - a.length);
    if (!cores.length) return html;
    const re = new RegExp("(" + cores.map(escapeRegExp).join("|") + ")", "g");
    return html.replace(re, '<span class="term-hl">$1</span>');
  }

  // そのカード自身のサブタイプの和訳を強調する。
  function highlightSubtypes(html, card) {
    const map = (I18N.meta && I18N.meta.subtypes) || {};
    const cores = [...new Set(
      (card.subtypes || []).map((code) => map[code]).filter((jp) => jp && jp.length >= 2)
    )].sort((a, b) => b.length - a.length);
    if (!cores.length) return html;
    const re = new RegExp("(" + cores.map(escapeRegExp).join("|") + ")", "g");
    return html.replace(re, '<span class="subtype-hl">$1</span>');
  }

  // カード自身の名前への自己参照（「カード名」）を強調する。
  function highlightCardName(html, card) {
    const name = jpName(card).trim();
    if (name.length < 2 || !hasJapanese(name)) return html;
    const re = new RegExp(escapeRegExp(name), "g");
    return html.replace(re, '<span class="card-name-hl">$&</span>');
  }

  // 保護区間（既に挿入済みの <span class="…">…</span>）以外にだけ fn を適用する。
  function applyOutsideSpans(html, className, fn) {
    const re = new RegExp(`(<span class="${className}">.*?</span>)`, "g");
    return html.split(re).map((seg, i) => (i % 2 === 1 ? seg : fn(seg))).join("");
  }

  // 日本語効果テキスト一式（用語・サブタイプ・自己参照のハイライト込み）をHTML化
  function jpEffectHtml(face, terms) {
    const t = tr(face);
    const jpEffect = t && t.effect ? t.effect : null;
    if (jpEffect) {
      let html = renderEffect(jpEffect);
      html = highlightCardName(html, face);
      html = applyOutsideSpans(html, "card-name-hl", (seg) => highlightTerms(seg, terms));
      html = applyOutsideSpans(html, "card-name-hl", (seg) => highlightSubtypes(seg, face));
      return html;
    }
    if (!face.effect) {
      // バニラ（そもそも英語原文にも効果テキストが無い）カードは「未訳」ではない
      return '<span class="muted">（効果テキストなし）</span>';
    }
    return '<span class="muted">日本語訳はまだありません（翻訳募集中）。下の英語原文をご覧ください。</span>';
  }

  // ---------- 描画 ----------

  function metaRow(rowLabel, value) {
    if (value == null || value === "") return "";
    return `<div class="meta-row"><dt>${escapeHtml(rowLabel)}</dt><dd>${escapeHtml(value)}</dd></div>`;
  }

  function metaHtml(face) {
    const classes = (face.classes || []).map((c) => label("classes", c)).join("・");
    const elements = (face.elements || []).map((e) => label("elements", e)).join("・");
    const types = (face.types || []).map((x) => label("types", x)).join("・");
    const subtypes = (face.subtypes || []).map((x) => label("subtypes", x)).join("・");
    const cost = face.cost ? `${face.cost.value}（${face.cost.type}）` : "";
    return (
      metaRow("タイプ", types) +
      metaRow("クラス", classes) +
      metaRow("エレメント", elements) +
      metaRow("サブタイプ", subtypes) +
      metaRow("レベル", face.level) +
      metaRow("コスト", cost) +
      metaRow("パワー", face.power) +
      metaRow("ライフ", face.life) +
      metaRow("耐久", face.durability) +
      metaRow("スピード", speedLabel(face))
    );
  }

  function $(id) { return document.getElementById(id); }

  function open(card) {
    const t = tr(card);
    const imgs = cardImages(card);
    const initialAi = Math.min(Math.max(opts.preferredArtIndex ? opts.preferredArtIndex(imgs) : 0, 0), Math.max(imgs.length - 1, 0));
    const img = imgs.length ? imgs[initialAi].url : null;
    const dImg = $("d-img");
    // 空文字の src は現在ページURLに解決され警告を出すため、画像が無いときは src ごと外す
    if (img) {
      dImg.src = img;
      dImg.hidden = false;
    } else {
      dImg.removeAttribute("src");
      dImg.hidden = true;
    }
    dImg.alt = jpName(card);

    // イラスト/版の切り替えサムネイル
    const artsEl = $("d-arts");
    if (imgs.length > 1) {
      artsEl.innerHTML = imgs
        .map((im, i) => `<button class="art-thumb${i === initialAi ? " active" : ""}" type="button" data-url="${escapeHtml(im.url)}" data-back="${escapeHtml(im.back || "")}" title="${escapeHtml(im.label)}"><img loading="lazy" crossorigin="anonymous" src="${escapeHtml(im.url)}" alt=""><span>${escapeHtml(im.label)}</span></button>`)
        .join("");
      artsEl.hidden = false;
    } else {
      artsEl.innerHTML = "";
      artsEl.hidden = true;
    }

    const translated = isTranslated(card);
    const badge = $("d-badge");
    badge.textContent = translated ? "日本語訳あり" : "未翻訳";
    badge.className = "badge " + (translated ? "badge-yes" : "badge-no");

    $("d-name").textContent = jpName(card);
    $("d-name-en").textContent = card.name;

    // 使用可否の表示（特定フォーマット専用カードは禁止ではなく専用フォーマット表示にする）
    const banned = bannedFormats(card);
    const excl = exclusiveFormat(card);
    const bannedEl = $("d-banned");
    if (excl) {
      const info = EXCLUSIVE_FORMAT_INFO[excl];
      bannedEl.textContent = `${info.icon} ${info.label}${exclusiveNote(excl)}`;
      bannedEl.className = `banned-banner format-banner-${info.cls}`;
      bannedEl.hidden = false;
    } else if (banned.length) {
      bannedEl.textContent = `🚫 使用禁止：${banned.map((f) => FORMAT_JP[f] || f).join("・")}`;
      bannedEl.className = "banned-banner";
      bannedEl.hidden = false;
    } else {
      bannedEl.className = "banned-banner";
      bannedEl.hidden = true;
    }

    $("d-meta").innerHTML = metaHtml(card);

    // 効果（日本語 / 英語原文）
    const terms = matchedTerms(card);
    $("d-effect-jp").innerHTML = jpEffectHtml(card, terms);
    $("d-effect-en").innerHTML = renderEffect(card.effect, card.name);

    // フレーバー
    const flavor = (t && t.flavor) || card.flavor;
    const flavorWrap = $("d-flavor-wrap");
    if (flavor) {
      $("d-flavor").textContent = flavor;
      flavorWrap.hidden = false;
    } else {
      flavorWrap.hidden = true;
    }

    renderTerms(card, terms);
    renderEditions(card);
    renderBackFace(card);
    renderAction(card);

    currentCard = card;
    root.hidden = false;
    document.body.style.overflow = "hidden";
    if (opts.onAfterOpen) opts.onAfterOpen(card);
  }

  async function openBySlug(slug) {
    try {
      let card;
      if (opts.fetchCard) {
        card = await opts.fetchCard(slug);
      } else {
        const res = await fetch(`${API}/cards/${encodeURIComponent(slug)}`);
        card = res.ok ? await res.json() : null;
      }
      if (card) open(card);
    } catch (err) {
      console.error("カードの取得に失敗:", err);
    }
  }

  function close() {
    if (root.hidden) return;
    root.hidden = true;
    currentCard = null;
    document.body.style.overflow = "";
    if (opts.onAfterClose) opts.onAfterClose();
  }

  function renderAction(card) {
    const btn = $("d-action");
    if (!opts.action) { btn.hidden = true; return; }
    btn.hidden = false;
    btn.textContent = opts.action.label ? opts.action.label(card) : "";
    btn.disabled = opts.action.disabled ? !!opts.action.disabled(card) : false;
  }

  // 効果文中に登場するゲーム用語を検出して解説を並べる（日本語DBの付加価値）
  function renderTerms(card, terms) {
    const wrap = $("d-terms-wrap");
    const list = $("d-terms");
    const found = terms || matchedTerms(card);
    if (!found.length) {
      wrap.hidden = true;
      return;
    }
    list.innerHTML = found
      .map((term) => `<li><span class="term-jp">${escapeHtml(term.jp)}</span><span class="term-desc">${escapeHtml(term.desc)}</span></li>`)
      .join("");
    wrap.hidden = false;
  }

  function renderEditions(card) {
    const eds = card.editions || card.result_editions || [];
    const list = $("d-editions");
    if (!eds.length) {
      list.innerHTML = '<li class="muted">情報なし</li>';
      return;
    }
    list.innerHTML = eds
      .map((ed) => {
        const set = ed.set ? `${ed.set.name}（${ed.set.prefix}）` : "";
        const num = ed.collector_number ? ` #${ed.collector_number}` : "";
        const rarity = ed.rarity != null ? ` ・${rarityCode(ed.rarity)}` : "";
        const illus = ed.illustrator ? ` ・絵：${ed.illustrator}` : "";
        return `<li>${escapeHtml(set + num + rarity + illus)}</li>`;
      })
      .join("");
  }

  // 両面カードの裏面を詳細モーダル下部にスタック表示（表面と同じ体裁）。
  function renderBackFace(card) {
    const wrap = $("d-back-wrap");
    const box = $("d-back");
    const back = backFace(card);
    if (!back) { wrap.hidden = true; box.innerHTML = ""; return; }

    const translated = isTranslated(back);
    const terms = matchedTerms(back);
    const imgHtml = back.image
      ? `<img id="d-back-img" crossorigin="anonymous" src="${escapeHtml(back.image)}" alt="${escapeHtml(jpName(back))}">`
      : `<div class="noimg">画像なし</div>`;

    box.innerHTML = `
      <div class="detail back-detail">
        <div class="detail-image">${imgHtml}</div>
        <div class="detail-info">
          <span class="badge ${translated ? "badge-yes" : "badge-no"}">${translated ? "日本語訳あり" : "未翻訳"}</span>
          <h2>${escapeHtml(jpName(back))}</h2>
          <p class="name-en">${escapeHtml(back.name || "")}</p>
          <dl class="meta">${metaHtml(back)}</dl>
          <section class="effect-block">
            <h3>効果（日本語訳）</h3>
            <div class="effect">${jpEffectHtml(back, terms)}</div>
            <details class="orig">
              <summary>英語原文を表示</summary>
              <div class="effect effect-en">${renderEffect(back.effect, back.name)}</div>
            </details>
          </section>
        </div>
      </div>`;
    wrap.hidden = false;
  }

  // ---------- 初期化（DOM注入と配線） ----------

  const MODAL_HTML = `
  <div class="gacd-backdrop" data-close></div>
  <div class="gacd-body" role="dialog" aria-modal="true" aria-labelledby="d-name">
    <button class="gacd-close" type="button" data-close aria-label="閉じる">×</button>
    <div class="detail">
      <div class="detail-image">
        <img id="d-img" crossorigin="anonymous" alt="">
        <div id="d-arts" class="arts" hidden></div>
      </div>
      <div class="detail-info">
        <span id="d-badge" class="badge"></span>
        <h2 id="d-name"></h2>
        <p id="d-name-en" class="name-en"></p>
        <p id="d-banned" class="banned-banner" hidden></p>
        <dl id="d-meta" class="meta"></dl>

        <section class="effect-block">
          <h3>効果（日本語訳）</h3>
          <div id="d-effect-jp" class="effect"></div>
          <details class="orig">
            <summary>英語原文を表示</summary>
            <div id="d-effect-en" class="effect effect-en"></div>
          </details>
        </section>

        <section id="d-flavor-wrap" class="flavor-block" hidden>
          <div id="d-flavor" class="flavor"></div>
        </section>

        <section id="d-terms-wrap" class="terms-block" hidden>
          <h3>この効果に出てくる用語</h3>
          <ul id="d-terms"></ul>
        </section>

        <section class="editions-block">
          <h3>収録</h3>
          <ul id="d-editions"></ul>
        </section>

        <div class="detail-actions">
          <button id="d-action" class="add-print" type="button" hidden></button>
        </div>
      </div>
    </div>

    <!-- 両面カードの裏面（flip）。裏面がある時だけ表示 -->
    <section id="d-back-wrap" class="back-block" hidden>
      <h3 class="back-title">🔄 裏面</h3>
      <div id="d-back"></div>
    </section>
  </div>`;

  function init(options = {}) {
    opts = options;
    if (root) return; // 二重初期化を防ぐ

    root = document.createElement("div");
    root.className = "gacd-modal";
    root.id = "gacd-modal";
    root.hidden = true;
    root.innerHTML = MODAL_HTML;
    document.body.appendChild(root);

    root.querySelectorAll("[data-close]").forEach((n) => n.addEventListener("click", close));

    // イラスト/版サムネイルの切り替え
    $("d-arts").addEventListener("click", (e) => {
      const btn = e.target.closest(".art-thumb");
      if (!btn) return;
      $("d-img").src = btn.dataset.url;
      // 両面カード：裏面画像も選択した版に追従させる
      const backImg = $("d-back-img");
      if (backImg && btn.dataset.back) backImg.src = btn.dataset.back;
      $("d-arts").querySelectorAll(".art-thumb").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });

    $("d-action").addEventListener("click", () => {
      if (currentCard && opts.action && opts.action.onClick) opts.action.onClick(currentCard);
    });
  }

  return {
    init, open, openBySlug, close,
    isOpen: () => !!root && !root.hidden,
    current: () => currentCard,
  };
})();
