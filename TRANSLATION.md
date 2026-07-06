# 翻訳ガイド（日本語訳の表記ルール）

Grand Archive 日本語カードDB の非公式訳を、誰が書いても一貫するようにするためのルールです。
DTRSD（Distorted Reflections スターターデッキ）に続き、最新弾 RDO（Radiant Origins 基本セット・376枚）を訳出済みです。

## ワークフロー

1. 対象セットの **スキャフォルド**を生成（`data/tl/<set>.js`）。各カードに英語原文がコメントで併記され、`name` / `effect` が空欄。
2. 空欄の `name` / `effect` を日本語で埋める（下のルールに従う）。
3. 空欄のままのカードは自動的に「翻訳募集中」表示。埋めると「日本語訳あり」に変わる。
4. 用語は本ガイドの対訳に統一する。効果文中の主要キーワードは詳細画面で自動解説される（`translations.js` の `terms`）。

## 効果テキストの記法

- **改行**は `\n`。原文の段落区切り（空行）は `\n\n`。
- **太字**は `**…**`、**斜体**は `*…*`。原文で太字のキーワードやリマインダー文（かっこ書き）に使う。
- リマインダー文（例: 括弧内の補足）は斜体にする。例: `*（この効果は…の場合のみ適用する。）*`
- カードが**自分の名前を参照**する場合は、その日本語カード名を**「」で囲む**（例: 「豊穣の宝珠」を追放する：）。

## 数値・記号

- 括弧は全角「（）」を基本とする。ただしコスト表記の丸括弧 `(2)` のような**ゲーム記法はそのまま**。
- 「+1パワー」「-1レベル」のように数値と語を詰める。POWER=パワー、LIFE=ライフ、LEVEL=レベル。
- ダメージは「1点のダメージ」または「1ダメージ」。統一して「Nダメージ」。

## 用語対訳（抜粋・随時追記）

| English | 日本語 |
|---|---|
| materialize | マテリアライズ |
| activate | 起動する |
| summon | 召喚する |
| generate | 生成する |
| banish | 追放する |
| graveyard | 墓地 |
| memory | メモリー |
| reserve | リザーブ |
| Glimpse N | グリンプスN |
| distant | ディスタント |
| On Enter | 登場時 |
| On Hit | ヒット時 |
| Inherited Effect | 継承効果 |
| Class Bonus | クラスボーナス |
| Spellshroud | スペルシュラウド |
| Floating Memory | フローティングメモリー |
| Aethercharge / Aetherwing | エーテルチャージ / エーテルウィング |
| load | ロードする |
| Starcalling / Starcall | スターコーリング / スターコール |
| omen counter | オーメンカウンター |
| mastery | マスタリー |
| Sacrifice | サクリファイス（する） |
| recover | リカバー |
| empower | エンパワー |
| target | 対象 |
| unit / ally | ユニット / アライ |
| draw a card | カードを1枚引く |
| awake / rest | アウェイク / レスト |

### RDO で追加した主なキーワード（カタカナ表記に統一）

| English | 日本語 |
|---|---|
| Efficiency | エフィシェンシー |
| Vigor | ヴィガー |
| Steadfast | ステッドファスト |
| Cleave | クリーヴ |
| Ephemerate / ephemeral | エフェメレート / エフェメラル |
| Imbue / imbued | インビュー / インビュー状態 |
| Advanced Imbue | アドバンスド・インビュー |
| Brew / brewed | ブリュー / ブリューされた |
| Gather | ギャザー |
| Scavenge | スカベンジ |
| Kindle | キンドル |
| Deluge | デリュージ |
| Pride | プライド |
| Foster / fostered | フォスター / フォスターされた |
| Retort | リトート |
| Cardistry | カーディストリ |
| Agility | アジリティ |
| Preserve / preserved | プリザーブ / プリザーブされた |
| Suppress | サプレス |
| Ally Link | アライリンク |
| Omnishroud | オムニシュラウド |
| Exalted | エグザルテッド |
| Harmonize | ハーモナイズ |
| Divine Relic | ディヴァインレリック |
| Siegeable | シージアブル |
| Commanded Will | コマンドウィル |
| Ranged | レンジド |
| Ambush | アンブッシュ |
| Stealth / True Sight | ステルス / トゥルーサイト |
| bulwark counter | バルワークカウンター |
| wither counter | ウィザーカウンター |
| enlighten counter | エンライトカウンター |
| unpreventable | 軽減不能 |
| \[X Bonus\] | ［Xボーナス］（キャラ名は既存の定訳・カタカナ） |

- キーワード能力名は**カタカナ**、能力の動作（追放・破壊・打ち消す等）は**和訳**する。
- `[Class Bonus]` などのボーナス表記は全角角括弧 `［…］`。`[Damage 20+]`＝［ダメージ20以上］、`[Level 2+]`＝［レベル2以上］。

- 固有名（マスタリー名・特定の称号など）で定訳が無いものは「日本語（English）」の形で併記する。
- 迷ったら英語カード名・効果を残し、`terms` に用語を足して解説で補う。

## 品質メモ

- 公式の日本語版は存在しないため、これらは**非公式訳**。ルール上の正確さ＞直訳。曖昧なら原文（詳細画面の「英語原文を表示」）で確認できる。
- 用語や言い回しで迷ったら本ガイドを更新し、以後それに揃える。
