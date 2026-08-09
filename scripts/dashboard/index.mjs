// 運営ダッシュボード（issue #56・ローカル専用）— エントリ。
//
//   npm run dashboard                  取得 → HTML生成 → ローカルサーバー起動(3200)
//   npm run dashboard -- --no-fetch    取得せず、最新スナップショットから再生成（オフライン可）
//   npm run dashboard -- --no-serve    生成のみ（サーバーを立てない）
//   npm run dashboard -- --strict      1つでも取得に失敗したら exit 1（既定は fail-open で exit 0）
//   PORT=3300 npm run dashboard        ポート変更（既定 3200。開発3000 / レビュー3100 と非衝突）
//
// ⚠️ 出力先は `tmp/dashboard/` だけ（設計書 §4.1）。このリポジトリは公開されているので、
//    登録者数・閲覧数などの運営情報を `docs/` `data/` に書き出してはいけない。
import { createServer } from "node:http";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

import { collectD1, REPO_ROOT } from "./collect-d1.mjs";
import { collectRum } from "./collect-rum.mjs";
import { collectHealth } from "./collect-health.mjs";
import { renderDashboard } from "./render.mjs";

const OUT_DIR = path.join(REPO_ROOT, "tmp", "dashboard");
const SNAP_DIR = path.join(OUT_DIR, "snapshots");
const OUT_HTML = path.join(OUT_DIR, "index.html");
const SNAPSHOT_VERSION = 1;

function parseArgs(argv) {
  const a = new Set(argv);
  return {
    noFetch: a.has("--no-fetch"),
    noServe: a.has("--no-serve"),
    strict: a.has("--strict"),
    help: a.has("--help") || a.has("-h"),
  };
}

function log(msg) {
  process.stdout.write(`${msg}\n`);
}

async function loadNames() {
  const file = path.join(REPO_ROOT, "data", "tl-names.json");
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    log("⚠️ data/tl-names.json を読めませんでした。slug をそのまま表示します。");
    return {};
  }
}

/** スナップショットを古い順に全部読む（§6・累計推移グラフに使う）。 */
async function loadHistory() {
  if (!existsSync(SNAP_DIR)) return [];
  const files = (await readdir(SNAP_DIR)).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  const out = [];
  for (const f of files) {
    try {
      const j = JSON.parse(await readFile(path.join(SNAP_DIR, f), "utf8"));
      if (!j.utcDate) j.utcDate = f.slice(0, 10);
      out.push(j);
    } catch {
      log(`⚠️ スナップショットを読めませんでした（無視して続行）: ${f}`);
    }
  }
  return out;
}

async function collectAll() {
  log("▶ 収集を開始します（本番D1はSELECTのみ）");
  const d1 = await collectD1({ log });
  log(d1.ok ? "  D1 ✓" : `  D1 ⚠ ${d1.reason}`);
  const rum = await collectRum({ log });
  log(rum.ok ? "  閲覧 ✓" : `  閲覧 ⚠ ${rum.reason}`);
  const health = await collectHealth();
  log(health.ok ? "  ヘルス ✓" : `  ヘルス ⚠ ${health.reason}`);

  const fetchedAt = new Date().toISOString();
  return { version: SNAPSHOT_VERSION, fetchedAt, utcDate: fetchedAt.slice(0, 10), d1, rum, health };
}

function serve(port) {
  const server = createServer(async (req, res) => {
    try {
      const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
      const rel = urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "");
      const file = path.join(OUT_DIR, rel);
      // ⚠️ 単なる前方一致だと `tmp/dashboard-backup/…` のような**兄弟ディレクトリ**が
      //    すり抜ける（レビュー S1-2）。区切り文字まで含めて比較する。
      if (file !== OUT_DIR && !file.startsWith(OUT_DIR + path.sep)) {
        res.writeHead(403).end("Forbidden");
        return;
      }
      const body = await readFile(file);
      const type = file.endsWith(".json") ? "application/json; charset=utf-8" : "text/html; charset=utf-8";
      res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" }).end(body);
    } catch {
      res.writeHead(404).end("Not Found");
    }
  });
  server.listen(port, () => {
    log(`\n運営ダッシュボード: http://localhost:${port}/`);
    log("停止するには Ctrl-C");
  });
  process.on("SIGINT", () => {
    log("\n停止しました。");
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 300).unref();
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    log(
      [
        "使い方: npm run dashboard [-- オプション]",
        "  --no-fetch  取得せず、最新スナップショットから再生成する",
        "  --no-serve  HTMLを生成するだけでサーバーを立てない",
        "  --strict    1つでも取得に失敗したら exit 1（既定は fail-open で exit 0）",
        "  PORT        サーバーのポート（既定 3200）",
      ].join("\n")
    );
    return 0;
  }

  await mkdir(SNAP_DIR, { recursive: true });
  const history = await loadHistory();

  let snapshot;
  let fromSnapshot = false;
  if (args.noFetch) {
    snapshot = history[history.length - 1];
    if (!snapshot) {
      log("⚠️ スナップショットが1件もありません。--no-fetch を外して一度実行してください。");
      return 1;
    }
    fromSnapshot = true;
    log(`▶ --no-fetch: ${snapshot.utcDate} のスナップショットから再生成します`);
  } else {
    snapshot = await collectAll();
    const file = path.join(SNAP_DIR, `${snapshot.utcDate}.json`);
    await writeFile(file, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
    log(`  スナップショットを保存しました: ${path.relative(REPO_ROOT, file)}`);
    // 当日ぶんを履歴にも反映する（同日再実行なら差し替え）
    const idx = history.findIndex((h) => h.utcDate === snapshot.utcDate);
    if (idx >= 0) history[idx] = snapshot;
    else history.push(snapshot);
  }

  const names = await loadNames();
  const html = renderDashboard({ snapshot, history, names, fromSnapshot });
  await writeFile(OUT_HTML, html, "utf8");
  log(`  HTMLを生成しました: ${path.relative(REPO_ROOT, OUT_HTML)}`);

  const failed = [
    !snapshot.d1?.ok ? "D1" : null,
    !snapshot.rum?.ok ? "閲覧" : null,
    !snapshot.health?.ok ? "ヘルス" : null,
  ].filter(Boolean);

  if (failed.length) {
    log(`⚠️ 取得に失敗したセクション: ${failed.join(" / ")}（他のセクションは通常どおり表示されます）`);
  }

  if (!args.noServe) serve(Number(process.env.PORT || 3200));

  // fail-open: 既定では失敗があっても exit 0（§4.3）
  return args.strict && failed.length ? 1 : 0;
}

const code = await main();
if (code !== 0) process.exitCode = code;
