"use strict";
/*
 * デッキ構築ツール — フロントエンドロジック
 * バックエンド(/api/decks 等)にデッキを保存し、カード情報は公式API(api.gatcg.com)から取得する。
 * 画面はハッシュでルーティングする:
 *   (なし)      … ログイン済みなら自分のデッキ一覧、未ログインならログイン案内
 *   #edit/<id> … デッキ編集(所有者のみ)
 *   #deck/<id> … 共有リンク閲覧(ログイン不要)
 */

const API = "https://api.gatcg.com";
const I18N = window.GA_I18N || { meta: {}, terms: {}, cards: {} };
const {
  jpName, imageUrl, backFace, cardImages, label,
  escapeHtml, hasJapanese,
  FORMAT_JP, EXCLUSIVE_FORMAT_INFO, bannedFormats, exclusiveFormat, exclusiveNote,
  seasonalBanState, seasonalIcon, seasonalTitle, seasonalName,
  // 検索結果の左下バッジ(#35)。トップページと同じ共通関数をそのまま使う(こちらで判定を書かない)
  formatBadgeHtml, seasonalBadgeHtml,
} = window.GA_CARD_I18N;

// 訳データ(#22 フェーズ2)。トップページと同じく data/tl/*.js の <script> をやめてJSONを読む。
// 名前はデッキ一覧・ゾーンのカード名に要るので init() で待つ。効果は詳細ダイアログ／
// 日本語効果検索のときだけ取得する。相対パスがトップページと違うので ../../ を付ける
const TL_NAMES_URL = "../../data/tl-names.json";
const TL_EFFECTS_URL = "../../data/tl-effects.json";
const namesReady = window.GA_CARD_I18N.loadNames(TL_NAMES_URL);

// シーズン禁止(#34)。公式APIに無い情報なので自前JSONを読む。タイルのアイコンとフォーマット
// 適合判定の両方が要るため init() で待つ(取得失敗は空リストに倒れる＝既存挙動のまま)
const SEASONAL_URL = "../../data/seasonal-banlist.json";
const seasonalReady = window.GA_CARD_I18N.loadSeasonalBanlist(SEASONAL_URL);

const ZONES = ["material", "main", "side", "pantheon", "maybe"];
const ZONE_LABEL = { material: "マテリアルデッキ", main: "メインデッキ", side: "サイドボード", pantheon: "パンテオン", maybe: "検討中" };
const ZONE_SHORT = { material: "マテリアル", main: "メイン", side: "サイド", pantheon: "パンテオン", maybe: "検討中" };
// ⚠️ メインは「最低60枚・上限なし」(公式総合ルール v1.1.1)なので MAIN_MIN。
// 61枚以上は正当な構築で、超過(.over)にはしない(#58)
const MAIN_MIN = 60, MATERIAL_MAX = 12, SIDE_MAX_PT = 15, SIDE_MAX_CARDS = 15;

// ---------- 構築フォーマット(#4) ----------
// decks.format は 'STANDARD' | 'PANTHEON' の2値。未知の値・未指定は STANDARD に倒す
// (マイグレーション前に作られたデッキ・古いAPI応答でも壊れない=fail-open)。
const FORMAT_INFO = {
  STANDARD: { badge: "⭐ スタンダード", jp: "スタンダード", cls: "badge-fmt" },
  PANTHEON: { badge: "🏛 パンテオン", jp: "パンテオン", cls: "badge-fmt is-pantheon" },
};
function normalizeFormat(v) { return v === "PANTHEON" ? "PANTHEON" : "STANDARD"; }
// 表示・集計に使うゾーン。「検討中」は常にアクティブ(メモ用なのでフォーマットに依らない)
function activeZones(format) {
  return normalizeFormat(format) === "PANTHEON"
    ? ["material", "main", "pantheon", "maybe"]
    : ["material", "main", "side", "maybe"];
}
// 現在開いているデッキのフォーマット
function deckFormat() { return normalizeFormat(deckData && deckData.deck && deckData.deck.format); }

const $ = (id) => document.getElementById(id);
const el = {
  bootStatus: $("boot-status"),
  authArea: $("auth-area"),
  viewLogin: $("view-login"),
  viewDecks: $("view-decks"),
  viewEditor: $("view-editor"),
  viewDeck: $("view-deck"),
  deckSort: $("deck-sort"),
  deckFilter: $("deck-filter"),
  deckList: $("deck-list"),
  edTitle: $("ed-title"),
  edRename: $("ed-rename"),
  edPub: $("ed-pub"),
  edFormat: $("ed-format"),
  deckWarn: $("deck-warn"),
  vDeckWarn: $("v-deck-warn"),
  vFormat: $("v-format"),
  newDeckModal: $("new-deck-modal"),
  newDeckName: $("new-deck-name"),
  newDeckError: $("new-deck-error"),
  newDeckCreate: $("new-deck-create"),
  omniPantheonNote: $("omni-pantheon-note"),
  edSave: $("ed-save"),
  edCopyText: $("ed-copy-text"),
  edCopyLink: $("ed-copy-link"),
  edMemo: $("ed-memo"),
  memoStatus: $("memo-status"),
  sName: $("s-name"),
  sText: $("s-text"),
  // 複数選択(AND/OR)の絞り込みグループ。<select> ではなく fillChips() が構築する <details>(#31)
  sGClass: $("s-g-class"),
  sGElement: $("s-g-element"),
  sGType: $("s-g-type"),
  sGSubtype: $("s-g-subtype"),
  sGRarity: $("s-g-rarity"),
  sFormat: $("s-format"),
  sSet: $("s-set"),
  sSort: $("s-sort"),
  sOrder: $("s-order"),
  sReset: $("s-reset"),
  sSearch: $("s-search"),
  searchTop: $("search-top"),
  sToggle: $("s-toggle"),
  sToggleLabel: $("s-toggle-label"),
  sFilterBadge: $("s-filter-badge"),
  sSelectedFilters: $("s-selected-filters"),
  sSelectedFiltersList: $("s-selected-filters-list"),
  // 検索結果のタブ帯（検索結果のタブ化_設計 §4-1）。中身は renderSearchTabs() が作る
  edTabsSep: $("ed-tabs-sep"),
  edTabsScroll: $("ed-tabs-scroll"),
  // 検索結果パネル（設計 §8-4・T4）。⭐ 旧 #result-modal を撤去し、#view-editor の右列の
  //    タブ面（role="tabpanel"）にした。⚠️ 表示・非表示は syncSearchTabSelection() が1か所で決める。
  resultPane: $("ed-pane-search"),
  // そのタブの検索条件の箱（設計 §6・T3）。中身は renderCondBox() が作る
  resultCond: $("result-cond"),
  resultCondTitle: $("result-cond-title"),
  resultCondList: $("result-cond-list"),
  resultCondMore: $("result-cond-more"),
  resultCount: $("result-count"),
  resultGrid: $("result-grid"),
  resultMore: $("result-more"),
  omniModal: $("omni-modal"),
  omniText: $("omni-text"),
  edImage: $("ed-image"),
  vImage: $("v-image"),
  imageModal: $("image-modal"),
  imageStatus: $("image-status"),
  imagePreviewWrap: $("image-preview-wrap"),
  imagePreview: $("image-preview"),
  imageSave: $("image-save"),
  imageShare: $("image-share"),
  importBtn: $("deck-import-btn"),
  importModal: $("import-modal"),
  importText: $("import-text"),
  importResult: $("import-result"),
  importRun: $("import-run"),
  artModal: $("art-modal"),
  artTitle: $("art-title"),
  artNote: $("art-note"),
  artGrid: $("art-grid"),
  tileMenu: $("tile-menu"),
  toast: $("toast"),
  vTitle: $("v-title"),
  vPub: $("v-pub"),
  vEdit: $("v-edit"),
  vCopyDeck: $("v-copy-deck"),
  vOwner: $("v-owner"),
  vZones: $("v-zones"),
  vCta: $("v-cta"),
  edPaneStats: $("ed-pane-stats"),
  vPaneStats: $("v-pane-stats"),
};

// ---------- 状態 ----------
let me = null;        // ログイン中ユーザー({id, display_name, avatar_url}) or null
let myDecks = [];     // 自分のデッキ一覧
let deckData = null;  // 編集/閲覧中のデッキ {deck, cards, owner, is_owner}
let deckSeq = 0;      // 画面遷移の競合防止
const cardCache = new Map(); // slug -> Promise<card|null>
let editorTabs = null; // 編集画面のデッキ/統計タブ制御(setupTabsで初期化)
let viewTabs = null;   // 共有画面のデッキ/統計タブ制御

// ---------- ユーティリティ ----------

// バックエンドAPI呼び出し(JSON)。エラー時は {status, code} 付きの Error を投げる
async function api(path, opts = {}) {
  const init = { method: opts.method || "GET" };
  if (opts.body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(opts.body);
  }
  const res = await fetch(path, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.code = data.error;
    throw err;
  }
  return data;
}

// 公式APIからカード1枚を取得。共有キャッシュ(メモリ+localStorage、shared/js/card-cache.js)経由。
// cardCache には検索結果のカードも直接注入されるため、このページ用のメモリ層として残している
function getCard(slug) {
  if (!cardCache.has(slug)) {
    cardCache.set(slug, window.GA_CARD_CACHE.getCard(slug));
  }
  return cardCache.get(slug);
}

// チャンピオン/レガリア(=マテリアルデッキ専用)か。ゾーン制限とポイント計算に使う
function isMaterialCard(card) {
  const t = (card && card.types) || [];
  return t.includes("CHAMPION") || t.includes("REGALIA");
}
function sidePoints(card) { return isMaterialCard(card) ? 3 : 1; }

// Boon(パンテオン専用の恩恵カード。types が GREATER BOON / LESSER BOON)か。
// パンテオンゾーン専用で、メイン/マテリアルには入れられない(#4)
function boonKind(card) {
  const t = (card && card.types) || [];
  if (t.includes("LESSER BOON")) return "lesser";
  if (t.includes("GREATER BOON")) return "greater";
  return null;
}
function isBoonCard(card) { return boonKind(card) !== null; }

// マテリアルデッキに最低1枚必要な Lv0チャンピオン(#59。両フォーマット共通の要件)。
// ⚠️ level は厳密等価で比較する(level:null のカードが実在するため。lu-bu-indomitable-titan)。
// Number(card.level) === 0 や !card.level は null を 0 と誤判定する
function isLevelZeroChampion(card) {
  const t = (card && card.types) || [];
  return t.includes("CHAMPION") && card.level === 0;
}

// デッキ行のイラスト。art_image(版指定)があればそれを、なければカードのデフォルト(先頭の版)を使う
function rowImageUrl(row, card) {
  if (row.art_image) return API + row.art_image;
  return card ? imageUrl(card) : null;
}

// カードを入れられないゾーンか(マテリアル系はメイン不可、メイン系はマテリアル不可。サイド/検討中は両方可)。
// Boonはパンテオンゾーン専用で、逆にパンテオンゾーンにはBoon以外を入れられない(#4)
function zoneDisallowed(card, zone) {
  if (!card) return false;
  if (zone === "pantheon") return !isBoonCard(card);
  if (zone === "material") return isBoonCard(card) || !isMaterialCard(card);
  if (zone === "main") return isBoonCard(card) || isMaterialCard(card);
  return false;
}

// ---------- フォーマット(禁止/専用)表示 ----------
// 判定ロジック(bannedFormats/exclusiveFormat等)は shared/js/card-i18n.js に共通化済み。

// ゾーン／閲覧タイル(124px)の左下に載せる小さなアイコン({icon, title})。該当なしは null。
// ⚠️ タイルはカード名の欄が無く狭いためアイコンのまま。検索結果は #35 でテキストバッジ
// (.badges-bl) に移したので、ここを通らない
function formatIconInfo(card) {
  const excl = exclusiveFormat(card);
  if (excl) {
    const info = EXCLUSIVE_FORMAT_INFO[excl];
    return { icon: info.icon, title: info.label + exclusiveNote(excl) };
  }
  const banned = bannedFormats(card);
  if (banned.length) {
    return { icon: "🚫", title: `${banned.map((f) => FORMAT_JP[f]).join("・")}で使用禁止` };
  }
  // シーズン禁止(#34)。タイルのアイコン枠は1つしかないため、恒久禁止・専用フォーマットが
  // あるときはそちら(より強い制限)を優先し、無いときだけ ⏳/⛔ を出す
  const season = seasonalBanState(card);
  if (season) {
    return { icon: seasonalIcon(season), title: seasonalTitle(season) };
  }
  return null;
}
function formatIconHtml(card) {
  const info = formatIconInfo(card);
  return info ? `<span class="fmt-icon" title="${escapeHtml(info.title)}">${info.icon}</span>` : "";
}

// "2026-07-08 01:23:45"(UTC) → 「3時間前」等
function relativeTime(s) {
  if (!s) return "";
  const t = new Date(s.replace(" ", "T") + "Z").getTime();
  if (Number.isNaN(t)) return s;
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "たった今";
  if (min < 60) return `${min}分前`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}時間前`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}日前`;
  return s.slice(0, 10);
}

let toastTimer;
// action: {label, fn} を渡すとトースト内にボタンを出す(「元に戻す」等)
function showToast(msg, isError, action) {
  el.toast.textContent = msg;
  if (action) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = action.label;
    btn.addEventListener("click", () => {
      el.toast.classList.remove("show");
      action.fn();
    });
    el.toast.appendChild(btn);
  }
  el.toast.classList.toggle("error", !!isError);
  el.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove("show"), action ? 6000 : 2400);
}

async function copyText(text, doneMsg) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(doneMsg);
  } catch {
    showToast("コピーに失敗しました(ブラウザの権限をご確認ください)", true);
  }
}

function loginUrl() {
  const ret = location.pathname + location.hash;
  return `/api/auth/discord/authorize?return=${encodeURIComponent(ret)}`;
}

function deckShareUrl(id) {
  return `${location.origin}${location.pathname}#deck/${id}`;
}

// ---------- ダイアログ共通 ----------

function openModal(modal) {
  modal.hidden = false;
  document.body.style.overflow = "hidden";
}
function closeModal(modal) {
  modal.hidden = true;
  // 他のモーダル(共通のカード詳細含む)が開いたままならスクロールは固定のまま
  // ⚠️ ⭐ 検索結果はモーダルではなくなった（設計 §8-4）。ここに el.resultPane を足さないこと——
  //    パネルは body のスクロールを止めないタブ面で、開いていても overflow を固定する理由が無い。
  const anyOpen = [el.omniModal, el.importModal, el.artModal, el.imageModal, el.newDeckModal].some((m) => !m.hidden) || GA_CARD_DETAIL.isOpen();
  if (!anyOpen) document.body.style.overflow = "";
}
[["omni-modal"], ["import-modal"], ["art-modal"], ["image-modal"], ["new-deck-modal"]].forEach(([id]) => {
  const modal = $(id);
  modal.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) closeModal(modal);
  });
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  // 手前のものから順に閉じる
  if (!el.tileMenu.hidden) { el.tileMenu.hidden = true; return; }
  if (GA_CARD_DETAIL.isOpen()) { GA_CARD_DETAIL.close(); return; }
  if (!el.newDeckModal.hidden) { closeModal(el.newDeckModal); return; }
  if (!el.artModal.hidden) { closeModal(el.artModal); return; }
  if (!el.imageModal.hidden) { closeModal(el.imageModal); return; }
  if (!el.importModal.hidden) { closeModal(el.importModal); return; }
  // ⚠️ 検索結果はモーダルではなくなったので Escape で閉じるものが無い（設計 §8-4 の2）。
  //    ⭐ タブを閉じるのは帯の × と Delete キー（§4-1）。
  if (!el.omniModal.hidden) closeModal(el.omniModal);
});

// ---------- 認証まわり ----------

function renderAuthArea() {
  if (me) {
    el.authArea.innerHTML = `
      <span class="userchip">
        <img class="avatar" src="${escapeHtml(me.avatar_url || "")}" alt="">
        ${escapeHtml(me.display_name)}
        <button class="logout" id="logout-btn">ログアウト</button>
      </span>`;
    $("logout-btn").addEventListener("click", async () => {
      try { await api("/api/auth/logout", { method: "POST" }); } catch { /* 失効済みでも続行 */ }
      location.hash = "";
      location.reload();
    });
  } else {
    el.authArea.innerHTML = `<a class="btn btn-sm btn-discord-sm" id="header-login" href="/api/auth/discord/authorize">Discordでログイン</a>`;
    $("header-login").addEventListener("click", (e) => { e.currentTarget.href = loginUrl(); });
  }
}

// ---------- ビュー切り替え ----------

function showView(view) {
  [el.viewLogin, el.viewDecks, el.viewEditor, el.viewDeck].forEach((v) => { v.hidden = v !== view; });
  el.bootStatus.hidden = true;
}

function setStatus(msg) {
  el.bootStatus.textContent = msg;
  el.bootStatus.hidden = false;
}

function route() {
  const h = location.hash;
  if (h.startsWith("#deck/")) { openDeckView(h.slice("#deck/".length)); return; }
  if (h.startsWith("#edit/")) { openEditor(h.slice("#edit/".length)); return; }
  if (me) { openDeckList(); } else { showView(el.viewLogin); }
}

// ---------- デッキ一覧 ----------

async function openDeckList() {
  const seq = ++deckSeq;
  showView(el.viewDecks);
  el.deckList.innerHTML = "";
  setStatus("デッキを読み込み中…");
  try {
    const data = await api("/api/decks");
    if (seq !== deckSeq) return;
    myDecks = data.decks || [];
    el.bootStatus.hidden = true;
    renderDeckFilter();
    renderDeckList();
  } catch (err) {
    if (seq !== deckSeq) return;
    if (err.status === 401) { me = null; renderAuthArea(); showView(el.viewLogin); return; }
    setStatus(`デッキ一覧の読み込みに失敗しました(${err.message})`);
  }
}

// フォーマット絞り込みの選択肢(件数つき)を組み立て直す。読み込みのたびに呼ぶ。
// 選択は保持しない(既定「すべて」)が、読み込み中に選ばれていた値は極力維持する
function renderDeckFilter() {
  const n = (key) => myDecks.filter((d) => normalizeFormat(d.format) === key).length;
  const prev = el.deckFilter.value;
  el.deckFilter.innerHTML = [
    { v: "", label: `すべて（${myDecks.length}）` },
    { v: "STANDARD", label: `${FORMAT_INFO.STANDARD.badge}（${n("STANDARD")}）` },
    { v: "PANTHEON", label: `${FORMAT_INFO.PANTHEON.badge}（${n("PANTHEON")}）` },
  ].map((o) => `<option value="${o.v}">${escapeHtml(o.label)}</option>`).join("");
  el.deckFilter.value = prev;
  if (el.deckFilter.selectedIndex < 0) el.deckFilter.selectedIndex = 0; // 不明な値なら「すべて」に戻す
}

function sortedDecks() {
  const mode = el.deckSort.value;
  const filter = el.deckFilter.value;
  const decks = myDecks.filter((d) => !filter || normalizeFormat(d.format) === filter);
  if (mode === "name") decks.sort((a, b) => a.name.localeCompare(b.name, "ja"));
  else if (mode === "created") decks.sort((a, b) => b.created_at.localeCompare(a.created_at));
  else decks.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  return decks;
}

function renderDeckList() {
  const frag = document.createDocumentFragment();
  const decks = sortedDecks();
  if (!decks.length) {
    el.deckList.innerHTML = myDecks.length
      ? `<p class="deck-empty">該当するデッキがありません。</p>`
      : "";
    return;
  }

  decks.forEach((d) => {
    const fmt = normalizeFormat(d.format);
    const item = document.createElement("article");
    item.className = "deck-item";
    item.innerHTML = `
      <div class="thumb-wrap" data-thumb-wrap><span class="champ-thumb-ph" data-thumb>🂠</span></div>
      <div class="deck-info">
        <h3>${escapeHtml(d.name)}</h3>
        <p class="deck-sub">
          <span class="${d.is_public ? "badge-pub" : "badge-priv"}">${d.is_public ? "公開" : "非公開"}</span>
          <span class="${FORMAT_INFO[fmt].cls}">${FORMAT_INFO[fmt].badge}</span>
          <span class="upd">更新: ${escapeHtml(relativeTime(d.updated_at))}</span>
        </p>
        <div class="deck-actions">
          <a class="btn btn-sm btn-primary" href="#edit/${escapeHtml(d.id)}">✏️ 編集</a>
          <button class="btn btn-sm" data-copy>複製</button>
          <button class="btn btn-sm" data-share>🔗 共有</button>
          <button class="btn btn-sm" data-rename>デッキ名修正</button>
          <button class="btn btn-sm btn-danger" data-delete>削除</button>
        </div>
      </div>`;

    // サムネイル: thumb_image(画像パス指定。裏面や版も選べる)を優先し、
    // 無ければ champion_slug のカードの表面デフォルト版。どちらも無ければプレースホルダーのまま
    const showThumb = (url) => {
      if (!url) return;
      const img = document.createElement("img");
      img.className = "champ-thumb-img";
      img.alt = "";
      img.loading = "lazy";
      img.src = url;
      const ph = item.querySelector("[data-thumb]");
      if (ph) ph.replaceWith(img);
    };
    if (d.thumb_image) {
      showThumb(API + d.thumb_image);
    } else if (d.champion_slug) {
      getCard(d.champion_slug).then((card) => showThumb(card && imageUrl(card)));
    }

    item.querySelector("[data-copy]").addEventListener("click", () => {
      // 「〜のコピー」という名前で新規デッキを作り、完了後は編集画面へ遷移する
      copyDeckToMine(d.id, { label: "複製", doneMsg: (name) => `「${name}」を複製しました` });
    });
    item.querySelector("[data-share]").addEventListener("click", (e) => {
      copyText(deckShareUrl(d.id), "共有リンクをコピーしました");
      e.currentTarget.textContent = "✓ コピーしました";
      setTimeout(() => { const b = item.querySelector("[data-share]"); if (b) b.textContent = "🔗 共有"; }, 1800);
    });
    item.querySelector("[data-rename]").addEventListener("click", async () => {
      const name = prompt("新しいデッキ名", d.name);
      if (!name || !name.trim() || name.trim() === d.name) return;
      try {
        const res = await api(`/api/decks/${d.id}`, { method: "PATCH", body: { name: name.trim() } });
        Object.assign(d, res.deck);
        renderDeckList();
      } catch (err) { showToast(`デッキ名の修正に失敗しました(${err.message})`, true); }
    });
    item.querySelector("[data-delete]").addEventListener("click", async () => {
      // デッキ全体の削除は取り返しがつかないため、こちらは確認を残す
      if (!confirm(`デッキ「${d.name}」を削除します。よろしいですか？(元に戻せません)`)) return;
      try {
        await api(`/api/decks/${d.id}`, { method: "DELETE" });
        myDecks = myDecks.filter((x) => x.id !== d.id);
        renderDeckFilter(); // 絞り込みの件数も減らす
        renderDeckList();
        showToast(`「${d.name}」を削除しました`);
      } catch (err) { showToast(`削除に失敗しました(${err.message})`, true); }
    });

    frag.appendChild(item);
  });

  el.deckList.innerHTML = "";
  el.deckList.appendChild(frag);
}

