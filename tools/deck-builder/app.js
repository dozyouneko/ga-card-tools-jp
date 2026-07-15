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
  jpName, imageUrl, backFace, cardImages,
  escapeHtml, hasJapanese,
  FORMAT_JP, EXCLUSIVE_FORMAT_INFO, bannedFormats, exclusiveFormat, exclusiveNote,
} = window.GA_CARD_I18N;

const ZONES = ["material", "main", "side", "maybe"];
const ZONE_LABEL = { material: "マテリアルデッキ", main: "メインデッキ", side: "サイドボード", maybe: "検討中" };
const ZONE_SHORT = { material: "マテリアル", main: "メイン", side: "サイド", maybe: "検討中" };
const MAIN_MAX = 60, MATERIAL_MAX = 12, SIDE_MAX_PT = 15, SIDE_MAX_CARDS = 15;

const $ = (id) => document.getElementById(id);
const el = {
  bootStatus: $("boot-status"),
  authArea: $("auth-area"),
  viewLogin: $("view-login"),
  viewDecks: $("view-decks"),
  viewEditor: $("view-editor"),
  viewDeck: $("view-deck"),
  deckSort: $("deck-sort"),
  deckList: $("deck-list"),
  edTitle: $("ed-title"),
  edRename: $("ed-rename"),
  edPub: $("ed-pub"),
  edSave: $("ed-save"),
  edCopyText: $("ed-copy-text"),
  edCopyLink: $("ed-copy-link"),
  edMemo: $("ed-memo"),
  memoStatus: $("memo-status"),
  sName: $("s-name"),
  sText: $("s-text"),
  sClass: $("s-class"),
  sElement: $("s-element"),
  sType: $("s-type"),
  sSubtype: $("s-subtype"),
  sSet: $("s-set"),
  sSort: $("s-sort"),
  sOrder: $("s-order"),
  sReset: $("s-reset"),
  sSearch: $("s-search"),
  searchTop: $("search-top"),
  sToggle: $("s-toggle"),
  resultModal: $("result-modal"),
  resultTitle: $("result-title"),
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
};

// ---------- 状態 ----------
let me = null;        // ログイン中ユーザー({id, display_name, avatar_url}) or null
let myDecks = [];     // 自分のデッキ一覧
let deckData = null;  // 編集/閲覧中のデッキ {deck, cards, owner, is_owner}
let deckSeq = 0;      // 画面遷移の競合防止
const cardCache = new Map(); // slug -> Promise<card|null>

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

// デッキ行のイラスト。art_image(版指定)があればそれを、なければカードのデフォルト(先頭の版)を使う
function rowImageUrl(row, card) {
  if (row.art_image) return API + row.art_image;
  return card ? imageUrl(card) : null;
}

// カードを入れられないゾーンか(マテリアル系はメイン不可、メイン系はマテリアル不可。サイド/検討中は両方可)
function zoneDisallowed(card, zone) {
  if (!card) return false;
  if (zone === "material") return !isMaterialCard(card);
  if (zone === "main") return isMaterialCard(card);
  return false;
}

// ---------- フォーマット(禁止/専用)表示 ----------
// 判定ロジック(bannedFormats/exclusiveFormat等)は shared/js/card-i18n.js に共通化済み。

// タイル左上に載せる小さなアイコン({icon, title})。該当なしは null
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
  const anyOpen = [el.resultModal, el.omniModal, el.importModal, el.artModal, el.imageModal].some((m) => !m.hidden) || GA_CARD_DETAIL.isOpen();
  if (!anyOpen) document.body.style.overflow = "";
}
[["result-modal"], ["omni-modal"], ["import-modal"], ["art-modal"], ["image-modal"]].forEach(([id]) => {
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
  if (!el.artModal.hidden) { closeModal(el.artModal); return; }
  if (!el.imageModal.hidden) { closeModal(el.imageModal); return; }
  if (!el.importModal.hidden) { closeModal(el.importModal); return; }
  if (!el.omniModal.hidden) { closeModal(el.omniModal); return; }
  if (!el.resultModal.hidden) closeModal(el.resultModal);
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
    renderDeckList();
  } catch (err) {
    if (seq !== deckSeq) return;
    if (err.status === 401) { me = null; renderAuthArea(); showView(el.viewLogin); return; }
    setStatus(`デッキ一覧の読み込みに失敗しました(${err.message})`);
  }
}

function sortedDecks() {
  const mode = el.deckSort.value;
  const decks = [...myDecks];
  if (mode === "name") decks.sort((a, b) => a.name.localeCompare(b.name, "ja"));
  else if (mode === "created") decks.sort((a, b) => b.created_at.localeCompare(a.created_at));
  else decks.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  return decks;
}

