# 新セット DTR Alter の辞書追記 と 週1更新（#138）設計

| 版 | 日付 | 内容 |
|---|---|---|
| 1.0 | **2026-10-13** | 初版。⭐ **`git archive HEAD` で作業ツリーに触れない複製を3つ作り、`GA_SNAPSHOT_MAX_AGE_MIN=0` でスナップショットを固定して全数を実測した**（`t0`＝修正なし／`t1`＝`meta.sets` のみ／`t2`＝`meta.sets`＋`meta.subtypes`）。**実装済み項目は無し（全項目が実装待ち）** |

- **呼び名**: 「DTR Alter の辞書追記」
- **issue**: #138（`bug` / `着手可` / `小タスク`）
- 関連: #139「DTR Alter の和訳」（⚠️ **本issueが先**。理由は §8）

---

## 1. 何を直すか（1行）

`data/translations.js` に **3行**（`meta.sets` 1行 ＋ `meta.subtypes` 2語）を足し、
**CLAUDE.md「大会データの週1更新」の3ステップ**を回して生成物をコミットする。

---

## 2. 症状と、それを「いま」直す理由

### 2-1. `npm run validate` の緑は空回りしている

`meta.sets` の検査（`scripts/validate.mjs`）は **`cards/index.html` の `/sets/<slug>/` リンクを正**にしている。
まだ `build:cards` を回していないので `/sets/dtr-alter/` が生えておらず、**検査する対象そのものが存在しない**。

- ⭐ **実測（2026-10-13）**: スナップショットに**カードが在る prefix は 64種**／`cards/index.html` の `/sets/` リンクは **63本**。
  差の1つが `DTR Alter`
- ⚠️ ⭐ **だから「いま緑だから大丈夫」ではない。** `build:cards` を回した**瞬間に** exit 1 になる（§3 で再現済み）

### 2-2. 週1更新が2日遅れている

- 最後の定期再生成は **`3039489b`（2026-10-04 12:33 UTC）**。週1なら 10-11 が期限
- ⭐ **ユーザー決定（2026-10-13）**: **週1更新は本issueと一緒に回す**

---

## 3. ⭐ 「`build:cards` を回すと exit 1」の再現（**実測済み・2026-10-13**）

⚠️ **作業ツリーを一切変更せずに測った。** 手順は次のとおり（レビューも同じ手順で追試できる）:

```bash
SP=<スクラッチ>/t0
git archive HEAD | tar -x -C $SP
ln -s /workspaces/claude-test-vsc/node_modules $SP/node_modules
mkdir -p $SP/tmp/api-cache && cp tmp/api-cache/cards-snapshot.json tmp/api-cache/featured-sets.json $SP/tmp/api-cache/
cd $SP && GA_SNAPSHOT_MAX_AGE_MIN=0 node scripts/build-card-pages.mjs && GA_SNAPSHOT_MAX_AGE_MIN=0 node scripts/validate.mjs
```

| 複製 | `data/translations.js` の状態 | `build-card-pages.mjs` の最終行 | `validate.mjs` |
|---|---|---|---|
| **t0** | 無修正 | `⚠ meta.sets 未登録のセット: 1件 (DTR Alter) — エキスパンション絞り込みに出ません` | ⚠️ **exit 1**<br>`UNREGISTERED SETS (meta.sets):`<br>`  - セットページはあるが data/translations.js の meta.sets に無い: dtr-alter` |
| **t1** | `meta.sets` に1行 | 警告行なし | ✅ **exit 0**（`meta.sets covers all sets — 64件`） |
| **t2** | `meta.sets` 1行 ＋ `meta.subtypes` 2語 | 警告行なし | ✅ **exit 0** |

⚠️ ⭐ **この exit 1 は「壊れている」のではなく「検査が意図どおり人を止めた」姿。** 直し方は検査自身が案内している。

---

## 4. 変更内容

### 4-1. `data/translations.js` — `meta.sets` に1行（**必須**）

**発売日の新しい順**に並べる規約（CLAUDE.md）に従い、**`sets: [` の直後・いまの先頭（`.asphodel/paradise（PRD）`）より前**に入れる。

```js
      { label: "Distorted Reflections Alter Ed.（DTR Alter）", prefixes: ["DTR Alter"] },
```

- ⭐ **ラベルの形は既存の Alter 4種に揃える**（`Mortal Ambition Alter Ed.（AMB Alter）` 等）。
  公式名は `Distorted Reflections Alter Edition` だが、**既存4種がすべて `Alter Ed.` と略している**ので揃える
