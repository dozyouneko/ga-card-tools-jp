# 未翻訳41枚の和訳（DTR Alter 40枚 ＋ Jinzhuo 1枚）設計 — #139

| 版 | 日付 | 内容 |
|---|---|---|
| 1.0 | **2026-10-13** | 初版。⭐ **太字 `**` を除去したうえで既訳 `terms`（134キー）と全数突き合わせ**、新キーワードが **`marked` 1語だけ**であることを実測した。⭐ **中核語を `マーク` にすると既訳1枚が誤ハイライトされる**ことも実測して回避した。**実装済み項目は無し（全項目が実装待ち）** |

- **呼び名**: 「DTR Alter の和訳」
- **issue**: #139（`enhancement` / `着手可` / `大規模`）
- ⚠️ ⭐ **前提: #138「DTR Alter の辞書追記」が先に入っていること**（→ §2）

---

## 1. 対象（41枚）

| 群 | 枚数 | 置き場 |
|---|---:|---|
| DTR Alter の**新規**カード | **40** | ⭐ **`data/tl/dtr-alter.js` を新設**（既存の `alc-alter.js` / `amb-alter.js` / `doa-alter.js` / `mrc-alter.js` と同じ形） |
| `jinzhuo-bands-of-virtue`（PRXY） | **1** | ⭐ **`data/tl/prxy.js` に追記** |

- ⚠️ **DTR Alter に版を持つカードは 75枚**だが、**35枚は既訳カードの別絵柄（再録）**なので**訳す必要は無い**（slug が同じ）
- 実測の根拠と数え方は起票案（同フォルダ）

---

## 2. ⚠️ ⭐ 前提: #138 が先

**どのバッチも `npm run build:cards` を回す。** #138（`meta.sets` に `DTR Alter`）が入っていないと、
**`build:cards` が `/sets/dtr-alter/` を生成した時点で `npm run validate` が exit 1 になる**（#138 設計書 §3 で実測済み）。

⭐ **`meta.subtypes` の `JELLYFISH` / `FOREST` も #138 で足してある。**
⚠️ **もし #138 が入っていなければ、バッチ1（`shamrock-forest`＝FOREST）とバッチ3（`scholarly-nettle`＝JELLYFISH）で
索引を再生成した瞬間に `meta.subtypes covers all subtypes` が exit 1 になる**（→ V9 で逆向きに確かめる）。

---

## 3. バッチの切り方 — ⭐ **「1バッチが単独で公開できる」ことを満たす4分割**

ユーザー決定（2026-10-13）:「このサイトの意義は**翻訳されているものをいち早く届ける**ことにある」＝ **バッチごとに公開する**。

| バッチ | 枚数 | ファイル | まとまりの理由（＝分割してはいけない理由） |
|---|---:|---|---|
| **0** | **1** | `data/tl/prxy.js` | ⭐ **最優先。** `jinzhuo-bands-of-virtue` は **2026-08-27 から約7週間**未訳で、**唯一「いま実戦で使える」カード**（DTR Alter の40枚は 2026-10-16 発売）。**DTR Alter と何の関係も無いので単独で出せる** |
| **1** | **14** | `data/tl/dtr-alter.js`（**新設**） | ⭐ **サブタイプ `SUITED`（トランプのスート）一族ちょうど全部**（実測で集合一致）。**「Clubs / Trèfle / Clover / Shamrock / Trefoil」をどう訳し分けるかという呼称の決定を1回で済ませる**ため。⚠️ **分割すると、先に公開したバッチと後のバッチで呼称が食い違う**（公開済みなので直すのに再公開が要る） |
| **2** | **13** | `data/tl/dtr-alter.js` | クレリック10枚 ＋ ガーディアン3枚。**アストラ／時間（`time counter`・`time is distorted`）とチェスマンが固まっている** |
| **3** | **13** | `data/tl/dtr-alter.js` | 残り（レンジャー／テイマー／ウォリアー／アサシン／メイジ）。⭐ **`marked` の2枚（`astute-tracker` / `hunters-mark`）を同じバッチに入れてある**——`terms` への追加と、それを使う訳文を**同じコミットで**出すため |

