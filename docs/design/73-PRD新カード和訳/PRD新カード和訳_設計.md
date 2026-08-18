# タスク#73: PRD（.asphodel/paradise）新カード254枚の和訳 設計書

GitHub issue: [#73](https://github.com/dozyouneko/ga-card-tools-jp/issues/73)

## 改版履歴

| 日付 | 版 | 内容 |
|---|---|---|
| 2026-08-18 | 初版 | 実データ調査（未訳254枚の内訳・新キーワード10種）を実施。ユーザー決定4件（訳文の作成主体・優先順位・ファイル分割・`Aenean`表記・チャンピオン名方針）を反映し、バッチ1〜3の期待値を実測で確定。**バッチ1（44枚）が実装待ち**、バッチ2（176枚）・バッチ3（34枚）は本設計書のルールを流用して継続 |
| 2026-08-18 | 第2版 | ⚠️ **ユーザー指摘により初版の誤りを訂正**: `buff counter` は**新キーワードではなく既訳のある既存キーワード**（Forest Cake 等・既訳126枚に183回出現／`terms` にも `バフカウンター` が登録済み）。初版の突合が**太字マークを除去せず**に文字列一致を取っていたため、`**buff** counter` の形を拾えていなかった。→ **新キーワードは9種**に訂正し、`terms` の追加も **9件→8件**に修正（§1-3・§2-2）。他9種は正しい手法で再検証し新規で確定。**枚数・バッチ・検証項目の期待値に変更なし** |
| 2026-08-18 | 第3版 | **バッチ1(44枚)の実装を承認**(コミット `c1b7ea00`・レビュー合格)。ユーザー決定2件を反映: ①**Cascadeの解説文は断定を外した文面に差し替える**(§2-2末尾)②**ハイテク製品ラインの訳語はカタカナ統一**(§2-6を新設)。開発担当の確認事項A(`[レスト]`)・B(波及差分)を**承認**し、§2-3の`[REST]`表記の誤りを訂正・§5 V5に波及差分を明記。⚠️ **残作業2点**(`dante-hemomancer`のリネージュ注記・Cascade解説文の差し替え)は`実装待ち`に戻す |
| 2026-08-18 | 第4版 | **バッチ1(44枚)完了**。第3版の残作業2点を `576afc0a` で実装しレビュー合格・設計承認。`dante-hemomancer` のリネージュ注記は他4枚と同一書式で5/5に、`terms.cascade.desc` は§2-2の確定文面と**一字一句一致**(237バイト・diffゼロ)を確認。⭐ APIドリフトの混入0件(`build:cards` がスナップショットキャッシュを再利用したため)。**ユーザーのpush判断待ち**(`push待ち`)。次は**バッチ2(176枚)**だが、⚠️ 出力量がバッチ1の2.9倍(約86KB)のため**60枚×3分割**を推奨(§3の1単位のままでは1ターンに収まらない見込み) |
| 2026-08-18 | 第5版 | **バッチ2（176枚）の設計を確定**（バッチ1はpush・本番反映まで完了）。⭐ パイロット計測（44枚を1ターンで完走）に基づき **44枚×4サブバッチ**に分割（176＝44×4）し、**サブバッチAに命名リスクの高い語族（Aenean 17／Droid 13／Tech系 13／Bladehand 1）を集約**（§9-1・§11）。レビューは **A → 合格後にB+C+D の2ユニット**（ユーザー決定）。§2-7 に**命名ルール9語族**を新設し、Droid複合語5枚の訳名をユーザー確定。⭐ **`terms` の追加は0件**であることを実測で確定（§10 V4）。検証項目は段階ごとの期待値を全て実測（未訳数・エントリ数・索引slug数・**セットページの `cp-en-inline` 数**）。⚠️ **`sets/evp/` が正当な差分に含まれる**ことを発見（EVP収録2枚）＝ドリフト誤認の防止 |

## 目的

新セット **`.asphodel/paradise`（PRD系6セット）** の**未訳254枚**に日本語訳を追加し、
「全カード翻訳済み」状態を回復する。

⚠️ #71（`meta.sets` 登録）とは別作業。#71 は絞り込み・ラベルの復旧で、訳の有無とは独立している。
**254枚は現在も本番で英語名のまま公開されている**（8/16のcronが自動publish済み・fail-open）。

発売日は **2026-08-21**。注目度が最も高くなる直前のため、主要カードから段階的に公開する。

---

## 1. 調査結果（2026-08-18・スナップショット `2026-08-17T13:02:21Z` + 公式API実測）

### 1-1. 未訳254枚の内訳

**主セット別**（後述の代表prefixルールで1枚を1セットに割り当てた数。合計＝254）:

| 主セット | 枚数 |
|---|---:|
| PRD | 211 |
| PRDP（パンテオン） | 14 |
| PRDSD（スターター） | 11 |
| PRDDP（ドラフト） | 10 |
| PRD 1st | 8 |
| **合計** | **254** |

**タイプ別**:

| タイプ | 枚数 | | タイプ | 枚数 |
|---|---:|---|---|---:|
| ACTION | 67 | | LESSER BOON | 10 |
| ALLY | 66 | | **CHAMPION** | **9** |
| REGALIA/ITEM | 24 | | REGALIA/WEAPON | 4 |
| ITEM | 22 | | GREATER BOON | 4 |
| UNIQUE/ALLY | 14 | | UNIQUE/DOMAIN | 3 |
| ATTACK | 11 | | その他（DOMAIN・TOKEN・MASTERY等） | 10 |
| PHANTASIA | 10 | | | |

### 1-2. ⚠️ prefix別の未訳数を単純に足すと254にならない

公式APIの `prefix` は**完全一致**（`PRD` に `PRDSD` は含まれない）。一方、**1枚のカードが複数のprefixに収録される**ため、
`scaffold.mjs` の `untranslated` を全prefix分足すと **305** になる（ユニークslugは254）。

| prefix | `fetched` | `untranslated` |
|---|---:|---:|
| PRD | 232 | **211** |
| PRD 1st | 27 | **26** |
| PRDG | 21 | **0** |
| PRDP | 14 | **14** |
| PRDSD | 61 | **44** |
| PRDDP | 39 | **10** |
| PRDEVP | 33 | **0** |
| 単純合計 | — | **305**（重複あり） |
| **ユニークslug** | — | **254** |

（全7prefixとも 2026-08-18 に `node scripts/scaffold.mjs <prefix>` で実測。PRDG・PRDEVP は既訳カードの再録のみで未訳0）

⭐ **開発担当への注意**: 進捗を「305枚中◯枚」と数えない。**正は254**。

### 1-3. 新キーワード**9種**（既訳セットに一度も出現しない＝訳語を新規に決める必要がある）

既訳2,262枚の英語効果文コーパスおよび `terms` 辞書と突き合わせて、いずれにも無かったもの:

| English | PRD内の出現 | 備考 |
|---|---:|---|
| **static** counter | 29 | アルケイン属性の新カウンター |
| **Cascade** | 21 | **箇条書きで効果が変わる新メカニクス**。訳出の型を §2-3 で規定 |
| **Elysian Aura** | 10 | リマインダー文つき |
| **Sword Weapon Link** | 4 | 既存 Ally Link の派生 |
| **Link Shield** | 4 | |
| **Multistrike** N | 3 | |
| **Dante Lineage** | 3 | 先例あり（Tristan / Lorraine Lineage） |
| Elysian Test Subject | 3 | トークン名（太字ではない） |
| **Aenean Progression** | 2 | |
| Non-Champion **Object Link** | 1 | 既存 Ally Link の派生 |

**既訳を流用できるもの**（新規に訳を作らない）: **`buff counter`（バフカウンター）**・`Level Locked`・`Powercell`・
`Deluge`・`Ephemerate`・`scavenge`・`true sight`・`Stealth`・`Spellshroud`・`Bulwark`・`Vigor`・`Empower`・
`Recover`・`Ally Link`・`Floating Memory`

#### ⚠️ 初版の誤りと、突合するときの注意（第2版で追記）

初版はこの表に **`buff counter` を新キーワードとして載せていたが誤り**だった（ユーザー指摘で発覚）。
実際は**既訳126枚に183回出現**する既存キーワードで、`terms` にも `buff counter => バフカウンター` が登録済み。

原因は突合方法にある。効果文は **`put a **buff** counter on that ally.`** のように
**キーワードだけが太字**になるため、`"buff counter"` の素の文字列一致では**語間の `**` に阻まれて0件になる**。

⭐ **英語効果文で語句を突き合わせるときは、必ず太字・斜体マークを除去してから比較する**:

```js
const clean = s => String(s || "").replace(/\*+/g, " ").replace(/\s+/g, " ").toLowerCase();
```

（第2版では上記 `clean()` で全語を再検証済み。残り9種は既訳コーパス・`terms` とも出現0で**新規と確定**）

### 1-4. セットの世界観

`.asphodel/paradise` は**ダンテ『神曲』モチーフ**（Asphodel＝ギリシャ神話の冥界の野）。
フレーバーに **Virgil**（ウェルギリウス）が登場し、L4 Dante は **Divine Comedy mastery**（＝『神曲』）を得る。
`Aenean` はウェルギリウス『アエネーイス』(Aeneid) 由来の形容詞。

---

## 2. 決定事項

### 2-1. ⚠️ 訳文の作成主体（ユーザー決定・2026-08-18）

**設計担当が用語とルールを確定し、254枚の訳文そのものは開発担当が書く。**

- 設計担当が確定するもの: **新キーワードの対訳（§2-2）・Cascadeの訳出テンプレート（§2-3）・
  チャンピオン9枚のカード名（§2-4）・ファイル分割とバッチ（§3）**
- 開発担当が書くもの: 上記に従った**残りの訳文（カード名・効果・フレーバー）**

⚠️ **これは「開発担当は仕様を決めない」規約（CLAUDE.md 越権の禁止）の意図的な例外**である。
先例 #1 は3枚だったため設計書に全訳文を書けたが、254枚では同じ形が成立しないためユーザー判断で例外とした。

- **例外の範囲は「§2の確定事項に機械的に従って書ける訳文」に限る。**
  判断が要るもの（新しいキーワードがさらに出た・既訳と矛盾する・固有名詞の定訳が無い）は
  **勝手に決めずissueに書いて設計担当の回答を待つ**（規約どおり）

### 2-2. 新キーワード対訳表（確定）

TRANSLATION.md の規則「**キーワード能力名はカタカナ**／能力の動作は和訳／カウンター名はカタカナ+カウンター」に従う。

| English | 日本語（確定） | 根拠 |
|---|---|---|
| ~~buff counter~~ | **バフカウンター** | ⚠️ **新規ではない。既訳の定訳をそのまま使う**（第2版で訂正）。`terms` 登録済みなので**追加しないこと** |
| static counter | **スタティックカウンター** | 既存「バルワークカウンター」「ウィザーカウンター」と同型 |
| Cascade / cascade | **カスケード** | キーワード能力名＝カタカナ |
| Elysian | **エリュシオン** | ⚠️ **既訳あり**（「エリュシオンのアストロラーベ」）。**新規に決めず踏襲する** |
| Elysian Aura | **エリュシオンオーラ** | 上記＋カタカナ規則 |
| Elysian Test Subject | **エリュシオンの被験体** | トークン名。称号部は意訳（§2-4と同じ流儀） |
| **Aenean** | **アエネアン** | ⭐ **ユーザー決定（2026-08-18）**。ラテン語読みで `Elysian`＝エリュシオンと系統を揃える |
| Aenean Spell | **アエネアン・スペル** | |
| Aenean Progression | **アエネアン・プログレッション** | |
| Non-Champion Object Link | **ノンチャンピオンオブジェクトリンク** | 既存「アライリンク」(Ally Link) と同型（中黒を入れない） |
| Sword Weapon Link | **ソードウェポンリンク** | 同上 |
| Link Shield | **リンクシールド** | 同上 |
| Multistrike N | **マルチストライクN** | 既存「デリュージN」「エンパワーN」と同型（数字を詰める） |
| Dante Lineage | **ダンテ・リネージュ** | 既存「トリスタン・リネージュ」「ロレイン・リネージュ」と同型 |
| Divine Comedy（mastery） | **神曲** | 『神曲』の定訳。マスタリー名 |
| Virgil | **ウェルギリウス** | 『神曲』の定訳（フレーバー内） |

⚠️ **`data/translations.js` の `terms` にも追加する**（効果文の用語ハイライト・解説に使われる）。
登録形式は既存に倣い **`日本語（English）`**（例: `スカベンジ（Scavenge N）`）。
追加対象は上表のうち **Cascade・Elysian Aura・Multistrike・Link Shield・
Non-Champion Object Link・Sword Weapon Link・static counter・Dante Lineage** の **8件**。

- （`Aenean` 系は能力名ではなく形容詞のため terms には入れない）
- ⚠️ **`buff counter` は追加しない**（第2版で訂正）。**既に `buff counter => バフカウンター` が登録済み**で、
  重ねて書くと既存定義を上書きしてしまう。追加前に必ず
  `grep -n "buff counter" data/translations.js` で**既存の登録を確認する**

#### Cascade の `terms` 解説文（確定・第3版／ユーザー決定）

⚠️ **公式APIにキーワード定義は存在しない**（`/keywords` `/rules` `/glossary` とも404。カードの `rule` フィールドは
個別カードのエラッタ・裁定であって用語定義ではない）。**裏が取れない仕様を断定して書かないこと。**

確定する `terms.cascade.desc` の文面:

```text
起動・誘発するたびに、解決する効果が番号順（1→2→3…）に切り替わるキーワード。カードにはモードごとの効果が並記され、その回に対応する番号の効果だけを解決する。
```

- 根拠はカード上の観測事実のみ: リマインダー文「この能力は**カスケード**するたびに変化する」＋全13枚のモード番号
- ⚠️ **「このゲーム中の累計」のようなカウント範囲を書かない**（カードが場を離れて戻った際の扱いが不明なため）


### 2-3. Cascade の訳出テンプレート（確定）

原文は「`Cascade—` に続けて `• N— 効果` を並べ、末尾にリマインダー文」という形を取る。
**箇条書き記号 `•` と区切りのダッシュ `—` は原文の形をそのまま残す**（既存の効果文でも記号は原文準拠）。

原文例（Bedlam Borough）:

```text
(2), [REST]: **Cascade**—
• 1, 2, and 3— **Summon** a Powercell token rested.
• 4— Sacrifice CARDNAME and draw a card.
```

確定する訳文の型:

```js
"bedlam-borough": {
  name: "ベドラム区",
  effect:
    "(2)、[レスト]：**カスケード**—\n" +
    "• 1、2、3— パワーセル・トークンを1体レスト状態で**召喚**する。\n" +
    "• 4— 「ベドラム区」を**サクリファイス**し、カードを1枚引く。",
},
```

規則:

1. `Cascade—` → **`**カスケード**—`**（ダッシュは原文のまま `—`）
2. `• N—` の**数字と `•` と `—` はそのまま**。`1, 2, and 3—` は **`1、2、3—`**（全角読点・"and"は落とす）
3. 各モードは**改行 `\n` で区切る**（`\n\n` ではない。原文が1段落のため）
4. リマインダー文 `*(This ability changes each **cascade**.)*` →
   **`*（この能力は**カスケード**するたびに変化する。）*`**
5. `CARDNAME` は**そのカードの日本語名に置換し「」で囲む**（TRANSLATION.md の既存ルール）
6. ⚠️ **`[REST]` は `[レスト]` と訳す**（第3版で訂正）。初版の上記コード例は `[REST]` のままだったが**記載ミス**。
   既訳コーパスは **`[レスト]` が154件・実訳出中の `[REST]` は0件**（2026-08-18実測）で、カタカナが定訳。

### 2-4. チャンピオン9枚のカード名（確定）

方針は**意訳型**（ユーザー決定・2026-08-18）。既訳 Lorraine 5枚（「ロレイン、クラックスの騎士」
「ロレイン、剣の達人」「ロレイン、放浪の戦士」「ロレイン、昇華せし翼」「ロレイン、精霊の支配者」）の流儀に合わせ、
**固有名詞のみカタカナ・称号は日本語**にする。

| Lv | slug | English | **確定訳名** |
|---:|---|---|---|
| 1 | `dante-prodigal-swain` | Dante, Prodigal Swain | **ダンテ、放蕩の若人** |
| 2 | `dante-aenean-initiate` | Dante, Aenean Initiate | **ダンテ、アエネアンの秘儀参入者** |
| 3 | `dante-hemomancer` | Dante, Hemomancer | **ダンテ、血の魔導士** |
| 4 | `dante-hematic-overdrive` | Dante, Hematic Overdrive | **ダンテ、血潮の暴走** |
| 2 | `lorraine-honed-operative` | Lorraine, Honed Operative | **ロレイン、研ぎ澄まされた工作員** |
| 3 | `lorraine-arclight-saber` | Lorraine, Arclight Saber | **ロレイン、閃光の剣士** |
| 1 | `nameless-champion` | Nameless Champion | **名もなきチャンピオン** |
| 1 | `nameless-champion-mt` | Nameless Champion | **名もなきチャンピオン** |
| 1 | `nameless-champion-rw` | Nameless Champion | **名もなきチャンピオン** |

⚠️ **「名もなきChampion」は既訳に15枚実在する**（`nameless-champion-ac` 〜 `-tw`。
ドラフト用のクラス違いバリエーション群で、**全て同じ訳名「名もなきチャンピオン」**）。
PRDDPの3枚も英語名が同一のため**同じ訳名でよい**（クラスが ASSASSIN/WARRIOR・MAGE/TAMER・RANGER/WARRIOR と異なるだけ）。
→ 実装後は**同名カードが計18枚**になる（§5 V4-2 の期待値）。

### 2-6. ハイテク製品ラインのカード名（確定・第3版／ユーザー決定）

`.asphodel/paradise` の **VelTech / Tech / X Ultra 系の製品ライン**は、**一般名詞もカタカナのまま**訳す。

| English | 確定訳 |
|---|---|
| AquaTech Blade X | アクアテック・ブレードX |
| FlameTech BladeCore | フレイムテック・ブレードコア |
| AquaTech / FlameTech / GustTech Shield | アクアテック／フレイムテック／ガストテック・シールド |
| Staves X Ultra | スタッフ・Xウルトラ |
| Ionizer / Revitalizer X Ultra | イオナイザー／リヴァイタライザー・Xウルトラ |

⚠️ **これは既訳の慣習からの意図的な逸脱**（ユーザー決定・2026-08-18）。既訳は
**Blade→刃（27枚）・Staff→杖（5枚）** で一貫しているが、本セットのSF的な製品ラインは
**幻想系の武器と区別する**ためカタカナで揃える。

- ⚠️ **既知のトレードオフ**: 日本語検索で「杖」「刃」を打っても製品ライン名はヒットしない
- ⭐ **バッチ2・3でも同じ方針を適用する**（`VelTech` 系のカードが残っている）


### 2-7. バッチ2の命名ルール（確定・第5版）

バッチ1の実装報告 6-C で「判断に迷った」名前が14件挙がったため、**バッチ2で2枚以上に登場する語族**を
実測で洗い出し（`tmp/design/73/names.mjs`・2026-08-18）、**既訳の先例が示す訳し方に倒して確定**した。
⚠️ **下表に載っている語は開発担当が判断し直さない。** 載っていない語は §2-1 の委任範囲（創作的訳出）。

| 語族 | 枚数 | **確定ルール** | 根拠となる先例 |
|---|---:|---|---|
| `Aenean X` | 17 | **「アエネアンの◯◯」**（`Aenean` はカタカナ・後続を和訳して「の」で繋ぐ） | §2-4「ダンテ、アエネアンの秘儀参入者」／バッチ1「アエネアンの拒絶」 |
| `... Droid` | 13 | **「ドロイド」**（カタカナ）。⭐ **動物・動作との複合語も音写する** | ユーザー決定（2026-08-18）／既訳 `Moonveil Android → ムーンヴェイル・アンドロイド` |
| `...Tech`（製品＝ITEM/REGALIA） | 10 | **§2-6 を適用**。ブランド名カタカナ＋**「・」**＋後続もカタカナ | §2-6（`AquaTech Blade X → アクアテック・ブレードX`） |
| `VelTech ...`（人＝ALLY） | 3 | **「ヴェルテックの◯◯」**（ブランドはカタカナ・**役割は和訳**して「の」で繋ぐ） | 既訳 `Automaton Beastkeeper → オートマトンの獣飼い`／`Novice Mechanist → 見習い機械技師` |
| `... X Ultra` | 3 | **「・Xウルトラ」**（§2-6） | §2-6（`Ionizer X Ultra → イオナイザー・Xウルトラ`） |
| `... Bladehand` | 3 | **「◯◯の剣使い」** | 既訳 `Sworn Windhand → 誓約の風使い` |
| `... Synchron` | 3 | **「◯◯のシンクロン」**（カタカナ） | 造語のためカタカナ音写（`Hemosynth → ヘモシンス` と同じ扱い） |
| `... Fractal` | 4 | **「◯◯のフラクタル」** | 既訳20件（`Explosive Fractal → 爆発のフラクタル`） |
| `Cell` / `Powercell` | 5 | **「セル」／「パワーセル」** | 既訳 `Powercell → パワーセル`・`Cell Assembler → セル組立工` |

#### ⭐ Droid 複合語5枚（ユーザー確定訳・そのまま使う）

| slug | English | **確定訳名** |
|---|---|---|
| `biding-endroid` | Biding Endroid | **待機のエンドロイド** |
| `gray-lupindroid` | Gray Lupindroid | **灰色のルピンドロイド** |
| `incinerator-felindroid` | Incinerator Felindroid | **焼却のフェリンドロイド** |
| `trained-birdroid` | Trained Birdroid | **訓練されたバードロイド** |
| `production-crawldroid` | Production Crawldroid | **生産のクロールドロイド** |

⚠️ **既知のトレードオフ**（ユーザー了承済み）: 音写のため「狼」「猫」「鳥」で日本語検索してもヒットしない。
§2-6 の製品ラインと同じ判断（カタカナで世界観を揃えることを優先）。

#### ブランド名の確定カタカナ表記（表記ゆれ防止）

| English | 確定 | | English | 確定 |
|---|---|---|---|---|
| AquaTech | アクアテック | | ResonanTech | レゾナンテック |
| ChannelTech | チャンネルテック | | SignalTech | シグナルテック |
| CookTech | クックテック | | StrideTech | ストライドテック |
| PlasmaTech | プラズマテック | | VelTech | **ヴェルテック** |

（`FlameTech → フレイムテック`・`GustTech → ガストテック` はバッチ1で確定済み）

#### ⚠️ フレーバーの注意（バッチ2の実データで確認済み）

- **実在人物のクレジットは0件**（98枚のフレーバーを全数検査）。§8-3 の懸念は**バッチ2では発生しない**。
  唯一の署名 `— Lorraine Allard`（`edge-of-tomorrow`）は**ゲーム内のチャンピオン**なので通常どおり訳す
- ⚠️ **ダンテ『神曲』からの引用が混じる**（例: `sift` のフレーバーは「地獄篇」第1歌の遊泳者の比喩）。
  **既存の邦訳（寿岳文章訳・平川祐弘訳など）を転載せず、原文から自分で訳す**（著作権のため）

---

### 2-5. ファイル分割（確定）

**prefixごとに5ファイル**を新規作成する（ユーザー決定・2026-08-18）。
既存の命名規則（`alc.js` / `alcsd.js` / `ambdp.js` / `amb-1st.js`）に倣う:

| ファイル | 収録枚数 |
|---|---:|
| `data/tl/prd.js` | 211 |
| `data/tl/prdp.js` | 14 |
| `data/tl/prdsd.js` | 11 |
| `data/tl/prddp.js` | 10 |
| `data/tl/prd-1st.js` | 8 |
| **合計** | **254** |

⚠️ **`prdg.js` / `prdevp.js` は作らない**（未訳0のため）。

#### ⚠️ 重複収録カードの振り分けルール（必ず守る）

1枚のカードが複数prefixに収録されるため、**次の優先順で最初に当たった1つのファイルにだけ書く**:

```text
PRD > PRD 1st > PRDG > PRDP > PRDSD > PRDDP > PRDEVP
```

（例: PRD と PRDSD の両方に収録された33枚は **`prd.js` にだけ**書く）

**同じslugを2ファイルに書かない。** `data/tl/*.js` は**ファイル名の昇順**で読まれ、後勝ちで上書きされるため、
重複させると**どちらの訳が出るか分かりにくくなる**（既存でも3件だけ発生している:
`astra-sight` / `stalwart-shieldmate` / `umbra-sight` が `dtrsd.js` と `rdo.js` に重複）。

⭐ **`index.html` の編集は不要**（#22フェーズ2以降、`data/tl/` はファイル名昇順で自動的に読まれる）。

---

## 3. バッチ分割と優先順位（確定）

**チャンピオン→PRD本編→周辺**の順（ユーザー決定・2026-08-18）。各バッチ完了ごとにコミットし、公開判断を仰ぐ。

| バッチ | 対象 | 枚数 | 内容 |
|---|---|---:|---|
| **バッチ1** | チャンピオン9枚 + **新キーワードを含むカード**35枚 | **44** | 発売日に検索される主要カード。新キーワードの訳を全て初出させる |
| **バッチ2** | `prd.js` の残り | **176** | PRD本編の完了 |
| **バッチ3** | 周辺セット（PRDP 12 / PRDSD 10 / PRDDP 7 / PRD 1st 5） | **34** | 全254枚の完了 |

バッチ1の定義: **タイプに `CHAMPION` を含む**、**または** 効果文に新キーワード
（`cascade` / `elysian aura` / `multistrike` / `link shield` / `object link` / `static counter` /
`buff counter` / `dante lineage` / `aenean progression`）を**1つ以上含む**カード。対象44枚は §7 に全件列挙。

⚠️ **第2版の注記**: 上の選定は初版の基準（`buff counter` を新キーワードとみなしていた）で確定したもの。
§1-3 の訂正により `buff counter` は新規ではなくなったが、**これだけを根拠に選ばれたのは
`anointed-purifier` の1枚のみ**で、**バッチ1は44枚のまま変更しない**（実測済みの期待値表を維持するため）。
同カードは既訳キーワードの適用例として先に訳す価値があり、バッチ1に含めて差し支えない。

### バッチごとのファイル別内訳

| ファイル | 総枚数 | バッチ1 | バッチ2 | バッチ3 |
|---|---:|---:|---:|---:|
| `prd.js` | 211 | 35 | 176 | 0 |
| `prd-1st.js` | 8 | 3 | 0 | 5 |
| `prdp.js` | 14 | 2 | 0 | 12 |
| `prdsd.js` | 11 | 1 | 0 | 10 |
| `prddp.js` | 10 | 3 | 0 | 7 |
| **合計** | **254** | **44** | **176** | **34** |

⭐ **バッチ1は5ファイルすべてにまたがる**（新キーワードが周辺セットにも散っているため）。
5ファイルともバッチ1で新規作成し、バッチ2・3で追記する。

---

## 4. 実装ステップ（バッチ1・実装待ち）

1. **未訳一覧を取得**: `node scripts/scaffold.mjs PRD prd` 他、5prefix分を実行
   （出力 `scratch_ref_*` は gitignore 済み。英語原文がコメント併記で出る）
2. **`data/tl/prd.js` ほか5ファイルを新規作成**し、§7 の44枚の訳を書く
   - ヘッダは既存 `p26.js` / `sp3.js` に倣う（`"use strict";` + セット名コメント + `Object.assign`）
   - **§2-2の対訳表・§2-3のCascadeテンプレート・§2-4のチャンピオン名に従う**
   - フレーバーは訳す。⚠️ ただし**実在の人物クレジット**（世界王者名等）は原文のまま＝`flavor` キーを置かない（#1 設計書第2版①の方針）
3. **`data/translations.js` の `terms` に8件追加**（§2-2の⚠️印。形式は `日本語（English）`）
   - ⚠️ **`buff counter` は既に登録済みなので追加しない**（第2版の訂正）
4. **`node scripts/gen-tl-json.mjs`** を実行し `data/tl-names.json` / `data/tl-effects.json` を再生成
   （⚠️ **忘れると本番に出ない**。`npm run validate` が exit 1 で検出する）
5. **`npm run build:cards`** を実行し、カード個別ページ・セットページに訳を埋め込む
   - ⚠️ **無関係なAPIドリフト差分を混ぜない**（CLAUDE.md の `build:cards` の注意・#71 でレビューM7の差し戻しが発生した）。
     `git diff --stat` で**対象44枚+PRD系セットページ以外**の差分が出たら、その分は `git checkout -- <path>` で戻し、**翌朝のcronに任せる**
6. 検証（§5）がすべてPASSしたらコミット。**⚠️ この時点ではまだ `closes #73` を書かない**（バッチ2・3が残るため）

---

## 5. 検証項目（バッチ1）

⚠️ **期待値の数値はすべて 2026-08-18 に実測済み**。着手前の行が `scaffold.mjs` の実測と一致することを確認してある。

### V1. 未訳数が期待どおり減ること

`node scripts/scaffold.mjs <prefix>` の **`untranslated`** の値:

| prefix | 着手前（実測） | **バッチ1完了後（期待値）** |
|---|---:|---:|
| PRD | 211 | **176** |
| PRD 1st | 26 | **13** |
| PRDG | 0 | **0** |
| PRDP | 14 | **12** |
| PRDSD | 44 | **32** |
| PRDDP | 10 | **7** |
| PRDEVP | 0 | **0** |

⚠️ **これらを足しても254/210にはならない**（重複収録のため。§1-2）。ユニークの残りは **254 → 210**。

### V2. ファイルごとの収録枚数

各ファイルの**訳エントリ数**を次のコマンドで数える（2026-08-18 に既存ファイルで動作確認済み:
`p26.js`→3・`sp3.js`→23・`rdopd.js`→14 と、実際の収録枚数に一致）:

```bash
grep -cE '^  "[a-z0-9-]+": \{' data/tl/prd.js
```

⚠️ この数え方は**インデント2スペース + slugキー + `: {`** の形に依存する。
§4の手順どおり既存ファイルの書式に倣えば一致する。

| ファイル | **バッチ1完了時の期待エントリ数** |
|---|---:|
| `data/tl/prd.js` | **35** |
| `data/tl/prd-1st.js` | **3** |
| `data/tl/prdp.js` | **2** |
| `data/tl/prdsd.js` | **1** |
| `data/tl/prddp.js` | **3** |
| **合計** | **44** |

### V3. 生成物の整合

- `npm run validate` が **exit 0**（`gen-tl-json.mjs` の再生成漏れ・索引の内部整合を検査する）
- `node scripts/check-terminology.mjs PRD` で**用語ゆれの報告が出ないこと**
  （⚠️ 誤検知を含む一覧なので、出た場合は1件ずつ内容を見て判断し、**判断根拠をissueに書く**）

### V4. 画面表示（最終形での期待値）

⚠️ デッキ構築ツールはログインが要るため、**トップページ（カードDB）で確認する**
（`npm run dev` → ポート3000。手順は CLAUDE.md の「デッキ構築ツールは…」の項）。

1. トップの検索窓に **「ダンテ」** と入力（JPモード）→ **4枚ちょうど**ヒットし、
   **「ダンテ、放蕩の若人」「ダンテ、アエネアンの秘儀参入者」「ダンテ、血の魔導士」「ダンテ、血潮の暴走」**が
   **この順（レベル昇順）で**並ぶこと。
   ⚠️ 期待値の根拠: **既訳でカード名に「ダンテ」を含むカードは0枚**（2026-08-18 実測）＝ヒットは新規4枚のみ
2. 同様に **「名もなきチャンピオン」** で検索 → **18枚**
   （⚠️ **既訳15枚**＋新規3枚。2026-08-18 実測。「既訳1枚」ではないので **4枚と数えない**）
3. `dante-hemomancer` の詳細モーダルで、効果文の **「エンパワー」「リカバー」がハイライト付きで解説される**こと
   （既訳 terms の流用が効いている確認）
4. `bedlam-borough`（Cascade）の詳細モーダルで、**箇条書き3行が改行されて表示される**こと
   （`• 1、2、3—` / `• 4—` が**同一行に潰れていない**）。**「カスケード」がハイライトされる**こと（terms追加の確認）
5. カード個別ページ `cards/dante-prodigal-swain/` を直接開き、**日本語名がタイトルに出る**こと
   （＝`build:cards` の埋め込みが効いている。⚠️ カードページは訳データを実行時に読まない）

### V5. 意図しない差分が無いこと

`git diff --stat` の差分が**次の範囲に収まる**こと:

- `data/tl/prd.js` `prd-1st.js` `prdp.js` `prdsd.js` `prddp.js`（新規5ファイル）
- `data/translations.js`（terms **8件**追加。⚠️ 既存の `buff counter` 行が**変更されていない**ことも確認する）
- `data/tl-names.json` `data/tl-effects.json`（再生成）
- `cards/<slug>/index.html` × **44**（訳を入れたカードのページ）
- セットページは**ちょうど5ファイル**（2026-08-18 実測）:
  `sets/prd/` `sets/prd-1st/` `sets/prddp/` `sets/prdp/` `sets/prdsd/` の `index.html`
  - ⚠️ **`sets/prdg/` と `sets/prdevp/` には差分が出ない**（バッチ1の44枚が1枚も収録されていない）。
    出たらAPIドリフトを疑う
- `data/card-meta-index.json`（訳の追加で索引が変わる場合）

⚠️ 上記以外のカードページに差分が出たら、まず**下の「正当な波及差分」に当たるか**を確かめる。
当たらなければ**APIドリフト**（#71 の再発）なので、混ぜずに `git checkout --` で戻す。

#### ⭐ 正当な波及差分（第3版で追記・バッチ1で実測15枚）

翻訳の追加は**バッチ対象外のカードページにも決定論的に波及する**。次の2種は**正当なので戻さない**:

| 波及の種類 | バッチ1での実測 | 例 |
|---|---|---|
| `terms` に追加したキーワードを**効果文に含む未訳カード**の「このカードの用語」欄が増える | **13枚** | `charge-static`（`static counter` を含む） |
| 「関連カード」欄のリンク先の**表示名が英語→日本語**に変わる | **2枚** | `powercell` → `bedlam-borough` へのリンク |

⭐ **見分け方**: 波及差分は**1行(+1/-1)**で、内容が上表のどちらかに該当する。
APIドリフトは `editions` の並び替え・画像URLの入れ替えなど**翻訳と無関係な差分**になる。

---

## 6. バッチ2・3への引き継ぎ

バッチ1完了後、**同じルール（§2〜§3）でバッチ2（176枚）→ バッチ3（34枚）を継続する**。
検証項目は §5 の期待値表を次の段階の値に読み替える:

| 段階 | PRD | PRD 1st | PRDG | PRDP | PRDSD | PRDDP | PRDEVP | **ユニーク残** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 着手前 | 211 | 26 | 0 | 14 | 44 | 10 | 0 | **254** |
| バッチ1完了後 | 176 | 13 | 0 | 12 | 32 | 7 | 0 | **210** |
| バッチ2完了後 | 0 | 5 | 0 | 12 | 10 | 7 | 0 | **34** |
| バッチ3完了後 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **0** |

⭐ **上表のバッチ2完了後の値は第5版で再実測し、一致を確認済み**（§10 V1）。
⚠️ **バッチ2の実装ステップ・検証項目・対象一覧は §9〜§11 が正**（本節は概観）。

**バッチ3のコミットで `closes #73`** を書いてよい。

### TRANSLATION.md への追記（バッチ3完了時にまとめて実施する）

§2-2 の対訳表を「### PRD で追加した主なキーワード」節として追記する。
⚠️ **`TRANSLATION.md` はルート直下＝本番配信対象**（CLAUDE.md）。**pushはユーザーの指示を待つ**。

---

## 7. バッチ1の対象44枚

<!-- 生成: tmp/design/73/batch.mjs（2026-08-18・スナップショット 2026-08-17T13:02:21Z） -->

| # | slug | 英語名 | タイプ | 収録 | 新KW |
|---:|---|---|---|---|---|
| 1 | `aenean-repudiation` | Aenean Repudiation | ACTION | PRD | aenean progression |
| 2 | `anointed-purifier` | Anointed Purifier | ALLY | PRD | buff counter |
| 3 | `aquatech-blade-x` | AquaTech Blade X | REGALIA/WEAPON | PRD | cascade |
| 4 | `aquatech-shield` | AquaTech Shield | ITEM | PRD | link shield |
| 5 | `arrest-lightning` | Arrest Lightning | ACTION | PRD | object link |
| 6 | `augustine-votary-of-yore` | Augustine, Votary of Yore | UNIQUE/ALLY | PRD | cascade |
| 7 | `bedlam-borough` | Bedlam Borough | DOMAIN | PRD | cascade |
| 8 | `blightheart-penitent` | Blightheart Penitent | ALLY | PRD | cascade |
| 9 | `bygone-days` | Bygone Days | PHANTASIA | PRD | cascade |
| 10 | `crosswind-cuts` | Crosswind Cuts | ATTACK | PRD | multistrike |
| 11 | `dante-aenean-initiate` | Dante, Aenean Initiate | CHAMPION | PRD | CHAMPION dante lineage |
| 12 | `dante-hemomancer` | Dante, Hemomancer | CHAMPION | PRD | CHAMPION dante lineage |
| 13 | `dante-prodigal-swain` | Dante, Prodigal Swain | CHAMPION | PRD | CHAMPION  |
| 14 | `divine-comedy` | Divine Comedy | MASTERY | PRD | cascade |
| 15 | `elysian-aspirant` | Elysian Aspirant | ALLY | PRD | elysian aura |
| 16 | `elysian-orphan` | Elysian Orphan | ALLY | PRD | elysian aura |
| 17 | `elysian-test-subject` | Elysian Test Subject | TOKEN/ALLY | PRD | elysian aura |
| 18 | `embryonic-hemosynth` | Embryonic Hemosynth | ALLY | PRD | elysian aura |
| 19 | `flametech-bladecore` | FlameTech BladeCore | ITEM | PRD | link shield |
| 20 | `flametech-manual` | FlameTech Manual | REGALIA/ITEM | PRD | cascade |
| 21 | `flametech-shield` | FlameTech Shield | ITEM | PRD | link shield |
| 22 | `fulgurite-coordinator` | Fulgurite Coordinator | ALLY | PRD | object link |
| 23 | `gusttech-shield` | GustTech Shield | ITEM | PRD | link shield |
| 24 | `induction-strike` | Induction Strike | ATTACK | PRD | object link |
| 25 | `ionizer-x-ultra` | Ionizer X Ultra | ITEM | PRD | object link |
| 26 | `lorraine-arclight-saber` | Lorraine, Arclight Saber | CHAMPION | PRD | CHAMPION  |
| 27 | `lorraine-honed-operative` | Lorraine, Honed Operative | CHAMPION | PRD | CHAMPION  |
| 28 | `lucca-gateway-manager` | Lucca, Gateway Manager | UNIQUE/ALLY | PRD | cascade |
| 29 | `lucia-reclaimed-blight` | Lucia, Reclaimed Blight | UNIQUE/ALLY | PRD | elysian aura |
| 30 | `pure-cytosynth` | Pure Cytosynth | ALLY | PRD | elysian aura |
| 31 | `revitalizer-x-ultra` | Revitalizer X Ultra | ITEM | PRD | cascade |
| 32 | `sinon-babelias-companion` | Sinon, Babelia's Companion | UNIQUE/ALLY | PRD | cascade |
| 33 | `thanatotic-hemosynth` | Thanatotic Hemosynth | ALLY | PRD | elysian aura |
| 34 | `waterfall-sage` | Waterfall Sage | ALLY | PRD | cascade |
| 35 | `windstrike-soldier` | Windstrike Soldier | ALLY | PRD | multistrike |
| 36 | `dante-hematic-overdrive` | Dante, Hematic Overdrive | CHAMPION | PRD 1st | CHAMPION dante lineage |
| 37 | `staves-x-ultra` | Staves X Ultra | UNIQUE/ITEM | PRD 1st | object link |
| 38 | `total-whiteout` | Total Whiteout | UNIQUE/PHANTASIA | PRD 1st | cascade |
| 39 | `greater-boon-of-connection` | Greater Boon of Connection | GREATER BOON | PRDP | object link |
| 40 | `greater-boon-of-flock` | Greater Boon of Flock | GREATER BOON | PRDP | cascade |
| 41 | `venous-core` | Venous Core | REGALIA/ITEM | PRDSD | elysian aura |
| 42 | `nameless-champion` | Nameless Champion | CHAMPION | PRDDP | CHAMPION  |
| 43 | `nameless-champion-mt` | Nameless Champion | CHAMPION | PRDDP | CHAMPION  |
| 44 | `nameless-champion-rw` | Nameless Champion | CHAMPION | PRDDP | CHAMPION  |

---

## 8. 未決事項

1. ✅ **バッチ1のpushは完了**（2026-08-19 00:54 JST・本番反映確認済み）。**未決ではない**
2. **`data/translations.js` の `terms` 解説文** — 見出し語（`日本語（English）`）は §2-2 で確定したが、
   **解説本文**は開発担当が既存の同種キーワードの書きぶりに合わせて書く。
   ⚠️ Cascade は既存に類似メカニクスが無いため、**書いたらissueに全文を貼って設計担当の確認を受ける**
3. ✅ **フレーバーの人名クレジット — バッチ2では発生しない**（第5版で98枚を全数検査し0件）。
   唯一の署名 `— Lorraine Allard` はゲーム内キャラクター。⚠️ **バッチ3の34枚は未検査**なので、
   出てきたら #1 の方針（原文のまま・`flavor` キーを置かない）に従う
4. **バッチ2のpush（本番公開）の可否** — 発売日 8/21 との兼ね合いでユーザーが判断する。
   ⭐ **ユニット1（44枚）の時点で公開するか、176枚そろえてから公開するかもユーザー判断**


---

## 9. バッチ2の実装ステップ（第5版・実装待ち）

### 9-1. サブバッチ分割（確定）

**176枚を44枚×4サブバッチ**に割る。⭐ **44枚はバッチ1が1ターンで書き切った実証済みの単位**
（実装報告のパイロット計測: 44枚を分割せず完了・出力30,293バイト）。**176 = 44×4 でちょうど4倍**になる。

| サブバッチ | 枚数 | 内容 | 一覧 |
|---|---:|---|---|
| **A** | 44 | ⭐ **命名リスクの高い語族を集約**: Aenean 17 + Droid 13 + Tech系 13 + Bladehand 1 | §11-A |
| **B** | 44 | 残り132枚の slug 昇順 1〜44 | §11-B |
| **C** | 44 | 同 45〜88 | §11-C |
| **D** | 44 | 同 89〜132 | §11-D |

⭐ **Aを語族で固めたのは意図的**。§2-7 で確定した命名ルール（Aenean／Droid／Tech／Bladehand）が
**1サブバッチ目で全部出そろう**ため、レビューと設計確認を1回通せば残り132枚は機械的に書ける。

- 出力量の見積り: バッチ2の英語原文はバッチ1の **3.17倍**（effect 32,182字＋flavor 5,888字）。
  1サブバッチあたり **約24KB**（バッチ1実績30KBより軽い＝**1ターンに収まる**）
- ⚠️ **`data/tl/prd.js` は末尾に追記してよい**。既存の大型ファイルは
  `alc.js` / `mrc.js` / `amb.js` / `hvn.js` の**4件が非ソート**（`dtr.js` のみ昇順）＝
  **slug昇順は本リポジトリの規約ではない**。並べ替えのための既存行の移動はしないこと

### 9-2. レビュー単位（ユーザー決定・2026-08-18）

**2ユニットに分けて `レビュー待ち` に出す**（44枚ごとに4回は回さない）:

```text
ユニット1: サブバッチA(44枚)      → レビュー → 設計確認  ← ここで命名方針を確定させる
ユニット2: サブバッチB+C+D(132枚) → レビュー → 設計確認
```

⚠️ **ユニット1の設計確認が済むまでBに着手しない。** Aの命名が差し戻された場合、
同じ語族がB〜Dにも波及するため、先に進むと手戻りが3倍になる。

### 9-3. 手順

#### ⭐ 事前: スナップショットを固定してAPIドリフトを防ぐ

```bash
GA_SNAPSHOT_MAX_AGE_MIN=0    # 0 = 無期限（取り直さない）
```

⚠️ **`tmp/api-cache/cards-snapshot.json` は 2026-08-18T14:49Z 取得＝既定60分の期限切れ**。
着手時の最初のコマンドで**一度だけ取り直され**、以降この環境変数で固定される。
⭐ **翻訳作業はAPIを見に行く必要がないため、固定すれば #71 の実行時ドリフト（31ファイル）は構造的に混入しない**
（CLAUDE.md の `build:cards` の項）。

#### ユニット1（サブバッチA）

1. `node scripts/scaffold.mjs PRD prd` — 英語原文を取得（§11-A の44枚が含まれることを確認）
2. `data/tl/prd.js` の**末尾に44枚を追記**（§2-2〜§2-7 に従う。⚠️ **§2-7の表にある語は判断し直さない**）
3. `node scripts/gen-tl-json.mjs`
4. `node scripts/gen-card-meta-index.mjs`（⚠️ **ネットワーク必須**）
5. `GA_SNAPSHOT_MAX_AGE_MIN=0 npm run build:cards`
6. `npm run validate` / `node scripts/check-terminology.mjs PRD`
7. §10 の検証（V1〜V6）を実行し、**差分が V5 の48ファイル＋データ4件に収まること**を確認 → コミット
8. 実装報告コメント → `レビュー待ち`

#### ユニット2（サブバッチB → C → D）

- **B・C は「訳の追記 → `gen-tl-json.mjs` → `npm run validate` → コミット」だけでよい**
  （⭐ `validate` の索引検査は**索引自身の内部整合しか見ない**ため、
  `gen-card-meta-index.mjs` と `build:cards` を回さなくても **exit 0** になる。実測確認済み）
- **D を書き終えたあとに、上の 4〜8 をまとめて1回実行する**（索引と生成ページはここで一気に揃える）

⚠️ **`closes #73` はまだ書かない**（バッチ3の34枚が残る）。

## 10. バッチ2の検証項目

⚠️ **期待値はすべて 2026-08-18 にスナップショット（`2026-08-17T13:02:21Z` 取得分）と
既存生成物で実測済み**。手法は**バッチ1の実測結果で妥当性を確認してある**
（セットページ5/5一致・波及ページの予測が実測15枚に全て含まれることを確認）。

### V1. 未訳数（`node scripts/scaffold.mjs <prefix>` の `untranslated`）

| prefix | 着手前 | **A完了** | B完了 | C完了 | **D完了（バッチ2完了）** |
|---|---:|---:|---:|---:|---:|
| PRD | 176 | **132** | 88 | 44 | **0** |
| PRD 1st | 13 | **13** | 12 | 8 | **5** |
| PRDG | 0 | 0 | 0 | 0 | **0** |
| PRDP | 12 | **12** | 12 | 12 | **12** |
| PRDSD | 32 | **29** | 19 | 16 | **10** |
| PRDDP | 7 | **7** | 7 | 7 | **7** |
| PRDEVP | 0 | 0 | 0 | 0 | **0** |
| **ユニーク残** | 210 | **166** | 122 | 78 | **34** |

⚠️ **PRDP（12）と PRDDP（7）はバッチ2で1枚も減らない**（該当カードが全てバッチ3のため）。
**減っていないことが正常**なので、異常と判断して余計な訳を足さないこと。

### V2. `data/tl/prd.js` の収録エントリ数

```bash
grep -cE '^  "[a-z0-9-]+": \{' data/tl/prd.js
```

| 段階 | 着手前 | **A完了** | B完了 | C完了 | **D完了** |
|---|---:|---:|---:|---:|---:|
| `data/tl/prd.js` | 35 | **79** | 123 | 167 | **211** |

⚠️ **他の4ファイルは1枚も増えない**（`prd-1st.js` 3 / `prdp.js` 2 / `prdsd.js` 1 / `prddp.js` 3 のまま）。
バッチ2は**すべて `prd.js` に入る**（§2-5 の振り分け優先順で PRD が最優先のため）。

### V3. 生成物の整合

- `npm run validate` が **exit 0**
- `node scripts/check-terminology.mjs PRD` の報告が **0件**
- `validate` の索引の行が **`card-meta-index sort keys OK — 2350slug`**（A完了）／
  **`2482slug`**（D完了）になること（着手前は `2306slug`）
  - ⚠️ **B・Cのコミットでは索引を再生成しないので `2350slug` のまま**＝**それが正常**

### V4. ⭐ `data/translations.js` に差分が出ないこと（バッチ2の最重要チェック）

**バッチ2では `terms` を1件も追加しない。** 根拠（2026-08-18 実測）:

- §1-3 の新キーワード9種のうち、バッチ2の176枚に出るのは **`static counter`（7枚）と
  `buff counter`（18枚）だけ**で、**どちらもバッチ1で登録済み**
- それ以外にバッチ2にだけ出る語（`training` / `on destroy` / `command automaton` / `scavenged`）は
  **すべて既訳カードに用例がある**（`training` 9枚・`on destroy` 2枚・`command automaton` 2枚）＝
  **訳語を新規に決める必要がない**

⚠️ **`terms` を足したくなったら、足す前にissueに書いて設計担当の判断を待つ**（§2-1 の例外の範囲外）。

### V5. 画面表示（最終形での期待値）

#### ユニット1（サブバッチA）— `gray-lupindroid` 1枚で5点まとめて確認する

カード個別ページ `cards/gray-lupindroid/` を開き、次がすべて満たされること:

1. `<title>` が **`灰色のルピンドロイド | Gray Lupindroid - Grand Archive 日本語カードDB`**
   （§2-7 のユーザー確定訳。**タイトル書式は既存カードページと同一**）
2. 効果文の **`CARDNAME` が「灰色のルピンドロイド」に置換**されている
3. **「バフカウンター」がハイライト付き**で表示され、「このカードの用語」欄に解説が出る
   - ⚠️ **原文は `put a **buff** counter on CARDNAME` で、太字が `buff` だけに掛かり語中で切れている**。
     訳文は **`**バフカウンター**を1個置く`** のように**語全体を太字**にする
     （CLAUDE.md の「太字マークを除去してから比較する」の実例。素の文字列一致では拾えない形）
4. **「トゥルーサイト」「ステルス」**もハイライトされる（既訳 `terms` の流用が効いている確認）
5. **フレーバーが訳出**されている（原文 `Though wholly metal, it somehow blends into nature.`）

#### ユニット2（サブバッチB+C+D）

6. `cards/charge-static/`（サブバッチB）で **「スタティックカウンター」がハイライト＋用語解説**が出ること
   - ⭐ **`terms` を1件も追加していないのに効く**ことの確認（V4の裏づけ）
7. トップページ（`npm run dev` → ポート3000）でエキスパンション
   **`.asphodel/paradise（PRD）`** を選び、**全232件**が表示され、
   **カード名が英語のままのタイルが1枚も無い**こと

### V6. 意図しない差分が無いこと（⭐ 期待ファイル数を実測で確定してある）

| ユニット | カードページ | 波及ページ | セットページ | **HTML計** | データ |
|---|---:|---|---|---:|---|
| **1（A・44枚）** | 44 | **2**: `core-fractal` `powercell` | **2**: `sets/prd/` `sets/prdsd/` | **48** | `tl/prd.js` `tl-names.json` `tl-effects.json` `card-meta-index.json` |
| **2（B+C+D・132枚）** | 132 | **4**: `aenean-crystallization` `augustine-votary-of-yore` `elysian-test-subject` `powercell` | **4**: `sets/prd/` `sets/prd-1st/` `sets/prdsd/` `sets/evp/` | **140** | 同上 |

- ⚠️ **B・Cの中間コミットは `data/tl/prd.js` `tl-names.json` `tl-effects.json` の3件だけ**
  （`build:cards` を回さないため）
- ⭐ **`sets/evp/`（Event Packs・2023年）が入るのは正常**。`cato-meadows-channeler` と
  `fran-carmine-spark` の2枚が**PRD系ではない EVP にも収録されている**ため。
  ⚠️ **これをAPIドリフトと誤認して `git checkout --` で戻さないこと**
- **波及の見分け方**（第3版§5より）: 波及差分は **1行（+1/-1）** で、内容は
  「関連カード欄のリンク先の表示名が英語→日本語に変わった」もの。
  ⚠️ **バッチ2では `terms` を足さないので、バッチ1で13枚出た「用語欄が増える」型の波及は発生しない**
- 上記以外のファイルに差分が出たら **APIドリフト**（#71 の再発）なので、
  `git checkout -- <path>` で戻し、**翌朝のcronに任せる**

#### セットページの訳済み件数（機械的に数えられる指標）

```bash
grep -o 'cp-en-inline' sets/prd/index.html | wc -l
```

| ファイル | 着手前 | **A完了** | **D完了** | 総カード行 |
|---|---:|---:|---:|---:|
| `sets/prd/` | 56 | **100** | **232** | 232 |
| `sets/prd-1st/` | 14 | 14 | **22** | 27 |
| `sets/prdsd/` | 29 | **32** | **51** | 61 |
| `sets/evp/` | 22 | 22 | **24** | 24 |

⭐ `cp-en-inline`（英語名の併記スパン）は**訳済みカードにだけ付く**ので、この数＝訳済み枚数。
着手前の4セットすべてで **総カード行 − 未訳数** と一致することを確認済み（手法の妥当性検証）。
**`sets/prd/` が 232/232 になればPRD本編は全訳完了**。

## 11. バッチ2の対象176枚（サブバッチ別）

<!-- 生成: tmp/design/73/split.mjs（2026-08-18・スナップショット 2026-08-17T13:02:21Z） -->

⚠️ **この一覧が正**。`scaffold.mjs` の出力には**バッチ3の34枚が混ざらない**（別prefixのため）が、
`prd.js` に書くのは**下の176枚だけ**。


### 11-A. サブバッチA（44枚・命名リスクの高い語族／ユニット1）

⭐ Aenean 17 + Droid 13 + Tech系 13 + Bladehand 1。**§2-7 の命名ルールがここで全部出そろう**。

| # | slug | English | タイプ |
|---:|---|---|---|
| 1 | `aenean-cryosalvo` | Aenean Cryosalvo | ACTION |
| 2 | `aenean-crystallization` | Aenean Crystallization | ACTION |
| 3 | `aenean-cyclic-winds` | Aenean Cyclic Winds | ACTION |
| 4 | `aenean-cyclone` | Aenean Cyclone | ACTION |
| 5 | `aenean-flurry-of-fire` | Aenean Flurry of Fire | ACTION |
| 6 | `aenean-flux-generator` | Aenean Flux Generator | ITEM |
| 7 | `aenean-frostlance` | Aenean Frostlance | ACTION |
| 8 | `aenean-frozen-shunt` | Aenean Frozen Shunt | ACTION |
| 9 | `aenean-guttering-flames` | Aenean Guttering Flames | PHANTASIA |
| 10 | `aenean-pointed-flare` | Aenean Pointed Flare | ACTION |
| 11 | `aenean-reclaim` | Aenean Reclaim | ACTION |
| 12 | `aenean-scorching-comet` | Aenean Scorching Comet | ACTION |
| 13 | `aenean-spark-alight` | Aenean Spark Alight | ACTION |
| 14 | `aenean-swelling-gusts` | Aenean Swelling Gusts | ACTION |
| 15 | `aenean-swelling-tides` | Aenean Swelling Tides | ACTION |
| 16 | `aenean-tailwind-boost` | Aenean Tailwind Boost | ACTION |
| 17 | `aenean-ward` | Aenean Ward | ACTION |
| 18 | `aquatech-shell` | AquaTech Shell | ITEM |
| 19 | `biding-endroid` | Biding Endroid | ALLY |
| 20 | `cellforger-droid` | Cellforger Droid | ALLY |
| 21 | `cellwarden-droid` | Cellwarden Droid | ALLY |
| 22 | `channeltech-charm-s` | ChannelTech Charm S | ITEM |
| 23 | `cooktech-apron` | CookTech Apron | ITEM |
| 24 | `cooktech-knife` | CookTech Knife | ITEM |
| 25 | `cooktech-mixer` | CookTech Mixer | ITEM |
| 26 | `delivery-droid` | Delivery Droid | ALLY |
| 27 | `fountain-bladehand` | Fountain Bladehand | ALLY |
| 28 | `gray-lupindroid` | Gray Lupindroid | ALLY |
| 29 | `haze-droid` | Haze Droid | ALLY |
| 30 | `hydrocask-droid` | Hydrocask Droid | ALLY |
| 31 | `incinerator-felindroid` | Incinerator Felindroid | ALLY |
| 32 | `overcharged-droid` | Overcharged Droid | ALLY |
| 33 | `plasmatech-blaster` | PlasmaTech Blaster | ITEM |
| 34 | `production-crawldroid` | Production Crawldroid | ALLY |
| 35 | `resonantech-module` | ResonanTech Module | REGALIA/ITEM |
| 36 | `signaltech-one` | SignalTech One | ITEM |
| 37 | `signaltech-x-ultra` | SignalTech X Ultra | REGALIA/ITEM |
| 38 | `stridetech-w` | StrideTech W | ITEM |
| 39 | `sturdy-droid` | Sturdy Droid | ALLY |
| 40 | `trained-birdroid` | Trained Birdroid | ALLY |
| 41 | `unbroken-droid` | Unbroken Droid | ALLY |
| 42 | `veltech-armiger` | VelTech Armiger | ALLY |
| 43 | `veltech-gear-hoarder` | VelTech Gear Hoarder | ALLY |
| 44 | `veltech-qa-tester` | VelTech QA Tester | ALLY |


### 11-B. サブバッチB（44枚）


| # | slug | English | タイプ |
|---:|---|---|---|
| 1 | `acheron-express-officer` | Acheron Express Officer | ALLY |
| 2 | `another-round` | Another Round | ACTION |
| 3 | `aquaveil-ambusher` | Aquaveil Ambusher | ALLY |
| 4 | `battery-core-x` | Battery Core X | REGALIA/ITEM |
| 5 | `belted-tune` | Belted Tune | ACTION |
| 6 | `bifurcating-fractal` | Bifurcating Fractal | PHANTASIA |
| 7 | `blightheart-adept` | Blightheart Adept | ALLY |
| 8 | `blightheart-thaumaturge` | Blightheart Thaumaturge | ALLY |
| 9 | `blistering-insurgent` | Blistering Insurgent | ALLY |
| 10 | `blood-surge` | Blood Surge | ACTION |
| 11 | `break-the-line` | Break the Line | ACTION |
| 12 | `breakwater-cadet` | Breakwater Cadet | ALLY |
| 13 | `breaths-coloratura` | Breath's Coloratura | ACTION |
| 14 | `breezy-looper` | Breezy Looper | ALLY |
| 15 | `brooch-x-ultra` | Brooch X Ultra | ITEM |
| 16 | `business-card` | Business Card | ITEM |
| 17 | `camil-basked-abundance` | Camil, Basked Abundance | UNIQUE/ALLY |
| 18 | `cato-meadows-channeler` | Cato, Meadow's Channeler | UNIQUE/ALLY |
| 19 | `cell-production` | Cell Production | ACTION |
| 20 | `cell-reactor` | Cell Reactor | REGALIA/ITEM |
| 21 | `charge-static` | Charge Static | ACTION |
| 22 | `charger-x-ultra` | Charger X Ultra | ITEM |
| 23 | `collect-junk` | Collect Junk | ACTION |
| 24 | `conductive-strike` | Conductive Strike | ATTACK |
| 25 | `convergent-beam` | Convergent Beam | ACTION |
| 26 | `core-fractal` | Core Fractal | TOKEN/PHANTASIA |
| 27 | `corrosive-juggler` | Corrosive Juggler | ALLY |
| 28 | `creative-tinder` | Creative Tinder | ACTION |
| 29 | `cryogenic-ritual` | Cryogenic Ritual | ACTION |
| 30 | `current-groover` | Current Groover | ALLY |
| 31 | `cutthroat-operative` | Cutthroat Operative | ALLY |
| 32 | `delicious-pastry` | Delicious Pastry | TOKEN/ITEM |
| 33 | `demons-bargain` | Demon's Bargain | ACTION |
| 34 | `destined-encounter` | Destined Encounter | ACTION |
| 35 | `devils-lifeline` | Devil's Lifeline | ACTION |
| 36 | `discharger` | Discharger | REGALIA/ITEM |
| 37 | `draught-dodge` | Draught Dodge | ACTION |
| 38 | `edge-of-tomorrow` | Edge of Tomorrow | ACTION |
| 39 | `emberslash` | Emberslash | ATTACK |
| 40 | `eminence-in-fury` | Eminence in Fury | ACTION |
| 41 | `epicurean-institute` | Epicurean Institute | DOMAIN |
| 42 | `equip-with-courage` | Equip with Courage | ACTION |
| 43 | `escharotomy` | Escharotomy | ACTION |
| 44 | `evaporation-synchron` | Evaporation Synchron | REGALIA/ITEM |


### 11-C. サブバッチC（44枚）


| # | slug | English | タイプ |
|---:|---|---|---|
| 1 | `exhilarating-plume` | Exhilarating Plume | PHANTASIA |
| 2 | `exquisite-dessert` | Exquisite Dessert | ITEM |
| 3 | `extinguishing-synchron` | Extinguishing Synchron | REGALIA/ITEM |
| 4 | `fanclub-leader` | Fanclub Leader | ALLY |
| 5 | `fanned-synchron` | Fanned Synchron | REGALIA/ITEM |
| 6 | `fling-food` | Fling Food | ACTION |
| 7 | `forese-fervid-cantor` | Forese, Fervid Cantor | UNIQUE/ALLY |
| 8 | `fortification` | Fortification | ACTION |
| 9 | `fran-carmine-spark` | Fran, Carmine Spark | UNIQUE/ALLY |
| 10 | `frigid-embrittlement` | Frigid Embrittlement | ACTION |
| 11 | `gear-haul` | Gear Haul | ACTION |
| 12 | `golden-measure-patisserie` | Golden Measure Patisserie | UNIQUE/DOMAIN |
| 13 | `hardy-veteran` | Hardy Veteran | ALLY |
| 14 | `hefty-hammering` | Hefty Hammering | ATTACK |
| 15 | `hemoflux-drain` | Hemoflux Drain | ACTION |
| 16 | `hightail` | Hightail | ACTION |
| 17 | `hot-cake` | Hot Cake | ITEM |
| 18 | `hulking-rearguard` | Hulking Rearguard | ALLY |
| 19 | `hydrating-fractal` | Hydrating Fractal | PHANTASIA |
| 20 | `inflamed-bladehand` | Inflamed Bladehand | ALLY |
| 21 | `ischemic-soldier` | Ischemic Soldier | ALLY |
| 22 | `jovial-tinkerer` | Jovial Tinkerer | ALLY |
| 23 | `judas-claret-intercessor` | Judas, Claret Intercessor | UNIQUE/ALLY |
| 24 | `keen-tidebinder` | Keen Tidebinder | ALLY |
| 25 | `lacunarity-guide` | Lacunarity Guide | ALLY |
| 26 | `leran-pastoral-hymns` | Leran, Pastoral Hymns | UNIQUE/DOMAIN |
| 27 | `lurching-rogue` | Lurching Rogue | ALLY |
| 28 | `martial-flowstate` | Martial Flowstate | PHANTASIA |
| 29 | `merciless-toss` | Merciless Toss | ACTION |
| 30 | `molten-impact` | Molten Impact | ACTION |
| 31 | `music-aficionado` | Music Aficionado | ALLY |
| 32 | `musical-curator` | Musical Curator | ALLY |
| 33 | `outfitted-ravager` | Outfitted Ravager | ALLY |
| 34 | `package-courier` | Package Courier | ALLY |
| 35 | `peer-the-depths` | Peer the Depths | ACTION |
| 36 | `performance-enthusiast` | Performance Enthusiast | ALLY |
| 37 | `perfusive-envelopment` | Perfusive Envelopment | PHANTASIA |
| 38 | `piccarda-night-rider` | Piccarda, Night Rider | UNIQUE/ALLY |
| 39 | `plutus-fortunes-favor` | Plutus, Fortune's Favor | UNIQUE/ALLY |
| 40 | `powerforged-burst` | Powerforged Burst | ACTION |
| 41 | `pyrolysis-sage` | Pyrolysis Sage | ALLY |
| 42 | `rampant-bladehand` | Rampant Bladehand | ALLY |
| 43 | `rampart-defender` | Rampart Defender | ALLY |
| 44 | `refreshing-slice` | Refreshing Slice | ATTACK |


### 11-D. サブバッチD（44枚）


| # | slug | English | タイプ |
|---:|---|---|---|
| 1 | `reinforcing-air` | Reinforcing Air | ACTION |
| 2 | `return-stroke` | Return Stroke | ATTACK |
| 3 | `revoker-bell` | Revoker Bell | REGALIA/ITEM |
| 4 | `rhesus-eradication` | Rhesus Eradication | ACTION |
| 5 | `rig-for-detonation` | Rig for Detonation | ACTION |
| 6 | `riveting-winds` | Riveting Winds | ACTION |
| 7 | `rolling-chorus` | Rolling Chorus | ACTION |
| 8 | `rondo-of-the-wind` | Rondo of the Wind | ACTION |
| 9 | `rumble-coordinator` | Rumble Coordinator | ALLY |
| 10 | `scars-of-old` | Scars of Old | ACTION |
| 11 | `seed-of-empowerment` | Seed of Empowerment | REGALIA/ITEM |
| 12 | `sift` | Sift | ACTION |
| 13 | `signal-gunner` | Signal Gunner | ALLY |
| 14 | `sinfonia-of-hope` | Sinfonia of Hope | ACTION |
| 15 | `singed-emotions` | Singed Emotions | ACTION |
| 16 | `smoldering-cook` | Smoldering Cook | ALLY |
| 17 | `sneaky-raccoon` | Sneaky Raccoon | ALLY |
| 18 | `soaked-slash` | Soaked Slash | ATTACK |
| 19 | `sordelle-unmoored-exception` | Sordelle, Unmoored Exception | UNIQUE/ALLY |
| 20 | `spellshield-exia` | Spellshield: Exia | ACTION |
| 21 | `stabilizing-bladecore` | Stabilizing BladeCore | ITEM |
| 22 | `stoked-slice` | Stoked Slice | ATTACK |
| 23 | `thermal-break` | Thermal Break | ACTION |
| 24 | `tidal-fractal` | Tidal Fractal | PHANTASIA |
| 25 | `tidewall-sentinel` | Tidewall Sentinel | ALLY |
| 26 | `tindered-soldier` | Tindered Soldier | ALLY |
| 27 | `tower-of-dis` | Tower of Dis | UNIQUE/DOMAIN |
| 28 | `triboelectric-fortification` | Triboelectric Fortification | ACTION |
| 29 | `tribute-singer` | Tribute Singer | ALLY |
| 30 | `turbulent-bounty-hunter` | Turbulent Bounty Hunter | ALLY |
| 31 | `umbilical-ritual` | Umbilical Ritual | ACTION |
| 32 | `uncanny-realization` | Uncanny Realization | ATTACK |
| 33 | `unruled-bereavement` | Unruled Bereavement | ACTION |
| 34 | `updraft-slice` | Updraft Slice | ATTACK |
| 35 | `varicose-amplification` | Varicose Amplification | PHANTASIA |
| 36 | `vascular-collapse` | Vascular Collapse | ACTION |
| 37 | `velocity-punch` | Vel-ocity Punch | ITEM |
| 38 | `weight-of-looking-up` | Weight of Looking Up | ACTION |
| 39 | `welcome-merriment` | Welcome Merriment | ACTION |
| 40 | `where-futures-stir` | Where Futures Stir | PHANTASIA |
| 41 | `wicked-gildbreaker` | Wicked Gildbreaker | ALLY |
| 42 | `wind-surge-emitter` | Wind Surge Emitter | REGALIA/ITEM |
| 43 | `wuthering-sforzando` | Wuthering Sforzando | ACTION |
| 44 | `zena-echo-weaver` | ZENA, Echo Weaver | UNIQUE/ALLY |

---

## 参考

- 翻訳表記ルール: `TRANSLATION.md`
- 先例（3枚規模）: `docs/design/1-P26新カード和訳/P26新カード和訳_設計.md`
- セット登録の経緯: `docs/design/71-PRDセット登録/`
- issue: <https://github.com/dozyouneko/ga-card-tools-jp/issues/73>