- ⭐ **先頭が正しい位置**: DTR Alter の `release_date` は **2026-10-16** で、いまの先頭 PRD 系（2026-08-21）より新しい。
  ⚠️ **同じ 2026-10-16 のセットは他に無い**（実測）ので、**この1行は版の並び順（`editionOrder()` の第2キー）には影響しない**——
  第1キー（所属セットの発売日 降順）だけで DTR Alter が先頭に決まる

### 4-2. `data/translations.js` — `meta.subtypes` に2語（**先回り。§7 の地雷よけ**）

| 行 | いま | 変更後 |
|---|---|---|
| **113** | `FLUTE: "フルート", FOOD: "食料", FOX: "狐", …` | `FLUTE: "フルート", FOOD: "食料", **FOREST: "森",** FOX: "狐", …` |
| **116** | `KING: "キング", KINGDOM: "王国", …` | `**JELLYFISH: "クラゲ",** KING: "キング", KINGDOM: "王国", …` |

- ⭐ **アルファベット順**を守る（ブロックはすべて昇順）。⚠️ **行番号は編集で動く**ので、
  **`FOOD: "食料", FOX: "狐"` と `KING: ` を目印にする**（どちらも `data/translations.js` に **1回だけ**出る・実測）
- ⭐ **訳語の根拠**: 既存の動物サブタイプは漢字が基調（`FROG: "蛙"` / `CAT: "猫"` / `WOLF: "狼"` / `BIRD: "鳥"`）だが
  カタカナも併存する（`ANTELOPE: "レイヨウ"`）。**クラゲは「海月」より「クラゲ」が一般的**なのでカタカナを採る。
  `FOREST: "森"` は地形系の既存語（`SETTLEMENT: "集落"` / `SPIRE: "尖塔"` / `ISLE: "島"`）に揃えた
- ⚠️ **`meta.rarities` / `meta.types` / `meta.classes` / `meta.elements` は追加不要**（実測で不足0。
  DTR Alter のレアリティは **1,2,3,4,5,7** ですべて登録済み）

### 4-3. 週1更新の3ステップ（CLAUDE.md「大会データの週1更新」）

```bash
node scripts/build-tournament-pages.mjs   # 大会スキャン＋ページ生成
node scripts/build-card-pages.mjs         # ⚠ tournaments の後
node scripts/gen-card-meta-index.mjs      # 日本語検索のメタ索引
npm run validate                          # exit 0
```

⚠️ ⭐ **`build-card-pages.mjs` は 4-1・4-2 を入れた後に回す。** 先に回すと §3 の t0 の状態になる。

⭐ **スナップショットの扱い**: **`GA_SNAPSHOT_MAX_AGE_MIN=0` で固定して回す**ことを推奨する。
理由は §6 の期待値（ファイル数・内訳）が **`fetched_at 2026-10-13T07:50:40.165Z` のスナップショット**で測った値だから。
⚠️ **取り直すと数が動く**（APIが動けば新しいドリフトが入る）。取り直した場合は **§6-3 の分離手順で内訳を測り直し、報告に実測値を書く**。

---

## 5. コミットする範囲

⭐ **cronと同じ8パス**（`.github/workflows/build-tournaments.yml` の `git add` 行が正）:

```
data/tournaments  tournaments  sitemap.xml  cards  sets  data/card-meta-index.json
data/featured-sets.json  index.html
```

＋ 本issueの手書き分 **`data/translations.js`**。

⚠️ **`git add -A` を使わない。** 上のパスを明示する。

---

## 6. ⭐ 期待されるファイル数（#51 の教訓）— **実測値**

### 6-1. `build:cards` だけの差分（`t2` vs コミット済みツリー・スナップショット固定）

| パス | 新規 | 変更 | 合計 |
|---|---:|---:|---:|
| `cards/<slug>/index.html` | **40** | **44** | 84 |
| `cards/index.html` | 0 | **1** | 1 |
| `sets/<slug>/index.html` | **1**（`sets/dtr-alter/`） | **1**（`sets/p26/`） | 2 |
| `sitemap.xml` | 0 | **1** | 1 |
| `index.html`（トップ） | 0 | **1** | 1 |
| `data/translations.js`（手書き） | 0 | **1** | 1 |
| **計** | **41** | **49** | **90** |

### 6-2. ⭐ 44件の「変更されたカードページ」の内訳 — **2群に分かれる**

