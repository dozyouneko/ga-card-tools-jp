// 運営ダッシュボード（issue #56）— スナップショット → 自己完結HTML。
//
// 設計書 §7 / モック `docs/design/56-運営ダッシュボード/ダッシュボード_モック.html` が配色・余白の正。
// ⚠️ これは**ローカル生成専用**のHTMLなので、本番の `style-src 'self'` は掛からない＝インライン
//    `style` を使ってよい（棒グラフの幅指定に使う）。**本番のコードとこの書き方を混ぜないこと。**
// ⚠️ 出力先は `tmp/dashboard/` だけ。`docs/` `data/` に数値を書き出してはいけない（§4.1）。

// ⚠️ 印刷ツールのビーコン設置日（§7.3）。**実際に push した日に書き換えること。**
//    この日より前の `/tools/print/` の閲覧数は「使われていない」ではなく「計測していない」。
export const PRINT_BEACON_SINCE = "2026-08-09";

const NF = new Intl.NumberFormat("ja-JP");

export function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** 3桁区切り。0は空欄ではなく 0 と書く（§7.1-5）。値が無いときだけ — */
function num(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
  return NF.format(Number(n));
}

/** 率は小数第1位まで（§7.1-5）。分母0は — */
function pct(part, whole) {
  const w = Number(whole || 0);
  if (!w) return "—";
  return `${((Number(part || 0) / w) * 100).toFixed(1)}%`;
}
function pctNum(part, whole) {
  const w = Number(whole || 0);
  if (!w) return 0;
  return (Number(part || 0) / w) * 100;
}

/** 前週比。比較対象が0/不明のときは — （`+∞%` や `NaN` を出さない・§7.2） */
function delta(current, previous) {
  if (current === null || current === undefined || previous === null || previous === undefined) {
    return `<div class="dlt flat">—　前週比</div>`;
  }
  const d = Number(current) - Number(previous);
  const base = Number(previous);
  if (!base) return `<div class="dlt flat">—　前週比</div>`;
  const rate = (d / base) * 100;
  const cls = d > 0 ? "up" : d < 0 ? "down" : "flat";
  const sign = d > 0 ? "+" : "";
  return `<div class="dlt ${cls}">${sign}${num(d)}（${sign}${rate.toFixed(1)}%）前週比</div>`;
}

function empty(msg = "データがありません") {
  return `<p class="empty">${esc(msg)}</p>`;
}

function mdLabel(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || ""));
  return m ? `${Number(m[2])}/${Number(m[3])}` : String(ymd || "");
}

/** 棒グラフ（CSSのみ。外部ライブラリは使わない・§7.1-1） */
function spark(series, { suffix = "" } = {}) {
  if (!series.length) return empty();
  const max = Math.max(...series.map((s) => Number(s.v) || 0));
  if (max <= 0) return empty();
  const bars = series
    .map((s) => {
      const v = Number(s.v) || 0;
      const h = Math.max(8, Math.round((v / max) * 100));
      return `<i style="height:${h}%" title="${esc(s.date)}: ${num(v)}${esc(suffix)}"></i>`;
    })
    .join("");
  const first = mdLabel(series[0].date);
  const mid = mdLabel(series[Math.floor(series.length / 2)].date);
  const last = mdLabel(series[series.length - 1].date);
  return `<div class="spark">${bars}</div>
        <div class="axis"><span>${esc(first)}</span><span>${esc(mid)}</span><span>${esc(last)}（UTC）</span></div>`;
}

function meter(label, widthPct, valueText, title) {
  const w = Math.max(0, Math.min(100, Number(widthPct) || 0));
  const t = title ? ` title="${esc(title)}"` : "";
  return `<div class="meter"${t}><span class="mlab">${label}</span><span class="mtrack"><span class="mfill" style="width:${w.toFixed(1)}%"></span></span><span class="mval">${valueText}</span></div>`;
}

// ---------------------------------------------------------------------------
// slug → 日本語名（未収録は slug をそのまま＋(未訳)・§5.1）
// ---------------------------------------------------------------------------
function jaName(slug, names) {
  const n = names && names[slug];
  if (n) return esc(n);
  return `${esc(slug)} <span class="untl">(未訳)</span>`;
}

