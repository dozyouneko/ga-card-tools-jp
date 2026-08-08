# #51 新セット PRDEVP の meta.sets 登録 — 設計

## 改版履歴

| 版 | 日付 | 内容 | 状態 |
| --- | --- | --- | --- |
| 1.0 | 2026-08-08 | 初版。調査・モック・実装指示・検証項目を確定 | 実装待ち |

## 1. 背景

2026-08-06 の日次cron（コミット `e4884b5b` / run `31132630098`）が公式APIに現れた新セット
`.asphodel/paradise Event Pack`（prefix `PRDEVP`・33枚）を自動publishした。
セットページ・カードページ・sitemapは自動生成されたが、
**`data/translations.js` の `meta.sets` は手書き**のため取り残されている（CLAUDE.md #40 と同じ失敗モード）。

`npm run validate` は **exit 1** で検出済み：

```text
UNREGISTERED SETS (meta.sets):
  - セットページはあるが data/translations.js の meta.sets に無い: prdevp
```

⚠️ cronは `validate` を実行しないため、自動publishは止められなかった。これは設計どおりの挙動でバグではない
（`build:cards` で exit 1 にすると、その日の大会データ取り込みごと失われるため）。

## 2. 対象範囲

### やること

`data/translations.js` の `meta.sets` に**1行追記**し、`npm run build:cards` で生成物を作り直してコミットする。

### やらないこと

- 訳の追加（**不要**。33枚すべて既存カードの再録で、訳は全部そろっている。実測で欠落0件）
- `data/featured-sets.json` の編集（⚠️ **手で編集してはいけない**。cronが公式APIから取得する）
- 検出のしくみの改善（`validate` の exit 1 は正しく動いた。cronに `validate` を入れるかは別論点 → 派生issueの要否は §7）

## 3. 判断済み事項（実装側で決め直さないこと）

| # | 項目 | 決定 | 根拠 |
| --- | --- | --- | --- |
| D1 | ラベル文字列 | **`.asphodel/paradise Event Pack（PRDEVP）`** | 公式セット名そのまま。既存56ラベルが例外なく「英語セット名＋（PREFIX）」で、日本語を含むものは**0件**。モックでユーザー承認済み（2026-08-08） |
| D2 | 挿入位置 | **`sets:` 配列の先頭**（現 `Supporter Pack 4（SP4）` の**上**） | `release_date` が `1970-01-01`（API未設定）のため、CLAUDE.md の規則どおり `created_at`（2026-08-05T19:42Z）で判断。既存で最も新しい |
| D3 | 全角括弧を使う | `（PREFIX）`（全角） | 既存56件すべて全角。半角にしない |
| D4 | 先頭のドットを残す | 残す | 公式の意匠。削ると公式サイトと突き合わせできず、本体セット `.asphodel/paradise` 登場時に同じ改変を繰り返すことになる |

⚠️ **ラベル文字列は1文字も変えないこと。** 全角括弧・小文字・先頭ドット・スラッシュすべて意図的。

## 4. 変更内容

### 4-1. `data/translations.js`（唯一の手編集）

```js
    sets: [
      { label: ".asphodel/paradise Event Pack（PRDEVP）", prefixes: ["PRDEVP"] },   // ← この1行を追加
      { label: "Supporter Pack 4（SP4）", prefixes: ["SP4"] },
      { label: "Radiant Origins（RDO）", prefixes: ["RDO"] },
      …
```

### 4-2. 生成物の再作成

```bash
npm run build:cards      # カード個別ページ・セットページ・sitemap.xml を再生成
npm run validate         # exit 0 になること
```

⚠️ **生成物を必ずコミットする。** 忘れると翌朝のcronが同じ差分を無関係な自動コミットとしてpushする。

## 5. 期待される差分（この範囲を超えたら報告すること）

| ファイル | 期待される変化 |
| --- | --- |
| `data/translations.js` | 1行追加のみ |
| `sets/prdevp/index.html` | `<title>` / H1 / `description` / `og:title` の `PRDEVP` → 正式名 |
| `cards/<slug>/index.html` | **33ファイル**。「収録セットと版」表の1行が `PRDEVP` → 正式名 |
| `cards/index.html` | 「その他」グループ内のラベルが正式名になり、**グループ内の最後 → 先頭**へ移動 |
| `index.html` | トップの静的セットリンク。同上（ラベル＋「その他」内で最後 → 先頭） |
| `sitemap.xml` | ⚠️ **URLもlastmodも変わらない。`/sets/prdevp/` の行位置だけ**が `/sets/` 群の最後 → 先頭へ移動 |

### 期待されないもの（出たら止めて報告）

- `data/tl-names.json` / `data/tl-effects.json` — `meta.sets` とは無関係（`data/tl/*.js` からのみ生成）
- `data/card-meta-index.json` — 無関係
- 上記33枚**以外**のカードページ
- `cards/cards.css` / `cards/cards.js`

⚠️ **無関係な差分が出た場合、原因を切り分けてから進めること。**
最終cron（8/08 03:45 JST）以降にAPI側でカードが増えていると、`build:cards` が
`meta.sets` と無関係な差分も一緒に出す。その場合は**内訳をissueに報告し、判断を仰ぐ**
（勝手に混ぜてコミットしない）。

## 6. 検証項目

⚠️ **期待値は「画面に出る最終形」で書いてある。** 件数だけでなく順位・文言・位置まで一致すること。

### V1〜V3: コマンドで確認