| 群 | 枚数 | 何が変わるか | 意図内か |
|---|---:|---|---|
| **A. DTR Alter の再録** | **35** | 代表画像（`og:image`・`#cp-main-img`）が **DTR Alter の絵柄に替わる**／サムネ行に1つ増える／「収録セットと版」に1行増える | ⭐ **意図内**。`editionOrder()` の第1キー（発売日 降順）どおりで、`build-card-pages.mjs` の「代表画像は最新版基準」という既存設計のまま |
| **B. P26 のAPIドリフト** | **9** | `Promotional 2026（P26）` の版が後から追加された（`angel-attendant` / `deflecting-edge` / `extraction-incision` / `fractal-of-rain` / `ignite-the-soul` / `proof-of-life` / `reckonings-wake` / `reprogram` / `tidal-lock`） | ⚠️ ⭐ **本タスクと無関係**。ただし **cron が止まっている以上、誰も拾わない**ので**この回に一緒に出すのが正**（§6-4） |

- `sets/p26/index.html` の変更も **B と同じ原因**
- ⭐ **40枚の新規ページはすべて DTR Alter の新規カード**（集合が完全一致することを実測で確認済み）

### 6-3. ⚠️ ⭐ 「無関係な差分が無い」と言える測り方 — **ファイル数でも集合差でも足りない**

CLAUDE.md のとおり、**1つのファイルの中にタスク由来の差分とドリフトが同居しうる**。
⭐ **今回は意図的に大量の差分が出る回**なので、**次の3段で「残った差分が全部説明できる」ことを示す**:

| 段 | やること | 期待値 |
|---|---|---|
| **D1** | `git archive HEAD` で複製を作り、**修正を入れずに** `build-card-pages.mjs` を回して、コミット済みツリーと `diff -rq` | **新規40 / 変更45（カード44＋`cards/index.html`）／`sets` 新規1・変更1／`sitemap.xml`／`index.html`** — ⭐ **これが「手を入れなくても出る差分」の全部** |
| **D2** | 別の複製に **§4-1・§4-2 を入れて**同じことをし、**D1 の出力と `diff -rq`** | ⭐ **差が出るのは次だけ**: **カードページ 75枚**（DTR Alter に版を持つ全カード＝ラベルが素の `DTR Alter` → 正式ラベル）／`cards/index.html`／`index.html`／`sitemap.xml`（`/sets/dtr-alter/` の**出る位置**が変わる）／`sets/dtr-alter/index.html`。⚠️ **`meta.subtypes` 2語ぶんは `scholarly-nettle` と `shamrock-forest` の2枚に出るが、この2枚は 75枚にも新規40枚にも含まれるので、ファイル数は増えない**（実測） |
| **D3** | D2 の結果とコミット済みツリーの差分の**全ファイルが §6-1 の表に収まる**こと | ⭐ **表の外に1ファイルも出ないこと** |

- ⚠️ ⭐ **D1 を飛ばすと、B群9枚を「本タスクが壊した」と読み違える**。⭐ **D1 は「このコミットで出る差分のうち、何が自分のせいでないか」を確定させる唯一の手順**
- ⚠️ ⭐ **`git checkout -- <path>` で複製を戻さない**（CLAUDE.md・#108）。**複製は使い捨てにする**

### 6-4. ⭐ B群（P26ドリフト）をどう扱うか — **分けずに一緒に出す**

CLAUDE.md は「無関係な差分はタスクのコミットに混ぜず、**翌朝のcronに任せる**」と書いているが、
⚠️ ⭐ **cron は 2026-09-18 から停止している**ので、**任せる先が無い**。
⭐ **本作業は「週1更新」そのもの**（＝cronの代行）なので、**B群は週1更新の正規の成果物**として同じコミットに入れるのが正しい。

- ⭐ **ただし報告には §6-2 の表をそのまま書く**（「大会データの更新だけです」と説明しない＝CLAUDE.md の週1更新の節）

### 6-5. `data/card-meta-index.json` の差分 — ⭐ **大きいが正常**（実測）

| 測ったこと | 値 |
|---|---|
| トークン辞書 `d` の長さ | **250 → 251**。⭐ **増えたのは `"DTR Alter"` の1語だけ**（消えたものは 0） |
| エントリ数 | **2,516 → 2,516**（新規40枚は未訳なので載らない） |
| **採番のずれだけで変わったエントリ** | **2,475** |
| ⭐ **中身が実際に変わったエントリ** | **41** ＝ **DTR Alter 再録 35** ＋ **P26ドリフト 6**（`angel-attendant` / `deflecting-edge` / `fractal-of-rain` / `ignite-the-soul` / `reckonings-wake` / `tidal-lock`） |

