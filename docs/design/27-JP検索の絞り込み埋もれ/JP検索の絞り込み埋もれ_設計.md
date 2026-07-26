# issue#27: JP効果テキスト検索×絞り込みで該当カードが「もっと見る」に埋もれる 設計書

GitHub issue: [#27](https://github.com/dozyouneko/ga-card-tools-jp/issues/27)

## 改版履歴

| 日付 | 版 | 内容 |
|---|---|---|
| 2026-07-26 | 初版 | [card-search.js](../../../shared/js/card-search.js) の JPモード(`run`/`localJpSlugs`/`matchesActiveFilters`)と [card-cache.js](../../../shared/js/card-cache.js)・[cards-snapshot.mjs](../../../scripts/lib/cards-snapshot.mjs) を精読して設計。**issue記載の候補3案を実測で評価し、案1(取得前フィルタ)を採用**。あわせて実測で判明した2点を反映: **(a) トップページも同じ欠陥を持つ**(issueは「トップは正常」と記載していたが、WIND該当10枚のうち1ページ目に出るのは8枚)、**(b) 案2(絞り込み時に全件フェッチ)は最悪1,787リクエストで不成立**(issueの「該当42件程度なら許容範囲」は幸運なケースだった) |

## 目的

日本語の効果テキスト検索とエレメント等の絞り込みを併用したとき、**該当カードが1ページ目に出ず「検索結果なし」に見える**状態を解消する。あわせて**件数表示を実数にする**。

## 症状の実測(2026-07-26・確定)

`data/tl/*.js` の実データ(2,256エントリ)と APIスナップショット(2,240枚)で再現計算した結果:

**効果テキスト「ファンタジア」× エレメント WIND**

| | 該当(WIND生存) | 1ページ目に出る |
|---|---|---|
| 真の該当数 | **10枚** | — |
| デッキ構築 `jpPageSize: 24` | 10枚 | **2枚**(霧散・儚き風) |
| トップページ `jpPageSize: 40` | 10枚 | **8枚** |

- 「エッセンスの散布」(`scatter-essence`)は slug 昇順で **index 31** → 24件目までに入らず、デッキ構築では埋もれる
- ⚠️ **トップページも欠陥がある。** issueには「トップページでは1ページ目に表示される(実機確認済み)」とあるが、**それは10枚中8枚しか出ていない状態**。`scatter-essence` が index 31 で運良く40件に入っただけで、**残り2枚は「もっと見る」の先に埋もれている**。`jpPageSize` を上げるのは緩和にすぎず解決ではない
- 件数表示は絞り込み前の総数(42)を出すため、**実数10枚とズレる**(`total = jpSlugs.length` [card-search.js:482](../../../shared/js/card-search.js#L482))

## 原因(コード確定)

JPモードの `run()` は [card-search.js:476-483](../../../shared/js/card-search.js#L476) で **「列挙 → ページ分だけ取得 → 取得後に絞り込み」** の順に処理する:

```js
const from = (pager.page - 1) * JP_PAGE_SIZE;
const batch = jpSlugs.slice(from, from + JP_PAGE_SIZE);   // ← 絞り込み前の先頭N件
const fetched = await Promise.all(batch.map((s) => fetchCard(s)));
cards = fetched.filter((c) => c && matchesActiveFilters(c)); // ← 絞り込みは取得後
total = jpSlugs.length;                                     // ← 絞り込み前の総数
hasMore = from + JP_PAGE_SIZE < jpSlugs.length;
```

絞り込みが**取得後**なのは、`I18N.cards` のエントリが **`name` と `effect` の2フィールドしか持たない**ため
(実測: `data/tl/*.js` 全ファイルで `name:` 374件 / `effect:` 374件のみ、他フィールドなし)。
`matchesActiveFilters` が要求する `classes` / `elements` / `types` / `subtypes` / `editions[].set.prefix` / `legality`
([card-search.js:432-448](../../../shared/js/card-search.js#L432))は**APIから取得しないと分からない**。

## 案の比較(実測にもとづく)

### 案2(ページサイズ拡大 / 絞り込み時は全件フェッチ)→ **不成立**

issueは「該当42件程度ならAPIリクエスト増は許容範囲か」としていたが、**42件は最も少ない例**だった。
`data/tl` 実データでの効果テキスト検索ヒット数:

| 検索語 | ヒット | 検索語 | ヒット |
|---|---|---|---|
| ファンタジア | 42 | クラスボーナス | **812** |
| デッキの上 | 20 | アライ | **726** |
| アタック | 35 | コスト | **670** |
| ダメージ | 473 | メモリー | 566 |
| 引く | 424 | 追放 | 577 |

さらに機械的に最悪ケースを探すと、**「あなた」= 1,787枚 / 「カード」= 1,640枚 / 「する」= 1,597枚**。
部分一致検索なので**利用者はこういう語を普通に入れる**(「あなたのデッキ」を途中まで打った時点で1,787件)。

→ **1回の検索で最大1,787リクエスト**。公式APIへの負荷として容認できず、体感も破綻する。**却下**。
ページサイズ拡大(24→40等)も、上記のとおり**トップページ(40)で既に2枚埋もれている**ため解決にならない。

### 案3(件数表示の補正 + 絞り込み中は自動で追加ページを読む)→ **部分的**

件数の補正は必要だが、「自動で追加ページを読む」は**該当が末尾に偏るとき案2と同じリクエスト数に収束する**
(「あなた」でWIND絞り込み → 全1,787枚を読み切るまで止まらない)。単独では不成立。

### 案1(取得前フィルタ)→ **採用**

`I18N.cards` に持たせる代わりに、**slug→メタ情報の索引をビルド時に生成する**。
issueは「訳データに持たせるか索引を用意する。実装コスト大」としていたが、**索引の材料は既にある**:

- [scripts/lib/cards-snapshot.mjs](../../../scripts/lib/cards-snapshot.mjs) が**全カードスナップショット**を提供済み
  (`build-card-pages.mjs` / `build-tournament-pages.mjs` / `gen-element-orbs.mjs` が共用)
- 生成物をコミットして配信する手法も **[scripts/lib/element-orbs.json](../../../scripts/lib/element-orbs.json)(#15)で確立済み**

**索引サイズの実測**(スナップショット2,240枚・翻訳済み2,234枚で生成):

| 形式 | 生 | gzip |
|---|---|---|
| 素直なJSON(`slug → {classes, elements, types, subtypes, prefixes, banned}`) | 269.6 KB | 39.5 KB |
| **トークン辞書 + ID配列**(採用) | **125.2 KB** | **33.5 KB** |

- 辞書に載る一意トークンは **232個**だけ(クラス・エレメント・種別・サブタイプ・セットprefix・フォーマット名の総和)
- 参考: 既に読み込んでいる `data/tl/*.js` は合計 **1,163 KB**。索引は**遅延読み込み**(下記)なので**初期表示には 0 KB 上乗せ**
- → [#22](https://github.com/dozyouneko/ga-card-tools-jp/issues/22)(クロール予算)と**衝突しない**。日本語検索を実際に使ったときだけ33.5 KB(gzip)を取得する

## 対処内容

### 変更1: 索引生成スクリプト `scripts/gen-card-meta-index.mjs`(新規・手動実行専用)

出力: **`data/card-meta-index.json`**(コミットする)

```jsonc
{
  "generated_at": "2026-07-26T…",
  "d": ["TAMER", "WIND", "REGALIA", …],   // トークン辞書(232個)
  "m": {
    "scatter-essence": [[c…],[e…],[t…],[s…],[p…],[b…]]  // 各配列は d のindex
  }
}
```

- 配列の順序は **classes / elements / types / subtypes / setPrefixes / bannedFormats** で固定
- `bannedFormats` は [card-i18n.js:110](../../../shared/js/card-i18n.js#L110) と同じ判定(`legality[F].limit === 0`)をビルド時に評価して格納する
- `setPrefixes` は `(editions || result_editions)[].set.prefix` の重複除去
- 対象は**翻訳済みslug のみ**(JP検索の対象がそれだけ。全カード版にしても 269.6→270.2 KB でほぼ変わらないが、載せる意味がない)

**⚠️ スナップショットに無い翻訳済みslugが22件ある**(実測で判明)。`/cards/search` が返す2,240枚に含まれないカード:

```
byakko-white-tiger, genbu-black-tortoise, suzaku-vermillion-phoenix, seiryuu-azure-dragon,
huaji-of-abyssal-fall, lu-bu-wrath-incarnate, daunting-panda, … (計22件)
```

これらは**フリップ面のslug**で、`/cards/search` の一覧には出ないが `/cards/:slug` では引ける。
実測で**フリップ面のslugを引くと表面のカードが返る**ことを確認した:

```
GET /cards/byakko-white-tiger  →  slug = "fabled-emerald-fatestone"
                                  elements=["WIND"] types=["REGALIA","ITEM"] classes=["TAMER"]
```

→ **索引生成では、スナップショットに無い翻訳済みslugを個別に `/cards/:slug` で取得し、返ってきたカードのメタ情報を
その(フリップ面の)slugのキーに格納する**。追加リクエストは**22件**で済む。
これは**実行時の挙動と一致する**(実行時も `fetchCard(slug)` が表面のカードを返し、それに `matchesActiveFilters` を適用している)。

**実行タイミング: 手動のみ。** `gen-element-orbs.mjs` と同じ扱いで、**日次cronから呼んではいけない**。
理由: [build-tournaments.yml:38](../../../.github/workflows/build-tournaments.yml#L38) は日次で `build-card-pages.mjs` を実行しており、
そこに索引生成を混ぜると**毎日索引の差分が自動コミットされる**。索引が古くても**変更2のフォールバックで結果は正しいまま**なので、
鮮度を自動化する必要がない。CLAUDE.md の「開発コマンド」に**新カードを翻訳したら実行する**旨を追記する
(⚠️ CLAUDE.md はルート直下=本番配信物のため、**pushはユーザーの指示を待つ**)。

### 変更2: JPモードで絞り込みを取得前に適用([card-search.js](../../../shared/js/card-search.js))

`run()` の JP分岐を「列挙 → **索引で絞り込み** → ページ分だけ取得」に変える。

```js
if (jpSlugs) {
  const idx = await metaIndex();               // 初回だけ fetch。失敗時は null
  const cand = idx ? jpSlugs.filter((s) => metaMatches(idx, s)) : jpSlugs;
  const from = (pager.page - 1) * JP_PAGE_SIZE;
  const batch = cand.slice(from, from + JP_PAGE_SIZE);
  const fetched = await Promise.all(batch.map((s) => fetchCard(s)));
  if (mySeq !== seq) return;
  cards = fetched.filter((c) => c && matchesActiveFilters(c)); // ← 残す(下記)
  total = cand.length;
  hasMore = from + JP_PAGE_SIZE < cand.length;
}
```

- **`cand` は新規検索時(`reset`)に1回だけ作って保持する**。`jpSlugs` と同じ扱いにする
  (`loadMore` で作り直すと、その間に絞り込みUIが変わった場合にページ境界がずれる)
- **`matchesActiveFilters` による取得後フィルタは残す。** 索引はコミット済みの静的データなので
  **禁止改定(legality)などで古くなり得る**。索引は「候補を絞る」役、**取得したカードが最終判断**という二段構えにする。
  索引が古い場合の影響は「1ページの表示件数が不揃いになる」だけで、**誤った結果は出ない**
- `metaMatches` は `matchesMulti` と**同じAND/OR規則**で判定する。索引は生の列挙値を持つので、
  既存の `modeOf(els[key])`(AND/OR)・`vals(key)` をそのまま使える。フォーマットは `bannedFormats` の代わりに
  索引の `banned` 配列を見る。セットは索引の `prefixes` と `setPrefixes(val(els.set))` を突き合わせる

**フォールバック(重要・fail-open)**:

| 状況 | 挙動 |
|---|---|
| 索引の fetch 失敗 / JSON不正 | `cand = jpSlugs`(**現状の挙動に劣化するだけ**)。エラー表示はしない |
| slug が索引に無い(新規翻訳など) | **候補に残す**(除外しない)。取得後フィルタが判定する |
| 索引が古く実際は不一致 | 取得後フィルタが落とす。表示件数が不揃いになるのみ |

⚠️ **「索引に無いから除外」は絶対にしない。** それをやると、翻訳を追加して索引を再生成し忘れた瞬間に
**新カードが日本語検索から消える**(現状より悪化する)。

**索引の読み込み方**: `fetch("/data/card-meta-index.json")` を **JPモードに初めて入ったときだけ**実行し、
Promiseをモジュール内に保持して以降は再利用する(`card-cache.js` の `mem` と同じ方式)。

- `<script>` で先読みしない = **初期表示のJSを増やさない**([#22](https://github.com/dozyouneko/ga-card-tools-jp/issues/22) と非衝突)
- **パスは呼び出し側から渡す。** トップは `data/card-meta-index.json`、デッキ構築は
  `../../data/card-meta-index.json` になるため、`create(opts)` に **`metaIndexUrl` を追加**して
  [app.js:77](../../../app.js#L77) と [tools/deck-builder/app.js:1024](../../../tools/deck-builder/app.js#L1024) で指定する
  (ルート絶対パス `/data/…` でも動くが、既存コードが相対パスで統一されているため合わせる)
- **CSP変更は不要**。`_headers` の `/*` は `connect-src 'self' …`([_headers:29](../../../_headers#L29))で同一オリジンのfetchを許可済み(確認済み)
- キャッシュヘッダは既定(`max-age=0, must-revalidate`)のままでよい。索引が変わらなければ304で済む。
  `/shared/vendor/*` のような `immutable` は**使わない**(再生成のたびにファイル名を変える運用になり、#22の注意書きと同じ罠を持ち込む)

### 変更3: 件数表示を実数にする

- `total = cand.length` になるため、**JPモードの件数が正確になる**(「42件」→「10件」)
- `isApproxTotal(jp)` ([card-search.js:366-371](../../../shared/js/card-search.js#L366))の JP分岐を見直す。
  現状は「絞り込みが1つでもあれば概算」としているが、**索引が使えていて候補slugが全て索引に載っていれば正確**。
  → `run()` から `approxTotal` を渡せるようにする。判定:

  | 条件 | approxTotal |
  |---|---|
  | 索引が使えた かつ 候補に索引未収録slugが無い | **false**(正確) |
  | 索引が使えなかった / 未収録slugが混じる | **true**(現状の文言のまま) |

- ⚠️ AND指定(`anyAnd()`)がある場合も、**JPモードでは索引がANDを正しく評価できる**ため正確にできる
  (APIのAND非対応は非JPモードだけの制約)。ただし [app.js:143](../../../app.js#L143) の注記文言
  「AND条件などは取得済みのページに適用するため、総件数は表示できません」は**非JP用**なので、
  JPモードで `approxTotal` が立つときは**別文言にする**(例: 「一部のカードは取得後に判定するため総件数は概算です」)
- `updateSearchStatus`([app.js:119-146](../../../app.js#L119))の「このページには該当がありませんでした」分岐は**残す**
  (取得後フィルタが残るため、まれに0件ページが起こり得る)

### 変更4: `jpPageSize` は変えない

トップ40 / デッキ構築24 の差は**そのまま**にする。変更2で埋もれが構造的に解消されるため、
ページサイズは「1回に何枚並べるか」という表示上の判断に戻る(デッキ構築は横幅が狭いので24が妥当)。

## 影響範囲

| ファイル | 変更 |
|---|---|
| `scripts/gen-card-meta-index.mjs` | **新規**(手動実行専用) |
| `data/card-meta-index.json` | **新規・生成物**(コミット) |
| [shared/js/card-search.js](../../../shared/js/card-search.js) | JP分岐の順序変更・`metaIndex()`/`metaMatches()` 追加・`approxTotal` 算出 |
| [app.js](../../../app.js#L77) | `metaIndexUrl` 指定・JPモード時の注記文言 |
| [tools/deck-builder/app.js](../../../tools/deck-builder/app.js#L1024) | `metaIndexUrl` 指定 |
| `CLAUDE.md` | 索引の再生成タイミングを追記(**pushはユーザー判断**) |

**非JPモードには一切手を入れない**(APIのページングで正確なため)。

## 検証項目

### ローカル実機(push前・Playwright)

| # | 内容 | 期待 |
|---|---|---|
| 1 | トップ: 効果「ファンタジア」+ WIND | **10枚**表示・「10 件を表示」・「もっと見る」非表示 |
| 2 | 1 の結果に「エッセンスの散布」が含まれる | 含まれる |
| 3 | デッキ構築: 効果「ファンタジア」+ WIND | **10枚**表示(24件未満なので1ページで完結) |
| 4 | 効果「あなた」+ WIND(最悪ケース) | 1ページ分だけ取得(**APIリクエストが `jpPageSize` 件を超えない**ことをNetworkで確認) |
| 5 | 4 の件数表示 | WIND該当の実数(概算注記なし) |
| 6 | 効果「あなた」のみ(絞り込みなし) | 現状と同じ件数・**リクエスト数も現状と同じ** |
| 7 | 名前欄の日本語検索(例「霧散」) | 現状どおり動作(name一致経路の回帰なし) |
| 8 | 名前+効果の両方に日本語(AND) | 現状どおり |
| 9 | エレメントAND(EXALTED+WIND)×日本語効果 | 索引がANDを正しく評価・件数が正確 |
| 10 | サブタイプ/クラス/種別/エキスパンション/フォーマットの各絞り込み×日本語効果 | いずれも取得前に効く |
| 11 | フリップ面カードが該当する検索 | 索引に載っているので通常どおり絞り込まれる(22件のいずれかを含む語で確認) |
| 12 | **索引を404にして**同じ検索 | 現状の挙動に劣化して**動く**(エラー表示なし・概算注記が出る) |
| 13 | **索引を壊れたJSONにして**同じ検索 | 同上 |
| 14 | 索引から任意のslugを削除して検索 | そのカードが**消えない**(候補に残り取得後判定される) |
| 15 | 連続入力(デバウンス中の競合) | `seq` 判定が効き古い結果が混ざらない |
| 16 | 「もっと見る」で2ページ目 | 重複なし・件数が加算される |
| 17 | 索引のfetchが1回だけか | 2回目以降の検索で再fetchしない(Network) |
| 18 | 初期表示 | 索引を**読まない**(日本語を入力するまでリクエストが出ない) |
| 19 | URL共有復元(#20)との併用 | 復元した絞り込み+日本語検索でも正しい |

### 本番(push後・`curl -sI`)

| # | 内容 | 期待 |
|---|---|---|
| P1 | `/data/card-meta-index.json` | 200・`content-type` がJSON |
| P2 | 同ファイルのサイズ | 生 約125 KB(gzip配信で約33 KB) |
| P3 | CSP違反が出ないこと | 実ブラウザのConsoleで確認 |
| P4 | トップ・デッキ構築で 1〜3 を再実行 | ローカルと同じ結果 |

## 実装待ち / 実装済み

| 項目 | 状態 |
|---|---|
| 変更1 索引生成スクリプト+生成物 | **実装待ち** |
| 変更2 取得前フィルタ+フォールバック | **実装待ち** |
| 変更3 件数の正確化+文言 | **実装待ち** |
| 変更4 `jpPageSize` 据え置き | 変更なし(据え置きの明示) |
| CLAUDE.md への再生成タイミング追記 | **実装待ち**(pushはユーザー判断) |

## 開発担当への申し送り

1. **索引生成はネットワークが必要**(スナップショット取得 + 未収録22件の個別取得)。
   `tmp/api-cache/cards-snapshot.json` が既にあれば `loadCards` がそれを使う。
   スナップショットは 2026-07-19 時点(2,240枚)で、**APIの現在の総数も2,240枚で一致**していることを設計時に確認済み
2. **リクエスト数の確認は設計の核**。検証項目4(「あなた」+絞り込みで `jpPageSize` 件を超えない)が
   通らなければ取得前フィルタが効いていない
3. 索引の**フィールド順・辞書の作り方**は設計どおりでなくてよい(サイズが同等なら実装しやすい形で構わない)。
   ただし**フォールバックの3条件(表の内容)は必ず満たすこと**。ここが崩れると現状より悪化する
4. 判断が要る点が出たら**実装側で決めずissueに書く**
