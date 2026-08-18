# タスク#73: PRD（.asphodel/paradise）新カード254枚の和訳 設計書

GitHub issue: [#73](https://github.com/dozyouneko/ga-card-tools-jp/issues/73)

## 改版履歴

| 日付 | 版 | 内容 |
|---|---|---|
| 2026-08-18 | 初版 | 実データ調査（未訳254枚の内訳・新キーワード10種）を実施。ユーザー決定4件（訳文の作成主体・優先順位・ファイル分割・`Aenean`表記・チャンピオン名方針）を反映し、バッチ1〜3の期待値を実測で確定。**バッチ1（44枚）が実装待ち**、バッチ2（176枚）・バッチ3（34枚）は本設計書のルールを流用して継続 |
| 2026-08-18 | 第2版 | ⚠️ **ユーザー指摘により初版の誤りを訂正**: `buff counter` は**新キーワードではなく既訳のある既存キーワード**（Forest Cake 等・既訳126枚に183回出現／`terms` にも `バフカウンター` が登録済み）。初版の突合が**太字マークを除去せず**に文字列一致を取っていたため、`**buff** counter` の形を拾えていなかった。→ **新キーワードは9種**に訂正し、`terms` の追加も **9件→8件**に修正（§1-3・§2-2）。他9種は正しい手法で再検証し新規で確定。**枚数・バッチ・検証項目の期待値に変更なし** |
| 2026-08-18 | 第3版 | **バッチ1(44枚)の実装を承認**(コミット `c1b7ea00`・レビュー合格)。ユーザー決定2件を反映: ①**Cascadeの解説文は断定を外した文面に差し替える**(§2-2末尾)②**ハイテク製品ラインの訳語はカタカナ統一**(§2-6を新設)。開発担当の確認事項A(`[レスト]`)・B(波及差分)を**承認**し、§2-3の`[REST]`表記の誤りを訂正・§5 V5に波及差分を明記。⚠️ **残作業2点**(`dante-hemomancer`のリネージュ注記・Cascade解説文の差し替え)は`実装待ち`に戻す |
| 2026-08-18 | 第4版 | **バッチ1(44枚)完了**。第3版の残作業2点を `576afc0a` で実装しレビュー合格・設計承認。`dante-hemomancer` のリネージュ注記は他4枚と同一書式で5/5に、`terms.cascade.desc` は§2-2の確定文面と**一字一句一致**(237バイト・diffゼロ)を確認。⭐ APIドリフトの混入0件(`build:cards` がスナップショットキャッシュを再利用したため)。**ユーザーのpush判断待ち**(`push待ち`)。次は**バッチ2(176枚)**だが、⚠️ 出力量がバッチ1の2.9倍(約86KB)のため**60枚×3分割**を推奨(§3の1単位のままでは1ターンに収まらない見込み) |

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

1. **バッチ1のpush（本番公開）の可否** — 発売日 8/21 との兼ね合いでユーザーが判断する。
   ⚠️ 承認後は `push待ち` ラベルを付け、**どのセッションも着手しない**
2. **`data/translations.js` の `terms` 解説文** — 見出し語（`日本語（English）`）は §2-2 で確定したが、
   **解説本文**は開発担当が既存の同種キーワードの書きぶりに合わせて書く。
   ⚠️ Cascade は既存に類似メカニクスが無いため、**書いたらissueに全文を貼って設計担当の確認を受ける**
3. **フレーバーの人名クレジット** — PRD に世界王者クレジット等が含まれるかは未確認。
   出てきたら #1 の方針（原文のまま・`flavor` キーを置かない）に従い、**判断に迷ったらissueに上げる**

## 参考

- 翻訳表記ルール: `TRANSLATION.md`
- 先例（3枚規模）: `docs/design/1-P26新カード和訳/P26新カード和訳_設計.md`
- セット登録の経緯: `docs/design/71-PRDセット登録/`
- issue: <https://github.com/dozyouneko/ga-card-tools-jp/issues/73>