function renderDeckList() {
  const frag = document.createDocumentFragment();

  sortedDecks().forEach((d) => {
    const item = document.createElement("article");
    item.className = "deck-item";
    item.innerHTML = `
      <div class="thumb-wrap" data-thumb-wrap><span class="champ-thumb-ph" data-thumb>🂠</span></div>
      <div class="deck-info">
        <h3>${escapeHtml(d.name)}</h3>
        <p class="deck-sub">
          <span class="${d.is_public ? "badge-pub" : "badge-priv"}">${d.is_public ? "公開" : "非公開"}</span>
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

async function createDeck() {
  const name = prompt("デッキ名を入力してください", "新しいデッキ");
  if (!name || !name.trim()) return;
  try {
    const res = await api("/api/decks", { method: "POST", body: { name: name.trim(), is_public: false } });
    location.hash = `#edit/${res.deck.id}`;
  } catch (err) { showToast(`作成に失敗しました(${deckCreateErrorMessage(err)})`, true); }
}

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

// 読み込み中に前回開いていたデッキの内容が見えないよう、編集ビューを空にする
// (デッキ一覧・共有閲覧の innerHTML="" と同じ役割)
// 検索フォームを初期状態に戻す(リセットボタンとデッキ切替時の両方から使う)
function resetSearchForm() {
  el.sName.value = "";
  el.sText.value = "";
  [el.sClass, el.sElement, el.sType, el.sSubtype, el.sSet].forEach((s) => { s.value = ""; });
  el.sSort.value = "name";
  el.sOrder.dataset.dir = "ASC";
  el.sOrder.textContent = "▲ 昇順";
}

function clearEditor() {
  clearTimeout(memoTimer); // 前のデッキのメモ自動保存が新しいデッキに書かれるのを防ぐ
  resetSearchForm(); // 前のデッキで入力した検索条件を持ち越さない
  el.edTitle.textContent = "";
  el.edPub.hidden = true;
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
    renderEditorBar();
    renderZones();
  } catch (err) {
    if (seq !== deckSeq) return;
    setStatus(err.status === 404 ? "デッキが見つかりません。" : `読み込みに失敗しました(${err.message})`);
  }
}

