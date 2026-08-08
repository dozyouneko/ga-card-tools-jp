#!/usr/bin/env bash
# =============================================================================
# .devcontainer/setup.sh — 開発環境の復旧を自動化する冪等スクリプト (issue #9)
#
# コンテナ再構築で消えるもの(overlayfs 上)のうち、自動化できるものを復旧する。
#   S1 gh          : GitHub CLI 本体(+ aptソース定義)
#   S2 apt         : python3-pil / fonts-noto-cjk
#   S3 playwright  : playwright npmパッケージ + Chromium 本体
#   S4 diag        : 復旧状況の診断表示(手作業が残っているものを明示)
#
# 設計: docs/design/9-環境再構築の自動化/環境再構築の自動化_設計.md
# 手順書: docs/dev-setup.md
#
# ⚠️ 方針
#   - `set -e` は使わない。1ステップの失敗で全体を止めない
#   - スクリプトは **常に exit 0**(コンテナ作成を絶対に失敗させない)
#   - シークレットの値は**絶対に出力しない**(有無だけを出す)
#   - 冪等。導入済みならスキップする(2回目は数秒で終わる)
#
# 単体での再実行:  npm run setup:env   (= bash .devcontainer/setup.sh)
#
# テスト用の環境変数:
#   GA_SETUP_SIMULATE_FAILURE=gh,apt   指定ステップを強制的に失敗させる(失敗耐性の検証用)
#   GA_SETUP_SKIP=playwright           指定ステップをスキップする(短時間で回す用)
# =============================================================================

# リポジトリルートへ移動(clone 先のパスに依存しない)
cd "$(dirname "$0")/.." 2>/dev/null || {
  echo "⚠️  リポジトリルートへ移動できませんでした。setup.sh を中断します。"
  exit 0
}

PLAYWRIGHT_VERSION="1.61.1"
MEMORY_DIR="$HOME/.claude/projects/-workspaces-claude-test-vsc/memory"
CF_TOKEN_FILE="$HOME/.cloudflare-token"

STEP_TOTAL=3
STEP_NO=0
FAILED_STEPS=()
APT_UPDATED=0

# -----------------------------------------------------------------------------
# 共通ユーティリティ
# -----------------------------------------------------------------------------

# $1 が $2(カンマ区切りリスト)に含まれるか
is_listed() {
  local needle="$1" list="${2//[[:space:]]/}"
  [ -n "$list" ] || return 1
  case ",${list}," in
    *",${needle},"*) return 0 ;;
  esac
  return 1
}

# sudo がパスワード無しで使えるか
sudo_ok() {
  sudo -n true 2>/dev/null
}

# apt-get update を1回だけ実行する
apt_update_once() {
  [ "$APT_UPDATED" = "1" ] && return 0
  sudo apt-get update -qq || return 1
  APT_UPDATED=1
  return 0
}

# run_step <id> <説明> <関数名プレフィックス>
#   <関数名プレフィックス>_check が 0 を返したらスキップ(冪等性)
#   <関数名プレフィックス>     が本体。非0で戻っても記録して次へ進む
run_step() {
  local id="$1" desc="$2" fn="$3"
  STEP_NO=$((STEP_NO + 1))
  printf '\n[%d/%d] %s (id: %s)\n' "$STEP_NO" "$STEP_TOTAL" "$desc" "$id"

  if is_listed "$id" "${GA_SETUP_SKIP:-}"; then
    echo "  ⏭  スキップ (GA_SETUP_SKIP の指定)"
    return 0
  fi

  # ⚠️ 疑似失敗は冪等スキップより先に判定する(導入済みでも失敗系を再現できるように)
  if is_listed "$id" "${GA_SETUP_SIMULATE_FAILURE:-}"; then
    echo "  ❌ 失敗 (GA_SETUP_SIMULATE_FAILURE による疑似失敗。続行します)"
    FAILED_STEPS+=("$id")
    return 0
  fi

  if "${fn}_check" 2>/dev/null; then
    echo "  ⏭  スキップ (導入済み)"
    return 0
  fi

  local start=$SECONDS
  if "$fn"; then
    echo "  ✅ 完了 ($((SECONDS - start))秒)"
  else
    echo "  ❌ 失敗 ($((SECONDS - start))秒。続行します)"
    FAILED_STEPS+=("$id")
  fi
  return 0
}

