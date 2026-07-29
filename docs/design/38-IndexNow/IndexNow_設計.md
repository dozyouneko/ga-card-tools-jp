# #38 IndexNow: 日次cronが更新したURLをBingへ能動通知する

対象issue: [#38](https://github.com/dozyouneko/ga-card-tools-jp/issues/38)
親issue: [#28 発見経路(discovery)の確保](https://github.com/dozyouneko/ga-card-tools-jp/issues/28) の **C-3**

## 改版履歴

| 版 | 日付 | 内容 |
|---|---|---|
| 第2版（実装レビュー） | 2026-07-29 | 実装（`5f2abc9b`）を設計適合レビューし**条件付き承認**。設計担当側で独立検証: 実cronコミット `676a6b63` で **49ファイル→16 URL**（`decks.html` **15件**と `data/**` を除外）、実データの全slug **2,737件が `SEG` に収まる**ことを確認。**確認事項1〜3に回答**（§2.3・§4に反映）。⚠️ **リネーム時に通知が漏れる経路を指摘**（§2.2）。検証中の**本番API誤送信の報告**を受理し §5 に記録 |
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

#### ⚠️ BWTの「Generate API Key」欄は**開くたびに違う値を出す**（2026-07-29 実測）

Bing Webmaster Tools の IndexNow 画面を開き直すと、キー欄の値が**毎回変わる**。実測:

```
c226706b28954362938a0297d5bc2b43  ← 1回目（採用してホスト済み）
71f4e2aa0bd24f65b51eb63151184889  ← 2回目
ed9604461bc145aea2f0eba1feb989a0  ← 3回目
8550608e98e74bd1bb787d4e7a2494fc  ← 4回目
```

**これは「登録されたキーが変わった」のではなく、ランダムなキーを生成する便利機能にすぎない。**
IndexNow の仕様上、**キーはサイト運営者が任意に決めてよく、事前登録する仕組みは無い**。
`https://host/<キー>.txt` に置くこと自体が所有の証明である。

⚠️ **403 が出たときに「表示中のキーに合わせて差し替える」のは誤り。** 差し替えても直らないうえ、
ホスト済みのキーを壊して原因を1つ増やす。**判定は「開き直して値が変わるか」で行う**（変わるなら生成器）。

⚠️ BWTのIndexNow画面には**送信履歴のダッシュボードが無い**（手順1〜4の案内のみ・2026-07-29時点）。
受理状況をこの画面から確認することはできない。

### 2.2 送信スクリプト `scripts/indexnow-submit.mjs`（新規）

```
使い方: node scripts/indexnow-submit.mjs <base> <head>
  例:   node scripts/indexnow-submit.mjs HEAD~1 HEAD
```

1. `git diff --name-only --diff-filter=ACMR <base> <head>` で変更ファイルを取る

   ⚠️ **`R`（リネーム）を含めること**（2026-07-29 レビューで追加）。`ACM` だけだと**リネームが丸ごと落ちる**。
   実測:

   ```
   cards/old/index.html → cards/new/index.html にリネームしたコミットで
     --diff-filter=ACM  : （出力なし）      ← 新URLが通知されない
     --diff-filter=ACMR : cards/new/index.html   ← 正しい（リネーム先だけが出る）
   ```

   公式データの修正で**カードのslugが変わる**と、内容がほぼ同じなのでgitは `R` と判定する
   （`diff.renames` は既定で有効）。そのとき**新しいURLが通知されないまま**になる。
   `D`（削除）は引き続き除外する（消えたURLを通知しない）。
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

#### 429 が出たら**その回の残りチャンクを送らない**（2026-07-29 承認）

複数チャンクの途中で 429 になった場合、**残りを送らずに正常終了**し、翌日のcronで送り直す。
スロットリング中に送り続けると状況が悪化するため。
（現状は全2,743ページでも1チャンクなので実運用では起きない。将来の保険）

#### 検証用の環境変数（2026-07-29 承認）

本番のcronは設定しない差し替え口。**本番コードに残すことを承認する**（これが無いと §2.3 の
エラー分岐をローカルで実測できず、確認が「コードを読んで確からしい」止まりになるため）。

| 変数 | 用途 |
|---|---|
| `INDEXNOW_KEY` | 誤ったキーで 403 を再現（V10） |
| `INDEXNOW_ENDPOINT` | ダミーサーバーへ向けてエラー分岐を試す |
| `INDEXNOW_CHUNK_SIZE` | 分割境界を下げて試す（V6） |

⚠️ **差し替え口は「設定したのに効かない」が最も危険**。実際に検証中、`INDEXNOW_ENDPOINT` が
空文字になり**本番APIへ誤送信する事故が起きた**（§5）。定義されていて空なら即 exit 1 するガードは必須。
加えて、**実行時に使用中のエンドポイントを必ずログへ出す**こと（既定と違う値なら一目で分かるように）。

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
| **V9** | 実際に1回だけ手動送信。⚠️ **ローカル実行で行う**（`workflow_dispatch` は大会スキャンが走るため使わない）。対象は直近cronコミットの差分（16 URL程度） | **HTTP 200** |
| **V9b** | リネームを含むコミットで `--dry-run` | **リネーム先のURLが出る**（`ACMR` 化の確認） |
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
| リネームの通知漏れ | `--diff-filter=ACMR`（§2.2）。V9b で確認 |

### ⚠️ 実装検証中に本番APIへ誤送信した件（2026-07-29・記録）

開発担当が §2.3 のエラー分岐を検証中、ダミーサーバーの起動待ちに失敗して `INDEXNOW_ENDPOINT` が
**空文字**になり、`|| 本番URL` のフォールバックで **`api.indexnow.org` へ実際に7回POSTした**（16 URL）。

- **影響なし**と判断する。キーファイルが本番に存在しない状態（`/<key>.txt` が **404** であることは
  設計担当も実測済み）のため、応答は **403 UserForbiddedToAccessSite**。
  IndexNowはキー検証に通らない送信を破棄する。送信したURL自体も**実在する大会ページ**だった
- **対処済み**: `INDEXNOW_ENDPOINT` が定義されていて空なら即 exit 1 するガードを追加。
  検証ハーネスも「ダミーに実際に届いたリクエスト数を検査する」作りに変更
- ⚠️ **教訓**: 差し替え口を `||` でフォールバックさせると、**設定ミスが「本番へ送る」方向に倒れる**。
  フォールバックの落とし先は**安全側**（＝中止）にする

⚠️ **V9（本番への正規の送信）で 429 が返らないか注意する。** 上記の403が7回出ているため、
一時的なレート制限がかかっている可能性は否定できない（可能性は低いが、返り値を記録すること）。

⚠️ 本番配信物（キーファイル）とワークフローの変更なので、**pushはユーザーの明示的な指示を待つ**。

## 6. 関連

- [#28](https://github.com/dozyouneko/ga-card-tools-jp/issues/28) 親issue。**Bingは成功・Googleは失敗**の実測記録
- [#30](https://github.com/dozyouneko/ga-card-tools-jp/issues/30) cronのコミット範囲。ここから差分URLを取る
- [#29](https://github.com/dozyouneko/ga-card-tools-jp/issues/29) `continue-on-error` を付けた判断。**本件は逆**（§2.3）
- [#37](https://github.com/dozyouneko/ga-card-tools-jp/issues/37) トップの静的セットリンク（Google向けの対の施策）
