# issue #71: 新セット `.asphodel/paradise`（PRD）の `meta.sets` 登録 設計書

## 改版履歴

| 日付 | 版 | 内容 |
|---|---|---|
| 2026-08-17 | 初版 | 8/16 のcronで自動公開された PRD 6セットが `meta.sets` 未登録で `npm run validate` が exit 1 になっている件の是正。**ラベル表記は既存の略記慣習に合わせる**（ユーザー判断済み）・**訳の追加は別issueに切り出す**（同）。付随差分（`gencode-womb` の1枚追加）まで実測して §3-3 に明記。**全項目が実装待ち** |
| 2026-08-17 | 第2版 | 実装完了（`bb2e28f7`）→ レビューでM7不合格（**PRDと無関係な31件**〈既存カード25+既存セット6。`editions` 並び・画像URLの入れ替え〉を混ぜてコミット）→ 是正（`e6023abc` で親コミットの内容へ復元）→ **再レビュー合格**。31件は「翌朝のcronに任せる」で確定（設計担当回答）。実施状況表を反映し **push待ち** |

## 実施状況

| 項目 | 状態 |
|---|---|
| §1 背景と実害 | ✅ 設計時に完了（実測済み） |
| §2 調査結果（公式API・既存慣習・消費側） | ✅ **設計時に完了**（再調査不要） |
| §3-1 `data/translations.js` に6件追記 | ✅ **実装済み**（`bb2e28f7`・文字列一致を確認済み） |
| §3-2 `npm run build:cards` と生成物のコミット | ✅ **実装済み**（`bb2e28f7` + 是正 `e6023abc`。累積339ファイル=想定どおり） |
| §3-3 付随差分（`gencode-womb`）の扱い | ✅ **完了**（意図内で収録。⚠️ 想定外の**無関係31件**は `e6023abc` で除外し**翌朝のcronに委任**） |
| §4 検証項目 V1〜V10 | ✅ **検証済み**（開発報告+レビュー2往復目で全項目✅） |
| §5 push | ⬜ **ユーザー判断待ち**（⚠️ **本件は本番配信物**。⚠️ **翌朝03:00 JSTのcron前にpush**しないと同じ差分がcronの自動コミットと衝突する） |

**モックなし**。UIの変更は**ラベル文字列と並び順だけ**でレイアウト変更を含まないため、
モックHTMLの代わりに **§3-4 に「変更前 → 変更後」の最終表示を全文**で載せる（そのまま検証の期待値になる）。

⚠️ **すべての実測値は 2026-08-17 時点**。公式APIは日々増えるので、
差異が出たら「不合格」ではなく **§6 の手順で内訳を報告する**。

---

## 1. 背景と実害

### 1-1. 何が起きたか

`.asphodel/paradise`（PRD）が **2026-08-16 13:12 UTC** に公式APIへ登録され、
同日の日次cron（8/16 18:18 UTC・コミット `e720a5f7`）が
**カードページ253枚・セットページ6枚を含む835ファイルを自動生成して本番公開**した。

一方、**エキスパンション絞り込み（`#f-set`）の選択肢だけは手書き**（CLAUDE.md #40）なので、
`data/translations.js` の `meta.sets` に PRD 系6prefixが**入っていない**。

### 1-2. 実害（2026-08-17 実測）

| # | 症状 | 実測値 |
|---|---|---|
| 1 | ⚠️ `npm run validate` が **exit 1** | `UNREGISTERED SETS (meta.sets): prd prd-1st prdg prdp prdsd prddp`。**復旧するまでレビューの必須基準 M3（validate が exit 0）が通らず、他issueのスプリントも回せない** |
| 2 | エキスパンション絞り込みに PRD が出ない | 対象 **394エディション**／**カードページ328枚** |
| 3 | 生成ページのラベルが素のprefix | `/cards/`・トップの静的リンク・`/sets/prd*/`・カードページのパンくずと「収録セットと版」が `PRD` `PRD 1st` … のまま |
| 4 | ⚠️ **`PRDDP` の位置が最下段** | `setOrder()` が未登録に **9999** を返すため、`/cards/` の「その他」で **`DEMO22` より下**＝一覧の最後尾に落ちている |

先例（#40・SP4）は **32枚が約1か月間絞り込めなかった**。今回は規模が1桁大きい。