# -----------------------------------------------------------------------------
# S1: GitHub CLI
# -----------------------------------------------------------------------------
step_gh_check() {
  command -v gh >/dev/null 2>&1
}

step_gh() {
  sudo_ok || { echo "  ⚠️  sudo が使えません"; return 1; }

  sudo mkdir -p -m 755 /etc/apt/keyrings || return 1
  # ⚠️ tee で「上書き」する(>> だと再実行のたびに重複行が増える)
  curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
    | sudo tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null || return 1
  sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg || return 1
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
    | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null || return 1

  APT_UPDATED=0        # ソースを足したので必ず引き直す
  apt_update_once || return 1
  sudo apt-get install -y gh || return 1
}

# -----------------------------------------------------------------------------
# S2: aptパッケージ(宣伝画像生成用)
# -----------------------------------------------------------------------------
step_apt_check() {
  dpkg -s python3-pil >/dev/null 2>&1 && dpkg -s fonts-noto-cjk >/dev/null 2>&1
}

step_apt() {
  sudo_ok || { echo "  ⚠️  sudo が使えません"; return 1; }
  # S1 がスキップされた場合に備えて、未実行ならここで1回だけ update する
  apt_update_once || return 1
  sudo apt-get install -y python3-pil fonts-noto-cjk || return 1
}

# -----------------------------------------------------------------------------
# S3: Playwright(npmパッケージ + Chromium)
# -----------------------------------------------------------------------------
chromium_dir() {
  local d
  for d in "$HOME"/.cache/ms-playwright/chromium-*; do
    [ -d "$d" ] && { basename "$d"; return 0; }
  done
  return 1
}

step_playwright_check() {
  [ -d node_modules/playwright ] && chromium_dir >/dev/null
}

step_playwright() {
  # ⚠️ playwright は package.json に入れない(本番Pagesビルドで Chromium DL が走るリスク)。
  #    --no-save --no-package-lock で package-lock.json を汚さない。
  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --no-save --no-package-lock --no-audit --no-fund \
    "playwright@${PLAYWRIGHT_VERSION}" || return 1
  npx playwright install chromium || return 1
}

# -----------------------------------------------------------------------------
# S4: 診断表示
# -----------------------------------------------------------------------------

# ラベルは表示幅19桁に揃えてある(全角=2桁として手で調整済み)
L_GH="gh CLI             "
L_PIL="python3-pil        "
L_CJK="fonts-noto-cjk     "
L_PW="Playwright         "
L_AUTH="gh 認証            "
L_CF="Cloudflareトークン "
L_MEM="Claude メモリー    "
L_GIT="git identity       "

MANUAL_PENDING=0

row() { printf '%s %s: %s\n' "$1" "$2" "$3"; }

# [手動] 行。$3 が空でなければ「未完了」として数える
row_manual() {
  local label="$1" ok="$2" ng="$3"
  if [ -z "$ng" ]; then
    row "[手動]" "$label" "$ok"
  else
    MANUAL_PENDING=$((MANUAL_PENDING + 1))
    row "[手動]" "$label" "$ng"
  fi
}