| # | 手順 | 期待値（最終形） |
| --- | --- | --- |
| V1 | `npm run validate` | **exit 0**。`UNREGISTERED SETS` セクションが**出ない**。`meta.sets covers all sets — 57件` が出る |
| V2 | `npm run build:cards` の stderr | `⚠ meta.sets 未登録のセット:` の行が**1行も出ない**（現状は `1件 (PRDEVP)` と出る） |
| V3 | `git status --short` | §5の表の6ファイル種別のみ。カードページはちょうど**33件** |

### V4〜V7: ブラウザ実駆動（`npm run dev` → `http://localhost:3000`）

⚠️ Playwrightは `launch({ args: ["--ignore-certificate-errors"] })` + context `ignoreHTTPSErrors: true`
（NortonのHTTPS検査対策）。

| # | 画面・操作 | 期待値（最終形） |
| --- | --- | --- |
| V4 | トップ `/` のエキスパンション絞り込み `#f-set` を開く | 「エキスパンション（全て）」の**次（上から2番目）**に **`.asphodel/paradise Event Pack（PRDEVP）`** がある。文字列が完全一致すること（全角括弧・先頭ドット・小文字） |
| V5 | V4でその選択肢を選ぶ | 結果が **33枚**。件数表示に異常注記が出ない。⚠️ 「0件」や「全て」のままなら `prefixes` の綴り誤り |
| V6 | デッキ構築 `/tools/deck-builder/` の `#s-set` | V4・V5と**同じ結果**（同じ `fillSetSelect()` を使うため） |
| V7 | V5の状態でURLを共有し、新しいタブで開き直す | 絞り込みが**復元**され、URLに `PRDEVP`（添字ではなくprefix）が入っている |

### V8〜V11: 生成物の中身

| # | 対象 | 期待値（最終形） |
| --- | --- | --- |
| V8 | `/sets/prdevp/` | `<title>` が **`.asphodel/paradise Event Pack（PRDEVP） カードリスト - Grand Archive 日本語カードDB`**。画面のH1も同じラベル。素の `PRDEVP` が**残っていない** |
| V9 | `/cards/atmos-armor-type-hermes/` の「収録セットと版」 | 3行目のセット名が **`.asphodel/paradise Event Pack（PRDEVP）`**、発売日は **`—`**（`release_date` 未設定のため。ここは変えない）、番号 `#002`、レア `SR` |
| V10 | `/cards/` の「その他（プロモ・デモ・イベントパック等）」グループ | **先頭**が `.asphodel/paradise Event Pack（PRDEVP）` ＋ `33枚`。⚠️ **ページ全体の先頭ではない**（「その他」グループ自体は最後のまま） |
| V11 | トップ `/` の「エキスパンション別に探す（全57セット）」 | 「その他」グループの**先頭**が同ラベル。総数の表記は **57** のまま変わらない |

### V12: パンくずが変わっていないこと（回帰）

| # | 対象 | 期待値 |
| --- | --- | --- |
| V12 | `/cards/atmos-armor-type-hermes/` のパンくず | **`トップ › エキスパンション一覧 › Mercurial Heart（MRC） › アトモス・アーマー Type-Hermes`** のまま。⚠️ ここが `PRDEVP` に変わったら**異常**（`newestFirst()` は `release_date` で並べるので変わらないはず） |

### V13: 375px幅

| # | 対象 | 期待値 |
| --- | --- | --- |
| V13 | 375px幅でトップの絞り込みを開き、`/cards/` を表示 | **ページ本体が横スクロールしない**（`document.documentElement.scrollWidth <= 375`）。セット一覧カード内でラベルが2行に折り返し、`33枚` が右端に残る |

⚠️ **位置合わせを見るときは「重ならないこと」では不足。** 近接要素と左端が揃うことを
`Range.getBoundingClientRect()`（要素の矩形ではなくテキストの実描画位置）で測ること。

## 7. 未決事項（設計担当の判断待ち・実装側で決めない）

| # | 論点 | 状態 |
| --- | --- | --- |
| U1 | cronに `validate` を組み込み、未登録セットを検知したら通知するか | **今回のスコープ外。** 実装側は触らないこと。派生issueの要否は設計担当が #51 クローズ時に判断する |
| U2 | 本体セット `.asphodel/paradise`（PRD）が来たときの手順 | 本issueでは扱わない（現時点でAPIに未登場。`PRD` / `PRD 1st` / `PRDP` / `PRDSD` すべて0件を実測）。**新規カード＋訳の追加を伴うため別issueになる** |

## 8. 参考（調査で確定した事実）

- `meta.sets` の消費側は**2箇所だけ**
  - `shared/js/card-search.js:36` — `fillSetSelect()`（選択肢）、`setPrefixes()` / `setKeyOf()` / `setIndexOf()`（絞り込み・URL共有）
  - `scripts/build-card-pages.mjs:89` — `setLabel()`（表示名）、`setOrder()`（並び順）
- **共有URLは先頭挿入でも壊れない** — `setKeyOf()` が添字ではなく `prefixes[0]` を書き、`setIndexOf()` がprefixで引き直す（#20の設計）。絞り込み状態の `localStorage` 保存も**無い**
- **PRDEVPでしか刷られていないカードは0枚** — 33枚すべて他セットにも収録があり、DBから消えているカードは無い
- 既存56ラベルの最長は `Phantom Monarchs: Looking Glass Sights（PTMLGS）` の **46文字**。
  候補（37文字）は9文字短く、**レイアウトは変わらない**
- モック: `docs/design/51-PRDEVP-meta-sets/ラベル表記モック.html`
