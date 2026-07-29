# #38 IndexNow: 日次cronが更新したURLをBingへ能動通知する

対象issue: [#38](https://github.com/dozyouneko/ga-card-tools-jp/issues/38)
親issue: [#28 発見経路(discovery)の確保](https://github.com/dozyouneko/ga-card-tools-jp/issues/28) の **C-3**

## 改版履歴

| 版 | 日付 | 内容 |
|---|---|---|
| 第1版 | 2026-07-29 | 初版。Bing Webmaster Tools の登録完了（サイトマップ即日「成功」・検出2.7K）で前提が揃ったため設計。**全項目が実装待ち** |

## 1. 背景（2026-07-29 実測）

| 対象 | 同じ `sitemap.xml` に対する結果 |
|---|---|
| **Bing** | ✅ **成功**・最終クロール 2026/07/29・**検出URL 2.7K（2,743件）**・エラー0/警告0 |
| **Google** | ❌ **取得できませんでした**（6日間・最終読み込み日時が空欄・型「不明」・検出0） |

サーバー側は本番で全数検証済み（Googlebot UAで10/10が200・XML整形式・BOM無し・TTFB 83ms・`X-Robots-Tag` 無し）。
→ **ファイルと配信は無実で、失敗はGoogle固有。Bing側の発見経路は生きている。**

⚠️ **本issueで改善するのはBing系だけ。GoogleはIndexNowに対応していない。**

## 2. 実装仕様

### 2.1 キーファイル（ルート直下・手作業で1回）

| 項目 | 値 |
|---|---|
| パス | **`c226706b28954362938a0297d5bc2b43.txt`**（リポジトリ直下） |
| 中身 | **`c226706b28954362938a0297d5bc2b43`** の1行のみ（UTF-8・末尾改行あり可） |
| 配信 | ⚠️ **本番配信物**。`https://ga-card-tools-jp.pages.dev/<key>.txt` で 200 になること |

- ルート直下の `.txt` が `text/plain; charset=utf-8` で配信されることは `robots.txt` で確認済み
- ⚠️ **このキーは公開前提の値**（誰でも読める場所に置く仕様）。秘密情報として扱う必要はない
- ⚠️ **キーファイルを消すとIndexNowは 403 になる**。`_headers` に新しい規則は不要

### 2.2 送信スクリプト `scripts/indexnow-submit.mjs`（新規）

```
使い方: node scripts/indexnow-submit.mjs <base> <head>
  例:   node scripts/indexnow-submit.mjs HEAD~1 HEAD
```

1. `git diff --name-only --diff-filter=ACM <base> <head>` で変更ファイルを取る
2. **ページのパスだけをURLへ写像する**（下表）
3. 0件なら**何もせず exit 0**（空の `urlList` を送ると 400 になる）
4. `https://api.indexnow.org/IndexNow` へ JSON を POST する

#### ファイル → URL の写像

| ファイル | URL | 備考 |
|---|---|---|
| `index.html` | `/` | |
| `cards/index.html` | `/cards/` | |
| `cards/<slug>/index.html` | `/cards/<slug>/` | |
| `sets/<set>/index.html` | `/sets/<set>/` | |
| `tournaments/index.html` | `/tournaments/` | |
| `tournaments/<id>/index.html` | `/tournaments/<id>/` | |

⚠️ **除外するもの**（送ってはいけない／送っても無意味）:

- **`tournaments/*/decks.html`** — `_headers` で **`X-Robots-Tag: noindex`** を付けているHTML断片。
  **noindexのURLを通知するのは矛盾**なので必ず除外する
- `data/**`・`sitemap.xml`・`*.css`・`*.js` — ページではない
- 上記のいずれにも当たらないパスは**黙って捨てる**（新種の生成物が増えても誤送信しない）

#### 送信するJSON

```json
{
  "host": "ga-card-tools-jp.pages.dev",
  "key": "c226706b28954362938a0297d5bc2b43",
  "keyLocation": "https://ga-card-tools-jp.pages.dev/c226706b28954362938a0297d5bc2b43.txt",
  "urlList": ["https://ga-card-tools-jp.pages.dev/cards/xxx/", "..."]
}
```

- `Content-Type: application/json; charset=utf-8`
- **1リクエストの上限は10,000 URL**。超える場合は分割する（現状の全ページ数2,743でも収まるが、安全側で実装する）
- URLは**昇順にソート**して送る（ログの再現性のため）

### 2.3 ⚠️ エラーの扱い — 恒久的な失敗は握り潰さない

| HTTP | 意味 | 扱い |
|---|---|---|
| **200 / 202** | 受理 | ✅ 成功。件数をログに出す |
| **429** | Too Many Requests（スロットリング） | ⚠️ **警告のみ・exit 0**。翌日また送れば済む一時的事象 |
| **400** | Invalid format | ❌ **exit 1** |
| **403** | key not valid（キーファイルが無い・中身が違う） | ❌ **exit 1** |
| **422** | URLがhostに属さない / keyの不一致 | ❌ **exit 1** |
| ネットワーク例外 | 一時的 | **1回だけ再試行**し、それでも失敗なら ❌ **exit 1** |

⚠️ **`continue-on-error: true` は付けない。** [#29](https://github.com/dozyouneko/ga-card-tools-jp/issues/29) の索引生成とは事情が違う:

| | #29 索引生成 | 本件 IndexNow |
|---|---|---|
| ステップの位置 | コミットより**前** | コミット・pushより**後** |
| 失敗を落とすと | **その日の大会データごと失われる** | **何も失われない**（pushは完了済み） |
| 403/422 の性質 | — | **恒久的**（キーファイル欠落・設定ミス）。握り潰すと**永久に通知が飛ばないまま気づけない** |

→ **jobを赤くするコストが小さく、見逃すコストが大きい**ので落とす。ただし 429 とネットワーク例外だけは例外扱いにする。

### 2.4 `.github/workflows/build-tournaments.yml`

コミット・pushステップに `id` を付け、**コミットが実際に発生したときだけ**次のステップを走らせる。

```yaml
      - name: 変更があればコミット・push
        id: commit
        run: |
          …
          if git diff --cached --quiet; then
            echo "更新なし(新しく確定した大会はありませんでした)"
            echo "committed=false" >> "$GITHUB_OUTPUT"
          else
            git commit -m "大会データ自動更新 $(date -u +%Y-%m-%d)"
            git push
            echo "committed=true" >> "$GITHUB_OUTPUT"
          fi

      # IndexNow(#38): 上でpushした分の変更ページだけをBing系へ通知する。
      # ⚠ Googleは IndexNow 非対応なので、これはBing/DuckDuckGo/Ecosia 等にのみ効く。
      # ⚠ continue-on-error は付けない。このステップはpushの後なので落ちても何も失われず、
      #   403/422 は恒久的な設定ミス(キーファイル欠落等)で握り潰すと永久に気づけないため。
      - name: 更新URLを IndexNow へ通知
        if: steps.commit.outputs.committed == 'true'
        run: node scripts/indexnow-submit.mjs HEAD~1 HEAD
```

⚠️ **`if:` の条件は必須。** コミットが無かった日に `HEAD~1 HEAD` を取ると**無関係な前回のコミットの差分**を再送信してしまう。

## 3. やらないこと

- **初回の一括送信（2,743 URL）はしない。** Bingは**サイトマップを既に受理済み**（2.7K検出）なので、
  自前のスケジュールでクロールするのを**まず観察する**。進まない場合に再検討する
  （数千URLをいきなり送ると429のリスクがあり、得るものが少ない）
- Google向けの施策は含めない（#37・#28で別途）
- `sitemap.xml` の分割（#28 の C-2）は含めない。⚠️ **Bingが同じファイルを問題なく処理できたため、
  「ファイル構造が原因」という仮説は消えた**。C-2 は「診断の解像度を上げる」という元の位置づけに戻す

## 4. 検証項目

⚠️ 報告は**この番号に対応づけた表**で issue #38 にコメントすること。

### ローカル（push前）

| # | 検証内容 | 期待 |
|---|---|---|
| **V1** | `node scripts/indexnow-submit.mjs <直近のcronコミット>~1 <同>` を**ドライラン**（送信せずURL一覧を出す）で実行 | 変更ページのURLだけが並ぶ |
| **V2** | 写像の網羅性 | `index.html` / `cards/index.html` / `cards/<slug>/` / `sets/<set>/` / `tournaments/` / `tournaments/<id>/` が正しく変換される |
| **V3** | ⭐ **`tournaments/*/decks.html` が結果に含まれない** | noindexのURLを送らない |
| **V4** | `data/**` `sitemap.xml` `*.css` `*.js` が結果に含まれない | ページ以外を送らない |
| **V5** | 差分0件のとき | **何も送らず exit 0**（空 `urlList` を送らない） |
| **V6** | 10,000件超の分割 | 合成データで分割されることを確認（実データでは起きない） |
| **V7** | URLが**昇順にソート**されている | ログの再現性 |

### 本番（push後）

| # | 検証内容 | 期待 |
|---|---|---|
| **V8** | `curl -s https://ga-card-tools-jp.pages.dev/c226706b28954362938a0297d5bc2b43.txt` | **キー文字列が1行だけ**・HTTP **200**・`text/plain` |
| **V9** | 実際に1回だけ手動送信（`workflow_dispatch` かローカルから数件） | **HTTP 200** |
| **V10** | 誤ったキーで送る（キーを1文字変える） | **403 になり exit 1 する**（エラー処理が機能している） |
| **V11** | Bing Webmaster Tools の **IndexNow** 画面 | 送信したURLが**受理済みとして表示される** |
| **V12** | 翌朝のcron | ステップが走り、**その日の変更URLだけ**が送信される |

⚠️ **V8 は `npm run dev` では確認にならない**（ルート直下の配信はPagesの挙動）。本番で `curl` すること。

## 5. リスクとロールバック

| リスク | 対処 |
|---|---|
| キーファイルを消してしまう | IndexNowが403 → **jobが赤くなって気づける**（§2.3） |
| 429（スパム判定） | 警告のみで exit 0。翌日再送。**初回一括送信をしない**のもこのため |
| 誤ってnoindexのURLを送る | V3で検査。写像は**ホワイトリスト方式**（知らないパスは捨てる） |
| ロールバック | ⚠️ **ワークフローのステップを消すだけ**。キーファイルは残しても害がない（放置してよい） |

⚠️ 本番配信物（キーファイル）とワークフローの変更なので、**pushはユーザーの明示的な指示を待つ**。

## 6. 関連

- [#28](https://github.com/dozyouneko/ga-card-tools-jp/issues/28) 親issue。**Bingは成功・Googleは失敗**の実測記録
- [#30](https://github.com/dozyouneko/ga-card-tools-jp/issues/30) cronのコミット範囲。ここから差分URLを取る
- [#29](https://github.com/dozyouneko/ga-card-tools-jp/issues/29) `continue-on-error` を付けた判断。**本件は逆**（§2.3）
- [#37](https://github.com/dozyouneko/ga-card-tools-jp/issues/37) トップの静的セットリンク（Google向けの対の施策）