// デッキ作成系エラーの表示用メッセージ(APIのエラーコード→日本語)
function deckCreateErrorMessage(err) {
  if (err.code === "deck_limit_reached") return "デッキの保存数が上限に達しています。不要なデッキを削除してください";
  return err.message;
}

// ---------- 新しいデッキ(デッキ名＋フォーマットのモーダル・#4) ----------

// .fmt-choice のラジオカード。選択中のカードに .sel を付け直す(見た目のドット・枠)。
// ラジオ自体はネイティブのまま残してあるので、キーボード操作(←→)もそのまま効く
function syncFormatChoices(scope) {
  scope.querySelectorAll(".fmt-choice").forEach((label) => {
    const radio = label.querySelector('input[type="radio"]');
    label.classList.toggle("sel", !!radio && radio.checked);
  });
}
function selectedFormat(name) {
  const checked = document.querySelector(`input[name="${name}"]:checked`);
  return normalizeFormat(checked && checked.value);
}
document.addEventListener("change", (e) => {
  const radio = e.target.closest('.fmt-choice input[type="radio"]');
  if (radio) syncFormatChoices(radio.closest(".fmt-choices"));
});

function openNewDeckModal() {
  el.newDeckName.value = "新しいデッキ";
  el.newDeckError.hidden = true;
  el.newDeckError.textContent = "";
  const std = document.querySelector('input[name="new-deck-format"][value="STANDARD"]');
  if (std) std.checked = true;
  syncFormatChoices(el.newDeckModal);
  openModal(el.newDeckModal);
  el.newDeckName.focus();
  el.newDeckName.select();
}

async function submitNewDeck() {
  const name = el.newDeckName.value.trim();
  if (!name) {
    // モーダルは閉じない。API呼び出しも発生させない
    el.newDeckError.textContent = "デッキ名を入力してください";
    el.newDeckError.hidden = false;
    el.newDeckName.focus();
    return;
  }
  el.newDeckCreate.disabled = true;
  try {
    const res = await api("/api/decks", {
      method: "POST",
      body: { name, is_public: false, format: selectedFormat("new-deck-format") },
    });
    closeModal(el.newDeckModal);
    location.hash = `#edit/${res.deck.id}`;
  } catch (err) {
    el.newDeckError.textContent = `作成に失敗しました（${deckCreateErrorMessage(err)}）`;
    el.newDeckError.hidden = false;
  } finally {
    el.newDeckCreate.disabled = false;
  }
}

el.newDeckCreate.addEventListener("click", submitNewDeck);
el.newDeckName.addEventListener("keydown", (e) => { if (e.key === "Enter") submitNewDeck(); });

// ---------- デッキ編集 ----------

let saveCount = 0;
function beginSave() {
  saveCount++;
  el.edSave.textContent = "保存中…";
  el.edSave.classList.add("saving");
}
function endSave() {
  saveCount = Math.max(0, saveCount - 1);
  if (saveCount === 0) {
    el.edSave.textContent = "保存済み";
    el.edSave.classList.remove("saving");
  }
}

// 左ペイン（2カラム化）が出る画面幅。⚠️ style.css の @media (min-width: 1200px) と必ず揃える。
// ⭐ 1200px はトップと共通の境界（左ペイン化_設計 §14-2 の実測で確定・G-2）。
// ⚠️ ⭐ style.css 側の閾値（左ペイン一式と #s-selected-filters）と必ず同時に動かすこと。
//    片方だけだと「左ペインは出るのに選択中の条件だけ出ない帯」ができ、その帯で
//    「選択中の条件」の✕による再検索（§11 E）が無言で効かなくなる（§14-3・V53）。
const PANE_MIN_WIDTH = 1200;

// 複数選択(AND/OR)の絞り込みグループ。中身は init() の fillChips() が構築する(#31)
// ⚠️ ここに足すとバッジ集計・リセット・「選択中の条件」・アコーディオン・⭐ タブの条件の
//    スナップショット（condFromForm / applyCondToForm / condEls）が同時に対応する。
//    足し忘れると畳んだときのバッジが数え落とし、リセットで選択が残る（左ペイン化_設計 §7-1）。
// ⚠️ ⭐ 名前つきの1つの表から両方を作る（トップの urlGroups / filterGroups と同じ形）。
//    2つの配列に分けて書くと、片方だけに足した日に「絞り込めるのに条件が保存されない」ずれになる。
//    名前はトップの共有URL（#20）と同じ綴りにする＝保存したクエリ文字列の互換を保つため。
const condGroups = () => [
  ["element", el.sGElement], ["class", el.sGClass], ["type", el.sGType],
  ["subtype", el.sGSubtype], ["rarity", el.sGRarity],
];
const filterGroups = () => condGroups().map(([, g]) => g);
const hasOption = (sel, v) => Array.from(sel.options).some((o) => o.value === v);

// 選択中の絞り込み条件（左ペイン化_設計 §7-3）。実装はトップと共用の
// shared/js/card-search.js（createSelectedFilters）。⚠️ ここへコピーしないこと（二重定義になる）。
// ⚠️ 出す・出さないは style.css（既定 display:none、1200px以上でだけ表示）が決める。
// ⚠️ ⭐ 「選択中の条件」の✕・すべて解除では**何も起きない**（再検索しない）。
//    2026-09-16 のユーザー決定（検索結果のタブ化_設計 §2-3）で、タブを増やすのは
//    🔍検索 と Enter だけ・並び替えだけが表示中のタブをその場で更新する、と1本に決まった。
// ⚠️ ⭐ 「無言の劣化になる」という旧コメントの懸念はここでは当たらない——
//    ✕を押すとチップが消えてバッジが減るという視覚的フィードバックがその場にある（§8-5）。
// ⚠️ ⭐ `onRemoveOne` は渡さない（§8-5・§8-6）。渡すページが 0 になったので、
//    scripts/validate.mjs の検査①の許可リストも空にしてある（⚠️ **同じコミットで直す**。
//    片方だけだと npm run validate が exit 1）。⚠️ 検査そのものは消さないこと。
const selectedFilters = GA_CARD_SEARCH.createSelectedFilters({
  container: el.sSelectedFilters,
  list: el.sSelectedFiltersList,
  groups: filterGroups,
  // 「すべて解除」で全群を空にしたあとの1回（左ペイン化_設計 §11-4）。
  // ⚠️ チップ本体を押したときは通らない——そちらは群側の onChange（updateFilterBadge のみ）で、
  //    「チップを変えても検索しない」既存挙動（Q5・U6）を据え置いている
  onChange: () => { updateFilterBadge(); },
});

// スマホでは絞り込み全体が畳まれるため、畳んだ状態でも選択件数が分かるようトグルへバッジを出す。
// ⚠️ 選択件数が変わる経路はここに集まっている（チップ変更・リセット・デッキ切替）。
//    「選択中の条件」の描き直しを各所に散らさず、この1か所から呼ぶ
function updateFilterBadge() {
  const n = filterGroups().reduce((sum, g) => sum + g.getValues().length, 0);
  el.sFilterBadge.hidden = n === 0;
  el.sFilterBadge.textContent = String(n);
  selectedFilters.render();
}

// 検索フォームを初期状態に戻す(リセットボタンとデッキ切替時の両方から使う)
function resetSearchForm() {
  el.sName.value = "";
  el.sText.value = "";
  // 選択チップ・AND/OR・開閉状態をまとめて戻す(#31)
  filterGroups().forEach((g) => g.reset());
  [el.sFormat, el.sSet].forEach((s) => { s.value = ""; });
  el.sSort.value = "name";
  setSearchOrder("ASC");
  updateFilterBadge();
}

// 昇順・降順ボタンの状態。⚠️ dataset.dir と表示文言を必ず一緒に書く（片方だけ書くと
// 「▲ 昇順と出ているのに DESC で検索する」という無言のずれになる）。
// リセット・タブの条件復元（applyCondToForm）・ボタン自身のクリックの3か所から呼ぶ
// ⚠️ 文言はここ1か所。条件の箱の「並び」の行（condSortText）も同じ関数を通す
//    （別々に書くと「ボタンは▲昇順・箱は▼降順」という食い違いが無言で入る）
const orderLabel = (dir) => (dir === "DESC" ? "▼ 降順" : "▲ 昇順");
function setSearchOrder(dir) {
  const next = dir === "DESC" ? "DESC" : "ASC";
  el.sOrder.dataset.dir = next;
  el.sOrder.textContent = orderLabel(next);
}

// 読み込み中に前回開いていたデッキの内容が見えないよう、編集ビューを空にする
// (デッキ一覧・共有閲覧の innerHTML="" と同じ役割)
function clearEditor() {
  clearTimeout(memoTimer); // 前のデッキのメモ自動保存が新しいデッキに書かれるのを防ぐ
  resetSearchForm(); // 前のデッキで入力した検索条件を持ち越さない
  clearSearchTabs(); // 検索タブもデッキごと(U2)。⚠️ 保存は書かない(前のデッキの保存が消える)
  el.edTitle.textContent = "";
  el.edPub.hidden = true;
  el.edFormat.hidden = true;
  el.deckWarn.hidden = true;
  el.edMemo.value = "";
  el.memoStatus.textContent = "";
  document.querySelectorAll("#view-editor .zone").forEach((zoneEl) => {
    zoneEl.querySelector(".zone-grid").innerHTML = "";
    const cnt = zoneEl.querySelector(".cnt");
    cnt.textContent = "";
    cnt.classList.remove("ok", "over");
    const bar = zoneEl.querySelector(".meter > i");
    if (bar) { bar.style.width = "0"; bar.classList.remove("ok", "over"); }
  });
}

async function openEditor(id) {
  const seq = ++deckSeq;
  if (!me) { showView(el.viewLogin); return; }
  clearEditor();
  showView(el.viewEditor);
  setStatus("デッキを読み込み中…");
  try {
    const data = await api(`/api/decks/${encodeURIComponent(id)}`);
    if (seq !== deckSeq) return;
    if (!data.is_owner) { location.hash = `#deck/${id}`; return; }
    deckData = data;
    el.bootStatus.hidden = true;
    el.edMemo.value = data.deck.description || "";
    el.memoStatus.textContent = "";
    if (editorTabs) editorTabs.reset(); // デッキ切替時は常にデッキタブから
    renderEditorBar();
    renderZones();
    // 保存してある検索タブを復元する（①B・U4）。⚠️ renderZones の後に呼ぶ——
    // 復元した最後のタブは再検索するので、結果タイルが deckData（枚数バッジ）を読む
    loadSearchTabs(id);
  } catch (err) {
    if (seq !== deckSeq) return;
    setStatus(err.status === 404 ? "デッキが見つかりません。" : `読み込みに失敗しました(${err.message})`);
  }
}

// .editor-bar の実測高さを CSS 変数 --editor-bar-h に入れる（左ペイン化_設計 §4-2）。
// ⚠️ 固定値で書かない。デッキ名の長さ・フォーマットバッジ・画面幅で 52〜102px の間で変わり、
//    1200px以上のレイアウトでは sticky の top と左ペインの max-height の両方が同じ値に依存する
//    （スマホ絞り込み導線の --printbar-h と同じ流儀）。
// ⚠️ CSP style-src 'self' のため <style> 注入は使えない。CSSOM／style プロパティ経由で書く。
// ⚠️ 高さ0（#view-editor が hidden のとき）は書かない。書くと sticky の top が 0 に潰れる。
function updateEditorBarH() {
  const bar = document.querySelector("#view-editor .editor-bar");
  if (!bar) return;
  const h = Math.round(bar.getBoundingClientRect().height);
  if (h > 0) document.documentElement.style.setProperty("--editor-bar-h", `${h}px`);
}

// 左ペインの実際の上端を --pane-top に入れる（操作不具合2件_設計 §4-7 案1）。
// ⚠️ 値は「sticky の top（編集バーの高さ）」と「実際の上端」の大きい方。ページ最上部ではヘッダの下にある。
// ⚠️ 1200px未満（スマホ表示）とエディタ非表示のときは何もしない（CSS 側も min-width の中でしか読まない）。
// ⚠️ Math.ceil で切り上げる。四捨五入だとペインの下端が画面から 1px 未満はみ出すことがある。
function updatePaneTop() {
  const pane = el.searchTop;
  if (!pane || !pane.getClientRects().length) return;
  if (!matchMedia(`(min-width: ${PANE_MIN_WIDTH}px)`).matches) return;
  const bar = document.querySelector("#view-editor .editor-bar");
  const barH = bar ? Math.round(bar.getBoundingClientRect().height) : 0;
  const top = Math.max(barH, Math.ceil(pane.getBoundingClientRect().top));
  document.documentElement.style.setProperty("--pane-top", `${top}px`);
}

// resize でバーの折り返し行数が変わる（デッキ名が長いと 1200px 前後で 1行↔2行）。
// rAF で1フレームに1回へ間引く。
let editorBarRaf = 0;
window.addEventListener("resize", () => {
  if (editorBarRaf) return;
  editorBarRaf = requestAnimationFrame(() => { editorBarRaf = 0; updateEditorBarH(); updatePaneTop(); });
});

// ページのスクロールでペインの実際の上端が変わる（ヘッダが見えている間だけ）。
// resize と同じく rAF で1フレームに1回へ間引く（操作不具合2件_設計 §4-7 案1）。
let paneTopRaf = 0;
window.addEventListener("scroll", () => {
  if (paneTopRaf) return;
  paneTopRaf = requestAnimationFrame(() => { paneTopRaf = 0; updatePaneTop(); });
}, { passive: true });

function renderEditorBar() {
  const d = deckData.deck;
  el.edTitle.textContent = d.name;
  el.edPub.hidden = false;
  el.edPub.textContent = d.is_public ? "公開" : "非公開";
  el.edPub.className = d.is_public ? "badge-pub" : "badge-priv";
  const fmt = deckFormat();
  el.edFormat.hidden = false;
  el.edFormat.textContent = FORMAT_INFO[fmt].badge;
  el.edFormat.className = FORMAT_INFO[fmt].cls;
  // ⚠️ 呼び出し側ではなくここで測る。renderEditorBar() を呼ぶ経路（openEditor／デッキ名変更／
  //    公開切替／フォーマット変更）が増えても、--editor-bar-h の更新漏れが起きないようにする。
  updateEditorBarH();
  // バーの高さが変わると sticky の上端（＝ペインの実際の上端）も変わる（操作不具合2件_設計 §4-7 案1）
  updatePaneTop();
}

// ゾーン内の並び順: 属性順 → 英名アルファベット順。
// 属性は基本属性(ノーム→火→水→風)を先、上級属性はその後ろにアルファベット順。
// EXALTEDは常に「基本属性+EXALTED」の形で付くため判定に使わず、基本属性側で並べる。
// マテリアルデッキのみ、チャンピオンをレベル順で先頭に置く。
// サイドボードはマテリアル系(チャンピオン/レガリア)→メイン系の順にまとめ、
// マテリアル群の中はマテリアルデッキと同じ順序にする。
const BASIC_ELEMENT_ORDER = ["NORM", "FIRE", "WATER", "WIND"];

// ソートに使う属性: EXALTED以外の最初の属性(EXALTEDしか無い場合のみEXALTED)
function sortElement(card) {
  const els = (card && card.elements) || [];
  return els.find((e) => e !== "EXALTED") || els[0] || "ZZZ";
}

function compareElements(ea, eb) {
  const ia = BASIC_ELEMENT_ORDER.indexOf(ea);
  const ib = BASIC_ELEMENT_ORDER.indexOf(eb);
  if (ia !== -1 || ib !== -1) {
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  }
  return ea.localeCompare(eb);
}

function zoneComparator(zone, bySlug) {
  return (a, b) => {
    const ca = bySlug.get(a.card_slug);
    const cb = bySlug.get(b.card_slug);
    if (zone === "side") {
      const matA = isMaterialCard(ca);
      const matB = isMaterialCard(cb);
      if (matA !== matB) return matA ? -1 : 1;
    }
    if (zone === "material" || zone === "side") {
      const champA = ca && (ca.types || []).includes("CHAMPION");
      const champB = cb && (cb.types || []).includes("CHAMPION");
      if (champA !== champB) return champA ? -1 : 1;
      if (champA && champB) {
        const la = ca.level != null ? ca.level : 99;
        const lb = cb.level != null ? cb.level : 99;
        if (la !== lb) return la - lb;
      }
    }
    const ea = sortElement(ca);
    const eb = sortElement(cb);
    if (ea !== eb) return compareElements(ea, eb);
    const na = (ca && ca.name) || a.card_slug;
    const nb = (cb && cb.name) || b.card_slug;
    return na.localeCompare(nb);
  };
}

// 表示するゾーンを上から順に返す(#4)。アクティブなゾーン → 非アクティブでカードが残っている
// ゾーン(掃除用)。フォーマットを切り替えてもカードは絶対に削除せず、ここに残す
function zoneDisplayOrder(format, cards) {
  const active = activeZones(format);
  const leftovers = ZONES.filter((z) => !active.includes(z) && cards.some((c) => c.board === z));
  return { active, order: [...active, ...leftovers] };
}

async function renderZones() {
  const seq = deckSeq;
  const cards = deckData.cards;
  const bySlug = await ensureCards(cards.map((c) => c.card_slug));
  if (seq !== deckSeq) return;

  const format = deckFormat();
  const { active, order } = zoneDisplayOrder(format, cards);
  const pane = $("ed-pane-deck");
  const memoBlock = pane.querySelector(".memo-block");

  let materialFirst = null; // マテリアル表示順の先頭(サムネ自動設定用)
  ZONES.forEach((zone) => {
    const zoneEl = pane.querySelector(`.zone[data-zone="${zone}"]`);
    zoneEl.hidden = !order.includes(zone);
  });
  // ⚠️ ゾーンの並べ直しは「表示するゾーンの並びが order と違うとき」だけ行う（操作不具合2件_設計 §3）。
  //    ＋/−で毎回全ゾーンを抜き差しすると、Chrome のスクロールアンカリングが
  //    フォーカス中の＋ボタンを基準にページを上へ送ってしまう（メインで −474px を実測）。
  //    ⚠️ hidden のゾーン（標準デッキの pantheon 等）は比較から外す。混ぜると毎回「違う」と判定して元に戻る。
  //    ⚠️ 描画ループの中へ戻さないこと（戻すと空振りの抜き差しが毎回走り、不具合が再発する）。
  const shown = [...pane.querySelectorAll(":scope > .zone")].map((z) => z.dataset.zone).filter((z) => order.includes(z));
  if (shown.join() !== order.join()) {
    // 上から order の順に並べ直す(メモは常に最後)
    order.forEach((zone) => pane.insertBefore(pane.querySelector(`.zone[data-zone="${zone}"]`), memoBlock));
  }
  order.forEach((zone) => {
    const zoneEl = pane.querySelector(`.zone[data-zone="${zone}"]`);
    const isActive = active.includes(zone);
    const grid = zoneEl.querySelector(".zone-grid");
    const rows = cards
      .filter((c) => c.board === zone)
      .sort(zoneComparator(zone, bySlug));
    if (zone === "material") materialFirst = rows[0] || null;

    // 見出し・注記・メーターを「このフォーマットで使うゾーンか」で切り替える
    const zname = zoneEl.querySelector(".zname");
    if (zname) zname.textContent = isActive ? ZONE_LABEL[zone] : `${ZONE_LABEL[zone]}（このフォーマットでは使いません）`;
    const meter = zoneEl.querySelector(".meter");
    if (meter) meter.hidden = !isActive;
    const activeNote = zoneEl.querySelector("[data-active-note]");
    if (activeNote) activeNote.hidden = !isActive;
    const inactiveNote = zoneEl.querySelector("[data-inactive-note]");
    if (inactiveNote) {
      inactiveNote.hidden = isActive;
      if (!isActive) {
        inactiveNote.textContent = `⚠️ ${FORMAT_INFO[format].jp}に${ZONE_LABEL[zone]}はありません。統計・適合判定の対象外です（${FORMAT_INFO[format === "PANTHEON" ? "STANDARD" : "PANTHEON"].jp}に戻すと元通りに数えます）。`;
      }
    }
    // マテリアルのLv0チャンピオン必須(#59)。文言はHTMLに直書きで、ここは hidden の出し入れだけ。
    // ⚠️ 空(0枚)のときは出さない(新規デッキを開いた瞬間に警告しないため)。フォーマットには依らない
    const lv0Note = zoneEl.querySelector("[data-lv0-note]");
    if (lv0Note) {
      const hasLv0 = rows.some((r) => isLevelZeroChampion(bySlug.get(r.card_slug)));
      lv0Note.hidden = !isActive || !rows.length || hasLv0;
    }

    grid.innerHTML = "";
    if (!rows.length) {
      grid.innerHTML = `<p class="zone-empty">カードがありません。上の検索から追加できます。</p>`;
    }
    rows.forEach((row) => {
      const card = bySlug.get(row.card_slug);
      const tile = document.createElement("div");
      tile.className = "cardph gtile";
      tile.tabIndex = 0;
      tile.dataset.slug = row.card_slug;
      tile.dataset.board = row.board;
      const url = rowImageUrl(row, card);
      const name = card ? jpName(card) : row.card_slug;
      tile.innerHTML = `
        ${url ? `<img loading="lazy" src="${escapeHtml(url)}" alt="${escapeHtml(name)}" title="${escapeHtml(name)}">`
              : `<div class="noimg">${escapeHtml(name)}</div>`}
        ${card ? formatIconHtml(card) : ""}
        <span class="qty-badge">×${row.qty}</span>
        ${zone === "side" && card && isMaterialCard(card) ? `<span class="pt-tag">3pt</span>` : ""}
        <div class="ctrl-strip">
          <button data-step="-1" aria-label="減らす">−</button>
          <input class="qv-input" type="number" inputmode="numeric" min="0" max="99" value="${row.qty}" aria-label="枚数を直接入力">
          ${isActive ? `<button data-step="1" aria-label="増やす">＋</button>` : ""}
          <button data-menu aria-label="その他">⋯</button>
        </div>`;
      grid.appendChild(tile);
    });

    updateZoneHeader(zone, rows, bySlug, isActive);
  });

  autoAssignThumb(materialFirst, bySlug);
  updateDeckWarn(el.deckWarn, cards, bySlug, format);

  // 統計タブ表示中ならカード追加/削除/枚数変更で即時更新する
  if (editorTabs && editorTabs.isStats()) renderStatsInto(el.edPaneStats, cards, bySlug, format);
}

// サムネイル未指定のデッキは、マテリアル表示順の先頭カードを自動でサムネイルに設定する。
// 明示設定(thumb_image)や既存のチャンピオン指定(champion_slug)があれば何もしない。
let thumbAssigning = false;
async function autoAssignThumb(firstRow, bySlug) {
  if (!deckData || !firstRow) return;
  const d = deckData.deck;
  if (d.thumb_image || d.champion_slug || thumbAssigning) return;
  const card = bySlug.get(firstRow.card_slug);
  const url = card && imageUrl(card);
  if (!url || !url.startsWith(API)) return;
  thumbAssigning = true;
  try {
    const res = await api(`/api/decks/${d.id}`, { method: "PATCH", body: { thumb_image: url.slice(API.length) } });
    // 保存中にデッキが切り替わっていなければ反映する
    if (deckData && deckData.deck.id === d.id) deckData.deck = res.deck;
  } catch { /* 自動設定の失敗は無視 */ }
  finally { thumbAssigning = false; }
}