// ---------------------------------------------------------------------------
// パスの畳み込み（§5.2。上から順に評価し、最初に一致したものを採用）
// ---------------------------------------------------------------------------
export const PATH_CATEGORIES = [
  "トップ（カードDB）",
  "カード一覧",
  "カード個別ページ",
  "セット一覧",
  "セット別ページ",
  "デッキ構築ツール",
  "印刷PDF生成",
  "用語解説",
  "大会一覧",
  "大会詳細",
  "デッキ一覧",
  "その他",
];

export function categorizePath(rawPath) {
  const p = String(rawPath || "");
  if (p === "/") return "トップ（カードDB）";
  if (p === "/cards/") return "カード一覧";
  if (/^\/cards\/[^/]+\/?$/.test(p)) return "カード個別ページ";
  if (p === "/sets/") return "セット一覧";
  if (/^\/sets\/[^/]+\/?$/.test(p)) return "セット別ページ";
  if (p.startsWith("/tools/deck-builder/")) return "デッキ構築ツール";
  if (p.startsWith("/tools/print/")) return "印刷PDF生成";
  if (p.startsWith("/tools/glossary/")) return "用語解説";
  if (p === "/tournaments/") return "大会一覧";
  if (/^\/tournaments\/[^/]+\/?$/.test(p)) return "大会詳細";
  if (p === "/decks" || p === "/decks.html") return "デッキ一覧";
  return "その他";
}

/** 国名（英語）→ 日本語。ICU から機械的に作るので手書きの表を持たない。 */
let countryMap = null;
function jaCountry(englishName) {
  if (!countryMap) {
    countryMap = new Map();
    try {
      const en = new Intl.DisplayNames(["en"], { type: "region" });
      const ja = new Intl.DisplayNames(["ja"], { type: "region" });
      for (let a = 65; a <= 90; a++) {
        for (let b = 65; b <= 90; b++) {
          const code = String.fromCharCode(a, b);
          const e = en.of(code);
          const j = ja.of(code);
          if (e && j && e !== code) countryMap.set(e, j);
        }
      }
    } catch {
      /* ICU が無ければ英語のまま出す */
    }
  }
  return countryMap.get(englishName) || englishName || "（不明）";
}

const DEVICE_JA = { desktop: "デスクトップ", mobile: "モバイル", tablet: "タブレット", other: "その他" };

// ---------------------------------------------------------------------------
// 日付ユーティリティ（閲覧まわりは UTC・§5.2）
// ---------------------------------------------------------------------------
function utcDaySeries(rows, days, endUtcDate) {
  const map = new Map();
  for (const r of rows || []) map.set(String(r.key ?? r.d ?? ""), Number(r.v ?? r.pv ?? r.c ?? 0));
  const end = new Date(`${endUtcDate}T00:00:00Z`).getTime();
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(end - i * 86_400_000).toISOString().slice(0, 10);
    out.push({ date, v: map.get(date) || 0 });
  }
  return out;
}
function tailSum(series, n, offset = 0) {
  const end = series.length - offset;
  return series.slice(Math.max(0, end - n), end).reduce((a, s) => a + (Number(s.v) || 0), 0);
}

function jstStamp(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const p = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const g = (t) => p.find((x) => x.type === t)?.value ?? "";
  return `${g("year")}-${g("month")}-${g("day")} ${g("hour")}:${g("minute")} JST`;
}