---

## 2. 調査結果

### 2-1. 未登録の6prefix（公式API実測・2026-08-17）

| prefix | 公式名（API `set.name`） | 収録 | `release_date` | `created_at` |
|---|---|---|---|---|
| `PRD` | .asphodel/paradise | 232 | 2026-08-21 | 2026-08-16 13:12 UTC |
| `PRD 1st` | .asphodel/paradise First Edition | 27 | 2026-08-21 | 2026-08-16 14:58 UTC |
| `PRDG` | .asphodel/paradise Grimoire | 21 | 2026-08-21 | 2026-08-16 13:12 UTC |
| `PRDP` | .asphodel/paradise: Pantheon | 14 | 2026-08-21 | 2026-08-16 13:12 UTC |
| `PRDSD` | .asphodel/paradise Starter Decks | **61** | 2026-08-21 | 2026-08-16 13:12 UTC |
| `PRDDP` | .asphodel/paradise Draft Pack | 39 | 2026-08-21 | 2026-08-16 13:12 UTC |

- `PRDEVP`（.asphodel/paradise Event Pack・33枚）は **2026-08-05 に登録済み**＝今回の対象外
- `PRDDP` は公式 `/featured-sets` の `.asphodel/paradise` グループに**含まれない**
  （＝`/cards/` では今後も「その他（プロモ・デモ・イベントパック等）」に入る。仕様どおり）

### 2-2. ラベル表記の慣習（実測で裏取り済み）

サイトのラベルは**公式名をそのまま使っていない**。既存エントリと公式名を突き合わせた結果:

| prefix | 公式名 | 既存ラベル | 規則 |
|---|---|---|---|
| `RDO 1st` | Radiant Origins **First Edition** | `Radiant Origins **1st Ed.**（RDO 1st）` | First Edition → **1st Ed.** |
| `DTRSD` | Distorted Reflections **Starter Decks** | `Distorted Reflections **Starter**（DTRSD）` | Starter Decks → **Starter** |
| `AMBSD` | Mortal Ambition **Starter Decks** | `Mortal Ambition **Starter**（AMBSD）` | 同上 |
| `RDOPD` | Radiant Origins Pantheon Decks | `Radiant Origins Pantheon Decks（RDOPD）` | そのまま |
| `RDOP` | Radiant Origins: Pantheon | `Radiant Origins: Pantheon（RDOP）` | **コロンは残す** |

→ **この慣習に合わせる**（**ユーザー承認済み・2026-08-17**。§3-1 の6行そのものを提示して選択してもらった）。

⚠️ **ラベル文字列は1文字も変えないこと**（#51 の D1〜D4 と同じ）:

| # | 決定 | 根拠 |
|---|---|---|
| D1 | 末尾は**全角括弧** `（PREFIX）` | 既存**57件すべて**全角（実測。半角は0件） |
| D2 | **先頭のドットを残す**（`.asphodel/…`） | 公式の意匠。削ると公式サイトと突き合わせられない |
| D3 | **小文字のまま**（`paradise` を `Paradise` にしない） | 同上。既存の `PRDEVP` 行と一致させる |
| D4 | 挿入位置は **`sets:` 配列の先頭**（PRDEVP の上） | `release_date` が **2026-08-21** で既存のどれより新しい。CLAUDE.md「発売日の新しい順」の規則どおり |

### 2-3. `meta.sets` の消費側（3通りの効き方）

`scripts/build-card-pages.mjs` が `meta.sets` から2つのMapを作る（同ファイル 124〜130行）:

| 関数 | 未登録時の挙動 | 影響する出力 |
|---|---|---|
| `setLabel(prefix)` | **素のprefixにフォールバック** | カードページのパンくず＋JSON-LD＋「収録セットと版」／`/sets/<slug>/` の `<title>`・`<h1>`・`description`・パンくず／`/cards/`／トップの静的リンク |
| `setOrder(prefix)` | **9999**（最後尾） | `/cards/` と トップのグループ内の並び／`sets/` の生成順 |
| `shared/js/card-search.js` の `SETS` | **選択肢に出ない** | `#f-set`（トップ・デッキ構築の両方） |