⚠️ ⭐ **バッチ番号は公開の順序でもある。** 0 → 1 → 2 → 3 の順に、**1バッチずつ「実装 → レビュー → 承認 → 公開」を回す**。

### 3-1. バッチ0（1枚）

| 番号 | slug | 英語名 | 種別 | クラス | 属性 |
|---|---|---|---|---|---|
| PRXY #013 | `jinzhuo-bands-of-virtue` | Jinzhuo, Bands of Virtue | REGALIA/ITEM | TAMER | WIND |

- 使われている用語はすべて既訳: `scavenge` / `scavenged` / `quest counter` / `[REST]` / `Banish`
- ⚠️ **`Fabled Emerald Fatestone`（既訳カード名）への参照がある**ので、**既存の訳名と一字一句合わせる**

### 3-2. バッチ1（14枚・SUITED 一族）

| 番号 | slug | 英語名 | 種別 | クラス | 属性 |
|---|---|---|---|---|---|
| #230 | `clover-treehouse` | Clover Treehouse | DOMAIN | RANGER/TAMER | WIND |
| #231 | `club-house` | Club House | DOMAIN | TAMER | WIND |
| #239 | `five-of-clubs` | Five of Clubs | ALLY | RANGER/TAMER | WIND |
| #240 | `four-of-clubs` | Four of Clubs | ALLY | RANGER/TAMER | WIND |
| #248 | `misty-the-joker` | Misty, the Joker | UNIQUE/ALLY | ANOMALY | NORM |
| #261 | `shamrock-forest` | Shamrock Forest | DOMAIN | RANGER/TAMER | WIND |
| #266 | `six-of-clubs` | Six of Clubs | ALLY | TAMER | WIND |
| #268 | `three-of-clubs` | Three of Clubs | ALLY | RANGER/TAMER | WIND |
| #271 | `trefle-queen-of-clubs` | Trefle, Queen of Clubs | UNIQUE/ALLY | TAMER | WIND |
| #272 | `trefoil-tower` | Trefoil Tower | DOMAIN | RANGER | WIND |
| #273 | `trefoliate-anointment` | Trefoliate Anointment | ACTION | RANGER/TAMER | WIND |
| #274 | `two-of-clubs` | Two of Clubs | ALLY | RANGER/TAMER | WIND |
| #278 | `valet-jack-of-hearts` | Valet, Jack of Hearts | UNIQUE/ALLY | WARRIOR | FIRE |
| #279 | `verte-ace-of-clubs` | Verte, Ace of Clubs | UNIQUE/ALLY | RANGER | WIND |

#### ⭐ 呼称は既訳に倣う（**新しく決めない**）

`Clubs` を含むカードは**今回が初**だが、**他スートの既訳が揃っている**（実測）:

| 既訳の実例 | 訳 |
|---|---|
| `Five of Diamonds` | **ダイヤの5** |
| `Four of Spades` | **スペードの4** |
| `Eight of Hearts` | **ハートの8** |
| `Chance, Seven of Spades` | **チャンス、スペードの7** |
| `Bleu, Ace of Diamonds` | **ブルー、ダイヤのエース** |
| `Edelstein, Queen of Diamonds` | **エーデルシュタイン、ダイヤの女王** |

→ ⭐ **`Two of Clubs` → 「クラブの2」**、**`Verte, Ace of Clubs` → 「ヴェルト、クラブのエース」**、
**`Trefle, Queen of Clubs` → 「トレフル、クラブの女王」**、**`Valet, Jack of Hearts` → 「ヴァレ、ハートのジャック」** の形。

⚠️ **`Trefle` / `Verte` / `Valet` はフランス語の人物名**（trèfle＝クラブ、verte＝緑、valet＝ジャック）。
**人物名はカタカナ音写にし、スート名に訳し替えない**（既訳の `Bleu` → `ブルー` と同じ扱い）。
⭐ **`Clover` / `Shamrock` / `Trefoil` は別語として訳し分ける**（クローバー／シャムロック／トレフォイル等）——
**同じ「クラブ」に寄せると4語が区別できなくなる**。⚠️ **1バッチ内で決め切ること**。

### 3-3. バッチ2（13枚）