// ---------------------------------------------------------------------------
// セクション描画
// ---------------------------------------------------------------------------
function firstRow(rows) {
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

function renderUsers(d1, history) {
  if (!d1) return `<section class="card"><h2>利用者</h2>${empty("D1を取得できていません")}</section>`;
  const users = Number(firstRow(d1.q1)?.c ?? 0);
  const q3 = firstRow(d1.q3) || {};
  const a7 = Number(q3.a7 ?? 0);
  const a30 = Number(q3.a30 ?? 0);
  const owners = Number(firstRow(d1.q4)?.owners ?? 0);

  const today = new Date().toISOString().slice(0, 10);
  const reg = utcDaySeries((d1.q2 || []).map((r) => ({ key: r.d, v: r.c })), 60, today);

  // 1人あたりの保存デッキ数（0件＝デッキを持たない登録者）
  const dist = new Map();
  for (const r of d1.q7 || []) dist.set(Number(r.n), Number(r.users || 0));
  const rows = [];
  const zero = Math.max(0, users - owners);
  rows.push(["0件（未作成）", zero]);
  for (const n of [1, 2, 3, 4]) rows.push([`${n}件`, dist.get(n) || 0]);
  let five = 0;
  for (const [n, u] of dist) if (n >= 5) five += u;
  rows.push(["5件以上", five]);
  const distTable = users
    ? `<table>
          <thead><tr><th>デッキ数</th><th class="n">人数</th><th class="n">構成比</th></tr></thead>
          <tbody>${rows
            .map((r) => `<tr><td>${esc(r[0])}</td><td class="n">${num(r[1])}</td><td class="n">${pct(r[1], users)}</td></tr>`)
            .join("")}</tbody>
        </table>`
    : empty();

  // 累計推移（スナップショット・§6）
  const hist = history.filter((h) => h.d1?.ok);
  const histUsers = hist.map((h) => ({ date: h.utcDate, v: Number(firstRow(h.d1.data?.q1)?.c ?? 0) }));
  const histDecks = hist.map((h) => ({ date: h.utcDate, v: Number(firstRow(h.d1.data?.q4)?.decks ?? 0) }));
  const histHtml =
    hist.length >= 2
      ? `<div class="subcap">登録者数（累計）</div>${spark(histUsers, { suffix: "人" })}
         <div class="subcap">保存デッキ数（累計）</div>${spark(histDecks, { suffix: "件" })}`
      : empty("スナップショットが1日分だけです（明日以降の実行で推移が出ます）");

  return `<section class="card">
    <h2>利用者</h2>
    <div class="cols">
      <div>
        <h3>新規登録の推移（直近60日・UTC基準）</h3>
        ${spark(reg, { suffix: "人" })}
        <h3>アクティブ利用者</h3>
        ${meter("直近7日", pctNum(a7, users), `${num(a7)}人`)}
        ${meter(
          `直近30日 <button class="info" type="button" title="sessions は30日で失効し、ログイン時に期限切れ行が全ユーザー分まとめて削除されるため、31日以上前の活動は復元できません。この値は「直近30日に来た人」の下限です。">ⓘ</button>`,
          pctNum(a30, users),
          `${num(a30)}人`
        )}
        ${meter("登録者に対する比", pctNum(a30, users), pct(a30, users))}
      </div>
      <div>
        <h3>1人あたりの保存デッキ数</h3>
        ${distTable}
        <h3>累計推移（スナップショット${hist.length ? `・${hist.length}日分` : ""}・UTC基準）</h3>
        ${histHtml}
      </div>
    </div>
  </section>`;
}

function renderDecks(d1, names) {
  if (!d1) return `<section class="card"><h2>デッキ構築ツール</h2>${empty("D1を取得できていません")}</section>`;
  const users = Number(firstRow(d1.q1)?.c ?? 0);
  const q4 = firstRow(d1.q4) || {};
  const decks = Number(q4.decks ?? 0);
  const publicDecks = Number(q4.public_decks ?? 0);
  const withThumb = Number(q4.with_thumb ?? 0);
  const owners = Number(q4.owners ?? 0);
  const q6 = firstRow(d1.q6) || {};
  const q9 = firstRow(d1.q9) || {};
  const cardRows = Number(q9.rows_ ?? 0);
  const withArt = Number(q9.with_art ?? 0);
  const decksWithArt = Number(q9.decks_with_art ?? 0);

  const overall = decks
    ? `<table><tbody>
          <tr><td>保存デッキ</td><td class="n">${num(decks)}件</td></tr>
          <tr><td>うち公開</td><td class="n">${num(publicDecks)}件（${pct(publicDecks, decks)}）</td></tr>
          <tr><td>デッキを持つ利用者</td><td class="n">${num(owners)}人（${pct(owners, users)}）</td></tr>
          <tr><td>直近7日に更新</td><td class="n">${num(Number(q6.u7 ?? 0))}件</td></tr>
          <tr><td>直近30日に更新</td><td class="n">${num(Number(q6.u30 ?? 0))}件</td></tr>
        </tbody></table>`
    : empty();

  const boards = (d1.q8 || []).map((r) => ({ board: String(r.board ?? ""), qty: Number(r.qty ?? 0) }));
  const boardMax = Math.max(1, ...boards.map((b) => b.qty));
  const boardHtml = boards.length
    ? boards.map((b) => meter(esc(b.board || "（未設定）"), (b.qty / boardMax) * 100, `${num(b.qty)}枚`)).join("")
    : empty();

  const featureHtml = cardRows
    ? `${meter("版（絵柄）指定", pctNum(withArt, cardRows), pct(withArt, cardRows))}
       ${meter("┗ 使用デッキ", pctNum(decksWithArt, decks), `${num(decksWithArt)}件`)}
       ${meter("サムネ指定", pctNum(withThumb, decks), `${num(withThumb)}件`)}`
    : empty();

  const champs = d1.q10 || [];
  const champHtml = champs.length
    ? `<div class="scroll-x"><table>
        <thead><tr><th class="n">#</th><th>チャンピオン</th><th class="n">デッキ数</th></tr></thead>
        <tbody>${champs
          .map(
            (r, i) =>
              `<tr><td class="rank">${i + 1}</td><td>${jaName(r.slug, names)}</td><td class="n">${num(r.c)}</td></tr>`
          )
          .join("")}</tbody></table></div>`
    : empty();

  const cards = d1.q11 || [];
  const cardHtml = cards.length
    ? `<div class="scroll-x"><table>
        <thead><tr><th class="n">#</th><th>カード</th><th class="n">採用デッキ</th><th class="n">総枚数</th></tr></thead>
        <tbody>${cards
          .map(
            (r, i) =>
              `<tr><td class="rank">${i + 1}</td><td>${jaName(r.slug, names)}</td><td class="n">${num(
                r.decks
              )}</td><td class="n">${num(r.qty)}</td></tr>`
          )
          .join("")}</tbody></table></div>`
    : empty();

  return `<section class="card">
    <h2>デッキ構築ツール</h2>
    <div class="cols">
      <div>
        <h3>全体</h3>
        ${overall}
        <h3>ゾーン別の総枚数</h3>
        ${boardHtml}
        <h3>機能の使われ方（D1から分かる分）</h3>
        ${featureHtml}
      </div>
      <div>
        <h3>人気チャンピオン</h3>
        ${champHtml}
      </div>
    </div>
    <h3>デッキでよく使われるカード（top20）</h3>
    ${cardHtml}
  </section>`;
}

function renderRumFail(rum) {
  const permission = rum && rum.permission;
  const steps = permission
    ? `<ol>
        <li>Cloudflare ダッシュボード &gt; My Profile &gt; API Tokens を開く</li>
        <li>使用中のトークンの Edit で、Permissions に <b>Account / Account Analytics / Read</b> を1行追加して保存</li>
        <li><code>~/.cloudflare-token</code> の値は変更不要（既存トークンへの権限追加のため）</li>
        <li><code>npm run dashboard</code> を再実行</li>
      </ol>`
    : "";
  const head = permission
    ? `<b>⚠️ 閲覧数を取得できませんでした（Account Analytics: Read が必要）</b> — Cloudflare APIトークンに <b>Account Analytics: Read</b> がありません。`
    : `<b>⚠️ 閲覧数を取得できませんでした</b>`;
  return `<section class="card">
    <h2>閲覧</h2>
    <div class="fail">
      ${head}
      ${steps}
      <p class="reason">理由: ${esc((rum && rum.reason) || "不明")}</p>
      利用者・デッキ・運用ヘルスの数値は、このエラーとは無関係に表示されています。
    </div>
  </section>`;
}

function renderRum(rum, names) {
  if (!rum || !rum.ok) return renderRumFail(rum);
  const d = rum.data;
  const daily = utcDaySeries(d.r1 || [], d.days || 30, d.rangeEnd);

  // 機能カテゴリ別（畳み込み）
  const byCat = new Map(PATH_CATEGORIES.map((c) => [c, 0]));
  const otherPaths = [];
  let totalPv = 0;
  for (const row of d.r2 || []) {
    const cat = categorizePath(row.key);
    byCat.set(cat, (byCat.get(cat) || 0) + row.pv);
    totalPv += row.pv;
    if (cat === "その他") otherPaths.push(row);
  }
  const otherPv = byCat.get("その他") || 0;
  const otherRatio = totalPv ? (otherPv / totalPv) * 100 : 0;
  const otherWarn = otherRatio > 5;

  const catRows = PATH_CATEGORIES.filter((c) => c !== "その他")
    .map((c) => ({ cat: c, pv: byCat.get(c) || 0 }))
    .sort((a, b) => b.pv - a.pv);

  const printNote = ` <span class="sincenote">※ ${esc(PRINT_BEACON_SINCE)} 計測開始</span>`;
  const catHtml = (d.r2 || []).length
    ? `<div class="scroll-x"><table>
        <thead><tr><th>カテゴリ</th><th class="n">閲覧数</th><th class="n">構成比</th></tr></thead>
        <tbody>
          ${catRows
            .map(
              (r) =>
                `<tr><td>${esc(r.cat)}${r.cat === "印刷PDF生成" ? printNote : ""}</td><td class="n">${num(
                  r.pv
                )}</td><td class="n">${pct(r.pv, totalPv)}</td></tr>`
            )
            .join("")}
          <tr${otherWarn ? ' class="warnrow"' : ""}>
            <td>${otherWarn ? '<span class="wbadge">⚠</span> ' : ""}その他
              ${
                otherWarn && otherPaths.length
                  ? `<details class="sub"><summary>畳み漏れの内訳を見る（5%超）</summary><table><tbody>${otherPaths
                      .slice(0, 30)
                      .map((p) => `<tr><td>${esc(p.key)}</td><td class="n">${num(p.pv)}</td></tr>`)
                      .join("")}</tbody></table></details>`
                  : ""
              }
            </td>
            <td class="n">${num(otherPv)}</td><td class="n">${pct(otherPv, totalPv)}</td>
          </tr>
        </tbody></table></div>`
    : empty();

  // カード個別ページ top20
  const cardPages = (d.r2 || [])
    .filter((r) => categorizePath(r.key) === "カード個別ページ")
    .map((r) => ({ slug: r.key.replace(/^\/cards\//, "").replace(/\/$/, ""), pv: r.pv }))
    .sort((a, b) => b.pv - a.pv)
    .slice(0, 20);
  const cardPageHtml = cardPages.length
    ? `<div class="scroll-x"><table>
        <thead><tr><th class="n">#</th><th>カード</th><th class="n">閲覧数</th></tr></thead>
        <tbody>${cardPages
          .map(
            (r, i) =>
              `<tr><td class="rank">${i + 1}</td><td>${jaName(r.slug, names)}</td><td class="n">${num(r.pv)}</td></tr>`
          )
          .join("")}</tbody></table></div>`
    : empty();

  const refs = (d.r3 || []).slice(0, 10);
  const refMax = Math.max(1, ...refs.map((r) => r.pv));
  const refHtml = refs.length
    ? refs
        .map((r) => meter(esc(r.key && r.key !== "none" ? r.key : "（直接）"), (r.pv / refMax) * 100, num(r.pv)))
        .join("")
    : empty();

  const devs = d.r4 || [];
  const devTotal = devs.reduce((a, r) => a + r.pv, 0);
  const devHtml = devs.length
    ? devs.map((r) => meter(esc(DEVICE_JA[r.key] || r.key || "（不明）"), pctNum(r.pv, devTotal), pct(r.pv, devTotal))).join("")
    : empty();

  const countries = (d.r5 || []).slice(0, 10);
  const cTotal = (d.r5 || []).reduce((a, r) => a + r.pv, 0);
  const countryHtml = countries.length
    ? countries.map((r) => meter(esc(jaCountry(r.key)), pctNum(r.pv, cTotal), pct(r.pv, cTotal))).join("")
    : empty();

  const partial = (rum.partialErrors || []).length
    ? `<p class="reason">⚠️ 一部のクエリが失敗しました: ${esc(rum.partialErrors.join(" / "))}</p>`
    : "";

  return `<section class="card">
    <h2>閲覧</h2>
    ${partial}
    <h3>日次の閲覧数（直近${d.days || 30}日・UTC基準）</h3>
    ${spark(daily, { suffix: "PV" })}
    <div class="cols" style="margin-top:14px;">
      <div>
        <h3>機能カテゴリ別（${d.days || 30}日・畳み込み後・UTC基準）</h3>
        ${catHtml}
      </div>
      <div>
        <h3>よく読まれるカードページ（top20）</h3>
        ${cardPageHtml}
        <h3>参照元（${d.days || 30}日）</h3>
        ${refHtml}
        <h3>端末 / 国（${d.days || 30}日）</h3>
        ${devHtml}
        ${countryHtml}
      </div>
    </div>
  </section>`;
}

function renderHealth(health) {
  if (!health || !health.ok) {
    return `<section class="card"><h2>運用ヘルス</h2><div class="fail"><b>⚠️ 運用ヘルスを取得できませんでした</b><p class="reason">理由: ${esc(
      (health && health.reason) || "不明"
    )}</p></div></section>`;
  }
  const li = health.data.items.map((it) => {
    const mark = it.warn ? "⚠️" : "✅";
    let sub = "";
    if (it.detail) sub = esc(it.detail);
    else if (it.id === "cron") sub = `${jstStamp(it.at)}（${num(it.hours)}時間前）`;
    else if (it.id === "banlist")
      sub = it.count === 0 ? "0件" : `${num(it.count)}件（${esc(it.names.join("・"))}）${it.count === 1 ? "＝現行シーズン・正常" : ""}`;
    else if (it.id === "unpushed")
      sub = it.prodFileCount
        ? `うち本番配信物 ${num(it.prodFileCount)}件（docs/ 以外のファイル）: ${esc(it.prodFiles.join(", "))}`
        : "本番配信物なし（docs/ 以外の差分は0件）";
    const label = it.id === "unpushed" ? `未pushコミット ${num(it.commits)}件` : esc(it.label);
    return `<li><span class="mark">${mark}</span><span>${label} <span class="sub${
      it.warn ? " warn" : ""
    }">${sub}</span></span></li>`;
  });
  return `<section class="card"><h2>運用ヘルス</h2><ul class="hl">${li.join("")}</ul></section>`;
}

// ---------------------------------------------------------------------------
// 本体
// ---------------------------------------------------------------------------
export function renderDashboard({ snapshot, history = [], names = {}, fromSnapshot = false }) {
  const d1ok = !!snapshot.d1?.ok;
  const d1 = d1ok ? snapshot.d1.data : null;
  const rum = snapshot.rum;
  const health = snapshot.health;

  const users = d1 ? Number(firstRow(d1.q1)?.c ?? 0) : null;
  const decks = d1 ? Number(firstRow(d1.q4)?.decks ?? 0) : null;
  const a7 = d1 ? Number(firstRow(d1.q3)?.a7 ?? 0) : null;

  const today = new Date(snapshot.fetchedAt).toISOString().slice(0, 10);
  const regSeries = d1 ? utcDaySeries((d1.q2 || []).map((r) => ({ key: r.d, v: r.c })), 60, today) : [];
  const deckSeries = d1 ? utcDaySeries((d1.q5 || []).map((r) => ({ key: r.d, v: r.c })), 60, today) : [];
  const newUsers7 = d1 ? tailSum(regSeries, 7) : null;
  const newDecks7 = d1 ? tailSum(deckSeries, 7) : null;

  let pv7 = null;
  let pvPrev7 = null;
  if (rum?.ok) {
    const daily = utcDaySeries(rum.data.r1 || [], rum.data.days || 30, rum.data.rangeEnd);
    pv7 = tailSum(daily, 7);
    pvPrev7 = tailSum(daily, 7, 7);
  }

  // アクティブ（7日）の前週比はD1から復元できないので、7日前のスナップショットを使う（§5.1 の注記）
  const target = new Date(new Date(`${snapshot.utcDate}T00:00:00Z`).getTime() - 7 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const past = history.filter((h) => h.utcDate <= target && h.d1?.ok).pop();
  const pastA7 = past ? firstRow(past.d1.data?.q3)?.a7 : undefined;
  const a7Prev = pastA7 === undefined || pastA7 === null ? null : Number(pastA7);

  const badge = (label, ok, extra = "") =>
    `<span class="badge ${ok ? "ok" : "ng"}">${esc(label)} ${ok ? "✓" : "⚠"}${esc(extra)}</span>`;
  const healthWarns = health?.ok ? health.data.warnCount : 0;

  const stamp = `取得 ${jstStamp(snapshot.fetchedAt)}${fromSnapshot ? "（スナップショット再生成・--no-fetch）" : ""}`;

  const body = `<div class="wrap">
  <header class="top">
    <h1>運営ダッシュボード</h1>
    <span class="stamp">${esc(stamp)}</span>
    <span class="srcbadges">
      ${badge("D1", d1ok)}
      ${badge("閲覧", !!rum?.ok)}
      ${badge("ヘルス", !!health?.ok && healthWarns === 0, health?.ok && healthWarns ? String(healthWarns) : "")}
    </span>
  </header>

  <div class="kpis">
    <div class="kpi"><div class="lab">登録者数</div><div class="val">${num(users)}</div>${delta(
      users,
      users === null || newUsers7 === null ? null : users - newUsers7
    )}</div>
    <div class="kpi"><div class="lab">保存デッキ数</div><div class="val">${num(decks)}</div>${delta(
      decks,
      decks === null || newDecks7 === null ? null : decks - newDecks7
    )}</div>
    <div class="kpi"><div class="lab">閲覧数（7日）</div><div class="val">${num(pv7)}</div>${delta(pv7, pvPrev7)}</div>
    <div class="kpi"><div class="lab">アクティブ（7日）</div><div class="val">${num(a7)}</div>${delta(a7, a7Prev)}</div>
  </div>

  ${d1ok && (snapshot.d1.partialErrors || []).length ? `<p class="reason">⚠️ D1の一部クエリが失敗しました: ${esc(snapshot.d1.partialErrors.join(" / "))}</p>` : ""}
  ${
    d1ok
      ? ""
      : `<div class="fail"><b>⚠️ D1（登録者・デッキ）を取得できませんでした</b><p class="reason">理由: ${esc(
          snapshot.d1?.reason || "不明"
        )}</p>閲覧・運用ヘルスは、このエラーとは無関係に表示されています。</div>`
  }

  ${renderUsers(d1, history)}
  ${renderDecks(d1, names)}
  ${renderRum(rum, names)}
  ${renderHealth(health)}

  <footer>
    データ源と制約:
    <ul>
      <li>登録者・デッキ: 本番D1（<b>読み取りのみ</b>）。<b>アクティブ利用者は31日以上前の履歴を復元できない</b>（sessionsは30日で失効し、ログイン時に期限切れ行が削除される）</li>
      <li>閲覧: Cloudflare Web Analytics。<b>アダプティブサンプリング</b>のため概算値（閲覧数 = count × avg(sampleInterval)）。生データの保持は7日・遡れるのは約6か月 → 長期推移はローカルのスナップショットが正</li>
      <li>日付は<b>閲覧グラフと新規登録グラフがUTC基準</b>、取得日時はJST</li>
      <li>bot判定されたアクセスは除外済み（bot: 0）</li>
      <li>印刷PDF生成は ${esc(PRINT_BEACON_SINCE)} にビーコンを設置。それ以前は計測対象外（0件はデータ無しの意味）</li>
      <li>このページと <code>tmp/dashboard/</code> の中身は<b>公開リポジトリにコミットしない</b>（運営情報のため）</li>
    </ul>
  </footer>
</div>`;

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>運営ダッシュボード</title>
<style>
${STYLE}
</style>
</head>
<body>
${body}
</body>
</html>
`;
}

// モック（docs/design/56-運営ダッシュボード/ダッシュボード_モック.html）と同一のスタイル。
const STYLE = `  :root{
    color-scheme: light dark;
    --bg:#f6f7f9; --card:#ffffff; --ink:#1a1d21; --muted:#6b7280; --line:#e3e6ea;
    --accent:#2f6feb; --ok:#1a7f37; --warn:#b26a00; --warnbg:#fff6e0; --bar:#2f6feb; --bar2:#8fb4f5;
  }
  @media (prefers-color-scheme: dark){
    :root{ --bg:#0f1214; --card:#181c20; --ink:#e6e8ea; --muted:#9aa3ad; --line:#2a3037;
           --accent:#6ea8ff; --ok:#4ac26b; --warn:#e3b341; --warnbg:#2b2413; --bar:#4c8dff; --bar2:#2c4c80; }
  }
  *{ box-sizing:border-box; }
  body{ margin:0; background:var(--bg); color:var(--ink); font-size:14px; line-height:1.6;
        font-family: system-ui, -apple-system, "Segoe UI", "Hiragino Kaku Gothic ProN", Meiryo, sans-serif; }
  .wrap{ max-width:1180px; margin:0 auto; padding:16px 16px 40px; }

  header.top{ display:flex; flex-wrap:wrap; gap:8px 16px; align-items:baseline; margin-bottom:14px; }
  header.top h1{ font-size:18px; margin:0; }
  .stamp{ font-size:12.5px; color:var(--muted); }
  .srcbadges{ display:flex; gap:6px; flex-wrap:wrap; margin-left:auto; }
  .badge{ font-size:11.5px; padding:2px 8px; border-radius:999px; border:1px solid var(--line); background:var(--card); }
  .badge.ok{ color:var(--ok); border-color:currentColor; }
  .badge.ng{ color:var(--warn); border-color:currentColor; }

  .kpis{ display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:18px; }
  .kpi{ background:var(--card); border:1px solid var(--line); border-radius:10px; padding:12px 14px; }
  .kpi .lab{ font-size:12px; color:var(--muted); }
  .kpi .val{ font-size:26px; font-weight:700; font-variant-numeric:tabular-nums; letter-spacing:-.01em; }
  .kpi .dlt{ font-size:12px; font-variant-numeric:tabular-nums; }
  .up{ color:var(--ok); } .down{ color:#c0392b; } .flat{ color:var(--muted); }
  @media (prefers-color-scheme: dark){ .down{ color:#ff7b6b; } }

  section.card{ background:var(--card); border:1px solid var(--line); border-radius:10px;
                padding:14px 16px 16px; margin-bottom:14px; }
  section.card > h2{ font-size:14px; margin:0 0 12px; padding-bottom:8px; border-bottom:1px solid var(--line); }
  h3{ font-size:12.5px; color:var(--muted); margin:14px 0 6px; font-weight:600; }
  h3:first-of-type{ margin-top:0; }
  .cols{ display:grid; grid-template-columns:1fr 1fr; gap:18px; }

  table{ width:100%; border-collapse:collapse; font-variant-numeric:tabular-nums; }
  th,td{ padding:5px 8px; border-bottom:1px solid var(--line); text-align:left; vertical-align:top; }
  th{ font-size:11.5px; color:var(--muted); font-weight:600; white-space:nowrap; }
  td.n, th.n{ text-align:right; white-space:nowrap; }
  td.rank{ color:var(--muted); width:2.2em; text-align:right; }
  tbody tr:last-child td{ border-bottom:none; }
  .scroll-x{ overflow-x:auto; -webkit-overflow-scrolling:touch; }
  .scroll-x table{ min-width:340px; }

  .spark{ display:flex; align-items:flex-end; gap:2px; height:70px; margin:4px 0 2px; }
  .spark i{ flex:1 1 0; background:var(--bar); border-radius:2px 2px 0 0; min-width:2px; display:block; }
  .spark i.dim{ background:var(--bar2); }
  .axis{ display:flex; justify-content:space-between; font-size:11px; color:var(--muted); }

  .meter{ display:flex; align-items:center; gap:8px; margin:3px 0; }
  .meter .mlab{ flex:0 0 8.5em; font-size:12.5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .meter .mtrack{ display:block; flex:1 1 auto; height:9px; background:rgba(128,128,128,.18); border-radius:5px; overflow:hidden; }
  .meter .mfill{ display:block; height:100%; background:var(--bar); border-radius:5px; }
  .meter .mval{ flex:0 0 auto; font-size:12px; font-variant-numeric:tabular-nums; color:var(--muted); min-width:5.2em; text-align:right; }

  .warnrow{ background:var(--warnbg); }
  .wbadge{ color:var(--warn); font-weight:700; }
  details.sub{ margin:6px 0 0; }
  details.sub summary{ cursor:pointer; font-size:12px; color:var(--accent); }
  details.sub table{ margin-top:6px; }
  .info{ border:none; background:none; color:var(--accent); cursor:pointer; font:inherit; font-size:12px; padding:0 2px; }
  .fail{ background:var(--warnbg); border:1px solid var(--warn); border-radius:8px; padding:12px 14px; font-size:13px; margin-bottom:14px; }
  .fail b{ color:var(--warn); }
  .fail ol{ margin:8px 0 0 1.1em; padding:0; }
  .reason{ font-size:12px; color:var(--muted); margin:8px 0 0; word-break:break-word; }
  .empty{ font-size:13px; color:var(--muted); margin:4px 0; }
  .untl{ color:var(--muted); }
  .subcap{ font-size:11.5px; color:var(--muted); margin-top:6px; }
  .sincenote{ color:var(--muted); font-size:11.5px; }
  .hl{ list-style:none; margin:0; padding:0; }
  .hl li{ display:flex; gap:8px; align-items:baseline; padding:6px 0; border-bottom:1px solid var(--line); font-size:13px; }
  .hl li:last-child{ border-bottom:none; }
  .hl .mark{ flex:0 0 1.4em; }
  .hl .sub{ color:var(--muted); font-size:12px; }
  .hl .sub.warn{ color:var(--warn); }
  footer{ font-size:11.5px; color:var(--muted); line-height:1.9; margin-top:16px; }
  footer ul{ margin:4px 0 0; padding-left:1.2em; }

  @media (max-width:760px){ .cols{ grid-template-columns:1fr; gap:14px; } }
  @media (max-width:560px){
    .kpis{ grid-template-columns:1fr 1fr; }
    .wrap{ padding:12px 10px 32px; }
    .kpi .val{ font-size:22px; }
    .srcbadges{ margin-left:0; }
    .meter .mlab{ flex-basis:6.5em; }
  }`;