⭐ **`newestFirst()` は `release_date` で並べており `meta.sets` を見ない**（同 152行）。
したがって **カードページの「代表の版」（＝パンくずが指すセット）は今回の変更で変わらない**。
変わるのは**表示ラベルと並び順だけ**である。

### 2-4. URL共有は壊れない

`shared/js/card-search.js` の `setKeyOf()` は**添字ではなく `prefixes[0]`** をURLへ書く（`?set=PRD`）。
`setIndexOf()` は prefix から引き直す。**`meta.sets` の並びを変えても既存の共有URLは壊れない**（#20 の設計）。

---

## 3. 変更内容

### 3-1. `data/translations.js` の `meta.sets` に6件追記（**先頭**）

現在の先頭は `.asphodel/paradise Event Pack（PRDEVP）` である。
その **直前** に次の6行を、この順で挿入する（既存行は編集も削除もしない＝位置が繰り下がるだけ）:

```js
    sets: [
      { label: ".asphodel/paradise（PRD）", prefixes: ["PRD"] },
      { label: ".asphodel/paradise 1st Ed.（PRD 1st）", prefixes: ["PRD 1st"] },
      { label: ".asphodel/paradise Grimoire（PRDG）", prefixes: ["PRDG"] },
      { label: ".asphodel/paradise: Pantheon（PRDP）", prefixes: ["PRDP"] },
      { label: ".asphodel/paradise Starter（PRDSD）", prefixes: ["PRDSD"] },
      { label: ".asphodel/paradise Draft Pack（PRDDP）", prefixes: ["PRDDP"] },
      { label: ".asphodel/paradise Event Pack（PRDEVP）", prefixes: ["PRDEVP"] },   // ← 既存（そのまま）
      { label: "Supporter Pack 4（SP4）", prefixes: ["SP4"] },                      // ← 既存（そのまま）
```

⚠️ **注意点**

- `prefixes` の値は **APIの `prefix` と完全一致**させる。**`"PRD 1st"` は半角スペース1つ**（`PRD1st` ではない）
- **1エントリ＝1prefix**（既存の書き方に合わせる。まとめない）
- ラベルの括弧は**全角 `（ ）`**、区切りに空白を入れない
- `.asphodel/paradise` は**先頭がドット・途中にスラッシュ**を含むが、
  既存の `PRDEVP` 行が同じ形で問題なく動作している（`esc()` を通って `<option>`／HTMLに出る）

### 3-2. 再生成とコミット

```bash
npm run build:cards        # ネットワーク必須。全カードページ・セットページ・/cards/・トップ・sitemap.xml を再生成
npm run validate           # exit 0 になることを確認（V1）
```

- ⚠️ `tmp/api-cache/cards-snapshot.json` は **2026-08-14 取得で期限切れ（既定60分）** なので**自動で取り直される**。
  **`GA_SNAPSHOT_MAX_AGE_MIN=0` を付けない**こと（8/14の古いデータで生成すると PRD が丸ごと消える）
- コミットするパス（⚠️ **`git add -A` は使わない**）:
  `data/translations.js` / `cards/` / `sets/` / `index.html` / `sitemap.xml`
- ⚠️ **`tmp/` は含めない**。`data/tournaments/index.json` など**自分が触っていないパスが出ていないか
  `git status --short` で確認**してからステージする

### 3-3. 付随差分（意図内・報告のみでよい）

**8/16 のcron後に PRDSD へカードが1枚追加されている**（設計時に実測）:

| 事実 | 実測値 |
|---|---|
| API `total_cards` | **2494**（生成済みカードページは **2493**） |
| 未生成のカード | **`gencode-womb`**（Gencode Womb・REGALIA/ITEM・PRDSD のみ収録） |
| 参照関係 | `gencode-womb` → `elysian-test-subject` を参照。**逆参照も成立**しているため `cards/elysian-test-subject/index.html` の「関連カード」に1行増える（同カードは PRD 収録なので**328枚の中に既に含まれる**） |

⭐ `build:cards` は常に**実行時点のAPI**から作るので、この1枚は**不可避で一緒に入る**。
**これは意図内**として扱い、**報告コメントに内訳を書く**（差し戻し理由にしない）。
⚠️ 8/17 以降にさらに追加があれば、**同様に内訳だけ報告する**（§6）。