| 番号 | slug | 英語名 | 種別 | クラス | 属性 |
|---|---|---|---|---|---|
| #223 | `abiding-figures` | Abiding Figures | ACTION | CLERIC | FIRE |
| #226 | `auric-persecution` | Auric Persecution | ACTION | CLERIC | EXALTED/NORM |
| #229 | `ciel-astral-projection` | Ciel, Astral Projection | UNIQUE/ALLY | GUARDIAN | ASTRA |
| #237 | `diligent-garde` | Diligent Garde | ALLY | GUARDIAN | NORM |
| #238 | `escort-the-pawns` | Escort the Pawns | ACTION | CLERIC | WIND |
| #245 | `macabre-subornation` | Macabre Subornation | ACTION | CLERIC | UMBRA |
| #252 | `pallid-arsonist` | Pallid Arsonist | ALLY | CLERIC | FIRE |
| #256 | `render-turbid` | Render Turbid | ACTION | CLERIC | WATER |
| #263 | `silence-the-soul` | Silence the Soul | ACTION | CLERIC | NORM |
| #269 | `time-dilation` | Time Dilation | ACTION | CLERIC | ASTRA |
| #276 | `unwound-timepiece` | Unwound Timepiece | ITEM | CLERIC | ASTRA |
| #277 | `uplifting-rogation` | Uplifting Rogation | ACTION | CLERIC | NORM |
| #281 | `weiss-pawn` | Weiss Pawn | ALLY | GUARDIAN | WATER |

- ⭐ **`Ciel` は既訳のチャンピオン名**（`Ciel` 系が DTR 本体に既にある）。**既存の訳名に合わせる**
- ⭐ **`Weiss Pawn` / `Escort the Pawns` はチェスマン**。既訳の `Golden Pawn` →「ゴールデン・ポーン」、
  `Doubled Pawns` →「ダブルポーン」に倣う

### 3-4. バッチ3（13枚）

| 番号 | slug | 英語名 | 種別 | クラス | 属性 |
|---|---|---|---|---|---|
| #224 | `annealing-flame` | Annealing Flame | ACTION | WARRIOR | FIRE |
| #225 | `astute-tracker` | Astute Tracker | ALLY | RANGER | NORM |
| #227 | `briny-polliwog` | Briny Polliwog | ALLY | GUARDIAN/TAMER | WATER |
| #233 | `coruscation` | Coruscation | PHANTASIA | ASSASSIN | CRUX |
| #234 | `countercurrent-raider` | Countercurrent Raider | ALLY | WARRIOR | WATER |
| #241 | `ghastfire-tormentor` | Ghastfire Tormentor | ALLY | MAGE | FIRE |
| #243 | `hunters-mark` | Hunter's Mark | PHANTASIA | RANGER | NORM |
| #254 | `poitier-afterlifes-conductor` | Poitier, Afterlife's Conductor | UNIQUE/ALLY | WARRIOR | NORM |
| #255 | `radiating-assault` | Radiating Assault | ACTION | ASSASSIN | FIRE |
| #259 | `scalding-aethercharge` | Scalding Aethercharge | ACTION | RANGER | FIRE |
| #260 | `scholarly-nettle` | Scholarly Nettle | ALLY | TAMER | WATER |
| #264 | `silent-trade` | Silent Trade | ACTION | ASSASSIN/MAGE | NORM |
| #282 | `yonder-aetherseeker` | Yonder Aetherseeker | ALLY | RANGER | NORM |

---

## 4. 新キーワードの調査結果 — ⭐ **新語は `marked` 1語だけ**

### 4-1. 調べ方（⚠️ **再測定するときも同じ手順で**）

⚠️ ⭐ **太字・斜体の `*` を必ず除去してから突き合わせる**（CLAUDE.md「環境の注意」。
**#73 はこれを怠って `buff counter` を新語と誤判定し、既訳126枚・183回の実績を見落とした**）:

```js
const clean = s => String(s || "").replace(/\*+/g, " ").replace(/\s+/g, " ").toLowerCase();
```

41枚の `effect` から `**…**` のスパンを全部取り出し、`data/translations.js` の `terms`（**134キー**）と突き合わせた。

