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
//   pushの後に走るので落ちても何も失われず、400/422 は恒久的な設定ミスで、
//   握り潰すと永久に通知が飛ばないまま気づけない。一時的事象である 429 とネットワーク例外だけ
//   ここで吸収する（429=警告のみ exit 0 / ネットワーク=1回だけ再試行）。
//
// ⚠ 例外がひとつだけある（issue#62）。403 `UserForbiddedToAccessSite` は #38 の既知・未解決事象で、
//   導入以来ずっと出続けている。赤が常態化してほかの障害と見分けが付かなくなったため、
//   この403「だけ」を警告に留めて exit 0 する（host が *.pages.dev のときだけ）。
//   設計: docs/design/62-cronの赤の解消/cronの赤の解消_設計.md
//
// ⚠ 403 は「キーの誤り」の信号ではない（#62 §2-2 の実測: 誤ったキーはむしろ202で受理される）。
//   そのため、送信の直前にキーファイルを自分で取得して健全性を確かめる（IndexNowの応答に頼らない）。

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
const DEFAULT_ENDPOINT = "https://api.indexnow.org/IndexNow";
const ENDPOINT = process.env.INDEXNOW_ENDPOINT || DEFAULT_ENDPOINT;
// 0 や負数を渡すと chunk() が無限ループするので下限を1にする（検証用envからしか到達しない）。
const chunkSize = Math.max(1, Number(process.env.INDEXNOW_CHUNK_SIZE) || MAX_URLS_PER_REQUEST);

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
  // ⚠ R（リネーム）を必ず含める。ACM だけだとリネームが丸ごと落ちる（--name-only は
  //   リネーム先のパスだけを出す）。公式データの修正でカードのslugが変わると内容が
  //   ほぼ同じなのでgitは R と判定し、新URLが通知されないまま静かに漏れる。
  //   D（削除）は除外したまま（消えたURLを通知しない）。
  const out = execFileSync(
    "git",
    ["diff", "--name-only", "--diff-filter=ACMR", base, head],
    { encoding: "utf8" },
  );
  return out.split("\n").map((s) => s.trim()).filter(Boolean);
}

/** 応答本文から errorCode を取り出す。JSONとして解釈できなければ null（＝抑制しない）。 */
function errorCodeOf(text) {
  try {
    const o = JSON.parse(text);
    return o && typeof o === "object" ? o.errorCode : null;
  } catch {
    return null;
  }
}

/**
 * 送信の直前にキーファイルの健全性を自分で確かめる（#62 §5-2）。
 * ⚠ IndexNowはキーが誤っていても 202 を返すため、応答では永久に気づけない。
 *   403を警告に落とす（§5-1）とこのステップは恒久的に緑になるので、見張る役をここに置く。
 * ⭐ 「壊れていることを証明できた」ときだけ止める。「確かめられなかった」（ネットワーク例外）は
 *   警告だけ出して送信へ進む（一時的な断で job を赤くしないため）。
 */
