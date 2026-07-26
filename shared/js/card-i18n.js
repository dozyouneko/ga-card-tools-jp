"use strict";
/*
 * カードの日本語訳・画像URL・フォーマット判定などの共通ヘルパー。
 * トップページ(app.js)とデッキ構築ツールの両方から使う。
 * data/translations.js(window.GA_I18N)より後、利用側スクリプトより前に読み込むこと。
 */
window.GA_CARD_I18N = (() => {
  const IMG_BASE = "https://api.gatcg.com";
  const I18N = window.GA_I18N || { meta: {}, terms: {}, cards: {} };

  // ---------- 汎用 ----------

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function hasJapanese(s) {
    return /[぀-ヿ㐀-鿿ｦ-ﾝ]/.test(s || "");
  }

  // 効果テキストの簡易マークダウン（**太字** / *斜体* / 改行）を安全にHTML化
  // name を渡すと、API 原文中のプレースホルダ CARDNAME を実カード名に置換する。
  function renderEffect(text, name) {
    if (!text) return '<span class="muted">（効果テキストなし）</span>';
    const raw = name ? String(text).split("CARDNAME").join(name) : text;
    let html = escapeHtml(raw);
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    html = html.replace(/\n/g, "<br>");
    return html;
  }

  // ---------- 翻訳 ----------

  function tr(card) {
    return (I18N.cards && I18N.cards[card.slug]) || null;
  }

  // 訳データのエントリが存在するか。
  // data/tl-names.json / tl-effects.json には「name か effect か flavor のどれかが埋まっている
  // slug だけ」を出力しているため、エントリの存在＝訳が存在する（#22 フェーズ2・変更3）。
  // ⚠️ 効果を遅延読み込みするようになったので「name か effect が埋まっているか」では
  // 判定できない（名前が空欄で効果だけ訳されたカードが未翻訳と誤表示される）。
  function isTranslated(card) {
    return !!tr(card);
  }

  function jpName(card) {
    const t = tr(card);
    return t && t.name ? t.name : card.name;
  }

  // 「英語（和訳）」形式で表示。和訳が無ければ英語のみ。 例: FIRE（火）
  function label(kind, value) {
    const map = (I18N.meta && I18N.meta[kind]) || {};
    return map[value] ? `${value}（${map[value]}）` : value;
  }

  // ---------- 訳データの読み込み（#22 フェーズ2）----------
  // data/tl/*.js（38本・gzip 257 KB）を <script> で読むのをやめ、生成物の JSON を fetch する。
  //   名前   … グリッド描画に要るので初期表示前に1回だけ読む
  //   効果   … 描画には1文字も使わないので「詳細ダイアログ」「効果欄の日本語検索」のときだけ読む
  // どちらも Promise をメモ化して2回目以降は再取得しない（card-cache.js の mem と同じ方式）。
  // 取得失敗は null に倒す＝fail-open（英語名・英語効果で動き続ける。エラー表示はしない）。
  // URL は呼び出し側から渡す（ページによって相対パスが違うため。#27 の metaIndexUrl と同じ方式）。
  let namesPromise = null;
  let effectsPromise = null;
  // 名前データの取得状態。"none"=loadNames を使っていないページ / "ok"=取得成功 / "failed"=取得失敗。
  // 「取得に失敗したと分かっているとき」だけ false を返す（変更6）
  let namesState = "none";

  function fetchJson(url) {
    return fetch(url).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  }

  function entry(slug) {
    I18N.cards = I18N.cards || {};
    return (I18N.cards[slug] = I18N.cards[slug] || {});
  }

  // { slug: 名前 } を I18N.cards[slug].name へ流し込む
  function loadNames(url) {
    if (namesPromise) return namesPromise;
    if (!url) { namesPromise = Promise.resolve(null); return namesPromise; }
    namesPromise = fetchJson(url).then((map) => {
      if (!map || typeof map !== "object") { namesState = "failed"; return null; }
      for (const slug in map) entry(slug).name = map[slug];
      namesState = "ok";
      return map;
    });
    return namesPromise;
  }

  // 訳データ（名前）が使える状態か。false のときは isTranslated() が
  // 「エントリが無い＝未訳」と「まだ／もう読めていない」を区別できないため、
  // 呼び出し側は「未翻訳」バッジを出してはいけない（変更6・#22）。
  // ⚠️ loadNames() を使っていないページ（訳を別経路で持つページ）では true を返す。
  // 「取得に失敗したと分かっているとき」だけ false になる
  function translationsReady() {
    return namesState !== "failed";
  }

  // { e: { slug: 効果 }, f: { slug: フレーバー } } を I18N.cards[slug] へ流し込む。
  // フレーバーも詳細ダイアログでしか使わないので効果と同じ便に載せてある。
  function loadEffects(url) {
    if (effectsPromise) return effectsPromise;
    if (!url) { effectsPromise = Promise.resolve(null); return effectsPromise; }
    effectsPromise = fetchJson(url).then((json) => {
      if (!json || typeof json !== "object") return null;
      const e = json.e || {};
      const f = json.f || {};
      for (const slug in e) entry(slug).effect = e[slug];
      for (const slug in f) entry(slug).flavor = f[slug];
      return json;
    });
    return effectsPromise;
  }

  // ---------- 画像・収録 ----------

  function firstEdition(card) {
    const eds = card.editions || card.result_editions || [];
    return eds[0] || null;
  }

  function imageUrl(card) {
    const ed = firstEdition(card);
    return ed && ed.image ? IMG_BASE + ed.image : null;
  }

  // カードの全イラスト/版を {url, prefix, label, back} で返す（画像URLで重複排除）。
  // back は両面カードで、その版に対応する裏面画像URL（無ければ null）。
  function cardImages(card) {
    const eds = card.editions || card.result_editions || [];
    const seen = new Set();
    const out = [];
    eds.forEach((ed) => {
      if (!ed.image || seen.has(ed.image)) return;
      seen.add(ed.image);
      const set = ed.set && ed.set.prefix ? ed.set.prefix : "";
      const num = ed.collector_number ? ` #${ed.collector_number}` : "";
      const bo = ed.other_orientations && ed.other_orientations[0];
      const backUrl = bo && bo.edition && bo.edition.image ? IMG_BASE + bo.edition.image : null;
      out.push({ url: IMG_BASE + ed.image, prefix: set || "?", label: (set + num).trim() || "版", back: backUrl });
    });
    return out;
  }

  // レアリティ番号 → 略号（gatcg 準拠）。C/UC/R/SR/UR/PR/CSR/CUR/CPR
  const RARITY_CODE = { 1: "C", 2: "U", 3: "R", 4: "SR", 5: "UR", 6: "PR", 7: "CSR", 8: "CUR", 9: "CPR" };
  function rarityCode(r) {
    if (r == null) return "";
    return RARITY_CODE[r] || `R${r}`; // 未知の番号は R+数値でフォールバック
  }

  // スピード: API は boolean（true=Fast / false=Slow）
  function speedLabel(card) {
    if (card.speed === true) return "Fast";
    if (card.speed === false) return "Slow";
    return "";
  }

  // ---------- フォーマット（禁止・専用） ----------

  const ALL_FORMATS = ["STANDARD", "DRAFT", "PANTHEON"];
  const FORMAT_JP = { STANDARD: "スタンダード", PANTHEON: "パンテオン", DRAFT: "ドラフト" };
  const FORMAT_SHORT = { STANDARD: "スタン", PANTHEON: "パンテオン", DRAFT: "ドラフト" };

  // 使用禁止（limit 0）になっているフォーマット一覧
  function bannedFormats(card) {
    const leg = card.legality || {};
    return ALL_FORMATS.filter((f) => leg[f] && leg[f].limit === 0);
  }
  // まだ使用できる（禁止されていない）フォーマット一覧
  function legalFormats(card) {
    const banned = bannedFormats(card);
    return ALL_FORMATS.filter((f) => !banned.includes(f));
  }
  // 残り1フォーマットでしか使用できない場合、そのフォーマット名を返す。該当しなければ null。
  function exclusiveFormat(card) {
    const legal = legalFormats(card);
    return legal.length === 1 ? legal[0] : null;
  }

  // 専用フォーマットのアイコン・クラス名・説明文（検索結果バッジ／詳細モーダルの両方で使う）
  const EXCLUSIVE_FORMAT_INFO = {
    PANTHEON: { icon: "🏛", cls: "pantheon", label: "Pantheon専用" },
    DRAFT:    { icon: "🎴", cls: "draft", label: "ドラフト専用" },
    STANDARD: { icon: "⭐", cls: "standard", label: "スタンダード専用" },
  };
  function exclusiveNote(format) {
    const others = ALL_FORMATS.filter((f) => f !== format).map((f) => FORMAT_JP[f]).join("・");
    return `（${others}では使用不可）`;
  }

  // 検索結果カードに表示するフォーマットバッジ（専用／禁止のどちらか。無ければ空文字）
  function formatBadgeHtml(card) {
    const excl = exclusiveFormat(card);
    if (excl) {
      const info = EXCLUSIVE_FORMAT_INFO[excl];
      return `<span class="format-badge format-${info.cls}" title="${info.label}${exclusiveNote(excl)}">${info.icon} ${info.label}</span>`;
    }
    const banned = bannedFormats(card);
    if (banned.length) {
      const short = banned.map((f) => FORMAT_SHORT[f]).join("・");
      const full = banned.map((f) => FORMAT_JP[f]).join("・");
      return `<span class="format-badge format-banned" title="${full}で使用禁止">🚫 ${short}禁止</span>`;
    }
    return "";
  }

  // ---------- 両面（flip）カード ----------
  // 公式APIは常に「表面」のカードを返し、裏面は edition.other_orientations[0] に格納する。
  // 画像は other_orientations[0].edition.image、裏面は独自の slug/name/effect を持つ。

  // flip 構成（表面）を持つ edition を返す。無ければ null。
  function flipEdition(card) {
    const eds = card.editions || card.result_editions || [];
    return eds.find((ed) => ed.configuration === "flip" && ed.other_orientations && ed.other_orientations.length) || null;
  }

  // 裏面を card 形状に正規化して返す（tr/jpName 等をそのまま流用可能にする）。
  function backFace(card) {
    const ed = flipEdition(card);
    const b = ed && ed.other_orientations[0];
    if (!b) return null;
    const bed = b.edition || {};
    return {
      slug: b.slug,
      name: b.name,
      effect: b.effect,
      classes: b.classes || [],
      elements: b.elements || [],
      types: b.types || [],
      subtypes: b.subtypes || [],
      cost: b.cost,
      level: b.level,
      power: b.power,
      life: b.life,
      durability: b.durability,
      speed: b.speed,
      flavor: b.flavor || bed.flavor || null,
      image: bed.image ? IMG_BASE + bed.image : null,
    };
  }

  return {
    escapeHtml, hasJapanese, renderEffect,
    tr, isTranslated, jpName, label, loadNames, loadEffects, translationsReady,
    firstEdition, imageUrl, cardImages, rarityCode, speedLabel,
    ALL_FORMATS, FORMAT_JP, FORMAT_SHORT, EXCLUSIVE_FORMAT_INFO,
    bannedFormats, legalFormats, exclusiveFormat, exclusiveNote, formatBadgeHtml,
    flipEdition, backFace,
  };
})();
