// 運営ダッシュボード（issue #56）— 本番 D1 からの集計。
//
// ⚠️ このファイルが本番DBに投げるのは **SELECT だけ** である（設計書 §5.1 / 検証項目 V14）。
//    書き込み系のSQLをここに書き足してはいけない。
// ⚠️ 1クエリ = 1実行にしている。1ファイルにまとめて `--file` で流すほうが速いが、
//    `--json` の結果配列とクエリの対応付けが崩れたときに静かに取り違えるため、確実さを取る。
//
// wrangler の `--json` 出力の形（node_modules/wrangler の実装で確認）:
//   `d1 execute --remote --json --command "<SQL>"` は D1 REST API `/query` の result を
//   そのまま `JSON.stringify(..., null, 2)` して stdout に出す。すなわち
//   [ { "results": [ { ... } ], "success": true, "meta": { ... } } ]
//   失敗時は `{ "error": { ... } }` を吐いて非0終了する。
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
export const ACCOUNT_ID = "53dcf4e7f02ea5e504977816a68865f5";
const TOKEN_FILE = path.join(os.homedir(), ".cloudflare-token");

/**
 * Cloudflare APIトークンを読む。環境変数が既にあればそれを優先する。
 * 見つからなければ null（呼び出し側が fail-open の理由に使う）。
 */
export async function readCloudflareToken() {
  const fromEnv = (process.env.CLOUDFLARE_API_TOKEN || "").trim();
  if (fromEnv) return fromEnv;
  if (!existsSync(TOKEN_FILE)) return null;
  const raw = (await readFile(TOKEN_FILE, "utf8")).trim();
  return raw || null;
}

// ---------------------------------------------------------------------------
// クエリ定義（設計書 §5.1 の Q1〜Q11 をそのまま）
// ---------------------------------------------------------------------------
export const QUERIES = [
  { id: "q1", label: "登録者総数", sql: "SELECT COUNT(*) AS c FROM users;" },
  {
    id: "q2",
    label: "新規登録の日次推移（60日）",
    sql: "SELECT date(created_at) AS d, COUNT(*) AS c FROM users WHERE created_at >= datetime('now','-60 days') GROUP BY d ORDER BY d;",
  },
  {
    id: "q3",
    label: "アクティブ利用者",
    sql: "SELECT (SELECT COUNT(DISTINCT user_id) FROM sessions WHERE last_seen_at >= datetime('now','-7 days')) AS a7, (SELECT COUNT(DISTINCT user_id) FROM sessions WHERE last_seen_at >= datetime('now','-30 days')) AS a30, (SELECT COUNT(*) FROM sessions) AS live_sessions;",
  },
  {
    id: "q4",
    label: "デッキ全体",
    sql: "SELECT COUNT(*) AS decks, SUM(CASE WHEN is_public=1 THEN 1 ELSE 0 END) AS public_decks, SUM(CASE WHEN thumb_image IS NOT NULL THEN 1 ELSE 0 END) AS with_thumb, COUNT(DISTINCT user_id) AS owners FROM decks;",
  },
  {
    id: "q5",
    label: "デッキ作成の日次推移（60日）",
    sql: "SELECT date(created_at) AS d, COUNT(*) AS c FROM decks WHERE created_at >= datetime('now','-60 days') GROUP BY d ORDER BY d;",
  },
  {
    id: "q6",
    label: "直近の更新",
    sql: "SELECT SUM(CASE WHEN updated_at >= datetime('now','-7 days') THEN 1 ELSE 0 END) AS u7, SUM(CASE WHEN updated_at >= datetime('now','-30 days') THEN 1 ELSE 0 END) AS u30 FROM decks;",
  },
  {
    id: "q7",
    label: "1人あたりデッキ数の分布",
    sql: "SELECT n, COUNT(*) AS users FROM (SELECT user_id, COUNT(*) AS n FROM decks GROUP BY user_id) GROUP BY n ORDER BY n;",
  },
  {
    id: "q8",
    label: "board別の枚数",
    sql: "SELECT board, SUM(qty) AS qty, COUNT(*) AS rows_ FROM deck_cards GROUP BY board ORDER BY qty DESC;",
  },
  {
    id: "q9",
    label: "版指定（イラスト選択）の利用率",
    sql: "SELECT COUNT(*) AS rows_, SUM(CASE WHEN art_image IS NOT NULL THEN 1 ELSE 0 END) AS with_art, COUNT(DISTINCT CASE WHEN art_image IS NOT NULL THEN deck_id END) AS decks_with_art FROM deck_cards;",
  },
  {
    id: "q10",
    label: "人気チャンピオン top10",
    sql: "SELECT champion_slug AS slug, COUNT(*) AS c FROM decks WHERE champion_slug IS NOT NULL GROUP BY slug ORDER BY c DESC LIMIT 10;",
  },
  {
    id: "q11",
    label: "人気カード top20",
    sql: "SELECT card_slug AS slug, SUM(qty) AS qty, COUNT(DISTINCT deck_id) AS decks FROM deck_cards GROUP BY slug ORDER BY qty DESC LIMIT 20;",
  },
];