function renderEditorBar() {
  const d = deckData.deck;
  el.edTitle.textContent = d.name;
  el.edPub.hidden = false;
  el.edPub.textContent = d.is_public ? "公開" : "非公開";
  el.edPub.className = d.is_public ? "badge-pub" : "badge-priv";
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

async function renderZones() {
  const seq = deckSeq;
  const cards = deckData.cards;
  const bySlug = await ensureCards(cards.map((c) => c.card_slug));
  if (seq !== deckSeq) return;

  let materialFirst = null; // マテリアル表示順の先頭(サムネ自動設定用)
  ZONES.forEach((zone) => {
    const zoneEl = document.querySelector(`.zone[data-zone="${zone}"]`);
    const grid = zoneEl.querySelector(".zone-grid");
    const rows = cards
      .filter((c) => c.board === zone)
      .sort(zoneComparator(zone, bySlug));
    if (zone === "material") materialFirst = rows[0] || null;

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
          <button data-step="1" aria-label="増やす">＋</button>
          <button data-menu aria-label="その他">⋯</button>
        </div>`;
      grid.appendChild(tile);
    });

    updateZoneHeader(zone, rows, bySlug);
  });

  autoAssignThumb(materialFirst, bySlug);
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

function updateZoneHeader(zone, rows, bySlug) {
  const zoneEl = document.querySelector(`.zone[data-zone="${zone}"]`);
  const cnt = zoneEl.querySelector(".cnt");
  const bar = zoneEl.querySelector(".meter > i");
  const total = rows.reduce((s, r) => s + r.qty, 0);

  const setBar = (ratio, full, over) => {
    if (!bar) return;
    bar.style.width = `${Math.min(100, ratio * 100)}%`;
    bar.classList.toggle("ok", !!full);
    bar.classList.toggle("over", !!over);
  };

  if (zone === "main" || zone === "material") {
    const max = zone === "main" ? MAIN_MAX : MATERIAL_MAX;
    cnt.textContent = `${total} / ${max}`;
    cnt.classList.toggle("ok", total === max);
    cnt.classList.toggle("over", total > max);
    setBar(total / max, total === max, total > max);
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
  // 現在いるゾーンへの移動は出さない。カード種別的に入れられないゾーンも出さない
  el.tileMenu.querySelectorAll("[data-move]").forEach((b) => { b.hidden = b.dataset.move === board; });
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
  const parts = [
    section("material", "Material Deck"),
    section("main", "Main Deck"),
    section("side", "Sideboard"),
  ].filter(Boolean);
  return parts.length ? parts.join("\n\n") + "\n" : null;
}

// 内容をダイアログで確認してからコピーする
el.edCopyText.addEventListener("click", async () => {
  const text = await buildOmnidexText();
  if (!text) { showToast("デッキが空です", true); return; }
  el.omniText.textContent = text;
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
// カード取得はこのページのキャッシュ(getCard)を使い、結果はダイアログに描画する。
const searchCtl = GA_CARD_SEARCH.create({
  els: {
    name: el.sName, text: el.sText,
    cls: el.sClass, element: el.sElement, type: el.sType, subtype: el.sSubtype,
    set: el.sSet, sort: el.sSort, order: el.sOrder,
  },
  pageSize: 24,
  jpPageSize: 24,
  fetchCard: getCard,
  onStart: (reset) => {
    if (reset) {
      el.resultGrid.innerHTML = "";
      openModal(el.resultModal);
    }
    el.resultCount.textContent = "検索中…";
    el.resultMore.disabled = true;
  },
  onResults: (cards, info) => {
    cards.forEach((card) => { cardCache.set(card.slug, Promise.resolve(card)); });
    appendResults(cards);
    const shown = el.resultGrid.childElementCount;
    el.resultCount.textContent = shown === 0
      ? "該当するカードがありません。条件を変えてお試しください。"
      : `${shown} 件を表示${info.total > shown ? ` / 全 ${info.total} 件` : ""}${info.jpMode ? "（日本語一致・翻訳済みのみ）" : ""}`;
    el.resultMore.hidden = !info.hasMore;
    el.resultMore.disabled = false;
  },
  onError: (err) => {
    el.resultCount.textContent = `検索に失敗しました(${err.message})`;
    el.resultMore.disabled = false;
  },
});

function runSearch(reset) { searchCtl.run(reset); }

// デッキ全体(全ゾーン)での投入枚数(ダイアログのバッジ用)
function totalQtyInDeck(slug) {
  return deckData.cards.filter((c) => c.card_slug === slug).reduce((s, c) => s + c.qty, 0);
}

// 検索結果1件の追加ボタン行。入っているゾーンは「− n ＋」のミニステッパーになる
function renderAddRow(item, card) {
  const row = item.querySelector(".addrow");
  row.innerHTML = ZONES.map((zone) => {
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

function updateResultBadge(item, slug) {
  const badge = item.querySelector(".in-deck");
  const n = totalQtyInDeck(slug);
  badge.textContent = `${n}枚`;
  badge.hidden = n === 0;
}

function appendResults(cards) {
  const frag = document.createDocumentFragment();
  cards.forEach((card) => {
    const imgs = cardImages(card);
    const url = imgs.length ? imgs[0].url : null;
    const back = backFace(card); // 両面カードなら裏面(無ければ null)
    const item = document.createElement("div");
    item.className = "result";
    item.dataset.slug = card.slug;
    const inDeck = totalQtyInDeck(card.slug);
    item.innerHTML = `
      <div class="cardph">
        ${url ? `<img loading="lazy" src="${escapeHtml(url)}" alt="">` : `<div class="noimg">${escapeHtml(jpName(card))}</div>`}
        ${formatIconHtml(card)}
        ${url && imgs.length > 1 ? `<button class="art-badge" type="button" title="イラスト/版を切り替え（${imgs.length}種）" aria-label="イラストを切り替え">🎨 ${imgs.length}・${escapeHtml(imgs[0].prefix)}</button>` : ""}
        ${url && back ? `<button class="flip-badge" type="button" title="両面カード：表裏を切り替え" aria-label="裏面を表示">🔄 両面</button>` : ""}
        <span class="in-deck" ${inDeck ? "" : "hidden"}>${inDeck}枚</span>
      </div>
      <p class="rname">${escapeHtml(jpName(card))}<span>${escapeHtml(card.name)}</span></p>
      <div class="addrow"></div>`;
    renderAddRow(item, card);

    // イラスト切替(🎨)と表裏切替(🔄)は同じ <img> を共有するため状態を一元管理する(トップページと同じ方式)
    const imgEl = item.querySelector(".cardph img");
    const artBadge = item.querySelector(".art-badge");
    const flipBadge = item.querySelector(".flip-badge");
    if (imgEl && (artBadge || flipBadge)) {
      let ai = 0;              // 選択中の版(イラスト)番号
      let showingBack = false; // 裏面を表示中か
      const syncImg = () => {
        const cur = imgs[ai] || imgs[0];
        if (!cur) return;
        imgEl.src = showingBack && cur.back ? cur.back : cur.url;
        if (flipBadge) flipBadge.textContent = showingBack ? "🔄 裏面" : "🔄 両面";
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
      const summary = zone === "main" ? `${total} / ${MAIN_MAX}`
        : zone === "material" ? `${total} / ${MATERIAL_MAX}`
        : zone === "side" ? `${zoneRows.reduce((s, r) => s + sidePoints(bySlug.get(r.card_slug)) * r.qty, 0)} / ${SIDE_MAX_PT} pt`
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

el.sSearch.addEventListener("click", () => runSearch(true));
[el.sName, el.sText].forEach((input) => {
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") runSearch(true); });
});
el.resultMore.addEventListener("click", () => searchCtl.loadMore());
// 並び替え(名前順など)は結果ダイアログ内にあるため、変更されたら即再検索する
el.sSort.addEventListener("change", () => {
  if (!el.resultModal.hidden) runSearch(true);
});
el.sOrder.addEventListener("click", () => {
  const next = (el.sOrder.dataset.dir || "ASC") === "ASC" ? "DESC" : "ASC";
  el.sOrder.dataset.dir = next;
  el.sOrder.textContent = next === "ASC" ? "▲ 昇順" : "▼ 降順";
  if (!el.resultModal.hidden) runSearch(true); // ダイアログ表示中なら即再検索
});
// スマホでは絞り込みセレクトを折りたたむ(トップページの検索ツールと同じ挙動)
el.sToggle.addEventListener("click", () => {
  const open = el.searchTop.classList.toggle("filters-open");
  el.sToggle.setAttribute("aria-expanded", open ? "true" : "false");
  el.sToggle.textContent = "絞り込み " + (open ? "▲" : "▾");
});
el.sReset.addEventListener("click", resetSearchForm);

// ---------- 共有リンク閲覧 ----------

const VIEW_ZONES = ["material", "main", "side"]; // 「検討中」は共有画面には出さない

async function openDeckView(id) {
  const seq = ++deckSeq;
  showView(el.viewDeck);
  el.vZones.innerHTML = "";
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
  el.vEdit.hidden = !is_owner;
  el.vEdit.href = `#edit/${deck.id}`;
  el.vOwner.innerHTML = `
    <img class="avatar" src="${escapeHtml((owner && owner.avatar_url) || "")}" alt="">
    ${escapeHtml((owner && owner.display_name) || "?")} さんのデッキ ・ 更新 ${escapeHtml((deck.updated_at || "").slice(0, 10))}`;
  el.vCta.hidden = !!me;

  const bySlug = await ensureCards(cards.map((c) => c.card_slug));
  if (seq !== deckSeq) return;

  el.vZones.innerHTML = "";
  VIEW_ZONES.forEach((zone) => {
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
    const created = await api("/api/decks", {
      method: "POST",
      body: {
        name: name.trim(),
        is_public: false,
        cards: ok.map((e) => ({ card_slug: slugByName.get(e.name), board: e.board, qty: e.qty })),
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
  openModal(el.importModal);
});
el.importRun.addEventListener("click", importFromOmnidex);

// ---------- デッキ画像出力(X投稿用) ----------
// デッキ全体をcanvasで1枚のPNG(幅1200・7列)に合成する。カード画像は公式API
// (api.gatcg.com、CORS許可済み)から crossOrigin で取得するため canvas を汚染しない。
// 意匠・切り出し座標などの決定事項は tmp/X投稿用/デッキ画像機能/仕様.md(git管理外)。

const IMG_SITE = "ga-card-tools-jp.pages.dev";
const IMG_ZONES = [
  { zone: "material", title: "Materials" },
  { zone: "main", title: "Main Deck" },
  { zone: "side", title: "Sideboard" },
];
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

  const sections = IMG_ZONES.map(({ zone, title }) => ({
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
$("deck-new-btn").addEventListener("click", createDeck);
$("login-btn").addEventListener("click", (e) => { e.currentTarget.href = loginUrl(); });
$("v-cta-login").addEventListener("click", (e) => { e.currentTarget.href = loginUrl(); });
window.addEventListener("hashchange", route);

(async function init() {
  // カード詳細モーダル(共通コンポーネント)。カード取得はこのページのキャッシュを使う。
  // 詳細を閉じたとき、下に検索結果等のモーダルが開いたままならスクロールロックを維持する
  GA_CARD_DETAIL.init({
    fetchCard: getCard,
    onAfterClose: () => {
      if (!el.resultModal.hidden || !el.omniModal.hidden) document.body.style.overflow = "hidden";
    },
  });
  GA_CARD_SEARCH.fillSelect(el.sClass, "classes");
  GA_CARD_SEARCH.fillSelect(el.sElement, "elements");
  GA_CARD_SEARCH.fillSelect(el.sType, "types");
  GA_CARD_SEARCH.fillSelect(el.sSubtype, "subtypes");
  GA_CARD_SEARCH.fillSetSelect(el.sSet);
  try {
    const data = await api("/api/me");
    me = data.user;
  } catch { me = null; }
  renderAuthArea();
  await resumePendingCopy();
  route();
})();