// パンテオンゾーンの Lesser / Greater の枚数(#4)
function boonCounts(rows, bySlug) {
  let lesser = 0, greater = 0;
  rows.forEach((r) => {
    const kind = boonKind(bySlug.get(r.card_slug));
    if (kind === "lesser") lesser += r.qty;
    else if (kind === "greater") greater += r.qty;
  });
  return { lesser, greater };
}

function updateZoneHeader(zone, rows, bySlug, isActive = true) {
  const zoneEl = document.querySelector(`#view-editor .zone[data-zone="${zone}"]`);
  const cnt = zoneEl.querySelector(".cnt");
  const bar = zoneEl.querySelector(".meter > i");
  const total = rows.reduce((s, r) => s + r.qty, 0);

  const setBar = (ratio, full, over) => {
    if (!bar) return;
    bar.style.width = `${Math.min(100, ratio * 100)}%`;
    bar.classList.toggle("ok", !!full);
    bar.classList.toggle("over", !!over);
  };

  // 非アクティブゾーン(カードが残っているだけ)は枚数のみ。色もメーターも出さない
  if (!isActive) {
    cnt.textContent = `${total}枚`;
    cnt.classList.remove("ok", "over");
    return;
  }

  if (zone === "pantheon") {
    const { lesser, greater } = boonCounts(rows, bySlug);
    // ASCII表記(375px幅で .zone h3 を折り返さないため。設計 §5-2(d))
    cnt.textContent = `Lesser ${lesser}/1・Greater ${greater}/1`;
    const ok = lesser === 1 && greater === 1;
    const over = lesser > 1 || greater > 1;
    cnt.classList.toggle("ok", ok);
    cnt.classList.toggle("over", over);
    setBar((Math.min(lesser, 1) + Math.min(greater, 1)) / 2, ok, over);
  } else if (zone === "main") {
    // メインは「最低60枚・上限なし」。60枚以上は緑で、⚠️ over(赤)は付けない(#58)
    cnt.textContent = `${total} / ${MAIN_MIN}以上`;
    const ok = total >= MAIN_MIN;
    cnt.classList.toggle("ok", ok);
    cnt.classList.remove("over");
    setBar(total / MAIN_MIN, ok, false);
  } else if (zone === "material") {
    // マテリアルは「最大12枚」なので超過は赤のまま(#58ではここを変えない)
    cnt.textContent = `${total} / ${MATERIAL_MAX}`;
    cnt.classList.toggle("ok", total === MATERIAL_MAX);
    cnt.classList.toggle("over", total > MATERIAL_MAX);
    setBar(total / MATERIAL_MAX, total === MATERIAL_MAX, total > MATERIAL_MAX);
  } else if (zone === "side") {
    const pt = rows.reduce((s, r) => s + sidePoints(bySlug.get(r.card_slug)) * r.qty, 0);
    cnt.textContent = `${pt} / ${SIDE_MAX_PT} pt・${total}枚`;
    const over = pt > SIDE_MAX_PT || total > SIDE_MAX_CARDS;
    cnt.classList.toggle("ok", !over && pt === SIDE_MAX_PT);
    cnt.classList.toggle("over", over);
    setBar(pt / SIDE_MAX_PT, pt === SIDE_MAX_PT && !over, over);
  } else {
    cnt.textContent = `${total}枚`;
  }
}

// 必要なカードデータをまとめて取得して Map で返す
async function ensureCards(slugs) {
  const uniq = [...new Set(slugs)];
  const cards = await Promise.all(uniq.map((s) => getCard(s)));
  const map = new Map();
  uniq.forEach((s, i) => map.set(s, cards[i]));
  return map;
}

function findEntry(slug, board) {
  return deckData.cards.find((c) => c.card_slug === slug && c.board === board);
}

// カード追加(同じゾーンに既にあれば加算。イラスト指定は新規行のときだけ反映される)。成功したらゾーンを再描画
async function addCard(slug, board, qty = 1, artImage = null) {
  beginSave();
  try {
    const res = await api(`/api/decks/${deckData.deck.id}/cards`, {
      method: "POST",
      body: { card_slug: slug, board, qty, ...(artImage ? { art_image: artImage } : {}) },
    });
    const entry = findEntry(slug, board);
    if (entry) entry.qty = res.card.qty;
    else deckData.cards.push(res.card);
    await renderZones();
    flashTile(slug, board);
    return res.card;
  } finally { endSave(); }
}

async function setQty(slug, board, qty) {
  if (qty <= 0) return removeCard(slug, board, { undo: true });
  beginSave();
  try {
    const res = await api(`/api/decks/${deckData.deck.id}/cards/${encodeURIComponent(slug)}`, {
      method: "PATCH",
      body: { qty, board },
    });
    const entry = findEntry(slug, board);
    if (entry) entry.qty = res.card.qty;
    await renderZones();
  } finally { endSave(); }
}

// カード削除。undo指定時は「元に戻す」ボタン付きトーストを出す(確認ダイアログは出さない)
async function removeCard(slug, board, opts = {}) {
  const entry = findEntry(slug, board);
  const restoreQty = entry ? entry.qty : 0;
  const restoreArt = entry ? entry.art_image : null; // 「元に戻す」でイラスト設定も復元する
  beginSave();
  try {
    await api(`/api/decks/${deckData.deck.id}/cards/${encodeURIComponent(slug)}?board=${encodeURIComponent(board)}`, { method: "DELETE" });
    deckData.cards = deckData.cards.filter((c) => !(c.card_slug === slug && c.board === board));
    await renderZones();
    if (opts.undo && restoreQty > 0) {
      showToast(`「${await cardName(slug)}」を${ZONE_LABEL[board]}から削除しました`, false, {
        label: "元に戻す",
        fn: () => addCard(slug, board, restoreQty, restoreArt).catch((err) => showToast(`復元に失敗しました(${err.message})`, true)),
      });
    }
  } finally { endSave(); }
}

// ゾーン間の移動は1枚ずつ: 移動先に+1して移動元を-1(最後の1枚なら削除)
async function moveCard(slug, from, to) {
  const entry = findEntry(slug, from);
  if (!entry || from === to) return;
  beginSave();
  try {
    const res = await api(`/api/decks/${deckData.deck.id}/cards`, {
      method: "POST",
      body: { card_slug: slug, board: to, qty: 1, ...(entry.art_image ? { art_image: entry.art_image } : {}) },
    });
    if (entry.qty <= 1) {
      await api(`/api/decks/${deckData.deck.id}/cards/${encodeURIComponent(slug)}?board=${encodeURIComponent(from)}`, { method: "DELETE" });
      deckData.cards = deckData.cards.filter((c) => !(c.card_slug === slug && c.board === from));
    } else {
      await api(`/api/decks/${deckData.deck.id}/cards/${encodeURIComponent(slug)}`, {
        method: "PATCH",
        body: { qty: entry.qty - 1, board: from },
      });
      entry.qty -= 1;
    }
    const target = findEntry(slug, to);
    if (target) target.qty = res.card.qty;
    else deckData.cards.push(res.card);
    await renderZones();
    flashTile(slug, to);
    showToast(`「${await cardName(slug)}」を1枚${ZONE_LABEL[to]}へ移動しました`);
  } catch (err) {
    showToast(`移動に失敗しました(${err.message})`, true);
  } finally { endSave(); }
}

async function cardName(slug) {
  const card = await getCard(slug);
  return card ? jpName(card) : slug;
}

function flashTile(slug, board) {
  const tile = document.querySelector(`.zone[data-zone="${board}"] .gtile[data-slug="${CSS.escape(slug)}"]`);
  if (!tile) return;
  tile.classList.remove("just-added");
  void tile.offsetWidth; // アニメーション再生のためのリフロー
  tile.classList.add("just-added");
}

// タイル上の操作(−/＋/⋯/クリックで詳細)はイベント委譲で拾う(再描画に強い)
document.addEventListener("click", (e) => {
  const tile = e.target.closest(".gtile");
  if (!tile) return;
  const { slug, board } = tile.dataset;
  const btn = e.target.closest(".ctrl-strip button");
  if (!btn) {
    if (e.target.closest(".ctrl-strip")) return; // 数値入力など操作バー内のクリックは無視
    openDetail(slug); // 操作バー以外のクリック → カード詳細
    return;
  }
  if (btn.dataset.menu !== undefined) { openTileMenu(btn, slug, board); return; }
  const step = Number(btn.dataset.step);
  const entry = findEntry(slug, board);
  if (!entry) return;
  setQty(slug, board, entry.qty + step).catch((err) => showToast(`保存に失敗しました(${err.message})`, true));
});

// 枚数の直接入力(タイル)。0にするとデッキから削除(「元に戻す」トースト付き)
document.addEventListener("change", (e) => {
  const input = e.target.closest(".gtile .qv-input");
  if (!input) return;
  const tile = input.closest(".gtile");
  const { slug, board } = tile.dataset;
  let q = parseInt(input.value, 10);
  if (Number.isNaN(q)) { renderZones(); return; }
  q = Math.max(0, Math.min(99, q));
  setQty(slug, board, q).catch((err) => showToast(`保存に失敗しました(${err.message})`, true));
});

// ---------- タイルの「⋯」メニュー ----------

let menuContext = null; // { slug, board }

function openTileMenu(anchor, slug, board) {
  menuContext = { slug, board };
  // 現在いるゾーンへの移動は出さない。カード種別的に入れられないゾーン・
  // このフォーマットで使わないゾーンも出さない(#4)
  const active = activeZones(deckFormat());
  el.tileMenu.querySelectorAll("[data-move]").forEach((b) => {
    b.hidden = b.dataset.move === board || !active.includes(b.dataset.move);
  });
  // 「イラストを変更」は版が2つ以上あるカードだけに出す
  const artBtn = el.tileMenu.querySelector('[data-act="art"]');
  artBtn.hidden = true;
  getCard(slug).then((card) => {
    if (!menuContext || menuContext.slug !== slug) return;
    el.tileMenu.querySelectorAll("[data-move]").forEach((b) => {
      if (zoneDisallowed(card, b.dataset.move)) b.hidden = true;
    });
    artBtn.hidden = !card || cardImages(card).length < 2;
  });
  el.tileMenu.hidden = false;
  const r = anchor.getBoundingClientRect();
  const x = Math.max(8, Math.min(r.left, innerWidth - el.tileMenu.offsetWidth - 8));
  let y = r.bottom + 4;
  if (y + el.tileMenu.offsetHeight > innerHeight - 8) y = r.top - el.tileMenu.offsetHeight - 4;
  el.tileMenu.style.left = `${x}px`;
  el.tileMenu.style.top = `${y}px`;
}

document.addEventListener("click", (e) => {
  if (e.target.closest(".gtile .ctrl-strip button")) return; // 開閉は上のハンドラが担当
  if (!e.target.closest("#tile-menu")) el.tileMenu.hidden = true;
});
window.addEventListener("scroll", () => { el.tileMenu.hidden = true; }, { passive: true });

el.tileMenu.addEventListener("click", async (e) => {
  const btn = e.target.closest("button");
  el.tileMenu.hidden = true;
  if (!btn || !menuContext) return;
  const { slug, board } = menuContext;
  if (btn.dataset.move) { moveCard(slug, board, btn.dataset.move); return; }
  if (btn.dataset.act === "art") { openArtPicker(slug, board); return; }
  if (btn.dataset.act === "thumb") { openThumbPicker(slug); return; }
  if (btn.dataset.act === "delete") {
    removeCard(slug, board, { undo: true }).catch((err) => showToast(`削除に失敗しました(${err.message})`, true));
  }
});

// ---------- イラスト/サムネイル選択ダイアログ ----------
// mode "art"   … デッキ内カードのイラスト(版)変更。表面の版のみ
// mode "thumb" … デッキ一覧のサムネイル設定。表面の版+両面カードの裏面も選べる

let artContext = null; // { mode, slug, board }

function renderArtOptions(options, current) {
  el.artGrid.innerHTML = options.map((im) => `
    <button class="art-opt${im.url === current ? " current" : ""}" type="button" data-url="${escapeHtml(im.url)}">
      <span class="cardph">
        <img loading="lazy" src="${escapeHtml(im.url)}" alt="">
        ${im.url === current ? `<span class="art-check">✓ 使用中</span>` : ""}
      </span>
      <span class="art-label">${escapeHtml(im.label)}</span>
    </button>`).join("");
}

// 版のイラストを一覧表示して、タップで即変更する(案A)
async function openArtPicker(slug, board) {
  const card = await getCard(slug);
  if (!card || !deckData) return;
  const entry = findEntry(slug, board);
  if (!entry) return;
  artContext = { mode: "art", slug, board };
  el.artTitle.textContent = `🎨 イラストを選択 — ${jpName(card)}`;
  el.artNote.textContent = "タップしたイラストにすぐ変更されます。";
  renderArtOptions(cardImages(card), rowImageUrl(entry, card));
  openModal(el.artModal);
}

// サムネイル選択。選択肢が1つ以下(版が1つで裏面なし)ならダイアログを出さず即設定
async function openThumbPicker(slug) {
  const card = await getCard(slug);
  if (!card || !deckData) return;
  const options = [];
  cardImages(card).forEach((im) => {
    options.push({ url: im.url, label: im.label });
    if (im.back) options.push({ url: im.back, label: `${im.label}（裏面）` });
  });
  if (options.length <= 1) {
    setDeckThumb(slug, options.length ? options[0].url : null);
    return;
  }
  const d = deckData.deck;
  const current = d.thumb_image ? API + d.thumb_image
    : (d.champion_slug === slug ? imageUrl(card) : null);
  artContext = { mode: "thumb", slug, board: null };
  el.artTitle.textContent = `🖼️ サムネイルを選択 — ${jpName(card)}`;
  el.artNote.textContent = "タップしたイラストがデッキ一覧のサムネイルになります。";
  renderArtOptions(options, current);
  openModal(el.artModal);
}

async function setDeckThumb(slug, url) {
  const path = url && url.startsWith(API) ? url.slice(API.length) : null;
  beginSave();
  try {
    const res = await api(`/api/decks/${deckData.deck.id}`, {
      method: "PATCH",
      body: { champion_slug: slug, thumb_image: path },
    });
    deckData.deck = res.deck;
    showToast(`「${await cardName(slug)}」をサムネイルに設定しました`);
  } catch (err) { showToast(`設定に失敗しました(${err.message})`, true); }
  finally { endSave(); }
}

el.artGrid.addEventListener("click", async (e) => {
  const btn = e.target.closest(".art-opt");
  if (!btn || !artContext) return;
  const { mode, slug, board } = artContext;
  closeModal(el.artModal);
  const url = btn.dataset.url;
  if (mode === "thumb") { setDeckThumb(slug, url); return; }
  const card = await getCard(slug);
  // デフォルト(先頭の版)を選んだときは指定を解除して null に戻す
  const path = card && url === imageUrl(card) ? null : url.slice(API.length);
  beginSave();
  try {
    const res = await api(`/api/decks/${deckData.deck.id}/cards/${encodeURIComponent(slug)}`, {
      method: "PATCH",
      body: { board, art_image: path },
    });
    const entry = findEntry(slug, board);
    if (entry) entry.art_image = res.card.art_image;
    await renderZones();
    flashTile(slug, board);
    showToast(`「${await cardName(slug)}」のイラストを変更しました`);
  } catch (err) { showToast(`イラストの変更に失敗しました(${err.message})`, true); }
  finally { endSave(); }
});

// ---------- 編集バーの操作 ----------

el.edRename.addEventListener("click", async () => {
  const name = prompt("新しいデッキ名", deckData.deck.name);
  if (!name || !name.trim() || name.trim() === deckData.deck.name) return;
  beginSave();
  try {
    const res = await api(`/api/decks/${deckData.deck.id}`, { method: "PATCH", body: { name: name.trim() } });
    deckData.deck = res.deck;
    renderEditorBar();
  } catch (err) { showToast(`デッキ名の修正に失敗しました(${err.message})`, true); }
  finally { endSave(); }
});

el.edPub.addEventListener("click", async () => {
  const next = !deckData.deck.is_public;
  beginSave();
  try {
    const res = await api(`/api/decks/${deckData.deck.id}`, { method: "PATCH", body: { is_public: next } });
    deckData.deck = res.deck;
    renderEditorBar();
    showToast(next ? "デッキを公開にしました" : "デッキを非公開にしました(共有リンクを知っている人は引き続き見られます)");
  } catch (err) { showToast(`変更に失敗しました(${err.message})`, true); }
  finally { endSave(); }
});

// フォーマットの変更(#4)。⚠️ カードは絶対に削除しない。使わなくなったゾーンのカードは
// 非アクティブゾーンとして残し、掃除できるようにする
el.edFormat.addEventListener("click", async () => {
  if (!deckData) return;
  const cur = deckFormat();
  const next = cur === "PANTHEON" ? "STANDARD" : "PANTHEON";
  const losing = next === "PANTHEON" ? "side" : "pantheon";
  const n = deckData.cards.filter((c) => c.board === losing).reduce((s, c) => s + c.qty, 0);
  const lines = [`このデッキを${FORMAT_INFO[next].jp}に変更します。`];
  if (n) {
    lines.push(next === "PANTHEON"
      ? `パンテオンにサイドボードはないため、サイドボードの${n}枚は集計対象外になります（カードは残ります）。`
      : `スタンダードにパンテオン（Boon）はないため、パンテオンの${n}枚は集計対象外になります（カードは残ります）。`);
  }
  lines.push("よろしいですか？");
  if (!confirm(lines.join("\n"))) return;
  beginSave();
  try {
    const res = await api(`/api/decks/${deckData.deck.id}`, { method: "PATCH", body: { format: next } });
    deckData.deck = res.deck;
    renderEditorBar();
    await renderZones();
    showToast(`フォーマットを${FORMAT_INFO[next].jp}に変更しました`);
  } catch (err) { showToast(`変更に失敗しました(${err.message})`, true); }
  finally { endSave(); }
});

el.edCopyLink.addEventListener("click", () => {
  copyText(deckShareUrl(deckData.deck.id), "共有リンクをコピーしました");
});

// omnidex提出フォーマット: # Material Deck / # Main Deck / # Sideboard、行は「枚数 英語カード名」
async function buildOmnidexText() {
  const bySlug = await ensureCards(deckData.cards.map((c) => c.card_slug));
  const section = (board, title) => {
    const rows = deckData.cards
      .filter((c) => c.board === board)
      .map((c) => ({ qty: c.qty, name: (bySlug.get(c.card_slug) || {}).name || c.card_slug }))
      .sort((a, b) => a.name.localeCompare(b.name));
    if (!rows.length) return null;
    return `# ${title}\n${rows.map((r) => `${r.qty} ${r.name}`).join("\n")}`;
  };
  // 出力するのはこのフォーマットで使うゾーンだけ。⚠️ パンテオン(Boon)は omnidex の
  // テキスト形式が未確認のため出力しない(#4 未決事項C。推測で見出しを足さないこと)
  const titles = { material: "Material Deck", main: "Main Deck", side: "Sideboard" };
  const parts = activeZones(deckFormat())
    .filter((z) => titles[z])
    .map((z) => section(z, titles[z]))
    .filter(Boolean);
  return parts.length ? parts.join("\n\n") + "\n" : null;
}

// 内容をダイアログで確認してからコピーする
el.edCopyText.addEventListener("click", async () => {
  const text = await buildOmnidexText();
  if (!text) { showToast("デッキが空です", true); return; }
  el.omniText.textContent = text;
  // パンテオンのデッキのときだけ「Boonを含めていない」ことを断る
  el.omniPantheonNote.hidden = deckFormat() !== "PANTHEON";
  openModal(el.omniModal);
});
$("omni-copy").addEventListener("click", () => {
  copyText(el.omniText.textContent, "デッキリストをコピーしました");
});

// メモ(decks.description)。入力が止まってから0.8秒後に自動保存
let memoTimer = null;
el.edMemo.addEventListener("input", () => {
  if (!deckData) return;
  el.memoStatus.textContent = "…";
  clearTimeout(memoTimer);
  memoTimer = setTimeout(saveMemo, 800);
});
async function saveMemo() {
  beginSave();
  try {
    const res = await api(`/api/decks/${deckData.deck.id}`, {
      method: "PATCH",
      body: { description: el.edMemo.value },
    });
    deckData.deck = res.deck;
    el.memoStatus.textContent = "保存済み";
  } catch (err) {
    el.memoStatus.textContent = `保存に失敗しました(${err.message})`;
  } finally { endSave(); }
}

// ---------- カード詳細 ----------
// 本体は shared/js/card-detail.js (GA_CARD_DETAIL) に共通化。openDetail はその薄いラッパー。

function openDetail(slug) {
  GA_CARD_DETAIL.openBySlug(slug);
}

// ---------- カード検索(編集画面) ----------
// クエリ構築・日本語ローカル検索・ページングは shared/js/card-search.js に共通化。
// カード取得はこのページのキャッシュ(getCard)を使う。
//
// ⭐ 検索結果は「検索タブ」ごとに持つ（検索結果のタブ化_設計 §5・§7）。タブ1つにつき
//    GA_CARD_SEARCH.create() を1つ作り、els には左ペインの実DOMではなく
//    「そのタブの条件を返すだけの物」（condEls）を渡す。
// ⚠️ ⭐ els を実DOMに戻さないこと。それが P1（結果を開いたまま左ペインを書き換えて
//    「もっと見る」を押すと、前の検索の結果に新しい条件の続きが混ざる）の原因そのもので、
//    この差し替えだけが直し方（設計 §7・検証 V11）。

const SEARCH_TAB_MAX = 5;                                       // ② 上限5（PC・スマホとも）
const SEARCH_TABS_KEY = "ga-deckbuilder-search-tabs:v1:";       // + deckId（U2＝デッキごと）
const SEARCH_TABS_KEEP_DECKS = 10;                              // 保存を残す最近のデッキ数（§5-2）

let searchTabs = [];          // 作った順。先頭がいちばん古い（上限超えで閉じる対象）
let activeSearchTab = null;   // 結果パネル（#result-grid・件数・もっと見る）を今持っているタブ
let selectedSearchTab = null; // タブ帯で aria-selected="true" の検索タブ（固定タブ選択中は null）
let nextSearchN = 1;          // 「検索N」の N。② 上限を超えても続き、U3 全部閉じたら 1 に戻す
let searchTabSeq = 0;         // DOM id 用の通し番号（n とは別。n は閉じても再利用しうる）
let searchTabsDeckId = null;  // 保存キーのデッキ。⚠️ null の間は保存しない（デッキ未読込）

