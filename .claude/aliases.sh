#!/usr/bin/env bash
# セッション役割つき Claude Code 起動ショートカット
#
#   cc-design  … 設計担当セッション（.claude/agents/design.md）
#   cc-dev     … 開発(実装)担当セッション（.claude/agents/dev.md）
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
