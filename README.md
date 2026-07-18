# Grand Archive 日本語サポートサイト 🃏

Grand Archive TCG を日本で遊ぶ人向けの、非公式ファンサイトです。
**英語カードに日本語訳を重ねるカードDB**を中心に、**デッキ構築ツール**・**印刷用PDF生成**・**用語解説**などのツールを内包します。

フロントはビルド不要の静的サイト（バニラ JS）。デッキ構築ツールのバックエンドのみ
**Cloudflare Pages Functions + D1** で動いています。

## 🌐 公開サイト

**<https://ga-card-tools-jp.pages.dev/>**（Cloudflare Pages）

英語版カードに日本語訳を重ねて検索・閲覧できる、Grand Archive TCG の非公式日本語カードDBです。
**全カード翻訳済み**（約2,240枚。新カードは随時対応）。カードごとの個別ページ・セット別ページも静的生成しています。

## 構成

```text
/
├─ index.html              カードDB（サイト本体）
├─ app.js / style.css      カードDB ロジック・スタイル
├─ cards/<slug>/           カード個別ページ（静的生成・SEO用。約2,240枚）
├─ sets/<prefix>/          セット別ページ（56セット）
├─ data/
│  ├─ translations.js      日本語訳データ（用語辞書・メタ訳・カード個別訳の基盤）
│  └─ tl/                  セット別の翻訳ファイル（全セット分）
│
├─ tools/
│  ├─ deck-builder/        デッキ構築ツール（Discordログイン・保存・共有）
│  ├─ print/               印刷PDFツール（カード画像 → A4に3×3=9枚）
│  └─ glossary/            ひとくちキーワード解説（用語集）
│
├─ shared/                 複数ツールで共有する部品
│  ├─ js/                  card-i18n / card-search / card-detail（検索・詳細の共通モジュール）
│  ├─ css/                 共通スタイル（カード詳細モーダル等）
│  ├─ vendor/jspdf.umd.min.js
│  └─ pdf/card-sheet.js    PDF生成の再利用コア
│
├─ functions/              Cloudflare Pages Functions（デッキ構築ツールのAPI）
│  ├─ api/                 auth（Discord OAuth）/ decks / me / health
│  └─ docs/                docs/配下を本番配信から遮断（404）
├─ migrations/             D1スキーマ（users / sessions / decks ほか）
├─ wrangler.toml           Pages/D1 設定（設定のソース・オブ・トゥルース）
│
├─ scripts/                開発用スクリプト（serve / 静的ページ生成 / validate / 用語チェック）
├─ docs/                   設計書（docs/design/）・開発環境の再構築手順書（dev-setup.md）
├─ CLAUDE.md               開発運用ルール（セッション役割分担・タスク管理・設計書運用）
├─ _headers                Cloudflare Pages 用（パス別CSP）
├─ sitemap.xml / robots.txt / ogp.png
└─ vercel.json             Vercel 用（パス別CSP・予備）
```

## 機能

### カードDB（ルート `/`）