// 条件のスナップショット（§5-2）。⭐ 形式はトップの共有URL（#20・queryString()）と同じ
// クエリ文字列にする。⚠️ ⭐ エキスパンションは <select> の添字ではなく prefix で持つ
// （setKeyOf）——meta.sets の並びが変わっても別の版を指さないため（#20 と同じ理由）。
// ⚠️ 絞り込みグループの表（condGroups）は「デッキ編集」節の filterGroups と同じ1つの出所。
function condFromForm() {
  const p = new URLSearchParams();
  if (el.sName.value.trim()) p.set("q", el.sName.value.trim());
  if (el.sText.value.trim()) p.set("qtext", el.sText.value.trim());
  condGroups().forEach(([name, g]) => {
    const list = g.getValues();
    if (!list.length) return;
    list.forEach((v) => p.append(name, v)); // 同名パラメータの繰り返し（buildQuery と同じ規約）
    if (g.getMode() === "AND") p.set(name + "_op", "AND"); // ORは既定なので書かない
  });
  if (el.sFormat.value) p.set("format", el.sFormat.value);
  const setKey = GA_CARD_SEARCH.setKeyOf(el.sSet.value);
  if (setKey) p.set("set", setKey);
  if (el.sSort.value && el.sSort.value !== "name") p.set("sort", el.sSort.value);
  if ((el.sOrder.dataset.dir || "ASC") === "DESC") p.set("order", "DESC");
  return p.toString();
}

// U1（連動）: タブを開いたら左ペインをそのタブの条件に戻す。
// ⚠️ 選択肢に無い値・未知のパラメータは黙って無視する（applyUrlQuery と同じ方針）。
function applyCondToForm(cond) {
  const p = new URLSearchParams(cond || "");
  resetSearchForm(); // 前のタブの条件を残さない（updateFilterBadge もここで走る）
  el.sName.value = p.get("q") || "";
  el.sText.value = p.get("qtext") || "";
  condGroups().forEach(([name, g]) => {
    const list = p.getAll(name);
    if (list.length) g.setValues(list);
    g.setMode(p.get(name + "_op") || "OR");
    if (g.getValues().length) g.open = true; // 何で絞られているか一目で分かるよう開く
  });
  const format = p.get("format");
  if (format && hasOption(el.sFormat, format)) el.sFormat.value = format;
  const setIdx = GA_CARD_SEARCH.setIndexOf(p.get("set"));
  if (setIdx) el.sSet.value = setIdx;
  const sort = (p.get("sort") || "").toLowerCase();
  if (sort && hasOption(el.sSort, sort)) el.sSort.value = sort;
  setSearchOrder((p.get("order") || "").toUpperCase());
  updateFilterBadge();
}

// 条件のスナップショットを card-search.js の els の形にする（設計 §7）。
// ⚠️ 共有モジュールが els に求めるのは value / dataset.dir / getValues() / getMode() だけ。
//    ⭐ 値の読み出しにしか使われていないので shared/js/card-search.js は無改修で足りる。
// ⚠️ els.set.value は meta.sets の「添字」（setPrefixes が添字を期待する）。保存は prefix なので
//    ここで setIndexOf() で引き直す。
function condEls(cond) {
  const p = new URLSearchParams(cond || "");
  const group = (name) => ({
    getValues: () => p.getAll(name),
    getMode: () => (p.get(name + "_op") === "AND" ? "AND" : "OR"),
  });
  return {
    name: { value: p.get("q") || "" },
    text: { value: p.get("qtext") || "" },
    cls: group("class"), element: group("element"), type: group("type"),
    subtype: group("subtype"), rarity: group("rarity"),
    format: { value: p.get("format") || "" },
    set: { value: GA_CARD_SEARCH.setIndexOf(p.get("set")) },
    sort: { value: p.get("sort") || "name" },
    order: { dataset: { dir: p.get("order") === "DESC" ? "DESC" : "ASC" } },
  };
}

// 絵柄の追従（#41）に使う条件を、条件のスナップショットから取り出す（設計 §8-1・V22）。
// ⚠️ ⭐ 左ペイン（#s-set / #s-g-rarity）を読まない——読むと「もっと見る」や裏のタブの絵柄が
//    左ペインの「いま」で決まってしまい、P5（レアリティで絵柄が追従しない）が再発する。
// ⚠️ 保存は prefix なので、condEls() と同じく setIndexOf() で添字へ戻してから setPrefixes() を通す
//    （meta.sets の並びに依存する添字は保存しない＝§5-2・#20 と同じ理由）。
function artCondOf(cond) {
  const p = new URLSearchParams(cond || "");
  return {
    prefixes: GA_CARD_SEARCH.setPrefixes(GA_CARD_SEARCH.setIndexOf(p.get("set"))),
    // ⚠️ レアリティを落とさない（P5 はレアリティ側で起きた不具合・設計 §8-1-1 の4）
    rarities: p.getAll("rarity").map(String),
  };
}

// ---------- 条件の箱（設計 §6・T3） ----------
// ⭐ 「検索N の条件」＋2列の表（項目名｜値）。⚠️ 丸ピルにはしない（375px で結果が 583px まで
//    押し下がった＝モック説明 §4-2 の実測）。
// ⚠️ ⭐ 畳みの閾値を持つのはこの2つだけ（設計 §8-4-3・§8-4-3-1）。CSS は renderCondBox() が付けた
//    .cond-extra を隠すだけで行数を書かない——⚠️ style.css へ数値指定を書き戻さないこと。
const COND_FOLD_AT = 4;   // ⭐ これを「超えたら」畳む（＝4項目までは畳まない・設計 §6）
const COND_FOLD_SHOW = 3; // 畳んだときに見せる項目数（⭐ CSS 側に対応する数値は無い）

// チップの日本語名を引く。⚠️ 辞書を持たない——チップ自身（fillChips が作った
// <input value=KEY><span>日本語</span><em>KEY</em>）から読むので、meta の追加に自動で追従する。
// ⚠️ 未知の値（保存が古い・選択肢が消えた）はキーのまま出す（fail-open）。
function chipJpLabel(groupEl, value) {
  if (!groupEl) return String(value);
  const chips = Array.from(groupEl.querySelectorAll('.chip input[type="checkbox"]'));
  const input = chips.find((i) => String(i.value).toUpperCase() === String(value).toUpperCase());
  const chip = input && input.closest(".chip");
  const jp = chip && chip.querySelector("span") ? chip.querySelector("span").textContent.trim() : "";
  return jp || String(value);
}
const optionText = (select, value) => {
  const opt = Array.from(select.options).find((o) => o.value === value);
  return opt ? opt.textContent.trim() : "";
};

// 「並び」の行。⚠️ 並び替えの表示名も辞書を持たず <select> の選択肢から引く（選択肢を足した日に
//    ここだけ英字のまま残るのを防ぐ）。昇降順の文言は orderLabel() と共通。
function condSortText(cond) {
  const p = new URLSearchParams(cond || "");
  const sort = p.get("sort") || "name";
  return `${optionText(el.sSort, sort) || sort} ${orderLabel(p.get("order"))}`;
}

// 条件を [項目名, 値] の並びにする。⭐ 「並び」は常に最後の行（設計 §6）。
// ⚠️ 絞り込みが1つも無いときだけ「絞り込み｜なし（全カード）」を先頭に置く。
function condRows(cond) {
  const p = new URLSearchParams(cond || "");
  const rows = [];
  if (p.get("q")) rows.push(["カード名", `「${p.get("q")}」`]);
  if (p.get("qtext")) rows.push(["効果", `「${p.get("qtext")}」`]);
  condGroups().forEach(([name, g]) => {
    const list = p.getAll(name);
    if (!list.length) return;
    const and = p.get(name + "_op") === "AND";
    const flabel = g.querySelector(".flabel");
    const label = (flabel ? flabel.textContent.trim() : name)
      // ⭐ 2つ以上のときだけ「（いずれか）／（すべて）」を添える（1つなら AND/OR に差が無い）
      + (list.length > 1 ? (and ? "（すべて）" : "（いずれか）") : "");
    rows.push([label, list.map((v) => chipJpLabel(g, v)).join(and ? " かつ " : "・")]);
  });
  // フォーマット・エキスパンションは <select> の選択肢の表示名（設計 §6）。
  // ⚠️ エキスパンションの保存は prefix なので、添字へ引き直してから選択肢を探す（§5-2）
  if (p.get("format")) rows.push(["フォーマット", optionText(el.sFormat, p.get("format")) || p.get("format")]);
  if (p.get("set")) {
    const idx = GA_CARD_SEARCH.setIndexOf(p.get("set"));
    rows.push(["エキスパンション", (idx && optionText(el.sSet, idx)) || p.get("set")]);
  }
  if (!rows.length) rows.push(["絞り込み", "なし（全カード）"]);
  rows.push(["並び", condSortText(cond)]);
  return rows;
}

// タブの title（マウスオーバーの説明）に入れる1行要約（設計 §6）
const condSummary = (cond) => condRows(cond).map(([k, v]) => `${k}: ${v}`).join(" / ");

// 結果パネルの先頭に、いまパネルを持っているタブ（activeSearchTab）の条件を描く。
// ⚠️ 持ち主がいなければ箱ごと隠す（固定タブを見ている間・全部閉じた後）。
// ⚠️ ⭐ 呼び出しは syncSearchTabSelection() の1か所に集約している（そこを通らずに
//    条件・持ち主が変わる経路を作らないこと）。
function renderCondBox() {
  const tab = activeSearchTab;
  el.resultCond.hidden = !tab;
  if (!tab) return;
  el.resultCondTitle.textContent = `検索${tab.n} の条件`;
  const rows = condRows(tab.cond);
  const foldable = rows.length > COND_FOLD_AT;
  el.resultCondList.textContent = "";
  rows.forEach(([k, v], i) => {
    const dt = document.createElement("dt");
    dt.textContent = k;
    const dd = document.createElement("dd");
    dd.textContent = v;
    if (k === "絞り込み") dd.className = "cond-none";
    // ⭐ 畳んだときに隠れる行にだけ印を付ける（設計 §8-4-3）。
    //    ⚠️ ⭐ style.css には行数を書かない——CSS は .cond-extra を隠すだけ。
    //       こうしないと「CSS の順番指定」と COND_FOLD_SHOW の二重管理になり、
    //       片方だけ動かすと「ほか N 項目」の N と実際に隠れている行数がずれる（レビュー T3 S-2）。
    if (foldable && i >= COND_FOLD_SHOW) { dt.classList.add("cond-extra"); dd.classList.add("cond-extra"); }
    el.resultCondList.append(dt, dd);
  });
  // ⭐ 開閉はタブごとに覚える（tab.open。localStorage にも入る＝T2 が枠を作ってある・§5-1）
  el.resultCond.classList.toggle("is-folded", foldable && !tab.open);
  el.resultCondMore.hidden = !foldable;
  el.resultCondMore.setAttribute("aria-expanded", String(foldable && !!tab.open));
  // ⚠️ ⭐ 畳めないときは文言を組み立てない（設計 §8-4-2 の2・V17-b）。
  //    旧実装は rows.length - COND_FOLD_SHOW をそのまま書いたので、2〜4項目のタブでは
  //    「▾ すべて表示（ほか -1 項目）」という出るはずのない文字列が hidden の裏に残っていた。
  //    ⚠️ hidden に頼らない・0 下限で誤魔化さない——**持たせない**のが正
  //    （T4 は hidden の扱いを作り直す単位なので、1つ間違えた瞬間に画面へ出る）。
  el.resultCondMore.textContent = !foldable ? ""
    : (tab.open ? "▴ 畳む" : `▾ すべて表示（ほか ${rows.length - COND_FOLD_SHOW} 項目）`);
}

el.resultCondMore.addEventListener("click", () => {
  if (!activeSearchTab) return;
  activeSearchTab.open = !activeSearchTab.open;
  renderCondBox();
  saveSearchTabs(); // ⭐ 開閉も保存する（リロードで戻る・§5-1）
});

// タブ1つ分の検索コントローラ。⚠️ els は作った時点の条件で固定される（それが目的）。
// 条件が変わったとき（並び替えのその場更新）は作り直す＝ tab.ctl を差し替える。
// ⚠️ 差し替え前のコントローラの結果が後から届くことがあるので、必ず tab.ctl === ctl を見る。
function makeSearchCtl(tab) {
  let ctl = null;
  // ⭐ 絵柄の追従（#41・V22）に使う条件も els と同じく「作った時点の条件」で固定する。
  //    ⚠️ tab.cond が変わるのは updateActiveSearchTab() だけで、そこは ctl も作り直す＝必ず一致する。
  const artCond = artCondOf(tab.cond);
  // 結果パネルは1組しかないので、描画してよいのは「今パネルを持っているタブ」だけ。
  // ⚠️ 表示中でなくなっていたら破棄して loaded を落とす（次に開いたときに取り直す）。
  //    ⭐ こうしておくと searchStatusText()/appendResults() の描画先を引数化しなくて済む
  //       （＝設計 §8-2・§8-3 は T5 のまま触らない）。
  const mine = () => tab.ctl === ctl && tab === activeSearchTab;
  ctl = GA_CARD_SEARCH.create({
    els: condEls(tab.cond),
    pageSize: 24,
    jpPageSize: 24,
    metaIndexUrl: "../../data/card-meta-index.json", // JP検索の取得前フィルタ用メタ索引(#27)
    effectsUrl: TL_EFFECTS_URL, // 効果欄に日本語が入ったときだけ取得する訳データ(#22)
    fetchCard: getCard,
    onStart: (reset) => {
      if (!mine()) return;
      if (reset) {
        el.resultGrid.innerHTML = "";
        // ⭐ 検索のたびにタブ帯の上端までページを送る（設計 §8-7・§8-7-1）。
        //    ⚠️ 旧 openModal(el.resultModal) の置き換え（結果はモーダルではなく右列のタブ面になった）。
        sendPageToTabs();
      }
      tab.statusText = "検索中…";
      el.resultCount.textContent = tab.statusText;
      el.resultMore.disabled = true;
    },
    // 数値ソートは絞り込み結果を全件取ってからローカルで並べる(#44)。絞り込みなしだと
    // 45リクエスト＝約18秒かかるため、無言で待たせず取得済みページ数を出す
    onProgress: ({ done, total }) => {
      if (!mine()) return;
      tab.statusText = `読み込み中 ${done}/${total} ページ…`;
      el.resultCount.textContent = tab.statusText;
    },
    onResults: (cards, info) => {
      cards.forEach((card) => { cardCache.set(card.slug, Promise.resolve(card)); });
      if (!mine()) { tab.loaded = false; return; }
      appendResults(cards, info, artCond); // ⭐ 左ペインではなくこのタブの条件で絵柄を選ぶ（§8-1）
      updateElementWarn(info); // 表示中のタブの結果のときだけ（設計 §8-3）
      tab.statusText = searchStatusText(info);
      tab.hasMore = !!info.hasMore;
      tab.loaded = true;
      el.resultCount.textContent = tab.statusText;
      el.resultMore.hidden = !tab.hasMore;
      el.resultMore.disabled = false;
    },
    onError: (err) => {
      if (!mine()) { tab.loaded = false; return; }
      tab.statusText = `検索に失敗しました(${err.message})`;
      el.resultCount.textContent = tab.statusText;
      el.resultMore.disabled = false;
    },
  });
  return ctl;
}

// ---------- タブ帯（設計 §4） ----------

// 検索タブは「ラベルのボタン（role=tab）＋ ×」の組。⚠️ ボタンの中にボタンは置けないので兄弟にする。
// ⚠️ 作り直すのはタブが増減したときだけ（選択の切り替えでは作り直さない＝キーボードの
//    フォーカスが飛ばないようにするため）。
function renderSearchTabs() {
  if (!el.edTabsScroll) return;
  el.edTabsScroll.textContent = "";
  searchTabs.forEach((tab) => {
    const item = document.createElement("div");
    item.className = "tab-item";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = `ed-tab-search-${tab.id}`;
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-controls", "ed-pane-search"); // ⭐ 共有パネル（設計 §8-4-1 の2）
    btn.setAttribute("aria-selected", "false");
    btn.textContent = `検索${tab.n}`;
    btn.addEventListener("click", () => selectSearchTab(tab));
    const close = document.createElement("button");
    close.type = "button";
    close.className = "tab-close";
    close.setAttribute("aria-label", `「検索${tab.n}」を閉じる`);
    close.textContent = "×";
    close.addEventListener("click", (e) => { e.stopPropagation(); closeSearchTab(tab); });
    item.append(btn, close);
    tab.btn = btn;
    tab.item = item;
    el.edTabsScroll.appendChild(item);
  });
  el.edTabsSep.hidden = searchTabs.length === 0; // 検索タブが無ければ区切り線も出さない
  syncSearchTabSelection();
  updateTabsFade();
}

// aria-selected と見た目（.on）を1か所で書く。⚠️ 帯の中で true は常にちょうど1つ
// （固定2つのどちらか、または検索タブ1つ）。
function syncSearchTabSelection() {
  searchTabs.forEach((tab) => {
    const on = tab === selectedSearchTab;
    if (tab.btn) tab.btn.setAttribute("aria-selected", String(on));
    if (tab.item) tab.item.classList.toggle("on", on);
    // タブの title は条件の1行要約（設計 §6）。⚠️ 作るときではなくここで書く——
    //    並び替えのその場更新（updateActiveSearchTab）で cond が変わってもタブは作り直さないため
    if (tab.btn) tab.btn.title = condSummary(tab.cond);
  });
  if (editorTabs) {
    if (selectedSearchTab) editorTabs.deselect();
    else editorTabs.syncFixed();
    // ⭐ 面は3つ（デッキ・統計・検索結果）のうち1つだけを出す（設計 §8-4-1 の4）。
    //    ⚠️ 固定タブの面を出したまま結果パネルも出すと、右列がデッキの下に検索結果が続く
    //       長いページになり、タブの意味が無くなる。
    editorTabs.syncPanes(!selectedSearchTab);
  }
  // ⚠️ 結果パネルは1つを共有して中身を差し替える（§8-4-1 の2・3）。
  //    ⭐ そのため aria-labelledby は固定にできない——表示中の検索タブのボタン id に切り替える。
  //    ⚠️ 固定しておくと、別のタブを見ているのに「検索1」と読み上げられる。
  el.resultPane.hidden = !selectedSearchTab;
  if (selectedSearchTab && selectedSearchTab.btn) {
    el.resultPane.setAttribute("aria-labelledby", selectedSearchTab.btn.id);
  } else {
    // ⚠️ 閉じたタブのボタン id を指したまま残さない（DOM から消えた要素を指す idref になる）
    el.resultPane.removeAttribute("aria-labelledby");
  }
  // ⭐ 条件の箱もここで描き直す（設計 §6・T3）。⚠️ この関数は タブの増減（renderSearchTabs）・
  //    タブの切り替え（selectSearchTab）・並び替えのその場更新（updateActiveSearchTab）の
  //    すべてが通る唯一の合流点なので、箱の描き直しを各所に散らさない。
  renderCondBox();
}

// 続きがある側の端をぼかす（設計 §4-3）
function updateTabsFade() {
  const box = el.edTabsScroll;
  if (!box) return;
  const max = box.scrollWidth - box.clientWidth;
  box.classList.toggle("fade-l", box.scrollLeft > 1);
  box.classList.toggle("fade-r", max > 1 && box.scrollLeft < max - 1);
}

// 検索したときのページ位置（設計 §8-7・§8-7-1）。
// ⭐ 送り先の基準は「タブ帯の上端」に固定する。
// ⚠️ ⭐ 条件の箱や結果タイルの先頭を基準にしない——箱の高さは条件の数と幅で変わり
//    （§6-2: 375px で畳んで 108〜211px・開いて 510px）、送り先が 100px 以上ずれる。
// ⚠️ 「箱の高さぶん送る」式を定数で書かない（211px でも 510px でもない値になる・§8-7-1）。
function sendPageToTabs() {
  const band = document.querySelector("#view-editor .deck-tabs");
  if (!band || !band.getClientRects().length) return;
  const top = band.getBoundingClientRect().top;
  // 1200px以上: タブ帯が画面の上半分に見えているならページを動かさない（§8-7・V16）。
  //    ⭐ 左ペインは sticky なのでページのどこからでも検索できる＝送る必要が無い。
  if (matchMedia(`(min-width: ${PANE_MIN_WIDTH}px)`).matches && top >= 0 && top <= window.innerHeight / 2) return;
  // 編集バーが sticky のときは、その高さぶん手前で止める（帯がバーの下に潜らないように）。
  // ⚠️ 画面幅で分岐しない——position を実測する（CSS 側で sticky になる条件が動いても追従する）。
  const bar = document.querySelector("#view-editor .editor-bar");
  const off = bar && getComputedStyle(bar).position === "sticky" ? bar.getBoundingClientRect().height : 0;
  window.scrollTo({ top: Math.max(0, Math.round(window.scrollY + top - off)) });
}

// 新しいタブの位置は右端。⚠️ 帯を横に送って見える位置へ（ページは縦に動かさない）
function scrollTabIntoView(tab) {
  if (!tab || !tab.btn || !el.edTabsScroll) return;
  const box = el.edTabsScroll;
  const left = tab.item.offsetLeft;
  const right = left + tab.item.offsetWidth;
  if (left < box.scrollLeft) box.scrollLeft = left;
  else if (right > box.scrollLeft + box.clientWidth) box.scrollLeft = right - box.clientWidth;
  updateTabsFade();
}

// タブを1つ作る。⭐ 6個目を作ったら「作った順でいちばん古いタブ」を閉じる（②・設計 §4-2）
function addSearchTab(cond) {
  const tab = {
    id: ++searchTabSeq,
    n: nextSearchN++,      // ⭐ 上限を超えても続ける（検索3〜検索7 のようになる）
    cond,
    open: false,           // 条件の箱の開閉（T3 で使う。保存の形をここで確定させておく）
    statusText: "",
    hasMore: false,
    loaded: false,
  };
  tab.ctl = makeSearchCtl(tab);
  tab.holder = document.createElement("div"); // 表示していない間のタイルの置き場（DOM外）
  searchTabs.push(tab);
  let evicted = null;
  if (searchTabs.length > SEARCH_TAB_MAX) {
    evicted = searchTabs.shift();
    if (evicted === activeSearchTab) activeSearchTab = null;
    if (evicted === selectedSearchTab) selectedSearchTab = null;
  }
  renderSearchTabs();
  if (evicted) showToast(`タブは5つまでです — いちばん古い「検索${evicted.n}」を閉じました`);
  return tab;
}