### 4-2. 結果

| 太字スパン | 枚数 | 判定 |
|---|---:|---|
| **`marked`** | **2** | ⭐ **新語。** `astute-tracker` / `hunters-mark`。⭐ **既訳カードでの使用は 0件**（実測） |
| `on enter` / `distant` / `floating memory` / `durability` / `cardistry` / `ranged N` / `vigor` / `scavenge N` / `glimpse N` / `intercept` / `true sight` / `sheen` / `ephemeral` / `haunt` / `ephemerate` / `on death` / `foster` / `fostered` / `starcalling` / `time is distorted` / `stealth` / `sacrifice` / `omen` / `prepare N` / `preparation` / `recover N` / `cascade` / `empower N` / `taunt` / `on hit` / `summon` / `siegeable` | — | ✅ **すべて既訳** |

⚠️ ⭐ **「新語に見えて既訳だったもの」4件**（**ここを間違えると #73 の再演になる**）:

| 太字スパン | 正体 |
|---|---|
| `**buff**` | **`**buff** counter`** の一部。`terms["buff counter"]` が既にある |
| `**quest**` | **`**quest** counters`** の一部。`terms["quest counter"]` が既にある |
| `**time**` | `terms["time counter"]` / `terms["time is distorted"]` の一部 |
| `**On Champion Hit**` | ⚠️ ⭐ **`on hit` に「Champion」が語中へ挿入された形**。CLAUDE.md が記録している既知の型で、**新語ではない**。⭐ **訳文に「ヒット時」が出れば訳文ゲート側で拾われる**（2026-08-30 の案C′以降） |

### 4-3. 斜体のリマインダー文（10種）もすべて既訳の範囲

`Siegeable — This domain can be attacked…` / `To glimpse, …` / `At the beginning of your recollection phase…`（foster）/
`They can't be targeted by attacks unless permitted by true sight.` / `While paying for a memory cost…`（floating memory）など、
**`Units stay marked until the beginning of their controller's turn.` 以外は既訳の用語で説明がつく**。

### 4-4. ⚠️ 公式APIに用語の定義を返すエンドポイントは無い

`/keywords` `/rules` `/glossary` はいずれも **404**（CLAUDE.md・#73 で実測）。
⭐ **`marked` の `desc` に書いてよいのは、リマインダー文と効果文から読み取れることだけ**:

- `Units stay **marked** until the beginning of their controller's turn.`
- `If a **marked** object would take damage for the first time each turn, it takes that much damage plus 1`（`hunters-mark`）

⚠️ ⭐ **裏の取れないことを断定して書かない。** とくに
**「マークは複数個重なるのか」「ユニット以外（オブジェクト）もマークできるのか」は、この2枚の文面だけでは決まらない**——
⭐ **`astute-tracker` / `hunters-mark` は「ユニットがマーク状態になる」と書き、`hunters-mark` の2つ目の能力は「マーク状態のオブジェクト」と書く**（**原文の語をそのまま写す**）。**`desc` でそれを一般化しない**。

---

## 5. ⭐ `terms` に足す1語 — **中核語は `マーク` にしてはいけない**

### 5-1. ⚠️ 実測: 中核語を `マーク` にすると既訳カードが1枚誤ハイライトされる

`matchedTerms()` は、**英語キーが当たらなかった用語について、`jp` の「（」より前（＝中核語）を和訳の効果文から `indexOf` で探す**
（2026-08-30 の案C′）。つまり **中核語はそのまま「訳文側のゲート」兼「ハイライトする文字列」**になる。

⭐ **既訳カードのうち、和訳の効果文に `マーク` を含むのは 1枚**（実測・2,516件を全数走査）:

| カード | 該当箇所 |
|---|---|
| `lesser-boon-of-artemis`（アルテミスの小さな恩恵） | 「…、他のタイプに加えて**テイマーク**ラスである。」 |

⚠️ ⭐ **「テイマークラス」の中に「マーク」が入っている。**
中核語を `マーク` にすると、**このカードの用語解説に「マーク」が現れ、本文の「テイ`マーク`ラス」が
`term-hl` で切り刻まれる**（英語側に `\bmarked` が無いので訳文ゲートが働く）。

