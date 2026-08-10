#!/usr/bin/env bash
# セッション役割つき Claude Code 起動ショートカット
#
#   cc-design  … 設計担当セッション（.claude/agents/design.md）
#   cc-sprint  … スプリント進行役（.claude/agents/sprint.md）
#                dev/review をサブエージェントとして交互に呼び、1ターミナルで回す
#   cc-dev     … 開発(実装)担当を単独で起動（.claude/agents/dev.md）
#   cc-review  … レビュー担当を単独で起動（.claude/agents/review.md）
#   cc-pr      … 広報担当（.claude/agents/pr.md）X投稿用の画像・投稿文を作る
#
# 通常は cc-design（設計）と cc-sprint（実装〜レビュー）の2つだけ使う。
# cc-dev / cc-review は工程を1つだけ手動で回したいときの直接起動用。
# cc-pr は 設計→開発→レビュー のサイクルの外側で、投稿を作りたいときだけ使う。
# サイクルは 設計 → 開発 → レビュー。ラベルは 実装待ち → レビュー待ち → 設計確認待ち と回る。
#
# 追加の引数はそのまま claude に渡る:  cc-design -c  /  cc-dev --effort high
#
# 有効化（devcontainer の postCreateCommand が ~/.bash_aliases に登録済み）:
#   source /workspaces/claude-test-vsc/.claude/aliases.sh
#
# ⚠️ ~/ 配下はコンテナ再構築で消えるため、実体はこのファイル（リポジトリ側）に置く。
#    再構築後は postCreateCommand が source 行を貼り直す。

# このファイルの位置からリポジトリルートを解決する（clone 先が変わっても動く）
_GA_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# どちらもリポジトリルートで起動する（CLAUDE.md と .claude/agents/ の探索を確実にするため）
cc-design() { (cd "$_GA_ROOT" && claude --agent design -n 設計 "$@"); }
cc-dev() { (cd "$_GA_ROOT" && claude --agent dev -n 開発 "$@"); }
cc-review() { (cd "$_GA_ROOT" && claude --agent review -n レビュー "$@"); }
cc-sprint() { (cd "$_GA_ROOT" && claude --agent sprint -n スプリント "$@"); }
cc-pr() { (cd "$_GA_ROOT" && claude --agent pr -n 広報 "$@"); }