// ⭐ タイルの「n枚」バッジと追加行を、いまのデッキの中身で描き直す（設計 §5-1-1・V7）。
// ⚠️ ⭐ 描き直すのは **バッジと追加行の2つだけ**。画像・🎨（版）・🔄（表裏）・dataset.artUrl は
//    触らない——タイルを作り直すと、ユーザーが 🎨 で選んだ版が勝手に戻る（別の無言の劣化・V7-c）。
// ⚠️ ⭐ ネットワークを発生させない。`getCard()` ではなくキャッシュを直接見て、
//    未取得の slug はそのタイルだけ飛ばす（fail-open。1枚の失敗で帯ごと壊さない）。
// ⚠️ ⭐ 呼ぶのは selectSearchTab() から「毎回」。⚠️ restoreTiles() の直後だけに置くと、
//    「検索1 → 🃏デッキでゾーンの − → 検索1」の経路（activeSearchTab が変わらない）で
//    古い枚数が残る（設計 §5-1-1 の「2つ目の経路」・V7-b）。
function refreshResultTiles() {
  if (!deckData || !Array.isArray(deckData.cards)) return;
  Array.from(el.resultGrid.querySelectorAll(".result")).forEach((item) => {
    const slug = item.dataset.slug;
    if (!slug) return;
    updateResultBadge(item, slug); // 「n枚」バッジ（deckData だけで決まる）
    if (!cardCache.has(slug)) return; // ⚠️ ここで取得しない（キャッシュに無ければ追加行は据え置く）
    cardCache.get(slug).then((card) => {
      // ⚠️ 解決を待つ間にタブが切り替わっていたら触らない（退避した holder の中身は次回描き直す）
      if (card && item.isConnected) renderAddRow(item, card);
    }).catch(() => { /* fail-open: その1枚だけ描き直さない */ });
  });
}

// 結果パネルの中身を空にする（設計 §8-4-2 の1・V25-b）。
// ⚠️ ⭐ タイルだけ消して件数を残さないこと——右列に常時出るようになったので、
//    「1枚も出ていないのに『18 件を表示』」がそのまま見える（モーダルの裏だった間は見えなかった）。
function clearResultPane() {
  el.resultGrid.textContent = "";
  el.resultCount.textContent = "";
  el.resultMore.hidden = true;
  el.resultMore.disabled = false;
}

// 表示していないタブのタイルはDOM外の holder に退避する（切り替えで再検索しないため・§5-1）
function stashTiles(tab) {
  if (!tab || !tab.holder) return;
  while (el.resultGrid.firstChild) tab.holder.appendChild(el.resultGrid.firstChild);
}
function restoreTiles(tab) {
  el.resultGrid.textContent = "";
  if (!tab || !tab.holder) return;
  while (tab.holder.firstChild) el.resultGrid.appendChild(tab.holder.firstChild);
}

// タブを開く。⭐ 同じページを開いている間は取得済みのタイルを出し入れするだけで再検索しない（§5-1）。
// ⚠️ 復元直後など、まだ結果を持たないタブ（loaded=false）はここで初めて検索する（§5-3）。
function selectSearchTab(tab) {
  if (!tab || searchTabs.indexOf(tab) < 0) return;
  if (activeSearchTab !== tab) {
    stashTiles(activeSearchTab);
    activeSearchTab = tab;
    restoreTiles(tab);
  }
  selectedSearchTab = tab;
  syncSearchTabSelection();
  applyCondToForm(tab.cond); // U1（連動）
  // ⭐ タブを表示するたびに、タイルの「n枚」バッジと追加行をいまのデッキの中身で描き直す
  //    （設計 §5-1-1・V7 / V7-b）。⚠️ 上の restoreTiles() の中でも if の外でもなく、
  //    「毎回ここを通る」位置に置くこと（同じタブを開き直す経路を落とさないため）。
  refreshResultTiles();
  el.resultCount.textContent = tab.statusText || "";
  el.resultMore.hidden = !tab.hasMore;
  el.resultMore.disabled = false;
  // ⚠️ パネルの表示・非表示は syncSearchTabSelection() が1か所で決める（上で通っている）
  scrollTabIntoView(tab);
  saveSearchTabs();
  if (!tab.loaded) tab.ctl.run(true);
}

// × で閉じる。⭐ **「表示中のタブ」＝帯で aria-selected="true" のタブ**（`selectedSearchTab`。設計 §4-2-1）。
//   - 表示中の検索タブを × … 右隣 → 無ければ左隣 → 無ければデッキタブ（§4-2）
//   - ⚠️ ⭐ 固定タブ（🃏/📊）を見ている間に裏の検索タブを × … **見ている面を変えない**
//     （結果パネルを開かない・ほかの検索タブへ移らない・**最後の1つでもデッキタブへ飛ばさない**）。
//     ⭐ 裏のタブを閉じる操作が、見ている面を奪ってはいけない（ブラウザのタブと同じ原則）。
//     ⚠️ T4 で結果パネルが右列へ移ると、ここを間違えていると「デッキを見ていたのに
//        検索結果の面へ飛ばされる」になる（レビュー S1・V3-b）。
function closeSearchTab(tab) {
  const i = searchTabs.indexOf(tab);
  if (i < 0) return;
  const wasSelected = tab === selectedSearchTab; // ⭐ これが「表示中」の定義（§4-2-1）
  const wasActive = tab === activeSearchTab;     // 結果パネルの持ち主か（見ている面とは別）
  searchTabs.splice(i, 1);
  // 持ち主だったタブのタイル・件数・「もっと見る」は捨てる。⚠️ 見ている面が固定タブなら、それ以上は何もしない。
  // ⚠️ ⭐ 件数を消し忘れると「1枚も出ていないのに『18 件を表示』」が右列に残る
  //    （設計 §8-4-2 の1・V25-b。⭐ モーダルの裏だった間は見えなかった）
  if (wasActive) { activeSearchTab = null; clearResultPane(); }
  if (wasSelected) selectedSearchTab = null;
  if (!searchTabs.length) nextSearchN = 1; // U3: 全部閉じたら「検索1」に戻す
  const next = wasSelected ? (searchTabs[i] || searchTabs[i - 1] || null) : null;
  renderSearchTabs();
  if (wasSelected) {
    if (next) { selectSearchTab(next); return; }
    if (editorTabs) editorTabs.reset(); // 行き先が無ければデッキタブ（パネルは reset() 経由で hidden になる）
  }
  saveSearchTabs();
}

// 🔍検索 / Enter。⭐ タブを増やすのはこれだけ（設計 §2-3）
function runNewSearchTab() {
  const tab = addSearchTab(condFromForm());
  selectSearchTab(tab); // U5: そのタブへ切り替える。loaded=false なので検索が走る
}

// 並び替え・昇降順。⭐ 表示中の検索タブをその場で更新する（タブは増やさない・設計 §2-3）。
// ⚠️ 検索タブが1つも無い状態では新しいタブができる（＝今までの「空条件の検索が走る」を踏襲・V9）
function updateActiveSearchTab() {
  const tab = activeSearchTab;
  if (!tab) { runNewSearchTab(); return; }
  tab.cond = condFromForm();
  tab.ctl = makeSearchCtl(tab); // ⚠️ 条件が変わったので作り直す（els は作成時に固定される）
  tab.loaded = false;
  selectedSearchTab = tab;
  syncSearchTabSelection(); // ⭐ ここでパネルが表示状態になる（旧 openModal の置き換え）
  el.resultGrid.textContent = "";
  saveSearchTabs();
  tab.ctl.run(true);
}

// ---------- タブの保存（①B・localStorage。設計 §5-2） ----------
// ⚠️ ⭐ 保存できない環境（プライベートウィンドウ等）では、その場限りのタブとして動く
//    （fail-open。例外は握りつぶして続行する）。

function searchTabsKeyOf(deckId) { return SEARCH_TABS_KEY + deckId; }

// デッキを消しても保存が残るので、最近の N デッキ分だけ残す（§5-2）
function pruneSearchTabsStore() {
  const rows = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(SEARCH_TABS_KEY)) continue;
    let at = 0;
    try { at = Number(JSON.parse(localStorage.getItem(k) || "{}").at) || 0; } catch { at = 0; }
    rows.push({ k, at });
  }
  if (rows.length <= SEARCH_TABS_KEEP_DECKS) return;
  rows.sort((a, b) => b.at - a.at);
  rows.slice(SEARCH_TABS_KEEP_DECKS).forEach((r) => localStorage.removeItem(r.k));
}

function saveSearchTabs() {
  if (!searchTabsDeckId) return;
  try {
    const key = searchTabsKeyOf(searchTabsDeckId);
    if (!searchTabs.length) { localStorage.removeItem(key); return; }
    // ⭐ 保存するのは「条件」と「連番」と「最後に見ていたタブ」だけ。カードの配列は保存しない
    //    （禁止改定・新セットで古くなる／容量を食う・設計 §1 やらないこと4）
    localStorage.setItem(key, JSON.stringify({
      at: Date.now(),
      nextN: nextSearchN,
      active: selectedSearchTab ? selectedSearchTab.n : (editorTabs && editorTabs.isStats() ? "stats" : "deck"),
      tabs: searchTabs.map((t) => ({ n: t.n, cond: t.cond, open: !!t.open })),
    }));
    pruneSearchTabsStore();
  } catch { /* fail-open: 保存できなくてもその場限りのタブとして動き続ける */ }
}

// デッキを切り替えるときは前のデッキのタブを持ち越さない（U2＝デッキごと）。
// ⚠️ ここで保存を書かない——保存先は「今開いているデッキ」のキーなので、消しに行くと
//    前のデッキの保存を消してしまう
function clearSearchTabs() {
  searchTabs = [];
  activeSearchTab = null;
  selectedSearchTab = null;
  nextSearchN = 1;
  searchTabsDeckId = null;
  clearResultPane();
  renderSearchTabs(); // ⭐ この中の syncSearchTabSelection() がパネルを hidden に戻す
}

// リロード後（U4）: 保存からタブを復元し、最後に見ていたタブを開いてそのタブだけ再検索する。
// ほかのタブは押したときに検索する（それまでリクエストを投げない・§5-3）
function loadSearchTabs(deckId) {
  clearSearchTabs();
  searchTabsDeckId = deckId;
  let data = null;
  try { data = JSON.parse(localStorage.getItem(searchTabsKeyOf(deckId)) || "null"); } catch { data = null; }
  const rows = data && Array.isArray(data.tabs) ? data.tabs.slice(-SEARCH_TAB_MAX) : [];
  rows.forEach((row) => {
    const n = Number(row && row.n);
    if (!Number.isFinite(n) || n < 1) return;
    const tab = {
      id: ++searchTabSeq, n, cond: String((row && row.cond) || ""), open: !!(row && row.open),
      statusText: "", hasMore: false, loaded: false, holder: document.createElement("div"),
    };
    tab.ctl = makeSearchCtl(tab);
    searchTabs.push(tab);
  });
  const savedNext = Number(data && data.nextN);
  const maxN = searchTabs.reduce((m, t) => Math.max(m, t.n), 0);
  nextSearchN = Number.isFinite(savedNext) && savedNext > maxN ? savedNext : maxN + 1;
  renderSearchTabs();
  const active = data ? data.active : null;
  if (typeof active === "number") {
    const tab = searchTabs.find((t) => t.n === active);
    if (tab) { selectSearchTab(tab); return; } // ⭐ このタブだけ再検索する
  }
  if (active === "stats" && editorTabs) editorTabs.select(true);
}

// エレメントANDで0件が確定する組み合わせの注意書き(#31)。
// ⚠️ ⭐ 旧コメントの前提「結果ダイアログが検索フォームを覆う」は T4 で消えた（結果はモーダルではなく
//    右列の3つ目の面＝#ed-pane-search になった）。⭐ いまの役割は次の2つ:
//    ① 文言は結果パネルの件数欄にも出す（searchStatusText）——そちらが検索直後に目に入る
//    ② ここでは絞り込み側にも警告を残す（スマホでは絞り込み自体が畳まれているので開く）。
// ⚠️ 呼び出しは onResults の mine() ガードの内側だけ＝表示中のタブの結果のときだけ（設計 §8-3）。
function updateElementWarn(info) {
  const warn = el.sGElement.warnEl;
  if (!warn) return;
  const blocked = info.blocked === "element-and";
  warn.hidden = !blocked;
  if (blocked) {
    warn.textContent = `⚠️ ${GA_CARD_SEARCH.ELEMENT_AND_MESSAGE}`;
    el.sGElement.open = true;
    el.searchTop.classList.add("filters-open"); // スマホでは絞り込み自体が畳まれているため開く
    el.sToggle.setAttribute("aria-expanded", "true");
    el.sToggleLabel.textContent = "絞り込み ▲";
  }
}

// 結果ダイアログの件数表示。AND指定・日本語モードでは客側で後段フィルタが入るため、
// 総件数を正確に出せないことがある(#31 変更6)。
function searchStatusText(info) {
  const shown = el.resultGrid.childElementCount;
  if (info.blocked === "element-and") return GA_CARD_SEARCH.ELEMENT_AND_MESSAGE;
  if (shown === 0) {
    // AND条件は取得済みのページに対して適用するため、このページに1件も残らないことがある。
    // 続きのページに該当が残っている場合は「もっと見る」で続けられる
    if (info.hasMore) {
      // 日本語には一致していて、絞り込みで落ちている場合は「あと何件確認すれば終わるか」を出す。
      // ⚠ 候補を自動で追い掛けない（0件の間だけ次ページを取る案は明示的に不採用）
      if (info.jpMode && info.jpMatched > 0 && info.jpFiltered) {
        return `候補 ${info.total} 件のうち ${info.jpChecked} 件を確認しましたが、絞り込み条件に合うカードはまだありません。「もっと見る」で続きを確認できます。`;
      }
      return "このページには該当がありませんでした。「もっと見る」で続きを検索できます。";
    }
    // 日本語には一致したのに、数値項目の並び替えでその項目を持つカードが0件になった場合(#43)。
    // 従来の文言だと「一致しなかった」と嘘になり、原因(並び替え)が画面のどこにも出ない
    if (info.jpMode && info.numericSort && info.jpMatched > 0) {
      const lbl = GA_CARD_SEARCH.numericSortLabel?.(info.numericSort) || "";
      return `日本語テキストには一致しましたが、${lbl}を持つカードはありませんでした（並び替えを「名前順」に戻すと表示できます）。`;
    }
    // 日本語には一致したのに、絞り込み条件で全部落ちた場合。従来の文言だと「一致しなかった」と
    // 嘘になり、「英語で検索し直す」という的外れな行動に誘導してしまう
    if (info.jpMode && info.jpMatched > 0 && info.jpFiltered) {
      return "日本語テキストには一致しましたが、絞り込み条件に合うカードはありませんでした（絞り込みを外すと表示できます）。";
    }
    // 日本語に一致し、絞り込みも1つも無いのに0件＝候補を1件も取得できなかったときだけ。
    // ⚠ ここで上の「絞り込みを外すと表示できます」を出すと、外す絞り込みが無いので新しい嘘になる
    if (info.jpMode && info.jpMatched > 0) {
      return "日本語テキストには一致しましたが、カード情報を取得できませんでした（時間をおいて再度お試しください）。";
    }
    return info.jpMode
      ? "日本語テキストに一致する翻訳済みカードが見つかりませんでした（未翻訳のカードは日本語検索できません。英語での検索もお試しください）。"
      : "該当するカードがありません。条件を変えてお試しください。";
  }
  const totalPart = !info.approxTotal && info.total > shown ? ` / 全 ${info.total} 件` : "";
  let suffix = info.jpMode ? "（日本語一致・翻訳済みのみ）" : "";
  // 数値項目の並び替えは、その項目を持たないカードを除くので総件数が減る(#39)。理由を添える
  // ?. は push直後の伝播ラグ対策（新しい app.js と古い card-search.js が数十秒だけ組み合わさる）
  suffix += GA_CARD_SEARCH.numericSortNote?.(info.numericSort) || "";
  // JPモードの並び替えキーが取れなかった/一部欠けたときの注記(#43)
  suffix += GA_CARD_SEARCH.jpSortNote?.(info) || "";
  // 取得後に落ちた件数の注記(#45)。フリップ面を畳んだあとは「出たら異常」の信号
  suffix += GA_CARD_SEARCH.jpDropNote?.(info) || "";
  // 数値ソートの全件取得がAPIの申告件数と食い違ったときの注記(#44)。これも「出たら異常」の信号
  suffix += GA_CARD_SEARCH.fetchGapNote?.(info) || "";
  if (info.approxTotal) {
    // JPモードは索引で取得前に絞るためANDでも件数を出せる。概算になるのは索引が使えないときだけ(#27)
    suffix += info.jpMode
      ? "（一部のカードは取得後に判定するため総件数は概算です）"
      : "（AND条件などは取得済みのページに適用するため、総件数は表示できません）";
  }
  return `${shown} 件を表示${totalPart}${suffix}`;
}

// デッキ全体(全ゾーン)での投入枚数(ダイアログのバッジ用)
function totalQtyInDeck(slug) {
  return deckData.cards.filter((c) => c.card_slug === slug).reduce((s, c) => s + c.qty, 0);
}

// 検索結果1件の追加ボタン行。入っているゾーンは「− n ＋」のミニステッパーになる
function renderAddRow(item, card) {
  const row = item.querySelector(".addrow");
  // このデッキのフォーマットで使うゾーンだけを出す(#4)
  row.innerHTML = activeZones(deckFormat()).map((zone) => {
    const disallowed = zoneDisallowed(card, zone);
    const entry = findEntry(card.slug, zone);
    if (entry) {
      return `
        <div class="cellstep" data-zone="${zone}">
          <span class="cs-label">${ZONE_SHORT[zone]}</span>
          <span class="cs-ctrl">
            <button data-dec="${zone}" aria-label="${ZONE_SHORT[zone]}から1枚減らす">−</button>
            <input class="cs-input" type="number" inputmode="numeric" min="0" max="99" value="${entry.qty}" data-zone="${zone}" aria-label="${ZONE_SHORT[zone]}の枚数を直接入力">
            <button data-target="${zone}" aria-label="${ZONE_SHORT[zone]}に1枚追加">＋</button>
          </span>
        </div>`;
    }
    const cls = zone === "main" ? ' class="primary-zone"' : "";
    const dis = disallowed ? ` disabled title="このカードは${ZONE_LABEL[zone]}に入れられません"` : "";
    return `<button data-target="${zone}"${cls}${dis}>＋${ZONE_SHORT[zone]}</button>`;
  }).join("");
}

// エキスパンション(版)・レアリティで絞り込み検索している場合、その版のイラストを初期表示にする(#41)。
// 絞り込みが無い、または一致する版が無い場合は先頭(imgs[0])にフォールバック。
// トップページの app.js の preferredArtIndex() と同じ規則。参照する要素だけが違う。
// ⚠️ レアリティを見ないと「レアリティで絞ってもタイルの絵柄が追従しない」（2026-09-03 に
//    ユーザーが実物を触って見つけた不具合 P5 と同じものが、ここで再発する）。
// ⚠️ ⭐ artCond は artCondOf() が作る「そのタブの条件」（設計 §8-1・V22）。⚠️ 左ペインを見ない——
//    見ると「もっと見る」の続きや裏のタブの絵柄が、左ペインの「いま」で決まってしまう。
// ⚠️ この関数はトップと二重定義。片方だけ直すと画面によって別の絵柄が出る（左ペイン化_設計 §10-1）
//    ⭐ 二重定義の解消は別タスク（検索結果のタブ化_設計 §11-2）——トップ側は引数化していない。
function preferredArtIndex(imgs, artCond) {
  const pre = (artCond && artCond.prefixes) || [];
  const rar = (artCond && artCond.rarities) || [];
  if (!pre.length && !rar.length) return 0;
  const idx = imgs.findIndex((im) =>
    (!pre.length || pre.includes(im.prefix)) &&
    (!rar.length || (im.rarity != null && rar.includes(String(im.rarity)))));
  return idx >= 0 ? idx : 0;
}

function updateResultBadge(item, slug) {
  const badge = item.querySelector(".in-deck");
  const n = totalQtyInDeck(slug);
  badge.textContent = `${n}枚`;
  badge.hidden = n === 0;
}

// info は検索コントローラが渡すメタ情報。裏面だけが一致したカードの注記(#46)に使う。
// ⚠️ ⭐ artCond は「この結果を出したタブの条件」（makeSearchCtl が作成時に固定したもの・設計 §8-1）。
//    ⚠️ 左ペインから取り直さないこと——それが V22（絵柄の追従）の不具合そのもの。
function appendResults(cards, info, artCond) {
  const frag = document.createDocumentFragment();
  cards.forEach((card) => {
    const imgs = cardImages(card);
    const initialAi = preferredArtIndex(imgs, artCond);
    const back = backFace(card); // 両面カードなら裏面(無ければ null)
    // 日本語検索で「裏面だけが一致した」カード(#46)。検索語がタイルのどこにも出ないため、
    // 名前の下に裏面名の行を足し、画像も最初から裏面で開く。
    // ⚠ カードオブジェクトではなく info 側のマップで受け取る(getCard の結果はキャッシュされる)
    const hitSlug = info && info.jpBackHit ? info.jpBackHit[card.slug] : null;
    const backHit = !!(hitSlug && back);
    // その版に裏面画像が無ければ表面のまま開く(注記だけ出す・fail-open)
    const startBack = !!(backHit && imgs[initialAi] && imgs[initialAi].back);
    const url = imgs.length ? (startBack ? imgs[initialAi].back : imgs[initialAi].url) : null;
    const backName = backHit ? jpName(back) : "";
    const item = document.createElement("div");
    item.className = "result";
    item.dataset.slug = card.slug;
    // 絞り込みで選ばれた版を、🎨 で切り替えたときと同じ扱いで保持する(#41)。
    // ⚠ 絞り込みが無いときは imgs[initialAi] === imgs[0] === imageUrl(card) なので、
    //   追加時の判定(下の artUrl !== imageUrl(card))で art=null に落ち、従来と同じ挙動になる。
    if (imgs.length) item.dataset.artUrl = imgs[initialAi].url;
    const inDeck = totalQtyInDeck(card.slug);
    item.innerHTML = `
      <div class="cardph">
        ${url ? `<img loading="lazy" src="${escapeHtml(url)}" alt="">` : `<div class="noimg">${escapeHtml(jpName(card))}</div>`}
        <div class="badges-bl">
          ${formatBadgeHtml(card)}
          ${seasonalBadgeHtml(card)}
          ${url && back ? `<button class="flip-badge" type="button" title="両面カード：表裏を切り替え" aria-label="${startBack ? "表面を表示" : "裏面を表示"}">${startBack ? "🔄 裏面" : "🔄 両面"}</button>` : ""}
          ${url && imgs.length > 1 ? `<button class="art-badge" type="button" title="イラスト/版を切り替え（${imgs.length}種）" aria-label="イラストを切り替え">🎨 ${imgs.length}・${escapeHtml(imgs[initialAi].prefix)}</button>` : ""}
        </div>
        <span class="in-deck" ${inDeck ? "" : "hidden"}>${inDeck}枚</span>
      </div>
      <p class="rname">${escapeHtml(jpName(card))}<span>${escapeHtml(card.name)}</span></p>
      ${backName ? `<p class="flip-hit"><span class="flip-hit-lbl">🔄 裏:</span><span class="flip-hit-name">${escapeHtml(backName)}</span></p>` : ""}
      <div class="addrow"></div>`;
    renderAddRow(item, card);

    // イラスト切替(🎨)と表裏切替(🔄)は同じ <img> を共有するため状態を一元管理する(トップページと同じ方式)
    const imgEl = item.querySelector(".cardph img");
    const artBadge = item.querySelector(".art-badge");
    const flipBadge = item.querySelector(".flip-badge");
    if (imgEl && (artBadge || flipBadge)) {
      let ai = initialAi;          // 選択中の版(イラスト)番号
      let showingBack = startBack; // 裏面を表示中か(#46 で裏面一致なら最初から裏面)
      const syncImg = () => {
        const cur = imgs[ai] || imgs[0];
        if (!cur) return;
        imgEl.src = showingBack && cur.back ? cur.back : cur.url;
        if (flipBadge) {
          flipBadge.textContent = showingBack ? "🔄 裏面" : "🔄 両面";
          // ⚠ ラベルも同期する。裏面で開く(#46)と初期表示と状態がずれるため
          flipBadge.setAttribute("aria-label", showingBack ? "表面を表示" : "裏面を表示");
        }
      };
      if (artBadge) {
        artBadge.addEventListener("click", (e) => {
          e.stopPropagation();
          ai = (ai + 1) % imgs.length;
          syncImg();
          item.dataset.artUrl = imgs[ai].url; // 追加時に「表示中の版」を使うため保持
          artBadge.textContent = `🎨 ${imgs.length}・${imgs[ai].prefix}`;
          artBadge.title = `イラスト/版を切り替え（${ai + 1}/${imgs.length}：${imgs[ai].label}）`;
        });
      }
      if (flipBadge) {
        flipBadge.addEventListener("click", (e) => {
          e.stopPropagation();
          showingBack = !showingBack;
          syncImg();
        });
      }
    }

    frag.appendChild(item);
  });
  el.resultGrid.appendChild(frag);
}