### 5-2. ⭐ 決定: `jp` は **`マーク状態（marked）`**（中核語 = `マーク状態`）

```js
  "marked": {
    jp: "マーク状態（marked）",
    desc: "<リマインダー文から読み取れる範囲で書く>",
  },
```

| 確認したこと | 結果 |
|---|---|
| 既訳 2,516件の和訳に **`マーク状態`** を含むものがあるか | ⭐ **0件**（＝誤ハイライトは起きない） |
| 既存 `terms` 134キーの中核語に重複があるか | ⭐ **0件**（実測）。`マーク状態` も**重複しない**（`マー` を含むのは `グリマーカウンター` だけで、中核語としては別物） |
| 英語側のゲート `\bmarked` の誤爆 | ⭐ **無し**。`marked` を英語効果文に含むカードは**スナップショット全体で2枚だけ**で、**両方とも本件の対象** |

### 5-3. ⚠️ ⭐ これは訳文の書き方を縛る

**中核語が「用語を採るかどうかのゲート」そのもの**なので、

> ⭐ **`astute-tracker` / `hunters-mark` の和訳では、必ず「マーク状態」という字面を使う。**
> ⚠️ 「マークされる」「マークを付ける」だけだと**中核語に当たらず、用語解説もハイライトも出ない**。

例: `target unit becomes **marked**` → **「対象のユニットは**マーク状態**になる。」**／
`If a **marked** object would take damage` → **「**マーク状態**のオブジェクトが…」**

⚠️ ⭐ **既存の訳語は言い換えない**（CLAUDE.md:「訳語を言い換えるときは `terms` の `jp` も同時に直す」）。
**本バッチで触る `terms` は `marked` の1語だけ**。

---

## 6. 各バッチの手順（**4回とも同じ**）

```bash
# 1) 訳を書く（data/tl/dtr-alter.js または data/tl/prxy.js）
node scripts/gen-tl-json.mjs            # data/tl-names.json / data/tl-effects.json を再生成
npm run build:cards                     # カード/セット/sitemap
node scripts/gen-card-meta-index.mjs    # ⭐ 必須。訳したカードが初めてJP検索の索引に載る
npm run validate                        # exit 0
```

⚠️ ⭐ **`gen-card-meta-index.mjs` を飛ばさない。** 未翻訳カードは索引に載らないので、
**飛ばすと「訳は出るのに日本語モードの検索で見つからない」**という中途半端な公開になる。

⭐ **スナップショットは `GA_SNAPSHOT_MAX_AGE_MIN=0` で固定する**（#138 と同じ）。
⚠️ **バッチの途中で取り直すと、そのバッチのコミットに無関係なAPIドリフトが混ざる**。

### コミットする範囲（バッチ共通）

```
data/tl/dtr-alter.js （または data/tl/prxy.js）
data/tl-names.json  data/tl-effects.json
cards  sets  sitemap.xml  index.html  data/card-meta-index.json
data/translations.js （⚠ バッチ3 の terms 追加のときだけ）
```

⚠️ **`git add -A` を使わない。**

---

## 7. ⭐ ファイル数の見積もり — **各バッチで「変わるべきページ」の数**

⚠️ ⭐ **バッチNで訳した枚数 K に対し、`cards/` の変更は K 枚 ＋ α になる**。α の正体:

| α の出所 | 内訳 |
|---|---|
| そのカードが**版を持つセットのセットページ** | `sets/dtr-alter/index.html` は**毎バッチ変わる**（カード名が英語→日本語になるため）。`sets/prxy/index.html` はバッチ0で変わる |
| `cards/index.html` / `index.html`（トップ） | ⭐ **変わらないはず**——どちらも**セット名と枚数しか出していない**（カード名を出していない）。⚠️ **変わったら理由を説明すること** |
| `sitemap.xml` | ⭐ **URL は1本も増えない**（#138 で既に 3,160URL 全部が存在する）。⚠️ **差分が出たら中身を見て、何が動いたかを報告に書く**（予測しない） |
| **他のカードページ** | ⚠️ ⭐ **カード名の相互参照**。訳したカードの名前を効果文で参照している**既訳カード**があると、そのページも変わる。⭐ **これは意図内** |
| `data/card-meta-index.json` | ⭐ **毎バッチ変わる。** 訳した K 枚が**新しく索引に載る**（`m` のエントリが K 件増える）。⚠️ **辞書 `d` にトークンが増えると既存エントリの添字がずれて大量の行が変わる**——#138 設計書 §6-5 と同じ読み方をする |

