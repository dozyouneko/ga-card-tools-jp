# CLAUDE.md

Grand Archive TCG 日本語カードDB(非公式)— 静的サイト+翻訳ツールチェーン。
詳細は README.md を参照。

## セッションの役割分担

このリポジトリでは2つのClaude Codeセッションを役割分担して運用している:

- **VSCode拡張側セッション = 設計担当**: 要件整理・API調査・設計書作成・画面モック作成・レビュー反映。実装コードは書かない
- **ターミナル側セッション = 開発(実装)担当**: 設計書を参照してコードを実装し、Playwright実駆動で検証する

**受け渡しは `docs/design/` 配下の設計書(+モックHTML)のみ**。運用ルール:

- **対処内容(タスク)ごとにサブフォルダを切る**: `docs/design/<issue番号>-<タスク名>/`
  (例: `12-デッキ統計タブ/`・`16-フォーマット検索/`)。リリース時の確認資料は
  `リリース確認/` に日付プレフィックスつきで置く(例: `2026-07-18_スモークテスト_チェックリスト.md`)
- 設計書には改版履歴表を付け、実装済み項目と実装待ち項目を明記する
  (既存の `12-デッキ統計タブ/統計タブ_設計.md` 等の形式に倣う)
- 設計成果物はgitコミットする。`tmp/` はgitignoreのため設計成果物を置かない
- `docs/` 配下は本番配信対象外(`functions/docs/[[path]].js` が404を返す)

## タスク管理(2026-07-18〜)