### 3-3b. 期待されない差分（出たら**止めて報告**する）

| ファイル | なぜ出ないはずか |
|---|---|
| `data/tl-names.json` / `data/tl-effects.json` | `data/tl/*.js` からのみ生成。`meta.sets` とは無関係 |
| `data/card-meta-index.json` | 別スクリプト（`gen-card-meta-index.mjs`）の生成物。無関係 |
| `cards/cards.css` / `cards/cards.js` | 静的な埋め込み定数。`meta.sets` を参照しない |
| `data/tournaments/**` / `tournaments/**` | 別ビルド（`build:tournaments`）の担当 |
| `data/featured-sets.json` | ⚠️ **手で編集してはいけない**（取得できた日だけcronが更新する） |
| **PRD 系6セットを参照しないカードページ** | ラベルもパンくずも変わらない（§2-3・`newestFirst` は `meta.sets` を見ない） |

⚠️ 無関係な差分が出たら**混ぜてコミットせず**、原因を切り分けて issue に報告する（#51 の実例＝
古いスナップショットのまま回して**33件のはずが61件**になった事故がある）。

### 3-4. 変更前 → 変更後の最終表示（モックの代わり・そのまま検証の期待値）

#### (a) `/cards/`（エキスパンション一覧）の `.asphodel/paradise` グループ

```
【変更前】                                【変更後】
 PRD              232枚                  .asphodel/paradise（PRD）              232枚
 PRD 1st           27枚                  .asphodel/paradise 1st Ed.（PRD 1st）   27枚
 PRDG              21枚                  .asphodel/paradise Grimoire（PRDG）     21枚
 PRDP              14枚                  .asphodel/paradise: Pantheon（PRDP）    14枚
 PRDSD             60枚                  .asphodel/paradise Starter（PRDSD）     61枚 ← §3-3
```

#### (b) `/cards/` の「その他（プロモ・デモ・イベントパック等）」

```
【変更前】先頭                            【変更後】先頭
 .asphodel/paradise Event Pack（PRDEVP） 33枚   .asphodel/paradise Draft Pack（PRDDP） 39枚
 Supporter Pack 4（SP4）                32枚   .asphodel/paradise Event Pack（PRDEVP） 33枚
 Radiant Origins Event Pack（RDOEVP）   26枚   Supporter Pack 4（SP4）                32枚
     :                                              :
【変更前】最後尾                          【変更後】最後尾
 PRDDP                                39枚   LGS Demo 2022（DEMO22）                20枚
```

⭐ **`PRDDP` が最後尾から先頭へ移動する**のがこの変更の見た目上いちばん大きい差分。

#### (c) カードページ（例: `/cards/acheron-express-officer/`）

```
【変更前】 トップ › エキスパンション一覧 › PRD › Acheron Express Officer
【変更後】 トップ › エキスパンション一覧 › .asphodel/paradise（PRD） › Acheron Express Officer

「収録セットと版」表 1列目:  PRD  →  .asphodel/paradise（PRD）
```

#### (d) セットページ `/sets/prd/`

```
【変更前】 <h1>PRD カードリスト</h1>                     / <title>PRD カードリスト - …</title>
【変更後】 <h1>.asphodel/paradise（PRD） カードリスト</h1> / <title>.asphodel/paradise（PRD） カードリスト - …</title>
```

#### (e) `#f-set`（トップ・デッキ構築の絞り込み）

```
【変更前】 エキスパンション（全て） / .asphodel/paradise Event Pack（PRDEVP） / Supporter Pack 4（SP4） / Radiant Origins（RDO） / …
【変更後】 エキスパンション（全て） / .asphodel/paradise（PRD） / .asphodel/paradise 1st Ed.（PRD 1st） /
           .asphodel/paradise Grimoire（PRDG） / .asphodel/paradise: Pantheon（PRDP） /
           .asphodel/paradise Starter（PRDSD） / .asphodel/paradise Draft Pack（PRDDP） /
           .asphodel/paradise Event Pack（PRDEVP） / Supporter Pack 4（SP4） / …
```

---

## 4. 検証項目

⚠️ 期待値は**画面／出力に出る最終形**で書いてある。件数は**設計時に実測した値**（2026-08-17）。