⭐ **「ファイル数」ではなく「集合」で説明する**: **変更されたカードページの集合が
「そのバッチで訳した K 枚」∪「それらのカード名を参照している既訳カード」と一致すること**を報告に書く。
⚠️ **一致しないものが出たらAPIドリフト**（#138 設計書 §6-3 の D1 と同じ手順で分離する）。

---

## 8. 検証項目

⚠️ ⭐ **V1〜V8 は毎バッチ実施する。** 期待値の `K` はそのバッチの枚数（0:1 / 1:14 / 2:13 / 3:13）。

| # | 手順 | 期待値 |
|---|---|---|
| **V1** | `node -e` 等で `data/tl-names.json` のキー数を数える | ⭐ **前バッチ +K**（2,516 → 2,517 → 2,531 → 2,544 → **2,557**） |
| **V2** | `npm run validate` | ✅ **exit 0**。⭐ **`loaded OK — total cards:` が V1 と同じ値**／**`generated JSON up to date`** |
| **V3** | `node scripts/build-card-pages.mjs` の完走サマリ | ⭐ **`カード2535ページ(和訳あり NNNN)` の NNNN が V1 と一致**（2494 → 2495 → 2509 → 2522 → **2535**）。⚠️ **`⚠ meta.sets 未登録のセット:` の行が出ないこと** |
| **V4** | `node scripts/gen-card-meta-index.mjs` の完走サマリ | ⭐ **`生成: NNNNslug`** が V1 と一致（2516 → … → **2557**）。⭐ **`prefix の無い版: 0件`** |
| **V5** | `git status --short` の `cards/` の変更一覧 | ⭐ **§7 の集合と一致**（訳したK枚 ∪ 名前を参照している既訳カード）。⚠️ **それ以外が出たらドリフトとして分離し、内訳を報告に書く** |
| **V6** | 訳したカードのページを1枚開く（例 バッチ1: `cards/two-of-clubs/index.html`） | `<h1>` が**日本語名**／`<h2>効果（日本語）</h2>` の節が在る／⚠️ **`🚫 使用禁止：スタンダード` は 2026-10-16 まで出たままが正**（#138 設計書 §10） |
| **V7** | ブラウザでトップを**日本語モード**にして、訳した名前の一部で検索 | ⭐ **K枚が全部ヒットすること**（⚠️ **索引を再生成していないとヒットしない**＝V4 を飛ばした検出） |
| **V8** | `npm run validate` の `card term highlights up to date — NNNN ページ / MMMM 節` | ⭐ **`2535 ページ / 2557 節` のまま、4バッチを通して1つも動かない**（実測で裏取り済み）。⚠️ ⭐ **未訳カードのページにも空の `<h2>効果（日本語）</h2><p class="cp-effect">` が出ている**ので、**訳を入れても節は増えない**（2535 ＋ 裏面22 ＝ 2557）。⚠️ ⭐ **動いたら、効果節のマークアップが変わったか、生成ページ数が変わったかのどちらか**——理由を説明すること |
| **V8-b** | ⚠️ V2 が **exit 1** で `CARD TERM HIGHLIGHTS` を出したとき | ⭐ **実装の不備ではなく「訳文に既存用語の中核語が入っているのにハイライトされていない」**＝ **その用語を取りこぼしている**信号。⭐ **まず訳文と `terms` の中核語を見る**（設計担当に上げる前に） |

### バッチ1 と バッチ3 だけの項目（`meta.subtypes` が初めて効く）

⭐ **`meta.subtypes covers all subtypes — N種` の N は、訳したカードのサブタイプが索引に初めて載るたびに増える。**
⚠️ ⭐ **増えるのはこの2語だけ**（残り28種のサブタイプは既訳カードで索引に出ている・実測）:

