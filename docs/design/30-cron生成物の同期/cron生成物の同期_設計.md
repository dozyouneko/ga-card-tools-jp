# issue#30 + #29: 日次cronの生成物同期(sitemap乖離の解消 / メタ索引の鮮度) 設計書

GitHub issue: [#30](https://github.com/dozyouneko/ga-card-tools-jp/issues/30)(sitemapが存在しないページを指す)/
[#29](https://github.com/dozyouneko/ga-card-tools-jp/issues/29)(メタ索引が禁止改定・再録で腐る)

## 改版履歴

| 日付 | 版 | 内容 |
|---|---|---|
| 2026-07-27 | **設計適合レビュー承認** | 変更7の実装(`5b8d175b`)を確認し、**変更1〜7すべて承認**。`throw` が `writeFileSync` 2本より手前にあり空応答時は `tmp/` キャッシュもフォールバックも触らないこと、`data/featured-sets.json` が `241bb48b` から差分ゼロであること、コミットが1ファイルのみで生成物への混入が無いこと、`npm run validate` exit 0 を確認。**開発担当の指摘により初版レビューの記述を訂正**: 「配列以外は後段の `for (const g of featured)` が例外で落ちてjob失敗になる」は**ガード導入前のコードの話**で、導入後は当てはまらない(ガードが手前で捕まえフォールバックへ落ちる)。`Array.isArray` は**外さない**方針を確定(job失敗にすると後段のコミットに到達せず**その日の大会データごと失われる**ため。索引ステップに `continue-on-error` を付けた判断と同じ理屈)。**残存ギャップを受容**(下記)。残るのはユーザーの公開判断と検証8〜10 |
| 2026-07-27 | 再レビュー | 指摘2件の修正(`241bb48b`)を検算し**変更5・変更6を承認**。設計担当が独立に確認: 索引の try/catch はループ内側で `exit 1` 経路が消滅、`data/card-meta-index.json` は `497c92dc` から**差分ゼロ**(検証11の一時改変の残留なし)、**コミット済みの `data/featured-sets.json` は公式APIの現物と一致**(`curl` で取得した HTTP 200・8,442バイトと 9グループ・同じ整形でバイト一致)、`npm run validate` exit 0。⚠️ **初版レビューの「57ファイル」は誤り**で、**ロゴを持つセットは35件のみ**のため劣化するのは**36ファイル**(開発担当の実測が正しい。設計担当も `data/featured-sets.json` から検算し一致)。**同種の穴が1つ残っていたため変更7を追加**(HTTP 200 で空応答が返ると catch を通らず、劣化publish+フォールバック破壊が起きる) |
| 2026-07-27 | 実装レビュー | 開発担当の実装(`497c92dc`)を設計適合レビューし**条件付き承認**。設計担当が**報告値を使わず独立に検算**: 索引は旧版とトークンIDを実文字列に復号して比較し **13,572集合すべて一致(不一致0)**・slug 2262→2262・辞書 233→233(重複なし)・ID範囲外参照0・未ソート配列0(**並びのみ2,521集合で変化**)、sitemap突合はカード2240/2240・大会441/441で**乖離0**、`npm run validate` exit 0、コミット範囲は3ファイルで `CLAUDE.md`・`docs/` の混入なし。**R1(初回差分)は0件**で、CI同等条件(スナップショット退避+API再取得)でも0件だった。⚠️ **初版が見落としていた失敗モードを2件検出し、変更5・変更6として追加**(いずれも「静かに壊れる」経路): (1) 索引の個別取得が1件でも恒久失敗すると `continue-on-error` によりjobは緑のまま**索引が永久凍結**する、(2) `/featured-sets` の取得失敗時の fail-open が、案A適用後は**劣化した57ファイルの自動publish**になる。**pushは2件の修正後にまとめて行う** |
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

### 変更5(実装レビューで追加・#29): 索引の個別取得を**slug単位で fail-open** にする

[gen-card-meta-index.mjs:85-89](../../../scripts/gen-card-meta-index.mjs#L85) のスナップショット未収録slug(現在22件)の
個別取得は **try/catch が無く、1件でも落ちるとスクリプト全体が `exit 1`** する。
変更3の `continue-on-error: true` と組み合わさると、この失敗は次のように**完全に無音**になる:

1. **jobは緑のまま**(`continue-on-error` はstep失敗をjob失敗にしない)
2. `data/card-meta-index.json` は更新されず、`git add` に差分が出ないのでコミットも通常どおり進む
3. → **索引だけが更新されなくなったことに誰も気づかない**

一過性の失敗なら翌日回復するが、**恒久的な失敗は永久に回復しない**。恒久化する経路は実在する:

- `data/tl/*.js` に**slugの綴りミス**が入る(翻訳追記時の typo)
- 公式が**カードのslugを変更・削除**する

⚠️ **`npm run validate` はオフラインの構造検査だけで、slugの実在を検証しない**(確認済み)ため、
この経路は他のどの検査にも掛からない。**#29 が解こうとしている「索引が黙って腐る」問題を、別の入口から再導入している。**

**変更内容**: 個別取得のループを **slug単位の try/catch にし、失敗したslugはスキップ+ログ出力で続行**する
(スクリプトは `exit 0` で完走)。索引から漏れたslugは消費側が **fail-open** するため安全
([card-search.js:396](../../../shared/js/card-search.js#L396) の `if (!entry) return true;`)。

これで `continue-on-error` は「**APIの全面障害だけを受け止める最後の網**」という本来の役回りに戻る
(全面障害は先行の `build-card-pages.mjs` が `continue-on-error` なしで落ちるため、**大きな音を立てて**job失敗になる)。

### 変更6(実装レビューで追加・#30): `/featured-sets` 取得失敗時に**劣化ページを自動publishしない**

[build-card-pages.mjs:34-48](../../../scripts/build-card-pages.mjs#L34) の `loadFeaturedSets()` は
**取得失敗をcatchして `[]` を返し続行**する(fail-open)。CIでは `tmp/` が空なので**毎回このfetchが走る**。
`[]` になったときの出力:

| 影響 | 実体 |
|---|---|
| **セットページ56枚** | ロゴ `<img>` が消え、`og:image` が `/ogp.png` にフォールバック([build-card-pages.mjs:397,404](../../../scripts/build-card-pages.mjs#L397)) |
| **`cards/index.html`** | 全56セットが「その他（プロモ・デモ・イベントパック等）」1グループに潰れる([build-card-pages.mjs:661-670](../../../scripts/build-card-pages.mjs#L661)) |

**#30適用前はこの生成物を捨てていたため無害だった。案A適用後は、この劣化した57ファイルがそのままコミット・pushされ本番公開される**
(jobは緑・誰もレビューしない)。翌日のcronで自動修復されるが、**最大24時間その状態**になり、履歴にも無意味な往復差分が残る。

**変更内容**: 取得成功時のキャッシュを**リポジトリ管理下**(`data/featured-sets.json`)へ移し、
**取得失敗時は `[]` ではなくそのコミット済みコピーへフォールバック**する。
毎回取り直す挙動(新エキスパンショングループの自動反映)は維持され、失敗時だけ「前回の正しい内容」で生成されるため
**劣化publishが起きない**。両方無い場合のみ現状どおり `[]` で続行する。

⚠️ `data/featured-sets.json` の新規コミットを伴う(公式APIの応答そのもの・小さいJSON)。
`git add` の対象にも追加すること。

**実測(2026-07-27)**: 劣化するのは **36ファイル**(ロゴを持つ35セットページ + `cards/index.html`)。
初版レビューの「57ファイル」は「全56セット+索引」の机上計算による誤りで、
`data/featured-sets.json` は **9グループ・セット合計35・全35にロゴあり**(残り21セットは元から
「その他」グループでロゴ無しのため出力が変わらない)。

### 変更7(再レビューで追加・#30): **空応答を失敗として扱う**

変更6を入れても、**HTTP 200 で `[]` が返るケースは catch を通らない**ため同じ穴に落ちる
(上流のデータ移行・部分障害でよくある形):

1. `groups` が `[]` → **変更6で直したはずの劣化publishがそのまま起きる**(36ファイル)
2. さらに **`data/featured-sets.json` が `[]` で上書きされ、フォールバック自体が壊れる**

**変更内容**: `try` の中で空応答を失敗として扱う。

```js
const groups = await fetchJson(`${API}/featured-sets`);
if (!Array.isArray(groups) || !groups.length) throw new Error(`空応答(${JSON.stringify(groups).slice(0, 40)})`);
```

これで空応答は既存のcatchに落ち、**コミット済みコピーで生成が続き、フォールバックも上書きされない**。
**この1行で「静かに劣化する」経路はすべて塞がる。**

⚠️ **初版の記述を訂正**(開発担当の指摘・2026-07-27): ここに「配列以外(オブジェクト等)が返るケースは後段の
`for (const g of featured)` が例外で落ちて**job失敗になる**」と書いたが、**それはガード導入前のコードの話**で、
`!Array.isArray(groups)` を含むガードを入れた後は**手前で捕まえてフォールバックへ落ちる**ため当てはまらない。

**`Array.isArray` は外さない**(= 配列以外もフォールバックに落とす)方針を確定した。理由:

1. **job失敗のコストが非対称** — ここで落とすと後段のコミットステップに到達せず、**その日の大会データの取り込みごと失われる**。
   索引ステップに `continue-on-error` を付けた判断(変更3)とまったく同じ理屈で、featured-sets だけ「落ちて気づく」側に振るのは一貫しない
2. **フォールバックが効く限り出力は正しい** — スキーマが変わっても最後に成功した内容で正常なページが生成される
3. 失敗は stderr に残り、cronのログで追える

### 受容する残存ギャップ(対応不要・記録用)

`/featured-sets` が**恒久的に**失敗した場合(404化・スキーマ変更)、出力は正しいまま**フォールバックの内容で凍結**する。
実害が出るのは**新エキスパンションが出たとき**で、新しい prefix はフォールバックに無いため `rest` に落ち、
`cards/index.html` の**「その他」グループにロゴ無しで並ぶ**。

これは恒久的なfetch失敗でも同じことが起きるため、**フォールバック設計を採用した時点で受け入れた性質**。
実害は体裁のみで、新セットの日には目に入りやすいため**別issueは立てない**。

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
| **11** | **索引のslug単位 fail-open(変更5)** | `data/tl/` に**存在しないslug**を1件だけ足した状態で `node scripts/gen-card-meta-index.mjs` を実行(検証後は戻す) | **exit 0 で完走**。当該slugがスキップされたログが出て、他のslugは通常どおり索引に入る |
| **12** | **featured-sets のフォールバック(変更6)** | `data/featured-sets.json` がコミット済みの状態で、`/featured-sets` が失敗する状況を再現(URLを不正値に一時変更など)して `npm run build:cards` | セットページのロゴ・`cards/index.html` のグループ分けが**通常時と同一**(`git status --short cards sets` が0行) |
| **13** | **空応答の扱い(変更7)** | 検証12のラッパーの戻り値を `[]` にして `npm run build:cards` | 生成物が正常時と同一(`git status --short cards sets` が0行)かつ **`data/featured-sets.json` が上書きされていない** |

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

- **開発担当**: 変更1〜3、変更4のうち `gen-card-meta-index.mjs` 冒頭コメント(**`497c92dc` で完了**)。**変更5・変更6は `241bb48b`、変更7は `5b8d175b` で完了(すべて承認済み)**。検証項目1〜7・11〜13(**完了**)。**残: ユーザーの公開判断 → push → 検証8〜10**
- **設計担当**: 変更4のうち `CLAUDE.md`(実装が本番に載ってから。pushはユーザー指示待ち)

## 関連

- [#28](https://github.com/dozyouneko/ga-card-tools-jp/issues/28) インデックス0件。sitemapの品質はここに直結する
- [#27](https://github.com/dozyouneko/ga-card-tools-jp/issues/27) メタ索引の導入元。「保証の範囲」に索引が腐るケースの記録がある