⚠️ ⭐ **「2,475件も変わった＝壊した」と読まないこと。** `m[slug][0..5]` はトークン辞書への**添字**なので、
**辞書に1語入るだけで以降の添字が全部ずれる**。⭐ **確かめ方**: 旧エントリの添字を旧辞書→新辞書で引き直して比較すると、**41件以外は一致する**。

### 6-6. 大会データぶんのファイル数

⚠️ ⭐ **ここは事前に測れない**（`build-tournament-pages.mjs` が当日のAPIを見るため）。
現状は `data/tournaments/index.json` が **`updatedAt 2026-10-04T12:29:33.401Z` / events 555 / `scan.maxId 65364`**、`pending.json` **191件**。
⭐ **実装報告に「新規N件を収録（555→M大会）」と実測値を書く**（前回 `3039489b` と同じ形）。

---

## 7. ⚠️ `meta.subtypes` を**いま**足す理由（地雷よけ）

- `meta.subtypes` の検査が読むのは **`data/card-meta-index.json`**。索引は**翻訳済みslugしか載せない**
- → ⭐ **`JELLYFISH` / `FOREST` が足りないことは、いまは原理的に見えない**（`validate` は緑）
- → ⚠️ **#139 で `scholarly-nettle` / `shamrock-forest` を和訳した瞬間に exit 1 になる**
- ⭐ **検査は片方向**（「辞書にあるが実データに無い」では落とさない）なので、**先回りで足すのは正当な運用**
  （`validate.mjs` のコメントに明記されている）

---

## 8. #139 との順序 — ⭐ **本issueが先**

⚠️ ⭐ **#139 のどのバッチも `build:cards` を回す**。本issueを先に入れないと、**#139 のバッチ1が §3 の t0 の状態で exit 1 になる**。
⭐ **#139 の設計書にも同じ前提を書いてある**。

---

## 9. 検証項目

⚠️ ⭐ **期待値はすべて 2026-10-13 07:50 UTC のスナップショットで実測した値**。
**取り直したら V3〜V6 の数は動く**ので、その場合は §6-3 の D1/D2 で内訳を測り直し、報告に書く。

| # | 手順 | 期待値 |
|---|---|---|
| **V1** | `git grep -c 'DTR Alter' -- data/translations.js` | **1**（`meta.sets` の1行） |
| **V2** | `grep -c 'FOREST: "森"' data/translations.js` ／ `grep -c 'JELLYFISH: "クラゲ"' data/translations.js` | **どちらも 1** |
| **V3** | 3ステップ実行後、`git status --short` のファイル数を §5 の8パス＋`data/translations.js` で数える | ⭐ **カード: 新規40・変更45／`sets`: 新規1・変更1／`sitemap.xml`・`index.html`・`data/card-meta-index.json`・`data/translations.js` が各1** ＋ **大会データぶん（§6-6・事前に測れない）** |
| **V4** | §6-3 の **D1** を実施 | ⭐ **新規40 / 変更45 / `sets` 新規1・変更1 / `sitemap.xml` / `index.html`** が出る。⚠️ **`data/translations.js` を触っていないのにこれだけ出る**＝この分は本タスク由来ではない |
| **V5** | §6-3 の **D2**（D1 の出力との差） | ⭐ **カードページちょうど 75枚** ＋ `cards/index.html` ＋ `index.html` ＋ `sitemap.xml` ＋ `sets/dtr-alter/index.html`。⚠️ **75枚の集合＝「DTR Alter に版を持つカード」の集合**と完全一致すること |
| **V6** | §6-3 の **D3** | ⭐ **§6-1 の表に無いファイルが1つも出ないこと** |
| **V7** | `npm run validate` | ✅ **exit 0**。⭐ **`meta.sets covers all sets — 64件`**（63→**64**）と **`meta.subtypes covers all subtypes — 156種`**（⚠️ **156のまま動かない**。索引に未訳カードが載らないため） |
| **V8** | `node scripts/build-card-pages.mjs` の最終行 | ⚠️ ⭐ **`⚠ meta.sets 未登録のセット:` の行が出ないこと**。完走サマリは `カード2535ページ(和訳あり2494) / セット64ページ / 索引 / トップの静的セットリンク64本 / sitemap.xml(3160URL)` |
| **V9** | ⭐ **破壊試験**: V7 が緑になった後、`data/translations.js` から **`meta.sets` の1行だけ**を消して `node scripts/validate.mjs` | ⚠️ **exit 1** ＋ `セットページはあるが data/translations.js の meta.sets に無い: dtr-alter`。⭐ **戻すのは `git checkout` ではなく、退避した原本を `cp` で戻す**（CLAUDE.md・#108）。戻した後 `git status --short` が V3 の状態に戻ること |
| **V10** | ⭐ **破壊試験**: `meta.subtypes` の2語を消して `node scripts/validate.mjs` | ⚠️ ⭐ **exit 0 のまま**（＝**この2語は「いま」何も守っていない**）。⭐ **これが §7 の「先回りで足す」の根拠そのもの**なので、**落ちないことを確認して報告に書く**。⚠️ **「落ちないから要らない」と判断しない** |
| **V11** | `data/card-meta-index.json` の差分の中身（§6-5 の確かめ方） | ⭐ **辞書に増えたのは `"DTR Alter"` の1語だけ／実質変化は 41件**（DTR Alter再録35＋P26ドリフト6） |
| **V12** | 生成された `sets/dtr-alter/index.html` | `<title>` が **`Distorted Reflections Alter Ed.（DTR Alter） カードリスト - Grand Archive 日本語カードDB`**（⚠️ **素の `DTR Alter` でないこと**）。収録 **75枚** |
| **V13** | 生成された `cards/index.html` と `index.html`（トップ） | `/sets/dtr-alter/` のリンク文字が **`Distorted Reflections Alter Ed.（DTR Alter）`** で、「その他（プロモ・デモ・イベントパック等）」グループの**先頭**にあること（⚠️ **未登録だと素のラベルで末尾に出る**）・件数表示は **`75枚`** |
| **V14** | 任意の再録カード（例 `cards/starbirth/index.html`） | `og:image` と `#cp-main-img` が **DTR Alter の絵柄のURL**に替わり、「収録セットと版」の**先頭行**が `Distorted Reflections Alter Ed.（DTR Alter）` / `2026-10-16` であること |
| **V15** | ブラウザでトップを開き、エキスパンション絞り込み `#f-set` | **`Distorted Reflections Alter Ed.（DTR Alter）` が選べ、選ぶと 75枚に絞られる**こと |
| **V16** | 新規カードのページ（例 `cards/misty-the-joker/index.html`） | `<h1>` は **英語名のまま**（未訳なので正しい）／⭐ **`🚫 使用禁止：スタンダード` が出る**（⚠️ **発売前の `legality` が `{"STANDARD":{"limit":0}}` だから＝正常**。§10 を参照） |