// ダイアログ内の操作(追加/減算/詳細)はイベント委譲。🎨/🔄はappendResults内の個別リスナーが処理
el.resultGrid.addEventListener("click", async (e) => {
  const item = e.target.closest(".result");
  if (!item) return;

  const slug = item.dataset.slug;
  const card = await getCard(slug);

  const dec = e.target.closest("button[data-dec]");
  if (dec) {
    const zone = dec.dataset.dec;
    const entry = findEntry(slug, zone);
    if (!entry) return;
    try {
      await setQty(slug, zone, entry.qty - 1); // 0枚になったら削除+「元に戻す」トースト
      renderAddRow(item, card);
      updateResultBadge(item, slug);
    } catch (err) { showToast(`保存に失敗しました(${err.message})`, true); }
    return;
  }

  const add = e.target.closest("button[data-target]");
  if (add) {
    const zone = add.dataset.target;
    add.disabled = true;
    try {
      // 🎨で切り替えて表示中の版があれば、その版のイラストで追加する（デフォルト表示なら指定なし）
      const artUrl = item.dataset.artUrl;
      const art = artUrl && artUrl !== (card && imageUrl(card)) && artUrl.startsWith(API)
        ? artUrl.slice(API.length) : null;
      await addCard(slug, zone, 1, art);
      renderAddRow(item, card);
      updateResultBadge(item, slug);
      const zoneRows = deckData.cards.filter((c) => c.board === zone);
      const bySlug = await ensureCards(zoneRows.map((c) => c.card_slug));
      const total = zoneRows.reduce((s, r) => s + r.qty, 0);
      const boons = zone === "pantheon" ? boonCounts(zoneRows, bySlug) : null;
      // ⚠️ メインの表記はゾーンヘッダ(updateZoneHeader)と揃える(#58)
      const summary = zone === "main" ? `${total} / ${MAIN_MIN}以上`
        : zone === "material" ? `${total} / ${MATERIAL_MAX}`
        : zone === "side" ? `${zoneRows.reduce((s, r) => s + sidePoints(bySlug.get(r.card_slug)) * r.qty, 0)} / ${SIDE_MAX_PT} pt`
        : boons ? `Lesser ${boons.lesser}/1・Greater ${boons.greater}/1`
        : `${total}枚`;
      showToast(`✅ 「${card ? jpName(card) : slug}」を${ZONE_LABEL[zone]}に追加 — ${summary}`);
    } catch (err) {
      showToast(`追加に失敗しました(${err.message})`, true);
    }
    return;
  }

  // カード画像・名前のクリック → 詳細
  if (e.target.closest(".cardph") || e.target.closest(".rname")) openDetail(slug);
});

// 枚数の直接入力(検索結果ダイアログ)
el.resultGrid.addEventListener("change", async (e) => {
  const input = e.target.closest(".cs-input");
  if (!input) return;
  const item = input.closest(".result");
  const slug = item.dataset.slug;
  const zone = input.dataset.zone;
  const card = await getCard(slug);
  let q = parseInt(input.value, 10);
  if (Number.isNaN(q)) { renderAddRow(item, card); return; }
  q = Math.max(0, Math.min(99, q));
  try {
    await setQty(slug, zone, q);
    renderAddRow(item, card);
    updateResultBadge(item, slug);
  } catch (err) { showToast(`保存に失敗しました(${err.message})`, true); }
});

// ⭐ 新しいタブを作るのは 🔍検索 と Enter だけ（設計 §2-3）
el.sSearch.addEventListener("click", runNewSearchTab);
[el.sName, el.sText].forEach((input) => {
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") runNewSearchTab(); });
});
// 「もっと見る」は表示中のタブのコントローラが続きを取る。
// ⚠️ ⭐ そのコントローラは自分のタブの条件（スナップショット）だけを読むので、
//    左ペインを書き換えても混ざらない（P1 の直し・設計 §7・V11）
el.resultMore.addEventListener("click", () => {
  if (activeSearchTab) activeSearchTab.ctl.loadMore();
});
// 並び替え(名前順など)は検索パネル(#search-top)の中にあり、常に触れる。
// ⚠️ 「結果が表示されているときだけ並び替える」というガードを戻さないこと。結果が出ていないときに
//    「並び替えを変えても何も起きない」＝無言の劣化になる（左ペイン化_設計 §5-2）。
//    ⭐ タブ化後は「表示中の検索タブをその場で更新する」（タブは増やさない・設計 §2-3）。
//    まだ一度も検索していない状態で触ると空条件の検索で新しいタブができる（許容・V9）。
el.sSort.addEventListener("change", updateActiveSearchTab);
el.sOrder.addEventListener("click", () => {
  setSearchOrder((el.sOrder.dataset.dir || "ASC") === "ASC" ? "DESC" : "ASC");
  updateActiveSearchTab();
});
// スマホでは絞り込みを折りたたむ(トップページの検索ツールと同じ挙動)。
// 文言はラベル用の子要素に書く — ボタン直下には選択件数バッジも入るため textContent では消えてしまう
el.sToggle.addEventListener("click", () => {
  const open = el.searchTop.classList.toggle("filters-open");
  el.sToggle.setAttribute("aria-expanded", open ? "true" : "false");
  el.sToggleLabel.textContent = "絞り込み " + (open ? "▲" : "▾");
});
el.sReset.addEventListener("click", resetSearchForm);

// ---------- デッキ統計タブ ----------
// クライアント側集計のみ(API/DB変更なし)。編集画面・共有画面で共用する。
// 表記は GA_CARD_I18N.label() の「英語（日本語訳）」形式をそのまま使う。

// 集計対象ゾーンはデッキのフォーマットで決まる(FORMAT_RULES[format].zones)。
// maybe(検討中)は常に除外。非アクティブゾーン(スタンダードのパンテオン等)も除外する
// エレメント別の棒色。設計でダーク面#171a21に対し検証済みの3色 + 同明度帯で追加。
// ラベルを棒に直付けするため色単独には依存しない(未知エレメントはタイプ棒色にフォールバック)。
const BAR_TYPE = "#56779e";
const ELEMENT_COLOR = {
  NORM: "#7b8fd4", FIRE: "#cf6d54", WATER: "#3f97c4", WIND: "#3f9d63", LUXEM: "#ad8d2e",
  CRUX: "#9b7cd4", TERA: "#ad7233", ARCANE: "#b667a6", ASTRA: "#5b9bd0", UMBRA: "#6d64b8",
  NEOS: "#2f9e8f", EXIA: "#c2678f", EXALTED: "#8f9b33",
};

// Floating Memory(キーワード)の検出。
// 英語効果テキストへのマークダウン除去後の文字列一致で判定する。
// ・keyword付与は大文字の "Floating Memory"(例: **Floating Memory** / [Class Bonus] Floating Memory)。
//   小文字 "floating memory" は "banish a card with floating memory" 等の参照(付与でない)なので大小区別する。
// ・[Class Bonus]/[Level N+]/[Vanitas Bonus]等の条件タグ直後に付くものは「条件付き」として内数カウントする。
//   [Class Bonus] [Level 1+] Floating Memory のようにタグが連なる表記も実在する(Limitless Slime等)。
//   実データ検証(2026-07-16): 付与165枚中、条件付き96・無条件69。
function floatingMemoryOf(card) {
  const text = String((card && (card.effect_raw || card.effect)) || "").replace(/\*/g, "");
  const has = /Floating Memory/.test(text);
  const conditional = has && /\[[^\]]+\](\s*\[[^\]]+\])*\s*Floating Memory/.test(text);
  return { has, conditional };
}

function inc(map, key, n) { map.set(key, (map.get(key) || 0) + n); }

// カード名を「英語（日本語訳）」で表示する(未訳は英語のみ)。分類語のlabel()と同じ表示規則。
function cardNameEJ(card) {
  const jp = jpName(card);
  return jp && jp !== card.name ? `${card.name}（${jp}）` : card.name;
}

// フォーマットごとの構築ルール(2026-07-16 公式TRG・総合ルールで確認)。
// - STANDARD: メイン同名4枚まで(メインのみで数える。サイドは別途ポイント制)。判定対象=メイン+マテリアル+サイド
// - PANTHEON: メイン同名1枚(シングルトン)。サイドボードが存在せず、代わりに Boon(Lesser/Greater 各1枚)を
//   置くパンテオンゾーンがある。判定対象=メイン+マテリアル+パンテオン
// - マテリアルは両フォーマットとも同名1枚
const FORMAT_RULES = {
  STANDARD: { zones: ["material", "main", "side"], mainCopyLimit: 4, boons: false },
  PANTHEON: { zones: ["material", "main", "pantheon"], mainCopyLimit: 1, boons: true },
};

// deckData.cards(board=ゾーン, qty持ち)と bySlug(slug→card)から、ゾーン別+合計の集計を返す。
// 集計対象・適合判定は formatKey(デッキのフォーマット)1つ分だけを見る(#4)。
function computeDeckStats(cards, bySlug, formatKey) {
  const key = normalizeFormat(formatKey);
  const rule = FORMAT_RULES[key];
  const mkAgg = () => ({ count: 0, elements: new Map(), types: new Map(), subtypes: new Map(), fm: 0, fmConditional: 0 });
  const byZone = {};
  rule.zones.forEach((z) => { byZone[z] = mkAgg(); });
  const total = mkAgg();
  const perSlug = new Map(); // slug → { card, qty: {ゾーン→枚数} } フォーマット判定用

  const addTo = (agg, card, qty) => {
    agg.count += qty;
    // 複数エレメント/タイプ/サブタイプ持ちは各項目に qty ずつ計上する(合計はデッキ枚数を超え得る)
    (card.elements || []).forEach((e) => inc(agg.elements, e, qty));
    (card.types || []).forEach((t) => inc(agg.types, t, qty));
    (card.subtypes || []).forEach((s) => inc(agg.subtypes, s, qty));
    const fm = floatingMemoryOf(card);
    if (fm.has) { agg.fm += qty; if (fm.conditional) agg.fmConditional += qty; }
  };

  cards.forEach((row) => {
    if (!rule.zones.includes(row.board)) return;
    const card = bySlug.get(row.card_slug);
    if (!card) return;
    const qty = row.qty;
    addTo(byZone[row.board], card, qty);
    addTo(total, card, qty);
    const p = perSlug.get(row.card_slug) || { card, qty: {} };
    p.qty[row.board] = (p.qty[row.board] || 0) + qty;
    perSlug.set(row.card_slug, p);
  });

  // フォーマット適合: 禁止カード+枚数制限をFORMAT_RULESに沿って判定する
  const banned = [];   // 恒久禁止カード(判定対象ゾーン内)
  const overMain = []; // メインの同名枚数制限超過
  const overMaterial = []; // マテリアルの同名1枚制限超過
  // シーズン禁止(#34)。恒久禁止とは別のリストなので別カウントにする(合算しない)
  const seasonalActive = []; // 発効済み＝不適合として扱う
  const seasonalSoon = [];   // 予告(発効前)＝まだ使えるので不適合にはしない
  const overBoon = [];   // パンテオン: Lesser/Greater が各1枚を超えている(#4)
  const boonInDeck = []; // パンテオン: Boonがマテリアル/メインに入っている(過去データの救済)
  perSlug.forEach(({ card, qty }) => {
    const q = (z) => qty[z] || 0;
    const inScope = rule.zones.reduce((s, z) => s + q(z), 0);
    if (inScope && bannedFormats(card).includes(key)) banned.push({ name: cardNameEJ(card), qty: inScope });
    if (q("main") > rule.mainCopyLimit) overMain.push({ name: cardNameEJ(card), qty: q("main") });
    if (q("material") > 1) overMaterial.push({ name: cardNameEJ(card), qty: q("material") });
    const season = inScope ? seasonalBanState(card) : null;
    if (season && season.season.format === key) {
      const row = { name: cardNameEJ(card), qty: inScope, season: season.season };
      (season.state === "active" ? seasonalActive : seasonalSoon).push(row);
    }
    if (rule.boons && isBoonCard(card)) {
      const wrong = q("material") + q("main");
      if (wrong) boonInDeck.push({ name: cardNameEJ(card), qty: wrong });
    }
  });

  // Boonの重複は「種類(Lesser/Greater)ごとの合計」で見る。
  // ⚠️ 別々のカードを1枚ずつ入れても各1枚を超えるので、slug単位ではなく種類単位で数える
  if (rule.boons) {
    const kinds = { lesser: [], greater: [] };
    cards.forEach((row) => {
      if (row.board !== "pantheon") return;
      const card = bySlug.get(row.card_slug);
      const kind = boonKind(card);
      if (!kind) return;
      kinds[kind].push({ name: cardNameEJ(card), qty: row.qty });
    });
    ["lesser", "greater"].forEach((k) => {
      if (kinds[k].reduce((s, r) => s + r.qty, 0) > 1) overBoon.push(...kinds[k]);
    });
  }

  // 「不足」(構築中)の判定に使う数値(#59)。⚠️ 違反(上の issues)とは別物で、警告バナーには出さない。
  // ⚠️ perSlug は rule.zones の行しか持たない(maybe・非アクティブゾーンは除外済み)ので、
  // ここで数えたものは自動的に判定対象ゾーンだけになる
  let lv0Champion = 0;
  perSlug.forEach(({ card, qty }) => {
    if (isLevelZeroChampion(card)) lv0Champion += qty.material || 0;
  });
  const boons = rule.boons ? boonCounts(cards.filter((c) => c.board === "pantheon"), bySlug) : { lesser: 0, greater: 0 };
  const shortfall = {
    lv0Champion,
    materialCount: byZone.material ? byZone.material.count : 0,
    mainCount: byZone.main ? byZone.main.count : 0,
    lesserCount: boons.lesser,
    greaterCount: boons.greater,
  };

  const format = { key, banned, overMain, overMaterial, seasonalActive, seasonalSoon, overBoon, boonInDeck, shortfall };
  return { key, zones: rule.zones, byZone, total, format };
}

// 警告バナー(#4)の理由。⚠️ 「不足」(メイン60枚未満・マテリアル12枚未満・Boon 0枚)は
// 構築途中に常時点灯してノイズになるため出さない(ゾーンのカウンタに委ねる)。
// ⚠️ 並びは設計書§5-2(b)で固定。formatIssues()に判定を足したらここの理由にも足す。
// ⚠️ ただし「不足」(formatShortfalls)はここに足さない(#59 設計書§5-3(c))。
// バナーは「このままでは大会に出せない違反」を伝えるもので、構築途中に必ず立つ不足を入れると
// カードを1枚入れた瞬間から常時点灯する
function warnReasons(fmt) {
  const reasons = [];
  const bannedN = fmt.banned.reduce((s, b) => s + b.qty, 0);
  const seasonN = fmt.seasonalActive.reduce((s, b) => s + b.qty, 0);
  const overN = fmt.overMain.length + fmt.overMaterial.length;
  if (bannedN) reasons.push(`禁止カード ${bannedN}枚`);
  if (seasonN) reasons.push(`シーズン禁止カード ${seasonN}枚`);
  if (overN) reasons.push(`枚数制限の超過 ${overN}種`);
  if (fmt.overBoon.length) reasons.push(`Boonの重複 ${fmt.overBoon.length}種`);
  if (fmt.boonInDeck.length) reasons.push(`パンテオン外のBoon ${fmt.boonInDeck.length}種`);
  return reasons;
}

// タブ帯の直上の警告バナーを更新する。編集画面(#deck-warn)と共有画面(#v-deck-warn)で共用。
// ⚠️ 表示条件は「統計の適合判定(formatIssues)にissueが1件以上あるか」で決める(設計書§5-2(b)第3版)。
// 理由の列挙で条件を組み立てると、適合判定に項目を足したときに
// 「適合行は不適合なのにバナーが出ない」同期漏れが起きる(初版で boonInDeck が実際に漏れた)。
function updateDeckWarn(container, cards, bySlug, formatKey) {
  const key = normalizeFormat(formatKey);
  const fmt = computeDeckStats(cards, bySlug, key).format;
  const hasIssue = formatIssues(fmt).length > 0;
  container.hidden = !hasIssue;
  if (!hasIssue) { container.innerHTML = ""; return; }
  // 理由ラベルが未定義の判定が増えても、バナー自体は出す(空の括弧は出さない)
  const reasons = warnReasons(fmt);
  container.innerHTML = `⚠️ ${FORMAT_INFO[key].jp}で使用できない構成です`
    + (reasons.length ? `（${escapeHtml(reasons.join("・"))}）` : "")
    + `<span class="hint">（詳細は「📊 統計」タブのフォーマット適合へ）</span>`;
}