| # | 項目 | 手順 | 期待値 |
|---|---|---|---|
| **V1** | `validate` の復旧 | `npm run validate; echo $?` | **exit 0**。`UNREGISTERED SETS` の節が**出ない**。かつ `meta.sets covers all sets — 63件` の行が出る |
| **V2** | cronログ相当の警告が消える | `npm run build:cards` の stderr 全体 | `⚠ meta.sets 未登録のセット:` の行が **1行も出ない**（変更前は6件で出ていた） |
| **V3** | 完走サマリ | 同上の最終行 | `生成完了: カード**2494**ページ(和訳あり…) / セット**63**ページ / 索引 / トップの静的セットリンク**63**本 / sitemap.xml(…URL)`。⚠️ カード枚数が2494を超えていたらAPI側の追加＝**V10で内訳を報告**（不合格にしない） |
| **V4** | 追記の行数 | `grep -c 'asphodel' data/translations.js` | **7**（変更前は **1**）。⭐ 6件追記＋既存 PRDEVP の1行 |
| **V4b** | `meta.sets` の総数 | `grep -c 'prefixes: \[' data/translations.js` | **63**（変更前は **57**）。⭐ **セットページ63件と一致する**のが正常な状態（V1 の `63件` と同じ数） |
| **V5** | 変更ファイルの範囲 | `git status --short` | **M 338行 ＋ ?? 1行 ＝ 339行**。内訳: カードページ **328** / セットページ **6**（`sets/prd,prd-1st,prdg,prdp,prdsd,prddp/index.html`） / `cards/index.html` / `index.html` / `sitemap.xml` / `data/translations.js` ＋ 新規 `?? cards/gencode-womb/`。⚠️ **PRD と無関係なパスが出ていたら止めて報告**（§6） |
| **V6** | `/cards/` の `.asphodel/paradise` グループ | `npm run dev`（ポート3000）で `/cards/` を開く | §3-4(a) の【変更後】と**5行とも一致**（表示名・枚数・並び順）。**PRDSD は 61枚** |
| **V7** | `/cards/` の「その他」の先頭 | 同上 | 先頭3件が上から **PRDDP（39枚）→ PRDEVP（33枚）→ SP4（32枚）**。**最後尾は `LGS Demo 2022（DEMO22）`**（PRDDP が最後尾から消えている） |
| **V8** | カードページとセットページ | `cards/acheron-express-officer/index.html` と `sets/prd/index.html` を開く | §3-4(c)(d) と一致。パンくず・「収録セットと版」1列目・`<h1>`・`<title>` の**4箇所すべて** `.asphodel/paradise（PRD）` |
| **V9** | `#f-set` の実駆動（**トップとデッキ構築の両方**） | Playwright（`npm run setup:env` を先に1回）。トップ `/` と `/tools/deck-builder/`（CLAUDE.md の「空のデッキ状態を用意する」手順） | ① 先頭の `エキスパンション（全て）` に続く**6件**が §3-4(e) の順で並ぶ ② `.asphodel/paradise（PRD）` を**既定の並び順（名前昇順）のまま**選ぶと、ステータス行の総件数が **`全 232 件`**（半角スペースあり・`app.js` 169行の書式）になる ③ URLに **`?set=PRD`** が入り、リロードで選択が復元される。⚠️ 数値項目で並び替えると #39 の除外で減ることがあるので**既定の並び順で測る** |
| **V10** | 幅の確認（最悪ケース） | V9 と同じページで **PC幅と375px幅**のスクリーンショット | ① `#f-set` のラベルが**枠を突き破らない**こと ② `/cards/` の**「その他」先頭** `.asphodel/paradise Draft Pack（PRDDP）`（**今回の最長・36文字**）が、右の枚数表示 `39枚` と**重ならない**こと。⭐ 既存最長は `Phantom Monarchs: Looking Glass Sights（PTMLGS）`（**46文字**・実測）で、**今回のラベルはいずれもそれより短い**＝新しい最悪ケースにはならない（既存幅で収まっていれば追加のCSS変更は不要） |

### V11〜V12（回帰・レイアウト）

