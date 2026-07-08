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
  resultModal: $("result-modal"),
  resultTitle: $("result-title"),
  resultCount: $("result-count"),
  resultGrid: $("result-grid"),
  resultMore: $("result-more"),
  omniModal: $("omni-modal"),
  omniText: $("omni-text"),
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

// 公式APIからカード1枚を取得(Promiseをキャッシュ)
function getCard(slug) {
  if (!cardCache.has(slug)) {
    cardCache.set(slug, fetch(`${API}/cards/${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null));
  }
  return cardCache.get(slug);
}

// チャンピオン/レガリア(=マテリアルデッキ専用)か。ゾーン制限とポイント計算に使う
function isMaterialCard(card) {
  const t = (card && card.types) || [];
  return t.includes("CHAMPION") || t.includes("REGALIA");
}
function sidePoints(card) { return isMaterialCard(card) ? 3 : 1; }

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
  const anyOpen = [el.resultModal, el.omniModal].some((m) => !m.hidden) || GA_CARD_DETAIL.isOpen();
  if (!anyOpen) document.body.style.overflow = "";
}
[["result-modal"], ["omni-modal"]].forEach(([id]) => {
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

function countPill(label, n, max) {
  const full = n === max;
  return `<span class="count-pill${full ? " full" : ""}">${label} ${n}/${max}</span>`;
}

function renderDeckList() {
  const frag = document.createDocumentFragment();

  const newBtn = document.createElement("button");
  newBtn.className = "deck-new";
  newBtn.textContent = "＋ 新しいデッキを作る";
  newBtn.addEventListener("click", createDeck);
  frag.appendChild(newBtn);

  sortedDecks().forEach((d) => {
    const item = document.createElement("article");
    item.className = "deck-item";
    item.innerHTML = `
      <div class="top">
        <span class="champ-thumb" data-thumb>🂠</span>
        <h3>${escapeHtml(d.name)}</h3>
        <span class="${d.is_public ? "badge-pub" : "badge-priv"}">${d.is_public ? "公開" : "非公開"}</span>
      </div>
      <div class="deck-meta">
        ${countPill("メイン", d.main_count, MAIN_MAX)}
        ${countPill("マテリアル", d.material_count, MATERIAL_MAX)}
        <span>更新: ${escapeHtml(relativeTime(d.updated_at))}</span>
      </div>
      <div class="deck-actions">
        <a class="btn btn-sm btn-primary" href="#edit/${escapeHtml(d.id)}">編集</a>
        <button class="btn btn-sm" data-share>🔗 共有</button>
        <button class="btn btn-sm" data-rename>リネーム</button>
        <button class="btn btn-sm btn-danger" data-delete>削除</button>
      </div>`;

    // サムネイル(champion_slug のカード画像)。無ければプレースホルダーのまま
    if (d.champion_slug) {
      getCard(d.champion_slug).then((card) => {
        const url = card && imageUrl(card);
        if (!url) return;
        const img = document.createElement("img");
        img.className = "champ-thumb";
        img.alt = "";
        img.src = url;
        const ph = item.querySelector("[data-thumb]");
        if (ph) ph.replaceWith(img);
      });
    }

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
      } catch (err) { showToast(`リネームに失敗しました(${err.message})`, true); }
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

async function createDeck() {
  const name = prompt("デッキ名を入力してください", "新しいデッキ");
  if (!name || !name.trim()) return;
  try {
    const res = await api("/api/decks", { method: "POST", body: { name: name.trim() } });
    location.hash = `#edit/${res.deck.id}`;
  } catch (err) { showToast(`作成に失敗しました(${err.message})`, true); }
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

async function openEditor(id) {
  const seq = ++deckSeq;
  if (!me) { showView(el.viewLogin); return; }
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
  el.edPub.textContent = d.is_public ? "公開" : "非公開";
  el.edPub.className = d.is_public ? "badge-pub" : "badge-priv";
}

async function renderZones() {
  const seq = deckSeq;
  const cards = deckData.cards;
  const bySlug = await ensureCards(cards.map((c) => c.card_slug));
  if (seq !== deckSeq) return;

  ZONES.forEach((zone) => {
    const zoneEl = document.querySelector(`.zone[data-zone="${zone}"]`);
    const grid = zoneEl.querySelector(".zone-grid");
    const rows = cards
      .filter((c) => c.board === zone)
      .sort((a, b) => a.card_slug.localeCompare(b.card_slug));

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
      const url = card && imageUrl(card);
      const name = card ? jpName(card) : row.card_slug;
      tile.innerHTML = `
        ${url ? `<img loading="lazy" src="${escapeHtml(url)}" alt="${escapeHtml(name)}" title="${escapeHtml(name)}">`
              : `<div class="noimg">${escapeHtml(name)}</div>`}
        ${card ? formatIconHtml(card) : ""}
        <span class="qty-badge">×${row.qty}</span>
        ${zone === "side" && card && isMaterialCard(card) ? `<span class="pt-tag">3pt</span>` : ""}
        <div class="ctrl-strip">
          <button data-step="-1" aria-label="減らす">−</button>
          <span class="qv">${row.qty}</span>
          <button data-step="1" aria-label="増やす">＋</button>
          <button data-menu aria-label="その他">⋯</button>
        </div>`;
      grid.appendChild(tile);
    });

    updateZoneHeader(zone, rows, bySlug);
  });
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

// カード追加(同じゾーンに既にあれば加算)。成功したらゾーンを再描画
async function addCard(slug, board, qty = 1) {
  beginSave();
  try {
    const res = await api(`/api/decks/${deckData.deck.id}/cards`, {
      method: "POST",
      body: { card_slug: slug, board, qty },
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
  beginSave();
  try {
    await api(`/api/decks/${deckData.deck.id}/cards/${encodeURIComponent(slug)}?board=${encodeURIComponent(board)}`, { method: "DELETE" });
    deckData.cards = deckData.cards.filter((c) => !(c.card_slug === slug && c.board === board));
    await renderZones();
    if (opts.undo && restoreQty > 0) {
      showToast(`「${await cardName(slug)}」を${ZONE_LABEL[board]}から削除しました`, false, {
        label: "元に戻す",
        fn: () => addCard(slug, board, restoreQty).catch((err) => showToast(`復元に失敗しました(${err.message})`, true)),
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
      body: { card_slug: slug, board: to, qty: 1 },
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
  if (!btn) { openDetail(slug); return; } // 操作バー以外のクリック → カード詳細
  if (btn.dataset.menu !== undefined) { openTileMenu(btn, slug, board); return; }
  const step = Number(btn.dataset.step);
  const entry = findEntry(slug, board);
  if (!entry) return;
  setQty(slug, board, entry.qty + step).catch((err) => showToast(`保存に失敗しました(${err.message})`, true));
});

// ---------- タイルの「⋯」メニュー ----------

let menuContext = null; // { slug, board }

function openTileMenu(anchor, slug, board) {
  menuContext = { slug, board };
  // 現在いるゾーンへの移動は出さない。カード種別的に入れられないゾーンも出さない
  el.tileMenu.querySelectorAll("[data-move]").forEach((b) => { b.hidden = b.dataset.move === board; });
  getCard(slug).then((card) => {
    if (!menuContext || menuContext.slug !== slug) return;
    el.tileMenu.querySelectorAll("[data-move]").forEach((b) => {
      if (zoneDisallowed(card, b.dataset.move)) b.hidden = true;
    });
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
  if (btn.dataset.act === "thumb") {
    beginSave();
    try {
      const res = await api(`/api/decks/${deckData.deck.id}`, { method: "PATCH", body: { champion_slug: slug } });
      deckData.deck = res.deck;
      showToast(`「${await cardName(slug)}」をサムネイルに設定しました`);
    } catch (err) { showToast(`設定に失敗しました(${err.message})`, true); }
    finally { endSave(); }
    return;
  }
  if (btn.dataset.act === "delete") {
    removeCard(slug, board, { undo: true }).catch((err) => showToast(`削除に失敗しました(${err.message})`, true));
  }
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
  } catch (err) { showToast(`リネームに失敗しました(${err.message})`, true); }
  finally { endSave(); }
});

el.edPub.addEventListener("click", async () => {
  const next = !deckData.deck.is_public;
  beginSave();
  try {
    const res = await api(`/api/decks/${deckData.deck.id}`, { method: "PATCH", body: { is_public: next } });
    deckData.deck = res.deck;
    renderEditorBar();
    showToast(next ? "デッキを公開にしました" : "デッキを非公開にしました(共有リンクからも見えなくなります)");
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
            <b>${entry.qty}</b>
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
      await addCard(slug, zone, 1);
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

el.sSearch.addEventListener("click", () => runSearch(true));
[el.sName, el.sText].forEach((input) => {
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") runSearch(true); });
});
el.resultMore.addEventListener("click", () => searchCtl.loadMore());
el.sOrder.addEventListener("click", () => {
  const next = (el.sOrder.dataset.dir || "ASC") === "ASC" ? "DESC" : "ASC";
  el.sOrder.dataset.dir = next;
  el.sOrder.textContent = next === "ASC" ? "▲ 昇順" : "▼ 降順";
  if (!el.resultModal.hidden) runSearch(true); // ダイアログ表示中なら即再検索
});
el.sReset.addEventListener("click", () => {
  el.sName.value = "";
  el.sText.value = "";
  [el.sClass, el.sElement, el.sType, el.sSubtype, el.sSet].forEach((s) => { s.value = ""; });
  el.sSort.value = "name";
  el.sOrder.dataset.dir = "ASC";
  el.sOrder.textContent = "▲ 昇順";
});

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
      ? "デッキが見つかりません。削除されたか、非公開に設定されている可能性があります。"
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
    const rows = cards.filter((c) => c.board === zone).sort((a, b) => a.card_slug.localeCompare(b.card_slug));
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
      const url = card && imageUrl(card);
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

async function copyDeckToMine(id) {
  setStatus("デッキをコピー中…");
  try {
    const src = await api(`/api/decks/${encodeURIComponent(id)}`);
    const created = await api("/api/decks", {
      method: "POST",
      body: { name: `${src.deck.name} のコピー`, champion_slug: src.deck.champion_slug || undefined },
    });
    await Promise.all(src.cards.map((c) =>
      api(`/api/decks/${created.deck.id}/cards`, {
        method: "POST",
        body: { card_slug: c.card_slug, board: c.board, qty: c.qty },
      })
    ));
    showToast(`「${created.deck.name}」として自分のデッキ一覧にコピーしました`);
    location.hash = `#edit/${created.deck.id}`;
  } catch (err) {
    el.bootStatus.hidden = true;
    showToast(`コピーに失敗しました(${err.message})`, true);
  }
}

async function resumePendingCopy() {
  const pending = localStorage.getItem(PENDING_COPY_KEY);
  if (!pending || !me) return;
  localStorage.removeItem(PENDING_COPY_KEY);
  await copyDeckToMine(pending);
}

// ---------- 初期化 ----------

el.deckSort.addEventListener("change", renderDeckList);
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