| # | バッチ | 期待値 |
|---|---|---|
| **V9-0** | バッチ0 の後 | **156種**（変わらない） |
| **V9-1** | **バッチ1** の後（`shamrock-forest`＝`FOREST`） | ⭐ **156 → 157種**。⚠️ ⭐ **#138 が入っていなければ、ここで `実データにあるが data/translations.js の meta.subtypes に無い: FOREST` で exit 1** |
| **V9-2** | バッチ2 の後 | **157種**（変わらない） |
| **V9-3** | **バッチ3** の後（`scholarly-nettle`＝`JELLYFISH`） | ⭐ **157 → 158種**。⚠️ ⭐ **#138 が入っていなければ `… に無い: JELLYFISH` で exit 1** |

### バッチ3 だけの項目（`marked` の追加）
| **V10** | `cards/astute-tracker/index.html` と `cards/hunters-mark/index.html` を開く | ⭐ **効果文の「マーク状態」が `term-hl` で囲まれている**／⭐ **用語解説の節に「マーク状態（marked）」が1行ある** |
| **V11** | ⚠️ ⭐ **誤ハイライトが無いこと**: `cards/lesser-boon-of-artemis/index.html` | ⭐ **「テイマークラス」が `term-hl` で切られていないこと**／⭐ **用語解説に「マーク状態」が出ないこと**。⚠️ **`grep -c 'term-hl' cards/lesser-boon-of-artemis/index.html` を変更前後で比べ、同じ値であること** |
| **V12** | ⭐ **破壊試験（識別力の確認）**: `terms["marked"].jp` を一時的に **`マーク（marked）`** に変えて `npm run build:cards` を回す | ⚠️ ⭐ **`cards/lesser-boon-of-artemis/index.html` に「マーク」の `term-hl` が出て、用語解説にも1行増えること**（＝ §5-1 の誤ハイライトが**実在する**ことの確認）。⭐ **確認したら原本を `cp` で戻す**（⚠️ **`git checkout -- ` は使わない**＝CLAUDE.md・#108）。戻した後 `git status --short` が V5 の状態に戻ること |
| **V13** | ⭐ **破壊試験（中核語ゲートの確認）**: `astute-tracker` の訳文の「マーク状態」を「マークされた状態」に一時的に書き換えて `build:cards` | ⚠️ ⭐ **そのページから「マーク状態」の `term-hl` と用語解説の行が消えること**（＝ §5-3 の「字面を変えると用語が消える」が**実在する**ことの確認）。⭐ 確認したら `cp` で戻す |

⚠️ ⭐ **V12・V13 は「落ちる」と書いた項目なので、実際に落ちることまで測ってから報告する。**
**落ちなかったら、それは実装の不備ではなく検証条件に識別力が無い可能性がある**（CLAUDE.md の4度＋2型）——
**そのときは設計担当に確認事項として上げること。**

---

## 9. ⚠️ `jinzhuo-bands-of-virtue` が7週間取りこぼされた件 — ⭐ **検出経路は派生issueにする**

### 9-1. 原因（実測）

`data/tl/prxy.js` は `3333926a`「Translate Proxia's Vault (PRXY) — **11 cards; set complete**」で**完了扱い**になった。
その後 PRXY は **13枚**に増え、1枚は訳されたが本件は残った。
カードページの初出は **`03ff53a5`（2026-08-27 の定期再生成）**。

⭐ **型は「既存セットにカードが1枚増えた」**:

| 既存の経路 | 反応するか |
|---|---|
| `meta.sets` の検査（#40） | ❌ **新しい prefix にしか反応しない**。PRXY は登録済み |
| `meta.subtypes` / `meta.rarities` の検査 | ❌ 未訳カードは索引に載らないので**そもそも見えない** |
| `build:cards` の完走サマリ `カード2535ページ(和訳あり2494)` | ⚠️ **差は出ているが「41枚未訳」としか読めず、内訳が無い**。⭐ **新セット直後は41枚が正常なので、誰も異常と読めない** |
| `check-terminology.mjs` | ❌ 用語の話であって未訳の話ではない |

