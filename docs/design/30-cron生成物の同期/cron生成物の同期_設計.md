# issue#30 + #29: 日次cronの生成物同期(sitemap乖離の解消 / メタ索引の鮮度) 設計書

GitHub issue: [#30](https://github.com/dozyouneko/ga-card-tools-jp/issues/30)(sitemapが存在しないページを指す)/
[#29](https://github.com/dozyouneko/ga-card-tools-jp/issues/29)(メタ索引が禁止改定・再録で腐る)

## 改版履歴

| 日付 | 版 | 内容 |
|---|---|---|
| 2026-07-27 | 初版 | [build-tournaments.yml](../../../.github/workflows/build-tournaments.yml)・[build-card-pages.mjs](../../../scripts/build-card-pages.mjs)・[gen-card-meta-index.mjs](../../../scripts/gen-card-meta-index.mjs)・[cards-snapshot.mjs](../../../scripts/lib/cards-snapshot.mjs)・[card-search.js](../../../shared/js/card-search.js) を精読して設計。**ユーザー判断(2026-07-27)で #30 は案A(cronで `cards`/`sets` もコミット)を採用**し、#29(索引をcronに載せる)を同じ設計書で扱うことも決定。2件は「cronの `git add` 対象と生成物の決定性」という同一の問題のため統合 |

## 目的

日次cron([build-tournaments.yml](../../../.github/workflows/build-tournaments.yml)・毎日03:00 JST)が
**生成した成果物の一部だけをコミットしている**ことで起きる2つの腐りを、まとめて構造的に解消する。

| issue | 腐るもの | 顕在化する条件 | 症状 |
|---|---|---|---|
| **#30** | `sitemap.xml` と `cards/`・`sets/` の乖離 | **公式に新セットが追加された日** | sitemapが**存在しないカードページを指す**(404)。[#28](https://github.com/dozyouneko/ga-card-tools-jp/issues/28)(インデックス0件)の最中に自らクロール品質を落とす |
| **#29** | `data/card-meta-index.json` の `bannedFormats`・`setPrefixes` | **禁止改定・再録があった日** | 日本語効果検索×フォーマット/エキスパンション絞り込みで、**該当カードが黙って候補から落ちる** |

どちらも**人間が再生成を思い出す前提**の運用になっており、忘れても気づけない(#30 はそもそも人間の操作を挟まずcronが先にpushする)。

## 現状の実測(2026-07-27・設計担当が確認)

### #30: 生成物の取り扱い

日次cronは `build-card-pages.mjs` を毎日実行して**カード2,240ページ・セット56ページ・`cards/index.html`・
`cards/cards.css`・`cards/cards.js`・`sitemap.xml`** を生成するが、
コミットするのは [build-tournaments.yml:44](../../../.github/workflows/build-tournaments.yml#L44) のとおり:

```yaml
git add data/tournaments tournaments sitemap.xml
```

| 生成物 | コミットされるか |
|---|---|
| `sitemap.xml` | ✅ される(pushされ本番公開) |
| `cards/<slug>/index.html`(2,240枚) | ❌ 生成して**捨てている** |
| `sets/<set>/index.html`(56枚) | ❌ 同じく捨てている |
| `cards/index.html`・`cards.css`・`cards.js` | ❌ 同じく捨てている |

`buildSitemap()` は**その場で取り直したカードスナップショットを直接列挙**する
([build-card-pages.mjs:626](../../../scripts/build-card-pages.mjs#L626))。CIでは `tmp/` がgit管理外のため
**毎回最新のカードデータをAPIから取得**する。
→ **新セットが出た瞬間、sitemapだけが新カードのURLを載せ、対応するページはリポジトリに存在しない。**

**現時点の乖離は0件**(まだ顕在化していない):

| 項目 | 件数 |
|---|---|
| sitemap内のカードURL / リポジトリのカードページ | 2,240 / 2,240 |
| sitemap内のセットURL / リポジトリのセットページ | 56 / 56 |
| **sitemapにあるがページが無い(404になる)** | **0** |
| ページはあるがsitemapに無い | 0 |

### #29: 索引の非決定性

[gen-card-meta-index.mjs:106](../../../scripts/gen-card-meta-index.mjs#L106) が**実行時刻を出力に含む**:

```js
const json = JSON.stringify({ generated_at: new Date().toISOString(), d, m });
```

このままcronに載せると**中身が変わらない日も必ず差分が出て**、毎日無意味な自動コミットが発生する。

**読み手は `generated_at` を使っていない**(確認済み):
[card-search.js:386-388](../../../shared/js/card-search.js#L386) の妥当性判定は `Array.isArray(j.d) && j.m` のみで、
`metaMatches()`([card-search.js:394-417](../../../shared/js/card-search.js#L394))も `d` / `m` しか読まない。
→ **削除して差し支えない。**

なお [gen-tl-json.mjs:10](../../../scripts/gen-tl-json.mjs#L10) には既に
「決定的な出力にするため `generated_at` のようなタイムスタンプは入れない(#29 の轍を踏まない)」と書かれており、
本設計はその方針に索引側を揃えるものになる。

## 決定事項(ユーザー判断・2026-07-27)

| 論点 | 決定 |
|---|---|
| cronがレビューなしで本番公開してよい範囲 | **カードページ・セットページも含める**(#30 案A) |
| #29(索引をcronに載せる) | **同じ設計書・同じハンドオフで扱う** |

⚠️ これは「**新セット追加日に数百ファイルがレビューなしで自動publishされる**」ことを承認した判断である。
日次cronは既に大会ページで同規模の自動push(`f64d0308` は19ファイル・9,357行)を行っており、運用として一貫する。

## 変更内容

### 変更1(#30): cronの `git add` に `cards` `sets` を追加する

[build-tournaments.yml:44](../../../.github/workflows/build-tournaments.yml#L44):

```yaml
git add data/tournaments tournaments sitemap.xml cards sets data/card-meta-index.json
```

あわせて [同36行目](../../../.github/workflows/build-tournaments.yml#L36) のコメント
「`cards/`・`sets/` の再生成物は下の `git add` 対象外なので、コミットには含めない。」は**事実と逆になる**ため書き換える。
ステップ名 `sitemap.xml を再生成` も実態(カード・セットページも含む)に合わせる。

**この変更で成立すること**:

- sitemapと実ページが**常に同じスナップショットから生成された同一世代**になる → 404を指し得ない
- 新カードのページとsitemapエントリが**24時間以内に自動で用意される**(#28 にとってプラス)
- 翻訳を追記して `data/tl/*.js` をpushしたあと、**カード個別ページへの埋め込み反映もcronが追いつく**
  (現状は手動で `npm run build:cards` するまで反映されない)

### 変更2(#29): `gen-card-meta-index.mjs` の出力を決定的にする

1. **`generated_at` を削除する**([gen-card-meta-index.mjs:106](../../../scripts/gen-card-meta-index.mjs#L106))。
   出力形式のコメント([同16行目](../../../scripts/gen-card-meta-index.mjs#L16))も `{ d, m }` に直す
2. **`metaOf()` が返す6配列をソートする**([gen-card-meta-index.mjs:99-105](../../../scripts/gen-card-meta-index.mjs#L99))。
   公式APIが `classes` / `elements` / `editions` 等を返す順序は保証がなく、順序が変わるだけで
   **辞書のトークンID採番がずれて全ファイル差分**になる。読み手は `includes()` による集合判定
   ([card-search.js:403-415](../../../shared/js/card-search.js#L403))なので**順序は意味を持たず、ソートしても挙動は変わらない**
   - ⚠️ 導入時に**一度だけ**索引全体の差分が出る(意味は不変)。これは想定内

### 変更3(#29): cronに索引生成ステップを追加する

`build-card-pages.mjs` の**後ろ**に置く。理由は [cards-snapshot.mjs:56-60](../../../scripts/lib/cards-snapshot.mjs#L56) の
`loadCards()` が `tmp/api-cache/cards-snapshot.json` があれば再利用するため、
**先行ステップが取得済みのスナップショットに相乗りできる**から(追加コストはスナップショット未収録の
フリップ面22件の個別取得=**22リクエスト/日**のみ)。

```yaml
      # 日本語検索の取得前フィルタ用メタ索引(#29)。禁止改定・再録で索引が腐ると
      # 該当カードが黙って候補から落ちるため、日次で鮮度を回復させる。
      # 先行ステップが取得済みのスナップショット(tmp/)に相乗りするので追加は22リクエストのみ。
      # ⚠️ 失敗しても大会データの取り込みを止めないこと（下の commit ステップまで到達させる）。
      - name: 日本語検索メタ索引を再生成
        run: node scripts/gen-card-meta-index.mjs
        continue-on-error: true
```

⚠️ **`continue-on-error: true` は必須**。この生成は22件の個別APIリクエストを伴い、
1件でも落ちるとスクリプトは `exit 1` する([gen-card-meta-index.mjs:110](../../../scripts/gen-card-meta-index.mjs#L110))。
これをそのままjob失敗にすると、**その日の大会データの取り込みごと巻き添えで失われる**
(コミットステップが後段にあるため)。失敗した日は索引が更新されないだけで、
`git add` に差分が出ず**大会データのコミットはそのまま進む**。索引は翌日のcronで回復する。

### 変更4: 「手動実行専用」の記述を実態に合わせる

cronから呼ぶことになるため、次の2箇所が事実と食い違う:

| 箇所 | 現状の記述 | 変更後 |
|---|---|---|
| [gen-card-meta-index.mjs:11-13](../../../scripts/gen-card-meta-index.mjs#L11) | 「⚠ このスクリプトは手動実行専用。gen-element-orbs.mjs と同じ扱いで、日次cronから呼んではいけない」 | **日次cronが毎日実行する**旨に書き換え。手動実行は「訳を追記した直後に即反映したいとき」の任意手段として残す |
| `CLAUDE.md` の `gen-card-meta-index.mjs` の項 | 「**手動実行専用**で、`gen-element-orbs.mjs` と同じく日次cronから呼ばない」+「再生成が必要なタイミングは3つ」 | 「日次cronが自動再生成する」に変更し、**手動再生成が要るのは「訳を追記して即日反映したいとき」だけ**に縮小。`gen-element-orbs.mjs` の手動専用は**据え置き**(ネットワーク+sharpが必要なため) |

⚠️ **`CLAUDE.md` は設計担当の担当パス**なので**開発担当は編集しない**。実装が本番に載ったのを確認してから設計担当が更新する
(ルート直下のファイルは本番配信されるため、**pushはユーザーの指示待ち**)。
`gen-card-meta-index.mjs` 冒頭コメントの修正は**実装と同じコミットで開発担当が行う**。

## 決定性の根拠(実測・2026-07-27)

案Aが「毎日ノイズコミットを生む」ことにならない根拠:

| 対象 | 確認 | 結果 |
|---|---|---|
| `build-card-pages.mjs` 本体 | `new Date` / `Date.now` / `toISOString` / `Math.random` の grep | **0件**(出力は決定的) |
| `scripts/lib/*.mjs` | 同上 | `cards-snapshot.mjs:45` の `fetched_at` のみ。**書き先は gitignore の `tmp/`** で生成物には出ない |
| `gen-card-meta-index.mjs` | 同上 | `generated_at` **あり** → 変更2で除去 |

→ カードデータが変わらない日は `cards`/`sets`/`sitemap.xml`/索引すべて**差分ゼロ**で、
既存の `git diff --cached --quiet` 判定によりコミット自体が起きない。

## リスクと対処

### R1: 初回実行で大量差分が出る可能性(**実装前に必ず実測する**)

`cards/` の最終ビルドは **2026-07-22(`4f5972b1`)**。それ以降 `build-card-pages.mjs` 本体は変更されていないが、
**依存する [scripts/lib/page-i18n.mjs](../../../scripts/lib/page-i18n.mjs) は 2026-07-26 の #22フェーズ2(`9e835e56`)で変更されている**。
翻訳の読み込み規則が変わったため、**カードページの出力が現在のコミット済み内容と一致しない可能性がある**。

一致しない状態でcronを有効化すると、**翌朝2,240ファイルの自動pushが起きる**(内容の妥当性は誰もレビューしていない)。

**対処**: 実装時に**先にローカルで `npm run build:cards` を実行して差分件数と内容を確認し、
その結果をコミットに含めてから** workflow を変更する(検証項目1)。
差分が想定外(例: 全ページが書き換わる)なら**先にissueへ報告し、設計担当の判断を待つ**。

### R2: テンプレート変更の取りこぼしが自動publishされる

生成ロジック(`build-card-pages.mjs`・`page-i18n.mjs` 等)を変更したのに生成物を再生成し忘れると、
**翌朝のcronがその変更を反映した全ページを自動でpushする**。
これは大会ページで既に成立している性質(CLAUDE.md の `--no-scan` の注意書きと同根)が、カードページにも広がるということ。

**対処**: 恒久策は取らない(コストに見合わない)。**CLAUDE.md にこの性質を1行追記**して認識を揃える(変更4に含める)。

### R3: 孤児ページが残る(**本設計の範囲外・記録用**)

`main()` は `cards/` `sets/` を**事前削除しない**([build-card-pages.mjs:672-687](../../../scripts/build-card-pages.mjs#L672))。
公式APIからカードが消えた場合、ディレクトリはディスク上に残り続けるため `git add cards` でも削除はステージされず、
**sitemapに載らない孤児ページ**として残る。

リンクもsitemapエントリも無いため実害は小さく(soft 404にはならず200で中身のあるページが返る)、
**現時点で該当0件**。本設計では扱わない。将来カードの削除が実際に起きたら別issueで検討する。

## 実装しない案(記録)

| 案 | 内容 | 不採用の理由 |
|---|---|---|
| **案B** | sitemapに「実際に存在するページ」だけ載せる(`existsSync` チェック) | 案Aで根本が直り、sitemapが404を指す経路が無くなる。案Bを併用すると**新カードがsitemapから黙って落ちる**方向の失敗が新たに生まれ、#28 と逆行する。**ユーザー判断で案A単独を採用**(2026-07-27) |
| **案C** | 乖離を検知してcronを失敗させる | 直すまで**大会の取り込みも止まる**(同一job)。副作用が大きい |
| **案D** | 何もせず新セット時に手動で `build:cards` | **新セット当日はcronのほうが先に走る**ため、人間が気づく前に404入りsitemapがpushされる |

## 検証項目

### ローカル(push前)

| # | 項目 | 手順 | 期待 |
|---|---|---|---|
| **1** | **初回差分の実測(R1)** | `npm run build:cards` → `git status --short cards sets \| wc -l` と、変更のある1ファイルの `git diff` | 件数と差分内容を**issueに報告**。0件なら想定どおり。**多数出た場合は内容の妥当性を確認し、想定外なら報告して判断待ち** |
| **2** | カードページ生成の決定性 | `npm run build:cards` を**2回連続**実行し、2回目のあとに `git status --short cards sets sitemap.xml` | 2回目は**差分ゼロ** |
| **3** | 索引の決定性(変更2) | `generated_at` 削除+ソート後に `node scripts/gen-card-meta-index.mjs` を2回実行し `data/card-meta-index.json` を比較 | **バイト一致** |
| **4** | 索引の内容不変性(変更2) | 変更前後の索引を読み、slug数と**各slugの6集合(classes/elements/types/subtypes/prefixes/banned)がソート順を無視して一致**することを検算 | **全slugで一致**(ソートは意味を変えない) |
| **5** | 索引の消費側が壊れないこと | `npm run dev` でトップとデッキ構築を開き、**日本語効果検索×エレメント絞り込み**(#27の再現ケース: 効果「ファンタジア」×WIND=10枚)を実行 | 10枚が1ページ目に出る(#27 の挙動を維持) |
| **6** | sitemapと実ページの一致 | `sitemap.xml` の `cards/`・`sets/` のURL集合と、`git ls-files 'cards/*/index.html' 'sets/*/index.html'` の集合を突合 | **両方向とも差分0** |
| **7** | `npm run validate` | そのまま実行 | exit 0 |

### CI(workflow_dispatch・push後)

| # | 項目 | 手順 | 期待 |
|---|---|---|---|
| **8** | cronの手動実行 | `gh workflow run build-tournaments.yml` → 実行ログとコミット内容を確認 | jobが成功。コミットに `cards`/`sets`/`data/card-meta-index.json` が**含まれ得る**状態になっている(変更が無ければコミット自体が起きないのが正常) |
| **9** | 索引ステップ失敗時の非ブロック(変更3) | 実際に落とすのは難しいため、**ログ上で `continue-on-error` が効く配置**(索引ステップがコミットステップより前・独立)であることをworkflow定義で確認 | 索引失敗でも後続のコミットステップに到達する構成になっている |
| **10** | 本番の実ページ | 新セット非追加時に `curl -sI` で sitemap 内のカードURLを数件 | **200**(sitemapが404を指していない) |

⚠️ **8〜10 は本番配信物に触れる**ため、pushはユーザーの公開判断を待つ。

## ロールバック手順

本変更は**自動publishの範囲を広げる**ため、想定外の自動pushが起きたときに戻せる状態にしておく。

| 事象 | 手順 |
|---|---|
| 想定外の内容が自動pushされた | 1. `git revert <cronの自動コミット>` で本番を戻す(Pagesが再デプロイ)<br>2. `build-tournaments.yml` の `git add` から `cards sets` を外して push(cronを元の範囲に戻す)<br>3. 原因を調べるまで cron の `schedule` を止めたい場合は `on.schedule` をコメントアウトして push |
| 索引の再生成が壊れた | `data/card-meta-index.json` を直前のコミットに戻す(`git checkout <sha> -- data/card-meta-index.json`)。索引は**無くても fail-open** で検索結果は正しいまま([card-search.js:543-547](../../../shared/js/card-search.js#L543))なので緊急度は低い |

⚠️ **開発担当は上記1・2を実際に別ワークツリーで試し、手順どおり戻ることを確認してから報告する**
(手順を書いただけで検証しないのは不可)。

## 担当

- **開発担当**: 変更1〜3、変更4のうち `gen-card-meta-index.mjs` 冒頭コメント。検証項目1〜7(+ユーザー承認後に8〜10)
- **設計担当**: 変更4のうち `CLAUDE.md`(実装が本番に載ってから。pushはユーザー指示待ち)

## 関連

- [#28](https://github.com/dozyouneko/ga-card-tools-jp/issues/28) インデックス0件。sitemapの品質はここに直結する
- [#27](https://github.com/dozyouneko/ga-card-tools-jp/issues/27) メタ索引の導入元。「保証の範囲」に索引が腐るケースの記録がある
