"use strict";
/*
 * Distorted Reflections Starter Decks (DTRSD) 日本語訳
 * 各カードの下のコメントが英語原文（参照用）。用語は TRANSLATION.md に統一。
 */
window.GA_I18N = window.GA_I18N || { meta: {}, terms: {}, cards: {} };
window.GA_I18N.cards = Object.assign(window.GA_I18N.cards || {}, {

  // Aetheric Calibration  [ACTION]  NORM
  // EN: Glimpse 4. Then reveal the top card of your deck. If that card is an Aethercharge card, put it into your memory. / You may load Aetheric Calibration into an Aetherwing weapon you control.
  "aetheric-calibration": {
    name: "エーテル調整",
    effect:
      "グリンプス4。その後、あなたのデッキの一番上のカードを公開する。それがエーテルチャージ・カードなら、それをあなたのメモリーに置く。\n\n" +
      "あなたは、あなたがコントロールするエーテルウィング武器に「エーテル調整」を装填してもよい。",
  },

  // Aquamirage Whisper  [REGALIA/WEAPON]  WATER
  // EN: Spellshroud (This object can't be targeted by Spells.) / [Class Bonus] On Hit: Glimpse 1+X where X is the amount of damage dealt by this hit. Then put the top card of your deck into your graveyard.
  "aquamirage-whisper": {
    name: "アクアミラージュ・ウィスパー",
    effect:
      "スペルシュラウド *（このオブジェクトはスペルの対象にできない。）*\n\n" +
      "[クラスボーナス] ヒット時：グリンプス（1＋X）を行う。Xはこのヒットで与えたダメージの量である。その後、あなたのデッキの一番上のカードを墓地に置く。",
  },

  // Astra Sight  [ACTION]  ASTRA
  // EN: Starcalling — (0) (While glimpsing you may activate this card by paying this cost; if you do, put all other cards you're looking at on the bottom of your deck in any order.) / Glimpse 1, then draw a card.
  "astra-sight": {
    name: "アストラ・サイト",
    effect:
      "スターコーリング ― (0) *（グリンプス中にこのカードを見ているとき、このコストを支払って起動してよい。そうした場合、見ている他のすべてのカードを好きな順でデッキの一番下に置く。）*\n\n" +
      "グリンプス1を行い、その後カードを1枚引く。",
  },

  // Astral Shard  [TOKEN/PHANTASIA]  ASTRA
  // EN: Sacrifice Astral Shard: Glimpse 2.
  "astral-shard": {
    name: "アストラルシャード",
    effect: "「アストラルシャード」を生け贄に捧げる：グリンプス2。",
  },

  // Backstep  [ACTION]  NORM
  // EN: Target unit becomes distant. (Units stay distant until the end of their controller's turn.) / Draw a card.
  "backstep": {
    name: "バックステップ",
    effect:
      "対象のユニット1体はディスタントになる。*（ユニットはコントローラーのターン終了時までディスタントのままである。）*\n\n" +
      "カードを1枚引く。",
  },

  // Bauble of Abundance  [REGALIA/ITEM]  NORM
  // EN: Banish Bauble of Abundance: Each player draws a card.
  "bauble-of-abundance": {
    name: "豊穣の宝珠",
    effect: "「豊穣の宝珠」を追放する：各プレイヤーはカードを1枚引く。",
  },

  // Bulwark Sword  [REGALIA/WEAPON]  NORM
  // EN: [Class Bonus] Bulwark Sword gets +1 POWER. / As an additional cost to use this weapon for an attack, pay (2).
  "bulwark-sword": {
    name: "防壁の剣",
    effect:
      "[クラスボーナス]「防壁の剣」は+1パワーを得る。*（この効果は、あなたのチャンピオンのクラスがこのカードのクラスと一致する場合のみ適用する。）*\n\n" +
      "この武器を攻撃に使用するための追加コストとして、(2)を支払う。",
  },

  // Charge the Soul  [ACTION]  NORM
  // EN: Deal 1 damage to target unit. Then you may load Charge the Soul into an Aetherwing weapon you control. / [Class Bonus] Floating Memory
  "charge-the-soul": {
    name: "魂の充填",
    effect:
      "対象のユニット1体に1ダメージを与える。その後、あなたがコントロールするエーテルウィング武器に「魂の充填」を装填してもよい。\n\n" +
      "[クラスボーナス] フローティングメモリー *（メモリーコストの支払い中に、このカードを墓地から追放してそのコストの1点分の支払いに充ててよい。）*",
  },

  // Ciel, Loyal Valet  [CHAMPION]  L1 NORM
  // EN: On Enter: You gain the Servile Possessions mastery. / Inherited Effect — At the beginning of your end phase, you may banish a card from your graveyard or hand and put an omen counter on it.
  "ciel-loyal-valet": {
    name: "シエル、忠実な従者",
    effect:
      "登場時：あなたは「隷属する所有物（Servile Possessions）」マスタリーを得る。\n\n" +
      "継承効果 ― あなたのエンドフェイズの開始時に、あなたは自分の墓地または手札のカード1枚を追放し、それにオーメンカウンターを1個置いてもよい。",
  },

  // Ciel, Mirage's Grave  [CHAMPION]  L3 UMBRA
  // EN: Ciel Lineage / Whenever an omen counter is put on a card in your banishment, as a Spell, deal 2 unpreventable damage to up to one target unit.
  "ciel-mirages-grave": {
    name: "シエル、蜃気楼の墓標",
    effect:
      "シエル・リネージュ\n\n" +
      "あなたの追放領域のカードにオーメンカウンターが置かれるたび、スペルとして、対象のユニット最大1体に2点の軽減不能ダメージを与える。",
  },

  // Ciel, Omenbringer  [CHAMPION]  L2 NORM
  // EN: Ciel Lineage / On Enter: For each omen you have, discard a card from your hand or memory and draw a card into your memory. / Lineage Release — You may activate one of your omens. Activate this ability only if you have six or more omens.
  "ciel-omenbringer": {
    name: "シエル、オーメンブリンガー",
    effect:
      "シエル・リネージュ\n\n" +
      "登場時：あなたが持つオーメン1つにつき、手札またはメモリーからカードを1枚捨て、カードを1枚あなたのメモリーに引く。\n\n" +
      "リネージュ解放 ― あなたは自分のオーメンを1つ起動してよい。この能力は、あなたがオーメンを6つ以上持っている場合にのみ起動できる。",
  },

  // Conflagrant Sentinel  [ALLY]  FIRE
  // EN: On Enter: You may discard a card. If you do, put a buff counter on Conflagrant Sentinel. (Allies get +1POWER and +1LIFE for each buff counter on them.)
  "conflagrant-sentinel": {
    name: "燃え盛る歩哨",
    effect:
      "登場時：あなたはカードを1枚捨ててもよい。そうした場合、「燃え盛る歩哨」にバフカウンターを1個置く。*（アライは自身に置かれたバフカウンター1個につき+1パワーと+1ライフを得る。）*",
  },

  // Constellation's Blessing  [ACTION]  ASTRA
  // EN: [Element Bonus] Aethercalling / [Class Bonus] Draw a card. Then you may load Constellation's Blessing into an Aetherwing weapon you control.
  "constellations-blessing": {
    name: "星座の祝福",
    effect:
      "[エレメントボーナス] エーテルコーリング *（グリンプス中にこのカードを見ているとき、あなたがコントロールするエーテルウィング武器にこれを装填してよい。）*\n\n" +
      "[クラスボーナス] カードを1枚引く。その後、あなたがコントロールするエーテルウィング武器に「星座の祝福」を装填してもよい。",
  },

  // Corsair Captain  [ALLY]  WATER
  // EN: Ranged 2 (As long as this unit is distant, its attacks get +2POWER.) / [Class Bonus] Floating Memory
  "corsair-captain": {
    name: "海賊の船長",
    effect:
      "レンジド2 *（このユニットがディスタントである限り、その攻撃は+2パワーを得る。）*\n\n" +
      "[クラスボーナス] フローティングメモリー *（メモリーコストの支払い中に、このカードを墓地から追放してそのコストの1点分の支払いに充ててよい。）*",
  },

  // Coy Bouclier  [ALLY]  NORM
  // EN: [Level 2+] This card costs 2 less to activate. / [Class Bonus] As long as you control another ally, Coy Bouclier has taunt.
  "coy-bouclier": {
    name: "コイ・ブークリエ",
    effect:
      "[レベル2以上] このカードの起動コストが2少なくなる。\n\n" +
      "[クラスボーナス] あなたが他のアライをコントロールしている限り、「コイ・ブークリエ」はタウントを持つ。*（アウェイクである限り、タウントを持つこのアライは、対戦相手の攻撃宣言時に、可能なら自分がコントロールする他のオブジェクトより先に対象にされなければならない。）*",
  },

  // Devotion's Price  [ACTION]  UMBRA
  // EN: As an additional cost to activate this card, discard two cards. / For each omen you have with a different reserve cost, draw a card. Until end of turn, you can't draw cards.
  "devotions-price": {
    name: "献身の代償",
    effect:
      "このカードを起動するための追加コストとして、カードを2枚捨てる。\n\n" +
      "あなたが持つ、異なるリザーブコストのオーメン1つにつき、カードを1枚引く。ターン終了時まで、あなたはカードを引けない。",
  },

  // Diana, Aether Dilettante  [CHAMPION]  L1 NORM
  // EN: On Enter: If Diana is distant, materialize an Aetherwing card from your material deck. (You still pay its costs.) / Inherited Effect — Ranged 1
  "diana-aether-dilettante": {
    name: "ダイアナ、エーテルの門外漢",
    effect:
      "登場時：「ダイアナ」がディスタントなら、あなたのマテリアルデッキからエーテルウィング・カードを1枚マテリアライズする。*（コストは通常どおり支払う。）*\n\n" +
      "継承効果 ― レンジド1 *（このユニットがディスタントである限り、その攻撃は+1パワーを得る。）*",
  },

  // Diana, Judgment's Arrow  [CHAMPION]  L2 NORM
  // EN: Diana Lineage / On Enter: Load up to two Aethercharge cards from your hand and/or memory into an Aetherwing weapon you control. For each card loaded this way, draw a card into your memory. / Inherited Effect — Ranged 1
  "diana-judgments-arrow": {
    name: "ダイアナ、裁きの矢",
    effect:
      "ダイアナ・リネージュ\n\n" +
      "登場時：あなたの手札および／またはメモリーから、エーテルチャージ・カードを最大2枚、あなたがコントロールするエーテルウィング武器に装填する。この方法で装填したカード1枚につき、カードを1枚あなたのメモリーに引く。\n\n" +
      "継承効果 ― レンジド1",
  },

  // Diana, Moonpiercer  [CHAMPION]  L3 ASTRA
  // EN: Diana Lineage / Whenever Diana becomes distant, choose one — • Negate each card activation that targets Diana unless its controller pays (2). Then if Diana is defending, end the combat phase unless the attacking player pays (2). • Glimpse 2.
  "diana-moonpiercer": {
    name: "ダイアナ、ムーンピアサー",
    effect:
      "ダイアナ・リネージュ\n\n" +
      "「ダイアナ」がディスタントになるたび、次の中から1つを選ぶ ―\n" +
      "・「ダイアナ」を対象とする各カードの起動を、そのコントローラーが(2)を支払わない限り打ち消す。その後、「ダイアナ」が防御しているなら、攻撃側のプレイヤーが(2)を支払わない限り戦闘フェイズを終了する。\n" +
      "・グリンプス2。",
  },

  // Dissuading Aether  [ACTION]  WATER
  // EN: Target unit's attacks get -3POWER until end of turn. Then you may load Dissuading Aether into an Aetherwing weapon you control.
  "dissuading-aether": {
    name: "押し留めるエーテル",
    effect:
      "ターン終了時まで、対象のユニットの攻撃は-3パワーを得る。その後、あなたがコントロールするエーテルウィング武器に「押し留めるエーテル」を装填してもよい。",
  },

  // Drown in Aether  [ACTION]  WATER
  // EN: [Class Bonus] Fast Activation / Target rested ally gets -3LIFE until end of turn. Then you may load Drown in Aether into an Aetherwing weapon you control.
  "drown-in-aether": {
    name: "エーテルに沈める",
    effect:
      "[クラスボーナス] 高速起動 *（このカードを高速で起動してよい。）*\n\n" +
      "ターン終了時まで、対象のレスト状態のアライは-3ライフを得る。その後、あなたがコントロールするエーテルウィング武器に「エーテルに沈める」を装填してもよい。",
  },

  // Flamme Sorcel  [ACTION]  FIRE
  // EN: Draw a card, then discard a card. If the reserve cost of the discarded card is equal to the reserve cost of one of your omens, draw another card.
  "flamme-sorcel": {
    name: "フラム・ソルセル",
    effect:
      "カードを1枚引き、その後カードを1枚捨てる。捨てたカードのリザーブコストが、あなたのオーメンのいずれかのリザーブコストと等しいなら、さらにカードを1枚引く。",
  },

  // Foresight Lens  [REGALIA/ITEM]  NORM
  // EN: Banish Foresight Lens: Glimpse 2. If your champion is distant, glimpse 4 instead.
  "foresight-lens": {
    name: "先見のレンズ",
    effect:
      "「先見のレンズ」を追放する：グリンプス2。あなたのチャンピオンがディスタントなら、代わりにグリンプス4を行う。*（グリンプスでは、デッキの上からその枚数のカードを見て、好きな順でデッキの上または下に戻す。）*",
  },

  // Grande Aiguille  [REGALIA/WEAPON]  NORM
  // EN: [Ciel Bonus] As long as you have two or more ally omens, Grande Aiguille gets +1POWER.
  "grande-aiguille": {
    name: "グランド・エギュイユ",
    effect:
      "[シエルボーナス] あなたがアライのオーメンを2つ以上持っている限り、「グランド・エギュイユ」は+1パワーを得る。*（オーメンとは、追放領域にありオーメンカウンターが置かれたカードのこと。）*",
  },

  // Grande Sonnerie  [REGALIA/WEAPON]  UMBRA
  // EN: [Ciel Bonus] As long as the total reserve cost of your omens is 10 or greater, Grande Sonnerie gets +2POWER.
  "grande-sonnerie": {
    name: "グランド・ソヌリ",
    effect:
      "[シエルボーナス] あなたのオーメンのリザーブコストの合計が10以上である限り、「グランド・ソヌリ」は+2パワーを得る。",
  },

  // Guided Starlight  [ACTION]  ASTRA
  // EN: [Element Bonus] Aethercalling / Your champion's next attack this turn gains unblockable unless an opponent pays (3). / You may load Guided Starlight into an Aetherwing weapon you control.
  "guided-starlight": {
    name: "導かれし星光",
    effect:
      "[エレメントボーナス] エーテルコーリング\n\n" +
      "このターン、あなたのチャンピオンの次の攻撃は、対戦相手が(3)を支払わない限りブロック不能を得る。\n\n" +
      "あなたがコントロールするエーテルウィング武器に「導かれし星光」を装填してもよい。",
  },

  // Heavy Swing  [ATTACK]  NORM
  // EN: [Class Bonus] This card costs 2 less to activate.
  "heavy-swing": {
    name: "ヘヴィスイング",
    effect:
      "[クラスボーナス] このカードの起動コストが2少なくなる。*（この効果は、あなたのチャンピオンのクラスがこのカードのクラスと一致する場合のみ適用する。）*",
  },

  // Idle Thoughts  [ACTION]  NORM
  // EN: Look at the top four cards of your deck and then put them back in any order. / Floating Memory
  "idle-thoughts": {
    name: "とりとめない思考",
    effect:
      "あなたのデッキの上から4枚を見て、その後それらを好きな順で戻す。\n\n" +
      "フローティングメモリー *（メモリーコストの支払い中に、このカードを墓地から追放してそのコストの1点分の支払いに充ててよい。）*",
  },

  // Lamentation's Toll  [ATTACK]  NORM
  // EN: [Level 2+] Lamentation's Toll gets +X power, where X is the highest power stat among your omens.
  "lamentations-toll": {
    name: "嘆きの弔鐘",
    effect:
      "[レベル2以上]「嘆きの弔鐘」は+Xパワーを得る。Xはあなたのオーメンの中で最も高いパワーの値である。*（オーメンとは、追放領域にありオーメンカウンターが置かれたカードのこと。）*",
  },

  // Leporine Masque  [REGALIA/ITEM]  NORM
  // EN: (6), Banish Leporine Masque: Draw a card into your memory. This ability costs (X) less to activate, where X is the amount of omens you have.
  "leporine-masque": {
    name: "レポリンの仮面",
    effect:
      "(6)、「レポリンの仮面」を追放する：カードを1枚あなたのメモリーに引く。この能力の起動コストは(X)少なくなる。Xはあなたが持つオーメンの数である。*（オーメンとは、追放領域にありオーメンカウンターが置かれたカードのこと。）*",
  },

  // Life Essence Amulet  [REGALIA/ITEM]  NORM
  // EN: Whenever an ally you control dies while it's not your turn, you may banish Life Essence Amulet. If you do, draw a card.
  "life-essence-amulet": {
    name: "生命精気の護符",
    effect:
      "あなたのターンでないときに、あなたがコントロールするアライが死亡するたび、あなたは「生命精気の護符」を追放してもよい。そうした場合、カードを1枚引く。",
  },

  // Manxome Armoire  [REGALIA/ITEM]  NORM
  // EN: [Ciel Bonus] Banish Manxome Armoire: Return one of your omens to your hand. If you do, banish a card from your hand and put an omen counter on it.
  "manxome-armoire": {
    name: "マンクサムの飾り棚",
    effect:
      "[シエルボーナス]「マンクサムの飾り棚」を追放する：あなたのオーメンを1つ手札に戻す。そうした場合、手札からカードを1枚追放し、それにオーメンカウンターを1個置く。*（オーメンとは、追放領域にありオーメンカウンターが置かれたカードのこと。）*",
  },

  // Martial Guard  [ACTION]  NORM
  // EN: The next time target unit would be dealt damage this turn, prevent 2 of that damage. / [Class Bonus] [Level 2+] Floating Memory
  "martial-guard": {
    name: "マーシャルガード",
    effect:
      "このターン、対象のユニットが次にダメージを受けるとき、そのダメージのうち2点を軽減する。\n\n" +
      "[クラスボーナス][レベル2以上] フローティングメモリー *（メモリーコストの支払い中に、このカードを墓地から追放してそのコストの1点分の支払いに充ててよい。）*",
  },

  // Meteoric Volley  [ACTION]  ASTRA
  // EN: Activate this card only if your champion is attacking. / For each Aethercharge card in the attacker's intent, create a copy of it in that attacker's intent.
  "meteoric-volley": {
    name: "流星の斉射",
    effect:
      "このカードは、あなたのチャンピオンが攻撃している場合にのみ起動できる。\n\n" +
      "攻撃側のインテントにあるエーテルチャージ・カード1枚につき、そのコピーを1つ、その攻撃側のインテントに作る。",
  },

  // Nocturne's Oblivion  [ACTION]  UMBRA
  // EN: As long as you have five or more omens with different reserve costs, this card costs 2 less to activate. / Destroy target non-champion object. Banish Nocturne's Oblivion.
  "nocturnes-oblivion": {
    name: "夜想の忘却",
    effect:
      "あなたが異なるリザーブコストのオーメンを5つ以上持っている限り、このカードの起動コストが2少なくなる。\n\n" +
      "対象のチャンピオン以外のオブジェクト1つを破壊する。「夜想の忘却」を追放する。",
  },

  // Ombreux Chevalier  [ALLY]  UMBRA
  // EN: On Enter: Return one of your omens to your hand. If you do, banish a card from your hand and put an omen counter on it.
  "ombreux-chevalier": {
    name: "オンブルー・シュヴァリエ",
    effect:
      "登場時：あなたのオーメンを1つ手札に戻す。そうした場合、手札からカードを1枚追放し、それにオーメンカウンターを1個置く。*（オーメンとは、追放領域にありオーメンカウンターが置かれたカードのこと。）*",
  },

  // Overpowering Defense  [ACTION]  NORM
  // EN: Activate this card only if a Guardian unit you control is attacking. / Negate all card activations you don't control.
  "overpowering-defense": {
    name: "圧倒的防御",
    effect:
      "このカードは、あなたがコントロールするガーディアンのユニットが攻撃している場合にのみ起動できる。\n\n" +
      "あなたがコントロールしていないすべてのカードの起動を打ち消す。",
  },

  // Pleiades, Celestial Genesis  [REGALIA/WEAPON]  ASTRA
  // EN: [Class Bonus] On Enter: Glimpse 3. / [Class Bonus] On Attack: Astra element Aethercharge cards in the attacker's intent gain "On Hit: Summon an Astral Shard token."
  "pleiades-celestial-genesis": {
    name: "プレアデス、天体の創世",
    effect:
      "[クラスボーナス] 登場時：グリンプス3。\n\n" +
      "[クラスボーナス] 攻撃時：攻撃側のインテントにあるアストラ・エレメントのエーテルチャージ・カードは「ヒット時：アストラルシャード・トークンを1体召喚する。」を得る。",
  },

  // Poised Occlusion  [ACTION]  ASTRA
  // EN: Negate target card activation. Put the card that had its activation negated this way into its owner's memory. / [Class Bonus] Draw a card into your memory. Your champion becomes distant.
  "poised-occlusion": {
    name: "静かなる遮蔽",
    effect:
      "対象のカードの起動を打ち消す。この方法で起動を打ち消されたカードを、そのオーナーのメモリーに置く。\n\n" +
      "[クラスボーナス] カードを1枚あなたのメモリーに引く。あなたのチャンピオンはディスタントになる。",
  },

  // Prudent Nock  [ACTION]  NORM
  // EN: Draw a card into your memory. Then you may load Prudent Nock into an Aetherwing weapon you control.
  "prudent-nock": {
    name: "慎重な番え",
    effect:
      "カードを1枚あなたのメモリーに引く。その後、あなたがコントロールするエーテルウィング武器に「慎重な番え」を装填してもよい。",
  },

  // Ranger Boots  [REGALIA/ITEM]  NORM
  // EN: Hindered (This object enters the field rested.) / On Enter: Draw a card. / [Class Bonus] REST, Banish Ranger Boots: Your champion becomes distant.
  "ranger-boots": {
    name: "レンジャーブーツ",
    effect:
      "ハインダード *（このオブジェクトはレスト状態で場に出る。）*\n\n" +
      "登場時：カードを1枚引く。\n\n" +
      "[クラスボーナス] レスト、「レンジャーブーツ」を追放する：あなたのチャンピオンはディスタントになる。*（ユニットはコントローラーのターン終了時までディスタントのままである。）*",
  },

  // Refluxal Ribbon  [REGALIA/ITEM]  NORM
  // EN: (2), Banish Refluxal Ribbon: Load target Aethercharge card from your graveyard into an Aetherwing weapon you control.
  "refluxal-ribbon": {
    name: "リフラクサル・リボン",
    effect:
      "(2)、「リフラクサル・リボン」を追放する：あなたの墓地から対象のエーテルチャージ・カードを1枚、あなたがコントロールするエーテルウィング武器に装填する。",
  },

  // Reposition  [ACTION]  NORM
  // EN: Target unit becomes distant. / [Class Bonus] Floating Memory
  "reposition": {
    name: "リポジション",
    effect:
      "対象のユニット1体はディスタントになる。*（ユニットはコントローラーのターン終了時までディスタントのままである。）*\n\n" +
      "[クラスボーナス] フローティングメモリー *（メモリーコストの支払い中に、このカードを墓地から追放してそのコストの1点分の支払いに充ててよい。）*",
  },

  // Reverse Affliction  [ACTION]  UMBRA
  // EN: Banish a Curse card from your champion's lineage. If you own that card, put an omen counter on it.
  "reverse-affliction": {
    name: "苦痛の反転",
    effect:
      "あなたのチャンピオンのリネージュからカース・カードを1枚追放する。あなたがそのカードのオーナーなら、それにオーメンカウンターを1個置く。",
  },

  // Sablier Guard  [ALLY]  NORM
  // EN: Sablier Guard gets +1POWER and +1LIFE for each omen you have with different reserve costs.
  "sablier-guard": {
    name: "サブリエガード",
    effect:
      "「サブリエガード」は、あなたが持つ異なるリザーブコストのオーメン1つにつき+1パワーと+1ライフを得る。*（オーメンとは、追放領域にありオーメンカウンターが置かれたカードのこと。）*",
  },

  // Seeker's Aetherwing  [REGALIA/WEAPON]  NORM
  // EN: (Aetherwing — Must be loaded to use for an attack and can't be used with an attack card.) / [Class Bonus] Spellshroud / [Class Bonus] True Sight (Attacks using this weapon can target units with stealth.)
  "seekers-aetherwing": {
    name: "シーカーズ・エーテルウィング",
    effect:
      "*（エーテルウィング ― 攻撃に使用するには装填されていなければならず、アタックカードとともには使用できない。）*\n\n" +
      "[クラスボーナス] スペルシュラウド *（このオブジェクトはスペルの対象にできない。）*\n\n" +
      "[クラスボーナス] トゥルーサイト *（この武器を使用する攻撃は、ステルスを持つユニットを対象にできる。）*",
  },

  // Servile Possessions  [MASTERY]  NORM
  // EN: [Ciel Bonus] Whenever your champion attacks, depending on the amount of omens you have — • 1 to 2: That attack gets +1POWER. • 3 to 4: That attack gets +2POWER. • 5 or more: That attack gets +3POWER. Draw a card into your memory.
  "servile-possessions": {
    name: "隷属する所有物",
    effect:
      "[シエルボーナス] あなたのチャンピオンが攻撃するたび、あなたが持つオーメンの数に応じて ―\n" +
      "・1〜2 ― その攻撃は+1パワーを得る。\n" +
      "・3〜4 ― その攻撃は+2パワーを得る。\n" +
      "・5以上 ― その攻撃は+3パワーを得る。カードを1枚あなたのメモリーに引く。",
  },

  // Sidereal Spellshot  [ACTION]  ASTRA
  // EN: [Element Bonus] Aethercalling / [Class Bonus] Glimpse X. Then you may load Sidereal Spellshot into an Aetherwing weapon you control.
  "sidereal-spellshot": {
    name: "星辰の呪撃",
    effect:
      "[エレメントボーナス] エーテルコーリング *（グリンプス中にこのカードを見ているとき、あなたがコントロールするエーテルウィング武器にこれを装填してよい。）*\n\n" +
      "[クラスボーナス] グリンプスX。その後、あなたがコントロールするエーテルウィング武器に「星辰の呪撃」を装填してもよい。",
  },

  // Sinistre Stab  [ATTACK]  UMBRA
  // EN: On Hit: If you have five or more omens, you may put Sinistre Stab on the bottom of the hit champion's lineage. Otherwise, put Sinistre Stab on the bottom of your champion's lineage. / Inherited Effect — This object gets -3LIFE.
  "sinistre-stab": {
    name: "シニストル・スタブ",
    effect:
      "ヒット時：あなたがオーメンを5つ以上持っているなら、「シニストル・スタブ」をヒットしたチャンピオンのリネージュの一番下に置いてもよい。そうでなければ、「シニストル・スタブ」をあなたのチャンピオンのリネージュの一番下に置く。\n\n" +
      "継承効果 ― このオブジェクトは-3ライフを得る。*（このカードがリネージュの一部である限り、チャンピオンはこの能力を持つ。）*",
  },

  // Spirit of Fire  [CHAMPION]  L0 FIRE
  // EN: On Enter: Draw seven cards.
  "spirit-of-fire": {
    name: "火の精霊",
    effect: "登場時：カードを7枚引く。",
  },

  // Spirit of Water  [CHAMPION]  L0 WATER
  // EN: On Enter: Draw seven cards.
  "spirit-of-water": {
    name: "水の精霊",
    effect: "登場時：カードを7枚引く。",
  },

  // Stalwart Shieldmate  [ALLY]  NORM
  // EN: Taunt / Floating Memory
  "stalwart-shieldmate": {
    name: "頼れる盾の相棒",
    effect:
      "タウント *（アウェイクである限り、このアライは、対戦相手の攻撃宣言時に、可能なら自分がコントロールする他のオブジェクトより先に対象にされなければならない。）*\n\n" +
      "フローティングメモリー *（メモリーコストの支払い中に、このカードを墓地から追放してそのコストの1点分の支払いに充ててよい。）*",
  },

  // Starbirth  [ACTION]  ASTRA
  // EN: Draw a card into your memory. Then summon an Astral Shard token.
  "starbirth": {
    name: "星の誕生",
    effect: "カードを1枚あなたのメモリーに引く。その後、アストラルシャード・トークンを1体召喚する。",
  },

  // Tariff Ring  [REGALIA/ITEM]  NORM
  // EN: Banish Tariff Ring: Until end of turn, players can't declare attacks unless they pay (2) for each attack declaration. Activate this ability only during an opponent's recollection phase.
  "tariff-ring": {
    name: "関税の指輪",
    effect:
      "「関税の指輪」を追放する：ターン終了時まで、プレイヤーは攻撃宣言1回ごとに(2)を支払わない限り攻撃を宣言できない。この能力は、対戦相手のリコレクションフェイズの間にのみ起動できる。",
  },

  // Tempered Steel  [ACTION]  FIRE
  // EN: Put a durability counter on target weapon you control. / Floating Memory
  "tempered-steel": {
    name: "鍛えられた鋼",
    effect:
      "あなたがコントロールする対象の武器に耐久カウンターを1個置く。\n\n" +
      "フローティングメモリー *（メモリーコストの支払い中に、このカードを墓地から追放してそのコストの1点分の支払いに充ててよい。）*",
  },

  // Torch Marshal  [ALLY]  FIRE
  // EN: [Class Bonus] Torch Marshal gets +1POWER. / As an additional cost to declare an attack with this ally, pay (2).
  "torch-marshal": {
    name: "松明の元帥",
    effect:
      "[クラスボーナス]「松明の元帥」は+1パワーを得る。*（この効果は、あなたのチャンピオンのクラスがこのカードのクラスと一致する場合のみ適用する。）*\n\n" +
      "このアライで攻撃を宣言するための追加コストとして、(2)を支払う。",
  },

  // Umbra Sight  [ACTION]  UMBRA
  // EN: Draw a card. / You may draw a card into your memory and put Umbra Sight on the bottom of your champion's lineage. When you do, deal 2 unpreventable damage to your champion for each Curse card in your champion's lineage.
  "umbra-sight": {
    name: "アンブラ・サイト",
    effect:
      "カードを1枚引く。\n\n" +
      "あなたはカードを1枚あなたのメモリーに引き、「アンブラ・サイト」をあなたのチャンピオンのリネージュの一番下に置いてもよい。そうしたとき、あなたのチャンピオンのリネージュにあるカース・カード1枚につき、あなたのチャンピオンに2点の軽減不能ダメージを与える。",
  },

  // Undercurrent Vantage  [ACTION]  WATER
  // EN: Glimpse 3. Your champion becomes distant. / [Class Bonus] Floating Memory
  "undercurrent-vantage": {
    name: "潜流の優位",
    effect:
      "グリンプス3。あなたのチャンピオンはディスタントになる。*（ユニットはコントローラーのターン終了時までディスタントのままである。）*\n\n" +
      "[クラスボーナス] フローティングメモリー *（メモリーコストの支払い中に、このカードを墓地から追放してそのコストの1点分の支払いに充ててよい。）*",
  },

  // Vigil Rempart  [ALLY]  NORM
  // EN: [Class Bonus] Vigil Rempart gets +2POWER.
  "vigil-rempart": {
    name: "ヴィジル・ランパール",
    effect:
      "[クラスボーナス]「ヴィジル・ランパール」は+2パワーを得る。*（この効果は、あなたのチャンピオンのクラスがこのカードのクラスと一致する場合のみ適用する。）*",
  },

  // Whimsy's Warden  [ALLY]  NORM
  // EN: Intercept (Whenever your champion is attacked while this ally is awake, you may redirect that attack to this ally.) / As long as you have two or more omens, Whimsy's Warden gets +2POWER.
  "whimsys-warden": {
    name: "気まぐれの守り手",
    effect:
      "インターセプト *（このアライがアウェイクの間にあなたのチャンピオンが攻撃されるたび、対象をこのアライに変更してもよい。）*\n\n" +
      "あなたがオーメンを2つ以上持っている限り、「気まぐれの守り手」は+2パワーを得る。",
  },
});