- 公式API [api.gatcg.com](https://api.gatcg.com) からカードデータ・画像をその場で取得
- 自前の日本語訳（[data/](data/)）を重ねて表示。名前（日本語/英語）検索・効果テキスト検索
- 絞り込み: クラス / エレメント / タイプ / サブタイプ / **フォーマット**（スタンダード・パンテオン・ドラフトの使用可/禁止）/ エキスパンション + 並び替え
- 詳細表示: 効果の日本語訳＋英語原文、ゲーム用語の自動解説、イラスト版の切替
- **印刷リスト（プロキシPDF）**: カードを選んで A4 に 3×3＝9枚並べたPDFを生成
- カード個別ページ（`cards/<slug>/`）とセット別ページ（`sets/<prefix>/`）を静的生成（SEO・共有用）

### デッキ構築ツール（`/tools/deck-builder/`）

- **Discordログイン**でデッキをクラウド保存（Cloudflare D1）。共有リンクで公開・コピーも可能
- マテリアル / メイン / サイドボード / 検討中の4ゾーン管理、カードDBと同じ検索UI（共通モジュール）
- **統計タブ**: エレメント・タイプ・サブタイプ・キーワード集計と、フォーマット適合チェック（禁止カード・枚数制限）
- **デッキ画像出力**: デッキ全体を1枚の画像にしてX投稿等に使える
- イラスト版の選択・サムネイル設定・メモ・omnidex大会提出用コピー・印刷PDF連携

### 印刷PDFツール（`/tools/print/`）

- カード画像をアップロード → A4用紙に 3×3＝9枚 並べた印刷用PDFを生成
- カードサイズ・隙間・トンボ・枠線に対応。画像は端末内で処理し、外部送信しません

### ひとくちキーワード解説（`/tools/glossary/`）

- ゲーム用語の日本語解説集

## 開発・確認

[Dev Container](.devcontainer/devcontainer.json)（Node 20）での開発を想定しています。

```bash
npm run dev              # 静的プレビュー(ポート3000)
npm run pages:dev        # Pages Functions込みのローカル実行(wrangler、ポート8788)
npm run db:migrate:local # ローカルD1のマイグレーション
npm run validate         # データ検証
```

カードDB・印刷ツールは静的なのでブラウザで開くだけでも動作します（公式APIへ `fetch` するためオフラインでは一覧が空になります）。
デッキ構築ツールのAPIを動かすには `pages:dev` + ローカルD1 + `.dev.vars`（[.dev.vars.example](.dev.vars.example) 参照）が必要です。
環境を一から作り直す手順は [docs/dev-setup.md](docs/dev-setup.md)（ディザスタリカバリ手順書）を参照してください。

## 開発運用・タスク管理

- **タスクは [GitHub Issues](https://github.com/dozyouneko/ga-card-tools-jp/issues) で管理**しています
  （状態ラベル: 着手可 / 検討中 / 保留 / 凍結中）
- 設計書は [docs/design/](docs/design/) 配下でタスクごとにフォルダ管理（本番では配信されません）
- 開発の進め方・セッション役割分担などの運用ルールは [CLAUDE.md](CLAUDE.md) を参照

## セキュリティ（CSP）

パスごとに Content-Security-Policy を出し分けています（[_headers](_headers) / [vercel.json](vercel.json)）。

- `/tools/print/*` … 外部通信なしの厳格な `self` のみ
- それ以外 … 公式API `https://api.gatcg.com` への `connect` / `img`、Discordアバター用の
  `cdn.discordapp.com`（`img`）、Cloudflare Web Analytics のみ追加許可
- `style-src 'self'` のため**HTMLのstyle属性は使えません**。動的スタイルは data 属性＋CSSOM で適用します

各 HTML にも `<meta http-equiv="Content-Security-Policy">` を入れており、
ヘッダ非対応ホストでも最低限のCSPが効きます。

## 翻訳の増やし方

`card.slug` をキーに、`window.GA_I18N.cards` へ訳を追記します。少数の追加は
[data/translations.js](data/translations.js) の `cards` に、セット単位のまとまった翻訳は
[data/tl/](data/tl/) 配下のセット別ファイルに書き、`index.html` で `translations.js` の後に読み込みます。

```js
"card-slug-here": {
  name: "日本語カード名",
  effect: "日本語の効果テキスト（**太字** / *斜体* / 改行 \\n が使えます）",
  flavor: "フレーバーの訳（任意）",
},
```

表記ルール（用語の統一・自己名参照の「」など）は [TRANSLATION.md](TRANSLATION.md) を参照してください。

## 公開方法

本番は **Cloudflare Pages** で公開しています（`main` への push で自動デプロイ）。
ビルド不要・出力ディレクトリはリポジトリのルート（`/`）で、`_headers` によるパス別CSPがそのまま適用されます。

- デッキ構築ツールのAPIは同一プロジェクトの **Pages Functions**（[functions/](functions/)）+ **D1** で動作。
  スキーマ変更時は `npm run db:migrate:remote` を本番D1に適用
- 環境変数（Discord OAuth）は **secret_text（暗号化変数）** で設定すること
  （`wrangler.toml` が設定のソース・オブ・トゥルースのため、plain_text はデプロイごとに消えます）
- デプロイ後は DevTools コンソールに **CSP 違反が出ていないこと**を確認
  （リリース時の確認項目は [docs/design/リリース確認/](docs/design/リリース確認/) のチェックリストを参照）

## 留意点

- 本プロジェクトは非公式のファンサイトです。カードデータ・画像の著作権は Weebs of the Shore に帰属します。
- 日本語訳はコミュニティによる非公式訳です。公式が配布停止を求めた場合は従います。
