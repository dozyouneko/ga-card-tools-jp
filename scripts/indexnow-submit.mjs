// issue#38: 日次cronがpushした「変更ページ」のURLだけを IndexNow へ通知する。
//
//   node scripts/indexnow-submit.mjs <base> <head> [--dry-run]
//   例: node scripts/indexnow-submit.mjs HEAD~1 HEAD
//       node scripts/indexnow-submit.mjs HEAD~1 HEAD --dry-run   # 送信せずURL一覧だけ出す
//
// ⚠ GoogleはIndexNowに対応していない。効くのは Bing / DuckDuckGo / Ecosia 等だけ。
// 設計: docs/design/38-IndexNow/IndexNow_設計.md
//
// ⚠ 写像はホワイトリスト方式。下の PATH_RULES に一致しないパスは黙って捨てる
//   （新種の生成物が増えたときに誤送信しないため）。とくに tournaments/<id>/decks.html は
//   _headers で X-Robots-Tag: noindex を付けているHTML断片で、通知すると矛盾するので送らない。
//
// ⚠ このステップに continue-on-error を付けてはいけない（ワークフロー側の注意書きも参照）。
//   pushの後に走るので落ちても何も失われず、403/422 は恒久的な設定ミス（キーファイル欠落等）で、
//   握り潰すと永久に通知が飛ばないまま気づけない。一時的事象である 429 とネットワーク例外だけ
//   ここで吸収する（429=警告のみ exit 0 / ネットワーク=1回だけ再試行）。

import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const HOST = "ga-card-tools-jp.pages.dev";
const KEY = process.env.INDEXNOW_KEY || "c226706b28954362938a0297d5bc2b43";
const ORIGIN = `https://${HOST}`;
const MAX_URLS_PER_REQUEST = 10000; // IndexNowの仕様上限

// 以下3つの環境変数は検証用の差し替え口（本番のcronは設定しない）。
// INDEXNOW_KEY: 誤ったキーで403を再現する（設計書 V10）
// INDEXNOW_ENDPOINT: ローカルのダミーサーバーに向けてエラー処理を試す
// INDEXNOW_CHUNK_SIZE: 分割の境界を下げて試す（V6）
// ⚠ 差し替え口が空文字だと黙って本番APIへ飛ぶ（実際に検証中これで誤送信した）。
//   「設定したのに効かない」を無くすため、定義されていて空なら即エラーにする。
if ("INDEXNOW_ENDPOINT" in process.env && !process.env.INDEXNOW_ENDPOINT) {
  console.error("❌ INDEXNOW_ENDPOINT が空です（本番APIへ誤送信するため中止します）");
  process.exit(1);
}
const ENDPOINT = process.env.INDEXNOW_ENDPOINT || "https://api.indexnow.org/IndexNow";
const chunkSize = Number(process.env.INDEXNOW_CHUNK_SIZE || MAX_URLS_PER_REQUEST);

// パスの1セグメントとして許す文字。実データ（カード2,243件・セット56件）は全てこの範囲。
const SEG = "[A-Za-z0-9._-]+";

// ファイル → URLパス の写像（ホワイトリスト）。上から順に最初に一致したものを使う。
const PATH_RULES = [
  { re: /^index\.html$/, to: () => "/" },
  { re: /^cards\/index\.html$/, to: () => "/cards/" },
  { re: new RegExp(`^cards/(${SEG})/index\\.html$`), to: (m) => `/cards/${m[1]}/` },
  { re: new RegExp(`^sets/(${SEG})/index\\.html$`), to: (m) => `/sets/${m[1]}/` },
  { re: /^tournaments\/index\.html$/, to: () => "/tournaments/" },
  { re: new RegExp(`^tournaments/(${SEG})/index\\.html$`), to: (m) => `/tournaments/${m[1]}/` },
];

/** 変更ファイルのパス（リポジトリ相対）を通知対象URLへ写像する。対象外は null。 */
export function fileToUrl(file) {
  // "." / ".." を含むセグメントは弾く（SEG にドットを許しているため明示的に除く）
  if (file.split("/").some((s) => s === "." || s === "..")) return null;
  for (const rule of PATH_RULES) {
    const m = rule.re.exec(file);
    if (m) return ORIGIN + rule.to(m);
  }
  return null;
}

/** 変更ファイル一覧 → 重複を除き昇順にソートしたURL配列（ログの再現性のため）。 */
export function filesToUrls(files) {
  const urls = new Set();
  for (const f of files) {
    const url = fileToUrl(f);
    if (url) urls.add(url);
  }
  return [...urls].sort();
}

/** 1リクエストの上限（既定10,000）で分割する。 */
export function chunk(urls, size = chunkSize) {
  const out = [];
  for (let i = 0; i < urls.length; i += size) out.push(urls.slice(i, i + size));
  return out;
}

function changedFiles(base, head) {
  const out = execFileSync(
    "git",
    ["diff", "--name-only", "--diff-filter=ACM", base, head],
    { encoding: "utf8" },
  );
  return out.split("\n").map((s) => s.trim()).filter(Boolean);
}

/** 1チャンクをPOSTする。ネットワーク例外のみ1回だけ再試行する。 */
async function post(urlList) {
  const body = JSON.stringify({
    host: HOST,
    key: KEY,
    keyLocation: `${ORIGIN}/${KEY}.txt`,
    urlList,
  });
  const send = () =>
    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body,
    });
  try {
    return await send();
  } catch (e) {
    console.warn(`⚠ 送信に失敗しました（${e.message}）。1回だけ再試行します`);
    return await send(); // ここでの例外は main 側で exit 1 になる
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const positional = args.filter((a) => !a.startsWith("--"));
  if (positional.length !== 2) {
    console.error("使い方: node scripts/indexnow-submit.mjs <base> <head> [--dry-run]");
    process.exit(1);
  }
  const [base, head] = positional;

  const files = changedFiles(base, head);
  const urls = filesToUrls(files);
  console.log(`変更ファイル ${files.length} 件 → 通知対象URL ${urls.length} 件`);

  // 空の urlList を送ると 400 になるので、0件のときは何もせず正常終了する。
  if (urls.length === 0) {
    console.log("通知対象がありません（送信しません）");
    return;
  }

  const chunks = chunk(urls);

  if (dryRun) {
    console.log(`[dry-run] 送信しません。${chunks.length} リクエストに分割されます`);
    for (const url of urls) console.log(url);
    return;
  }

  for (const [i, part] of chunks.entries()) {
    const label = `[${i + 1}/${chunks.length}]`;
    const res = await post(part);

    if (res.status === 200 || res.status === 202) {
      console.log(`${label} ✅ ${res.status} 受理されました（${part.length} URL）`);
      continue;
    }
    // 429 は一時的なスロットリング。翌日また送れば済むので警告だけ出して正常終了する
    // （残りのチャンクを送り続けると悪化するため、ここで打ち切る）。
    if (res.status === 429) {
      const remaining = chunks.length - i;
      console.warn(`${label} ⚠ 429 Too Many Requests。残り ${remaining} リクエストを中止します（翌日再送）`);
      return;
    }
    // 400 / 403 / 422 などは恒久的な設定ミス。握り潰さず job を赤くする。
    const text = await res.text().catch(() => "");
    console.error(`${label} ❌ HTTP ${res.status} ${res.statusText}${text ? ` — ${text.slice(0, 500)}` : ""}`);
    process.exit(1);
  }
}

// 直接実行されたときだけ動かす（写像・分割は検証スクリプトから import して単体で試せる）。
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(`❌ ${e.stack || e.message}`);
    process.exit(1);
  });
}
