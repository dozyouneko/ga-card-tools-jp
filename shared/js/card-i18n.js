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

  // ---------- シーズン禁止（Seasonal Banlist・#34）----------
  // 公式APIは季節禁止を持たない（legality は恒久禁止だけ・/formats や /banlist は404）ため、
  // data/seasonal-banlist.json を自前で持ち、ここ1箇所で判定する（ブラウザ5面＋ビルドが共用）。
  // ⚠️ 恒久禁止（bannedFormats）とは公式が明言する「別のリスト」。混ぜない・合算しない。
  // データが無い／読めないときは全カードで null を返す＝表示も判定も消える（fail-open＝ロールバック手段）。

  let seasonal = { seasons: [] };

  // 「今日」をJSTの暦日（YYYY-MM-DD）で得る。以降は文字列の辞書順比較だけで判定し、
  // Date のパースを挟まない。new Date() はブラウザのローカルTZ・CIはUTCで動くため、
  // 素直に日付計算すると環境で境界がずれる（日次cronは 03:00 JST ＝ 前日 18:00 UTC）。
  function todayJst() {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(new Date());
  }

  // 境界日の切り替わりを確認するためのテスト用シーム（検証2・5）。null で解除＝本番の挙動に戻る。
  let todayOverride = null;
  function setTodayForTest(ymd) { todayOverride = ymd || null; }
  function today() { return todayOverride || todayJst(); }

  // 読み込んだJSONを保持する。不正・欠損は空リストに倒す
  function setSeasonalBanlist(data) {
    seasonal = data && Array.isArray(data.seasons) ? { seasons: data.seasons } : { seasons: [] };
    return seasonal;
  }

  // ブラウザ用。Promise をメモ化して再利用する（loadNames / metaIndex と同じ方式）。
  // ⚠️ 呼び出し側は検索結果を描画する前にこの Promise を await すること（バッジの出し漏れ防止）。
  let seasonalPromise = null;
  function loadSeasonalBanlist(url) {
    if (seasonalPromise) return seasonalPromise;
    seasonalPromise = (url ? fetchJson(url) : Promise.resolve(null)).then((json) => setSeasonalBanlist(json));
    return seasonalPromise;
  }

  // カードの季節禁止の状態。該当なし・失効済みは null（＝どこにも表示しない）。
  //   announced … today < effectiveFrom（予告。まだ使える）
  //   active    … effectiveFrom <= today かつ（effectiveTo が null または today <= effectiveTo）
  // effectiveTo: null は「終了日未定＝まだ有効」の意味（次シーズン告知時に埋める運用）。
  function seasonalBanState(card, todayYmd) {
    const slug = card && card.slug;
    if (!slug) return null;
    const d = todayYmd || today();
    for (const s of seasonal.seasons) {
      if (!s || !s.effectiveFrom || !Array.isArray(s.slugs) || !s.slugs.includes(slug)) continue;
      if (s.effectiveTo && d > s.effectiveTo) continue; // シーズン終了で自動失効（過去シーズンは残しておいてよい）
      return { state: d < s.effectiveFrom ? "announced" : "active", season: s };
    }
    return null;
  }

  // ---- 文言（5面で同じ表現を使う）----
  const SEASONAL_ICON = { announced: "⏳", active: "⛔" };
  const seasonalIcon = (info) => SEASONAL_ICON[info.state];
  const seasonalName = (season) => season.nameJp || season.name || season.id || "";
  const seasonalFormatJp = (season) => FORMAT_JP[season.format] || season.format || "";
  // "2026-08-21" → "8/21"（バッジは幅が限られるため月日だけにする。正確な日付は title に入る）
  function monthDay(ymd) {
    const p = String(ymd).split("-");
    return p.length === 3 ? `${Number(p[1])}/${Number(p[2])}` : String(ymd);
  }

  // バッジ本文（アイコン込み）
  function seasonalText(info) {
    return info.state === "announced"
      ? `${SEASONAL_ICON.announced} ${monthDay(info.season.effectiveFrom)}〜禁止`
      : `${SEASONAL_ICON.active} シーズン禁止`;
  }
  // ツールチップ（バッジ・デッキ構築のタイルアイコン）
  function seasonalTitle(info) {
    const s = info.season;
    return info.state === "announced"
      ? `${s.effectiveFrom}から${seasonalName(s)}のシーズン禁止カードになります（${seasonalFormatJp(s)}）`
      : `${seasonalName(s)}のシーズン禁止カード（${seasonalFormatJp(s)}・${s.effectiveFrom}〜）。恒久的な禁止とは別のリストです`;
  }
  // 1行バナー（詳細モーダル・カード個別ページ）
  function seasonalBannerText(info) {
    const s = info.season;
    return info.state === "announced"
      ? `${SEASONAL_ICON.announced} ${s.effectiveFrom}から${seasonalName(s)}のシーズン禁止カードになります（${seasonalFormatJp(s)}）。恒久的な禁止とは別のリストです`
      : `${SEASONAL_ICON.active} ${seasonalName(s)}のシーズン禁止カード（${seasonalFormatJp(s)}・${s.effectiveFrom}〜）。恒久的な禁止とは別のリストです`;
  }

  // 検索結果カードの季節禁止バッジ。該当なしは空文字。
  // ⚠️ 恒久禁止の 🚫（.badges-bl＝左下）とは位置も色も分ける。別概念であることを見た目で伝えるため。
  function seasonalBadgeHtml(card, todayYmd) {
    const info = seasonalBanState(card, todayYmd);
    if (!info) return "";
    return `<span class="season-badge season-${info.state}" title="${escapeHtml(seasonalTitle(info))}">${escapeHtml(seasonalText(info))}</span>`;
  }

  // ---------- フレーバーテキスト ----------
  // フレーバーの空判定。⚠ 空白1文字(" ")を持つカードが実在する（virgil-altered-future /
  // zinn-volnia-abbess）。truthy なので || では弾けず、空の枠だけが描画される。
  function flavorPick(v) {
    return (typeof v === "string" && v.trim()) ? v.trim() : "";
  }

  // フレーバーテキストの取り出し。⚠ 消費側（静的カードページ・詳細モーダル・backFace）は
  // すべてこの1関数に寄せること（同じ選択規則を複数箇所に書くと必ず食い違う）。
  // ⚠ 置き場が2つある: トップレベル card.flavor と版ごとの editions[].flavor。
  //    後者しか持たないカードが586枚あり、うち474枚は「原文があるのに画面のどこにも出ない」状態だった。
  // ⚠ 版によって文面が違うカードが110枚ある。editions の配列順は公式API側で入れ替わるため、
  //    配列順で拾うと出力が非決定的になり、cronが毎日ノイズコミットを作る。→ 初出の版に固定する。
  // @returns {string} 見つからなければ ""（null/undefined/" " を返さない）
  function flavorOf(card, t) {
    const jp = flavorPick(t && t.flavor);
    if (jp) return jp;                                  // 日本語訳が最優先（既存の優先順を変えない）
    const own = flavorPick(card && card.flavor);
    if (own) return own;
    const eds = ((card && card.editions) || []).filter((e) => e && flavorPick(e.flavor));
    if (!eds.length) return "";
    // 初出（set.release_date の昇順）。⚠ 1970-01-01 は API 未設定を意味するので「不明」として末尾へ。
    // 同着は edition.slug の昇順で決める（slug は版ごとに一意なので必ず決着する）。
    const key = (e) => {
      const d = (e.set && e.set.release_date) || "";
      return (!d || d.startsWith("1970")) ? "9999" : d;
    };
    eds.sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1
      : String(a.slug) < String(b.slug) ? -1 : 1));
    return flavorPick(eds[0].flavor);
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
      flavor: flavorOf(b, null) || flavorPick(bed.flavor) || null,
      image: bed.image ? IMG_BASE + bed.image : null,
    };
  }

  return {
    escapeHtml, hasJapanese, renderEffect,
    tr, isTranslated, jpName, label, loadNames, loadEffects, translationsReady,
    firstEdition, imageUrl, cardImages, rarityCode, speedLabel,
    ALL_FORMATS, FORMAT_JP, FORMAT_SHORT, EXCLUSIVE_FORMAT_INFO,
    bannedFormats, legalFormats, exclusiveFormat, exclusiveNote, formatBadgeHtml,
    todayJst, setTodayForTest, setSeasonalBanlist, loadSeasonalBanlist, seasonalBanState,
    seasonalIcon, seasonalName, seasonalText, seasonalTitle, seasonalBannerText, seasonalBadgeHtml,
    flipEdition, backFace, flavorOf,
  };
})();