// Map を枚数降順の [key, count] 配列にする(同数は英名順で安定化)
function sortedEntries(map) {
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

// エレメント別・タイプ別の純CSS横棒セクション。0件なら空文字を返す(節ごと非表示)。
// noteClass: 注記のクラス。重複計上注記は "sr-note sr-note--multi" を渡し≤620pxで非表示にする(第7版⑯)。
function barSectionHtml(title, map, kind, colorFor, note, noteClass = "sr-note") {
  const entries = sortedEntries(map);
  if (!entries.length) return "";
  const max = entries[0][1];
  const rows = entries.map(([value, n]) => {
    const w = max ? Math.round((n / max) * 100) : 0;
    // CSP(style-src 'self')がstyle属性を禁止するため、寸法・色はdata属性に載せて描画後にCSSOMで適用する
    return `<div class="statrow">`
      + `<span class="sr-label">${escapeHtml(label(kind, value))}</span>`
      + `<span class="sr-track"><i data-w="${w}" data-c="${colorFor(value)}"></i></span>`
      + `<span class="sr-val">${n}</span></div>`;
  }).join("");
  return `<div class="stat-sec"><h4>${title}</h4>${rows}${note ? `<p class="${noteClass}">${escapeHtml(note)}</p>` : ""}</div>`;
}

// サブタイプ別の枚数降順テキスト行。0件なら空文字。
// 第7版⑰: <details>で開閉可能に。zoneはdata-zoneキー(再描画時の開閉状態引き継ぎに使う)。
// 第8版⑱: 初期状態は幅に関係なく常に「閉」(open属性を付けない)。開閉の引き継ぎはfoldStateで継続。
function subtypeSectionHtml(map, zone) {
  const entries = sortedEntries(map);
  if (!entries.length) return "";
  const parts = entries.map(([value, n], i) =>
    `${i ? '<span class="sep">・</span>' : ""}${escapeHtml(label("subtypes", value))} <b>${n}</b>`
  ).join("");
  return `<details class="stat-sec stat-fold" data-zone="${escapeHtml(zone)}">`
    + `<summary>サブタイプ別 ${entries.length}種</summary>`
    + `<p class="subtype-line">${parts}</p></details>`;
}

// Floating Memory キーワードのテキスト行。0枚なら空文字(節ごと非表示)。
// キーワードはサブタイプ辞書に無いため表記は固定(「英語（日本語訳）」形式に合わせる)。
// 条件付き = [Class Bonus]/[Level N+]等の条件タグつきで付与されるもの。
function keywordSectionHtml(agg) {
  if (!agg.fm) return "";
  const inner = agg.fmConditional ? ` <span class="inner">（うち条件付き ${agg.fmConditional}枚）</span>` : "";
  return `<div class="stat-sec"><h4>キーワード</h4>`
    + `<p class="subtype-line">Floating Memory（フローティングメモリー） <b>${agg.fm}</b>${inner}</p></div>`;
}

// ゾーン(または合計)ひとつ分の統計カード。空ゾーンは null を返す。
function statCardHtml(heading, agg, opts = {}) {
  if (!agg.count) return null;
  const elColor = (v) => ELEMENT_COLOR[v] || BAR_TYPE;
  const typeColor = () => BAR_TYPE;
  const elNote = opts.multiNote
    ? "※複数のエレメント・タイプ・サブタイプを持つカードは各項目に数えるため、合計がデッキ枚数と一致しないことがあります。"
    : "";
  const secs = [
    barSectionHtml("エレメント別", agg.elements, "elements", elColor, elNote, "sr-note sr-note--multi"),
    barSectionHtml("タイプ別", agg.types, "types", typeColor, ""),
    subtypeSectionHtml(agg.subtypes, opts.zone),
    keywordSectionHtml(agg),
  ].join("");
  return `<div class="stat-card"><h3>${heading}</h3>${secs}</div>`;
}

// カード名リストの短縮表示(長いシングルトン違反列挙が画面を占領しないように先頭3種+他n種)
function listCardNames(arr, max = 3) {
  const head = arr.slice(0, max).map((b) => `${escapeHtml(b.name)} ×${b.qty}`).join("・");
  return arr.length > max ? `${head} …他${arr.length - max}種` : head;
}

// 判定対象ゾーンの説明(見出しの注記)。「メイン＋マテリアル＋◯◯で判定」
const JUDGE_NOTE = {
  STANDARD: "メイン＋マテリアル＋サイドで判定",
  PANTHEON: "メイン＋マテリアル＋パンテオンで判定",
};
// 末尾の注記。パンテオンだけ出す(スタンダードのデッキには関係が無いため)
const FORMAT_FOOT_NOTE = {
  STANDARD: "",
  PANTHEON: "※パンテオンにサイドボードはありません。Boonは対戦開始時に Lesser・Greater 各1枚を裏向きで提示します。",
};

// フォーマット適合の不適合項目(設計書§5-3(b))。統計の「フォーマット適合」行と
// タブ帯直上の警告バナー(§5-2(b))が**同じ判定**を共有するための唯一の出所。
// ⚠️ ここに判定を足すとバナーの表示条件にも自動で反映される(列挙で二重管理しない)。
// 返すのはHTML断片(カード名は listCardNames が escape 済み)。
function formatIssues(f) {
  const key = f.key;
  const issues = [];
  if (f.banned.length) {
    const n = f.banned.reduce((s, b) => s + b.qty, 0);
    issues.push(`⚠️ 禁止カード ${n}枚 — ${listCardNames(f.banned)}`);
  }
  // シーズン禁止(#34)は恒久禁止と行を分ける(公式が別のリストと明言しているため合算しない)
  if (f.seasonalActive.length) {
    const n = f.seasonalActive.reduce((s, b) => s + b.qty, 0);
    issues.push(`⚠️ シーズン禁止カード ${n}枚（${escapeHtml(seasonalName(f.seasonalActive[0].season))}） — ${listCardNames(f.seasonalActive)}`);
  }
  if (f.overMain.length) {
    const limit = FORMAT_RULES[key].mainCopyLimit;
    issues.push(`⚠️ メイン同名${limit}枚制限の超過 ${f.overMain.length}種 — ${listCardNames(f.overMain)}`);
  }
  if (f.overMaterial.length) {
    issues.push(`⚠️ マテリアル同名1枚制限の超過 — ${listCardNames(f.overMaterial)}`);
  }
  // パンテオン専用(#4)。Boonの不足は出さない(§5-3(b))
  if (f.overBoon.length) {
    issues.push(`⚠️ Boonは Lesser・Greater 各1枚までです — ${listCardNames(f.overBoon)}`);
  }
  if (f.boonInDeck.length) {
    issues.push(`⚠️ Boonはパンテオンゾーンに置いてください — ${listCardNames(f.boonInDeck)}`);
  }
  return issues;
}

// フォーマット適合の「不足」項目(#59 設計書§5-3(b))。formatIssues()と対になる。
// ⚠️ これは違反(不適合)ではなく「まだ足りていない」＝構築中の表示で、
// タブ帯直上の警告バナー(updateDeckWarn/warnReasons)には**足さない**。
// ⚠️ 並びは material → main → pantheon のゾーン表示順で固定。
// ⚠️ スタンダードのマテリアル枚数は不足に数えない(公式は「最大12枚」で下限がない)。
// パンテオンだけ「ちょうど12枚」なので数える。
function formatShortfalls(f) {
  const rule = FORMAT_RULES[f.key];
  const s = f.shortfall || {};
  const out = [];
  if (!s.lv0Champion) out.push("Lv0チャンピオンが未設定");
  if (rule.boons && s.materialCount < MATERIAL_MAX) out.push(`マテリアルデッキがあと${MATERIAL_MAX - s.materialCount}枚`);
  if (s.mainCount < MAIN_MIN) out.push(`メインデッキがあと${MAIN_MIN - s.mainCount}枚`);
  if (rule.boons) {
    // Boonは種類ごとに1項目ずつ出す(まとめない)
    if (!s.lesserCount) out.push("Lesser Boonが未設定");
    if (!s.greaterCount) out.push("Greater Boonが未設定");
  }
  return out;
}

// フォーマット適合カード。⚠️ デッキのフォーマット1行だけを出す(#4)。
// 禁止カードに加え、枚数制限(スタンダード=メイン4枚/パンテオン=メイン1枚/マテリアル1枚)、
// パンテオンではBoonの枚数も判定する。
// ⚠️ 不足(最低枚数・Lv0チャンピオン・Boon)は違反ではないので ⚠️ に混ぜず、
// 🚧 構築中 の1行にまとめる(#59)。表示は ⚠️ 不適合 / 🚧 構築中 / ✅ 使用可能 の3状態で、
// ⚠️ と 🚧 は同時に出る(違反を直した瞬間に 🚧 が新しく現れる形にしない)。
function formatCardHtml(fmt) {
  const rowFor = (key) => {
    const f = fmt;
    const name = FORMAT_JP[key];
    const issues = formatIssues(f);
    const shortfalls = formatShortfalls(f);
    // 予告(発効前)は違反ではないので ✅ 使用可能 を消さず、情報行として必ず見える位置に添える(#34)
    const notes = [];
    if (f.seasonalSoon.length) {
      const n = f.seasonalSoon.reduce((s, b) => s + b.qty, 0);
      notes.push(`ℹ️ ${escapeHtml(f.seasonalSoon[0].season.effectiveFrom)}からシーズン禁止になるカード ${n}枚 — ${listCardNames(f.seasonalSoon)}`);
    }
    const lines = issues.map((i) => `<span class="fmt-ng">${i}</span>`);
    if (shortfalls.length) {
      lines.push(`<span class="fmt-todo">🚧 構築中 — ${escapeHtml(shortfalls.join("・"))}</span>`);
    }
    const body = lines.length
      ? `<span class="fmt-issues">${lines.join("")}</span>`
      : `<span class="fmt-ok">✅ 使用可能</span>`;
    const noteHtml = notes.length
      ? `<span class="fmt-notes">${notes.map((i) => `<span class="fmt-info">${i}</span>`).join("")}</span>`
      : "";
    return `<div class="fmt-row"><span class="fmt-name">${name}</span>${body}${noteHtml}</div>`;
  };
  const key = fmt.key;
  const foot = FORMAT_FOOT_NOTE[key];
  return `<div class="stat-card"><h3>フォーマット適合 <span class="cnt">${JUDGE_NOTE[key]}</span></h3>`
    + rowFor(key)
    + (foot ? `<p class="sr-note">${escapeHtml(foot)}</p>` : "")
    + `</div>`;
}

// 統計パネル全体をHTML文字列で組み立てる(編集・共有で共用)。
// ⚠️ 旧「0. 警告バナー(.warn-banner)」はタブ帯の直上(#deck-warn)へ移設したのでここには出さない(#4)。
function statsHtml(cards, bySlug, formatKey) {
  const key = normalizeFormat(formatKey);
  const stats = computeDeckStats(cards, bySlug, key);
  if (!stats.total.count) {
    return `<p class="stat-empty">カードがありません。デッキにカードを追加すると統計が表示されます。</p>`;
  }
  const parts = [];

  // 1-3. ゾーン別(フォーマットで決まる。パンテオンでは サイドボード ではなく パンテオン)
  stats.zones.forEach((zone) => {
    parts.push(statCardHtml(`${ZONE_LABEL[zone]} <span class="cnt">${stats.byZone[zone].count}枚</span>`,
      stats.byZone[zone], { multiNote: true, zone }));
  });

  // 4. 合計(「検討中」と、このフォーマットで使わないゾーンは含まない)
  const breakdown = `${stats.total.count}枚 ＝ `
    + stats.zones.map((z) => `${ZONE_SHORT[z]}${stats.byZone[z].count}`).join("＋")
    + `（「検討中」は含みません）`
    // 非アクティブゾーンにカードが残っているときは、どこが対象外なのかを明示する
    + ZONES.filter((z) => !stats.zones.includes(z) && z !== "maybe")
      .map((z) => {
        const n = cards.filter((c) => c.board === z).reduce((s, c) => s + c.qty, 0);
        return n ? `（${ZONE_LABEL[z]}${n}枚は${FORMAT_INFO[key].jp}では集計対象外）` : "";
      }).join("");
  parts.push(statCardHtml(`合計 <span class="cnt">${breakdown}</span>`, stats.total, { multiNote: true, zone: "total" }));

  // 5. フォーマット適合(デッキのフォーマット1行だけ)
  parts.push(formatCardHtml(stats.format));

  return parts.filter(Boolean).join("");
}

// 統計パネルを指定コンテナへ描画する。
// 棒の幅・色はCSP(style-src 'self'=style属性禁止)を避けてCSSOMで適用する(.meterと同じ方式)。
function renderStatsInto(container, cards, bySlug, formatKey) {
  // 第7版⑰: 差し替え前にサブタイプ別の開閉状態をdata-zoneキーで退避し、差し替え後に再適用する。
  // (ライブ更新のたびに初期状態へ閉じ直る事故を防ぐ)
  const foldState = new Map();
  container.querySelectorAll("details.stat-fold[data-zone]").forEach((d) => foldState.set(d.dataset.zone, d.open));
  container.innerHTML = statsHtml(cards, bySlug, formatKey);
  container.querySelectorAll("details.stat-fold[data-zone]").forEach((d) => {
    if (foldState.has(d.dataset.zone)) d.open = foldState.get(d.dataset.zone);
  });
  container.querySelectorAll(".sr-track i[data-w]").forEach((bar) => {
    bar.style.width = `${bar.dataset.w}%`;
    bar.style.background = bar.dataset.c;
  });
}

// ---------- タブ切替 ----------
// タブ状態はhashに持たない(リロードでデッキタブに戻る。シンプル優先)。
// deckTabId → statsTabId → deckPane → statsPane。onStats は統計タブ表示時の描画コールバック。
// ⚠️ onFixedSelect は編集画面だけが渡す（検索タブの選択を落とすため）。
//    共有閲覧画面（#view-deck）には検索タブが無いので渡さない＝完全な no-op。
function setupTabs(deckTabId, statsTabId, deckPane, statsPane, onStats, onFixedSelect) {
  const deckTab = document.getElementById(deckTabId);
  const statsTab = document.getElementById(statsTabId);
  let stats = false; // 固定タブのどちらを選んでいるか。⚠️ aria-selected は検索タブ選択中に
                     //    両方 false になるので、そこから読み直さない
  const select = (showStats) => {
    stats = !!showStats;
    deckTab.setAttribute("aria-selected", String(!stats));
    statsTab.setAttribute("aria-selected", String(stats));
    deckPane.hidden = stats;
    statsPane.hidden = !stats;
    if (stats) onStats();
    if (onFixedSelect) onFixedSelect();
  };
  deckTab.addEventListener("click", () => select(false));
  statsTab.addEventListener("click", () => select(true));
  return {
    reset: () => select(false),
    isStats: () => stats,
    select,
    // 検索タブが選ばれている間、固定2つの aria-selected を落とす（帯の中で true は常に1つ）。
    // ⚠️ パネルの表示は変えない（デッキ/統計の中身はそのまま下に残す）
    deselect: () => {
      deckTab.setAttribute("aria-selected", "false");
      statsTab.setAttribute("aria-selected", "false");
    },
    syncFixed: () => {
      deckTab.setAttribute("aria-selected", String(!stats));
      statsTab.setAttribute("aria-selected", String(stats));
    },
    // 固定タブの面を出す／両方しまう（検索タブを表示している間は両方 hidden・設計 §8-4-1 の4）。
    // ⚠️ stats（どちらの固定タブを選んでいたか）は変えない——検索タブから戻ったときに元の面へ戻すため。
    // ⚠️ ⭐ 閲覧専用画面（#view-deck）の setupTabs はこれを呼ばない＝1pxも変わらない（V19）。
    syncPanes: (show) => {
      deckPane.hidden = !show || stats;
      statsPane.hidden = !show || !stats;
    },
  };
}

// 編集画面: 現在のデッキ内容で統計パネルを描画する(タブ表示中のみ呼ばれる)。
async function renderEditorStats() {
  if (!deckData) return;
  const seq = deckSeq;
  const cards = deckData.cards;
  const bySlug = await ensureCards(cards.map((c) => c.card_slug));
  if (seq !== deckSeq) return;
  renderStatsInto(el.edPaneStats, cards, bySlug, deckFormat());
}

// 共有画面: 現在のデッキ内容で統計パネルを描画する。
async function renderViewStats() {
  if (!deckData) return;
  const seq = deckSeq;
  const cards = deckData.cards;
  const bySlug = await ensureCards(cards.map((c) => c.card_slug));
  if (seq !== deckSeq) return;
  renderStatsInto(el.vPaneStats, cards, bySlug, deckFormat());
}

editorTabs = setupTabs("ed-tab-deck", "ed-tab-stats", $("ed-pane-deck"), el.edPaneStats, renderEditorStats, () => {
  // 固定タブ（デッキ/統計）を選んだら検索タブの選択は落ちる。
  // ⚠️ activeSearchTab（結果パネルの持ち主）はそのまま——取得中の結果を捨てないため
  if (!selectedSearchTab) return;
  selectedSearchTab = null;
  syncSearchTabSelection();
  saveSearchTabs();
});
viewTabs = setupTabs("v-tab-deck", "v-tab-stats", el.vZones, el.vPaneStats, renderViewStats);

// タブ帯のキーボード操作（設計 §4-1）。←/→ でデッキ・統計・検索タブを順に移動し、
// Delete で（フォーカスしている）検索タブを閉じる。⚠️ 固定2つでは Delete は何も起きない。
// ⚠️ 編集画面の帯だけに付ける（共有閲覧の帯は現状のまま＝V19）
$("ed-tab-deck").closest(".deck-tabs").addEventListener("keydown", (e) => {
  const cur = e.target.closest('button[role="tab"]');
  if (!cur) return;
  if (e.key === "Delete") {
    const tab = searchTabs.find((t) => t.btn === cur);
    if (!tab) return; // 固定タブは閉じられない
    e.preventDefault();
    closeSearchTab(tab);
    return;
  }
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  const list = [$("ed-tab-deck"), $("ed-tab-stats")].concat(searchTabs.map((t) => t.btn));
  const i = list.indexOf(cur);
  if (i < 0) return;
  e.preventDefault();
  const next = list[(i + (e.key === "ArrowRight" ? 1 : list.length - 1)) % list.length];
  if (!next) return;
  next.focus();
  next.click(); // 選択も一緒に移す（既存の2つと同じく「移動＝選択」）
});
el.edTabsScroll.addEventListener("scroll", updateTabsFade);
window.addEventListener("resize", updateTabsFade);

// ---------- 共有リンク閲覧 ----------

// 共有画面に出すゾーン。「検討中」は出さない。非アクティブゾーン(スタンダードのデッキに
// 残っているパンテオン等)も出さない(他人のデッキの作業用データは見せない・#4)
function viewZones(format) {
  return activeZones(format).filter((z) => z !== "maybe");
}

async function openDeckView(id) {
  const seq = ++deckSeq;
  showView(el.viewDeck);
  el.vZones.innerHTML = "";
  el.vPaneStats.innerHTML = "";
  el.vDeckWarn.hidden = true; // 前のデッキの警告を持ち越さない
  el.vFormat.hidden = true;
  if (viewTabs) viewTabs.reset(); // 共有デッキを開くたびデッキタブから(読み込み完了後だとユーザーのタブ操作を巻き戻すため先頭で)
  setStatus("デッキを読み込み中…");
  try {
    const data = await api(`/api/decks/${encodeURIComponent(id)}`);
    if (seq !== deckSeq) return;
    deckData = data;
    el.bootStatus.hidden = true;
    renderDeckView();
  } catch (err) {
    if (seq !== deckSeq) return;
    showView(el.viewDeck);
    el.vTitle.textContent = "";
    el.vOwner.textContent = "";
    setStatus(err.status === 404
      ? "デッキが見つかりません。削除された可能性があります。"
      : `読み込みに失敗しました(${err.message})`);
  }
}

async function renderDeckView() {
  const seq = deckSeq;
  const { deck, cards, owner, is_owner } = deckData;
  el.vTitle.textContent = deck.name;
  el.vPub.textContent = deck.is_public ? "公開デッキ" : "非公開デッキ";
  el.vPub.className = deck.is_public ? "badge-pub" : "badge-priv";
  const format = deckFormat();
  el.vFormat.hidden = false;
  el.vFormat.textContent = FORMAT_INFO[format].badge;
  el.vFormat.className = FORMAT_INFO[format].cls;
  el.vEdit.hidden = !is_owner;
  el.vEdit.href = `#edit/${deck.id}`;
  el.vOwner.innerHTML = `
    <img class="avatar" src="${escapeHtml((owner && owner.avatar_url) || "")}" alt="">
    ${escapeHtml((owner && owner.display_name) || "?")} さんのデッキ ・ 更新 ${escapeHtml((deck.updated_at || "").slice(0, 10))}`;
  el.vCta.hidden = !!me;

  const bySlug = await ensureCards(cards.map((c) => c.card_slug));
  if (seq !== deckSeq) return;

  updateDeckWarn(el.vDeckWarn, cards, bySlug, format);

  el.vZones.innerHTML = "";
  viewZones(format).forEach((zone) => {
    const rows = cards.filter((c) => c.board === zone).sort(zoneComparator(zone, bySlug));
    if (!rows.length) return;
    const total = rows.reduce((s, r) => s + r.qty, 0);
    let heading = `${ZONE_LABEL[zone]} <b>${total}枚</b>`;
    if (zone === "side") {
      const pt = rows.reduce((s, r) => s + sidePoints(bySlug.get(r.card_slug)) * r.qty, 0);
      heading = `${ZONE_LABEL[zone]} <b>${pt} / ${SIDE_MAX_PT} pt・${total}枚</b>`;
    }
    const section = document.createElement("div");
    section.className = "view-zone";
    section.innerHTML = `<h3>${heading}</h3><div class="view-grid"></div>`;
    const grid = section.querySelector(".view-grid");
    rows.forEach((row) => {
      const card = bySlug.get(row.card_slug);
      const url = rowImageUrl(row, card);
      const name = card ? jpName(card) : row.card_slug;
      const tile = document.createElement("div");
      tile.className = "cardph clickable";
      tile.tabIndex = 0;
      tile.dataset.slug = row.card_slug;
      tile.setAttribute("role", "button");
      tile.setAttribute("aria-label", name);
      tile.innerHTML = `
        ${url ? `<img loading="lazy" src="${escapeHtml(url)}" alt="${escapeHtml(name)}" title="${escapeHtml(name)}">`
              : `<div class="noimg">${escapeHtml(name)}</div>`}
        ${card ? formatIconHtml(card) : ""}
        <span class="qty-badge">×${row.qty}</span>
        ${zone === "side" && card && isMaterialCard(card) ? `<span class="pt-tag">3pt</span>` : ""}`;
      grid.appendChild(tile);
    });
    el.vZones.appendChild(section);
  });

  // 読み込み中に統計タブへ切り替えられていた場合、データが揃ったここで描画する
  // (renderViewStatsはdeckData未着時に早期returnするため、このフックがないと空のまま残る)
  if (viewTabs && viewTabs.isStats()) renderStatsInto(el.vPaneStats, cards, bySlug, format);
}

// 共有画面のカードクリック → 詳細
el.vZones.addEventListener("click", (e) => {
  const tile = e.target.closest(".cardph[data-slug]");
  if (tile) openDetail(tile.dataset.slug);
});
el.vZones.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const tile = e.target.closest(".cardph[data-slug]");
  if (tile) { e.preventDefault(); openDetail(tile.dataset.slug); }
});

// ---------- 自分のデッキ一覧にコピー ----------

const PENDING_COPY_KEY = "ga-deck-pending-copy";

el.vCopyDeck.addEventListener("click", async () => {
  const id = deckData && deckData.deck && deckData.deck.id;
  if (!id) return;
  if (!me) {
    // ログイン後にこのページへ戻り、init 内の resumePendingCopy で複製を再開する
    localStorage.setItem(PENDING_COPY_KEY, id);
    location.href = loginUrl();
    return;
  }
  copyDeckToMine(id);
});

// opts.label: 進捗/失敗トーストの動詞(既定「コピー」。自分のデッキ複製時は「複製」)
// opts.doneMsg(name): 成功トースト(既定は共有ビュー向けの「〜として自分のデッキ一覧にコピーしました」)
async function copyDeckToMine(id, opts = {}) {
  const label = opts.label || "コピー";
  setStatus(`デッキを${label}中…`);
  try {
    const src = await api(`/api/decks/${encodeURIComponent(id)}`);
    const created = await api("/api/decks", {
      method: "POST",
      body: {
        name: `${src.deck.name} のコピー`,
        champion_slug: src.deck.champion_slug || undefined,
        thumb_image: src.deck.thumb_image || undefined,
        is_public: false,
        format: normalizeFormat(src.deck.format), // 複製元のフォーマットを引き継ぐ(#4)
        cards: src.cards.map((c) => ({
          card_slug: c.card_slug, board: c.board, qty: c.qty,
          ...(c.art_image ? { art_image: c.art_image } : {}),
        })),
      },
    });
    showToast(opts.doneMsg ? opts.doneMsg(created.deck.name)
                           : `「${created.deck.name}」として自分のデッキ一覧にコピーしました`);
    location.hash = `#edit/${created.deck.id}`;
  } catch (err) {
    el.bootStatus.hidden = true;
    showToast(`${label}に失敗しました(${deckCreateErrorMessage(err)})`, true);
  }
}

async function resumePendingCopy() {
  const pending = localStorage.getItem(PENDING_COPY_KEY);
  if (!pending || !me) return;
  localStorage.removeItem(PENDING_COPY_KEY);
  await copyDeckToMine(pending);
}

// ---------- Omnidexテキストからインポート ----------

// omnidex提出フォーマット(# Material Deck / # Main Deck / # Sideboard + 「枚数 英語カード名」)を
// パースして [{ board, qty, name }] を返す。見出しが現れるまでは main 扱い。
function parseOmnidexText(text) {
  const HEAD = {
    "material deck": "material", "materials": "material", "material": "material",
    "main deck": "main", "maindeck": "main", "main": "main",
    "sideboard": "side", "side deck": "side", "side": "side",
    // パンテオン(#4)。omnidexがこの見出しを使うかは未確認だが、未知の見出しは無視されるだけなので
    // 受け側を寛容にしておく(出力側には推測で見出しを足さない)
    "pantheon": "pantheon", "pantheon zone": "pantheon", "boons": "pantheon",
  };
  let board = "main";
  const entries = [];
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const head = line.match(/^#\s*(.+?)$/);
    if (head) {
      const b = HEAD[head[1].toLowerCase()];
      if (b) board = b;
      continue;
    }
    const m = line.match(/^(\d+)\s*[x×]?\s+(.+)$/i);
    if (!m) continue;
    const qty = parseInt(m[1], 10);
    const name = m[2].trim();
    if (qty > 0 && name) entries.push({ board, qty, name });
  }
  return entries;
}

// 記号・大小・アクセントの揺れを吸収して名前を照合するための正規化
const normCardName = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "");

// カード名(英語)→ slug。公式APIの名前検索から完全一致のみ採用する(曖昧一致は誤登録防止で不採用)
async function resolveCardSlug(name) {
  try {
    const res = await fetch(`${API}/cards/search?name=${encodeURIComponent(name)}&page_size=30`);
    if (!res.ok) return null;
    const json = await res.json();
    const target = normCardName(name);
    const hit = (json.data || []).find((c) => normCardName(c.name) === target);
    return hit ? hit.slug : null;
  } catch { return null; }
}