### 9-2. ⭐ 成立する判別子を1つ見つけた（実測）

> **未訳カードのうち、その版の prefix に対応する `data/tl/<slug>.js` が既に在るもの**

⭐ **今日の実測**: **ちょうど 1件（`jinzhuo-bands-of-virtue`・PRXY）**。
**DTR Alter の40枚は `data/tl/dtr-alter.js` がまだ無いので引っかからない**（＝誤検出 0）。

### 9-3. ⚠️ ⭐ だが **exit 1 にはできない**（理由は「未訳は常にありうる」より強い）

⚠️ ⭐ **この判別子は、本issueのバッチ運用そのもので壊れる**:

> **バッチ1 で `data/tl/dtr-alter.js` を新設した瞬間、残り26枚が全部「訳ファイルが在るのに未訳」になって exit 1 になる。**

⭐ **バッチごとに公開する**という本issueの決定（ユーザー決定）と**正面から衝突する**ので、
**exit 1 にする検査は成立しない**。⚠️ **「未訳は常に存在しうるから」という一般論よりも、こちらが決定的な理由**。

→ ⭐ **成立するのは「報告行」だけ**（`npm run validate` の成功行に内訳を出す・`meta.rarities` と同じく
**スナップショットが無ければスキップと明記して緑**）。例:

```
untranslated cards — 41枚（新セット 40 / 既訳セットの取りこぼし 1: jinzhuo-bands-of-virtue）
```

⚠️ ⭐ **残る穴**（起票案に書くこと）: **訳ファイルが無い prefix にだけカードが増えた場合は引っかからない**。
⭐ **実測: 訳ファイルを持たない prefix が 24種ある**（`SP4` / `PP1` / `EVP` など。別セットと slug を共有するため全カードが訳済み）。
**そこへ新カードが1枚足されても、この判別子は沈黙する。**

### 9-4. ⭐ 派生issueとして起票する

- 本issueの作業範囲には**入れない**（和訳とは別のもの）
- ⭐ **起票案は `派生起票案_2026-10-13_未訳カードの取りこぼし検出.md`（同フォルダ）に置く**

---

## 10. 判断済み事項

| # | 判断 | 根拠 |
|---|---|---|
| J1 | **4バッチ（1 / 14 / 13 / 13）に分け、0 → 1 → 2 → 3 の順に公開する** | §3。**バッチ0は発売済みで最優先／バッチ1は呼称の決定を1回で済ませる単位** |
| J2 | **`data/tl/dtr-alter.js` を新設**（PRXY は `data/tl/prxy.js` に追記） | 既存の Alter 4セットと同じ形。`index.html` の編集は不要（#22フェーズ2） |
| J3 | **`terms` に足すのは `marked` の1語だけ** | §4。太字 `**` 除去のうえ134キーと全数突き合わせ |
| J4 | **中核語は `マーク状態`（`マーク` にしない）** | §5。⚠️ **`マーク` だと `lesser-boon-of-artemis` の「テイマークラス」を誤ハイライトする**（実測） |
| J5 | **スート名・人物名は既訳に倣う**（クラブの2／ヴェルト、クラブのエース 等） | §3-2。既訳の Diamonds / Spades / Hearts 系が揃っている |
| J6 | **`meta.subtypes` の追加は #138 の担当**。本issueでは触らない | §2。地雷を先に外してある |
| J7 | **未訳取りこぼしの検出は派生issue**。`exit 1` にはしない | §9-3。⚠️ **バッチ運用と衝突する**ため |

## 11. 未決事項

- ⚠️ ⭐ **各バッチの公開（push / `deploy:prod`）の可否はユーザー判断。**
  ⭐ **CLAUDE.md の「`push待ち` が残っているうちに次のタスクの実装をコミットしない」に従い、
  バッチNを公開してから バッチN+1 の実装に入る**（⚠️ **溜めると1バッチだけを公開する手段が無くなる**）
- ⭐ **訳文そのもの（語選び）は開発担当の裁量**。ただし §4-4・§5-3 の制約と、`TRANSLATION.md` の既存方針に従う。
  ⚠️ **判断に迷ったら実装側で決めず、issueに書いて設計担当の回答を待つ**
