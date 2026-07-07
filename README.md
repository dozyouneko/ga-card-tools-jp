# Grand Archive 日本語サポートサイト 🃏

Grand Archive TCG を日本で遊ぶ人向けの、非公式ファンサイトです。
**英語カードに日本語訳を重ねるカードDB**を中心に、**印刷用PDF生成**などのツールを内包します。

すべて**ビルド不要の静的サイト**（バニラ JS）。`index.html` をブラウザで開くだけで動きます。

## 🌐 公開サイト

**<https://ga-card-tools-jp.pages.dev/>**（Cloudflare Pages）

英語版カードに日本語訳を重ねて検索・閲覧できる、Grand Archive TCG の非公式日本語カードDBです。
最新弾 **Radiant Origins（RDO）** を中心に翻訳を進めており、未訳のカードは「未翻訳」バッジ付きで英語原文のまま表示されます。
カードを選んでプロキシ（プレイテスト）用の印刷PDFを作る機能も備えています。

## 構成

```
/
├─ index.html              カードDB（サイト本体）
├─ app.js                  カードDB ロジック（公式APIを叩く / 翻訳レイヤー）
├─ style.css               カードDB スタイル
├─ data/
│  ├─ translations.js      日本語訳データ（用語辞書・メタ訳・カード個別訳の基盤）
│  └─ tl/                  セット別の翻訳ファイル（大量のカードはここに分割）
│     ├─ dtrsd.js          Distorted Reflections スターター
│     ├─ rdo.js            Radiant Origins 基本セット
│     └─ rdo-ext.js        RDO 関連（1st Ed. 限定 / Armaments / Event Pack）
│
├─ tools/
│  └─ print/               印刷PDFツール（カード画像 → A4に3×3=9枚）
│     ├─ index.html
│     ├─ app.js            UI層（アップロード・オプション）
│     └─ style.css
│
├─ shared/                 複数ツールで共有する部品
│  ├─ vendor/
│  │  └─ jspdf.umd.min.js  jsPDF 本体（ローカル同梱・CDN非依存）
│  └─ pdf/
│     └─ card-sheet.js     PDF生成の再利用コア（レイアウト/切り抜き/出力）
│
├─ _headers                Cloudflare Pages / Netlify 用（パス別CSP）
├─ vercel.json             Vercel 用（パス別CSP・予備）
└─ .nojekyll               静的ファイルをそのまま配信（Jekyll無効化）
```

## 機能

### カードDB（ルート `/`）

- 公式API [api.gatcg.com](https://api.gatcg.com) からカードデータ・画像をその場で取得
- 自前の日本語訳（[data/translations.js](data/translations.js)）を重ねて表示。訳が無いカードは英語原文＋「翻訳募集中」表示
- 名前（日本語/英語）検索、クラス/エレメント/タイプでの絞り込み
- 詳細表示：効果の日本語訳＋英語原文、メタ情報、効果文中のゲーム用語の自動解説
- クラス/エレメント/タイプ/サブタイプは「英語（和訳）」形式で表示（例: `FIRE（火）`）
- **印刷リスト（プロキシPDF）**: 一覧の「＋🖨️」やカード詳細から印刷リストへ追加 → 数量を指定して
  A4に 3×3＝9枚 並べたPDFを生成（複数ページ対応）。リスト内容は `localStorage` に保存

### 印刷PDFツール（`/tools/print/`）

- カード画像をアップロード → A4用紙に 3×3＝9枚 並べた印刷用PDFを生成
- カードサイズ（標準63×88mm ほか）、隙間、トンボ、枠線に対応
- 画像は端末内で処理し、外部送信しません
- 生成ロジックは [shared/pdf/card-sheet.js](shared/pdf/card-sheet.js) に分離済み

> **カードDBとの連携（実装済み）**: カードDBの「印刷リスト」から選んだカードの画像を
> `CardSheet.buildPdfPaged(images, options, jsPDF)` に渡し、「カードDB → 印刷用PDF（プロキシ/プレイテスト）」を実現しています。
> レイアウト/切り抜き/PDF出力の共有コアは `shared/pdf/card-sheet.js`（`window.CardSheet`）にあり、
> アップロード版ツールとカードDBの双方から利用しています。

## 開発・確認

Node.js 不要。`index.html` をブラウザで開くだけで動作します。
（カードDBは公式APIへ `fetch` します。オフラインでは一覧が空になります。）

## セキュリティ（CSP）

パスごとに Content-Security-Policy を出し分けています（[_headers](_headers) / [vercel.json](vercel.json)）。

- `/tools/print/*` … 外部通信なしの厳格な `self` のみ
- それ以外（カードDB） … 公式API `https://api.gatcg.com` への `connect` / `img` のみ追加許可

各 HTML にも `<meta http-equiv="Content-Security-Policy">` を入れており、
ヘッダ非対応ホスト（GitHub Pages 等）でも最低限のCSPが効きます。

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

- **Cloudflare Pages（本番）**: Git 連携。Build command 空欄 / Build output directory `/`（`_headers` 自動適用）
- 代替候補（いずれもビルド不要）:
  - **Netlify Drop**: <https://app.netlify.com/drop> にフォルダごとドラッグ＆ドロップ（`_headers` 自動適用）
  - **Vercel**: Import → Framework Preset **Other**（`vercel.json` のヘッダ自動適用）
  - **GitHub Pages**: `<meta>` の CSP のみ有効（`_headers` は非対応）。使う場合は Pages 用の deploy workflow を別途用意

公開後は DevTools コンソールに **CSP 違反が出ていないこと**、カードDBの一覧表示と印刷PDF生成が動くことを確認してください。

## 留意点

- 本プロジェクトは非公式のファンサイトです。カードデータ・画像の著作権は Weebs of the Shore に帰属します。
- 日本語訳はコミュニティによる非公式訳です。公式が配布停止を求めた場合は従います。

## ロードマップ（候補）

- [x] カードDB → 印刷PDF の連携（印刷リスト / プロキシPDF）
- [x] 翻訳の拡充（全カード翻訳完了）
- [x] カードDBの使い勝手強化（ページ送り / カード個別URL は実装済み）
- [ ] 翻訳精度の見直し（TRANSLATION.md の用語対訳・言い回しとの整合を全セットで再チェック。分量が多いのでセット単位で進める）
- [ ] カードDBの絞り込み強化（コスト・レベル等のフィルタ追加）
- [ ] リポジトリ整理（ルート直下の `scratch_ref_*` 作業用ファイルを `.gitignore` 対象にする、または専用ディレクトリへ移動）
- [ ] Node.js 導入 → Next.js へ移行し、カードごとの静的ページを生成（SEO流入の最大化）
- [ ] デッキ構築ツールへの拡張