async function verifyKeyFile() {
  const url = `${ORIGIN}/${KEY}.txt`;
  const get = async () => {
    const res = await fetch(url);
    return { status: res.status, body: await res.text() };
  };
  let got;
  try {
    got = await get();
  } catch (e) {
    console.warn(`⚠ キーファイルを確認できませんでした（${e.message}）。1回だけ再試行します`);
    try {
      got = await get();
    } catch (e2) {
      console.warn(`⚠ キーファイルの健全性を判定できませんでした（${e2.message}）。送信へ進みます`);
      return;
    }
  }
  const ng = (reason) => {
    console.error(`❌ キーファイルが不正です（${reason}）— ${url}`);
    console.error(
      "   IndexNowはキーの誤りを 202 で受理してしまうため、送信前にここで止めます（設計 §2-2）",
    );
    process.exit(1);
  };
  if (got.status !== 200) ng(`HTTP ${got.status}`);
  if (got.body.trim() !== KEY) ng("内容不一致");
  console.log(`キーファイル: ✅ 200・内容一致（${url}）`);
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

  // ⚠ 使用中のエンドポイントを必ず出す。差し替え口が効いていないことに気づけず本番へ
  //   誤送信した事故（2026-07-29）の再発防止。既定と違う値なら一目で分かるようにする。
  console.log(
    ENDPOINT === DEFAULT_ENDPOINT
      ? `送信先: ${ENDPOINT}（既定）`
      : `送信先: ${ENDPOINT} ⚠ INDEXNOW_ENDPOINT で差し替え中（既定は ${DEFAULT_ENDPOINT}）`,
  );

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

  // ⚠ 差し替え口を使っている間は検査しない。ダミーサーバー相手の検証で本番のキーファイルを
  //   見に行っても意味がなく、オフラインでの検証も壊れるため（#62 §5-2）。
  if (ENDPOINT === DEFAULT_ENDPOINT) await verifyKeyFile();

  for (const [i, part] of chunks.entries()) {
    const label = `[${i + 1}/${chunks.length}]`;
    const res = await post(part);

    if (res.status === 200 || res.status === 202) {
      // 応答本文も残す。成功時は空のことが多いが、ステータスだけだと後から追えないため。
      const ok = await res.text().catch(() => "");
      console.log(
        `${label} ✅ ${res.status} 受理されました（${part.length} URL）${ok ? ` — ${ok.slice(0, 500)}` : ""}`,
      );
      continue;
    }
    // 429 は一時的なスロットリング。翌日また送れば済むので警告だけ出して正常終了する
    // （残りのチャンクを送り続けると悪化するため、ここで打ち切る）。
    if (res.status === 429) {
      const remaining = chunks.length - i;
      console.warn(`${label} ⚠ 429 Too Many Requests。残り ${remaining} リクエストを中止します（翌日再送）`);
      return;
    }
    const text = await res.text().catch(() => "");
    // #62: 既知の403（#38・未解決）だけを警告に留めて exit 0 する。
    // ⚠ 抑制するのは次の3つを「すべて」満たすときだけ。1つでも欠けたら従来どおり exit 1。
    //   ① 403 ② 本文がJSONとして解釈でき errorCode が UserForbiddedToAccessSite
    //   ③ HOST が *.pages.dev（⭐ 独自ドメイン(#28)へ移ると HOST が変わり、抑制が自動で解除される。
    //      「暫定措置の撤去し忘れ」を構造で防いでいるので、この条件を簡略化しないこと）
    // ⚠ JSONとして壊れている403は抑制しない。「読めなかったから握り潰す」を作らない。
    if (
      res.status === 403 &&
      HOST.endsWith(".pages.dev") &&
      errorCodeOf(text) === "UserForbiddedToAccessSite"
    ) {
      // ホストが認可されていない以上、後続チャンクも同じ403になるので打ち切る（429と同じ扱い）。
      const missed = chunks.slice(i).reduce((n, p) => n + p.length, 0);
      const remaining = chunks.length - i - 1;
      // ⚠ console.error は使わない（Actionsのログで赤く見えるため）。
      console.warn(`${label} ⚠ 403 UserForbiddedToAccessSite — 既知の未解決事象のため警告に留めます（issue #38）`);
      console.warn(`      通知できなかったURL: ${missed} 件（残り ${remaining} リクエストを中止しました）`);
      console.warn("      ⚠ この抑制は host が *.pages.dev のときだけです。独自ドメイン(#28)へ移ると自動で解除されます");
      // jobは緑になるが、実行ページには黄色の注釈を残す（「静かに緑」にはしない）。
      if (process.env.GITHUB_ACTIONS === "true") {
        console.log(
          `::warning title=IndexNow未通知::403 UserForbiddedToAccessSite のため ${missed} 件のURLを通知できませんでした（既知・issue #38）`,
        );
      }
      return;
    }
    // 400 / 422 / 上記以外の403 は恒久的な設定ミス。握り潰さず job を赤くする。
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