step_diag() {
  echo ""
  echo "━━━━━━ 開発環境 復旧状況 ━━━━━━"

  # --- [自動] gh CLI
  if command -v gh >/dev/null 2>&1; then
    row "[自動]" "$L_GH" "✅ $(gh --version 2>/dev/null | head -1 | awk '{print $3}')"
  else
    row "[自動]" "$L_GH" "❌ 未導入        → npm run setup:env"
  fi

  # --- [自動] aptパッケージ
  if dpkg -s python3-pil >/dev/null 2>&1; then
    row "[自動]" "$L_PIL" "✅ 導入済み"
  else
    row "[自動]" "$L_PIL" "❌ 未導入        → npm run setup:env"
  fi
  if dpkg -s fonts-noto-cjk >/dev/null 2>&1; then
    row "[自動]" "$L_CJK" "✅ 導入済み"
  else
    row "[自動]" "$L_CJK" "❌ 未導入        → npm run setup:env"
  fi

  # --- [自動] Playwright
  local pw_ver="" chrome=""
  if [ -d node_modules/playwright ]; then
    pw_ver="$(node -p "require('./node_modules/playwright/package.json').version" 2>/dev/null)"
    [ -n "$pw_ver" ] || pw_ver="?"
  fi
  chrome="$(chromium_dir 2>/dev/null)"
  if [ -n "$pw_ver" ] && [ -n "$chrome" ]; then
    row "[自動]" "$L_PW" "✅ playwright@${pw_ver} / ${chrome}"
  elif [ -n "$pw_ver" ]; then
    row "[自動]" "$L_PW" "⚠️  playwright@${pw_ver} / Chromium未取得 → npm run setup:env"
  else
    row "[自動]" "$L_PW" "❌ 未導入        → npm run setup:env"
  fi

  # --- [手動] gh 認証(⚠️ トークンは出力しない。アカウント名のみ)
  if command -v gh >/dev/null 2>&1; then
    local auth_out=""
    if auth_out="$(gh auth status 2>&1)"; then
      local acct
      acct="$(printf '%s' "$auth_out" | sed -n 's/.*account \([A-Za-z0-9_-]*\).*/\1/p' | head -1)"
      row_manual "$L_AUTH" "✅ ログイン済み${acct:+ ($acct)}" ""
    else
      row_manual "$L_AUTH" "" "❌ 未ログイン    → gh auth login"
    fi
  else
    row_manual "$L_AUTH" "" "❌ 判定不可      → 先に gh を導入 (npm run setup:env)"
  fi

  # --- [手動] Cloudflareトークン(⚠️ 有無だけ。中身は出さない)
  if [ -s "$CF_TOKEN_FILE" ]; then
    row_manual "$L_CF" "✅ 有り" ""
  else
    row_manual "$L_CF" "" "❌ 無し          → docs/dev-setup.md 手順5"
  fi

  # --- [手動] Claude メモリー
  local mem_count=0
  [ -d "$MEMORY_DIR" ] && mem_count="$(find "$MEMORY_DIR" -type f 2>/dev/null | wc -l)"
  if [ "$mem_count" -gt 0 ]; then
    row_manual "$L_MEM" "✅ ${mem_count}件" ""
  else
    row_manual "$L_MEM" "" "❌ 空            → バックアップから復元(任意)"
  fi

  # --- [情報] git identity(⚠️ 判定はしない。表示のみ)
  #     user.email は ~/.gitconfig(ホストからのコピー)由来で、コンテナ再構築の影響を受ける
  row "[情報]" "$L_GIT" "$(git config --get user.name 2>/dev/null) <$(git config --get user.email 2>/dev/null)>"

  if [ ${#FAILED_STEPS[@]} -gt 0 ]; then
    echo ""
    echo "⚠️  失敗したステップ: ${FAILED_STEPS[*]}  (再実行: npm run setup:env)"
  fi

  echo ""
  if [ "$MANUAL_PENDING" -gt 0 ]; then
    echo "━━━━━━ 手作業が ${MANUAL_PENDING} 件 残っています ━━━━━━"
  else
    echo "━━━━━━ 手作業はありません ━━━━━━"
  fi
  echo "詳細: docs/dev-setup.md"
}

# -----------------------------------------------------------------------------
# 実行
# -----------------------------------------------------------------------------
echo "━━━━━━ 開発環境 復旧セットアップ (.devcontainer/setup.sh) ━━━━━━"
[ -n "${GA_SETUP_SKIP:-}" ] && echo "GA_SETUP_SKIP=${GA_SETUP_SKIP}"
[ -n "${GA_SETUP_SIMULATE_FAILURE:-}" ] && echo "GA_SETUP_SIMULATE_FAILURE=${GA_SETUP_SIMULATE_FAILURE}"

run_step gh         "GitHub CLI"                      step_gh
run_step apt        "python3-pil / fonts-noto-cjk"    step_apt
run_step playwright "Playwright (npm + Chromium)"     step_playwright

# S4 は常に実行する(スクリプトの締めくくり)
step_diag

exit 0
