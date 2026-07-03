"use strict";
// RDO 関連（Pantheon除く）拡張訳: RDO 1st Ed. 限定 / Armaments(RDOA) / Event Pack(RDOEVP)
// translations.js・rdo.js の後に読み込む。空欄(name/effect="")は未翻訳。
window.GA_I18N = window.GA_I18N || { meta: {}, terms: {}, cards: {} };
window.GA_I18N.cards = Object.assign(window.GA_I18N.cards || {}, {

  // Angelic Channeling  [ACTION]  L- NORM
  // EN: Banish up to three advanced element cards from your hand and/or memory. Draw a card into your memory for each card banished this way. When your champion levels up into a champion card with base level 3 the next time this game, put the banished cards on the top and/or bottom of your deck in any order. /  / **Floating Memory**
  "angelic-channeling": {
    name: "天使の導き",
    effect:
      "あなたの手札および／またはメモリーからアドバンスドエレメントのカードを最大3枚追放する。この方法で追放した各カードにつき、カードを1枚あなたのメモリーに引く。このゲームで次にあなたのチャンピオンが基本レベル3のチャンピオンカードにレベルアップしたとき、その追放したカードを好きな順番でデッキの一番上および／または一番下に置く。\n\nフローティングメモリー",
  },

  // Arcane Renunciation  [ACTION]  L- ARCANE
  // EN: Banish all cards in your hand and memory. Then return all non-champion non-regalia arcane element cards from your graveyard and banishment to your hand. **Empower 10**.  /  / [Rai Bonus] Until end of turn, whenever you activate a Spell card, **empower 10**.
  "arcane-renunciation": {
    name: "秘術の放棄",
    effect:
      "あなたの手札とメモリーのすべてのカードを追放する。その後、あなたの墓地と追放領域から、チャンピオンでもレガリアでもないアーケインエレメントのカードをすべてあなたの手札に戻す。エンパワー10する。\n\n" +
      "［ライボーナス］ターン終了時まで、あなたがスペルカードを起動するたび、エンパワー10する。",
  },

  // Arcanist's Prism  [REGALIA/ITEM]  L- ARCANE
  // EN: At the beginning of your recollection phase, put all cards from your memory on the bottom of your deck in any order, then draw that many cards.
  "arcanists-prism": {
    name: "秘術士のプリズム",
    effect:
      "あなたのリコレクションフェイズの開始時に、あなたのメモリーのすべてのカードを好きな順番でデッキの一番下に置き、その後その枚数のカードを引く。",
  },

  // Archon Broadsword  [REGALIA/WEAPON]  L- NEOS
  // EN: As an additional cost to use this weapon for an attack, pay (2). /  / [Class Bonus] CARDNAME gets +1 [POWER] for each token you control. *(Apply this effect only if your champion's class matches this card's class.)*
  "archon-broadsword": {
    name: "アーコン・ブロードソード",
    effect:
      "この武器を攻撃に使うための追加コストとして、(2)を支払う。\n\n" +
      "［クラスボーナス］「アーコン・ブロードソード」は、あなたがコントロールするトークン1体につき、＋1パワーを得る。*（この効果は、あなたのチャンピオンのクラスがこのカードのクラスと一致する場合のみ適用する。）*",
  },

  // Argus, All-Seeing Giant  [UNIQUE/ALLY]  L- EXALTED,NORM
  // EN: While paying for this card's reserve cost, you may banish one or more cards named Crystal of Argus or Eye of Argus from your material deck. Each card banished this way pays for 3 of that cost. /  / **Taunt**, **True Sight**, **Vigor** /  / As long as CARDNAME is awake, it has **omnishroud**.
  "argus-allseeing-giant": {
    name: "アーガス、全てを見通す巨人",
    effect:
      "このカードのリザーブコストを支払う際、あなたのマテリアルデッキから「アーガスの水晶」または「アーガスの眼」という名前のカードを1枚以上追放してよい。この方法で追放した各カードは、そのコストの3分を支払う。\n\n" +
      "タウント、トゥルーサイト、ヴィガー\n\n" +
      "「アーガス、全てを見通す巨人」がアウェイクであるかぎり、それはオムニシュラウドを持つ。",
  },

  // Ariel, Archangel of Natura  [UNIQUE/ALLY]  L- NORM
  // EN: **Crux & Tera Imbue 3** *(You may reserve all cards revealed as you activate this card. If at least three of them are crux and/or tera element, this card becomes **imbued**.)* /  / **On Enter:** If CARDNAME is **imbued**, reveal the top card of your deck and put it into your material deck **preserved**. Then you may banish a card from your material deck. If you do, CARDNAME gets +3[POWER] until end of turn.
  "ariel-archangel-of-natura": {
    name: "アリエル、ナチュラの大天使",
    effect:
      "クラックス＆テラ・インビュー3 *（あなたはこのカードを起動する際、公開したすべてのカードをリザーブしてよい。そのうち少なくとも3枚がクラックスおよび／またはテラエレメントの場合、このカードはインビュー状態になる。）*\n\n" +
      "登場時：「アリエル、ナチュラの大天使」がインビュー状態の場合、あなたのデッキの一番上のカードを公開し、プリザーブしてあなたのマテリアルデッキに置く。その後、あなたのマテリアルデッキからカードを1枚追放してよい。そうしたなら、ターン終了時まで「アリエル、ナチュラの大天使」は＋3パワーを得る。",
  },

  // Auspicious Manifestation  [ACTION]  L- LUXEM
  // EN: [Guo Jia Bonus] Banish a Shenju ally you control. Return that ally to the field under its owner's control transformed at the beginning of the next end phase. /  / [Guo Jia Bonus] (2), **Discard this card from your hand:** Draw a card. Then if your champion has five or less **quest** counters on them, put a **quest** counter on them.
  "auspicious-manifestation": {
    name: "吉兆の顕現",
    effect:
      "［グオ・ジアボーナス］あなたがコントロールするシェンジュアライを1体追放する。次のエンドフェイズの開始時に、そのアライをトランスフォーム状態でオーナーのコントロール下で戦場に戻す。\n\n" +
      "［グオ・ジアボーナス］(2)、このカードを手札から捨てる：カードを1枚引く。その後、あなたのチャンピオン上のクエストカウンターが5個以下の場合、それにクエストカウンターを1個置く。",
  },

  // Automata Genesis  [ACTION]  L- NEOS
  // EN: **Summon** three Titan Mk II tokens.  /  / [Tonoris Bonus] Put **X** **buff** counters on each token ally you control, where **X** is the amount of tokens you control.
  "automata-genesis": {
    name: "オートマタ創世",
    effect:
      "タイタン Mk II トークンを3体召喚する。\n\n" +
      "［トノリスボーナス］あなたがコントロールする各トークンアライにバフカウンターをX個置く。Xはあなたがコントロールするトークンの数。",
  },

  // Azrael, Archangel of Materia  [UNIQUE/ALLY]  L- NORM
  // EN: **Exia & Neos Imbue 3** *(You may reserve all cards revealed as you activate this card. If at least three of them are exia and/or neos element, this card becomes **imbued**.)* /  / **On Enter:** As a Spell, if CARDNAME is **imbued**, destroy another target non-regalia non-champion object with reserve cost 3 or less. Its controller **summons** a Spirit Shard token.
  "azrael-archangel-of-materia": {
    name: "アズラエル、マテリアの大天使",
    effect:
      "エクシア＆ネオス・インビュー3 *（あなたはこのカードを起動する際、公開したすべてのカードをリザーブしてよい。そのうち少なくとも3枚がエクシアおよび／またはネオスエレメントの場合、このカードはインビュー状態になる。）*\n\n" +
      "登場時：スペルとして、「アズラエル、マテリアの大天使」がインビュー状態の場合、リザーブコスト3以下の、レガリアでもチャンピオンでもない別の対象のオブジェクトを破壊する。そのコントローラーは精霊の欠片トークンを1つ召喚する。",
  },

  // Battlefield Spotter  [ALLY]  L- WIND
  // EN: [Class Bonus] **On Enter:** Another target ally you control becomes **distant**. /  / [Level 2+] Other units you control have **ranged 1**. *(Multiple instances of **ranged** can stack. Apply this effect only if your champion is level 2 or higher.)*
  "battlefield-spotter": {
    name: "戦場の斥候",
    effect:
      "［クラスボーナス］登場時：あなたがコントロールする別の対象のアライはディスタントになる。\n\n" +
      "［レベル2以上］あなたがコントロールする他のユニットはレンジド1を持つ。*（レンジドは複数個を累積できる。この効果は、あなたのチャンピオンがレベル2以上の場合のみ適用する。）*",
  },

  // Caliburn of Silencing  [REGALIA/WEAPON]  L- LUXEM
  // EN: [Class Bonus] **On Champion Hit:** The hit champion loses all abilities until the beginning of your next turn. *(Apply this effect only if your champion's class matches this card's class.)*
  "caliburn-of-silencing": {
    name: "沈黙のカリバーン",
    effect:
      "［クラスボーナス］チャンピオンヒット時：ヒットしたチャンピオンは、あなたの次のターンの開始時まですべての能力を失う。*（この効果は、あなたのチャンピオンのクラスがこのカードのクラスと一致する場合のみ適用する。）*",
  },

  // Censer of Restful Peace  [REGALIA/ITEM]  L- NORM
  // EN: Cards in graveyards lose all abilities.
  "censer-of-restful-peace": {
    name: "安息の香炉",
    effect: "墓地にあるカードはすべての能力を失う。",
  },

  // Constellary Predomination  [ACTION]  L- ASTRA
  // EN: [Diana Bonus] **Glimpse 8**. For the rest of the game, your champion has "**On Attack:** If there are three or more cards in the attacker's intent, wake up the attacker and **glimpse 4**."
  "constellary-predomination": {
    name: "星座の支配",
    effect:
      "［ダイアナボーナス］グリンプス8する。このゲームの残りの間、あなたのチャンピオンは「攻撃時：攻撃者のインテントに3枚以上のカードがある場合、攻撃者をアウェイクにし、グリンプス4する。」を持つ。",
  },

  // Convoking Slime  [ALLY]  L- NEOS
  // EN: **Pride 3** /  / [Class Bonus] At the beginning of your recollection phase, **summon** a copy of CARDNAME rested. *(Counters on this ally are not copied.)*
  "convoking-slime": {
    name: "招集するスライム",
    effect:
      "プライド3\n\n" +
      "［クラスボーナス］あなたのリコレクションフェイズの開始時に、「招集するスライム」のコピーをレストして召喚する。*（このアライの上のカウンターはコピーされない。）*",
  },

  // Crystal of Argus  [REGALIA/ITEM]  L- NORM
  // EN: [Class Bonus] Your champion gets +1 level for every three **enlighten** counters on them. *(Apply this effect only if your champion's class matches this card's class.)*
  "crystal-of-argus": {
    name: "アーガスの水晶",
    effect:
      "［クラスボーナス］あなたのチャンピオンは、それの上の覚醒カウンター3個につき、＋1レベルを得る。*（この効果は、あなたのチャンピオンのクラスがこのカードのクラスと一致する場合のみ適用する。）*",
  },

  // Curtain of Shadows  [ACTION]  L- UMBRA
  // EN: [Tristan Bonus] **Summon** **X** Ominous Shadow tokens where **X** is the amount of **preparation** counters on your champion. /  / For the rest of the game, allies named Ominous Shadow you control get +1[POWER] and have "**On Hit:** Put a **preparation** counter on your champion."
  "curtain-of-shadows": {
    name: "影の帳",
    effect:
      "［トリスタンボーナス］「不吉な影」トークンをX体召喚する。Xはあなたのチャンピオン上のプレパレーションカウンターの数。\n\n" +
      "このゲームの残りの間、あなたがコントロールする「不吉な影」という名前のアライは＋1パワーを得て、「ヒット時：あなたのチャンピオンにプレパレーションカウンターを1個置く。」を持つ。",
  },

  // Diffusive Block  [ACTION]  L- WATER
  // EN: This card costs 1 less to activate If you control a Shield item. /  / Prevent the next 2 damage that would be dealt to target unit this turn. /  / [Class Bonus] **Floating Memory**
  "diffusive-block": {
    name: "拡散ブロック",
    effect:
      "あなたが盾アイテムをコントロールしている場合、このカードは起動コストが1少なくなる。\n\n" +
      "このターン、対象のユニットに与えられる次の2点のダメージを軽減する。\n\n" +
      "［クラスボーナス］フローティングメモリー",
  },

  // Dissuading Halt  [ACTION]  L- WATER
  // EN: Target unit's attacks get -3 [POWER] until end of turn. /  / [Class Bonus] **Floating Memory**
  "dissuading-halt": {
    name: "思いとどまらせる制止",
    effect:
      "ターン終了時まで、対象のユニットの攻撃は－3パワーを得る。\n\n" +
      "［クラスボーナス］フローティングメモリー",
  },

  // Distort Reality  [ACTION]  L- UMBRA
  // EN: [Alice Bonus] Put all cards from your deck into your graveyard. Then put any amount of Specter cards from your graveyard with total reserve cost 30 or less onto the field. They each become **ephemeral**. /  / [Alice Bonus] **Ephemerate â** (15)
  "distort-reality": {
    name: "現実の歪曲",
    effect:
      "［アリスボーナス］あなたのデッキのすべてのカードをあなたの墓地に置く。その後、あなたの墓地からリザーブコストの合計が30以下になる好きな数の亡霊カードを戦場に出す。それらはそれぞれエフェメラルになる。\n\n" +
      "［アリスボーナス］エフェメレート — (15)",
  },

  // Dormant Sacrificial Altar  [DOMAIN]  L- WATER
  // EN: **On Enter:** Draw a card into your memory. /  / **Sacrifice an Automaton ally and a Human ally:** Put the top two cards of your deck into your graveyard.
  "dormant-sacrificial-altar": {
    name: "眠れる生贄の祭壇",
    effect:
      "登場時：カードを1枚あなたのメモリーに引く。\n\n" +
      "オートマトンアライと人間アライを1体ずつサクリファイスする：あなたのデッキの一番上から2枚をあなたの墓地に置く。",
  },

  // Eternal Magistrate  [ALLY]  L- WIND
  // EN: **Imbue 2** *(You may reserve all cards revealed as you activate this card. If at least two of them are wind element, this card becomes **imbued**.)* /  / As long as CARDNAME is **imbued**, cards canât leave your opponentsâ material decks unless itâs their materialize phase.
  "eternal-magistrate": {
    name: "永遠の執政官",
    effect:
      "インビュー2 *（あなたはこのカードを起動する際、公開したすべてのカードをリザーブしてよい。そのうち少なくとも2枚が風エレメントの場合、このカードはインビュー状態になる。）*\n\n" +
      "「永遠の執政官」がインビュー状態であるかぎり、対戦相手のマテリアライズフェイズでないかぎり、対戦相手のマテリアルデッキからカードは離れられない。",
  },

  // Expel the Departed  [ACTION]  L- NORM
  // EN: [Level 2+] This card costs 1 less to activate. *(Apply this effect only if your champion is level 2 or higher.)* /  / Destroy up to one target phantasia. If you control two or more Fatestone and/or Fatebound objects, draw a card.
  "expel-the-departed": {
    name: "逝きし者の退去",
    effect:
      "［レベル2以上］このカードは起動コストが1少なくなる。*（この効果は、あなたのチャンピオンがレベル2以上の場合のみ適用する。）*\n\n" +
      "最大1つの対象のファンタジアを破壊する。あなたが運命石および／または運命縛りのオブジェクトを2つ以上コントロールしている場合、カードを1枚引く。",
  },

  // Eye of Argus  [REGALIA/ITEM]  L- NORM
  // EN: **Banish CARDNAME:** Target ally you control gains **true sight** until end of turn. Draw a card. *(Units with **true sight** can attack units with **stealth**.)*
  "eye-of-argus": {
    name: "アーガスの眼",
    effect:
      "「アーガスの眼」を追放する：あなたがコントロールする対象のアライは、ターン終了時までトゥルーサイトを得る。カードを1枚引く。*（トゥルーサイトを持つユニットはステルスを持つユニットを攻撃できる。）*",
  },

  // Facet the Forgotten  [UNIQUE/PHANTASIA]  L- CRUX
  // EN: [Merlin Bonus] **On Enter:** Look at target opponent's memory. You may activate a card from among them without paying its costs and ignoring its elemental requirements. If you do, your opponents can't play cards with the same name as the activated card for as long as you control CARDNAME.
  "facet-the-forgotten": {
    name: "忘れられしファセット",
    effect:
      "［マーリンボーナス］登場時：対象の対戦相手のメモリーを見る。あなたはその中からカードを1枚、コストを支払わず、そのエレメント条件を無視して起動してよい。そうしたなら、あなたが「忘れられしファセット」をコントロールしているかぎり、対戦相手はその起動したカードと同じ名前のカードをプレイできない。",
  },

  // Fairy Whispers  [ACTION]  L- WIND
  // EN: **Glimpse 3**. *(To **glimpse**, look at that many cards from the top of your deck. Put those cards back on the top or on the bottom of your deck in any order.)* /  / Reveal the top card of your deck. If that card is wind element, put it into your hand.
  "fairy-whispers": {
    name: "妖精のささやき",
    effect:
      "グリンプス3する。*（グリンプスするには、デッキの一番上からその枚数のカードを見る。それらのカードを好きな順番でデッキの一番上または一番下に戻す。）*\n\n" +
      "あなたのデッキの一番上のカードを公開する。そのカードが風エレメントの場合、それをあなたの手札に入れる。",
  },

  // Fractal of Creation  [PHANTASIA]  L- NEOS
  // EN: **Reservable** *(While paying for a reserve cost, you may rest this object to pay for 1 of that cost.)* /  / **Sacrifice CARDNAME:** **Summon** a token copy of target token you control.
  "fractal-of-creation": {
    name: "創造のフラクタル",
    effect:
      "リザーバブル *（リザーブコストを支払う際、あなたはこのオブジェクトをレストしてそのコストの1分を支払ってよい。）*\n\n" +
      "「創造のフラクタル」をサクリファイスする：あなたがコントロールする対象のトークンのトークンコピーを1つ召喚する。",
  },

  // Fragmented Spirit of Fire  [CHAMPION]  L0 FIRE
  // EN: **On Enter:** **Glimpse 6**. Draw six cards. Then **summon** a Spirit Shard token.
  "fragmented-spirit-of-fire": {
    name: "断片化した炎の精霊",
    effect: "登場時：グリンプス6する。カードを6枚引く。その後、精霊の欠片トークンを1つ召喚する。",
  },

  // Fragmented Spirit of Water  [CHAMPION]  L0 WATER
  // EN: **On Enter:** **Glimpse 6**. Draw six cards. Then **summon** a Spirit Shard token.
  "fragmented-spirit-of-water": {
    name: "断片化した水の精霊",
    effect: "登場時：グリンプス6する。カードを6枚引く。その後、精霊の欠片トークンを1つ召喚する。",
  },

  // Fragmented Spirit of Wind  [CHAMPION]  L0 WIND
  // EN: **On Enter:** **Glimpse 6**. Draw six cards. Then **summon** a Spirit Shard token.
  "fragmented-spirit-of-wind": {
    name: "断片化した風の精霊",
    effect: "登場時：グリンプス6する。カードを6枚引く。その後、精霊の欠片トークンを1つ召喚する。",
  },

  // Full Bloom  [UNIQUE/PHANTASIA]  L- TERA
  // EN: [Diao Chan Bonus] **On Enter:** Target opponent **summons** four Flowerbud tokens. /  / [Diao Chan Bonus] Whenever an opponent **summons** a Flowerbud token, deal 2 damage to each champion that opponent controls and you **recover 2**.
  "full-bloom": {
    name: "満開",
    effect:
      "［ダオ・チャンボーナス］登場時：対象の対戦相手は花のつぼみトークンを4つ召喚する。\n\n" +
      "［ダオ・チャンボーナス］対戦相手が花のつぼみトークンを召喚するたび、その対戦相手がコントロールする各チャンピオンに2点のダメージを与え、あなたはリカバー2する。",
  },

  // Geldus, Terror of Dorumegia  [UNIQUE/ALLY]  L- NORM
  // EN: **Pride 4** /  / [Level 3+] This card costs 2 less to activate. /  / [Class Bonus] **On Enter:** Geldus gains your choice of **spellshroud** or **taunt** until the beginning of your next turn.
  "geldus-terror-of-dorumegia": {
    name: "ゲルドゥス、ドルメギアの恐怖",
    effect:
      "プライド4\n\n" +
      "［レベル3以上］このカードは起動コストが2少なくなる。\n\n" +
      "［クラスボーナス］登場時：「ゲルドゥス、ドルメギアの恐怖」は、あなたの次のターンの開始時まで、スペルシュラウドまたはタウントのうちあなたが選んだものを得る。",
  },

  // Golden Checkmate  [ATTACK]  L- EXALTED,NORM
  // EN: **Command Chessman** /  / [Alice Bonus] As long as you control a Pawn unit, this card costs 2 less to activate. The same is true for Rook, Knight, Bishop, Queen, and King units. /  / [Alice Bonus] **On Hit:** At the beginning of your next recollection phase, you win the game.
  "golden-checkmate": {
    name: "黄金のチェックメイト",
    effect:
      "コマンド：チェスマン\n\n" +
      "［アリスボーナス］あなたがポーンユニットをコントロールしているかぎり、このカードは起動コストが2少なくなる。ルーク、ナイト、ビショップ、クイーン、キングの各ユニットについても同様である。\n\n" +
      "［アリスボーナス］ヒット時：あなたの次のリコレクションフェイズの開始時に、あなたはゲームに勝利する。",
  },

  // Haniel, Archangel of Spectra  [UNIQUE/ALLY]  L- NORM
  // EN: **Luxem & Umbra Imbue 3** *(You may reserve all cards revealed as you activate this card. If at least three of them are luxem and/or umbra element, this card becomes **imbued**.)* /  / **On Enter:** If CARDNAME is **imbued**, put a **debuff** counter on target ally you don't control, put a **buff** counter on CARDNAME, and **recover 1**.
  "haniel-archangel-of-spectra": {
    name: "ハニエル、スペクトラの大天使",
    effect:
      "ルクセム＆アンブラ・インビュー3 *（あなたはこのカードを起動する際、公開したすべてのカードをリザーブしてよい。そのうち少なくとも3枚がルクセムおよび／またはアンブラエレメントの場合、このカードはインビュー状態になる。）*\n\n" +
      "登場時：「ハニエル、スペクトラの大天使」がインビュー状態の場合、あなたがコントロールしていない対象のアライにデバフカウンターを1個置き、「ハニエル、スペクトラの大天使」にバフカウンターを1個置き、リカバー1する。",
  },

  // Harness Lightning  [ACTION]  L- ARCANE
  // EN: As long as you control an arcane element Shenju ally, ignore this card's elemental requirements as you activate it. /  / Choose oneâ / â¢ **Empower 4**. Then banish Harness Lightning. / â¢ Target ally gets +4 [POWER] until end of turn. Then banish Harness Lightning.
  "harness-lightning": {
    name: "稲妻の掌握",
    effect:
      "あなたがアーケインエレメントのシェンジュアライをコントロールしているかぎり、あなたはこのカードを起動する際、そのエレメント条件を無視する。\n\n" +
      "1つ選ぶ——\n" +
      "・エンパワー4する。その後、「稲妻の掌握」を追放する。\n" +
      "・ターン終了時まで、対象のアライは＋4パワーを得る。その後、「稲妻の掌握」を追放する。",
  },

  // Heartsong Reclamation  [ACTION]  L- TERA
  // EN: Destroy all regalia you don't control. Until end of turn, Animal and/or Beast allies you control gain **cleave**.   /  / [Silvie Bonus] Put five **buff** counters on each Animal and/or Beast ally you control.
  "heartsong-reclamation": {
    name: "ハートソングの奪還",
    effect:
      "あなたがコントロールしていないすべてのレガリアを破壊する。ターン終了時まで、あなたがコントロールする動物および／または獣のアライはクリーブを得る。\n\n" +
      "［シルヴィボーナス］あなたがコントロールする各動物および／または獣のアライにバフカウンターを5個置く。",
  },

  // Horn of Beastcalling  [REGALIA/ITEM]  L- TERA
  // EN: **Banish CARDNAME:** The next Beast ally card you activate this turn costs 3 less to activate. **Class Bonus:** Draw a card. *(Apply the additional effect only if your champion's class matches this card's class.)*
  "horn-of-beastcalling": {
    name: "獣招きの角笛",
    effect:
      "「獣招きの角笛」を追放する：このターン、あなたが起動する次の獣アライカードは起動コストが3少なくなる。クラスボーナス：カードを1枚引く。*（追加効果は、あなたのチャンピオンのクラスがこのカードのクラスと一致する場合のみ適用する。）*",
  },

  // Impact Hammer  [REGALIA/WEAPON]  L- FIRE
  // EN: [Class Bonus] CARDNAME gets +1 [POWER]. *(Apply this effect only if your championâs class matches this cardâs class.)* /  / Whenever a unit uses this weapon for an attack, deal 3 damage to it.
  "impact-hammer": {
    name: "インパクトハンマー",
    effect:
      "［クラスボーナス］「インパクトハンマー」は＋1パワーを得る。*（この効果は、あなたのチャンピオンのクラスがこのカードのクラスと一致する場合のみ適用する。）*\n\n" +
      "ユニットがこの武器を攻撃に使うたび、それに3点のダメージを与える。",
  },

  // Inzali, Unshackled Blaze  [UNIQUE/ALLY]  L- FIRE
  // EN: [Class Bonus] **On Attack:** You may banish a fire element card from your graveyard. If you do, deal 1 damage to each other unit.  /  / [Level 3+] [Memory 4+] CARDNAME gets +2 [POWER].
  "inzali-unshackled-blaze": {
    name: "インザリ、解き放たれし業火",
    effect:
      "［クラスボーナス］攻撃時：あなたの墓地から火エレメントのカードを1枚追放してよい。そうしたなら、他の各ユニットに1点のダメージを与える。\n\n" +
      "［レベル3以上］［メモリー4以上］「インザリ、解き放たれし業火」は＋2パワーを得る。",
  },

  // Krustallan Longsword  [REGALIA/WEAPON]  L- WATER
  // EN: [Class Bonus] As long as you have four or more water element cards in your graveyard, Krustallan Longsword gets +1 [POWER]. *(Apply this effect only if your championâs class matches this cardâs class.)*
  "krustallan-longsword": {
    name: "クリスタランのロングソード",
    effect:
      "［クラスボーナス］あなたの墓地に水エレメントのカードが4枚以上あるかぎり、「クリスタランのロングソード」は＋1パワーを得る。*（この効果は、あなたのチャンピオンのクラスがこのカードのクラスと一致する場合のみ適用する。）*",
  },

  // Lightweaver's Infinite Shaping  [UNIQUE/PHANTASIA]  L- LUXEM
  // EN: [Zander Bonus] Cards you reveal from your memory have all abilities of each other card revealed this way from your memory. /  / **On Enter:** Reveal all cards in your memory. /  / At the beginning of your end phase, sacrifice CARDNAME.
  "lightweavers-infinite-shaping": {
    name: "ライトウィーバーの無限の形成",
    effect:
      "［ザンダーボーナス］あなたが自分のメモリーから公開するカードは、この方法であなたのメモリーから公開された他の各カードのすべての能力を持つ。\n\n" +
      "登場時：あなたのメモリーのすべてのカードを公開する。\n\n" +
      "あなたのエンドフェイズの開始時に、「ライトウィーバーの無限の形成」をサクリファイスする。",
  },

  // Limitless Defiance  [ACTION]  L- EXIA
  // EN: For each damage counter on your champion, banish the top card of your deck. /  / [Jin Bonus] Until end of turn, you may activate Warrior action and Warrior attack cards banished this way without paying their reserve cost. When you do, wake up your champion. 
  "limitless-defiance": {
    name: "無限の反逆",
    effect:
      "あなたのチャンピオン上のダメージカウンター1個につき、あなたのデッキの一番上のカードを追放する。\n\n" +
      "［ジンボーナス］ターン終了時まで、あなたはこの方法で追放したウォリアーのアクションカードおよびウォリアーのアタックカードを、そのリザーブコストを支払わずに起動してよい。そうしたとき、あなたのチャンピオンをアウェイクにする。",
  },

  // Lost Providence  [REGALIA/ITEM]  L- EXALTED,NORM
  // EN: **Divine Relic**, **Hindered** /  / You may activate this card from your material deck. If you do it enters the field **ephemeral**. /  / [REST],** Banish CARDNAME:** Draw a card. / 
  "lost-providence": {
    name: "失われた摂理",
    effect:
      "ディヴァインレリック、ヒンダード\n\n" +
      "あなたはこのカードをあなたのマテリアルデッキから起動してよい。そうしたなら、それはエフェメラルの状態で戦場に出る。\n\n" +
      "レスト、「失われた摂理」を追放する：カードを1枚引く。",
  },

  // Lunar Conduit  [REGALIA/ITEM]  L- ASTRA
  // EN: [Class Bonus] This card costs 1 less to materialize. /  / Whenever you activate an astra element card, put a **charge** counter on CARDNAME. /  / (3), [REST]**:** As a Spell, deal an amount of damage to target unit equal to the amount of **charge** counters on CARDNAME. Then remove a **charge** counter from CARDNAME.
  "lunar-conduit": {
    name: "月のコンジット",
    effect:
      "［クラスボーナス］このカードはマテリアライズコストが1少なくなる。\n\n" +
      "あなたがアストラエレメントのカードを起動するたび、「月のコンジット」にチャージカウンターを1個置く。\n\n" +
      "(3)、レスト：スペルとして、対象のユニットに、「月のコンジット」上のチャージカウンターの数に等しい量のダメージを与える。その後、「月のコンジット」からチャージカウンターを1個取り除く。",
  },

  // Memento Mori  [REGALIA/ITEM]  L- UMBRA
  // EN: Whenever an ally dies, put a **prize** counter on CARDNAME. /  / **Banish CARDNAME:** Draw three cards. Activate this ability only at slow speed and only if there are six or more **prize** counters on CARDNAME.
  "memento-mori": {
    name: "メメント・モリ",
    effect:
      "アライが死亡するたび、「メメント・モリ」にプライズカウンターを1個置く。\n\n" +
      "「メメント・モリ」を追放する：カードを3枚引く。この能力はスロースピードでのみ、かつ「メメント・モリ」の上にプライズカウンターが6個以上ある場合のみ起動する。",
  },

  // Mercenary's Blade  [REGALIA/WEAPON]  L- NORM
  // EN: [Class Bonus] You may remove a **preparation** counter from your champion to activate this card from your material deck. *(Apply this effect only if your championâs class matches this cardâs class.)*
  "mercenarys-blade": {
    name: "傭兵の刃",
    effect:
      "［クラスボーナス］あなたはあなたのチャンピオンからプレパレーションカウンターを1個取り除いて、このカードをあなたのマテリアルデッキから起動してよい。*（この効果は、あなたのチャンピオンのクラスがこのカードのクラスと一致する場合のみ適用する。）*",
  },

  // Necklace of Foresight  [REGALIA/ITEM]  L- NORM
  // EN: [Class Bonus] This card costs 1 less to materialize. /  / **Banish CARDNAME:** **Glimpse 4**. *(To **glimpse**, look at that many cards from the top of your deck. Put those cards back on the top or on the bottom of your deck in any order.)*
  "necklace-of-foresight": {
    name: "先見のネックレス",
    effect:
      "［クラスボーナス］このカードはマテリアライズコストが1少なくなる。\n\n" +
      "「先見のネックレス」を追放する：グリンプス4する。*（グリンプスするには、デッキの一番上からその枚数のカードを見る。それらのカードを好きな順番でデッキの一番上または一番下に戻す。）*",
  },

  // Nox, Final Release  [UNIQUE/ITEM]  L- UMBRA
  // EN: This card costs 2 less to activate for each Curse card in your champion's lineage. /  / **On Enter:** Load CARDNAME into an unloaded Gun weapon you control. /  / [Diana Bonus ] **On Champion Hit:** That opponent discards four cards. Then if that opponent's **influence** is four or less, destroy the hit champion.
  "nox-final-release": {
    name: "ノックス、最後の解放",
    effect:
      "このカードは、あなたのチャンピオンのリネージュにある呪いカード1枚につき、起動コストが2少なくなる。\n\n" +
      "登場時：「ノックス、最後の解放」を、あなたがコントロールするロードされていない銃武器にロードする。\n\n" +
      "［ダイアナボーナス］チャンピオンヒット時：その対戦相手はカードを4枚捨てる。その後、その対戦相手のインフルエンスが4以下の場合、ヒットしたチャンピオンを破壊する。",
  },

  // Portentous Tanggu  [REGALIA/ITEM]  L- NORM
  // EN: [Guo Jia Bonus] **On Enter**: Put a **quest** counter on your champion. *(Apply this effect only if your champion is Guo Jia.)* /  / (3), **Banish CARDNAME**: Draw a card into your memory.
  "portentous-tanggu": {
    name: "前兆のタンググ",
    effect:
      "［グオ・ジアボーナス］登場時：あなたのチャンピオンにクエストカウンターを1個置く。*（この効果は、あなたのチャンピオンがグオ・ジアの場合のみ適用する。）*\n\n" +
      "(3)、「前兆のタンググ」を追放する：カードを1枚あなたのメモリーに引く。",
  },

  // Pouvoir Absolu  [ACTION]  L- UMBRA
  // EN: [Ciel Bonus] Banish the top ten cards of your deck and put an **omen** counter on each of them. For the rest of the game, you may activate your **omens**.
  "pouvoir-absolu": {
    name: "絶対権力",
    effect:
      "［シエルボーナス］あなたのデッキの一番上から10枚を追放し、それぞれにオーメンカウンターを1個置く。このゲームの残りの間、あなたは自分のオーメンを起動してよい。",
  },

  // Prismspire Scepter  [REGALIA/ITEM]  L- NORM
  // EN: [Merlin Bonus] **On Enter:** As a Spell, put two **sheen** counters on target champion you don't control. /  / (3), **Banish CARDNAME:** Draw a card into your memory.
  "prismspire-scepter": {
    name: "プリズムスパイアの笏",
    effect:
      "［マーリンボーナス］登場時：スペルとして、あなたがコントロールしていない対象のチャンピオンにシーンカウンターを2個置く。\n\n" +
      "(3)、「プリズムスパイアの笏」を追放する：カードを1枚あなたのメモリーに引く。",
  },

  // Raziel, Archangel of Libra  [UNIQUE/ALLY]  L- NORM
  // EN: **Arcane & Astra Imbue 3** *(You may reserve all cards revealed as you activate this card. If at least three of them are arcane and/or astra element, this card becomes **imbued**.)* /  / **On Enter:** If CARDNAME is **imbued**, banish two cards at random from your memory. If you do, **glimpse 3** and then put the top two cards of your deck into your memory.
  "raziel-archangel-of-libra": {
    name: "ラジエル、天秤の大天使",
    effect:
      "アーケイン＆アストラ・インビュー3 *（あなたはこのカードを起動する際、公開したすべてのカードをリザーブしてよい。そのうち少なくとも3枚がアーケインおよび／またはアストラエレメントの場合、このカードはインビュー状態になる。）*\n\n" +
      "登場時：「ラジエル、天秤の大天使」がインビュー状態の場合、あなたのメモリーからランダムに2枚を追放する。そうしたなら、グリンプス3し、その後あなたのデッキの一番上から2枚をあなたのメモリーに置く。",
  },

  // Sanctum of Esoteric Truth  [DOMAIN]  L- NORM
  // EN: Whenever your champion levels up, you may put two cards from your hand and/or memory on the bottom of your deck. If you do, draw two cards.
  "sanctum-of-esoteric-truth": {
    name: "秘奥の聖域",
    effect:
      "あなたのチャンピオンがレベルアップするたび、あなたは手札および／またはメモリーから2枚をデッキの一番下に置いてよい。そうしたなら、カードを2枚引く。",
  },

  // Scout the Land  [ACTION]  L- WIND
  // EN: Look at the top four cards of your deck and put them back in any order. Draw a card.
  "scout-the-land": {
    name: "土地の偵察",
    effect:
      "あなたのデッキの一番上から4枚を見て、好きな順番で戻す。カードを1枚引く。",
  },

  // Seraphic Legion's Descent  [UNIQUE/PHANTASIA]  L- EXALTED,NORM
  // EN: **On Enter: **Search your deck for any amount of Angel ally cards. Banish those cards along with any amount of Angel ally cards from your hand, memory, and/or graveyard. Shuffle your deck. Then draw a card into your memory for each card banished from your hand and memory this way. /  / [Level 3+] (1), [REST]: Until end of turn, you may activate target card banished by CARDNAME.
  "seraphic-legions-descent": {
    name: "熾天の軍団の降臨",
    effect:
      "登場時：あなたのデッキから好きな数の天使アライカードを探す。それらのカードを、あなたの手札・メモリー・墓地からの好きな数の天使アライカードとともに追放する。あなたのデッキを切り直す。その後、この方法で手札とメモリーから追放した各カードにつき、カードを1枚あなたのメモリーに引く。\n\n" +
      "［レベル3以上］(1)、レスト：ターン終了時まで、あなたは「熾天の軍団の降臨」によって追放された対象のカードを起動してよい。",
  },

  // Shatter the Brittle  [ACTION]  L- FIRE
  // EN: Activate this card only if you control a Fatestone or Fatebound object. /  / Destroy target item or weapon with memory cost 1 or less, or with reserve cost 5 or less. If you do, its controller draws a card into their memory.
  "shatter-the-brittle": {
    name: "脆きものの粉砕",
    effect:
      "このカードは、あなたが運命石または運命縛りのオブジェクトをコントロールしている場合のみ起動する。\n\n" +
      "メモリーコスト1以下、またはリザーブコスト5以下の対象のアイテムまたは武器を破壊する。そうしたなら、そのコントローラーはカードを1枚自分のメモリーに引く。",
  },

  // Shuang Ji of Sacrifice  [REGALIA/WEAPON]  L- EXIA
  // EN: [Class Bonus] For every five damage counters on your champion, CARDNAME gets +1 [POWER]. /  / **On Enter**: You may have CARDNAME deal 5 unpreventable damage to your champion. If you do, draw a card.
  "shuang-ji-of-sacrifice": {
    name: "犠牲の双戟",
    effect:
      "［クラスボーナス］あなたのチャンピオン上のダメージカウンター5個につき、「犠牲の双戟」は＋1パワーを得る。\n\n" +
      "登場時：あなたは「犠牲の双戟」にあなたのチャンピオンへ5点の軽減不能のダメージを与えさせてよい。そうしたなら、カードを1枚引く。",
  },

  // Solomon, Master of Elements  [UNIQUE/ALLY]  L- EXALTED,NORM
  // EN: **On Enter:** You may discard all cards in your hand and memory. If you do, **generate** an Arcane Sight, Astra Sight, Crux Sight, Exia Sight, Luxem Sight, Neos Sight, Tera Sight, and Umbra Sight card and put them into your memory. For the rest the game, ignore the elemental requirements of cards you activate with the same name as one of the **generated** cards.
  "solomon-master-of-elements": {
    name: "ソロモン、元素の支配者",
    effect:
      "登場時：あなたは手札とメモリーのすべてのカードを捨ててよい。そうしたなら、「アーケインの視」「アストラの視」「クラックスの視」「エクシアの視」「ルクセムの視」「ネオスの視」「テラの視」「アンブラの視」のカードを1枚ずつ生成し、それらをあなたのメモリーに置く。このゲームの残りの間、あなたが起動する、生成したカードのいずれかと同じ名前のカードのエレメント条件を無視する。",
  },

  // Spellward Scepter  [REGALIA/ITEM]  L- NORM
  // EN: **Hindered** *(This object enters the field rested.)* /  / [REST], **Banish Spellward Scepter**: The activation of the next card you activate this turn can't be **negated**.
  "spellward-scepter": {
    name: "呪除けの笏",
    effect:
      "ヒンダード *（このオブジェクトはレストして戦場に出る。）*\n\n" +
      "レスト、「呪除けの笏」を追放する：このターン、あなたが起動する次のカードの起動は打ち消されない。",
  },

  // Spirit Blade: Retribution  [ATTACK]  L- CRUX
  // EN: As long as you've activated a card named CARDNAME this game, this card costs 10 less to activate and you may activate it from your graveyard. /  / **Cleave** /  / [Lorraine Bonus] Retribution gets +**X**[POWER], where **X** is the total power among ally, attack, and weapon cards in your banishment. 
  "spirit-blade-retribution": {
    name: "スピリットブレード：報復",
    effect:
      "このゲームであなたが「スピリットブレード：報復」という名前のカードを起動していたかぎり、このカードは起動コストが10少なくなり、あなたはこれを墓地から起動してよい。\n\n" +
      "クリーブ\n\n" +
      "［ローレインボーナス］「スピリットブレード：報復」は＋Xパワーを得る。Xはあなたの追放領域にあるアライ・アタック・武器の各カードのパワーの合計。",
  },

  // Spirit of Fortuitous Fire  [CHAMPION]  L0 FIRE
  // EN: **On Enter**: **Glimpse 7**. Draw seven cards into your memory.
  "spirit-of-fortuitous-fire": {
    name: "幸運なる炎の精霊",
    effect: "登場時：グリンプス7する。カードを7枚あなたのメモリーに引く。",
  },

  // Spirit of Fortuitous Water  [CHAMPION]  L0 WATER
  // EN: **On Enter**: **Glimpse 7**. Draw seven cards into your memory.
  "spirit-of-fortuitous-water": {
    name: "幸運なる水の精霊",
    effect: "登場時：グリンプス7する。カードを7枚あなたのメモリーに引く。",
  },

  // Spirit of Fortuitous Wind  [CHAMPION]  L0 WIND
  // EN: **On Enter**: **Glimpse 7**. Draw seven cards into your memory.
  "spirit-of-fortuitous-wind": {
    name: "幸運なる風の精霊",
    effect: "登場時：グリンプス7する。カードを7枚あなたのメモリーに引く。",
  },

  // Storm of Thorns  [ACTION]  L- WATER
  // EN: If damage would be dealt to a unit you control this turn, prevent 1 of that damage. If the damage prevented had a unit as its source, deal 1 damage to that unit.  /  / [Class Bonus] **Floating Memory**
  "storm-of-thorns": {
    name: "茨の嵐",
    effect:
      "このターン、あなたがコントロールするユニットにダメージが与えられる場合、そのダメージのうち1点を軽減する。軽減したダメージの発生源がユニットだった場合、そのユニットに1点のダメージを与える。\n\n" +
      "［クラスボーナス］フローティングメモリー",
  },

  // Supernova Divination  [UNIQUE/PHANTASIA]  L- ASTRA
  // EN: **Spellshroud** /  / [Arisanna Bonus] At the beginning of each player's recollection phase and whenever you **starcall** a card, put a **divination** counter on CARDNAME. Then if there are ten **divination** counters on CARDNAME, sacrifice it. If you do, all units you don't control lose all abilities until end of turn. Then deal 25 unpreventable damage to each of them.
  "supernova-divination": {
    name: "超新星の占術",
    effect:
      "スペルシュラウド\n\n" +
      "［アリサナボーナス］各プレイヤーのリコレクションフェイズの開始時、およびあなたがカードをスターコールするたび、「超新星の占術」に占術カウンターを1個置く。その後、「超新星の占術」の上に占術カウンターが10個ある場合、それをサクリファイスする。そうしたなら、あなたがコントロールしていないすべてのユニットは、ターン終了時まですべての能力を失う。その後、それらのそれぞれに25点の軽減不能のダメージを与える。",
  },

  // Sword Saint's Vow  [REGALIA/WEAPON]  L- NORM
  // EN: [Class Bonus] Sword Saint's Vow gets +1 [POWER] for each **durability** counter on it. / [Class Bonus] Whenever you activate a Craft action card, put two **durability** counters on Sword Saint's Vow. / **On Hit**: Remove a **durability** counter from Sword Saint's Vow.
  "sword-saints-vow": {
    name: "剣聖の誓い",
    effect:
      "［クラスボーナス］「剣聖の誓い」は、それの上の耐久カウンター1個につき、＋1パワーを得る。\n\n" +
      "［クラスボーナス］あなたがクラフトのアクションカードを起動するたび、「剣聖の誓い」に耐久カウンターを2個置く。\n\n" +
      "ヒット時：「剣聖の誓い」から耐久カウンターを1個取り除く。",
  },

  // Tabula of Salvage  [REGALIA/ITEM]  L- NORM
  // EN: **Banish Tabula of Salvage**: Choose up to five cards from your graveyard and put them on the bottom of your deck in any order.
  "tabula-of-salvage": {
    name: "回収のタブラ",
    effect:
      "「回収のタブラ」を追放する：あなたの墓地からカードを最大5枚選び、好きな順番でデッキの一番下に置く。",
  },

  // The Looking Glass  [REGALIA/ITEM]  L- NORM
  // EN: **Divine Relic** /  / **Omnishroud** /  / If this card is in your starting material deck, you may begin the game with it on the field.  /  / Ignore the elemental requirements of Distortion cards you play.
  "the-looking-glass": {
    name: "ルッキンググラス",
    effect:
      "ディヴァインレリック\n\n" +
      "オムニシュラウド\n\n" +
      "このカードがあなたの初期マテリアルデッキにある場合、あなたはゲーム開始時にこれを戦場に出した状態で始めてよい。\n\n" +
      "あなたがプレイするディストーションカードのエレメント条件を無視する。",
  },

  // Tome of Abyssal Heaven  [REGALIA/ITEM]  L- EXIA
  // EN: CARDNAME enters the field with **X** **page** counters on it, where **X** is the amount of damage counters on your champion. /  / Other objects you control have **spellshroud**. /  / At the beginning of your recollection phase, remove eight **page** counters from CARDNAME. If you do, draw a card. If you don't, you lose the game.
  "tome-of-abyssal-heaven": {
    name: "深淵の天界の書",
    effect:
      "「深淵の天界の書」はX個のページカウンターを乗せて戦場に出る。Xはあなたのチャンピオン上のダメージカウンターの数。\n\n" +
      "あなたがコントロールする他のオブジェクトはスペルシュラウドを持つ。\n\n" +
      "あなたのリコレクションフェイズの開始時に、「深淵の天界の書」からページカウンターを8個取り除く。そうしたなら、カードを1枚引く。そうしなかった場合、あなたはゲームに敗北する。",
  },

  // Windwalker Boots  [REGALIA/ITEM]  L- WIND
  // EN: [Class Bonus] At the beginning of your end phase, if your champion is awake, put a **preparation** counter on them. /  / **Banish CARDNAME:** Draw a card. Activate this ability only if your champion has five or more **preparation** counters on them.
  "windwalker-boots": {
    name: "風渡りのブーツ",
    effect:
      "［クラスボーナス］あなたのエンドフェイズの開始時に、あなたのチャンピオンがアウェイクの場合、それにプレパレーションカウンターを1個置く。\n\n" +
      "「風渡りのブーツ」を追放する：カードを1枚引く。この能力は、あなたのチャンピオン上にプレパレーションカウンターが5個以上ある場合のみ起動する。",
  },

  // Woodland Squirrels  [ALLY]  L- NORM
  // EN: (効果テキストなし)
  "woodland-squirrels": {
    name: "森のリス",
    effect: "",
  },

  // Xukong, Shifted Fates  [UNIQUE/PHANTASIA]  L- TERA
  // EN: **Spellshroud** /  / [Kongming Bonus] Whenever your Shifting Currents change to facing the opposite direction, reveal the top three cards of your deck and put them into your material deck **preserved**. Then deal 6+**X** damage to target unit you don't control where **X** is the amount of **preserved** cards in your material deck.  /  / 
  "xukong-shifted-fates": {
    name: "シューコン、転じし運命",
    effect:
      "スペルシュラウド\n\n" +
      "［コンミンボーナス］あなたの「移ろう潮流」が反対の方向を向くように変わるたび、あなたのデッキの一番上から3枚を公開し、プリザーブしてあなたのマテリアルデッキに置く。その後、あなたがコントロールしていない対象のユニットに6＋X点のダメージを与える。Xはあなたのマテリアルデッキにあるプリザーブされたカードの数。",
  },

  // Dematerialize  [ACTION]  L- WIND
  // EN: Return target regalia to its owner's material deck.
  "dematerialize": {
    name: "実体化解除",
    effect: "対象のレガリアをオーナーのマテリアルデッキに戻す。",
  },

  // Gentle Respite  [ACTION]  L- NORM
  // EN: If target opponent's influence is greater than yours, draw a card into your memory. *(...)* / Floating Memory
  "gentle-respite": {
    name: "穏やかな小休止",
    effect:
      "対象の対戦相手のインフルエンスがあなたのものより大きい場合、カードを1枚あなたのメモリーに引く。*（プレイヤーのインフルエンスは、その手札とメモリーのカードの合計枚数に等しい。）*\n\n" +
      "フローティングメモリー",
  },

  // Prismatic Edge  [REGALIA/WEAPON]  L- CRUX
  // EN: [Class Bonus] On Enter: Each player reveals all cards in their memory. If a fire element card was revealed, choose a unit and deal 3 damage to it. If a water element card was revealed, draw a card. If a wind element card was revealed, each opponent banishes a card at random from their memory.
  "prismatic-edge": {
    name: "プリズマティック・エッジ",
    effect:
      "［クラスボーナス］登場時：各プレイヤーは自分のメモリーのすべてのカードを公開する。火エレメントのカードが公開された場合、ユニットを1体選び、それに3点のダメージを与える。水エレメントのカードが公開された場合、カードを1枚引く。風エレメントのカードが公開された場合、各対戦相手は自分のメモリーからランダムにカードを1枚追放する。",
  },

  // Spurn to Ash  [ACTION]  L- FIRE
  // EN: Destroy target regalia with memory cost 1 or less.
  "spurn-to-ash": {
    name: "灰への拒絶",
    effect: "メモリーコスト1以下の対象のレガリアを破壊する。",
  },

});