- **タスクはGitHub Issuesで管理する**(起票・確認は `gh` CLI: `gh issue create` / `gh issue list`)
- 設計フォルダ名の `<issue番号>` はGitHubの自動採番(#1〜)を使う
- 旧独自番号(#11〜#17、tmp/デッキ構築ツールモックメモ.mdの台帳)は**別系列**。
  過去のコミット・設計フォルダ(12-/16-)の番号は旧系列のまま変更しない
- 完了時は `gh issue close <n>`、またはコミットメッセージの `closes #<n>` で自動クローズ
- **状態ラベル**(各issueに1つ付ける): `着手可` / `検討中` / `保留`(理由を本文に) / `凍結中`(解除条件を本文に)。
  規模の目安として `小タスク` / `大規模` を併用。バグは既定の `bug`、機能追加は `enhancement`
- ⚠️ `gh` の認証(~/.config/gh/)は**コンテナ再構築で消える**→ 再構築後は
  `sudo apt-get install gh`(aptソース設定含む詳細は履歴参照)+ ユーザーが `gh auth login` を再実行

### 実装・検証の結果はissueに追記する(2026-07-19〜)

開発担当セッションが実装・検証を行ったら、**対象issueにコメントで結果を追記する**
(`gh issue comment <n> --body-file <file>`)。設計書が「設計→実装」の受け渡し媒体であるのに対し、
issueコメントが「実装→設計」の報告経路になる(2セッションはコンテキストを共有しないため)。

記載する項目:

1. 実施内容(ステップ・コミットハッシュ・pushの有無)
2. 検証結果 — **設計書の「検証項目」の番号に対応づけた表**にする
3. 実行できなかった検証と代替手段、**残っている確認**(例: Playwright未導入時の代替)
4. 差分が設計書の想定と食い違った場合はその内訳と、意図内と判断した根拠
5. 設計書からの逸脱と根拠(既存表記・TRANSLATION.md等との照合結果)
6. 設計担当への確認事項 — **判断が要る項目は実装側で決めず、issueに書いて判断を待つ**
   (そこから派生するissueの起票も設計担当の判断を待つ)

実例: issue #1 のコメント(2026-07-19)

### セッション間ハンドオフ(2026-07-19〜)

セッション間の指示はissueで受け渡す。**各セッションは開始時(および「issueを確認して対応して」と言われたら)、自分の役割のラベルが付いたissueを確認して対応する**:

- **開発担当**: `gh issue list --label 実装待ち` → 設計書+issue最新コメントの指示に沿って実装・検証
  → 報告コメント追記 → ラベルを `実装待ち`→`レビュー待ち` に付け替え
  (`gh issue edit <n> --remove-label 実装待ち --add-label レビュー待ち`)
- **設計担当**: `gh issue list --label レビュー待ち` → 設計適合レビュー・確認事項への回答
  → 承認なら完了処理(クローズはpush時の `closes #<n>` でも可)、追加作業ありなら指示コメント+`実装待ち` に戻す
- 設計完了時は設計担当が `実装待ち` を付ける。ハンドオフラベルは状態ラベルとは別軸(併用する)

## git運用(2026-07-22〜・両セッション共通)

- **commitはユーザーの指示なしで実施してよい**(むしろ積極的に行う)。
  未コミットの変更を溜めると、コンテナの再構築・障害時に**作業を丸ごと失う**ため。
  区切りのよいところでこまめにコミットする
- ⚠️ **`git add -A` / `git commit -a` は使わない。自分の担当パスを明示してステージする**
  (設計担当は `docs/` と `CLAUDE.md`、開発担当は `scripts/` と生成物)。
  2セッションが**同じ作業ツリーを共有している**ため、相手が編集中のファイルを巻き込む。
  コミット前に `git status --short` で自分が触っていないパスの変更が無いか確認する
  (実例: #18 で設計担当が `2e26da09` に開発担当の未コミット変更を巻き込んだ)
- **pushはユーザーの明示的な指示があるまで実行しない**。
  mainへのpushはCloudflare Pagesの自動デプロイを通じて**そのまま本番公開になる**ため、
  公開の可否はユーザーが判断する。`gh` でのissue操作(コメント・ラベル・クローズ)は
  この制限の対象外(公開サイトに影響しないため)
- 例外: GitHub Actions `build-tournaments.yml` による日次の自動commit・pushは
  ユーザー合意済みの運用のため対象外

## 開発コマンド

- `npm run dev` — 静的プレビュー(scripts/serve.mjs、ポート3000)
- `npm run pages:dev` — Cloudflare Pages Functions込みのローカル実行(wrangler、ポート8788)
- `npm run validate` — データ検証
- `npm run build:cards` — カード個別ページ・セット別ページ・`sitemap.xml` を生成
- `npm run build:tournaments` — 大会デッキ(#14)のスキャン+ページ生成。
  sitemapへ反映するには **`build:tournaments` → `build:cards` の順**に実行する
  - `node scripts/build-tournament-pages.mjs --no-scan` で**APIを叩かず既存データからページのみ再生成**できる
    (`--limit N` でスキャン件数の制限も可)。ページ生成ロジックを変えたときはこちらを使う
    - ⚠️ `--no-scan` でも `data/tournaments/index.json` の `updatedAt` は**毎回**現在時刻に書き換わる
      (`scan`・`events` は不変)。**このタイムスタンプだけの差分はコミットに含めない**
      (`git checkout -- data/tournaments/index.json` で戻す)。日次cronの自動コミットと混ざるため
  - `node scripts/build-tournament-pages.mjs --refresh` で**収録済みの全大会を取り直す**
    (`events/<id>.json` を上書き)。保存項目を増やしたときに使う。既知idだけを引き直すため
    全id再スキャン(約12,000リクエスト)より軽い
  - **`build()` は `tournaments/` を事前削除しない**。ページ構成を変えた場合は
    `rm -rf tournaments/` してから実行しないと旧構成のファイルが残留する
  - 順位表の属性玉(#15)は `scripts/lib/element-orbs.json`(コミット済み)を読むだけ。
    生成スクリプトは**どちらも手動実行専用**で、日次cronのビルドから呼んではいけない:
    - `node scripts/gen-element-orbs.mjs` — 公式カード画像を取得して32px WebPに切り出し
      `scripts/lib/element-orbs.json` を出力(**ネットワーク+sharp が必要**)
    - `node scripts/gen-element-orbs-css.mjs` — 上記JSONから `shared/css/element-orbs.css`
      を出力(#19のカード検索がブラウザから使う。**JSONを読むだけでオフライン実行できる**)
    - ⚠️ **新しい属性が増えたときは2つとも実行し、出力(JSON・CSS)を両方コミットする**
  - GitHub Actions `build-tournaments.yml` の日次cronが **毎日 03:00 JST に稼働中**(2026-07-22〜)。
    新規大会がなくても `data/tournaments/index.json` の `scan.maxId`(次回スキャン位置)が
    毎日進むため、**1日1件の自動コミットが発生するのは正常**(差分2行)
- `npm run db:migrate:local` — D1ローカルDBのマイグレーション

## 環境の注意

- devcontainer(node:20-bookworm)で動作。メモリー(`/home/node/.claude/`)は
  コンテナ再構築で消えるため、恒久的な運用ルールは本ファイルに書く
- CSPが `style-src 'self'` のためHTMLのstyle属性は使えない。動的スタイルは
  `data-*` 属性+CSSOM適用で行う(既存の.meter・統計タブの棒グラフと同方式)
- **NortonのHTTPS検査があるためヘッドレスブラウザは証明書エラーになる**
  (api.gatcg.com へのfetchが「Failed to fetch」で空画面になる)。Playwrightは
  `launch({ args: ["--ignore-certificate-errors"] })` + context `ignoreHTTPSErrors: true` で回避
- Playwrightの導入: Chromium本体は `~/.cache/ms-playwright` にキャッシュ済み(再構築でも残る)。
  JSパッケージは作業ディレクトリで `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm i playwright@1.61.1`
- 宣伝画像などの生成に使う `python3-pil`・`fonts-noto-cjk` はaptパッケージのため**コンテナ再構築で消える**
  (`sudo apt-get install -y python3-pil fonts-noto-cjk` で再導入)
- **Cloudflare Pagesは `/foo.html` を `/foo` へ308リダイレクトする**(拡張子トリム)。
  `_headers` のパスに `.html` だけを書くと、**ヘッダはリダイレクト応答にしか付かず本文には効かない**。
  拡張子あり・なしの**両方を登録する**こと(実例: `_headers` の `decks.html` / `decks`)。
  この挙動は `npm run dev` では再現しないため、**リリース後に `curl -sI` で実物を確認する**
  (`_headers` 自体もローカルサーバーは解釈しない)
