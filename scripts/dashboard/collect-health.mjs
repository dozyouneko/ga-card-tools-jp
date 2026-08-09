// 運営ダッシュボード（issue #56）— 運用ヘルス。
//
// ローカルのファイルと git だけを見る（ネットワーク不要・設計書 §5.3）。
// ⚠️ `meta.sets` の新セット追記漏れ（#40）は**載せない**。`npm run validate` が既に exit 1 で
//    検出しており、二重に持つと片方の更新漏れで嘘をつく。
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { REPO_ROOT } from "./collect-d1.mjs";

function git(args) {
  const r = spawnSync("git", args, { cwd: REPO_ROOT, encoding: "utf8" });
  return { code: r.status, out: (r.stdout || "").trim(), err: (r.stderr || "").trim() };
}

async function cronFreshness() {
  const file = path.join(REPO_ROOT, "data", "tournaments", "index.json");
  try {
    const j = JSON.parse(await readFile(file, "utf8"));
    const at = j.updatedAt ? new Date(j.updatedAt) : null;
    if (!at || Number.isNaN(at.getTime())) {
      return { id: "cron", label: "日次cronの最終更新", warn: true, detail: "updatedAt を読めませんでした" };
    }
    const hours = (Date.now() - at.getTime()) / 3_600_000;
    return {
      id: "cron",
      label: "日次cronの最終更新",
      warn: hours > 48,
      at: at.toISOString(),
      hours: Math.floor(hours),
    };
  } catch (e) {
    return { id: "cron", label: "日次cronの最終更新", warn: true, detail: `読み取り失敗: ${e.message}` };
  }
}

async function seasonalBanEnd() {
  const file = path.join(REPO_ROOT, "data", "seasonal-banlist.json");
  try {
    const j = JSON.parse(await readFile(file, "utf8"));
    const seasons = Array.isArray(j.seasons) ? j.seasons : [];
    const open = seasons.filter((s) => s && s.effectiveTo == null);
    return {
      id: "banlist",
      label: "シーズン禁止の終了日が未設定",
      warn: open.length >= 2,
      count: open.length,
      names: open.map((s) => s.nameJp || s.name || s.id || "?"),
    };
  } catch (e) {
    return { id: "banlist", label: "シーズン禁止の終了日が未設定", warn: true, detail: `読み取り失敗: ${e.message}` };
  }
}

function unpushed() {
  const count = git(["rev-list", "--count", "origin/main..HEAD"]);
  if (count.code !== 0) {
    return {
      id: "unpushed",
      label: "未pushコミット",
      warn: true,
      detail: `origin/main と比較できませんでした（${count.err || "git 失敗"}）`,
    };
  }
  const commits = Number(count.out || 0);
  const files = git(["diff", "--name-only", "origin/main..HEAD", "--", ".", ":(exclude)docs/*"]);
  const prodFiles = files.code === 0 && files.out ? files.out.split("\n").filter(Boolean) : [];
  return {
    id: "unpushed",
    label: "未pushコミット",
    warn: prodFiles.length > 0,
    commits,
    prodFiles: prodFiles.slice(0, 20),
    prodFileCount: prodFiles.length,
  };
}

/** 運用ヘルスを集める。ローカル完結なので基本的に ok: true。 */
export async function collectHealth() {
  try {
    const items = [await cronFreshness(), await seasonalBanEnd(), unpushed()];
    return { ok: true, data: { items, warnCount: items.filter((i) => i.warn).length } };
  } catch (e) {
    return { ok: false, reason: `運用ヘルスの取得に失敗しました: ${e.message}` };
  }
}