---

## 10. ⚠️ 発売日（2026-10-16）に起きること — **本issueの範囲外だが申し送り**

- 新規40枚の `legality` はいま **`{"STANDARD":{"limit":0}}`**（実測・40枚すべて）＝ サイトでは **🚫 使用禁止：スタンダード**と出る
- **2026-10-16 に公式APIが `{}` に変わり、禁止表示が一斉に外れる**（CLAUDE.md「公式API」の節）
- ⚠️ ⭐ **cron が止まっているので、表示が変わるのは「次に誰かが `build:cards` を回したとき」**。
  ⭐ **次の週1更新（2026-10-18 予定）で自動的に追いつく**ので、**本issueで特別な手当てはしない**
- ⚠️ **この差分を「大量解禁」と読み違えないこと**（CLAUDE.md の既知の罠）

---

## 11. 判断済み事項

| # | 判断 | 根拠 |
|---|---|---|
| J1 | **ラベルは `Distorted Reflections Alter Ed.（DTR Alter）`** | 既存の Alter 4種が全部 `Alter Ed.` と略している |
| J2 | **`meta.sets` の先頭に入れる** | `release_date` 2026-10-16 が最新。⭐ **同日のセットが他に無いので版の並び順には影響しない**（実測） |
| J3 | **`meta.subtypes` の2語も本issueで足す** | §7。⚠️ **#139 の途中で exit 1 になる地雷を先に外す** |
| J4 | **P26ドリフト9枚は分けずに同じコミットへ** | §6-4。⚠️ **cron が止まっており任せる先が無い**／本作業が週1更新そのもの |
| J5 | **スナップショットは `GA_SNAPSHOT_MAX_AGE_MIN=0` で固定する** | §6 の期待値が固定前提。取り直すなら内訳を測り直して報告に書く |
| J6 | **`meta.rarities` は触らない** | DTR Alter のレアリティ 1,2,3,4,5,7 はすべて登録済み（実測） |

## 12. 未決事項

- ⭐ **本番公開（push / `deploy:prod`）の可否はユーザー判断**。
  ⚠️ CLAUDE.md の週1更新の節のとおり、**「一緒に出るもの」を先に提示する**:

  ```bash
  git fetch origin && git diff --stat <本番位置>..HEAD -- . ':(exclude)docs/*'
  ```

  ⚠️ **「大会データの更新だけです」と説明してはいけない**
