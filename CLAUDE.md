# CLAUDE.md

Grand Archive TCG 日本語カードDB(非公式)— 静的サイト+翻訳ツールチェーン。
詳細は README.md を参照。

## セッションの役割分担

このリポジトリでは2つのClaude Codeセッションを役割分担して運用している:

- **VSCode拡張側セッション = 設計担当**: 要件整理・API調査・設計書作成・画面モック作成・レビュー反映。実装コードは書かない
- **ターミナル側セッション = 開発(実装)担当**: 設計書を参照してコードを実装し、Playwright実駆動で検証する

**受け渡しは `docs/design/` 配下の設計書(+モックHTML)のみ**。運用ルール:

- 設計書には改版履歴表を付け、実装済み項目と実装待ち項目を明記する
  (既存の `統計タブ_設計.md`・`フォーマット検索_設計.md` の形式に倣う)
- 設計成果物はgitコミットする。`tmp/` はgitignoreのため設計成果物を置かない
- `docs/` 配下は本番配信対象外(`functions/docs/[[path]].js` が404を返す)

## 開発コマンド

- `npm run dev` — 静的プレビュー(scripts/serve.mjs、ポート3000)
- `npm run pages:dev` — Cloudflare Pages Functions込みのローカル実行(wrangler、ポート8788)
- `npm run validate` — データ検証
- `npm run db:migrate:local` — D1ローカルDBのマイグレーション

## 環境の注意

- devcontainer(node:20-bookworm)で動作。メモリー(`/home/node/.claude/`)は
  コンテナ再構築で消えるため、恒久的な運用ルールは本ファイルに書く
- CSPが `style-src 'self'` のためHTMLのstyle属性は使えない。動的スタイルは
  `data-*` 属性+CSSOM適用で行う(既存の.meter・統計タブの棒グラフと同方式)