function wranglerBin() {
  const local = path.join(REPO_ROOT, "node_modules", ".bin", "wrangler");
  if (existsSync(local)) return { cmd: local, prefix: [] };
  return { cmd: "npx", prefix: ["--yes", "wrangler"] };
}

function run(cmd, args, env, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { env, cwd: REPO_ROOT, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    let timer = null;
    if (timeoutMs) {
      timer = setTimeout(() => {
        err += `\n(タイムアウト ${Math.round(timeoutMs / 1000)}秒で中断)`;
        child.kill("SIGKILL");
      }, timeoutMs);
    }
    child.stdout.on("data", (b) => (out += b.toString()));
    child.stderr.on("data", (b) => (err += b.toString()));
    child.on("error", (e) => {
      if (timer) clearTimeout(timer);
      resolve({ code: -1, out, err: err + String(e && e.message) });
    });
    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      resolve({ code, out, err });
    });
  });
}

/** stdout から JSON 部分だけを切り出す（バナー等が混ざっても拾えるように）。 */
function extractJson(text) {
  for (const [open, close] of [
    ["[", "]"],
    ["{", "}"],
  ]) {
    const s = text.indexOf(open);
    const e = text.lastIndexOf(close);
    if (s >= 0 && e > s) {
      try {
        return JSON.parse(text.slice(s, e + 1));
      } catch {
        /* 次の候補へ */
      }
    }
  }
  return null;
}

/** wrangler の応答から行の配列を取り出す。形が変わっていたら null を返す。 */
export function rowsOf(parsed) {
  if (Array.isArray(parsed)) {
    const first = parsed.find((x) => x && Array.isArray(x.results));
    if (first) return first.results;
    return null;
  }
  if (parsed && Array.isArray(parsed.results)) return parsed.results;
  return null;
}

function shortErr(text) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  return t.length > 400 ? `${t.slice(0, 400)}…` : t;
}

/**
 * D1 セクションを集める。
 * 返り値は `{ ok: true, data }` か `{ ok: false, reason }`（設計書 §4.3 fail-open）。
 */
export async function collectD1({ log = () => {} } = {}) {
  const token = await readCloudflareToken();
  if (!token) {
    return {
      ok: false,
      reason: `Cloudflare APIトークンが見つかりません（${TOKEN_FILE} / 環境変数 CLOUDFLARE_API_TOKEN）。docs/dev-setup.md 手順5 を参照してください。`,
    };
  }
  const env = {
    ...process.env,
    CLOUDFLARE_API_TOKEN: token,
    CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID,
    WRANGLER_SEND_METRICS: "false",
    NO_COLOR: "1",
  };
  const { cmd, prefix } = wranglerBin();

  const data = {};
  const partialErrors = [];
  let firstReason = null;

  for (const q of QUERIES) {
    log(`  D1 ${q.id}: ${q.label}`);
    const args = [...prefix, "d1", "execute", "DB", "--remote", "--json", "--command", q.sql];
    const { code, out, err } = await run(cmd, args, env, 60_000);
    const parsed = extractJson(out) ?? extractJson(err);
    const rows = rowsOf(parsed);
    if (code === 0 && rows) {
      data[q.id] = rows;
      continue;
    }
    const apiErr = parsed && parsed.error ? JSON.stringify(parsed.error) : "";
    const reason = `${q.id}（${q.label}）に失敗: ${shortErr(apiErr || err || out || `exit ${code}`)}`;
    if (!firstReason) firstReason = reason;
    partialErrors.push(reason);
  }

  if (partialErrors.length === QUERIES.length) {
    return { ok: false, reason: firstReason };
  }
  return { ok: true, data, partialErrors };
}
