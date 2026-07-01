# カード印刷PDF生成 🃏

カード画像をアップロードすると、A4用紙に **3×3＝9枚** 並べた印刷用PDFを生成する静的Webアプリです。
カードサイズは MTG / ポケモンカード等の標準（**63×88mm**）に対応。

- すべての処理は**ブラウザ内で完結**し、画像はサーバーに送信されません。
- 外部依存は同梱の jsPDF のみ（CDN 非依存）。

## ファイル構成

```
index.html                 画面 / UI（CSPメタタグ入り）
style.css                  スタイル
app.js                     画像処理・PDF生成ロジック
vendor/jspdf.umd.min.js    jsPDF 本体（ローカル同梱）
_headers                   Netlify / Cloudflare Pages 用セキュリティヘッダ
vercel.json                Vercel 用セキュリティヘッダ
.nojekyll                  GitHub Pages で全ファイルをそのまま配信
.github/workflows/deploy.yml  GitHub Pages 自動デプロイ
```

## セキュリティ対策（実施済み）

| 項目 | 内容 |
|---|---|
| 依存の自己完結 | jsPDF を CDN からローカルへ同梱（供給網リスク排除） |
| CSP | `script-src 'self'` 等。`eval`/`new Function` 不使用を確認済み |
| 追加ヘッダ | `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy` |
| プライバシー | 画像は端末内処理・外部送信なし |

> ホストがヘッダ非対応（GitHub Pages 等）でも、`index.html` 内の `<meta http-equiv="Content-Security-Policy">` で CSP が有効になります。ヘッダ対応ホスト（Netlify/Cloudflare/Vercel）ではファイル側の設定でより多くのヘッダが付与されます。

---

## 公開方法

### 方法A: Netlify Drop（最も簡単・1分）

1. https://app.netlify.com/drop を開く
2. このフォルダ全体をドラッグ＆ドロップ
3. `https://<ランダム名>.netlify.app` が即発行（`_headers` も自動適用）

### 方法B: Cloudflare Pages（高速・おすすめ）

1. GitHub にこのリポジトリを push（下記「Git 初期化」参照）
2. Cloudflare ダッシュボード → Workers & Pages → Create → Pages → Connect to Git
3. ビルド設定は**なし**（Build command 空欄 / Output directory `/`）
4. Deploy →  `https://<プロジェクト>.pages.dev` 発行（`_headers` 自動適用）

### 方法C: GitHub Pages（Actions 自動デプロイ）

1. GitHub にこのリポジトリを push
2. リポジトリ **Settings → Pages → Build and deployment → Source** を **GitHub Actions** に設定
3. `main` へ push すると `.github/workflows/deploy.yml` が実行され自動公開
4. `https://<ユーザー名>.github.io/<リポジトリ名>/` で公開

### 方法D: Vercel

1. GitHub に push → Vercel で Import
2. Framework Preset: **Other**（ビルド不要）
3. Deploy →  `vercel.json` のヘッダが自動適用

---

## Git 初期化（B/C/D で必要）

このフォルダで以下を実行：

```bash
git init
git add .
git commit -m "Initial commit: card print PDF generator"
git branch -M main
git remote add origin https://github.com/<ユーザー名>/<リポジトリ名>.git
git push -u origin main
```

---

## 公開後の確認

- ブラウザの DevTools → Console に **CSP 違反エラーが出ていない**こと
- PDF 生成が正常に動くこと（画像アップロード → プレビュー → PDF保存）
- ヘッダ確認は https://securityheaders.com にURLを入力してスコアをチェック

## 注意（著作権）

カード画像は権利物であることが多いため、**私的利用の範囲**でご利用ください。