async function importFromOmnidex() {
  const entries = parseOmnidexText(el.importText.value);
  if (!entries.length) {
    el.importResult.hidden = false;
    el.importResult.textContent = "デッキとして読み取れる行がありませんでした。フォーマットをご確認ください。";
    return;
  }
  el.importRun.disabled = true;
  el.importResult.hidden = false;
  el.importResult.textContent = "カードを照合中…";
  try {
    // 同じカード名は1回だけ照合する
    const names = [...new Set(entries.map((e) => e.name))];
    const slugByName = new Map();
    const failed = [];
    await Promise.all(names.map(async (n) => {
      const slug = await resolveCardSlug(n);
      if (slug) slugByName.set(n, slug); else failed.push(n);
    }));
    const ok = entries.filter((e) => slugByName.has(e.name));
    if (!ok.length) {
      el.importResult.textContent = "カードが1枚も見つかりませんでした。英語名・フォーマットをご確認ください。";
      return;
    }
    if (failed.length) {
      const proceed = confirm(
        `次の${failed.length}種のカードが見つかりませんでした:\n・${failed.join("\n・")}\n\n見つかった${ok.length}種でデッキを作成しますか？`
      );
      if (!proceed) return;
    }
    const name = prompt("デッキ名を入力してください", "インポートしたデッキ");
    if (!name || !name.trim()) return;
    el.importResult.textContent = "デッキを作成中…";
    const format = selectedFormat("import-format");
    // パンテオンを選んだときだけ、Boonをパンテオンゾーンへ振り替える(#4)。
    // 見出しの無いリストでもBoonが正しい場所に入る。スタンダード選択時は振り替えない
    const boonSlugs = new Set();
    if (format === "PANTHEON") {
      const slugs = [...new Set(ok.map((e) => slugByName.get(e.name)))];
      const cards = await Promise.all(slugs.map((s) => getCard(s)));
      slugs.forEach((s, i) => { if (isBoonCard(cards[i])) boonSlugs.add(s); });
    }
    const created = await api("/api/decks", {
      method: "POST",
      body: {
        name: name.trim(),
        is_public: false,
        format,
        cards: ok.map((e) => {
          const slug = slugByName.get(e.name);
          return { card_slug: slug, board: boonSlugs.has(slug) ? "pantheon" : e.board, qty: e.qty };
        }),
      },
    });
    closeModal(el.importModal);
    const skip = failed.length ? `（${failed.length}種は未解決のためスキップ）` : "";
    showToast(`「${created.deck.name}」を作成しました${skip}`);
    location.hash = `#edit/${created.deck.id}`;
  } catch (err) {
    el.importResult.hidden = false;
    el.importResult.textContent = `インポートに失敗しました（${deckCreateErrorMessage(err)}）`;
  } finally {
    el.importRun.disabled = false;
  }
}

el.importBtn.addEventListener("click", () => {
  if (!me) { location.href = loginUrl(); return; }
  el.importText.value = "";
  el.importResult.hidden = true;
  el.importResult.textContent = "";
  const std = document.querySelector('input[name="import-format"][value="STANDARD"]');
  if (std) std.checked = true;
  syncFormatChoices(el.importModal);
  openModal(el.importModal);
});
el.importRun.addEventListener("click", importFromOmnidex);

// ---------- デッキ画像出力(X投稿用) ----------
// デッキ全体をcanvasで1枚のPNG(幅1200・7列)に合成する。カード画像は公式API
// (api.gatcg.com、CORS許可済み)から crossOrigin で取得するため canvas を汚染しない。
// 意匠・切り出し座標などの決定事項は tmp/X投稿用/デッキ画像機能/仕様.md(git管理外)。

const IMG_SITE = "ga-card-tools-jp.pages.dev";
// セクションはデッキのフォーマットで決まる(#4)。非アクティブゾーンは画像に含めない
const IMG_ZONE_TITLE = { material: "Materials", main: "Main Deck", side: "Sideboard", pantheon: "Pantheon" };
function imgZones(format) {
  return activeZones(format).filter((z) => z !== "maybe").map((zone) => ({ zone, title: IMG_ZONE_TITLE[zone] }));
}
// 配色はX宣伝画像と共通のダーク+ゴールドのトーン
const IMG_C = {
  bg: "#0f1115", panel: "#1a1d23", gold: "#d9a441", goldDark: "#201a0a",
  text: "#e7e9ee", muted: "#969eac", line: "#464c58", badge: "#08090c",
};
const IMG_FONT = 'system-ui, -apple-system, "Segoe UI", "Hiragino Kaku Gothic ProN", "Noto Sans JP", Meiryo, sans-serif';

// 画像1枚をタイムアウト+1回リトライ付きで読み込む(最終的な失敗は null)
function loadDeckImage(url, timeoutMs = 10000) {
  const once = () => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const timer = setTimeout(() => { img.src = ""; reject(new Error("timeout")); }, timeoutMs);
    img.onload = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); reject(new Error("load error")); };
    img.src = url;
  });
  return once().catch(once).catch(() => null);
}

// URL群を並列数を絞って読み込む。戻り値は Map<url, HTMLImageElement|null>
async function loadImagesPooled(urls, onProgress, limit = 6) {
  const uniq = [...new Set(urls.filter(Boolean))];
  const out = new Map();
  let next = 0, done = 0;
  const worker = async () => {
    while (next < uniq.length) {
      const url = uniq[next++];
      out.set(url, await loadDeckImage(url));
      done++;
      onProgress(done, uniq.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, uniq.length) || 1 }, worker));
  return out;
}

// ヘッダに載せるエレメント: 基本属性(火→水→風)を先、上級属性はアルファベット順。
// EXALTEDは独自の玉を持たない(金装飾表現)ため載せない。NORMは他が無いときのみ。
function deckDisplayElements(rows, bySlug) {
  const present = new Set();
  rows.forEach((r) => {
    const c = bySlug.get(r.card_slug);
    ((c && c.elements) || []).forEach((e) => present.add(e));
  });
  present.delete("EXALTED");
  const basics = BASIC_ELEMENT_ORDER.filter((e) => e !== "NORM" && present.has(e));
  const advanced = [...present].filter((e) => e !== "NORM" && !BASIC_ELEMENT_ORDER.includes(e)).sort();
  const list = [...basics, ...advanced];
  return list.length ? list : (present.has("NORM") ? ["NORM"] : []);
}

// エレメント玉の切り出し元: その属性の単属性カードを優先(複属性は玉の周りに
// EXALTEDの金装飾等が写り込むことがあるため)。無ければ複属性カードで代用
function orbSourceCard(element, rows, bySlug) {
  let fallback = null;
  for (const r of rows) {
    const c = bySlug.get(r.card_slug);
    const els = (c && c.elements) || [];
    if (!els.includes(element)) continue;
    if (els.length === 1) return c;
    if (!fallback) fallback = c;
  }
  return fallback;
}

// カード画像からエレメント玉を円形に切り出して描く。
// 座標はカード枠共通(500×700基準で中心449,47・半径22。実測値、仕様.md参照)
function drawElementOrb(ctx, img, dx, dy, size) {
  const w = img.naturalWidth, h = img.naturalHeight;
  const cx = (449 / 500) * w, cy = (47 / 700) * h, r = (22 / 500) * w;
  ctx.save();
  ctx.beginPath();
  ctx.arc(dx + size / 2, dy + size / 2, size / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2, dx, dy, size, size);
  ctx.restore();
  // 細い暗色の縁で切り出し端の写り込みをならす
  ctx.beginPath();
  ctx.arc(dx + size / 2, dy + size / 2, size / 2 - 1, 0, Math.PI * 2);
  ctx.strokeStyle = "rgb(10,11,14)";
  ctx.lineWidth = 2;
  ctx.stroke();
}

// 角丸長方形のパス(ctx.roundRect未対応ブラウザ向け)
function rrPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// 幅に収まるよう末尾を「…」で詰める
function ellipsize(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = String(text);
  while (t.length > 1 && ctx.measureText(t + "…").width > maxW) t = t.slice(0, -1);
  return t + "…";
}

// プレースホルダ用: 中央揃えの簡易折り返し(最大4行)
function wrapTextCentered(ctx, text, cx, cy, maxW, lineH) {
  const lines = [];
  let cur = "";
  for (const ch of String(text)) {
    if (lines.length === 4) break;
    if (cur && ctx.measureText(cur + ch).width > maxW) { lines.push(cur); cur = ch; }
    else cur += ch;
  }
  if (cur && lines.length < 4) lines.push(cur);
  const y0 = cy - ((lines.length - 1) * lineH) / 2;
  lines.forEach((ln, i) => ctx.fillText(ln, cx, y0 + i * lineH));
}

// ヘッダに載せるチャンピオン名: マテリアルの最高レベルのチャンピオン(いなければ null)
function deckChampionName(sections, bySlug) {
  const mat = sections.find((s) => s.zone === "material");
  if (!mat) return null;
  let best = null;
  mat.rows.forEach((r) => {
    const c = bySlug.get(r.card_slug);
    if (!c || !(c.types || []).includes("CHAMPION")) return;
    if (!best || (c.level || 0) > (best.level || 0)) best = c;
  });
  return best ? jpName(best) : null;
}

// カード1枚のタイル(画像 or 名前入りプレースホルダ+枚数バッジ)
function drawCardTile(ctx, row, card, img, x, y, w, h) {
  rrPath(ctx, x, y, w, h, 10);
  ctx.save();
  ctx.clip();
  if (img) {
    ctx.drawImage(img, x, y, w, h);
  } else {
    ctx.fillStyle = "#23262f";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = IMG_C.muted;
    ctx.font = `13px ${IMG_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    wrapTextCentered(ctx, card ? jpName(card) : row.card_slug, x + w / 2, y + h / 2, w - 16, 17);
  }
  ctx.restore();
  rrPath(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 10);
  ctx.strokeStyle = IMG_C.line;
  ctx.lineWidth = 1;
  ctx.stroke();
  // 枚数バッジ(左下)
  const bs = 36, bx = x + 8, by = y + h - bs - 8;
  rrPath(ctx, bx, by, bs, bs, 8);
  ctx.fillStyle = IMG_C.badge;
  ctx.fill();
  ctx.strokeStyle = IMG_C.gold;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = IMG_C.gold;
  ctx.font = `bold 23px ${IMG_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(row.qty), bx + bs / 2, by + bs / 2 + 1);
}

// デッキ画像本体の合成。戻り値 {canvas, failedCount}。デッキが空なら null
async function buildDeckImage(data, onProgress) {
  const cards = data.cards.filter((c) => c.board !== "maybe"); // 検討中は含めない(omnidexコピーと同じ)
  const bySlug = await ensureCards(cards.map((c) => c.card_slug));

  const sections = imgZones(normalizeFormat(data.deck.format)).map(({ zone, title }) => ({
    zone, title,
    rows: cards.filter((c) => c.board === zone).sort(zoneComparator(zone, bySlug)),
  })).filter((s) => s.rows.length);
  if (!sections.length) return null;

  const allRows = sections.flatMap((s) => s.rows);
  const orbSrcs = deckDisplayElements(allRows, bySlug).map((e) => {
    const card = orbSourceCard(e, allRows, bySlug);
    return { element: e, url: card ? imageUrl(card) : null };
  });
  const tileUrl = (r) => rowImageUrl(r, bySlug.get(r.card_slug));
  const imgMap = await loadImagesPooled(
    [...allRows.map(tileUrl), ...orbSrcs.map((o) => o.url)], onProgress);

  const failedCount = allRows.filter((r) => !imgMap.get(tileUrl(r))).length;
  if (failedCount === allRows.length) throw new Error("カード画像を1枚も取得できませんでした");

  // レイアウト: 幅1200固定・7列・高さはデッキ内容に応じて可変
  const W = 1200, MARGIN = 40, COLS = 7, GAP = 14;
  const cardW = Math.floor((W - MARGIN * 2 - GAP * (COLS - 1)) / COLS);
  const cardH = Math.round(cardW / 0.714); // 公式カード画像の縦横比
  const HEADER_H = 150, SEC_H = 54, FOOTER_H = 72;
  const rowsOf = (n) => Math.ceil(n / COLS);
  let H = HEADER_H;
  sections.forEach((s) => { H += SEC_H + rowsOf(s.rows.length) * (cardH + GAP); });
  H += FOOTER_H + MARGIN;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = IMG_C.bg;
  ctx.fillRect(0, 0, W, H);

  // ヘッダ帯: GAロゴ+デッキ名+チャンピオン+エレメント(右上)
  ctx.fillStyle = IMG_C.panel;
  ctx.fillRect(0, 0, W, HEADER_H);
  ctx.fillStyle = IMG_C.gold;
  ctx.fillRect(0, HEADER_H - 3, W, 3);
  rrPath(ctx, MARGIN, 34, 60, 60, 12);
  ctx.fill();
  ctx.fillStyle = IMG_C.goldDark;
  ctx.font = `bold 28px ${IMG_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("GA", MARGIN + 30, 64);

  // エレメント(右寄せ。幅を先に計算してデッキ名の最大幅を決める)
  const ORB = 30, ORB_GAP = 9, ITEM_GAP = 26;
  ctx.font = `bold 22px ${IMG_FONT}`;
  const orbItems = orbSrcs.map((o) => ({ ...o, tw: ctx.measureText(o.element).width }));
  const elemsW = orbItems.reduce((s, it) => s + ORB + ORB_GAP + it.tw, 0)
    + ITEM_GAP * Math.max(0, orbItems.length - 1);
  let ex = W - MARGIN - elemsW;
  orbItems.forEach((it) => {
    const img = it.url ? imgMap.get(it.url) : null;
    if (img) drawElementOrb(ctx, img, ex, 50 - ORB / 2, ORB);
    ctx.fillStyle = IMG_C.text;
    ctx.font = `bold 22px ${IMG_FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(it.element, ex + ORB + ORB_GAP, 50);
    ex += ORB + ORB_GAP + it.tw + ITEM_GAP;
  });

  const nameMaxW = W - MARGIN - elemsW - (MARGIN + 82) - 24;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = IMG_C.text;
  ctx.font = `bold 34px ${IMG_FONT}`;
  ctx.fillText(ellipsize(ctx, data.deck.name, nameMaxW), MARGIN + 82, 36);
  const champ = deckChampionName(sections, bySlug);
  if (champ) {
    ctx.fillStyle = IMG_C.muted;
    ctx.font = `20px ${IMG_FONT}`;
    ctx.fillText(ellipsize(ctx, `チャンピオン: ${champ}`, nameMaxW), MARGIN + 84, 84);
  }

  // セクション(見出し+カードグリッド)
  let y = HEADER_H;
  sections.forEach((s) => {
    ctx.fillStyle = IMG_C.text;
    ctx.font = `bold 26px ${IMG_FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(s.title, MARGIN, y + SEC_H / 2);
    const total = s.rows.reduce((sum, r) => sum + r.qty, 0);
    let count = `${total} cards`;
    if (s.zone === "side") {
      const pt = s.rows.reduce((sum, r) => sum + sidePoints(bySlug.get(r.card_slug)) * r.qty, 0);
      count += ` · ${pt} pt`;
    }
    ctx.fillStyle = IMG_C.muted;
    ctx.font = `20px ${IMG_FONT}`;
    ctx.fillText(count, MARGIN + 240, y + SEC_H / 2 + 2);
    y += SEC_H;
    s.rows.forEach((r, i) => {
      drawCardTile(ctx, r, bySlug.get(r.card_slug), imgMap.get(tileUrl(r)),
        MARGIN + (i % COLS) * (cardW + GAP), y + Math.floor(i / COLS) * (cardH + GAP), cardW, cardH);
    });
    y += rowsOf(s.rows.length) * (cardH + GAP);
  });

  // フッタ帯: 控えめな灰色URLのみ
  const fy = H - FOOTER_H;
  ctx.fillStyle = IMG_C.panel;
  ctx.fillRect(0, fy, W, FOOTER_H);
  ctx.fillStyle = IMG_C.gold;
  ctx.fillRect(0, fy, W, 2);
  ctx.fillStyle = IMG_C.muted;
  ctx.font = `21px ${IMG_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(IMG_SITE, W / 2, fy + FOOTER_H / 2);

  return { canvas, failedCount };
}

// ---------- デッキ画像ダイアログ ----------

let imageBlob = null;      // 直近生成したPNG
let imageBlobUrl = null;   // そのオブジェクトURL(再生成時に破棄)
let imageFileName = "deck.png"; // 生成時のデッキ名で確定(保存時にデッキを移動していても正しい名前になる)
let imageSeq = 0;          // 生成の競合防止(連打・デッキ切替)

function deckImageFileName(deckName) {
  const name = String(deckName || "deck").replace(/[\\/:*?"<>|]/g, "_").trim() || "deck";
  return `${name}.png`;
}
function deckImageFile(blob) {
  return new File([blob], imageFileName, { type: "image/png" });
}

async function openDeckImageModal() {
  if (!deckData) return;
  if (!deckData.cards.some((c) => c.board !== "maybe")) { showToast("デッキが空です", true); return; }
  const deckName = deckData.deck.name; // 生成中に別デッキへ移動してもファイル名はこのデッキ名
  const seq = ++imageSeq;
  el.imagePreviewWrap.hidden = true;
  el.imageSave.disabled = true;
  el.imageShare.hidden = true;
  el.imageStatus.textContent = "カード画像を取得中…";
  openModal(el.imageModal);
  try {
    const result = await buildDeckImage(deckData, (done, total) => {
      if (seq === imageSeq) el.imageStatus.textContent = `カード画像を取得中… ${done} / ${total}`;
    });
    if (seq !== imageSeq) return;
    if (!result) { el.imageStatus.textContent = "デッキが空です。カードを追加してから生成してください。"; return; }
    el.imageStatus.textContent = "画像を生成中…";
    const blob = await new Promise((resolve) => result.canvas.toBlob(resolve, "image/png"));
    if (seq !== imageSeq) return;
    if (!blob) throw new Error("PNGへの変換に失敗しました");
    if (imageBlobUrl) URL.revokeObjectURL(imageBlobUrl);
    imageBlob = blob;
    imageFileName = deckImageFileName(deckName);
    imageBlobUrl = URL.createObjectURL(blob);
    el.imagePreview.src = imageBlobUrl;
    el.imagePreviewWrap.hidden = false;
    el.imageSave.disabled = false;
    let canShare = false;
    try { canShare = !!(navigator.canShare && navigator.canShare({ files: [deckImageFile(blob)] })); }
    catch { /* canShare未対応は共有ボタンを出さない */ }
    el.imageShare.hidden = !canShare;
    el.imageStatus.textContent = result.failedCount
      ? `⚠ ${result.failedCount}種のカード画像を取得できなかったため、カード名入りの枠で代替しています。`
      : "できあがりです。保存してXなどに投稿できます。";
  } catch (err) {
    if (seq !== imageSeq) return;
    el.imageStatus.textContent = `生成に失敗しました(${err.message})`;
  }
}

el.imageSave.addEventListener("click", () => {
  if (!imageBlob || !imageBlobUrl) return;
  const a = document.createElement("a");
  a.href = imageBlobUrl;
  a.download = deckImageFile(imageBlob).name;
  a.click();
});
el.imageShare.addEventListener("click", async () => {
  if (!imageBlob) return;
  try {
    await navigator.share({ files: [deckImageFile(imageBlob)] });
  } catch (err) {
    // 共有シートのキャンセルはエラー扱いにしない
    if (err && err.name !== "AbortError") showToast(`共有に失敗しました(${err.message})`, true);
  }
});
el.edImage.addEventListener("click", openDeckImageModal);
el.vImage.addEventListener("click", openDeckImageModal);

// ---------- 初期化 ----------

el.deckSort.addEventListener("change", renderDeckList);
$("deck-new-btn").addEventListener("click", openNewDeckModal);
el.deckFilter.addEventListener("change", renderDeckList);
$("login-btn").addEventListener("click", (e) => { e.currentTarget.href = loginUrl(); });
$("v-cta-login").addEventListener("click", (e) => { e.currentTarget.href = loginUrl(); });
window.addEventListener("hashchange", route);

(async function init() {
  // カード詳細モーダル(共通コンポーネント)。カード取得はこのページのキャッシュを使う。
  // 詳細を閉じたとき、下に検索結果等のモーダルが開いたままならスクロールロックを維持する
  GA_CARD_DETAIL.init({
    fetchCard: getCard,
    namesUrl: TL_NAMES_URL,
    effectsUrl: TL_EFFECTS_URL, // 日本語の効果・フレーバーはダイアログを開くときに取得する(#22)
    seasonalUrl: SEASONAL_URL, // シーズン禁止(#34)。init() で取得済みのためここでは待たずに解決する
    onAfterClose: () => {
      // ⚠️ 検索結果パネルはモーダルではないので数えない（設計 §8-4 の3）
      if (!el.omniModal.hidden) document.body.style.overflow = "hidden";
    },
  });
  // 複数選択(AND/OR)の絞り込みグループ。既定は閉じた状態(開くとチップが50個以上並ぶため)。
  // サブタイプは146種あるため上位のみ既定表示にする(#31)
  // ⚠️ search: true は「選択肢を絞り込む欄」のオプトイン。⭐ 全群に渡し、実際にどれへ出すかは
  //    fillChips() 側の閾値（SEARCH_MIN=30種）が決める。ここで群を名指ししない——
  //    将来ほかの群が閾値を超えた日に、何もしなくても欄が現れるようにするため（左ペイン化_設計 §7-2）
  GA_CARD_SEARCH.fillChips(el.sGElement, "elements", { label: "エレメント", orbs: true, search: true });
  GA_CARD_SEARCH.fillChips(el.sGClass, "classes", { label: "クラス", search: true });
  GA_CARD_SEARCH.fillChips(el.sGType, "types", { label: "タイプ", search: true });
  GA_CARD_SEARCH.fillChips(el.sGSubtype, "subtypes", { label: "サブタイプ", top: GA_CARD_SEARCH.SUBTYPE_TOP, search: true });
  GA_CARD_SEARCH.fillChips(el.sGRarity, "rarities", { label: "レアリティ", search: true });
  GA_CARD_SEARCH.fillFormatSelect(el.sFormat);
  GA_CARD_SEARCH.fillSetSelect(el.sSet);
  // 絞り込みは「🔍 検索」ボタン(とEnter)で走らせる既存挙動を保つ。
  // チップの変更では再検索せず、畳んだときに見えるバッジだけ更新する
  filterGroups().forEach((g) => g.onChange(updateFilterBadge));
  // 絞り込みグループのアコーディオン（左ペインが出る 1200px 以上のみ。1つ開いたら他は閉じる）。
  // ⚠️ 閾値は style.css の左ペイン化のメディアクエリと必ず揃える。⭐ G-2（設計 §14-2）で
  //    トップと同じ 1200px に統一したが、ずれてよいという意味ではない——ずれると
  //    「左ペインが無いのにアコーディオンだけ効く」帯ができ、閉じた群の中身を補う
  //    「選択中の条件」も出ないため、選んだ条件が画面のどこにも見えなくなる（設計 §7-4）
  GA_CARD_SEARCH.initAccordion({ groups: filterGroups, minWidth: PANE_MIN_WIDTH });
  updateFilterBadge();
  // 画面(デッキ一覧・ゾーン)を描く前にカード名の訳を入れる。失敗しても resolve する
  // （fail-open＝英語名で描画されるだけ・#22 R3）
  await namesReady;
  await seasonalReady; // シーズン禁止(#34)。タイル・フォーマット適合の描画前に確定させる
  try {
    const data = await api("/api/me");
    me = data.user;
  } catch { me = null; }
  renderAuthArea();
  await resumePendingCopy();
  route();
})();