| # | 項目 | 手順 | 期待値 |
|---|---|---|---|
| **V11** | ⚠️ **パンくずの回帰** | `cards/atmos-armor-type-hermes/index.html`（PRD 非収録カード） | パンくずが **`トップ › エキスパンション一覧 › Mercurial Heart（MRC） › アトモス・アーマー Type-Hermes`** のまま。⚠️ ここが PRD 系に変わっていたら**異常**（`newestFirst()` は `release_date` で並べるので変わらないはず） |
| **V12** | 375px幅で横スクロールしない | 375px幅で `/cards/` とトップの絞り込みを開く | `document.documentElement.scrollWidth <= 375`。`.asphodel/paradise Draft Pack（PRDDP）` は**2行に折り返し**、`39枚` が右端に残る。⚠️ **「重ならないこと」では不足** — 折り返した2行目の左端が1行目と揃うことを `Range.getBoundingClientRect()`（要素の矩形ではなく**テキストの実描画位置**）で測る |

---

## 5. push（ユーザー判断・`push待ち`）

⚠️ **本件は本番配信物**（`cards/` `sets/` `index.html` `sitemap.xml` `data/translations.js`）。
`docs/` 例外には**該当しない**ので、**pushはユーザーの指示を待つ**。

- 反映確認の方法: ⚠️ **今回のコミットには新規ファイル `cards/gencode-womb/index.html` が含まれる**ので、
  **新規URL `/cards/gencode-womb/` の 404→200 が最も確実な到達マーカー**（CLAUDE.md #53/#54 の結論）
- あわせて `curl -sL https://ga-card-tools-jp.pages.dev/cards/ | grep -c 'asphodel/paradise（PRD）'` が
  **1以上**になること（⚠️ `.html` を付けず**末尾スラッシュのURL**で測る＝308の罠）
- ⚠️ **翌朝03:00 JST のcronまでに push しないと、cronが同じ差分を無関係な自動コミットとして含めて
  publish する**（CLAUDE.md「生成ロジックを変えたら生成物も再生成してコミットする」と同根）。
  **push は当日中が望ましい**旨をユーザーに伝えること

---

## 6. リスクと未確定事項

| # | 事項 | 対応 |
|---|---|---|
| R1 | **設計時（8/17）以降に公式APIがカードを追加する** | 差分の件数がV5とずれる。**不合格にせず、増分のslugと所属prefixを報告コメントに列挙**して設計担当の判断を待つ |
| R2 | **さらに新しいsetが増えていた場合** | `validate` が再び `UNREGISTERED SETS` で落ちる。⚠️ **勝手に足さない**（ラベル表記の決定は設計担当の判断）。落ちた事実とprefixを報告して止まる |
| R3 | `build:cards` はカード2,494ページを書くため時間がかかる | 途中経過は500ページごとにstderrに出る。タイムアウトさせないこと |
| R4 | 新カード253枚は**未翻訳**（「翻訳募集中」バッジ） | **本issueのスコープ外**（ユーザー判断済み）。訳の追加は**別issueで起票する**（設計担当が対応） |
| R5 | `shared/js/card-search.js` 46行のコメントに「全55版で1個かつ一意」とあるが実際は63版 | **今回は直さない**（本件と無関係な本番配信物の差分を増やさないため）。事実誤りではなく数の陳腐化 |

⭐ **シーズン禁止（#34）は対応済み**: `data/seasonal-banlist.json` に PRDシーズン（`effectiveFrom: 2026-08-21`・3枚）が
既に登録されている。**本issueで触る必要はない**。

---

## 7. 参考

- ⭐ **直接の先例**: `docs/design/51-PRDEVP-meta-sets/PRDEVP登録_設計.md`（同じ `.asphodel/paradise` 系列の
  Event Pack を登録した回。判断済み事項 D1〜D4＝**全角括弧・先頭のドット・小文字をそのまま残す**は本件でも有効）
- CLAUDE.md「⚠️ 新セットが公式APIに入ったら `data/translations.js` の `meta.sets` に手で追記する（#40）」
- `scripts/build-card-pages.mjs` 124〜130行（`SET_LABELS` / `setOrder`）・152行（`newestFirst`）・462行（`setPage`）
- `scripts/validate.mjs` 151〜181行（`meta.sets` の網羅検査）
- `shared/js/card-search.js` 36〜56行（`SETS` / `setKeyOf` / `setIndexOf`）・`app.js` 169行（件数表示の書式）
