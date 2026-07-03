"use strict";
/*
 * Radiant Origins (RDO) 日本語訳スキャフォールド
 * 各カードの下のコメントが英語原文。name / effect の "" を日本語で埋める。
 * 空欄のカードは「未翻訳」表示のまま。用語は TRANSLATION.md に統一。
 */
window.GA_I18N = window.GA_I18N || { meta:{}, terms:{}, cards:{} };
window.GA_I18N.cards = Object.assign(window.GA_I18N.cards || {}, {

  // Accelerate  [ACTION]  L- EXALTED,NORM
  // EN: The next card you activate this turn can be activated as though it had fast activation. /  / Draw a card into your memory. / 
  "accelerate": {
    name: "アクセラレート",
    effect:
      "このターン、あなたが次に起動するカードは高速起動を持つかのように起動できる。\n\n" +
      "カードを1枚あなたのメモリーに引く。",
  },

  // Advent of the Stormcaller  [ACTION]  L- ARCANE
  // EN: [Class Bonus] Efficiency /  / Reveal the top LV cards of your deck. You may banish any amount of arcane element cards from among them. For each card banished this way, choose a unit and deal 2 damage to it. Put the rest of the revealed cards on the top or on the bottom of your deck in any order.
  "advent-of-the-stormcaller": {
    name: "嵐呼びの到来",
    effect:
      "[クラスボーナス] エフィシェンシー *（このカードの起動コストがLV少なくなる。）*\n\n" +
      "あなたのデッキの上からLV枚を公開する。その中から任意の枚数の秘術エレメントのカードを追放してよい。この方法で追放したカード1枚につき、ユニット1体を選び、それに2ダメージを与える。公開された残りのカードを好きな順でデッキの上または下に置く。",
  },

  // Aella, Zephyr's Hand  [UNIQUE/ALLY]  L- EXALTED,WIND
  // EN: Fast Activation /  / (3): As a Spell, suppress another target ally, item, or weapon. This ability costs (3) less to activate the first time you activate it.
  "aella-zephyrs-hand": {
    name: "アエラ、ゼファーの手",
    effect:
      "高速起動\n\n" +
      "(3)：スペルとして、別の対象のアライ・アイテム・ウェポン1つをサプレスする。この能力を最初に起動するときは、起動コストが(3)少なくなる。",
  },

  // Aesan Protector  [ALLY]  L- WIND
  // EN: Intercept (Whenever your champion is attacked while this ally is awake, you may redirect that attack to this ally.) /  / On Enter: Return target ally you control to its owner's hand.
  "aesan-protector": {
    name: "アエサンの守護者",
    effect:
      "インターセプト *（このアライがアウェイクの間にあなたのチャンピオンが攻撃されるたび、その攻撃をこのアライに移し替えてよい。）*\n\n" +
      "登場時：あなたがコントロールする対象のアライ1体を、そのオーナーの手札に戻す。",
  },

  // Alchemist's Cauldron  [REGALIA/ITEM]  L- NORM
  // EN: [Arisanna Bonus] (3), Banish Alchemist's Cauldron: Gather twice. For the rest of the game, ignore the elemental requirements of non-advanced element Potion cards you activate.
  "alchemists-cauldron": {
    name: "錬金術師の大釜",
    effect:
      "[アリサナボーナス] (3)、「錬金術師の大釜」を追放する：ギャザーを2回行う。以後このゲームの間、あなたが起動する非上位エレメントのポーション・カードのエレメント要件を無視する。",
  },

  // Alice, Trifle's Royalty  [CHAMPION]  L3 EXALTED,NORM
  // EN: This card costs 1 less to materialize for each Chessman ally you control. /  / Alice Lineage /  / At the beginning of your recollection phase, summon a Pawn Piece token. Then if you control three or more Chessman allies, draw a card into your memory.
  "alice-trifles-royalty": {
    name: "アリス、些事の女王",
    effect:
      "このカードのマテリアライズコストは、あなたがコントロールするチェスマン・アライ1体につき1少なくなる。\n\n" +
      "アリスの血脈\n\n" +
      "あなたのリコレクションフェイズの開始時に、ポーン・ピース・トークンを1体召喚する。その後、あなたがチェスマン・アライを3体以上コントロールしているなら、カードを1枚あなたのメモリーに引く。",
  },

  // Allied Warpriestess  [ALLY]  L- NORM
  // EN: [Class Bonus] Allied Warpriestess gets +1 POWER. /  / [Memory 4+] On Attack: Recover 2. (To recover, remove that many damage counters from your champion. Apply this effect only if there are four or more cards in your memory.)
  "allied-warpriestess": {
    name: "連合の戦巫女",
    effect:
      "[クラスボーナス]「連合の戦巫女」は+1パワーを得る。\n\n" +
      "[メモリー4以上] 攻撃時：リカバー2。*（リカバーでは、その数だけあなたのチャンピオンからダメージカウンターを取り除く。この効果は、あなたのメモリーにカードが4枚以上ある場合のみ適用する。）*",
  },

  // Allowance Race  [ACTION]  L- NORM
  // EN: Each player may rest up to two Horse allies they control. For each Horse ally rested this way, its controller draws a card.
  "allowance-race": {
    name: "お小遣いレース",
    effect:
      "各プレイヤーは、自分がコントロールするホース・アライを最大2体レストしてよい。この方法でレストされたホース・アライ1体につき、そのコントローラーはカードを1枚引く。",
  },

  // Alpha Philterbeast  [ALLY]  L- EXALTED,NORM
  // EN: Brew â Three Herbs /  / On Enter: If Alpha Philterbeast was brewed, put two age counters on it. /  / Whenever an opponent activates a card with reserve cost 3 or more, put an age counter on Alpha Philterbeast. /  / Alpha Philterbeast gets +1POWER and +1LIFE for each age counter on it.
  "alpha-philterbeast": {
    name: "アルファ・フィルタービースト",
    effect:
      "ブリュー ― ハーブ3枚\n\n" +
      "登場時：「アルファ・フィルタービースト」がブリューされていたなら、それにエイジカウンターを2個置く。\n\n" +
      "対戦相手がリザーブコスト3以上のカードを起動するたび、「アルファ・フィルタービースト」にエイジカウンターを1個置く。\n\n" +
      "「アルファ・フィルタービースト」は、自身に置かれたエイジカウンター1個につき+1パワーと+1ライフを得る。",
  },

  // Angel Attendant  [ALLY]  L- NORM
  // EN: Advanced Imbue 1 (You may reserve all cards revealed as you activate this card. If at least one of them is advanced element, this card becomes imbued.) /  / As long as Angel Attendant is imbued, it has intercept. /  / On Death: Draw a card. /  / 
  "angel-attendant": {
    name: "天使の従者",
    effect:
      "アドバンスド・インビュー1 *（このカードを起動する際に公開されたカードをすべてリザーブしてよい。その中に上位エレメントが1枚以上あれば、このカードはインビュー状態になる。）*\n\n" +
      "「天使の従者」がインビュー状態である限り、インターセプトを持つ。\n\n" +
      "死亡時：カードを1枚引く。",
  },

  // Angelic Vanguard  [ALLY]  L- NORM
  // EN: Advanced Imbue 2 (You may reserve all cards revealed as you activate this card. If at least two of them are advanced element, this card becomes imbued.) /  / As long as Angelic Vanguard is imbued, it has intercept and retort 2.
  "angelic-vanguard": {
    name: "天使の先鋒",
    effect:
      "アドバンスド・インビュー2 *（このカードを起動する際に公開されたカードをすべてリザーブしてよい。その中に上位エレメントが2枚以上あれば、このカードはインビュー状態になる。）*\n\n" +
      "「天使の先鋒」がインビュー状態である限り、インターセプトとリトート2を持つ。",
  },

  // Apostle of the Woods  [ALLY]  L- NORM
  // EN: Pride 3 /  / [Class Bonus] On Enter: Apostle of the Woods loses pride until end of turn. Then if an opponent controls three or more units, put a buff counter on Apostle of the Woods.
  "apostle-of-the-woods": {
    name: "森の使徒",
    effect:
      "プライド3 *（このアライは、あなたのチャンピオンがレベル3以上でない限りあなたに従わない。）*\n\n" +
      "[クラスボーナス] 登場時：「森の使徒」はターン終了時までプライドを失う。その後、対戦相手がユニットを3体以上コントロールしているなら、「森の使徒」にバフカウンターを1個置く。",
  },

  // Apothecary's Harvest  [ACTION]  L- EXALTED,WIND
  // EN: (Exalted â This element is enabled for you as long as you have another advanced element enabled.) /  / [Arisanna Bonus] Fast Activation /  / Summon a Blightroot, Manaroot, Silvershine, Fraysia, Razorvine, and a Springleaf token.
  "apothecarys-harvest": {
    name: "薬師の収穫",
    effect:
      "*（高揚 ― このエレメントは、あなたが他の上位エレメントを有効にしている限り、あなたにとって有効になる。）*\n\n" +
      "[アリサナボーナス] 高速起動\n\n" +
      "ブライトルート、マナルート、シルバーシャイン、フレイシア、レイザーヴァイン、スプリングリーフの各トークンを1体ずつ召喚する。",
  },

  // Arcane Elemental  [ALLY]  L- ARCANE
  // EN: [Class Bonus] This card costs 1 less to activate for each arcane element card in your banishment. /  / Pride 7 (This ally won't obey you unless your champion is level 7 or higher.) /  / On Attack: At the beginning of the next end phase, banish Arcane Elemental.
  "arcane-elemental": {
    name: "秘術のエレメンタル",
    effect:
      "[クラスボーナス] このカードの起動コストは、あなたの追放領域にある秘術エレメントのカード1枚につき1少なくなる。\n\n" +
      "プライド7 *（このアライは、あなたのチャンピオンがレベル7以上でない限りあなたに従わない。）*\n\n" +
      "攻撃時：次のエンドフェイズの開始時に、「秘術のエレメンタル」を追放する。",
  },

  // Arcane Sight  [ACTION]  L- ARCANE
  // EN: Your champion gets +1 level until end of turn. / Draw a card.
  "arcane-sight": {
    name: "秘術の視界",
    effect:
      "ターン終了時まで、あなたのチャンピオンは+1レベルを得る。\n\n" +
      "カードを1枚引く。",
  },

  // Ardus, Floodborne Deacon  [UNIQUE/ALLY]  L- EXALTED,WATER
  // EN: On Enter: Put the top three cards of your deck into your graveyard. /  / Cards you activate, objects you control, and intents you control have an additional instance of each deluge ability and effect they have.
  "ardus-floodborne-deacon": {
    name: "アルダス、洪水生まれの助祭",
    effect:
      "登場時：あなたのデッキの上から3枚を墓地に置く。\n\n" +
      "あなたが起動するカード、あなたがコントロールするオブジェクト、およびあなたがコントロールするインテントは、それらが持つ各デリュージ能力・効果を追加でもう1回分持つ。",
  },

  // Arima, Gaia's Wings  [UNIQUE/ALLY]  L- TERA
  // EN: Pride 5 (This ally won't obey you unless your champion is level 5 or higher.) /  / At the beginning of your recollection phase, put three buff counters on Arima. /  / On Death: Put Arima into its owner's memory.
  "arima-gaias-wings": {
    name: "アリマ、ガイアの翼",
    effect:
      "プライド5 *（このアライは、あなたのチャンピオンがレベル5以上でない限りあなたに従わない。）*\n\n" +
      "あなたのリコレクションフェイズの開始時に、「アリマ」にバフカウンターを3個置く。\n\n" +
      "死亡時：「アリマ」をそのオーナーのメモリーに置く。",
  },

  // Arthur, Young Heir  [UNIQUE/ALLY]  L- FIRE
  // EN: On Enter: You may rest Arthur. If you do, Arthur gains immortality until the beginning of your next turn. (A unit with immortality can't die.) /  / As long as Arthur is rested, other allies you control get +1 POWER.
  "arthur-young-heir": {
    name: "アーサー、若き継承者",
    effect:
      "登場時：あなたは「アーサー」をレストしてよい。そうした場合、「アーサー」は次のあなたのターンの開始時まで不死を得る。*（不死を持つユニットは死亡しない。）*\n\n" +
      "「アーサー」がレスト状態である限り、あなたがコントロールする他のアライは+1パワーを得る。",
  },

  // Artificer's Opus  [ALLY]  L- TERA
  // EN: [Class Bonus] Efficiency (This card costs LV less to activate.) /  / Artificer's Opus enters the field rested. /  / Cleave (This ally attacks all units a chosen opponent controls. Its attacks can't be intercepted.)
  "artificers-opus": {
    name: "工匠の大作",
    effect:
      "[クラスボーナス] エフィシェンシー *（このカードの起動コストがLV少なくなる。）*\n\n" +
      "「工匠の大作」はレスト状態で場に出る。\n\n" +
      "クリーブ *（このアライは、選んだ対戦相手がコントロールするすべてのユニットを攻撃する。その攻撃はインターセプトされない。）*",
  },

  // Ashfletched Bowman  [ALLY]  L- FIRE
  // EN: Ranged 3 /  / [Class Bonus] At the beginning of your recollection phase, banish up to three fire element cards from your graveyard. For each card banished this way,  Ashfletched Bowman gains ranged 3 until end of turn. (Multiple instances of ranged stack.)
  "ashfletched-bowman": {
    name: "灰羽の弓兵",
    effect:
      "レンジド3 *（このユニットがディスタントである限り、その攻撃は+3パワーを得る。）*\n\n" +
      "[クラスボーナス] あなたのリコレクションフェイズの開始時に、あなたの墓地から火エレメントのカードを最大3枚追放する。この方法で追放したカード1枚につき、「灰羽の弓兵」はターン終了時までレンジド3を得る。*（レンジドの複数インスタンスは累積する。）*",
  },

  // Astra Sight  [ACTION]  L- ASTRA
  // EN: Starcalling â (0) (As you're looking at this card while glimpsing, you may activate it by paying this cost. If you do, put all other cards you're looking at on the bottom of your deck in any order.) /  / Glimpse 1, then draw a card.
  "astra-sight": {
    name: "アストラ・サイト",
    effect:
      "スターコーリング ― (0) *（グリンプス中にこのカードを見ているとき、このコストを支払って起動してよい。そうした場合、見ている他のすべてのカードを好きな順でデッキの一番下に置く。）*\n\n" +
      "グリンプス1を行い、その後カードを1枚引く。",
  },

  // Auravolt Current  [ACTION]  L- ARCANE
  // EN: You may activate this card from your banishment as long as thereâs a charge counter on it. /  / Whenever this card is banished from your memory, put a charge counter on it. /  / Any amount of target players banish two cards from their memory. For each card banished this way, its owner draws a card into their memory. Banish Auravolt Current. / 
  "auravolt-current": {
    name: "オーラヴォルトの奔流",
    effect:
      "このカードは、自身にチャージカウンターが置かれている限り、あなたの追放領域から起動してよい。\n\n" +
      "このカードがあなたのメモリーから追放されるたび、それにチャージカウンターを1個置く。\n\n" +
      "任意の人数の対象のプレイヤーは、自分のメモリーからカードを2枚追放する。この方法で追放されたカード1枚につき、そのオーナーはカードを1枚自分のメモリーに引く。「オーラヴォルトの奔流」を追放する。",
  },

  // Automaton Drone  [TOKEN/ALLY]  L- NORM
  // EN: (効果テキストなし)
  "automaton-drone": { name: "オートマトン・ドローン", effect: "" },

  // Automaton Forgewarden  [ALLY]  L- NEOS
  // EN: [Class Bonus] Automaton Forgewarden gets +1POWER and +1LIFE for each of up to three tokens you control.
  "automaton-forgewarden": {
    name: "オートマトンの鍛冶守",
    effect:
      "[クラスボーナス]「オートマトンの鍛冶守」は、あなたがコントロールするトークン最大3体につき、それぞれ+1パワーと+1ライフを得る。",
  },

  // Avatar of Byakko  [UNIQUE/ALLY]  L- WIND
  // EN: [Guo Jia Bonus] As long as you control a Beast, Avatar of Byakko's base power is X, where X is the highest base power stat among Beast allies you control. /  / [Guo Jia Bonus] (2), Sacrifice Avatar of Byakko: Put two quest counters on your champion. Then you may put a card named Fabled Emerald Fatestone from your material deck or banishment onto the field.
  "avatar-of-byakko": {
    name: "白虎の化身",
    effect:
      "[グオ・ジアボーナス] あなたがビーストをコントロールしている限り、「白虎の化身」の基本パワーはXになる。Xは、あなたがコントロールするビースト・アライの中で最も高い基本パワーの値である。\n\n" +
      "[グオ・ジアボーナス] (2)、「白虎の化身」を生け贄に捧げる：あなたのチャンピオンにクエストカウンターを2個置く。その後、あなたのマテリアルデッキまたは追放領域から「Fabled Emerald Fatestone」という名前のカードを場に出してよい。",
  },

  // Avatar of Gaia  [UNIQUE/ALLY]  L- TERA
  // EN: Ally Link (This object enters the field linked to target ally. If the link is broken, sacrifice this object.) /  / [Class Bonus] Preserve /  / Linked ally has taunt and loses pride.
  "avatar-of-gaia": {
    name: "ガイアの化身",
    effect:
      "アライリンク *（このオブジェクトは対象のアライにリンクした状態で場に出る。リンクが切れた場合、このオブジェクトを生け贄に捧げる。）*\n\n" +
      "[クラスボーナス] プリザーブ\n\n" +
      "リンクしているアライはタウントを持ち、プライドを失う。",
  },

  // Avatar of Genbu  [UNIQUE/ALLY]  L- WATER
  // EN: [Guo Jia Bonus] Deluge 12 â As long as you have twelve or more water element cards in your graveyard, Avatar of Genbu gets +2POWER and +2LIFE, and has taunt and vigor.  /  / [Guo Jia Bonus] (2), Sacrifice Avatar of Genbu: Put two quest counters on your champion. Then you may put a card named Fabled Sapphire Fatestone from your material deck or banishment onto the field.
  "avatar-of-genbu": {
    name: "玄武の化身",
    effect:
      "[グオ・ジアボーナス] デリュージ12 ― あなたの墓地に水エレメントのカードが12枚以上ある限り、「玄武の化身」は+2パワーと+2ライフを得て、タウントとヴィガーを持つ。\n\n" +
      "[グオ・ジアボーナス] (2)、「玄武の化身」を生け贄に捧げる：あなたのチャンピオンにクエストカウンターを2個置く。その後、あなたのマテリアルデッキまたは追放領域から「Fabled Sapphire Fatestone」という名前のカードを場に出してよい。",
  },

  // Avatar of Suzaku  [UNIQUE/ALLY]  L- FIRE
  // EN: [Guo Jia Bonus] While paying for this cardâs reserve cost, you may remove up to two quest counters from your champion. Each counter removed this way pays for 1 of that cost. /  / [Guo Jia Bonus] (2), Sacrifice Avatar of Suzaku: Put two quest counters on your champion. Then you may put a card named Fabled Ruby Fatestone from your material deck or banishment onto the field.
  "avatar-of-suzaku": {
    name: "朱雀の化身",
    effect:
      "[グオ・ジアボーナス] このカードのリザーブコストを支払う際、あなたのチャンピオンからクエストカウンターを最大2個取り除いてよい。この方法で取り除いたカウンター1個につき、そのコストの1点分を支払う。\n\n" +
      "[グオ・ジアボーナス] (2)、「朱雀の化身」を生け贄に捧げる：あなたのチャンピオンにクエストカウンターを2個置く。その後、あなたのマテリアルデッキまたは追放領域から「Fabled Ruby Fatestone」という名前のカードを場に出してよい。",
  },

  // Baby Slime  [TOKEN/ALLY]  L- NORM
  // EN: (効果テキストなし)
  "baby-slime": { name: "ベビースライム", effect: "" },

  // Bandit, Gaze Leader  [UNIQUE/ALLY]  L- NORM
  // EN: On Enter: Scavenge 6 for a Raccoon ally card. (To scavenge an amount, reveal cards from the top of your deck until you reveal that many cards or until you reveal the specified card. Put the specified card into your hand and the rest on the bottom of your deck in a random order.) /  / Raccoon allies you control have "REST: Banish target card in a graveyard."
  "bandit-gaze-leader": {
    name: "バンディット、凝視の長",
    effect:
      "登場時：ラクーン・アライ・カードを求めてスカベンジ6を行う。*（スカベンジでは、指定枚数のカードを公開するか、指定のカードを公開するまで、あなたのデッキの上からカードを公開する。指定のカードを手札に加え、残りをランダムな順でデッキの一番下に置く。）*\n\n" +
      "あなたがコントロールするラクーン・アライは「レスト：墓地にある対象のカード1枚を追放する。」を持つ。",
  },

  // Banner Raccoon  [ALLY]  L- NORM
  // EN: As long as an opponent has no cards in their graveyard, other Raccoon allies you control get +1POWER.
  "banner-raccoon": {
    name: "バナー・ラクーン",
    effect:
      "対戦相手の墓地にカードが1枚もない限り、あなたがコントロールする他のラクーン・アライは+1パワーを得る。",
  },

  // Banner Slime  [ALLY]  L- NORM
  // EN: [Class Bonus] REST: Other Slime allies you control get +1POWER until end of turn.
  "banner-slime": {
    name: "バナー・スライム",
    effect:
      "[クラスボーナス] レスト：あなたがコントロールする他のスライム・アライは、ターン終了時まで+1パワーを得る。",
  },

  // Battlefield Benediction  [ACTION]  L- NORM
  // EN: [Class Bonus] This card costs 1 less to activate.  /  / Empower 2. If an opponent controls three or more units, empower 4 instead.
  "battlefield-benediction": {
    name: "戦場の祝祷",
    effect:
      "[クラスボーナス] このカードの起動コストが1少なくなる。\n\n" +
      "エンパワー2。対戦相手がユニットを3体以上コントロールしているなら、代わりにエンパワー4を行う。",
  },

  // Beacon Knight  [ALLY]  L- CRUX
  // EN: Vigor (At the beginning of your end phase, wake up this ally.) /  / [Class Bonus] Whenever one or more regalia enter the field under your control, put a buff counter on Beacon Knight.
  "beacon-knight": {
    name: "灯火の騎士",
    effect:
      "ヴィガー *（あなたのエンドフェイズの開始時に、このアライをアウェイクにする。）*\n\n" +
      "[クラスボーナス] あなたのコントロール下で1つ以上のレガリアが場に出るたび、「灯火の騎士」にバフカウンターを1個置く。",
  },

  // Bedivere, Woodland Overseer  [UNIQUE/ALLY]  L- NORM
  // EN: Bedivere has taunt as long as you control another Animal or Beast ally. /  / [Class Bonus] [Level 3+] On Death: Put a buff counter on each Animal and/or Beast ally you control.
  "bedivere-woodland-overseer": {
    name: "ベディヴィア、森林の監督者",
    effect:
      "あなたが他のアニマルまたはビースト・アライをコントロールしている限り、「ベディヴィア」はタウントを持つ。\n\n" +
      "[クラスボーナス][レベル3以上] 死亡時：あなたがコントロールする各アニマルおよび／またはビースト・アライにバフカウンターを1個ずつ置く。",
  },

  // Benediction Angel  [ALLY]  L- NORM
  // EN: Advanced Imbue 2 (You may reserve all cards revealed as you activate this card. If at least two of them are advanced element, this card becomes imbued.) /  / On Enter: If Benediction Angel is imbued, draw a card into your memory and recover 2.
  "benediction-angel": {
    name: "祝祷の天使",
    effect:
      "アドバンスド・インビュー2 *（このカードを起動する際に公開されたカードをすべてリザーブしてよい。その中に上位エレメントが2枚以上あれば、このカードはインビュー状態になる。）*\n\n" +
      "登場時：「祝祷の天使」がインビュー状態なら、カードを1枚あなたのメモリーに引き、リカバー2を行う。",
  },

  // Beseech the Winds  [ACTION]  L- WIND
  // EN: Materialize a card from your material deck. (You still pay for its costs.)
  "beseech-the-winds": {
    name: "風への嘆願",
    effect: "あなたのマテリアルデッキからカードを1枚マテリアライズする。*（コストは通常どおり支払う。）*",
  },

  // Besieged Slash  [ATTACK]  L- NORM
  // EN: [Class Bonus] As long as an opponent controls three or more units, this card costs 2 less to activate.
  "besieged-slash": {
    name: "包囲の斬撃",
    effect: "[クラスボーナス] 対戦相手がユニットを3体以上コントロールしている限り、このカードの起動コストが2少なくなる。",
  },

  // Bestial Frenzy  [ACTION]  L- NORM
  // EN: Choose one. Class Bonus: Choose up to two insteadâ / â¢ Your champion gets +1 level until end of turn. / â¢ Target Beast ally gets +1 POWER until end of turn. / â¢ Target Beast ally gains cleave until end of turn.
  "bestial-frenzy": {
    name: "獣の狂乱",
    effect:
      "次の中から1つを選ぶ。クラスボーナス：代わりに最大2つ選ぶ ―\n" +
      "・ターン終了時まで、あなたのチャンピオンは+1レベルを得る。\n" +
      "・ターン終了時まで、対象のビースト・アライは+1パワーを得る。\n" +
      "・ターン終了時まで、対象のビースト・アライはクリーブを得る。",
  },

  // Birefringence  [ACTION]  L- LUXEM
  // EN: [Class Bonus] Target attack card in an intent of a unit you control gains "On Hit: You may have the attacker declare an additional attack. If you do, create a copy of this card in that attacker's intent." / 
  "birefringence": {
    name: "複屈折",
    effect:
      "[クラスボーナス] あなたがコントロールするユニットのインテントにある対象のアタックカードは「ヒット時：あなたはその攻撃者に追加の攻撃を1回宣言させてよい。そうした場合、その攻撃者のインテントにこのカードのコピーを1つ作る。」を得る。",
  },

  // Bise Blade  [REGALIA/WEAPON]  L- EXALTED,WIND
  // EN: [Ciel Bonus] On Enter: Summon a Vacuous Servant token. /  / [Ciel Bonus] (6): Suppress Bise Blade. This ability costs (1) less to activate for each omen you have with different reserve costs.
  "bise-blade": {
    name: "ビゼの刃",
    effect:
      "[シエルボーナス] 登場時：ヴァキュアス・サーヴァント・トークンを1体召喚する。\n\n" +
      "[シエルボーナス] (6)：「ビゼの刃」をサプレスする。この能力の起動コストは、あなたが持つ異なるリザーブコストのオーメン1つにつき(1)少なくなる。",
  },

  // Black Ice Spellweaver  [ALLY]  L- WATER
  // EN: Stealth (This unit canât be targeted by attacks unless permitted by true sight.)  /  / Sacrifice Black Ice Spellweaver: Target unit's attacks get -3POWER until end of turn.
  "black-ice-spellweaver": {
    name: "黒氷の呪織り",
    effect:
      "ステルス *（このユニットは、トゥルーサイトで許可されない限り攻撃の対象にできない。）*\n\n" +
      "「黒氷の呪織り」を生け贄に捧げる：ターン終了時まで、対象のユニットの攻撃は-3パワーを得る。",
  },

  // Blanche, Sheltering Saint  [UNIQUE/ALLY]  L- NORM
  // EN: [Level 2+] Fast Activation (You may activate this card at fast speed.) /  / If another unit you control would be dealt non-combat damage, prevent an amount of that damage equal to the amount of cards in your memory.
  "blanche-sheltering-saint": {
    name: "ブランシュ、庇護の聖女",
    effect:
      "[レベル2以上] 高速起動 *（このカードを高速で起動してよい。）*\n\n" +
      "あなたがコントロールする他のユニットが戦闘以外のダメージを受けるとき、そのダメージのうち、あなたのメモリーにあるカードの枚数に等しい量を軽減する。",
  },

  // Blaze Alight  [ACTION]  L- EXALTED,FIRE
  // EN: Deal 3 unpreventable damage to target unit. Class Bonus: Deal 5 unpreventable damage to that unit instead. (Apply the additional effect only if your championâs class matches this cardâs class.)
  "blaze-alight": {
    name: "燃え上がる炎",
    effect:
      "対象のユニットに3点の軽減不能ダメージを与える。クラスボーナス：代わりにそのユニットに5点の軽減不能ダメージを与える。*（この追加効果は、あなたのチャンピオンのクラスがこのカードのクラスと一致する場合のみ適用する。）*",
  },

  // Blazing Destrier  [ALLY]  L- FIRE
  // EN: Steadfast (This ally can retaliate while rested and doesnât rest to do so.) /  / Whenever Blazing Destrier is attacked, deal 2 damage to the attacker and your champion.
  "blazing-destrier": {
    name: "燃え盛る軍馬",
    effect:
      "ステッドファスト *（このアライはレスト状態でも反撃でき、反撃してもレストしない。）*\n\n" +
      "「燃え盛る軍馬」が攻撃されるたび、攻撃者とあなたのチャンピオンに2ダメージを与える。",
  },

  // Bleu, Ace of Diamonds  [UNIQUE/ALLY]  L- WATER
  // EN: On Enter: Generate up to X Bolt of Diamonds cards and put them into your memory. X is 0. Depending on the total reserve cost of Suited objects you controlâ  / â¢ 6â X is 1 instead. / â¢ 10â X is 2 instead. / â¢ 21â X is 4 instead. /  / Floating Memory
  "bleu-ace-of-diamonds": {
    name: "ブルー、ダイヤのエース",
    effect:
      "登場時：最大X枚の「ダイヤの稲妻」カードを生成し、それらをあなたのメモリーに置く。Xは0。あなたがコントロールするスーツ持ちオブジェクトのリザーブコストの合計に応じて ―\n" +
      "・6 ― 代わりにXは1。\n" +
      "・10 ― 代わりにXは2。\n" +
      "・21 ― 代わりにXは4。\n\n" +
      "フローティングメモリー",
  },

  // Blightroot  [TOKEN/ITEM]  L- NORM
  // EN: Sacrifice Blightroot: Your champion gets +1 level until end of turn.
  "blightroot": {
    name: "ブライトルート",
    effect: "「ブライトルート」を生け贄に捧げる：ターン終了時まで、あなたのチャンピオンは+1レベルを得る。",
  },

  // Blight's Ring  [REGALIA/ITEM]  L- UMBRA
  // EN: (4), REST: Draw a card into your memory. Then put Blight's Ring on the bottom of target champion's lineage. /  / Inherited Effect â  At the beginning of your recollection phase, deal 1 unpreventable damage to this object.
  "blights-ring": {
    name: "枯朽の指輪",
    effect:
      "(4)、レスト：カードを1枚あなたのメモリーに引く。その後、「枯朽の指輪」を対象のチャンピオンのリネージュの一番下に置く。\n\n" +
      "継承効果 ― あなたのリコレクションフェイズの開始時に、このオブジェクトに1点の軽減不能ダメージを与える。",
  },

  // Blood Dragon's Pact  [PHANTASIA]  L- EXIA
  // EN: Ally Link (This object enters the field linked to target ally. If the link is broken, sacrifice this object.) /  / Linked ally gets +4POWER and +4LIFE. /  / At the beginning of your end phase, deal 4 unpreventable damage to your champion.
  "blood-dragons-pact": {
    name: "血竜の契約",
    effect:
      "アライリンク *（このオブジェクトは対象のアライにリンクした状態で場に出る。リンクが切れた場合、このオブジェクトを生け贄に捧げる。）*\n\n" +
      "リンクしているアライは+4パワーと+4ライフを得る。\n\n" +
      "あなたのエンドフェイズの開始時に、あなたのチャンピオンに4点の軽減不能ダメージを与える。",
  },

  // Bloodseeker Magus  [ALLY]  L- EXIA
  // EN: On Enter: Deal 3 unpreventable damage to your champion. /  / [Damage 20+]  Ephemerate â (1) (You may activate this card from your graveyard by paying this cost. Ally cards played this way become ephemeral as they enter the field.)
  "bloodseeker-magus": {
    name: "血を求める魔道士",
    effect:
      "登場時：あなたのチャンピオンに3点の軽減不能ダメージを与える。\n\n" +
      "[ダメージ20以上] エフェメレート ― (1) *（このコストを支払って、このカードを墓地から起動してよい。この方法で場に出たアライ・カードは、場に出るときエフェメラルになる。）*",
  },

  // Bolstering Tempest  [ACTION]  L- EXALTED,WIND
  // EN: This card costs 2 more to activate for each / target beyond the first. /  / Any amount of target Human allies get +3POWER until end of turn.
  "bolstering-tempest": {
    name: "鼓舞の大嵐",
    effect:
      "このカードの起動コストは、最初の1つを超える対象1つにつき2多くなる。\n\n" +
      "任意の数の対象のヒューマン・アライは、ターン終了時まで+3パワーを得る。",
  },

  // Bolt of Diamonds  [ACTION]  L- WATER
  // EN: [Level 2+] This card costs 2 less to activate. /  / Deal 1 damage to target unit.
  "bolt-of-diamonds": {
    name: "ダイヤの稲妻",
    effect:
      "[レベル2以上] このカードの起動コストが2少なくなる。\n\n" +
      "対象のユニットに1ダメージを与える。",
  },

  // Brisk Windtrotter  [ALLY]  L- WIND
  // EN: On Enter: Put a buff counter on another target ally you control. (Allies get +1 POWER and +1 LIFE for each buff counter on them.) /  / [Level 2+] On Enter: Put a buff counter on another target ally you control. (Apply this effect only if your champion is level 2 or higher.)
  "brisk-windtrotter": {
    name: "軽やかな風駆け",
    effect:
      "登場時：あなたがコントロールする別の対象のアライにバフカウンターを1個置く。*（アライは自身に置かれたバフカウンター1個につき+1パワーと+1ライフを得る。）*\n\n" +
      "[レベル2以上] 登場時：あなたがコントロールする別の対象のアライにバフカウンターを1個置く。*（この効果は、あなたのチャンピオンがレベル2以上の場合のみ適用する。）*",
  },

  // Buddy Raccoon  [ALLY]  L- NORM
  // EN: [Class Bonus] Fast Activation (You may activate this card at fast speed.) /  / On Enter: You may return another target Raccoon ally you control to its owner's hand.
  "buddy-raccoon": {
    name: "バディ・ラクーン",
    effect:
      "[クラスボーナス] 高速起動 *（このカードを高速で起動してよい。）*\n\n" +
      "登場時：あなたがコントロールする別の対象のラクーン・アライを、そのオーナーの手札に戻してよい。",
  },

  // Cardinal of Divine Rite  [ALLY]  L- NORM
  // EN: Angel cards and objects can't become imbued.
  "cardinal-of-divine-rite": {
    name: "神聖儀式の枢機卿",
    effect: "エンジェル・カードおよびオブジェクトはインビュー状態になれない。",
  },

  // Cauterizing Seraphim  [ALLY]  L- FIRE
  // EN: Advanced Imbue X (You may reserve all cards revealed as you activate this card. If at least X of them are advanced element, this card becomes imbued.) /  / On Enter: If Cauterizing Seraphim was imbued, deal X damage to all other norm and basic element allies.
  "cauterizing-seraphim": {
    name: "焼灼のセラフィム",
    effect:
      "アドバンスド・インビューX *（このカードを起動する際に公開されたカードをすべてリザーブしてよい。その中に上位エレメントがX枚以上あれば、このカードはインビュー状態になる。）*\n\n" +
      "登場時：「焼灼のセラフィム」がインビュー状態だったなら、他のすべての無および基本エレメントのアライにXダメージを与える。",
  },

  // Celestial Navigation  [ACTION]  L- ASTRA
  // EN: Glimpse 5. (To glimpse, look at that many cards from the top of your deck. Put those cards back on the top or on the bottom of your deck in any order.) /  / Floating Memory
  "celestial-navigation": {
    name: "天測航法",
    effect:
      "グリンプス5。*（グリンプスでは、デッキの上からその枚数のカードを見て、好きな順でデッキの上または下に戻す。）*\n\n" +
      "フローティングメモリー",
  },

  // Chasing Shadows  [PHANTASIA]  L- UMBRA
  // EN: On Enter: You gain agility 3 for this turn. (Agility 3 â Return three cards from your memory to your hand at the beginning of the end phase.) /  / [Tristan Bonus] Whenever you gain agility, allies you control named Ominous Shadow get +1POWER until end of turn.
  "chasing-shadows": {
    name: "追いゆく影",
    effect:
      "登場時：あなたはこのターンの間、アジリティ3を得る。*（アジリティ3 ― エンドフェイズの開始時に、あなたのメモリーからカードを3枚手札に戻す。）*\n\n" +
      "[トリスタンボーナス] あなたがアジリティを得るたび、あなたがコントロールする「Ominous Shadow」という名前のアライは、ターン終了時まで+1パワーを得る。",
  },

  // Chilling Touch  [ACTION]  L- WATER
  // EN: Banish a card at random from target opponent's memory. Return that card to their memory at the beginning of their next end phase. /  / Floating Memory (While paying for a memory cost, you may banish this card from your graveyard to pay for 1 of that cost.)
  "chilling-touch": {
    name: "凍える手",
    effect:
      "対象の対戦相手のメモリーからランダムにカードを1枚追放する。そのカードを、その対戦相手の次のエンドフェイズの開始時に、その対戦相手のメモリーに戻す。\n\n" +
      "フローティングメモリー *（メモリーコストの支払い中に、このカードを墓地から追放してそのコストの1点分の支払いに充ててよい。）*",
  },

  // Chime of Endless Dreams  [REGALIA/ITEM]  L- EXALTED,NORM
  // EN: Hindered /  / You don't lose the game for drawing cards while having no cards in your deck. /  / REST, Banish Chime of Endless Dreams: Shuffle all cards in your graveyard into your deck.
  "chime-of-endless-dreams": {
    name: "終わりなき夢の鐘",
    effect:
      "ハインダード *（このオブジェクトはレスト状態で場に出る。）*\n\n" +
      "あなたは、デッキにカードがない状態でカードを引いてもゲームに敗北しない。\n\n" +
      "レスト、「終わりなき夢の鐘」を追放する：あなたの墓地にあるすべてのカードをデッキに加えてシャッフルする。",
  },

  // Cinderbloom Tender  [ALLY]  L- FIRE
  // EN: [Class Bonus] Whenever you gather, deal 1 damage to each champion. (Apply this effect only if your championâs class matches this cardâs class.)
  "cinderbloom-tender": {
    name: "燼花の世話人",
    effect:
      "[クラスボーナス] あなたがギャザーするたび、各チャンピオンに1ダメージを与える。*（この効果は、あなたのチャンピオンのクラスがこのカードのクラスと一致する場合のみ適用する。）*",
  },

  // Classical Opening  [ATTACK]  L- NORM
  // EN: Command Chessman (A Chessman ally you control performs this attack.) /  / Ephemerate â (3) 
  "classical-opening": {
    name: "定跡の初手",
    effect:
      "コマンド：チェスマン *（あなたがコントロールするチェスマン・アライ1体がこの攻撃を行う。）*\n\n" +
      "エフェメレート ― (3)",
  },

  // Clumsy Apprentice  [ALLY]  L- FIRE
  // EN: On Enter: Deal 2 damage to your champion. Draw a card.
  "clumsy-apprentice": {
    name: "不器用な見習い",
    effect: "登場時：あなたのチャンピオンに2ダメージを与える。カードを1枚引く。",
  },

  // Combustible Potion  [ITEM]  L- FIRE
  // EN: Brew â Two Herbs (You may sacrifice the listed objects rather than pay this cardâs reserve cost.) /  / On Enter: If Combustible Potion was brewed, draw two cards and discard a card. /  / Sacrifice Combustible Potion: Deal 2 damage to target unit.
  "combustible-potion": {
    name: "可燃性ポーション",
    effect:
      "ブリュー ― ハーブ2枚 *（このカードのリザーブコストを支払う代わりに、記載されたオブジェクトを生け贄に捧げてよい。）*\n\n" +
      "登場時：「可燃性ポーション」がブリューされていたなら、カードを2枚引き、カードを1枚捨てる。\n\n" +
      "「可燃性ポーション」を生け贄に捧げる：対象のユニットに2ダメージを与える。",
  },

  // Creative Shock  [ACTION]  L- FIRE
  // EN: Draw two cards, then discard a card. / Class Bonus: If a fire element card was discarded, you may choose a unit and deal 2 damage to it. (Apply the additional effect only if your champion's class matches this card's class.)
  "creative-shock": {
    name: "創造の衝撃",
    effect:
      "カードを2枚引き、その後カードを1枚捨てる。\n\n" +
      "クラスボーナス：火エレメントのカードが捨てられたなら、あなたはユニット1体を選び、それに2ダメージを与えてよい。*（この追加効果は、あなたのチャンピオンのクラスがこのカードのクラスと一致する場合のみ適用する。）*",
  },

  // Crimson Rupture  [ACTION]  L- EXIA
  // EN: [Damage 20+] This card costs 2 less to activate. (Apply this effect only if there are twenty or more damage counters on your champion.) /  / Destroy target item or weapon.
  "crimson-rupture": {
    name: "深紅の破裂",
    effect:
      "[ダメージ20以上] このカードの起動コストが2少なくなる。*（この効果は、あなたのチャンピオンにダメージカウンターが20個以上ある場合のみ適用する。）*\n\n" +
      "対象のアイテムまたはウェポン1つを破壊する。",
  },

  // Crowdguard's Slash  [ATTACK]  L- NORM
  // EN: [Class Bonus] As long as an opponent controls three or more units, Crowdguard's Slash gets +2POWER. (Apply this effect only if your championâs class matches this cardâs class.)
  "crowdguards-slash": {
    name: "群衆守りの斬撃",
    effect:
      "[クラスボーナス] 対戦相手がユニットを3体以上コントロールしている限り、「群衆守りの斬撃」は+2パワーを得る。*（この効果は、あなたのチャンピオンのクラスがこのカードのクラスと一致する場合のみ適用する。）*",
  },

  // Crux Sight  [ACTION]  L- CRUX
  // EN: As an additional cost to activate this card, you may pay (2). If you do, banish this card as it resolves and it gains âReturn a crux element card from your graveyard to your hand.â  /  / Draw a card.
  "crux-sight": {
    name: "クラックス・サイト",
    effect:
      "このカードを起動するための追加コストとして、あなたは(2)を支払ってよい。そうした場合、このカードは解決時に追放され、「あなたの墓地から十字エレメントのカードを1枚手札に戻す。」を得る。\n\n" +
      "カードを1枚引く。",
  },

  // Dawn of Ashes  [UNIQUE/DOMAIN]  L- NORM
  // EN: Upkeep â At the beginning of your recollection phase, reveal a card at random from your memory. If that card is not norm element, sacrifice Dawn of Ashes. /  / Non-norm element cards cost 1 more to activate.
  "dawn-of-ashes": {
    name: "灰燼の夜明け",
    effect:
      "アップキープ ― あなたのリコレクションフェイズの開始時に、あなたのメモリーからランダムにカードを1枚公開する。そのカードが無エレメントでないなら、「灰燼の夜明け」を生け贄に捧げる。\n\n" +
      "無エレメント以外のカードの起動コストが1多くなる。",
  },

  // Dazzling Courtesan  [ALLY]  L- FIRE
  // EN: Kindle 3 (You may banish up to three fire element cards from your graveyard as you activate this card. Each one pays for (1) of this card's cost.)
  "dazzling-courtesan": {
    name: "眩惑の遊女",
    effect:
      "キンドル3 *（このカードを起動する際、あなたの墓地から火エレメントのカードを最大3枚追放してよい。1枚につきこのカードのコストの(1)分を支払う。）*",
  },

  // Decaying Reproach  [ACTION]  L- TERA
  // EN: As an additional cost to activate this card, remove up to four wither counters from objects you don't control. /  / Deal 3+X damage to target unit, where X is twice the amount of wither counters removed. /  / [Diao Chan Bonus] (2), Discard this card from your hand: Draw a card into your memory and recover 2.
  "decaying-reproach": {
    name: "朽ちゆく叱責",
    effect:
      "このカードを起動するための追加コストとして、あなたがコントロールしていないオブジェクトから萎縮カウンターを最大4個取り除く。\n\n" +
      "対象のユニットに3＋X点のダメージを与える。Xは取り除いた萎縮カウンターの数の2倍。\n\n" +
      "［ダオ・チャンボーナス］(2)、このカードを手札から捨てる：カードを1枚あなたのメモリーに引き、リカバー2する。",
  },

  // Deflecting Advantage  [ACTION]  L- EXIA
  // EN: Prevent the next 1 damage that would be dealt to target unit this turn from sources you don't control for every three damage counters on your champion. /  / [Jin Bonus] Choose a Polearm weapon you control and trigger each of its on enter effects. Then put a durability counter on it.
  "deflecting-advantage": {
    name: "そらす好機",
    effect:
      "あなたのチャンピオン上のダメージカウンター3個につき、このターン、あなたがコントロールしていない発生源から対象のユニットに与えられる次の1点のダメージを軽減する。\n\n" +
      "［ジンボーナス］あなたがコントロールする長柄武器を1つ選び、その各「登場時」効果を誘発させる。その後、それに耐久カウンターを1個置く。",
  },

  // Devised Conspiracy  [ACTION]  L- UMBRA
  // EN: [Tristan Bonus] Prepare 2 /  / Your champion's next attack this turn gets +2POWER. If Devised Conspiracy was prepared, until end of turn, your champion and allies you control named Ominous Shadow gain "On Champion Hit: Banish the top card of that player's deck face down. As long as it's banished, you may play it, ignoring its elemental requirements."
  "devised-conspiracy": {
    name: "仕組まれた陰謀",
    effect:
      "［トリスタンボーナス］プレパレーション2\n\n" +
      "このターン、あなたのチャンピオンの次の攻撃は＋2パワーを得る。「仕組まれた陰謀」がプレパレーションされていた場合、ターン終了時まで、あなたのチャンピオンおよびあなたがコントロールする「不吉な影」という名前のアライは「チャンピオンヒット時：そのプレイヤーのデッキの一番上のカードを裏向きに追放する。それが追放されているかぎり、あなたはそのエレメント条件を無視してそれをプレイしてよい。」を得る。",
  },

  // Dewy Slime  [ALLY]  L- WATER
  // EN: Intercept (Whenever your champion is attacked while this ally is awake, you may redirect that attack to this ally.) /  / On Enter: You may banish a card with floating memory from your graveyard. If you do, draw a card and recover 2.
  "dewy-slime": {
    name: "露のスライム",
    effect:
      "インターセプト *（このアライがアウェイクの間にあなたのチャンピオンが攻撃されるたび、あなたはその攻撃をこのアライに向け直してよい。）*\n\n" +
      "登場時：あなたの墓地からフローティングメモリーを持つカードを1枚追放してよい。そうしたなら、カードを1枚引き、リカバー2する。",
  },

  // Diamond in the Rough  [ACTION]  L- WATER
  // EN: [Class Bonus] This card costs 1 less to activate for each of up to three Suited allies you control with different reserve costs. /  / Draw a card and empower 1. Until end of turn, whenever you activate a Suited Spell card, empower 1. 
  "diamond-in-the-rough": {
    name: "磨かれざるダイヤ",
    effect:
      "［クラスボーナス］このカードは、あなたがコントロールする異なるリザーブコストを持つスートアライ最大3体につき、起動コストが1少なくなる。\n\n" +
      "カードを1枚引き、エンパワー1する。ターン終了時まで、あなたがスートスペルカードを起動するたび、エンパワー1する。",
  },

  // Diamond Ribbon  [REGALIA/ITEM]  L- WATER
  // EN: (4), Banish Diamond Ribbon: Generate up to two Bolt of Diamonds cards and put them into your memory. This ability costs (1) less to activate for each Suited object you control with different reserve costs.
  "diamond-ribbon": {
    name: "ダイヤのリボン",
    effect:
      "(4)、「ダイヤのリボン」を追放する：「ダイヤの弾」カードを最大2枚生成し、あなたのメモリーに置く。この能力は、あなたがコントロールする異なるリザーブコストを持つスートオブジェクト1つにつき、起動コストが(1)少なくなる。",
  },

  // Discover the Divine  [ACTION]  L- NORM
  // EN: You may remove four enlighten counters from your champion. If you do, level up your champion. (Your champion levels up into a compatible champion card from your material deck, ignoring materialization costs.)
  "discover-the-divine": {
    name: "神性の発見",
    effect:
      "あなたのチャンピオンから覚醒カウンターを4個取り除いてよい。そうしたなら、あなたのチャンピオンをレベルアップする。*（あなたのチャンピオンは、マテリアライズコストを無視して、マテリアルデッキから適合するチャンピオンカードにレベルアップする。）*",
  },

  // Disintegrate  [ACTION]  L- FIRE
  // EN: [Class Bonus] Efficiency (This card costs LV less to activate. LV refers to your champion's level. Apply this effect only if your champion's class matches this card's class.) /  / Destroy target ally or regalia.
  "disintegrate": {
    name: "分解",
    effect:
      "［クラスボーナス］エフィシェンシー *（このカードは起動コストがLV少なくなる。LVはあなたのチャンピオンのレベルを指す。この効果は、あなたのチャンピオンのクラスがこのカードのクラスと一致する場合のみ適用する。）*\n\n" +
      "対象のアライまたはレガリアを破壊する。",
  },

  // Displace  [ACTION]  L- WIND
  // EN: Banish target ally, then return it to the field under its owner's control rested. /  / [Class Bonus] Put an enlighten counter on your champion.
  "displace": {
    name: "転置",
    effect:
      "対象のアライを追放し、その後それをオーナーのコントロール下でレストして戦場に戻す。\n\n" +
      "［クラスボーナス］あなたのチャンピオンに覚醒カウンターを1個置く。",
  },

  // Dissipation  [ACTION]  L- EXALTED,WIND
  // EN: (Exalted â This element is enabled for you as long as you have another advanced element enabled.) /  / Destroy all phantasias.
  "dissipation": {
    name: "霧散",
    effect:
      "*（エグザルテッド — このエレメントは、あなたが他のアドバンスドエレメントを有効にしているかぎり、あなたにとって有効となる。）*\n\n" +
      "すべてのファンタジアを破壊する。",
  },

  // Distilled Water  [ITEM]  L- NORM
  // EN: Brew â One Herb /  / Sacrifice Distilled Water: If Distilled Water was brewed, draw a card.
  "distilled-water": {
    name: "蒸留水",
    effect:
      "ブリュー — ハーブ1つ\n\n" +
      "「蒸留水」をサクリファイスする：「蒸留水」がブリューされていた場合、カードを1枚引く。",
  },

  // Divining Streams  [ACTION]  L- WATER
  // EN: Look at the top three cards of your deck. Put one of them into your graveyard, one on top of your deck, and one on the bottom of your deck. /  / [Class Bonus] Floating Memory
  "divining-streams": {
    name: "占いの流れ",
    effect:
      "あなたのデッキの一番上から3枚を見る。そのうち1枚をあなたの墓地に、1枚をデッキの一番上に、1枚をデッキの一番下に置く。\n\n" +
      "［クラスボーナス］フローティングメモリー",
  },

  // Dream Fairy  [ALLY]  L- WIND
  // EN: Stealth (This unit can't be targeted by attacks unless permitted by true sight.) /  / On Enter: Return target ally you don't control to its owner's memory. Opponents can't activate cards with that ally's name as long as you control Dream Fairy.
  "dream-fairy": {
    name: "夢の妖精",
    effect:
      "ステルス *（このユニットは、トゥルーサイトによって許可されないかぎり、攻撃の対象にできない。）*\n\n" +
      "登場時：あなたがコントロールしていない対象のアライをオーナーのメモリーに戻す。あなたが「夢の妖精」をコントロールしているかぎり、対戦相手はそのアライの名前を持つカードを起動できない。",
  },

  // Dwarf Star's Glow  [ACTION]  L- ASTRA
  // EN: Starcalling â (1) (As you're looking at this card while glimpsing, you may activate it by paying this cost. If you do, put all other cards you're looking at on the bottom of your deck in any order.) /  / Deal 2 damage to target unit. If Dwarf Star's Glow was starcalled, put it into its owner's memory.
  "dwarf-stars-glow": {
    name: "矮星の輝き",
    effect:
      "スターコーリング — (1) *（グリンプス中にこのカードを見ている際、あなたはこのコストを支払うことでこれを起動してよい。そうしたなら、あなたが見ている他のすべてのカードを好きな順番でデッキの一番下に置く。）*\n\n" +
      "対象のユニットに2点のダメージを与える。「矮星の輝き」がスターコールされていた場合、それをオーナーのメモリーに置く。",
  },

  // Dynastic Whirlpool  [ACTION]  L- EXALTED,WATER
  // EN: (Exalted â This element is enabled for you as long as you have another advanced element enabled.) /  / Each opponent puts the top fifteen cards of their deck into their graveyard.
  "dynastic-whirlpool": {
    name: "王朝の渦",
    effect:
      "*（エグザルテッド — このエレメントは、あなたが他のアドバンスドエレメントを有効にしているかぎり、あなたにとって有効となる。）*\n\n" +
      "各対戦相手は自分のデッキの一番上から15枚を自分の墓地に置く。",
  },

  // Edelstein, Queen of Diamonds  [UNIQUE/ALLY]  L- WATER
  // EN: You may banish three or more Suited Spell cards with total reserve cost 10 from your graveyard rather than pay this cardâs reserve cost. /  / On Enter: Recover 4 and empower 4. /  / Whenever you empower an amount, Edelstein gets +X POWER until end of turn, where X is that amount.
  "edelstein-queen-of-diamonds": {
    name: "エーデルシュタイン、ダイヤの女王",
    effect:
      "このカードのリザーブコストを支払う代わりに、あなたの墓地からリザーブコストの合計が10になるスートスペルカードを3枚以上追放してよい。\n\n" +
      "登場時：リカバー4し、エンパワー4する。\n\n" +
      "あなたが何らかの量をエンパワーするたび、ターン終了時まで「エーデルシュタイン」は＋Xパワーを得る。Xはその量。",
  },

  // Eight of Hearts  [ALLY]  L- FIRE
  // EN: While paying for this card's reserve cost, you may sacrifice up to two Suited allies with reserve cost 4 or less. Each ally sacrificed this way pays for 3 of that cost. /  / Cardistry â (8): Draw two cards. This ability costs (1) less to activate for each Suited object you control with different reserve costs. Activate this ability only once.
  "eight-of-hearts": {
    name: "ハートの8",
    effect:
      "このカードのリザーブコストを支払う際、リザーブコスト4以下のスートアライを最大2体サクリファイスしてよい。この方法でサクリファイスした各アライは、そのコストの3分を支払う。\n\n" +
      "カーディストリ — (8)：カードを2枚引く。この能力は、あなたがコントロールする異なるリザーブコストを持つスートオブジェクト1つにつき、起動コストが(1)少なくなる。この能力は1回のみ起動する。",
  },

  // Eight of Spades  [ALLY]  L- NORM
  // EN: [Level 1+] This card costs 4 less to activate. /  / Cardistry â (8): Wake up Eight of Spades. This ability costs (1) less to activate for each Suited object you control with different reserve costs. Activate this ability only once.
  "eight-of-spades": {
    name: "スペードの8",
    effect:
      "［レベル1以上］このカードは起動コストが4少なくなる。\n\n" +
      "カーディストリ — (8)：「スペードの8」をアウェイクにする。この能力は、あなたがコントロールする異なるリザーブコストを持つスートオブジェクト1つにつき、起動コストが(1)少なくなる。この能力は1回のみ起動する。",
  },

  // Elucidate Plans  [ACTION]  L- LUXEM
  // EN: Put two preparation counters on your champion.   /  / [Class Bonus] [Element Bonus] Whenever you reveal this card from your memory, put a preparation counter on your champion.
  "elucidate-plans": {
    name: "計画の解明",
    effect:
      "あなたのチャンピオンにプレパレーションカウンターを2個置く。\n\n" +
      "［クラスボーナス］［エレメントボーナス］あなたが自分のメモリーからこのカードを公開するたび、あなたのチャンピオンにプレパレーションカウンターを1個置く。",
  },

  // Elusive Headhunter  [ALLY]  L- UMBRA
  // EN: Elusive Headhunter's  attacks can't be retaliated. /  / [Class Bonus] On Kill: You gain agility 3 for this turn. (Agility 3 â Return three cards from your memory to your hand at the beginning of the end phase.)
  "elusive-headhunter": {
    name: "神出鬼没のヘッドハンター",
    effect:
      "「神出鬼没のヘッドハンター」の攻撃はリタリエイトされない。\n\n" +
      "［クラスボーナス］キル時：このターン、あなたはアジリティ3を得る。*（アジリティ3 — エンドフェイズの開始時に、あなたのメモリーから3枚を手札に戻す。）*",
  },

  // Elyan, Lustre Loyalty  [UNIQUE/ALLY]  L- LUXEM
  // EN: [Class Bonus] Stealth /  / [Class Bonus] Whenever you recover an amount, Elyan gets +XPOWER until end of turn, where X is that amount. Then if X is 4 or more, Elyan gains unblockable until end of turn.
  "elyan-lustre-loyalty": {
    name: "エリアン、輝きの忠誠",
    effect:
      "［クラスボーナス］ステルス\n\n" +
      "［クラスボーナス］あなたが何らかの量をリカバーするたび、ターン終了時まで「エリアン」は＋Xパワーを得る。Xはその量。その後、Xが4以上の場合、ターン終了時まで「エリアン」はアンブロッカブルを得る。",
  },

  // Emberwrath Witch  [ALLY]  L- FIRE
  // EN: At the beginning of your end phase, sacrifice Emberwrath Witch. /  / Ephemerate â (2) (You may activate this card from your graveyard by paying this cost. Ally cards played this way become ephemeral as they enter the field.)
  "emberwrath-witch": {
    name: "燃え盛る憤怒の魔女",
    effect:
      "あなたのエンドフェイズの開始時に、「燃え盛る憤怒の魔女」をサクリファイスする。\n\n" +
      "エフェメレート — (2) *（あなたはこのコストを支払うことでこのカードを墓地から起動してよい。この方法でプレイしたアライカードは、戦場に出る際にエフェメラルになる。）*",
  },

  // Engulf  [ACTION]  L- WATER
  // EN: [Level 2+] This card costs 3 less to activate. (Apply this effect only if your champion is level 2 or higher.) /  / Negate target non-attack card activation. 
  "engulf": {
    name: "呑み込み",
    effect:
      "［レベル2以上］このカードは起動コストが3少なくなる。*（この効果は、あなたのチャンピオンがレベル2以上の場合のみ適用する。）*\n\n" +
      "対象の非攻撃カードの起動を打ち消す。",
  },

  // Ensnaring Fumes  [ACTION]  L- WIND
  // EN: You may remove three preparation counters from your champion rather than pay this card's reserve cost. /  / Return all allies to their owner's hands. /  / [Class Bonus] Floating Memory
  "ensnaring-fumes": {
    name: "からめとる霧",
    effect:
      "このカードのリザーブコストを支払う代わりに、あなたのチャンピオンからプレパレーションカウンターを3個取り除いてよい。\n\n" +
      "すべてのアライをオーナーの手札に戻す。\n\n" +
      "［クラスボーナス］フローティングメモリー",
  },

  // Entrenched Fortress  [DOMAIN]  L- TERA
  // EN: Taunt (While awake, this domain must be targeted before other objects you control during your opponentâs attack declarations if able.) /  / On Enter: Deal 3 damage to target unit.
  "entrenched-fortress": {
    name: "堅牢な要塞",
    effect:
      "タウント *（アウェイクの間、可能ならこのドメインは対戦相手の攻撃宣言時にあなたがコントロールする他のオブジェクトより先に対象にされなければならない。）*\n\n" +
      "登場時：対象のユニットに3点のダメージを与える。",
  },

  // Epochal Conqueror  [ALLY]  L- NORM
  // EN: As long as Epochal Conqueror is attacking a domain, it gets +3POWER.
  "epochal-conqueror": {
    name: "時代の征服者",
    effect: "「時代の征服者」がドメインを攻撃しているかぎり、それは＋3パワーを得る。",
  },

  // Equinox Hour  [REGALIA/ITEM]  L- NORM
  // EN: Banish Equinox Hour: Draw a card. Then target opponent may materialize a card from their material deck. (That opponent still pays for its costs.)
  "equinox-hour": {
    name: "分点の刻",
    effect:
      "「分点の刻」を追放する：カードを1枚引く。その後、対象の対戦相手は自分のマテリアルデッキからカードを1枚マテリアライズしてよい。*（その対戦相手はそのコストを支払う。）*",
  },

  // Erratic Bolt  [ACTION]  L- ARCANE
  // EN: Deal LV damage to target unit. (LV refers to your champion's level.) /  / [Class Bonus] You may banish two cards at random from your memory. If you do, draw two cards. (Apply this effect only if your champion's class matches this card's class.)
  "erratic-bolt": {
    name: "不規則な稲妻",
    effect:
      "対象のユニットにLV点のダメージを与える。*（LVはあなたのチャンピオンのレベルを指す。）*\n\n" +
      "［クラスボーナス］あなたのメモリーからランダムに2枚を追放してよい。そうしたなら、カードを2枚引く。*（この効果は、あなたのチャンピオンのクラスがこのカードのクラスと一致する場合のみ適用する。）*",
  },

  // Escape the Wreckage  [ACTION]  L- NORM
  // EN: Return target ally you control to its owner's memory. If you do, draw a card into your memory.
  "escape-the-wreckage": {
    name: "残骸からの脱出",
    effect:
      "あなたがコントロールする対象のアライをオーナーのメモリーに戻す。そうしたなら、カードを1枚あなたのメモリーに引く。",
  },

  // Essence Crucible  [REGALIA/ITEM]  L- NORM
  // EN: On Enter: Draw a card.  /  / [Arisanna Bonus] Whenever you brew a card, put a refinement counter on Essence Crucible. /  / If a Spell source you control would deal damage to one or more units, it deals that much damage plus X instead, where X is the amount of refinement counters on Essence Crucible.
  "essence-crucible": {
    name: "エッセンスのるつぼ",
    effect:
      "登場時：カードを1枚引く。\n\n" +
      "［アリサナボーナス］あなたがカードをブリューするたび、「エッセンスのるつぼ」に精製カウンターを1個置く。\n\n" +
      "あなたがコントロールするスペルの発生源が1体以上のユニットにダメージを与える場合、代わりにそれはそのダメージにX点を加えたダメージを与える。Xは「エッセンスのるつぼ」上の精製カウンターの数。",
  },

  // Everlonging Thorns  [ACTION]  L- TERA
  // EN: Put two debuff counters on target ally. If your Shifting Currents face East or West, put 2+LV debuff counters on it instead. /  / [Kongming Bonus] If Everlonging Thorns is empowered, put it into its owner's material deck preserved.
  "everlonging-thorns": {
    name: "永久の茨",
    effect:
      "対象のアライにデバフカウンターを2個置く。あなたの「移ろう潮流」が東または西を向いている場合、代わりにそれに2＋LV個のデバフカウンターを置く。\n\n" +
      "［コンミンボーナス］「永久の茨」がエンパワーされている場合、それをプリザーブしてオーナーのマテリアルデッキに置く。",
  },

  // Excitable Raccoon  [ALLY]  L- NORM
  // EN: As long as an opponent has no cards in their graveyard, Excitable Raccoon gets +1POWER and has vigor. (At the beginning of the your end phase, wake up this ally with vigor.)
  "excitable-raccoon": {
    name: "興奮しやすいアライグマ",
    effect:
      "対戦相手の墓地にカードが1枚もないかぎり、「興奮しやすいアライグマ」は＋1パワーを得てヴィガーを持つ。*（あなたのエンドフェイズの開始時に、ヴィガーを持つこのアライをアウェイクにする。）*",
  },

  // Exia Sight  [ACTION]  L- EXIA
  // EN: Draw a card. /  / [Damage 20+] The next card you activate this turn costs 1 less to activate. (Apply this effect only if there are twenty or more damage counters on your champion.)
  "exia-sight": {
    name: "エクシアの視",
    effect:
      "カードを1枚引く。\n\n" +
      "［ダメージ20以上］このターン、あなたが起動する次のカードは起動コストが1少なくなる。*（この効果は、あなたのチャンピオン上にダメージカウンターが20個以上ある場合のみ適用する。）*",
  },

  // Fabricator Slime  [ALLY]  L- NEOS
  // EN: Pride 3 /  / Fabricator Slime enters the field with a buff counter on it. /  / [Class Bonus] REST: For each of up to three buff counters on Fabricator Slime, summon a Baby Slime token.
  "fabricator-slime": {
    name: "製造者スライム",
    effect:
      "プライド3\n\n" +
      "「製造者スライム」はバフカウンターを1個持って戦場に出る。\n\n" +
      "［クラスボーナス］レスト：「製造者スライム」上の最大3個のバフカウンターにつき、赤ちゃんスライムトークンを1体召喚する。",
  },

  // False Tidings  [ACTION]  L- NORM
  // EN: Target opponent gains control of target Crystal object you control. If they do, you draw two cards. /  / 
  "false-tidings": {
    name: "偽りの報せ",
    effect:
      "対象の対戦相手は、あなたがコントロールする対象のクリスタルオブジェクトのコントロールを得る。そうしたなら、あなたはカードを2枚引く。",
  },

  // Fast Cure  [ACTION]  L- NORM
  // EN: If target opponent's influence is greater than yours, recover 4. (A player's influence is equal to the total amount of cards in their hand and memory.) /  / Floating Memory
  "fast-cure": {
    name: "速効治療",
    effect:
      "対象の対戦相手のインフルエンスがあなたのものより大きい場合、リカバー4する。*（プレイヤーのインフルエンスは、その手札とメモリーのカードの合計枚数に等しい。）*\n\n" +
      "フローティングメモリー",
  },

  // Favorable Winds  [ACTION]  L- WIND
  // EN: Allies you control get +1 LIFE until end of turn. /  / Floating Memory (While paying for a memory cost, you may banish this card from your graveyard to pay for 1 of that cost.)
  "favorable-winds": {
    name: "追い風",
    effect:
      "ターン終了時まで、あなたがコントロールするアライは＋1ライフを得る。\n\n" +
      "フローティングメモリー *（メモリーコストを支払う際、あなたはこのカードを墓地から追放してそのコストの1分を支払ってよい。）*",
  },

  // Fertile Grounds  [PHANTASIA]  L- WIND
  // EN: At the beginning of your recollection phase, summon a token copy of an Herb item you control.
  "fertile-grounds": {
    name: "肥沃な大地",
    effect:
      "あなたのリコレクションフェイズの開始時に、あなたがコントロールするハーブアイテムのトークンコピーを1つ召喚する。",
  },

  // Find Recipe  [ACTION]  L- NORM
  // EN: Scavenge 6 for a Potion card. (To scavenge an amount, reveal cards from the top of your deck until you reveal that many cards or until you reveal the specified card. Put the specified card into your hand and the rest on the bottom of your deck in a random order.)
  "find-recipe": {
    name: "レシピの発見",
    effect:
      "スカベンジ6（ポーション）。*（ある量をスカベンジするには、その枚数のカードを公開するか指定されたカードを公開するまで、デッキの一番上からカードを公開する。指定されたカードを手札に入れ、残りをランダムな順番でデッキの一番下に置く。）*",
  },

  // Fireball  [ACTION]  L- FIRE
  // EN: [Class Bonus] This card costs 2 less to activate. (Apply this effect only if your champion's class matches this card's class.) /  / Deal 1+LV damage to target unit. (LV refers to your champion's level.)
  "fireball": {
    name: "ファイアボール",
    effect:
      "［クラスボーナス］このカードは起動コストが2少なくなる。*（この効果は、あなたのチャンピオンのクラスがこのカードのクラスと一致する場合のみ適用する。）*\n\n" +
      "対象のユニットに1＋LV点のダメージを与える。*（LVはあなたのチャンピオンのレベルを指す。）*",
  },

  // Five of Diamonds  [ALLY]  L- WATER
  // EN: Cardistry â (5): Draw a card into your memory. This ability costs (1) less to activate for each Suited object you control with different reserve costs. Activate this ability only once. /  / Floating Memory
  "five-of-diamonds": {
    name: "ダイヤの5",
    effect:
      "カーディストリ — (5)：カードを1枚あなたのメモリーに引く。この能力は、あなたがコントロールする異なるリザーブコストを持つスートオブジェクト1つにつき、起動コストが(1)少なくなる。この能力は1回のみ起動する。\n\n" +
      "フローティングメモリー",
  },

  // Five of Spades  [ALLY]  L- NORM
  // EN: Cardistry â (5): Five of Spades gets +5POWER until end of turn. This ability costs (1) less to activate for each Suited object you control with different reserve costs. Activate this ability only once. /  / Floating Memory
  "five-of-spades": {
    name: "スペードの5",
    effect:
      "カーディストリ — (5)：ターン終了時まで「スペードの5」は＋5パワーを得る。この能力は、あなたがコントロールする異なるリザーブコストを持つスートオブジェクト1つにつき、起動コストが(1)少なくなる。この能力は1回のみ起動する。\n\n" +
      "フローティングメモリー",
  },

  // Flagrant Guide  [ALLY]  L- FIRE
  // EN: On Enter: You may level up your champion. If you do, deal 6+X unpreventable damage to it, where X is four times that champion's base level. (Your champion levels up into a compatible champion card from your material deck, ignoring materialization costs.)
  "flagrant-guide": {
    name: "苛烈なる案内人",
    effect:
      "登場時：あなたのチャンピオンをレベルアップしてよい。そうしたなら、それに6＋X点の軽減不能のダメージを与える。Xはそのチャンピオンの基本レベルの4倍。*（あなたのチャンピオンは、マテリアライズコストを無視して、マテリアルデッキから適合するチャンピオンカードにレベルアップする。）*",
  },

  // Flame Sweep  [ATTACK]  L- FIRE
  // EN: Cleave (Attack all units a chosen opponent controls. This attack can't be intercepted.) /  / [Class Bonus] [Level 2+] Flame Sweep gets +1 POWER. (Apply this effect only if your champion's class matches this card's class, and only if your champion is level 2 or higher.)
  "flame-sweep": {
    name: "炎の一掃",
    effect:
      "クリーブ *（選んだ対戦相手がコントロールするすべてのユニットを攻撃する。この攻撃はインターセプトされない。）*\n\n" +
      "［クラスボーナス］［レベル2以上］「炎の一掃」は＋1パワーを得る。*（この効果は、あなたのチャンピオンのクラスがこのカードのクラスと一致し、かつあなたのチャンピオンがレベル2以上の場合のみ適用する。）*",
  },

  // Floodborne Swing  [ATTACK]  L- WATER
  // EN: [Class Bonus]Deluge 3 â As long as you have three or more water element cards in your graveyard, Floodborne Swing gets +4POWER. / 
  "floodborne-swing": {
    name: "洪水の一振り",
    effect:
      "［クラスボーナス］デリュージ3 — あなたの墓地に水エレメントのカードが3枚以上あるかぎり、「洪水の一振り」は＋4パワーを得る。",
  },

  // Floodborne Warrior  [ALLY]  L- WATER
  // EN: Deluge 2 â As long as you have two or more water element cards in your graveyard, Floodborne Warrior gets +1POWER and +1LIFE.
  "floodborne-warrior": {
    name: "洪水の戦士",
    effect:
      "デリュージ2 — あなたの墓地に水エレメントのカードが2枚以上あるかぎり、「洪水の戦士」は＋1パワーと＋1ライフを得る。",
  },

  // Floodward Steed  [ALLY]  L- WATER
  // EN: On Enter:  Put a bulwark counter on target ally. (If combat damage would be dealt to an ally with any bulwark counters on it, remove one and prevent that damage instead.)
  "floodward-steed": {
    name: "防水の駿馬",
    effect:
      "登場時：対象のアライにバルワークカウンターを1個置く。*（バルワークカウンターが乗っているアライに戦闘ダメージが与えられる場合、代わりにそれを1個取り除き、そのダメージを軽減する。）*",
  },

  // Floral Arrangement  [ACTION]  L- NORM
  // EN: Summon a Silvershine and a Fraysia token. /  / Floating Memory (While paying for a memory cost, you may banish this card from your graveyard to pay for 1 of that cost.)
  "floral-arrangement": {
    name: "花のあしらい",
    effect:
      "シルバーシャインとフレイシアのトークンを1つずつ召喚する。\n\n" +
      "フローティングメモリー *（メモリーコストを支払う際、あなたはこのカードを墓地から追放してそのコストの1分を支払ってよい。）*",
  },

  // Flourishing Qi  [ACTION]  L- TERA
  // EN: Whenever your Shifting Currents change from facing any direction to North while this card's activation is on the effects stack, put four charge counters on that activation. /  / Deal LV+X damage to target unit, where X is the amount of charge counters on this card's activation.
  "flourishing-qi": {
    name: "旺盛な気",
    effect:
      "このカードの起動がエフェクトスタックにある間に、あなたの「移ろう潮流」がいずれかの方向から北を向くように変わるたび、その起動にチャージカウンターを4個置く。\n\n" +
      "対象のユニットにLV＋X点のダメージを与える。Xはこのカードの起動上のチャージカウンターの数。",
  },

  // Flourishing Restoration  [ACTION]  L- TERA
  // EN: [Diao Chan Bonus] You may ignore this card's elemental requirements as you activate it. If you do, it costs 2 more to activate. /  / Recover 3. Then for each of up to two allies you don't control, recover 3 again.
  "flourishing-restoration": {
    name: "旺盛な回復",
    effect:
      "［ダオ・チャンボーナス］あなたはこのカードを起動する際、そのエレメント条件を無視してよい。そうしたなら、それは起動コストが2多くなる。\n\n" +
      "リカバー3する。その後、あなたがコントロールしていない最大2体のアライにつき、再びリカバー3する。",
  },

  // Flowerbud  [TOKEN/PHANTASIA]  L- TERA
  // EN: (効果テキストなし)
  "flowerbud": {
    name: "花のつぼみ",
    effect: "",
  },

  // Focal Intensity  [ACTION]  L- FIRE
  // EN: Deal 1 damage to target unit. /  / [Merlin Bonus] You may remove two sheen counters from your Fractured Memories. If you do, put two preparation counters on your champion.
  "focal-intensity": {
    name: "焦点の強度",
    effect:
      "対象のユニットに1点のダメージを与える。\n\n" +
      "［マーリンボーナス］あなたの「砕けた記憶」からシーンカウンターを2個取り除いてよい。そうしたなら、あなたのチャンピオンにプレパレーションカウンターを2個置く。",
  },

  // Focused Flames  [ACTION]  L- FIRE
  // EN: [Class Bonus] This card costs 1 less to activate. (Apply this effect only if your champion's class matches this card's class.) /  / Deal 4 damage to target ally.
  "focused-flames": {
    name: "集束の炎",
    effect:
      "［クラスボーナス］このカードは起動コストが1少なくなる。*（この効果は、あなたのチャンピオンのクラスがこのカードのクラスと一致する場合のみ適用する。）*\n\n" +
      "対象のアライに4点のダメージを与える。",
  },

  // Focusing Gem  [REGALIA/ITEM]  L- EXALTED,NORM
  // EN: (Exalted â This element is enabled for you as long as you have another advanced element enabled.) /  / Hindered (This object enters the field rested.) /  / REST, Banish Focusing Gem: The next card you activate this turn costs (3) less to activate.
  "focusing-gem": {
    name: "集束の宝石",
    effect:
      "*（エグザルテッド — このエレメントは、あなたが他のアドバンスドエレメントを有効にしているかぎり、あなたにとって有効となる。）*\n\n" +
      "ヒンダード *（このオブジェクトはレストして戦場に出る。）*\n\n" +
      "レスト、「集束の宝石」を追放する：このターン、あなたが起動する次のカードは起動コストが(3)少なくなる。",
  },

  // Foraging Servant  [ALLY]  L- NORM
  // EN: On Enter:  Gather. (To gather, summon a Blightroot, Manaroot, Silvershine, Fraysia, Razorvine, or Springleaf token, chosen at random.) /  / [Class Bonus] Floating Memory (While paying for a memory cost, you may banish this card from your graveyard to pay for 1 of that cost.)
  "foraging-servant": {
    name: "採集の従者",
    effect:
      "登場時：ギャザーする。*（ギャザーするには、ブライトルート、マナルート、シルバーシャイン、フレイシア、レイザーヴァイン、スプリングリーフのトークンをランダムに1つ選んで召喚する。）*\n\n" +
      "［クラスボーナス］フローティングメモリー *（メモリーコストを支払う際、あなたはこのカードを墓地から追放してそのコストの1分を支払ってよい。）*",
  },

  // Forbidden Teachings  [ACTION]  L- NORM
  // EN: If you control a Book object, glimpse 3. (To glimpse, look at that many cards from the top of your deck. Put those cards back on the top or on the bottom of your deck in any order.) /  / Draw a card.
  "forbidden-teachings": {
    name: "禁じられた教え",
    effect:
      "あなたがブックオブジェクトをコントロールしている場合、グリンプス3する。*（グリンプスするには、デッキの一番上からその枚数のカードを見る。それらのカードを好きな順番でデッキの一番上または一番下に戻す。）*\n\n" +
      "カードを1枚引く。",
  },

  // Found Power  [ACTION]  L- FIRE
  // EN: Empower 3. If you control an object named Proto Key Crest, discard up to two cards, then draw that many cards.
  "found-power": {
    name: "見出した力",
    effect:
      "エンパワー3する。あなたが「プロトキー・クレスト」という名前のオブジェクトをコントロールしている場合、カードを最大2枚捨て、その後その枚数のカードを引く。",
  },

  // Fount Seraphim  [ALLY]  L- WATER
  // EN: Advanced Imbue 2 (You may reserve all cards revealed as you activate this card. If at least two of them are advanced element, this card becomes imbued.) /  / Taunt /  / On Enter: If Fount Seraphim is imbued, until the beginning of your next turn, allies your opponents control enter the field rested.
  "fount-seraphim": {
    name: "泉のセラフィム",
    effect:
      "アドバンスド・インビュー2 *（あなたはこのカードを起動する際、公開したすべてのカードをリザーブしてよい。そのうち少なくとも2枚がアドバンスドエレメントの場合、このカードはインビュー状態になる。）*\n\n" +
      "タウント\n\n" +
      "登場時：「泉のセラフィム」がインビュー状態の場合、あなたの次のターンの開始時まで、対戦相手がコントロールするアライはレストして戦場に出る。",
  },

  // Four of Diamonds  [ALLY]  L- WATER
  // EN: Retort 3 /  / Cardistry â (4): Reveal up to two Suited cards from your memory. For each card revealed this way, generate a Bolt of Diamonds card and put it into your memory. This ability costs (1) less to activate for each Suited object you control with different reserve costs. Activate this ability only once.
  "four-of-diamonds": {
    name: "ダイヤの4",
    effect:
      "リトート3\n\n" +
      "カーディストリ — (4)：あなたのメモリーからスートカードを最大2枚公開する。この方法で公開した各カードにつき、「ダイヤの弾」カードを1枚生成しあなたのメモリーに置く。この能力は、あなたがコントロールする異なるリザーブコストを持つスートオブジェクト1つにつき、起動コストが(1)少なくなる。この能力は1回のみ起動する。",
  },

  // Four of Spades  [ALLY]  L- NORM
  // EN: Cardistry â (4): Draw a card into your memory. This ability costs (1) less to activate for each Suited object you control with different reserve costs. Activate this ability only once.
  "four-of-spades": {
    name: "スペードの4",
    effect:
      "カーディストリ — (4)：カードを1枚あなたのメモリーに引く。この能力は、あなたがコントロールする異なるリザーブコストを持つスートオブジェクト1つにつき、起動コストが(1)少なくなる。この能力は1回のみ起動する。",
  },

  // Fractal of Duplication  [PHANTASIA]  L- NEOS
  // EN: Whenever Fractal of Duplication becomes rested, summon a token copy of it rested. /  / Reservable (While paying for a reserve cost, you may rest this object to pay for 1 of that cost.)
  "fractal-of-duplication": {
    name: "複製のフラクタル",
    effect:
      "「複製のフラクタル」がレストになるたび、それのトークンコピーをレストして召喚する。\n\n" +
      "リザーバブル *（リザーブコストを支払う際、あなたはこのオブジェクトをレストしてそのコストの1分を支払ってよい。）*",
  },

  // Fractal of Intrusion  [PHANTASIA]  L- WATER
  // EN: On Enter: You may banish a card with floating memory from your graveyard. When you do, look at target opponent's memory and discard a card from it. /  / Reservable (While paying for a reserve cost, you may rest this object to pay for 1 of that cost.) 
  "fractal-of-intrusion": {
    name: "侵入のフラクタル",
    effect:
      "登場時：あなたの墓地からフローティングメモリーを持つカードを1枚追放してよい。そうしたとき、対象の対戦相手のメモリーを見て、その中からカードを1枚捨てさせる。\n\n" +
      "リザーバブル *（リザーブコストを支払う際、あなたはこのオブジェクトをレストしてそのコストの1分を支払ってよい。）*",
  },

  // Fractal of Waves  [PHANTASIA]  L- WATER
  // EN: Whenever your champion levels up into a champion with base level 3, you may sacrifice Fractal of Waves. If you do, draw two cards into your memory. /  / Reservable (While paying for a reserve cost, you may rest this object to pay for 1 of that cost.)
  "fractal-of-waves": {
    name: "波のフラクタル",
    effect:
      "あなたのチャンピオンが基本レベル3のチャンピオンにレベルアップするたび、あなたは「波のフラクタル」をサクリファイスしてよい。そうしたなら、カードを2枚あなたのメモリーに引く。\n\n" +
      "リザーバブル *（リザーブコストを支払う際、あなたはこのオブジェクトをレストしてそのコストの1分を支払ってよい。）*",
  },

  // Fracturize  [ACTION]  L- WATER
  // EN: Target item or weapon becomes a Cleric Fractal phantasia with reservable and loses all other abilities. (This effect lasts indefinitely.) /  / Floating Memory
  "fracturize": {
    name: "フラクチャライズ",
    effect:
      "対象のアイテムまたは武器は、リザーバブルを持つクレリック・フラクタルのファンタジアになり、他のすべての能力を失う。*（この効果は無期限に続く。）*\n\n" +
      "フローティングメモリー",
  },

  // Fraysia  [TOKEN/ITEM]  L- NORM
  // EN: Sacrifice Fraysia: Recover 1.
  "fraysia": {
    name: "フレイシア",
    effect: "「フレイシア」をサクリファイスする：リカバー1する。",
  },

  // Frostbind  [ACTION]  L- WATER
  // EN: Negate target card activation unless its controller pays (2). Banish the card that had its activation negated this way.
  "frostbind": {
    name: "霜縛り",
    effect:
      "そのコントローラーが(2)を支払わないかぎり、対象のカードの起動を打ち消す。この方法で起動を打ち消したカードを追放する。",
  },

  // Frozen Divinity  [UNIQUE/PHANTASIA]  L- WATER
  // EN: If a champion with base level 2 you donât control would level up into a champion card, return that card to its ownerâs material deck instead. /  / At the beginning of your end phase, if your champion didn't level up this turn, sacrifice Frozen Divinity. /  / Whenever your champion levels up into a champion with base level 3, sacrifice Frozen Divinity and draw a card into your memory.
  "frozen-divinity": {
    name: "凍てつく神性",
    effect:
      "あなたがコントロールしていない基本レベル2のチャンピオンがチャンピオンカードにレベルアップする場合、代わりにそのカードをオーナーのマテリアルデッキに戻す。\n\n" +
      "あなたのエンドフェイズの開始時に、あなたのチャンピオンがこのターンにレベルアップしていない場合、「凍てつく神性」をサクリファイスする。\n\n" +
      "あなたのチャンピオンが基本レベル3のチャンピオンにレベルアップするたび、「凍てつく神性」をサクリファイスし、カードを1枚あなたのメモリーに引く。",
  },

  // Frozen Nova  [ACTION]  L- WATER
  // EN: [Class Bonus] Efficiency (This card costs LV less to activate. LV refers to your champion's level.) /  / Deal 1 damage to all allies and rest them. Those allies don't wake up during their controller's next wake up phase.
  "frozen-nova": {
    name: "フローズンノヴァ",
    effect:
      "［クラスボーナス］エフィシェンシー *（このカードは起動コストがLV少なくなる。LVはあなたのチャンピオンのレベルを指す。）*\n\n" +
      "すべてのアライに1点のダメージを与え、それらをレストする。それらのアライは、コントローラーの次のウェイクアップフェイズにアウェイクにならない。",
  },

  // Fulminating Storm  [ACTION]  L- ARCANE
  // EN: Remove up to nine enlighten counters from your champion. Deal X damage to each champion you don't control, where X is the amount of counters removed this way.  /  / [Class Bonus] For every three enlighten counters removed this way, draw a card.
  "fulminating-storm": {
    name: "雷鳴の嵐",
    effect:
      "あなたのチャンピオンから覚醒カウンターを最大9個取り除く。あなたがコントロールしていない各チャンピオンにX点のダメージを与える。Xはこの方法で取り除いたカウンターの数。\n\n" +
      "［クラスボーナス］この方法で取り除いた覚醒カウンター3個につき、カードを1枚引く。",
  },

  // Galahad, Court Knight  [UNIQUE/ALLY]  L- NORM
  // EN: (Unique â You can control only one object with this card's name.) /  / [Class Bonus] Galahad can attack using Sword weapons you control.
  "galahad-court-knight": {
    name: "ガラハッド、宮廷騎士",
    effect:
      "*（ユニーク — この名前を持つオブジェクトは1つしかコントロールできない。）*\n\n" +
      "［クラスボーナス］「ガラハッド」はあなたがコントロールする剣武器を使って攻撃できる。",
  },

  // Gale's Mare  [ALLY]  L- WIND
  // EN: (効果テキストなし)
  "gales-mare": {
    name: "疾風の牝馬",
    effect: "",
  },

  // Gawain, Chivalrous Thief  [UNIQUE/ALLY]  L- NORM
  // EN: [Level 2+] True Sight /  / [Class Bonus] On Champion Hit: You may sacrifice Gawain. If you do, look at that opponent's memory and discard a card from it.
  "gawain-chivalrous-thief": {
    name: "ガウェイン、義賊",
    effect:
      "［レベル2以上］トゥルーサイト\n\n" +
      "［クラスボーナス］チャンピオンヒット時：あなたは「ガウェイン」をサクリファイスしてよい。そうしたなら、その対戦相手のメモリーを見て、その中からカードを1枚捨てさせる。",
  },

  // Ghosts of Pendragon  [ALLY]  L- CRUX
  // EN: On Enter: You may return a regalia you control to its owner's material deck. If you do, draw two cards.
  "ghosts-of-pendragon": {
    name: "ペンドラゴンの亡霊",
    effect:
      "登場時：あなたがコントロールするレガリアを1つオーナーのマテリアルデッキに戻してよい。そうしたなら、カードを2枚引く。",
  },

  // Gildas, Chronicler of Aesa  [UNIQUE/ALLY]  L- NORM
  // EN: (Unique â You can control only one object with this card's name.) /  / Balance â Gildas gets +3 POWER as long as the amount of cards in your hand and memory are equal. 
  "gildas-chronicler-of-aesa": {
    name: "ギルダス、アエサの記録者",
    effect:
      "*（ユニーク — この名前を持つオブジェクトは1つしかコントロールできない。）*\n\n" +
      "バランス — あなたの手札とメモリーのカード枚数が等しいかぎり、「ギルダス」は＋3パワーを得る。",
  },

  // Glacial Binding  [ACTION]  L- EXALTED,WATER
  // EN: You may banish a card with floating memory from your graveyard rather than pay this cardâs reserve cost. /  / Negate target card activation unless its controller pays (3). Banish the card that had its activation negated this way.
  "glacial-binding": {
    name: "氷河の束縛",
    effect:
      "このカードのリザーブコストを支払う代わりに、あなたの墓地からフローティングメモリーを持つカードを1枚追放してよい。\n\n" +
      "そのコントローラーが(3)を支払わないかぎり、対象のカードの起動を打ち消す。この方法で起動を打ち消したカードを追放する。",
  },

  // Glacier Remnants  [DOMAIN]  L- WATER
  // EN: At the beginning of your recollection phase, remove up to two durability counters from Glacier Remnants. Then recover X, where X is the amount of counters removed this way. /  / Floating Memory
  "glacier-remnants": {
    name: "氷河の残滓",
    effect:
      "あなたのリコレクションフェイズの開始時に、「氷河の残滓」から耐久カウンターを最大2個取り除く。その後、リカバーXする。Xはこの方法で取り除いたカウンターの数。\n\n" +
      "フローティングメモリー",
  },

  // Grand Crusader's Ring  [REGALIA/ITEM]  L- NORM
  // EN: Divine Relic (You can only have one card with this keyword in your material deck.) /  / Banish Grand Crusader's Ring: Draw a card.
  "grand-crusaders-ring": {
    name: "大聖戦士の指輪",
    effect:
      "ディヴァインレリック *（このキーワードを持つカードはマテリアルデッキに1枚しか入れられない。）*\n\n" +
      "「大聖戦士の指輪」を追放する：カードを1枚引く。",
  },

  // Guerrilla Advantage  [ACTION]  L- NORM
  // EN: [Class Bonus] As long as an opponent controls three or more units, this card costs 2 less to activate. /  / Put two preparation counters on your champion.
  "guerrilla-advantage": {
    name: "ゲリラの好機",
    effect:
      "［クラスボーナス］対戦相手が3体以上のユニットをコントロールしているかぎり、このカードは起動コストが2少なくなる。\n\n" +
      "あなたのチャンピオンにプレパレーションカウンターを2個置く。",
  },

  // Gunsmith's Arsenal  [ACTION]  L- NORM
  // EN: [Class Bonus] This card costs 2 less to activate. (Apply this effect only if your champion's class matches this card's class.) /  / Materialize a Bullet or Gun card from your material deck. (You still pay its costs.)
  "gunsmiths-arsenal": {
    name: "銃工の武器庫",
    effect:
      "［クラスボーナス］このカードは起動コストが2少なくなる。*（この効果は、あなたのチャンピオンのクラスがこのカードのクラスと一致する場合のみ適用する。）*\n\n" +
      "あなたのマテリアルデッキから弾丸または銃カードを1枚マテリアライズする。*（あなたはそのコストを支払う。）*",
  },

  // Halcyon Animus  [ACTION]  L- CRUX
  // EN: Materialize a regalia card from your material deck or banishment. (You still pay for its costs.)
  "halcyon-animus": {
    name: "穏やかなるアニムス",
    effect:
      "あなたのマテリアルデッキまたは追放領域からレガリアカードを1枚マテリアライズする。*（あなたはそのコストを支払う。）*",
  },

  // Hasty Messenger  [ALLY]  L- FIRE
  // EN: On Attack: You may discard a card. If you do, draw a card.
  "hasty-messenger": {
    name: "急ぎの使者",
    effect:
      "攻撃時：あなたはカードを1枚捨ててよい。そうしたなら、カードを1枚引く。",
  },

  // Haunting Apparition  [ALLY]  L- NORM
  // EN: As long as Haunting Apparition is ephemeral, it has stealth. /  / Ephemerate â (5) (You may activate this card from your graveyard by paying this cost. Ally cards played this way become ephemeral as they enter the field.) / 
  "haunting-apparition": {
    name: "つきまとう幻影",
    effect:
      "「つきまとう幻影」がエフェメラルであるかぎり、それはステルスを持つ。\n\n" +
      "エフェメレート — (5) *（あなたはこのコストを支払うことでこのカードを墓地から起動してよい。この方法でプレイしたアライカードは、戦場に出る際にエフェメラルになる。）*",
  },

  // Heirloom of Libra  [REGALIA/ITEM]  L- EXALTED,NORM
  // EN: Banish Heirloom of Libra: Choose oneâ  / â¢ Each champion you donât control gets -5 level until end of turn. / â¢ Until end of turn, your opponents canât glimpse. /  / (3), Banish Heirloom of Libra: Draw a card into your memory.
  "heirloom-of-libra": {
    name: "天秤の家宝",
    effect:
      "「天秤の家宝」を追放する：1つ選ぶ——\n" +
      "・あなたがコントロールしていない各チャンピオンは、ターン終了時まで－5レベルを得る。\n" +
      "・ターン終了時まで、対戦相手はグリンプスできない。\n\n" +
      "(3)、「天秤の家宝」を追放する：カードを1枚あなたのメモリーに引く。",
  },

  // Heirloom of Materia  [REGALIA/ITEM]  L- EXALTED,NORM
  // EN: Banish Heirloom of Materia: Choose oneâ / â¢ Remove all damage counters from target champion you donât control. Return those counters onto that champion at the beginning of your next turn. / â¢ For each opponent, for every two token objects they control, they sacrifice one. /  / (3), Banish Heirloom of Materia: Draw a card into your memory.
  "heirloom-of-materia": {
    name: "マテリアの家宝",
    effect:
      "「マテリアの家宝」を追放する：1つ選ぶ——\n" +
      "・あなたがコントロールしていない対象のチャンピオンからすべてのダメージカウンターを取り除く。あなたの次のターンの開始時に、それらのカウンターをそのチャンピオンに戻す。\n" +
      "・各対戦相手について、それがコントロールするトークンオブジェクト2つにつき、1つをサクリファイスさせる。\n\n" +
      "(3)、「マテリアの家宝」を追放する：カードを1枚あなたのメモリーに引く。",
  },

  // Heirloom of Natura  [REGALIA/ITEM]  L- EXALTED,NORM
  // EN: Banish Heirloom of Natura: Choose oneâ / â¢ Choose any amount of regalia cards in each opponent's banishment and put them into their ownerâs material deck. / â¢ Each opponent banishes two preserved cards from their material deck. /  / (3), Banish Heirloom of Natura: Draw a card into your memory.
  "heirloom-of-natura": {
    name: "ナチュラの家宝",
    effect:
      "「ナチュラの家宝」を追放する：1つ選ぶ——\n" +
      "・各対戦相手の追放領域にあるレガリアカードを好きな数選び、それらをオーナーのマテリアルデッキに置く。\n" +
      "・各対戦相手は自分のマテリアルデッキからプリザーブされたカードを2枚追放する。\n\n" +
      "(3)、「ナチュラの家宝」を追放する：カードを1枚あなたのメモリーに引く。",
  },

  // Heirloom of Spectra  [REGALIA/ITEM]  L- EXALTED,NORM
  // EN: Banish Heirloom of Spectra: Choose oneâ  / â¢ Until end of turn, cards in each opponentâs memory are norm element and lose all abilities. / â¢ Choose a Curse card in a championâs lineage and banish it. /  / (3), Banish Heirloom of Spectra: Draw a card into your memory.
  "heirloom-of-spectra": {
    name: "スペクトラの家宝",
    effect:
      "「スペクトラの家宝」を追放する：1つ選ぶ——\n" +
      "・ターン終了時まで、各対戦相手のメモリーのカードはノームエレメントになり、すべての能力を失う。\n" +
      "・チャンピオンのリネージュにある呪いカードを1枚選び、それを追放する。\n\n" +
      "(3)、「スペクトラの家宝」を追放する：カードを1枚あなたのメモリーに引く。",
  },

  // Hemorrhaged Intimidation  [ACTION]  L- EXIA
  // EN: Activate this card only during an opponent's recollection phase. /  / Draw a card into your memory.  /  / [Class Bonus] The next card your opponent activates this turn costs (1) more to activate for every eight damage counters on your champion.
  "hemorrhaged-intimidation": {
    name: "出血の威嚇",
    effect:
      "このカードは対戦相手のリコレクションフェイズ中にのみ起動する。\n\n" +
      "カードを1枚あなたのメモリーに引く。\n\n" +
      "［クラスボーナス］このターン、対戦相手が起動する次のカードは、あなたのチャンピオン上のダメージカウンター8個につき、起動コストが(1)多くなる。",
  },

  // Hexbound Blade  [ATTACK]  L- UMBRA
  // EN: As long as you have agility, Hexbound Blade gets +4POWER. /  / [Tristan Bonus] On Hit: Put Hexbound Blade on the bottom of target champion's lineage. /  / Inherited Effect  â If damage would be dealt to this unit by an umbra element source, that source deals that much damage plus 1 to this unit instead.
  "hexbound-blade": {
    name: "呪縛の刃",
    effect:
      "あなたがアジリティを持っているかぎり、「呪縛の刃」は＋4パワーを得る。\n\n" +
      "［トリスタンボーナス］ヒット時：「呪縛の刃」を対象のチャンピオンのリネージュの一番下に置く。\n\n" +
      "継承効果 — アンブラエレメントの発生源によってこのユニットにダメージが与えられる場合、代わりにその発生源はそのダメージに1点を加えたダメージをこのユニットに与える。",
  },

  // Hidden Secrets  [ACTION]  L- NORM
  // EN: Choose one. If you control one or more domains, choose up to two insteadâ / â¢ Up to one target ally gains stealth until end of turn. / â¢ Draw a card into your memory.
  "hidden-secrets": {
    name: "隠された秘密",
    effect:
      "1つ選ぶ。あなたが1つ以上のドメインをコントロールしている場合、代わりに最大2つ選ぶ——\n" +
      "・最大1体の対象のアライは、ターン終了時までステルスを得る。\n" +
      "・カードを1枚あなたのメモリーに引く。",
  },

  // Hoarfrost Hold  [PHANTASIA]  L- WATER
  // EN: [Class Bonus] On Enter:  Banish any amount of Suited Spell cards from your hand and/or memory. For each card banished this way, put a frost counter on Hoarfrost Hold. /  / Each opponent recollects X less cards during the resolution of their recollection phase, where X is the amount of frost counters on Hoarfrost Hold. (They choose which cards to recollect.)
  "hoarfrost-hold": {
    name: "白霜の砦",
    effect:
      "［クラスボーナス］登場時：あなたの手札および／またはメモリーからスートスペルカードを好きな数追放する。この方法で追放した各カードにつき、「白霜の砦」に霜カウンターを1個置く。\n\n" +
      "各対戦相手は、自分のリコレクションフェイズの解決中にリコレクトするカードがX枚少なくなる。Xは「白霜の砦」上の霜カウンターの数。*（どのカードをリコレクトするかはそのプレイヤーが選ぶ。）*",
  },

  // Hurricane Sweep  [ATTACK]  L- WIND
  // EN: [Class Bonus] Efficiency (This card costs LV less to activate. LV refers to your champion's level. Apply this effect only if your champion's class matches this card's class.) /  / Cleave (Attack all units a chosen opponent controls. This attack can't be intercepted.)
  "hurricane-sweep": {
    name: "ハリケーンの一掃",
    effect:
      "［クラスボーナス］エフィシェンシー *（このカードは起動コストがLV少なくなる。LVはあなたのチャンピオンのレベルを指す。この効果は、あなたのチャンピオンのクラスがこのカードのクラスと一致する場合のみ適用する。）*\n\n" +
      "クリーブ *（選んだ対戦相手がコントロールするすべてのユニットを攻撃する。この攻撃はインターセプトされない。）*",
  },

  // Hymn of Gaia's Grace  [ACTION]  L- TERA
  // EN: Glimpse 3. Draw a card. /  / You may put an Animal or Beast ally card with reserve cost LV or less from your hand onto the field. If you do, you may change the target of an attack that targets your champion to that ally.
  "hymn-of-gaias-grace": {
    name: "ガイアの恩寵の讃歌",
    effect:
      "グリンプス3する。カードを1枚引く。\n\n" +
      "あなたは手札からリザーブコストLV以下の動物または獣のアライカードを1枚戦場に出してよい。そうしたなら、あなたのチャンピオンを対象とする攻撃の対象をそのアライに変更してよい。",
  },

  // Ignite Fate  [ACTION]  L- FIRE
  // EN: Deal 2 damage to each champion.  /  / Floating Memory (While paying for a memory cost, you may banish this card from your graveyard to pay for 1 of that cost.)
  "ignite-fate": {
    name: "運命の点火",
    effect:
      "各チャンピオンに2点のダメージを与える。\n\n" +
      "フローティングメモリー *（メモリーコストを支払う際、あなたはこのカードを墓地から追放してそのコストの1分を支払ってよい。）*",
  },

  // Ignited Stab  [ATTACK]  L- FIRE
  // EN: Prepare 1 (You may remove a preparation counter from your champion as you activate this card.) /  / [Class Bonus] On Attack: If Ignited Stab was prepared, it gets +2 POWER. (Apply this effect only if your champion's class matches this card's class.)
  "ignited-stab": {
    name: "燃え上がる刺突",
    effect:
      "プレパレーション1 *（あなたはこのカードを起動する際、あなたのチャンピオンからプレパレーションカウンターを1個取り除いてよい。）*\n\n" +
      "［クラスボーナス］攻撃時：「燃え上がる刺突」がプレパレーションされていた場合、それは＋2パワーを得る。*（この効果は、あなたのチャンピオンのクラスがこのカードのクラスと一致する場合のみ適用する。）*",
  },

  // Illuminate Secrets  [ACTION]  L- LUXEM
  // EN: Deal an amount of damage to target unit equal to its owner's influence minus your influence. (A player's influence is equal to the total amount of cards in their hand and memory.)
  "illuminate-secrets": {
    name: "秘密の照らし出し",
    effect:
      "対象のユニットに、そのオーナーのインフルエンスからあなたのインフルエンスを引いた値に等しい量のダメージを与える。*（プレイヤーのインフルエンスは、その手札とメモリーのカードの合計枚数に等しい。）*",
  },

  // Imperial Countermeasure  [ACTION]  L- EXALTED,NORM
  // EN: (Exalted â This element is enabled for you as long as you have another advanced element enabled.) /  / Prevent the next 4 damage that would be dealt to target unit this turn. Draw a card into your memory.
  "imperial-countermeasure": {
    name: "帝国の対抗策",
    effect:
      "*（エグザルテッド — このエレメントは、あなたが他のアドバンスドエレメントを有効にしているかぎり、あなたにとって有効となる。）*\n\n" +
      "このターン、対象のユニットに与えられる次の4点のダメージを軽減する。カードを1枚あなたのメモリーに引く。",
  },

  // Incarnate Majesty  [ACTION]  L- CRUX
  // EN: [Class Bonus] Efficiency /  / This card costs 1 less to activate for each regalia weapon card in your banishment. /  / Put a card named The Majestic Spirit from your material deck or banishment onto the field.
  "incarnate-majesty": {
    name: "顕現する威光",
    effect:
      "［クラスボーナス］エフィシェンシー\n\n" +
      "このカードは、あなたの追放領域にあるレガリア武器カード1枚につき、起動コストが1少なくなる。\n\n" +
      "あなたのマテリアルデッキまたは追放領域から「荘厳なる精霊」という名前のカードを1枚戦場に出す。",
  },

  // Inferno Slime  [ALLY]  L- FIRE
  // EN: Pride 2 (This ally wonât obey you unless your champion is level 2 or higher. You canât attack with, intercept with, or activate abilities of allies that donât obey you.) /  / [Class Bonus] On Death: You may banish two fire element cards from your graveyard. If you do, deal 4 damage to each champion.
  "inferno-slime": {
    name: "業火のスライム",
    effect:
      "プライド2 *（このアライは、あなたのチャンピオンがレベル2以上でないかぎり、あなたに従わない。あなたに従わないアライで攻撃したり、インターセプトしたり、その能力を起動したりできない。）*\n\n" +
      "［クラスボーナス］死亡時：あなたの墓地から火エレメントのカードを2枚追放してよい。そうしたなら、各チャンピオンに4点のダメージを与える。",
  },

  // Innervate Agility  [ACTION]  L- WIND
  // EN: As an additional cost to activate this card, delevel your champion and recover 5. (To delevel your champion, return the top card of its lineage to its owner's material deck.) /  / Units you control gain your choice of stealth or spellshroud until end of turn.
  "innervate-agility": {
    name: "活力の敏捷",
    effect:
      "このカードを起動するための追加コストとして、あなたのチャンピオンをデレベルし、リカバー5する。*（チャンピオンをデレベルするには、そのリネージュの一番上のカードをオーナーのマテリアルデッキに戻す。）*\n\n" +
      "あなたがコントロールするユニットは、ターン終了時までステルスまたはスペルシュラウドのうちあなたが選んだものを得る。",
  },

  // Innervate Fury  [ACTION]  L- FIRE
  // EN: As an additional cost to activate this card, delevel your champion and recover 5. (To delevel your champion, return the top card of its lineage to its owner's material deck.) /  / Deal 7 damage split among any amount of target allies.
  "innervate-fury": {
    name: "活力の憤怒",
    effect:
      "このカードを起動するための追加コストとして、あなたのチャンピオンをデレベルし、リカバー5する。*（チャンピオンをデレベルするには、そのリネージュの一番上のカードをオーナーのマテリアルデッキに戻す。）*\n\n" +
      "好きな数の対象のアライに7点のダメージを分割して与える。",
  },

  // Innervate Knowledge  [ACTION]  L- WATER
  // EN: As an additional cost to activate this card, delevel your champion and recover 5. (To delevel your champion, return the top card of its lineage to its owner's material deck.) /  / Draw two cards.
  "innervate-knowledge": {
    name: "活力の知識",
    effect:
      "このカードを起動するための追加コストとして、あなたのチャンピオンをデレベルし、リカバー5する。*（チャンピオンをデレベルするには、そのリネージュの一番上のカードをオーナーのマテリアルデッキに戻す。）*\n\n" +
      "カードを2枚引く。",
  },

  // Inspiring Aethercharge  [ACTION]  L- WIND
  // EN: Allies you control get +1POWER until end of turn. /  / You may load Inspiring Aethercharge into an Aetherwing weapon you control.
  "inspiring-aethercharge": {
    name: "鼓舞のエーテルチャージ",
    effect:
      "ターン終了時まで、あなたがコントロールするアライは＋1パワーを得る。\n\n" +
      "あなたは「鼓舞のエーテルチャージ」を、あなたがコントロールするエーテルウィング武器にロードしてよい。",
  },

  // Ionized Asceticism  [ACTION]  L- ARCANE
  // EN: [Rai Bonus] Efficiency  /  / Banish all cards from your hand and memory, then draw seven cards. Until the beginning of your next turn, your champion gets -10 level.
  "ionized-asceticism": {
    name: "電離の苦行",
    effect:
      "［ライボーナス］エフィシェンシー\n\n" +
      "あなたの手札とメモリーからすべてのカードを追放し、その後カードを7枚引く。あなたの次のターンの開始時まで、あなたのチャンピオンは－10レベルを得る。",
  },

  // Iridescent Resurgence  [ACTION]  L- CRUX
  // EN: Return target non-champion non-regalia crux element card from your banishment or graveyard to your memory. 
  "iridescent-resurgence": {
    name: "虹色の再興",
    effect:
      "あなたの追放領域または墓地から、対象のチャンピオンでもレガリアでもないクラックスエレメントのカードを1枚あなたのメモリーに戻す。",
  },

  // Iron Halo, Forcefield Node  [UNIQUE/DOMAIN]  L- NEOS
  // EN: If damage would be dealt to another object you control, prevent 2 of that damage. /  / At the beginning of your end phase, put a durability counter on Iron Halo for each of up to two tokens you control.
  "iron-halo-forcefield-node": {
    name: "アイアンヘイロー、力場ノード",
    effect:
      "あなたがコントロールする他のオブジェクトにダメージが与えられる場合、そのダメージのうち2点を軽減する。\n\n" +
      "あなたのエンドフェイズの開始時に、あなたがコントロールする最大2体のトークンにつき、「アイアンヘイロー」に耐久カウンターを1個置く。",
  },

  // Kraal, Stonescale Tyrant  [UNIQUE/ALLY]  L- TERA
  // EN: As an additional cost to activate this card, banish two preserved cards from your material deck. /  / Intercept, Spellshroud, True Sight, Vigor /  / [Class Bonus] On Attack: Reveal the top two cards of your deck and put them into your material deck preserved. 
  "kraal-stonescale-tyrant": {
    name: "クラール、石鱗の暴君",
    effect:
      "このカードを起動するための追加コストとして、あなたのマテリアルデッキからプリザーブされたカードを2枚追放する。\n\n" +
      "インターセプト、スペルシュラウド、トゥルーサイト、ヴィガー\n\n" +
      "［クラスボーナス］攻撃時：あなたのデッキの一番上から2枚を公開し、プリザーブしてあなたのマテリアルデッキに置く。",
  },

  // Krustallan Archer  [ALLY]  L- WATER
  // EN: [Class Bonus] Ranged 3 (As long as this unit is distant, its attacks get +3 POWER.) /  / On Attack: You may banish a card with floating memory from your graveyard. If you do, draw a card and Krustallan Archer becomes distant.
  "krustallan-archer": {
    name: "クリスタランの射手",
    effect:
      "［クラスボーナス］レンジド3 *（このユニットがディスタントであるかぎり、その攻撃は＋3パワーを得る。）*\n\n" +
      "攻撃時：あなたの墓地からフローティングメモリーを持つカードを1枚追放してよい。そうしたなら、カードを1枚引き、「クリスタランの射手」はディスタントになる。",
  },

  // Lancelot, Goliath of Aesa  [UNIQUE/ALLY]  L- NORM
  // EN: Hindered (This ally enters the field rested.)  /  / [Class Bonus] [Level 2+] Lancelot gets +2 LIFE. /  / On Attack: You may pay (3). If you do, Lancelot gets +3 POWER until end of turn.
  "lancelot-goliath-of-aesa": {
    name: "ランスロット、アエサの巨人",
    effect:
      "ヒンダード *（このアライはレストして戦場に出る。）*\n\n" +
      "［クラスボーナス］［レベル2以上］「ランスロット」は＋2ライフを得る。\n\n" +
      "攻撃時：あなたは(3)を支払ってよい。そうしたなら、ターン終了時まで「ランスロット」は＋3パワーを得る。",
  },

  // Lavastorm  [ACTION]  L- EXALTED,FIRE
  // EN: (Exalted â This element is enabled for you as long as you have another advanced element enabled.) /  / Destroy all allies.
  "lavastorm": {
    name: "溶岩の嵐",
    effect:
      "*（エグザルテッド — このエレメントは、あなたが他のアドバンスドエレメントを有効にしているかぎり、あなたにとって有効となる。）*\n\n" +
      "すべてのアライを破壊する。",
  },

  // Legendary Saddle  [REGALIA/ITEM]  L- NORM
  // EN: On Enter: For the rest of the game, ignore the elemental requirements of non-advanced element Horse cards you activate. /  / Banish Legendary Saddle:  Draw a card into your memory. Activate this ability only if you control three or more Horse allies.
  "legendary-saddle": {
    name: "伝説の鞍",
    effect:
      "登場時：このゲームの残りの間、あなたが起動する非アドバンスドエレメントの馬カードのエレメント条件を無視する。\n\n" +
      "「伝説の鞍」を追放する：カードを1枚あなたのメモリーに引く。この能力は、あなたが3体以上の馬アライをコントロールしている場合のみ起動する。",
  },

  // Lightveil Agent  [ALLY]  L- LUXEM
  // EN: [Class Bonus] Stealth (This unit can't be targeted by attacks unless permitted by true sight.) /  / Whenever you recover, put a buff counter on Lightveil Agent.
  "lightveil-agent": {
    name: "光帷の工作員",
    effect:
      "［クラスボーナス］ステルス *（このユニットは、トゥルーサイトによって許可されないかぎり、攻撃の対象にできない。）*\n\n" +
      "あなたがリカバーするたび、「光帷の工作員」にバフカウンターを1個置く。",
  },

  // Liquidation  [ACTION]  L- WATER
  // EN: Deluge 10 â If there are ten or more water element cards in your graveyard, deal 7 damage to target unit.
  "liquidation": {
    name: "清算",
    effect:
      "デリュージ10 — あなたの墓地に水エレメントのカードが10枚以上ある場合、対象のユニットに7点のダメージを与える。",
  },

  // Liturgy of Corruption  [ACTION]  L- NORM
  // EN: Put a buff counter on target ally. If that ally is fostered, put two additional buff counters on it and deal 6 unpreventable damage to your champion.
  "liturgy-of-corruption": {
    name: "堕落の典礼",
    effect:
      "対象のアライにバフカウンターを1個置く。そのアライがフォスターされている場合、それに追加でバフカウンターを2個置き、あなたのチャンピオンに6点の軽減不能のダメージを与える。",
  },

  // Lotor Trinket  [REGALIA/ITEM]  L- NORM
  // EN: [Class Bonus] As long as an opponent has no cards in their graveyard, Raccoon allies you control get +1POWER. /  / On Enter: Scavenge 6 for a Raccoon ally card. /  / 
  "lotor-trinket": {
    name: "ロトルの装飾品",
    effect:
      "［クラスボーナス］対戦相手の墓地にカードが1枚もないかぎり、あなたがコントロールするアライグマアライは＋1パワーを得る。\n\n" +
      "登場時：スカベンジ6（アライグマアライ）。",
  },

  // Luminous Surge  [ACTION]  L- LUXEM
  // EN: Target unit's next attack this turn gets +3POWER. Recover 3. /  / [Class Bonus] [Element Bonus] Whenever you reveal this card from your memory, target unit's next attack this turn gets +1POWER.
  "luminous-surge": {
    name: "光輝の奔流",
    effect:
      "このターン、対象のユニットの次の攻撃は＋3パワーを得る。リカバー3する。\n\n" +
      "［クラスボーナス］［エレメントボーナス］あなたが自分のメモリーからこのカードを公開するたび、このターン、対象のユニットの次の攻撃は＋1パワーを得る。",
  },

  // Lunete, Frostbinder Priest  [UNIQUE/ALLY]  L- WATER
  // EN: Allies your opponents control enter the field rested. /  / Balance â Lunete gets +3 LIFE as long as the amount of cards in your hand and memory are equal.
  "lunete-frostbinder-priest": {
    name: "ルネット、霜縛りの司祭",
    effect:
      "対戦相手がコントロールするアライはレストして戦場に出る。\n\n" +
      "バランス — あなたの手札とメモリーのカード枚数が等しいかぎり、「ルネット」は＋3ライフを得る。",
  },

  // Luxem Sight  [ACTION]  L- LUXEM
  // EN: [Element Bonus] Whenever you reveal this card from your memory, recover 3. (To recover, remove that many damage counters from your champion. Apply this effect only if your champion's element matches this card's element.) /  / Draw a card.
  "luxem-sight": {
    name: "ルクセムの視",
    effect:
      "［エレメントボーナス］あなたが自分のメモリーからこのカードを公開するたび、リカバー3する。*（リカバーするには、あなたのチャンピオンからその数のダメージカウンターを取り除く。この効果は、あなたのチャンピオンのエレメントがこのカードのエレメントと一致する場合のみ適用する。）*\n\n" +
      "カードを1枚引く。",
  },

  // Maiden of Waning Bloom  [PHANTASIA/ALLY]  L- TERA
  // EN: [Diao Chan Bonus] On Enter: Up to one target opponent summons two Flowerbud tokens. (Apply this effect only if your champion is Diao Chan.) /  / [Diao Chan Bonus] On Attack: The defending player sacrifices a Flowerbud. If they do, they summon your choice of an Acerbica, Floodbloom, Nightshade, or Washuru token.
  "maiden-of-waning-bloom": {
    name: "萎れゆく花の乙女",
    effect:
      "［ダオ・チャンボーナス］登場時：最大1体の対象の対戦相手は花のつぼみトークンを2つ召喚する。*（この効果は、あなたのチャンピオンがダオ・チャンの場合のみ適用する。）*\n\n" +
      "［ダオ・チャンボーナス］攻撃時：防御プレイヤーは花のつぼみを1つサクリファイスする。そうしたなら、アセルビカ、フラッドブルーム、ナイトシェード、ワシュルのトークンのうちあなたが選んだものを1つ召喚する。",
  },

  // Manaroot  [TOKEN/ITEM]  L- NORM
  // EN: Sacrifice Manaroot: Your champion gets +1 level until end of turn.
  "manaroot": {
    name: "マナルート",
    effect: "「マナルート」をサクリファイスする：ターン終了時まで、あなたのチャンピオンは＋1レベルを得る。",
  },

  // Manifest Threat  [ACTION]  L- NORM
  // EN: If target ally has a debuff counter on it, destroy that ally. Otherwise, put a debuff counter on it. /  / Floating Memory
  "manifest-threat": {
    name: "顕在する脅威",
    effect:
      "対象のアライにデバフカウンターが乗っている場合、そのアライを破壊する。そうでない場合、それにデバフカウンターを1個置く。\n\n" +
      "フローティングメモリー",
  },

  // Meiren of Verdancy  [ALLY]  L- TERA
  // EN: [Kongming Bonus] Whenever your Shifting Currents change from facing East to South, recover 4. /  / [Class Bonus] Floating Memory
  "meiren-of-verdancy": {
    name: "翠緑の美人",
    effect:
      "［コンミンボーナス］あなたの「移ろう潮流」が東から南を向くように変わるたび、リカバー4する。\n\n" +
      "［クラスボーナス］フローティングメモリー",
  },

  // Memorite Obelith  [TOKEN/ALLY]  L- NORM
  // EN: Memorite Obelith gets +1 POWER and +1 LIFE for each of up to five sheen counters on it. /  / On Leave: Put X sheen counters onto your Fractured Memories, where X is the amount of sheen counters that were on Memorite Obelith.
  "memorite-obelith": {
    name: "メモライト・オベリス",
    effect:
      "「メモライト・オベリス」は、それの上の最大5個のシーンカウンターにつき、＋1パワーと＋1ライフを得る。\n\n" +
      "退場時：あなたの「砕けた記憶」にシーンカウンターをX個置く。Xは「メモライト・オベリス」の上にあったシーンカウンターの数。",
  },

  // Merlin, Kingslayer  [CHAMPION]  L3 CRUX
  // EN: Merlin Lineage /  / At the beginning of your recollection phase, put a level counter on Merlin. Then, if there's an even amount of level counters on Merlin, draw a card and Merlin's attacks get +2 POWER until end of turn.
  "merlin-kingslayer": {
    name: "マーリン、王殺し",
    effect:
      "マーリンのリネージュ\n\n" +
      "あなたのリコレクションフェイズの開始時に、「マーリン」にレベルカウンターを1個置く。その後、「マーリン」の上のレベルカウンターが偶数個の場合、カードを1枚引き、ターン終了時まで「マーリン」の攻撃は＋2パワーを得る。",
  },

  // Message in Shadows  [PHANTASIA]  L- WIND
  // EN: Ally Link /  / On Enter: Glimpse 2. /  / As long as linked ally has stealth, it gets +2POWER.
  "message-in-shadows": {
    name: "影の中の伝言",
    effect:
      "アライリンク\n\n" +
      "登場時：グリンプス2する。\n\n" +
      "リンクされたアライがステルスを持っているかぎり、それは＋2パワーを得る。",
  },

  // Meteoric Slime  [ALLY]  L- ASTRA
  // EN: Pride 3 /  / [Class Bonus] At the beginning of your end phase, glimpse 2. Then reveal the top two cards of your deck. When you do, as a Spell, deal X damage to target unit where X is the lowest reserve cost among the revealed cards.
  "meteoric-slime": {
    name: "隕石のスライム",
    effect:
      "プライド3\n\n" +
      "［クラスボーナス］あなたのエンドフェイズの開始時に、グリンプス2する。その後、あなたのデッキの一番上から2枚を公開する。そうしたとき、スペルとして、対象のユニットにX点のダメージを与える。Xは公開したカードのうち最も低いリザーブコスト。",
  },

  // Miasmic Fog  [PHANTASIA]  L- UMBRA
  // EN: All allies get -1LIFE.
  "miasmic-fog": {
    name: "瘴気の霧",
    effect: "すべてのアライは－1ライフを得る。",
  },

  // Mnemonic Charm  [ITEM]  L- NORM
  // EN: On Enter: Draw a card into your memory. /  / [Class Bonus] Sacrifice Mnemonic Charm: Empower 2. (The next Spell card you activate this turn activates and resolves as if your champion got +2 level. Activate this ability only if your champion's class matches this card's class.)
  "mnemonic-charm": {
    name: "記憶の護符",
    effect:
      "登場時：カードを1枚あなたのメモリーに引く。\n\n" +
      "［クラスボーナス］「記憶の護符」をサクリファイスする：エンパワー2する。*（このターン、あなたが起動する次のスペルカードは、あなたのチャンピオンが＋2レベルを得たかのように起動し解決する。この能力は、あなたのチャンピオンのクラスがこのカードのクラスと一致する場合のみ起動する。）*",
  },

  // Mob Vantage  [ACTION]  L- NORM
  // EN: [Class Bonus] As long as an opponent controls three or more units, this card costs 2 less to activate. /  / Your champion becomes distant. Draw a card into your memory.
  "mob-vantage": {
    name: "群衆の優位",
    effect:
      "［クラスボーナス］対戦相手が3体以上のユニットをコントロールしているかぎり、このカードは起動コストが2少なくなる。\n\n" +
      "あなたのチャンピオンはディスタントになる。カードを1枚あなたのメモリーに引く。",
  },

  // Morgan, Soul Guide  [UNIQUE/ALLY]  L- NORM
  // EN: [Level 1+] Prevent all non-combat damage that would be dealt to Morgan. /  / [Level 2+] Your opponents can't  recover. /  / [Class Bonus] At the beginning of your recollection phase, you may glimpse 1. If you don't, recover 1.
  "morgan-soul-guide": {
    name: "モルガン、魂の導き手",
    effect:
      "［レベル1以上］「モルガン」に与えられる非戦闘ダメージをすべて軽減する。\n\n" +
      "［レベル2以上］対戦相手はリカバーできない。\n\n" +
      "［クラスボーナス］あなたのリコレクションフェイズの開始時に、あなたはグリンプス1してよい。しなかった場合、リカバー1する。",
  },

  // Mystic Purifier  [ALLY]  L- NORM
  // EN: On Enter: You may pay (2). When you do, destroy target phantasia.
  "mystic-purifier": {
    name: "神秘の浄化者",
    effect:
      "登場時：あなたは(2)を支払ってよい。そうしたとき、対象のファンタジアを破壊する。",
  },

  // Nascent Barrier  [ACTION]  L- NORM
  // EN: [Class Bonus] Prevent the next 1+LV damage that would be dealt to your champion this turn. /  / [Level 3+] Glimpse 3. (To glimpse, look at that many cards from the top of your deck. Put those cards back on the top or on the bottom of your deck in any order.)
  "nascent-barrier": {
    name: "萌芽の障壁",
    effect:
      "［クラスボーナス］このターン、あなたのチャンピオンに与えられる次の1＋LV点のダメージを軽減する。\n\n" +
      "［レベル3以上］グリンプス3する。*（グリンプスするには、デッキの一番上からその枚数のカードを見る。それらのカードを好きな順番でデッキの一番上または一番下に戻す。）*",
  },

  // Navigate the Streets  [ACTION]  L- NORM
  // EN: Glimpse 1+X, where X is the amount of domains you control. (To glimpse, look at that many cards from the top of your deck. Put those cards back on the top or on the bottom of your deck in any order.) /  / Floating Memory
  "navigate-the-streets": {
    name: "街路の踏破",
    effect:
      "グリンプス1＋Xする。Xはあなたがコントロールするドメインの数。*（グリンプスするには、デッキの一番上からその枚数のカードを見る。それらのカードを好きな順番でデッキの一番上または一番下に戻す。）*\n\n" +
      "フローティングメモリー",
  },

  // Neos Sight  [ACTION]  L- NEOS
  // EN: Draw a card. If you control eight or more objects, draw a card into your memory.
  "neos-sight": {
    name: "ネオスの視",
    effect:
      "カードを1枚引く。あなたが8つ以上のオブジェクトをコントロールしている場合、カードを1枚あなたのメモリーに引く。",
  },

  // Nia, Mistveiled Scout  [UNIQUE/ALLY]  L- WATER
  // EN: [Class Bonus] Stealth (This unit can't be targeted by attacks unless permitted by true sight.) /  / On Enter: Look at target opponent's memory, then choose any card name.  /  / Cards with the chosen name cost 1 more to play.
  "nia-mistveiled-scout": {
    name: "ニア、霧隠れの斥候",
    effect:
      "［クラスボーナス］ステルス *（このユニットは、トゥルーサイトによって許可されないかぎり、攻撃の対象にできない。）*\n\n" +
      "登場時：対象の対戦相手のメモリーを見て、その後任意のカード名を1つ選ぶ。\n\n" +
      "選ばれた名前を持つカードはプレイコストが1多くなる。",
  },

  // Nimble Court Assassin  [ALLY]  L- EXALTED,NORM
  // EN: Ambush, Vigor /  / On Enter: You gain agility 3 for this turn. (Agility 3 â Return three cards from your memory to your hand at the beginning of the end phase.)
  "nimble-court-assassin": {
    name: "俊敏な宮廷暗殺者",
    effect:
      "アンブッシュ、ヴィガー\n\n" +
      "登場時：このターン、あなたはアジリティ3を得る。*（アジリティ3 — エンドフェイズの開始時に、あなたのメモリーから3枚を手札に戻す。）*",
  },

  // Nimble Longbowman  [ALLY]  L- NORM
  // EN: Fast Activation, Ranged 1 /  / [Class Bonus] Nimble Longbowman enters the field distant. /  / On Enter: Your champion becomes distant. (Units stay distant until the end of their controller's turn.)
  "nimble-longbowman": {
    name: "俊敏な長弓兵",
    effect:
      "ファスト起動、レンジド1\n\n" +
      "［クラスボーナス］「俊敏な長弓兵」はディスタントの状態で戦場に出る。\n\n" +
      "登場時：あなたのチャンピオンはディスタントになる。*（ユニットはコントローラーのターン終了までディスタントのままである。）*",
  },

  // Nimue, Cursed Touch  [UNIQUE/ALLY]  L- NORM
  // EN: [Class Bonus] Whenever you activate an action card that targets an ally, destroy that ally. 
  "nimue-cursed-touch": {
    name: "ニムエ、呪いの手",
    effect:
      "［クラスボーナス］あなたがアライを対象とするアクションカードを起動するたび、そのアライを破壊する。",
  },

  // Nipping Kicker  [ACTION]  L- WATER
  // EN: The next time target unit would take damage from a Suited Spell source you control this turn, it takes that much damage plus 3 instead. /  / Floating Memory
  "nipping-kicker": {
    name: "刺すような蹴撃",
    effect:
      "このターン、あなたがコントロールするスートスペルの発生源から対象のユニットが次にダメージを受ける際、代わりにそれはそのダメージに3点を加えたダメージを受ける。\n\n" +
      "フローティングメモリー",
  },

  // Novice Healer  [ALLY]  L- NORM
  // EN: [Class Bonus] On Enter: Recover 3. (To recover, remove that many damage counters from your champion. Apply this effect only if your championâs class matches this cardâs class.)
  "novice-healer": {
    name: "見習いの治癒者",
    effect:
      "［クラスボーナス］登場時：リカバー3する。*（リカバーするには、あなたのチャンピオンからその数のダメージカウンターを取り除く。この効果は、あなたのチャンピオンのクラスがこのカードのクラスと一致する場合のみ適用する。）*",
  },

  // Numinous Monk  [ALLY]  L- CRUX
  // EN: Regalia you control have "REST: As a Spell, deal 1 damage to target unit."
  "numinous-monk": {
    name: "霊妙なる修道士",
    effect:
      "あなたがコントロールするレガリアは「レスト：スペルとして、対象のユニットに1点のダメージを与える。」を持つ。",
  },

  // Nuriel, Seraphic Paladin  [UNIQUE/ALLY]  L- NORM
  // EN: Advanced Imbue 3 /  / On Enter:  If Nuriel is imbued, put a bulwark and a buff counter on it.  /  / Whenever your champion levels up, if Nuriel is imbued, put a bulwark counter on Nuriel.
  "nuriel-seraphic-paladin": {
    name: "ヌリエル、熾天のパラディン",
    effect:
      "アドバンスド・インビュー3\n\n" +
      "登場時：「ヌリエル」がインビュー状態の場合、それにバルワークカウンターとバフカウンターを1個ずつ置く。\n\n" +
      "あなたのチャンピオンがレベルアップするたび、「ヌリエル」がインビュー状態の場合、「ヌリエル」にバルワークカウンターを1個置く。",
  },

  // Ominous Shadow  [TOKEN/PHANTASIA/ALLY]  L- UMBRA
  // EN: Unblockable (This unitâs attacks canât be intercepted and ignores taunt.) /  / If damage would be dealt to Ominous Shadow, prevent 3 of that damage. /  / Ominous Shadow may only declare attacks against units your champion has dealt combat damage to this turn.
  "ominous-shadow": {
    name: "不吉な影",
    effect:
      "アンブロッカブル *（このユニットの攻撃はインターセプトされず、タウントを無視する。）*\n\n" +
      "「不吉な影」にダメージが与えられる場合、そのダメージのうち3点を軽減する。\n\n" +
      "「不吉な影」は、このターンにあなたのチャンピオンが戦闘ダメージを与えたユニットに対してのみ攻撃を宣言できる。",
  },

  // Optical Control  [PHANTASIA]  L- LUXEM
  // EN: As Optical Control enters the field, choose a card type.  /  / Cards of the chosen type your opponents activate cost (4) more to activate. /  / At the beginning of your recollection phase, sacrifice Optical Control and draw a card.
  "optical-control": {
    name: "視覚の制御",
    effect:
      "「視覚の制御」が戦場に出る際、カードタイプを1つ選ぶ。\n\n" +
      "対戦相手が起動する、選ばれたタイプのカードは起動コストが(4)多くなる。\n\n" +
      "あなたのリコレクションフェイズの開始時に、「視覚の制御」をサクリファイスし、カードを1枚引く。",
  },

  // Ordained Charisma  [ACTION]  L- FIRE
  // EN: Gain control of target ally with 2POWER or less until end of turn. Wake up that ally.
  "ordained-charisma": {
    name: "定められたカリスマ",
    effect:
      "ターン終了時まで、2パワー以下の対象のアライのコントロールを得る。そのアライをアウェイクにする。",
  },

  // Otherworldly Possessions  [ACTION]  L- NORM
  // EN: For each different reserve cost among objects you control and cards in your graveyard, put an enlighten counter on your champion.
  "otherworldly-possessions": {
    name: "異界の憑依",
    effect:
      "あなたがコントロールするオブジェクトおよびあなたの墓地のカードの中の異なるリザーブコスト1つにつき、あなたのチャンピオンに覚醒カウンターを1個置く。",
  },

  // Parcenet, Royal Maid  [UNIQUE/ALLY]  L- WIND
  // EN: [Level 2+] Stealth (This unit can't be targeted by attacks unless permitted by true sight.) /  / REST: Glimpse 1. Reveal the top card of your deck. When you reveal a wind element card this way, another target ally you control gains stealth until end of turn.
  "parcenet-royal-maid": {
    name: "パーセネット、王室のメイド",
    effect:
      "［レベル2以上］ステルス *（このユニットは、トゥルーサイトによって許可されないかぎり、攻撃の対象にできない。）*\n\n" +
      "レスト：グリンプス1する。あなたのデッキの一番上のカードを公開する。この方法で風エレメントのカードを公開したとき、あなたがコントロールする別の対象のアライは、ターン終了時までステルスを得る。",
  },

  // Pawn Piece  [TOKEN/ALLY]  L- NORM
  // EN: [Alice Bonus] Commanded Will 1 (As long as this unit is attacking using a Command card, it gets +1POWER.) /  / [Alice Bonus] On Hit: If 7 or more damage was dealt, you may sacrifice Pawn Piece. If you do, summon a Queen Piece token.
  "pawn-piece": {
    name: "ポーンの駒",
    effect:
      "［アリスボーナス］コマンドウィル1 *（このユニットがコマンドカードを使って攻撃しているかぎり、それは＋1パワーを得る。）*\n\n" +
      "［アリスボーナス］ヒット時：7点以上のダメージが与えられた場合、あなたは「ポーンの駒」をサクリファイスしてよい。そうしたなら、クイーンの駒トークンを1つ召喚する。",
  },

  // Pearled Prayer  [ACTION]  L- EXALTED,WATER
  // EN: Draw a card into your memory. If you activated this card during your main phase, recover 7. Otherwise, recover 4.
  "pearled-prayer": {
    name: "真珠の祈り",
    effect:
      "カードを1枚あなたのメモリーに引く。あなたがこのカードを自分のメインフェイズ中に起動した場合、リカバー7する。そうでない場合、リカバー4する。",
  },

  // Pendant of Accrual  [ITEM]  L- NORM
  // EN: At the beginning of each opponent's recollection phase, they may pay (2). If they don't, put a debt counter on Pendant of Accrual. /  / REST, Remove two debt counters from Pendant of Accrual: Draw a card into your memory.
  "pendant-of-accrual": {
    name: "累積のペンダント",
    effect:
      "各対戦相手のリコレクションフェイズの開始時に、その対戦相手は(2)を支払ってよい。支払わなかった場合、「累積のペンダント」に負債カウンターを1個置く。\n\n" +
      "レスト、「累積のペンダント」から負債カウンターを2個取り除く：カードを1枚あなたのメモリーに引く。",
  },

  // Pendant of Apsis Restraint  [REGALIA/ITEM]  L- NORM
  // EN: Ultimate cards cost (3) more to activate.
  "pendant-of-apsis-restraint": {
    name: "アプシス抑制のペンダント",
    effect: "アルティメットカードは起動コストが(3)多くなる。",
  },

  // Perishing Florets  [PHANTASIA]  L- TERA
  // EN: On Enter: Destroy target non-champion object with reserve cost 3 or less or memory cost 0. /  / [Diao Chan Bonus] At the beginning of your recollection phase, up to one target opponent summons a Flowerbud token.
  "perishing-florets": {
    name: "枯れゆく小花",
    effect:
      "登場時：リザーブコスト3以下またはメモリーコスト0の対象のチャンピオンでないオブジェクトを破壊する。\n\n" +
      "［ダオ・チャンボーナス］あなたのリコレクションフェイズの開始時に、最大1体の対象の対戦相手は花のつぼみトークンを1つ召喚する。",
  },

  // Petalfall Embrace  [ACTION]  L- TERA
  // EN: Each player recovers 8+LV. 
  "petalfall-embrace": {
    name: "花びら舞う抱擁",
    effect: "各プレイヤーはリカバー8＋LVする。",
  },

  // Photic Blade  [REGALIA/WEAPON]  L- LUXEM
  // EN: Photic Blade gets +1POWER for each refinement counter on it. /  / [Class Bonus] Whenever you recover, put a refinement counter on Photic Blade.
  "photic-blade": {
    name: "光子の刃",
    effect:
      "「光子の刃」は、それの上の精製カウンター1個につき、＋1パワーを得る。\n\n" +
      "［クラスボーナス］あなたがリカバーするたび、「光子の刃」に精製カウンターを1個置く。",
  },

  // Piquant Shieldbearer  [ALLY]  L- NORM
  // EN: Taunt (While awake, this unit must be targeted before other objects you control during your opponents' attack declarations if able.)
  "piquant-shieldbearer": {
    name: "威勢のよい盾持ち",
    effect:
      "タウント *（アウェイクの間、可能ならこのユニットは対戦相手の攻撃宣言時にあなたがコントロールする他のオブジェクトより先に対象にされなければならない。）*",
  },

  // Plasma Vanguard  [ALLY]  L- EXIA
  // EN: Intercept /  / [Damage 25+] Vigor /  / [Class Bonus] On Enter: If your champion has ten or less damage counters on them, put three buff counters on Plasma Vanguard. / 
  "plasma-vanguard": {
    name: "プラズマの先鋒",
    effect:
      "インターセプト\n\n" +
      "［ダメージ25以上］ヴィガー\n\n" +
      "［クラスボーナス］登場時：あなたのチャンピオン上のダメージカウンターが10個以下の場合、「プラズマの先鋒」にバフカウンターを3個置く。",
  },

  // Portly Raccoon  [ALLY]  L- NORM
  // EN: On Enter: You may reveal two Raccoon cards from your hand and/or memory. When you do, target opponent banishes a card from their graveyard.
  "portly-raccoon": {
    name: "恰幅のよいアライグマ",
    effect:
      "登場時：あなたは手札および／またはメモリーからアライグマカードを2枚公開してよい。そうしたとき、対象の対戦相手は自分の墓地からカードを1枚追放する。",
  },

  // Potion Infusion: Animate  [ACTION]  L- NORM
  // EN: [Arisanna Bonus] This card costs 2 less to activate.  /  / Rest target non-regalia Potion. If you do, it becomes an ally in addition to its other types with base power and life equal to its reserve cost. Each of its activated abilities becomes an on death triggered ability. (This effect lasts indefinitely.)
  "potion-infusion-animate": {
    name: "ポーション注入：命の付与",
    effect:
      "［アリサナボーナス］このカードは起動コストが2少なくなる。\n\n" +
      "対象のレガリアでないポーションをレストする。そうしたなら、それは他のタイプに加えてアライになり、リザーブコストに等しい基本パワーとライフを持つ。その各起動型能力は「死亡時」誘発型能力になる。*（この効果は無期限に続く。）*",
  },

  // Potion Infusion: Volatility  [ACTION]  L- NORM
  // EN: [Arisanna Bonus] Efficiency /  / Rest target Potion. If you do, it gains "On Sacrifice: Deal 4+D6 damage to each champion you don't control" until end of turn. (Roll a six-sided die to determine each instance of D6 as this effect resolves.)
  "potion-infusion-volatility": {
    name: "ポーション注入：揮発性",
    effect:
      "［アリサナボーナス］エフィシェンシー\n\n" +
      "対象のポーションをレストする。そうしたなら、それはターン終了時まで「サクリファイス時：あなたがコントロールしていない各チャンピオンに4＋D6点のダメージを与える」を得る。*（この効果が解決される際、6面ダイスを振って各D6の値を決定する。）*",
  },

  // Prismatic Sanctuary  [UNIQUE/DOMAIN]  L- NORM
  // EN: Upkeep â At the beginning of your recollection phase, reveal a card at random from your memory. If that card is not fire, water, nor wind element, sacrifice Prismatic Sanctuary. /  / Fire, water, and wind elements are enabled for you.
  "prismatic-sanctuary": {
    name: "虹彩の聖域",
    effect:
      "アップキープ — あなたのリコレクションフェイズの開始時に、あなたのメモリーからランダムにカードを1枚公開する。そのカードが火・水・風エレメントのいずれでもない場合、「虹彩の聖域」をサクリファイスする。\n\n" +
      "火・水・風エレメントがあなたにとって有効になる。",
  },

  // Protector Raccoon  [ALLY]  L- NORM
  // EN: Fast Activation (You may activate this card at fast speed.) /  / REST: Prevent the next 2 damage that would be dealt to target Animal ally this turn. /  / REST: Target opponent banishes a card from their graveyard.
  "protector-raccoon": {
    name: "守護者アライグマ",
    effect:
      "ファスト起動 *（あなたはこのカードをファストスピードで起動してよい。）*\n\n" +
      "レスト：このターン、対象の動物アライに与えられる次の2点のダメージを軽減する。\n\n" +
      "レスト：対象の対戦相手は自分の墓地からカードを1枚追放する。",
  },

  // Proto Archive Scout  [ALLY]  L- NORM
  // EN: Proto Archive Scout has stealth as long as itâs awake. /  / As long as you control an object named Proto Key Crest, Proto Archive Scout gets +1POWER.
  "proto-archive-scout": {
    name: "プロトアーカイブの斥候",
    effect:
      "「プロトアーカイブの斥候」はアウェイクであるかぎりステルスを持つ。\n\n" +
      "あなたが「プロトキー・クレスト」という名前のオブジェクトをコントロールしているかぎり、「プロトアーカイブの斥候」は＋1パワーを得る。",
  },

  // Psychopomp's Gale  [ACTION]  L- EXALTED,WIND
  // EN: (Exalted â This element is enabled for you as long as you have another advanced element enabled.) /  / Target player banishes all cards in their graveyard.
  "psychopomps-gale": {
    name: "冥導者の疾風",
    effect:
      "*（エグザルテッド — このエレメントは、あなたが他のアドバンスドエレメントを有効にしているかぎり、あなたにとって有効となる。）*\n\n" +
      "対象のプレイヤーは自分の墓地のすべてのカードを追放する。",
  },

  // Pyretic Prognosis  [ACTION]  L- EXALTED,FIRE
  // EN: Draw three cards, then discard two cards. 
  "pyretic-prognosis": {
    name: "熱病の予後",
    effect: "カードを3枚引き、その後カードを2枚捨てる。",
  },

  // Quicksilver Grail  [REGALIA/ITEM]  L- NORM
  // EN: Divine Relic (You can only have one card with this keyword in your material deck.) /  / On Enter: Banish a non-champion card from your material deck face down. /  / Banish Quicksilver Grail: You may play the banished card. (You still pay for its costs.)
  "quicksilver-grail": {
    name: "水銀の聖杯",
    effect:
      "ディヴァインレリック *（このキーワードを持つカードはマテリアルデッキに1枚しか入れられない。）*\n\n" +
      "登場時：あなたのマテリアルデッキからチャンピオンでないカードを1枚裏向きに追放する。\n\n" +
      "「水銀の聖杯」を追放する：あなたはその追放されたカードをプレイしてよい。*（あなたはそのコストを支払う。）*",
  },

  // Quickstep Treads  [REGALIA/ITEM]  L- NORM
  // EN: On Enter: Draw a card. /  / [Class Bonus] As long as your champion is distant and it's your turn, cards your opponents activate cost (2) more to activate.
  "quickstep-treads": {
    name: "疾歩のトレッド",
    effect:
      "登場時：カードを1枚引く。\n\n" +
      "［クラスボーナス］あなたのチャンピオンがディスタントでありあなたのターンであるかぎり、対戦相手が起動するカードは起動コストが(2)多くなる。",
  },

  // Quietus Blade  [REGALIA/WEAPON]  L- CRUX
  // EN: [Class Bonus] As long as there are no cards in your material deck, Quietus Blade gets +4POWER and has "(3),  REST: Quietus Blade gains spellshroud until end of turn."
  "quietus-blade": {
    name: "静寂の刃",
    effect:
      "［クラスボーナス］あなたのマテリアルデッキにカードが1枚もないかぎり、「静寂の刃」は＋4パワーを得て「(3)、レスト：「静寂の刃」はターン終了時までスペルシュラウドを得る。」を持つ。",
  },

  // Radiant Origin of Assassin  [PHANTASIA]  L- NORM
  // EN: Omnishroud /  / Whenever you activate a prepared card, put a training counter on Radiant Origin of Assassin. /  / [Class Bonus] (5), Sacrifice Radiant Origin of Assassin: Level up your champion. Activate this ability only if there are four or more training counters on Radiant Origin of Assassin.
  "radiant-origin-of-assassin": {
    name: "アサシンの輝ける起源",
    effect:
      "オムニシュラウド\n\n" +
      "あなたがプレパレーションされたカードを起動するたび、「アサシンの輝ける起源」に修練カウンターを1個置く。\n\n" +
      "［クラスボーナス］(5)、「アサシンの輝ける起源」をサクリファイスする：あなたのチャンピオンをレベルアップする。この能力は、「アサシンの輝ける起源」の上に修練カウンターが4個以上ある場合のみ起動する。",
  },

  // Radiant Origin of Cleric  [PHANTASIA]  L- NORM
  // EN: Omnishroud /  / Whenever you recover, put a training counter on Radiant Origin of Cleric. /  / [Class Bonus] (4), Sacrifice Radiant Origin of Cleric: Level up your champion. Activate this ability only if there are eight or more training counters on Radiant Origin of Cleric.
  "radiant-origin-of-cleric": {
    name: "クレリックの輝ける起源",
    effect:
      "オムニシュラウド\n\n" +
      "あなたがリカバーするたび、「クレリックの輝ける起源」に修練カウンターを1個置く。\n\n" +
      "［クラスボーナス］(4)、「クレリックの輝ける起源」をサクリファイスする：あなたのチャンピオンをレベルアップする。この能力は、「クレリックの輝ける起源」の上に修練カウンターが8個以上ある場合のみ起動する。",
  },

  // Radiant Origin of Guardian  [PHANTASIA]  L- NORM
  // EN: Omnishroud /  / Whenever a unit source you control deals 4 or more damage, put a training counter on Radiant Origin of Guardian. /  / [Class Bonus] (3), Sacrifice Radiant Origin of Guardian: Level up your champion. Activate this ability only if there are five or more training counters on Radiant Origin of Guardian.
  "radiant-origin-of-guardian": {
    name: "ガーディアンの輝ける起源",
    effect:
      "オムニシュラウド\n\n" +
      "あなたがコントロールするユニットの発生源が4点以上のダメージを与えるたび、「ガーディアンの輝ける起源」に修練カウンターを1個置く。\n\n" +
      "［クラスボーナス］(3)、「ガーディアンの輝ける起源」をサクリファイスする：あなたのチャンピオンをレベルアップする。この能力は、「ガーディアンの輝ける起源」の上に修練カウンターが5個以上ある場合のみ起動する。",
  },

  // Radiant Origin of Mage  [PHANTASIA]  L- NORM
  // EN: Omnishroud /  / Whenever you empower, put a training counter on Radiant Origin of Mage. /  / [Class Bonus] (4), Sacrifice Radiant Origin of Mage: Level up your champion. Activate this ability only if there are six or more training counters on Radiant Origin of Mage.
  "radiant-origin-of-mage": {
    name: "メイジの輝ける起源",
    effect:
      "オムニシュラウド\n\n" +
      "あなたがエンパワーするたび、「メイジの輝ける起源」に修練カウンターを1個置く。\n\n" +
      "［クラスボーナス］(4)、「メイジの輝ける起源」をサクリファイスする：あなたのチャンピオンをレベルアップする。この能力は、「メイジの輝ける起源」の上に修練カウンターが6個以上ある場合のみ起動する。",
  },

  // Radiant Origin of Ranger  [PHANTASIA]  L- NORM
  // EN: Omnishroud /  / Whenever a Ranger unit you control becomes distant, put a training counter on Radiant Origin of Ranger. /  / [Class Bonus] (3), Sacrifice Radiant Origin of Ranger: Level up your champion. Activate this ability only if there are six or more training counters on Radiant Origin of Ranger.
  "radiant-origin-of-ranger": {
    name: "レンジャーの輝ける起源",
    effect:
      "オムニシュラウド\n\n" +
      "あなたがコントロールするレンジャーユニットがディスタントになるたび、「レンジャーの輝ける起源」に修練カウンターを1個置く。\n\n" +
      "［クラスボーナス］(3)、「レンジャーの輝ける起源」をサクリファイスする：あなたのチャンピオンをレベルアップする。この能力は、「レンジャーの輝ける起源」の上に修練カウンターが6個以上ある場合のみ起動する。",
  },

  // Radiant Origin of Tamer  [PHANTASIA]  L- NORM
  // EN: Omnishroud /  / Whenever you declare an attack with a non-Human ally, put a training counter on Radiant Origin of Tamer. /  / [Class Bonus] (3), Sacrifice Radiant Origin of Tamer: Level up your champion. Activate this ability only if there are seven or more training counters on Radiant Origin of Tamer.
  "radiant-origin-of-tamer": {
    name: "テイマーの輝ける起源",
    effect:
      "オムニシュラウド\n\n" +
      "あなたが人間でないアライで攻撃を宣言するたび、「テイマーの輝ける起源」に修練カウンターを1個置く。\n\n" +
      "［クラスボーナス］(3)、「テイマーの輝ける起源」をサクリファイスする：あなたのチャンピオンをレベルアップする。この能力は、「テイマーの輝ける起源」の上に修練カウンターが7個以上ある場合のみ起動する。",
  },

  // Radiant Origin of Warrior  [PHANTASIA]  L- NORM
  // EN: Omnishroud /  / Whenever your champion attacks using a weapon, put a training counter on Radiant Origin of Warrior. /  / [Class Bonus] (3), Sacrifice Radiant Origin of Warrior: Level up your champion. Activate this ability only if there are four or more training counters on Radiant Origin of Warrior.
  "radiant-origin-of-warrior": {
    name: "ウォリアーの輝ける起源",
    effect:
      "オムニシュラウド\n\n" +
      "あなたのチャンピオンが武器を使って攻撃するたび、「ウォリアーの輝ける起源」に修練カウンターを1個置く。\n\n" +
      "［クラスボーナス］(3)、「ウォリアーの輝ける起源」をサクリファイスする：あなたのチャンピオンをレベルアップする。この能力は、「ウォリアーの輝ける起源」の上に修練カウンターが4個以上ある場合のみ起動する。",
  },

  // Rapid Deployment Nexus  [DOMAIN]  L- NEOS
  // EN: (Siegeable â This domain can be attacked. It takes damage in the form of removing durability counters.) /  / [Class Bonus] REST, Remove three durability counters from Rapid Deployment Nexus: Wake up another target domain.
  "rapid-deployment-nexus": {
    name: "急速展開ネクサス",
    effect:
      "*（シージアブル — このドメインは攻撃できる。耐久カウンターを取り除く形でダメージを受ける。）*\n\n" +
      "［クラスボーナス］レスト、「急速展開ネクサス」から耐久カウンターを3個取り除く：別の対象のドメインをアウェイクにする。",
  },

  // Ravaging Tempest  [ACTION]  L- WIND
  // EN: Efficiency (This card costs LV less to activate. LV refers to your champion's level.) /  / Banish all allies. For each ally banished this way, its controller draws a card.
  "ravaging-tempest": {
    name: "荒れ狂う大嵐",
    effect:
      "エフィシェンシー *（このカードは起動コストがLV少なくなる。LVはあなたのチャンピオンのレベルを指す。）*\n\n" +
      "すべてのアライを追放する。この方法で追放した各アライにつき、そのコントローラーはカードを1枚引く。",
  },

  // Raze the Land  [ACTION]  L- NORM
  // EN: Destroy target domain. /  / Floating Memory
  "raze-the-land": {
    name: "土地の破壊",
    effect:
      "対象のドメインを破壊する。\n\n" +
      "フローティングメモリー",
  },

  // Razorgale Calling  [PHANTASIA]  L- WIND
  // EN: [Class Bonus] This card costs 2 less to activate. (Apply this effect only if your champion's class matches this card's class.) /  / Whenever you activate a wind element card, deal 1 damage to target champion.
  "razorgale-calling": {
    name: "レイザーゲイルの呼び声",
    effect:
      "［クラスボーナス］このカードは起動コストが2少なくなる。*（この効果は、あなたのチャンピオンのクラスがこのカードのクラスと一致する場合のみ適用する。）*\n\n" +
      "あなたが風エレメントのカードを起動するたび、対象のチャンピオンに1点のダメージを与える。",
  },

  // Razorvine  [TOKEN/ITEM]  L- NORM
  // EN: Sacrifice Razorvine: Put a card from your hand on the bottom of your deck. If you do, draw a card.
  "razorvine": {
    name: "レイザーヴァイン",
    effect:
      "「レイザーヴァイン」をサクリファイスする：あなたの手札からカードを1枚デッキの一番下に置く。そうしたなら、カードを1枚引く。",
  },

  // Reactivate Drone  [ACTION]  L- NEOS
  // EN: Summon an Automaton Drone token rested with a buff counter on it. /  / Ephemerate â (2) (You may activate this card from your graveyard by paying this cost. Action cards played this way become ephemeral on the effects stack.)
  "reactivate-drone": {
    name: "ドローン再起動",
    effect:
      "オートマトンドローントークンをバフカウンター1個を乗せてレストして召喚する。\n\n" +
      "エフェメレート — (2) *（あなたはこのコストを支払うことでこのカードを墓地から起動してよい。この方法でプレイしたアクションカードは、エフェクトスタック上でエフェメラルになる。）*",
  },

  // Reaping Legacy  [ATTACK]  L- CRUX
  // EN: [Class Bonus] Reaping Legacy gets +1POWER for each Sword regalia weapon card in your banishment.
  "reaping-legacy": {
    name: "刈り取る遺産",
    effect:
      "［クラスボーナス］「刈り取る遺産」は、あなたの追放領域にある剣レガリア武器カード1枚につき、＋1パワーを得る。",
  },

  // Reclaim  [ACTION]  L- WIND
  // EN: Return target ally you control to its owner's hand. /  / Floating Memory (While paying for a memory cost, you may banish this card from your graveyard to pay for 1 of that cost.)
  "reclaim": {
    name: "取り戻し",
    effect:
      "あなたがコントロールする対象のアライをオーナーの手札に戻す。\n\n" +
      "フローティングメモリー *（メモリーコストを支払う際、あなたはこのカードを墓地から追放してそのコストの1分を支払ってよい。）*",
  },

  // Recurring Aethercharge  [ACTION]  L- NORM
  // EN: You may load Recurring Aethercharge into an Aetherwing weapon you control.  /  / [Class Bonus] (3): Load this card from your graveyard into an Aetherwing weapon you control.
  "recurring-aethercharge": {
    name: "回帰するエーテルチャージ",
    effect:
      "あなたは「回帰するエーテルチャージ」を、あなたがコントロールするエーテルウィング武器にロードしてよい。\n\n" +
      "［クラスボーナス］(3)：このカードを墓地から、あなたがコントロールするエーテルウィング武器にロードする。",
  },

  // Redirect Orbit  [ACTION]  L- ASTRA
  // EN: Shuffle any amount of cards from your hand and/or memory into your deck. Then draw that many cards into your memory. 
  "redirect-orbit": {
    name: "軌道の変更",
    effect:
      "あなたの手札および／またはメモリーから好きな数のカードをあなたのデッキに切り混ぜる。その後、その枚数のカードをあなたのメモリーに引く。",
  },

  // Reduce to Ash  [ACTION]  L- FIRE
  // EN: Destroy target item or weapon with memory cost 0 or reserve cost 4 or less.
  "reduce-to-ash": {
    name: "灰燼に帰す",
    effect: "メモリーコスト0またはリザーブコスト4以下の対象のアイテムまたは武器を破壊する。",
  },

  // Refracting Missile  [ACTION]  L- WATER
  // EN: Deal damage to target unit equal to the amount of Fractal objects you control plus 1. /  / Floating Memory (While paying for a memory cost, you may banish this card from your graveyard to pay for 1 of that cost.)
  "refracting-missile": {
    name: "屈折するミサイル",
    effect:
      "対象のユニットに、あなたがコントロールするフラクタルオブジェクトの数に1を加えた量のダメージを与える。\n\n" +
      "フローティングメモリー *（メモリーコストを支払う際、あなたはこのカードを墓地から追放してそのコストの1分を支払ってよい。）*",
  },

  // Reliable Cavalier  [ALLY]  L- NORM
  // EN: Equestrian â As long as you control a Horse ally, Reliable Cavalier gets +3POWER.
  "reliable-cavalier": {
    name: "頼れる騎兵",
    effect:
      "エクエストリアン — あなたが馬アライをコントロールしているかぎり、「頼れる騎兵」は＋3パワーを得る。",
  },

  // Rending Flames  [ATTACK]  L- FIRE
  // EN: [Class Bonus] On Attack: You may banish three fire element cards from your graveyard. If you do, Rending Flames gains "If this attack would deal damage, it deals double that damage instead."
  "rending-flames": {
    name: "引き裂く炎",
    effect:
      "［クラスボーナス］攻撃時：あなたの墓地から火エレメントのカードを3枚追放してよい。そうしたなら、「引き裂く炎」は「この攻撃がダメージを与える場合、代わりにそのダメージの2倍を与える。」を得る。",
  },

  // Reverent Seraphim  [ALLY]  L- NORM
  // EN: Advanced Imbue 2 (You may reserve all cards revealed as you activate this card. If at least two of them are advanced element, this card becomes imbued.) /  / As long as Reverent Seraphim is imbued, other allies get -1POWER.
  "reverent-seraphim": {
    name: "敬虔なセラフィム",
    effect:
      "アドバンスド・インビュー2 *（あなたはこのカードを起動する際、公開したすべてのカードをリザーブしてよい。そのうち少なくとも2枚がアドバンスドエレメントの場合、このカードはインビュー状態になる。）*\n\n" +
      "「敬虔なセラフィム」がインビュー状態であるかぎり、他のアライは－1パワーを得る。",
  },

  // Reversal's Polarity  [PHANTASIA]  L- ARCANE
  // EN: Whenever an arcane element card activation you control is negated, deal X damage to target champion, where X is that card's reserve cost.
  "reversals-polarity": {
    name: "反転の極性",
    effect:
      "あなたがコントロールするアーケインエレメントのカードの起動が打ち消されるたび、対象のチャンピオンにX点のダメージを与える。Xはそのカードのリザーブコスト。",
  },

  // Right of Realm  [ITEM]  L- NORM
  // EN: Whenever you activate a domain card, you may sacrifice Right of Realm. If you do, that domain enters the field without any of its upkeep abilities. /  / Floating Memory (While paying for a memory cost, you may banish this card from your graveyard to pay for 1 of that cost.)
  "right-of-realm": {
    name: "王国の権利",
    effect:
      "あなたがドメインカードを起動するたび、あなたは「王国の権利」をサクリファイスしてよい。そうしたなら、そのドメインはアップキープ能力を持たずに戦場に出る。\n\n" +
      "フローティングメモリー *（メモリーコストを支払う際、あなたはこのカードを墓地から追放してそのコストの1分を支払ってよい。）*",
  },

  // Roots of Tomorrow  [ACTION]  L- TERA
  // EN: Reveal the top card of your deck and put it into your material deck preserved. /  / Draw a card into your memory. 
  "roots-of-tomorrow": {
    name: "明日への根",
    effect:
      "あなたのデッキの一番上のカードを公開し、プリザーブしてあなたのマテリアルデッキに置く。\n\n" +
      "カードを1枚あなたのメモリーに引く。",
  },

  // Rousing Slime  [ALLY]  L- WIND
  // EN: [Class Bonus] On Enter: You may rest Rousing Slime. If you do, wake up another Slime ally you control. (Apply this effect only if your championâs class matches this cardâs class.)
  "rousing-slime": {
    name: "鼓舞するスライム",
    effect:
      "［クラスボーナス］登場時：あなたは「鼓舞するスライム」をレストしてよい。そうしたなら、あなたがコントロールする別のスライムアライをアウェイクにする。*（この効果は、あなたのチャンピオンのクラスがこのカードのクラスと一致する場合のみ適用する。）*",
  },

  // Royal Line Defense  [ACTION]  L- NORM
  // EN: [Alice Bonus] As long as you've activated a Command card this turn, this card costs 2 less to activate. /  / Choose oneâ / â¢ Target Chessman ally gets +3LIFE until end of turn. / â¢ Negate target card activation if a Chessman ally is attacking.
  "royal-line-defense": {
    name: "王家の防衛線",
    effect:
      "［アリスボーナス］あなたがこのターンにコマンドカードを起動しているかぎり、このカードは起動コストが2少なくなる。\n\n" +
      "1つ選ぶ——\n" +
      "・対象のチェスマンアライは、ターン終了時まで＋3ライフを得る。\n" +
      "・チェスマンアライが攻撃している場合、対象のカードの起動を打ち消す。",
  },

  // Sabela, Gossamer Penance  [UNIQUE/ALLY]  L- CRUX
  // EN: [Class Bonus] On Enter: Choose a Sword regalia card with memory cost 1 or less from your banishment and put it onto the field. Put a bond counter on it. It gets +2POWER for as long as you control Sabela. /  / On Leave: Sacrifice each regalia with a bond counter on it. /  / 
  "sabela-gossamer-penance": {
    name: "サベラ、繊細なる贖罪",
    effect:
      "［クラスボーナス］登場時：あなたの追放領域からメモリーコスト1以下の剣レガリアカードを1枚選び、それを戦場に出す。それにボンドカウンターを1個置く。あなたが「サベラ」をコントロールしているかぎり、それは＋2パワーを得る。\n\n" +
      "退場時：ボンドカウンターが乗っている各レガリアをサクリファイスする。",
  },

  // Sable Remnant  [ALLY]  L- NORM
  // EN: [Class Bonus] Sable Remnant gets +1 POWER. /  / Floating Memory (While paying for a memory cost, you may banish this card from your graveyard to pay for 1 of that cost.) 
  "sable-remnant": {
    name: "漆黒の残滓",
    effect:
      "［クラスボーナス］「漆黒の残滓」は＋1パワーを得る。\n\n" +
      "フローティングメモリー *（メモリーコストを支払う際、あなたはこのカードを墓地から追放してそのコストの1分を支払ってよい。）*",
  },

  // Sacred Barrier  [ACTION]  L- NORM
  // EN: The next time each ally would be dealt non-combat damage this turn, prevent 4 of that damage.
  "sacred-barrier": {
    name: "聖なる障壁",
    effect:
      "このターン、各アライが次に非戦闘ダメージを受ける際、そのダメージのうち4点を軽減する。",
  },

  // Sanctified Paladin  [ALLY]  L- NORM
  // EN: Foster /  / As long as Sanctified Paladin is fostered, it gets +3POWER and +3LIFE, and has vigor. /  / On Foster: Draw two cards.
  "sanctified-paladin": {
    name: "聖別されたパラディン",
    effect:
      "フォスター\n\n" +
      "「聖別されたパラディン」がフォスターされているかぎり、それは＋3パワーと＋3ライフを得て、ヴィガーを持つ。\n\n" +
      "フォスター時：カードを2枚引く。",
  },

  // Saprotrophy  [PHANTASIA]  L- TERA
  // EN: On Enter:  Recover 2+X, where X is the amount of tera element cards in your banishment. /  / [Diao Chan Bonus] Objects your opponents control enter the field with an additional wither counter on them.
  "saprotrophy": {
    name: "腐生栄養",
    effect:
      "登場時：リカバー2＋Xする。Xはあなたの追放領域にあるテラエレメントのカードの数。\n\n" +
      "［ダオ・チャンボーナス］対戦相手がコントロールするオブジェクトは、萎縮カウンターを1個追加で乗せて戦場に出る。",
  },

  // Sasha, Purifying Acolyte  [UNIQUE/ALLY]  L- WIND
  // EN: Foster (At the beginning of your recollection phase, if this ally hasnât been dealt damage since the end of your previous turn, it becomes fostered.) /  / On Foster: Banish all cards in all graveyards. /  / If one or more cards would enter a player's graveyard while Sasha is fostered, banish them instead.
  "sasha-purifying-acolyte": {
    name: "サーシャ、浄化の侍者",
    effect:
      "フォスター *（あなたのリコレクションフェイズの開始時に、このアライが前のターンの終了以降ダメージを受けていない場合、それはフォスターされる。）*\n\n" +
      "フォスター時：すべての墓地のすべてのカードを追放する。\n\n" +
      "「サーシャ」がフォスターされている間に1枚以上のカードがプレイヤーの墓地に置かれる場合、代わりにそれらを追放する。",
  },

  // Scatter Essence  [ACTION]  L- WIND
  // EN: Destroy target phantasia. /  / Floating Memory
  "scatter-essence": {
    name: "エッセンスの散布",
    effect:
      "対象のファンタジアを破壊する。\n\n" +
      "フローティングメモリー",
  },

  // Scavenging Raccoon  [ALLY]  L- NORM
  // EN: On Enter: Banish up to two target cards from a single graveyard.
  "scavenging-raccoon": {
    name: "あさりアライグマ",
    effect: "登場時：単一の墓地から対象のカードを最大2枚追放する。",
  },

  // Schwartz Castler  [ALLY]  L- WIND
  // EN: Commanded Will 1 (As long as this unit is attacking using a Command card, it gets +1POWER.) /  / [Alice Bonus] On Enter: If an opponent controls a unit with an even life stat, summon a Pawn Piece token.
  "schwartz-castler": {
    name: "シュヴァルツ・キャスラー",
    effect:
      "コマンドウィル1 *（このユニットがコマンドカードを使って攻撃しているかぎり、それは＋1パワーを得る。）*\n\n" +
      "［アリスボーナス］登場時：対戦相手がライフ値が偶数のユニットをコントロールしている場合、ポーンの駒トークンを1つ召喚する。",
  },

  // Scientific Discoveries  [ACTION]  L- NORM
  // EN: Glimpse 3. Then you may remove two enlighten counters from your champion. If you do, draw a card into your memory.
  "scientific-discoveries": {
    name: "科学的発見",
    effect:
      "グリンプス3する。その後、あなたのチャンピオンから覚醒カウンターを2個取り除いてよい。そうしたなら、カードを1枚あなたのメモリーに引く。",
  },

  // Scorching Knowledge  [ACTION]  L- FIRE
  // EN: Empower 3. (The next Spell card you activate this turn activates and resolves as if your champion got +3 level.) /  / [Rai Bonus] You may remove an enlighten counter from your champion. If you do, empower 3.
  "scorching-knowledge": {
    name: "灼熱の知識",
    effect:
      "エンパワー3する。*（このターン、あなたが起動する次のスペルカードは、あなたのチャンピオンが＋3レベルを得たかのように起動し解決する。）*\n\n" +
      "［ライボーナス］あなたのチャンピオンから覚醒カウンターを1個取り除いてよい。そうしたなら、エンパワー3する。",
  },

  // Scry the Skies  [ACTION]  L- NORM
  // EN: Glimpse LV. Draw a card into your memory. (To glimpse, look at that many cards from the top of your deck. Put those cards back on the top or on the bottom of your deck in any order.)
  "scry-the-skies": {
    name: "天空の占察",
    effect:
      "グリンプスLVする。カードを1枚あなたのメモリーに引く。*（グリンプスするには、デッキの一番上からその枚数のカードを見る。それらのカードを好きな順番でデッキの一番上または一番下に戻す。）*",
  },

  // Second Wind  [ACTION]  L- WIND
  // EN: Wake up target ally. Class Bonus: That ally gets +1 POWER until end of turn. (Apply the additional effect only if your champion's class matches this card's class.)
  "second-wind": {
    name: "セカンドウィンド",
    effect:
      "対象のアライをアウェイクにする。クラスボーナス：そのアライは、ターン終了時まで＋1パワーを得る。*（追加効果は、あなたのチャンピオンのクラスがこのカードのクラスと一致する場合のみ適用する。）*",
  },

  // Seething Intercession  [ACTION]  L- EXIA
  // EN: Banish the top three cards of your deck. For as long as they're banished, you may activate them. As an additional cost to activate each of those cards, deal 2 unpreventable damage to your champion. /  / [Jin Bonus] If your influence is four or less, the next three cards you activate from banishment this turn cost 1 less to activate.
  "seething-intercession": {
    name: "煮えたぎる嘆願",
    effect:
      "あなたのデッキの一番上から3枚を追放する。それらが追放されているかぎり、あなたはそれらを起動してよい。それらの各カードを起動するための追加コストとして、あなたのチャンピオンに2点の軽減不能のダメージを与える。\n\n" +
      "［ジンボーナス］あなたのインフルエンスが4以下の場合、このターン、あなたが追放領域から起動する次の3枚のカードは起動コストが1少なくなる。",
  },

  // Senaris, Six of Diamonds  [UNIQUE/ALLY]  L- WATER
  // EN: Spellshroud, Stealth /  / Cardistry â (6): The next three times a Suited Spell source you control would deal damage this turn, it deals that much plus 3 damage instead. This ability costs (1) less to activate for each Suited object you control with different reserve costs. Activate this ability only once.
  "senaris-six-of-diamonds": {
    name: "セナリス、ダイヤの6",
    effect:
      "スペルシュラウド、ステルス\n\n" +
      "カーディストリ — (6)：このターン、あなたがコントロールするスートスペルの発生源が次の3回ダメージを与える際、代わりにそれはそのダメージに3点を加えたダメージを与える。この能力は、あなたがコントロールする異なるリザーブコストを持つスートオブジェクト1つにつき、起動コストが(1)少なくなる。この能力は1回のみ起動する。",
  },

  // Shade Striker  [ALLY]  L- NORM
  // EN: Ambush (This ally may retaliate against attackers while not defending.)
  "shade-striker": {
    name: "影の襲撃者",
    effect: "アンブッシュ *（このアライは、防御していない間も攻撃者にリタリエイトしてよい。）*",
  },

  // Shaded Doppelganger  [ALLY]  L- UMBRA
  // EN: Stealth /  / Shaded Doppelganger gets +XPOWER, where X is the highest base power stat among other allies you control.
  "shaded-doppelganger": {
    name: "影のドッペルゲンガー",
    effect:
      "ステルス\n\n" +
      "「影のドッペルゲンガー」は＋Xパワーを得る。Xはあなたがコントロールする他のアライの中で最も高い基本パワー値。",
  },

  // Shademist Priestess  [ALLY]  L- WATER
  // EN: Stealth /  / Whenever your champion is dealt damage from a source you don't control,  you may recover 1. /  / Floating Memory
  "shademist-priestess": {
    name: "影霧の女司祭",
    effect:
      "ステルス\n\n" +
      "あなたのチャンピオンがあなたがコントロールしていない発生源からダメージを受けるたび、あなたはリカバー1してよい。\n\n" +
      "フローティングメモリー",
  },

  // Shilowen, Peaceful Beginnings  [UNIQUE/DOMAIN]  L- NORM
  // EN: Whenever an ally enters the field, you may remove two durability counters from Shilowen. If you do, put a bulwark counter on that ally. (If combat damage would be dealt to an ally with any bulwark counters on it, remove one and prevent that damage instead.)
  "shilowen-peaceful-beginnings": {
    name: "シロウェン、平穏なる始まり",
    effect:
      "アライが戦場に出るたび、あなたは「シロウェン」から耐久カウンターを2個取り除いてよい。そうしたなら、そのアライにバルワークカウンターを1個置く。*（バルワークカウンターが乗っているアライに戦闘ダメージが与えられる場合、代わりにそれを1個取り除き、そのダメージを軽減する。）*",
  },

  // Shimmercloak Assassin  [ALLY]  L- WIND
  // EN: Stealth (This unit can't be targeted by attacks unless permitted by true sight.)
  "shimmercloak-assassin": {
    name: "煌めきの外套の暗殺者",
    effect:
      "ステルス *（このユニットは、トゥルーサイトによって許可されないかぎり、攻撃の対象にできない。）*",
  },

  // Shizun of the Ash  [ALLY]  L- FIRE
  // EN: On Enter: You may discard a card. If you do, draw a card.  /  / [Kongming Bonus] REST, Banish a fire element card from your graveyard: As a Spell, deal 4 damage to target ally. Activate this ability only if your Shifting Currents face North or South. 
  "shizun-of-the-ash": {
    name: "灰の師尊",
    effect:
      "登場時：あなたはカードを1枚捨ててよい。そうしたなら、カードを1枚引く。\n\n" +
      "［コンミンボーナス］レスト、あなたの墓地から火エレメントのカードを1枚追放する：スペルとして、対象のアライに4点のダメージを与える。この能力は、あなたの「移ろう潮流」が北または南を向いている場合のみ起動する。",
  },

  // Shock Therapy  [ACTION]  L- ARCANE
  // EN: [Class Bonus] [Element Bonus] Whenever this card is banished from your memory, put an enlighten counter on your champion. /  / Deal an amount of damage to target ally equal to the amount of enlighten counters on your champion.
  "shock-therapy": {
    name: "ショック療法",
    effect:
      "［クラスボーナス］［エレメントボーナス］このカードがあなたのメモリーから追放されるたび、あなたのチャンピオンに覚醒カウンターを1個置く。\n\n" +
      "対象のアライに、あなたのチャンピオン上の覚醒カウンターの数に等しい量のダメージを与える。",
  },

  // Shroud in Mist  [ACTION]  L- WATER
  // EN: [Class Bonus] This card costs 2 less to activate. (Apply this effect only if your champion's class matches this card's class.) /  / Units you control gain stealth until end of turn. (Units with stealth can't be targeted by attacks unless permitted by true sight.)
  "shroud-in-mist": {
    name: "霧に包む",
    effect:
      "［クラスボーナス］このカードは起動コストが2少なくなる。*（この効果は、あなたのチャンピオンのクラスがこのカードのクラスと一致する場合のみ適用する。）*\n\n" +
      "あなたがコントロールするユニットは、ターン終了時までステルスを得る。*（ステルスを持つユニットは、トゥルーサイトによって許可されないかぎり、攻撃の対象にできない。）*",
  },

  // Silver Soldier  [ALLY]  L- EXALTED,NORM
  // EN: (Exalted â This element is enabled for you as long as you have another advanced element enabled.) /  / Retort 2, Vigor
  "silver-soldier": {
    name: "銀の兵士",
    effect:
      "*（エグザルテッド — このエレメントは、あなたが他のアドバンスドエレメントを有効にしているかぎり、あなたにとって有効となる。）*\n\n" +
      "リトート2、ヴィガー",
  },

  // Silvergale Monstrosity's Call  [ACTION]  L- EXALTED,WIND
  // EN: Prepare 2 /  / Summon a Memorite Obelith token. If Silvergale Monstrosity's Call was prepared, move any amount of sheen counters from your Fractured Memories onto any amount of allies named Memorite Obelith you control.
  "silvergale-monstrositys-call": {
    name: "シルバーゲイルの怪物の呼び声",
    effect:
      "プレパレーション2\n\n" +
      "メモライト・オベリストークンを1つ召喚する。「シルバーゲイルの怪物の呼び声」がプレパレーションされていた場合、あなたの「砕けた記憶」から好きな数のシーンカウンターを、あなたがコントロールする「メモライト・オベリス」という名前の好きな数のアライに移す。",
  },

  // Silvergale Obelith's Call  [ACTION]  L- WIND
  // EN: Summon a Memorite Obelith token with a sheen counter on it.
  "silvergale-obeliths-call": {
    name: "シルバーゲイルのオベリスの呼び声",
    effect: "シーンカウンターを1個乗せたメモライト・オベリストークンを1つ召喚する。",
  },

  // Silvershine  [TOKEN/ITEM]  L- NORM
  // EN: Sacrifice Silvershine: Recover 1.
  "silvershine": {
    name: "シルバーシャイン",
    effect: "「シルバーシャイン」をサクリファイスする：リカバー1する。",
  },

  // Simple Slime  [ALLY]  L- NORM
  // EN: Simple Slime can't attack. /  / If damage would be dealt to Simple Slime, prevent 3 of that damage.
  "simple-slime": {
    name: "素朴なスライム",
    effect:
      "「素朴なスライム」は攻撃できない。\n\n" +
      "「素朴なスライム」にダメージが与えられる場合、そのダメージのうち3点を軽減する。",
  },

  // Sinister Composure  [ACTION]  L- UMBRA
  // EN: Draw a card, then put a preparation counter on your champion.  /  / [Tristan Bonus] If you have agility, put three more preparation counters on your champion.
  "sinister-composure": {
    name: "不気味な平静",
    effect:
      "カードを1枚引き、その後あなたのチャンピオンにプレパレーションカウンターを1個置く。\n\n" +
      "［トリスタンボーナス］あなたがアジリティを持っている場合、あなたのチャンピオンにさらにプレパレーションカウンターを3個置く。",
  },

  // Siphoning Stab  [ATTACK]  L- EXIA
  // EN: [Class Bonus] As long as the attacker is attacking using a Polearm weapon, Siphoning Stab has "On Hit: Recover X, where X is the amount of damage dealt by this hit."
  "siphoning-stab": {
    name: "吸収の刺突",
    effect:
      "［クラスボーナス］攻撃者が長柄武器を使って攻撃しているかぎり、「吸収の刺突」は「ヒット時：リカバーXする。Xはこのヒットで与えられたダメージの量。」を持つ。",
  },

  // Slay the King  [ATTACK]  L- CRUX
  // EN: [Class Bonus] On Attack: You may banish a card from your material deck. If you do, Slay the King gains "On Kill: You may play the banished card."
  "slay-the-king": {
    name: "王を討つ",
    effect:
      "［クラスボーナス］攻撃時：あなたのマテリアルデッキからカードを1枚追放してよい。そうしたなら、「王を討つ」は「キル時：あなたはその追放されたカードをプレイしてよい。」を得る。",
  },

  // Slice and Dice  [ATTACK]  L- NORM
  // EN: Prepare 3 /  / On Hit: If Slice and Dice was prepared, you may have the attacker declare an additional attack. If you do, create a copy of Slice and Dice in that attacker's intent except it isn't prepared and it gets +3 POWER.
  "slice-and-dice": {
    name: "斬り刻み",
    effect:
      "プレパレーション3\n\n" +
      "ヒット時：「斬り刻み」がプレパレーションされていた場合、あなたは攻撃者に追加の攻撃を宣言させてよい。そうしたなら、その攻撃者のインテントに「斬り刻み」のコピーを作成する。ただしそれはプレパレーションされておらず、＋3パワーを得る。",
  },

  // Slime Calling  [ACTION]  L- WIND
  // EN: Activate this card only during an opponent's end phase. /  / [Class Bonus] Look at the top 3+LV cards of your deck. You may activate up to two Slime ally cards from among them. Cards you activate this way cost 1 less to activate. Put the rest of the cards on the bottom of your deck in any order.
  "slime-calling": {
    name: "スライムの呼び声",
    effect:
      "このカードは対戦相手のエンドフェイズ中にのみ起動する。\n\n" +
      "［クラスボーナス］あなたのデッキの一番上から3＋LV枚を見る。その中からスライムアライカードを最大2枚起動してよい。この方法で起動するカードは起動コストが1少なくなる。残りのカードを好きな順番でデッキの一番下に置く。",
  },

  // Slime Party  [ACTION]  L- NORM
  // EN: [Silvie Bonus] This card costs 1 less to activate for each different element Slime ally you control. (Apply this effect only if your champion is Silvie.) /  / Put a buff counter on each Slime ally you control.
  "slime-party": {
    name: "スライムパーティー",
    effect:
      "［シルヴィボーナス］このカードは、あなたがコントロールする異なるエレメントのスライムアライ1体につき、起動コストが1少なくなる。*（この効果は、あなたのチャンピオンがシルヴィの場合のみ適用する。）*\n\n" +
      "あなたがコントロールする各スライムアライにバフカウンターを1個置く。",
  },

  // Slime Swarm  [ALLY]  L- NORM
  // EN: [Class Bonus] On Enter: Summon two Baby Slime tokens rested. (Apply this effect only if your champion's class matches this card's class.)
  "slime-swarm": {
    name: "スライムの群れ",
    effect:
      "［クラスボーナス］登場時：赤ちゃんスライムトークンを2体レストして召喚する。*（この効果は、あなたのチャンピオンのクラスがこのカードのクラスと一致する場合のみ適用する。）*",
  },

  // Slimecall Cyclone  [PHANTASIA]  L- WIND
  // EN: [Class Bonus] At the beginning of your recollection phase, summon a Baby Slime token. (Apply this effect only if your championâs class matches this cardâs class.)
  "slimecall-cyclone": {
    name: "スライムコールのサイクロン",
    effect:
      "［クラスボーナス］あなたのリコレクションフェイズの開始時に、赤ちゃんスライムトークンを1体召喚する。*（この効果は、あなたのチャンピオンのクラスがこのカードのクラスと一致する場合のみ適用する。）*",
  },

  // Soothing Potion  [ITEM]  L- WATER
  // EN: Brew â Two Herbs with the same name (You may sacrifice the listed objects rather than pay this cardâs reserve cost.) /  / Sacrifice Soothing Potion: Draw a card and recover 3. If Soothing Potion was brewed, draw an additional card.
  "soothing-potion": {
    name: "癒しのポーション",
    effect:
      "ブリュー — 同じ名前のハーブ2つ *（このカードのリザーブコストを支払う代わりに、記載されたオブジェクトをサクリファイスしてよい。）*\n\n" +
      "「癒しのポーション」をサクリファイスする：カードを1枚引き、リカバー3する。「癒しのポーション」がブリューされていた場合、追加でカードを1枚引く。",
  },

  // Spark Fairy  [ALLY]  L- FIRE
  // EN: Stealth (This unit can't be targeted by attacks unless permitted by true sight.) /  / On Enter: Target non-champion object gains âAt the beginning of your recollection phase, deal 1 unpreventable damage to your championâ for as long as you control Spark Fairy.
  "spark-fairy": {
    name: "火花の妖精",
    effect:
      "ステルス *（このユニットは、トゥルーサイトによって許可されないかぎり、攻撃の対象にできない。）*\n\n" +
      "登場時：あなたが「火花の妖精」をコントロールしているかぎり、対象のチャンピオンでないオブジェクトは「あなたのリコレクションフェイズの開始時に、あなたのチャンピオンに1点の軽減不能のダメージを与える」を得る。",
  },

  // Sparkling Adornment  [ACTION]  L- NORM
  // EN: As an additional cost to activate this card, remove one or more sheen counters from an object on the field. /  / Put X sheen counters on target unit, where X is the amount of counters removed. /  / [Merlin Bonus] Floating Memory
  "sparkling-adornment": {
    name: "きらめく装飾",
    effect:
      "このカードを起動するための追加コストとして、戦場のオブジェクトからシーンカウンターを1個以上取り除く。\n\n" +
      "対象のユニットにシーンカウンターをX個置く。Xは取り除いたカウンターの数。\n\n" +
      "［マーリンボーナス］フローティングメモリー",
  },

  // Speed Potion  [ITEM]  L- WIND
  // EN: Brew â Two Herbs  /  / On Enter: If Speed Potion was brewed, draw a card. /  / Sacrifice Speed Potion: You gain agility 3 for this turn. (Agility 3 â Return three cards from your memory to your hand at the beginning of the end phase.)
  "speed-potion": {
    name: "スピードポーション",
    effect:
      "ブリュー — ハーブ2つ\n\n" +
      "登場時：「スピードポーション」がブリューされていた場合、カードを1枚引く。\n\n" +
      "「スピードポーション」をサクリファイスする：このターン、あなたはアジリティ3を得る。*（アジリティ3 — エンドフェイズの開始時に、あなたのメモリーから3枚を手札に戻す。）*",
  },

  // Spirit Blade: Ensoul  [ACTION]  L- CRUX
  // EN: Choose any amount of Sword weapon cards with memory cost 1 or less from your banishment and/or material deck and put them onto the field. Until end of turn, Sword weapons you control can attack as though they were allies. At the beginning of your next end phase, sacrifice all Sword weapons you control.
  "spirit-blade-ensoul": {
    name: "スピリットブレード：魂込め",
    effect:
      "あなたの追放領域および／またはマテリアルデッキからメモリーコスト1以下の剣武器カードを好きな数選び、それらを戦場に出す。ターン終了時まで、あなたがコントロールする剣武器はアライであるかのように攻撃できる。あなたの次のエンドフェイズの開始時に、あなたがコントロールするすべての剣武器をサクリファイスする。",
  },

  // Spirit of Chess  [CHAMPION]  L0 NORM
  // EN: On Enter: Draw seven cards. /  / Inherited Effect â Ignore the elemental requirements of non-advanced element Chessman cards you play.
  "spirit-of-chess": {
    name: "チェスの精霊",
    effect:
      "登場時：カードを7枚引く。\n\n" +
      "継承効果 — あなたがプレイする非アドバンスドエレメントのチェスマンカードのエレメント条件を無視する。",
  },

  // Spirit of Serene Fire  [CHAMPION]  L0 FIRE
  // EN: On Enter: Glimpse 6. Draw six cards. /  / Lineage Release â Recover 6. (Activate this ability by banishing this card from your champion's inner lineage.)
  "spirit-of-serene-fire": {
    name: "静穏なる炎の精霊",
    effect:
      "登場時：グリンプス6する。カードを6枚引く。\n\n" +
      "リネージュリリース — リカバー6する。*（この能力は、あなたのチャンピオンのインナーリネージュからこのカードを追放することで起動する。）*",
  },

  // Spirit of Serene Water  [CHAMPION]  L0 WATER
  // EN: On Enter: Glimpse 6. Draw six cards.  /  / Lineage Release â Recover 6. (Activate this ability by banishing this card from your champion's inner lineage.)
  "spirit-of-serene-water": {
    name: "静穏なる水の精霊",
    effect:
      "登場時：グリンプス6する。カードを6枚引く。\n\n" +
      "リネージュリリース — リカバー6する。*（この能力は、あなたのチャンピオンのインナーリネージュからこのカードを追放することで起動する。）*",
  },

  // Spirit of Serene Wind  [CHAMPION]  L0 WIND
  // EN: On Enter: Glimpse 6. Draw six cards.  /  / Lineage Release â Recover 6. (Activate this ability by banishing this card from your champion's inner lineage.)
  "spirit-of-serene-wind": {
    name: "静穏なる風の精霊",
    effect:
      "登場時：グリンプス6する。カードを6枚引く。\n\n" +
      "リネージュリリース — リカバー6する。*（この能力は、あなたのチャンピオンのインナーリネージュからこのカードを追放することで起動する。）*",
  },

  // Spirit Shard  [TOKEN/PHANTASIA]  L- NORM
  // EN: [Level 3+] Sacrifice Spirit Shard: Draw a card.
  "spirit-shard": {
    name: "精霊の欠片",
    effect: "［レベル3以上］「精霊の欠片」をサクリファイスする：カードを1枚引く。",
  },

  // Splashing Perch  [ACTION]  L- WATER
  // EN: If your champion is distant, draw a card. Otherwise, your champion becomes distant. (Units stay distant until the end of their controller's turn.)
  "splashing-perch": {
    name: "水しぶきの止まり木",
    effect:
      "あなたのチャンピオンがディスタントの場合、カードを1枚引く。そうでない場合、あなたのチャンピオンはディスタントになる。*（ユニットはコントローラーのターン終了までディスタントのままである。）*",
  },

  // Spring Cleaning  [ACTION]  L- NORM
  // EN: Put one of your omens into your graveyard. If you do, look at the top three cards of your deck. Banish one of them and put an omen counter on it. Put the rest on the bottom of your deck in any order. /  / [Ciel Bonus] Floating Memory
  "spring-cleaning": {
    name: "大掃除",
    effect:
      "あなたのオーメンを1つあなたの墓地に置く。そうしたなら、あなたのデッキの一番上から3枚を見る。そのうち1枚を追放し、それにオーメンカウンターを1個置く。残りを好きな順番でデッキの一番下に置く。\n\n" +
      "［シエルボーナス］フローティングメモリー",
  },

  // Springleaf  [TOKEN/ITEM]  L- NORM
  // EN: Sacrifice Springleaf: Put a card from your hand on the bottom of your deck. If you do, draw a card.
  "springleaf": {
    name: "スプリングリーフ",
    effect:
      "「スプリングリーフ」をサクリファイスする：あなたの手札からカードを1枚デッキの一番下に置く。そうしたなら、カードを1枚引く。",
  },

  // Spurred Gallop  [ACTION]  L- WIND
  // EN: The next Horse ally card you activate this turn can be activated as though it had fast activation. /  / Draw a card into your memory. The next Horse ally card you activate this turn costs (2) less to activate.
  "spurred-gallop": {
    name: "拍車の疾走",
    effect:
      "このターン、あなたが起動する次の馬アライカードは、ファスト起動を持つかのように起動できる。\n\n" +
      "カードを1枚あなたのメモリーに引く。このターン、あなたが起動する次の馬アライカードは起動コストが(2)少なくなる。",
  },

  // Stalwart Shieldmate  [ALLY]  L- NORM
  // EN: Taunt (While awake, this ally must be targeted before other objects you control during your opponents' attack declarations if able.) /  / Floating Memory (While paying for a memory cost, you may banish this card from your graveyard to pay for 1 of that cost.)
  "stalwart-shieldmate": {
    name: "頼もしき盾の相棒",
    effect:
      "タウント *（アウェイクの間、可能ならこのアライは対戦相手の攻撃宣言時にあなたがコントロールする他のオブジェクトより先に対象にされなければならない。）*\n\n" +
      "フローティングメモリー *（メモリーコストを支払う際、あなたはこのカードを墓地から追放してそのコストの1分を支払ってよい。）*",
  },

  // Starlit Apothecary  [UNIQUE/DOMAIN]  L- ASTRA
  // EN: [Arisanna Bonus] At the beginning of your recollection phase, summon a token copy of target Potion or Herb you control unless an opponent pays (4). If the summoned token is a Potion, it becomes brewed. (Each opponent decides to pay or not to pay the optional cost in turn order until one does.)
  "starlit-apothecary": {
    name: "星明かりの薬師",
    effect:
      "［アリサナボーナス］あなたのリコレクションフェイズの開始時に、対戦相手が(4)を支払わないかぎり、あなたがコントロールする対象のポーションまたはハーブのトークンコピーを1つ召喚する。召喚されたトークンがポーションの場合、それはブリューされた状態になる。*（各対戦相手はターン順に、1人が支払うまで、この任意コストを支払うか支払わないかを決める。）*",
  },

  // Stellar Bloom  [ACTION]  L- ASTRA
  // EN: [Class Bonus] Starcalling â (2) (As you're looking at this card while glimpsing, you may activate it by paying this cost. If you do, put all other cards you're looking at on the bottom of your deck in any order.) /  / Gather four times.
  "stellar-bloom": {
    name: "星の開花",
    effect:
      "［クラスボーナス］スターコーリング — (2) *（グリンプス中にこのカードを見ている際、あなたはこのコストを支払うことでこれを起動してよい。そうしたなら、あなたが見ている他のすべてのカードを好きな順番でデッキの一番下に置く。）*\n\n" +
      "4回ギャザーする。",
  },

  // Stellar Cosmos  [REGALIA/WEAPON]  L- ASTRA
  // EN: [Class Bonus] Spellshroud /  / [Diana Bonus] On Charge 3: Stellar Cosmos gains "Aethercharge cards you look at while glimpsing have aethercalling."
  "stellar-cosmos": {
    name: "星辰のコスモス",
    effect:
      "［クラスボーナス］スペルシュラウド\n\n" +
      "［ダイアナボーナス］チャージ3時：「星辰のコスモス」は「あなたがグリンプス中に見るエーテルチャージカードはエーテルコーリングを持つ。」を得る。",
  },

  // Stifling Aethercharge  [ACTION]  L- WIND
  // EN: Negate all on enter triggers from target ally.  /  / You may load Stifling Aethercharge into an Aetherwing weapon you control.
  "stifling-aethercharge": {
    name: "抑圧のエーテルチャージ",
    effect:
      "対象のアライのすべての登場時誘発を打ち消す。\n\n" +
      "あなたは「抑圧のエーテルチャージ」を、あなたがコントロールするエーテルウィング武器にロードしてよい。",
  },

  // Stifling Gyre  [UNIQUE/PHANTASIA]  L- WIND
  // EN: As Stifling Gyre enters the field, choose an ally card name. /  / On Enter: Draw a card into your memory. /  / Whenever an on enter ability of an ally with the chosen name triggers, negate that trigger unless its controller pays (4). /  / 
  "stifling-gyre": {
    name: "抑圧の旋風",
    effect:
      "「抑圧の旋風」が戦場に出る際、アライカード名を1つ選ぶ。\n\n" +
      "登場時：カードを1枚あなたのメモリーに引く。\n\n" +
      "選ばれた名前を持つアライの登場時能力が誘発するたび、そのコントローラーが(4)を支払わないかぎり、その誘発を打ち消す。",
  },

  // Stillwater Patrol  [ALLY]  L- WATER
  // EN: True Sight (This ally can attack units with stealth.) /  / As long as Stillwater Patrol is attacking a unit with stealth, Stillwater Patrol gets +1 POWER.
  "stillwater-patrol": {
    name: "静水の巡視隊",
    effect:
      "トゥルーサイト *（このアライはステルスを持つユニットを攻撃できる。）*\n\n" +
      "「静水の巡視隊」がステルスを持つユニットを攻撃しているかぎり、「静水の巡視隊」は＋1パワーを得る。",
  },

  // Stocked Outpost  [DOMAIN]  L- NORM
  // EN: (Siegeable â This domain can be attacked. It takes damage in the form of removing durability counters.) /  / On Enter: Draw a card into your memory. /  / On Destroy: If it's an opponent's turn, that opponent draws a card into their memory. / 
  "stocked-outpost": {
    name: "備蓄された前哨基地",
    effect:
      "*（シージアブル — このドメインは攻撃できる。耐久カウンターを取り除く形でダメージを受ける。）*\n\n" +
      "登場時：カードを1枚あなたのメモリーに引く。\n\n" +
      "破壊時：対戦相手のターンである場合、その対戦相手はカードを1枚自分のメモリーに引く。",
  },

  // Stormblade Squire  [ALLY]  L- ARCANE
  // EN: On Attack: You may banish a card at random from your memory. If you do, scavenge 2+X for an arcane element card, where X is the reserve cost of the banished card.
  "stormblade-squire": {
    name: "嵐刃の従者",
    effect:
      "攻撃時：あなたのメモリーからランダムにカードを1枚追放してよい。そうしたなら、スカベンジ2＋X（アーケインエレメント）。Xはその追放されたカードのリザーブコスト。",
  },

  // Strike of Singularity  [ATTACK]  L- LUXEM
  // EN: [Class Bonus] As long as the attacker is attacking a unit controlled by a player with no cards in their hand, Strike of Singularity has "If this attack would deal damage, it deals double that damage instead." 
  "strike-of-singularity": {
    name: "特異点の一撃",
    effect:
      "［クラスボーナス］攻撃者が手札にカードがないプレイヤーがコントロールするユニットを攻撃しているかぎり、「特異点の一撃」は「この攻撃がダメージを与える場合、代わりにそのダメージの2倍を与える。」を持つ。",
  },

  // Summon Retinue  [ACTION]  L- WIND
  // EN: Summon two Vacuous Servant tokens rested. Then if you have three or more omens, wake them up.
  "summon-retinue": {
    name: "従者の召集",
    effect:
      "空虚な従者トークンを2体レストして召喚する。その後、あなたがオーメンを3つ以上持っている場合、それらをアウェイクにする。",
  },

  // Surging Obstruction  [ACTION]  L- WATER
  // EN: As long as you control a Chessman Bishop ally, this card costs 1 less to activate.  /  / Negate target card activation unless its controller pays (1). If that card has an odd reserve cost, negate its activation unless its controller pays (3) instead. (Zero is considered even.)
  "surging-obstruction": {
    name: "押し寄せる妨害",
    effect:
      "あなたがチェスマンビショップアライをコントロールしているかぎり、このカードは起動コストが1少なくなる。\n\n" +
      "そのコントローラーが(1)を支払わないかぎり、対象のカードの起動を打ち消す。そのカードのリザーブコストが奇数の場合、代わりにそのコントローラーが(3)を支払わないかぎり、その起動を打ち消す。*（0は偶数とみなす。）*",
  },

  // Surging Search  [ACTION]  L- ARCANE
  // EN: Scavenge 6 for an arcane element card. (To scavenge an amount, reveal cards from the top of your deck until you reveal that many cards or until you reveal the specified card. Put the specified card into your hand and the rest on the bottom of your deck in a random order.) /  / [Class Bonus] Floating Memory
  "surging-search": {
    name: "押し寄せる探索",
    effect:
      "スカベンジ6（アーケインエレメント）。*（ある量をスカベンジするには、その枚数のカードを公開するか指定されたカードを公開するまで、デッキの一番上からカードを公開する。指定されたカードを手札に入れ、残りをランダムな順番でデッキの一番下に置く。）*\n\n" +
      "［クラスボーナス］フローティングメモリー",
  },

  // Table Straight  [ACTION]  L- NORM
  // EN: Reveal any amount of Suited cards from your memory. Depending on the length of the longest consecutive streak of reserve costs among cards revealed this way and Suited allies you controlâ  / â¢ 2, 3, or 4â Draw a card. / â¢ 5 or 6â Draw two cards. / â¢ 7 or moreâ Draw three cards.
  "table-straight": {
    name: "テーブルストレート",
    effect:
      "あなたのメモリーから好きな数のスートカードを公開する。この方法で公開したカードおよびあなたがコントロールするスートアライの中で、最も長く連続するリザーブコストの連なりの長さに応じて——\n" +
      "・2、3、または4 — カードを1枚引く。\n" +
      "・5または6 — カードを2枚引く。\n" +
      "・7以上 — カードを3枚引く。",
  },

  // Tempestuous Seraphim  [ALLY]  L- WIND
  // EN: Fast Activation /  / Advanced Imbue 2 (You may reserve all cards revealed as you activate this card. If at least two of them are advanced element, this card becomes imbued.) /  / On Enter: As a Spell, if Tempestuous Seraphim is imbued, deal 4 damage to target attacking ally.
  "tempestuous-seraphim": {
    name: "嵐のセラフィム",
    effect:
      "ファスト起動\n\n" +
      "アドバンスド・インビュー2 *（あなたはこのカードを起動する際、公開したすべてのカードをリザーブしてよい。そのうち少なくとも2枚がアドバンスドエレメントの場合、このカードはインビュー状態になる。）*\n\n" +
      "登場時：スペルとして、「嵐のセラフィム」がインビュー状態の場合、対象の攻撃しているアライに4点のダメージを与える。",
  },

  // Templar of the Eternal  [ALLY]  L- CRUX
  // EN: [Class Bonus] Prevent all combat damage that would be dealt to Templar of the Eternal.  /  / [Class Bonus] (2), Return a regalia you control to its owner's material deck: Put a buff counter on Templar of the Eternal, and it gains spellshroud until end of turn.
  "templar-of-the-eternal": {
    name: "永遠の聖堂騎士",
    effect:
      "［クラスボーナス］「永遠の聖堂騎士」に与えられる戦闘ダメージをすべて軽減する。\n\n" +
      "［クラスボーナス］(2)、あなたがコントロールするレガリアを1つオーナーのマテリアルデッキに戻す：「永遠の聖堂騎士」にバフカウンターを1個置き、それはターン終了時までスペルシュラウドを得る。",
  },

  // Tera Sight  [ACTION]  L- TERA
  // EN: Preserve (Put this card into its owner's material deck preserved as it resolves. As you materialize, you may instead return a preserved card to your hand.) /  / Draw a card.
  "tera-sight": {
    name: "テラの視",
    effect:
      "プリザーブ *（このカードは解決される際、プリザーブしてオーナーのマテリアルデッキに置く。マテリアライズする際、代わりにプリザーブされたカードを1枚手札に戻してよい。）*\n\n" +
      "カードを1枚引く。",
  },

  // The Majestic Spirit  [REGALIA/ALLY]  L- CRUX
  // EN: Intercept, True Sight, Vigor /  / Champions you control have spellshroud. /  / If another crux element unit you control would take damage, prevent half of that damage, rounded up.
  "the-majestic-spirit": {
    name: "荘厳なる精霊",
    effect:
      "インターセプト、トゥルーサイト、ヴィガー\n\n" +
      "あなたがコントロールするチャンピオンはスペルシュラウドを持つ。\n\n" +
      "あなたがコントロールする別のクラックスエレメントのユニットがダメージを受ける場合、そのダメージの半分（端数切り上げ）を軽減する。",
  },

  // Thousand Refractions  [ATTACK]  L- LUXEM
  // EN: Prepare 1 (You may remove a preparation counter from your champion as you activate this card.) /  / [Class Bonus] On Hit: If Thousand Refractions was prepared, wake up your champion and return Thousand Refractions to its owner's hand.
  "thousand-refractions": {
    name: "千の屈折",
    effect:
      "プレパレーション1 *（あなたはこのカードを起動する際、あなたのチャンピオンからプレパレーションカウンターを1個取り除いてよい。）*\n\n" +
      "［クラスボーナス］ヒット時：「千の屈折」がプレパレーションされていた場合、あなたのチャンピオンをアウェイクにし、「千の屈折」をオーナーの手札に戻す。",
  },

  // Three of Diamonds  [ALLY]  L- WATER
  // EN: Retort 3 /  / Cardistry â (3): Look at the top three cards of your deck. Put one of them into your graveyard and the rest back on top of your deck in any order. This ability costs (1) less to activate for each Suited object you control with different reserve costs. Activate this ability only once.
  "three-of-diamonds": {
    name: "ダイヤの3",
    effect:
      "リトート3\n\n" +
      "カーディストリ — (3)：あなたのデッキの一番上から3枚を見る。そのうち1枚をあなたの墓地に置き、残りを好きな順番でデッキの一番上に戻す。この能力は、あなたがコントロールする異なるリザーブコストを持つスートオブジェクト1つにつき、起動コストが(1)少なくなる。この能力は1回のみ起動する。",
  },

  // Three of Spades  [ALLY]  L- NORM
  // EN: Cardistry â (3): Target Suited ally you control gets +2LIFE until end of turn. This ability costs (1) less to activate for each Suited object you control with different reserve costs. Activate this ability only once.
  "three-of-spades": {
    name: "スペードの3",
    effect:
      "カーディストリ — (3)：あなたがコントロールする対象のスートアライは、ターン終了時まで＋2ライフを得る。この能力は、あなたがコントロールする異なるリザーブコストを持つスートオブジェクト1つにつき、起動コストが(1)少なくなる。この能力は1回のみ起動する。",
  },

  // Tidal Sweep  [ATTACK]  L- WATER
  // EN: Cleave (Attack all units a chosen opponent controls. This attack can't be intercepted.) /  / [Class Bonus] Floating Memory (While paying for a memory cost, you may banish this card from your graveyard to pay for 1 of that cost.)
  "tidal-sweep": {
    name: "潮の一掃",
    effect:
      "クリーブ *（選んだ対戦相手がコントロールするすべてのユニットを攻撃する。この攻撃はインターセプトされない。）*\n\n" +
      "［クラスボーナス］フローティングメモリー *（メモリーコストを支払う際、あなたはこのカードを墓地から追放してそのコストの1分を支払ってよい。）*",
  },

  // Titan Mk II  [TOKEN/ALLY]  L- NEOS
  // EN: Taunt, Vigor
  "titan-mk-ii": {
    name: "タイタン Mk II",
    effect: "タウント、ヴィガー",
  },

  // Tomb Sweep  [ACTION]  L- NORM
  // EN: [Level 1+] This card costs 1 less to activate. (Apply this effect only if your champion is level 1 or higher.) /  / Banish target card in a graveyard.
  "tomb-sweep": {
    name: "墓の一掃",
    effect:
      "［レベル1以上］このカードは起動コストが1少なくなる。*（この効果は、あなたのチャンピオンがレベル1以上の場合のみ適用する。）*\n\n" +
      "墓地にある対象のカードを追放する。",
  },

  // Tor, Realmwalker Colossus  [UNIQUE/DOMAIN]  L- NEOS
  // EN: Tor can attack as though it were an ally. /  / Tor gets +1POWER for every four durability counters on it. /  / [Class Bonus] On Enter: Sacrifice up to three domains. For each domain sacrificed this way, put 2+X durability counters on Tor where X is that domain's reserve cost. /  / 
  "tor-realmwalker-colossus": {
    name: "トール、界渡りの巨像",
    effect:
      "「トール」はアライであるかのように攻撃できる。\n\n" +
      "「トール」は、それの上の耐久カウンター4個につき、＋1パワーを得る。\n\n" +
      "［クラスボーナス］登場時：ドメインを最大3つサクリファイスする。この方法でサクリファイスした各ドメインにつき、「トール」に2＋X個の耐久カウンターを置く。Xはそのドメインのリザーブコスト。",
  },

  // Transfusive Aura  [PHANTASIA]  L- EXIA
  // EN: On Enter: Draw a card into your memory. /  / [Damage 20+] If you would recover an amount, recover 2+X instead, where X is that amount.
  "transfusive-aura": {
    name: "輸血のオーラ",
    effect:
      "登場時：カードを1枚あなたのメモリーに引く。\n\n" +
      "［ダメージ20以上］あなたが何らかの量をリカバーする場合、代わりにリカバー2＋Xする。Xはその量。",
  },

  // Trine Recursion  [ACTION]  L- ASTRA
  // EN: Put target card in a graveyard into its owner's deck third from the top.
  "trine-recursion": {
    name: "三分の回帰",
    effect: "墓地にある対象のカードをオーナーのデッキの上から3番目に置く。",
  },

  // Triumphant Mechanic  [ALLY]  L- NEOS
  // EN: On Enter: If you control three or more tokens, draw a card into your memory.  /  / On Attack: If you control three or more tokens, recover 3.
  "triumphant-mechanic": {
    name: "勝ち誇る整備士",
    effect:
      "登場時：あなたが3体以上のトークンをコントロールしている場合、カードを1枚あなたのメモリーに引く。\n\n" +
      "攻撃時：あなたが3体以上のトークンをコントロールしている場合、リカバー3する。",
  },

  // Trivial Trinket  [REGALIA/ITEM]  L- NORM
  // EN: Banish Trivial Trinket: Target opponent puts the top three cards of their deck into their graveyard.
  "trivial-trinket": {
    name: "ありふれた装飾品",
    effect:
      "「ありふれた装飾品」を追放する：対象の対戦相手は自分のデッキの一番上から3枚を自分の墓地に置く。",
  },

  // Trump Set  [ACTION]  L- NORM
  // EN: [Class Bonus] This card costs 1 less to activate. (Apply this effect only if your champion's class matches this card's class) /  / Change the target of an attack to a Suited ally you control. If you do, that ally gets +3POWER and +3LIFE until end of turn.
  "trump-set": {
    name: "切り札の組",
    effect:
      "［クラスボーナス］このカードは起動コストが1少なくなる。*（この効果は、あなたのチャンピオンのクラスがこのカードのクラスと一致する場合のみ適用する。）*\n\n" +
      "攻撃の対象を、あなたがコントロールするスートアライに変更する。そうしたなら、そのアライは、ターン終了時まで＋3パワーと＋3ライフを得る。",
  },

  // Tune Up  [ACTION]  L- NORM
  // EN: Recover 2. If you control an Automaton ally, recover 4 instead. /  / Floating Memory (While paying for a memory cost, you may banish this card from your graveyard to pay for 1 of that cost.)
  "tune-up": {
    name: "チューンアップ",
    effect:
      "リカバー2する。あなたがオートマトンアライをコントロールしている場合、代わりにリカバー4する。\n\n" +
      "フローティングメモリー *（メモリーコストを支払う際、あなたはこのカードを墓地から追放してそのコストの1分を支払ってよい。）*",
  },

  // Turbo Charge  [ACTION]  L- NORM
  // EN: As an additional cost to activate this card, sacrifice a Powercell. /  / Draw two cards.
  "turbo-charge": {
    name: "ターボチャージ",
    effect:
      "このカードを起動するための追加コストとして、パワーセルを1つサクリファイスする。\n\n" +
      "カードを2枚引く。",
  },

  // Twingale Parry  [ACTION]  L- WIND
  // EN: Prevent the next 2 combat damage that would be dealt to target unit this turn. /  / [Class Bonus] Ephemerate â (2). Activate this card this way only if you control a Sword weapon. 
  "twingale-parry": {
    name: "双風の受け流し",
    effect:
      "このターン、対象のユニットに与えられる次の2点の戦闘ダメージを軽減する。\n\n" +
      "［クラスボーナス］エフェメレート — (2)。この方法でこのカードを起動するのは、あなたが剣武器をコントロールしている場合のみである。",
  },

  // Twinstar Tonic  [ITEM]  L- ASTRA
  // EN: [Arisanna Bonus] Brew â Two Blightroot, Two Silvershine, Two Razorvine /  / Sacrifice Twinstar Tonic: For the rest of the game, whenever you starcall a card, you may copy that activation. If you do, you may choose new targets for that copy. 
  "twinstar-tonic": {
    name: "双星のトニック",
    effect:
      "［アリサナボーナス］ブリュー — ブライトルート2つ、シルバーシャイン2つ、レイザーヴァイン2つ\n\n" +
      "「双星のトニック」をサクリファイスする：このゲームの残りの間、あなたがカードをスターコールするたび、あなたはその起動をコピーしてよい。そうしたなら、そのコピーの新しい対象を選んでよい。",
  },

  // Two of Diamonds  [ALLY]  L- WATER
  // EN: Retort 2 /  / Cardistry â (2): Empower 2. This ability costs (1) less to activate for each Suited object you control with different reserve costs. Activate this ability only once.
  "two-of-diamonds": {
    name: "ダイヤの2",
    effect:
      "リトート2\n\n" +
      "カーディストリ — (2)：エンパワー2する。この能力は、あなたがコントロールする異なるリザーブコストを持つスートオブジェクト1つにつき、起動コストが(1)少なくなる。この能力は1回のみ起動する。",
  },

  // Two of Spades  [ALLY]  L- NORM
  // EN: Fast Activation (You may activate this card at fast speed.) /  / Cardistry â (2): Put a buff counter on Two of Spades. This ability costs (1) less to activate for each Suited object you control with different reserve costs. Activate this ability only once.
  "two-of-spades": {
    name: "スペードの2",
    effect:
      "ファスト起動 *（あなたはこのカードをファストスピードで起動してよい。）*\n\n" +
      "カーディストリ — (2)：「スペードの2」にバフカウンターを1個置く。この能力は、あなたがコントロールする異なるリザーブコストを持つスートオブジェクト1つにつき、起動コストが(1)少なくなる。この能力は1回のみ起動する。",
  },

  // Umbra Sight  [ACTION]  L- UMBRA
  // EN: Draw a card. /  / You may draw a card into your memory and put Umbra Sight on the bottom of your champion's lineage. When you do, deal 2 unpreventable damage to your champion for each Curse card in your champion's lineage.
  "umbra-sight": {
    name: "アンブラの視",
    effect:
      "カードを1枚引く。\n\n" +
      "あなたはカードを1枚あなたのメモリーに引き、「アンブラの視」をあなたのチャンピオンのリネージュの一番下に置いてよい。そうしたとき、あなたのチャンピオンのリネージュにある呪いカード1枚につき、あなたのチャンピオンに2点の軽減不能のダメージを与える。",
  },

  // Unbroken Mustang  [ALLY]  L- NORM
  // EN: On Enter: Destroy up to one target item or weapon with memory cost 0 or reserve cost 3 or less.
  "unbroken-mustang": {
    name: "不屈のマスタング",
    effect:
      "登場時：メモリーコスト0またはリザーブコスト3以下の対象のアイテムまたは武器を最大1つ破壊する。",
  },

  // Unforgotten Will  [ACTION]  L- NORM
  // EN: Banish Unforgotten Will and put an omen counter on it. If you do, draw a card into your memory. /  / As long as Unforgotten Will is an omen, cards you activate with reserve cost 3 cost 1 more to activate.
  "unforgotten-will": {
    name: "忘れ得ぬ意志",
    effect:
      "「忘れ得ぬ意志」を追放し、それにオーメンカウンターを1個置く。そうしたなら、カードを1枚あなたのメモリーに引く。\n\n" +
      "「忘れ得ぬ意志」がオーメンであるかぎり、あなたが起動するリザーブコスト3のカードは起動コストが1多くなる。",
  },

  // Unstable Voltage  [ACTION]  L- ARCANE
  // EN: Deal D6+D6 damage to target ally. (Roll a six-sided die to determine each instance of D6 as this effect resolves.)
  "unstable-voltage": {
    name: "不安定な電圧",
    effect:
      "対象のアライにD6＋D6点のダメージを与える。*（この効果が解決される際、6面ダイスを振って各D6の値を決定する。）*",
  },

  // Uther, Illustrious King  [UNIQUE/ALLY]  L- LUXEM
  // EN: Intercept, Vigor /  / On Enter: You may rest Uther. When you do, banish another target non-champion object. /  / On Leave: Return the banished object to the field under its owner's control rested.
  "uther-illustrious-king": {
    name: "ウーサー、輝ける王",
    effect:
      "インターセプト、ヴィガー\n\n" +
      "登場時：あなたは「ウーサー」をレストしてよい。そうしたとき、別の対象のチャンピオンでないオブジェクトを追放する。\n\n" +
      "退場時：その追放されたオブジェクトをオーナーのコントロール下でレストして戦場に戻す。",
  },

  // Vacuous Servant  [TOKEN/ALLY]  L- WIND
  // EN: [Ciel Bonus] Vacuous Servant gets +1 POWER for each attack omen you have and +1 LIFE for each ally omen you have.
  "vacuous-servant": {
    name: "空虚な従者",
    effect:
      "［シエルボーナス］「空虚な従者」は、あなたが持つ攻撃オーメン1つにつき＋1パワー、あなたが持つアライオーメン1つにつき＋1ライフを得る。",
  },

  // Valiant Protector  [ALLY]  L- NORM
  // EN: [Class Bonus] Bulwark (This ally enters the field with a bulwark counter on it. If combat damage would be dealt to an ally with any bulwark counters on it, remove one and prevent that damage instead.)
  "valiant-protector": {
    name: "勇敢な守護者",
    effect:
      "［クラスボーナス］バルワーク *（このアライはバルワークカウンターを1個乗せて戦場に出る。バルワークカウンターが乗っているアライに戦闘ダメージが与えられる場合、代わりにそれを1個取り除き、そのダメージを軽減する。）*",
  },

  // Vanish from Sight  [ACTION]  L- NORM
  // EN: Activate this card only during an opponent's recollection phase. /  / Your champion gains stealth until end of turn.
  "vanish-from-sight": {
    name: "視界からの消失",
    effect:
      "このカードは対戦相手のリコレクションフェイズ中にのみ起動する。\n\n" +
      "あなたのチャンピオンは、ターン終了時までステルスを得る。",
  },

  // Vantage Point  [ACTION]  L- NORM
  // EN: Target unit becomes distant. (Units stay distant until the end of their controllerâs turn.) /  / [Class Bonus] Ephemerate â (2) (You may activate this card from your graveyard by paying this cost. Action cards played this way become ephemeral on the effects stack.)
  "vantage-point": {
    name: "見晴らしの利く地点",
    effect:
      "対象のユニットはディスタントになる。*（ユニットはコントローラーのターン終了までディスタントのままである。）*\n\n" +
      "［クラスボーナス］エフェメレート — (2) *（あなたはこのコストを支払うことでこのカードを墓地から起動してよい。この方法でプレイしたアクションカードは、エフェクトスタック上でエフェメラルになる。）*",
  },

  // Vaporjet Shieldbearer  [ALLY]  L- WATER
  // EN: Steadfast (This ally can retaliate while rested and doesn't rest to do so.) /  / [Class Bonus] On Hit: Look at the top card of your deck. You may put that card into your graveyard.
  "vaporjet-shieldbearer": {
    name: "蒸気噴射の盾持ち",
    effect:
      "ステッドファスト *（このアライはレスト中にリタリエイトでき、そのためにレストしない。）*\n\n" +
      "［クラスボーナス］ヒット時：あなたのデッキの一番上のカードを見る。あなたはそのカードをあなたの墓地に置いてよい。",
  },

  // Varuckan Acolyte  [ALLY]  L- FIRE
  // EN: On Enter: Destroy target regalia with memory cost 0.   /  / [Level 3+] Varuckan Acolyte gets +3 POWER.
  "varuckan-acolyte": {
    name: "ヴァルッカの侍者",
    effect:
      "登場時：メモリーコスト0の対象のレガリアを破壊する。\n\n" +
      "［レベル3以上］「ヴァルッカの侍者」は＋3パワーを得る。",
  },

  // Veiling Breeze  [ACTION]  L- WIND
  // EN: Reveal any amount of wind element cards from your memory. Until end of turn, if damage would be dealt to your champion, prevent an amount of that damage equal to the amount of cards revealed this way.
  "veiling-breeze": {
    name: "覆い隠す微風",
    effect:
      "あなたのメモリーから好きな数の風エレメントのカードを公開する。ターン終了時まで、あなたのチャンピオンにダメージが与えられる場合、この方法で公開したカードの枚数に等しい量のそのダメージを軽減する。",
  },

  // Venerable Sage  [ALLY]  L- NORM
  // EN: [Kongming Bonus] Whenever your Shifting Currents change directions, Venerable Sage gets +1POWER and +1LIFE until end of turn.
  "venerable-sage": {
    name: "尊き賢者",
    effect:
      "［コンミンボーナス］あなたの「移ろう潮流」が方向を変えるたび、ターン終了時まで「尊き賢者」は＋1パワーと＋1ライフを得る。",
  },

  // Verdure of Preservation  [UNIQUE/PHANTASIA]  L- TERA
  // EN: [Kongming Bonus] Whenever your Shifting Currents change to facing the next clockwise direction, reveal the top card of your deck and put it into your material deck preserved.  /  / (3), Sacrifice Verdure of Preservation: Empower X, where X is twice the amount of preserved cards in your material deck. Activate this ability only if there are five or more preserved cards in your material deck.
  "verdure-of-preservation": {
    name: "保全の緑葉",
    effect:
      "［コンミンボーナス］あなたの「移ろう潮流」が時計回りの次の方向を向くように変わるたび、あなたのデッキの一番上のカードを公開し、プリザーブしてあなたのマテリアルデッキに置く。\n\n" +
      "(3)、「保全の緑葉」をサクリファイスする：エンパワーXする。Xはあなたのマテリアルデッキにあるプリザーブされたカードの数の2倍。この能力は、あなたのマテリアルデッキにプリザーブされたカードが5枚以上ある場合のみ起動する。",
  },

  // Vernal Talisman  [REGALIA/ITEM]  L- TERA
  // EN: As an additional cost to materialize this card, banish two preserved cards from your material deck.  /  / [Class Bonus] On Enter: Draw a card. /  / [Class Bonus] REST: Empower 3. The next time you activate an empowered tera element Spell card this turn, recover 1.
  "vernal-talisman": {
    name: "春のタリスマン",
    effect:
      "このカードをマテリアライズするための追加コストとして、あなたのマテリアルデッキからプリザーブされたカードを2枚追放する。\n\n" +
      "［クラスボーナス］登場時：カードを1枚引く。\n\n" +
      "［クラスボーナス］レスト：エンパワー3する。このターン、あなたが次にエンパワーされたテラエレメントのスペルカードを起動する際、リカバー1する。",
  },

  // Vertus, Gaia's Roar  [UNIQUE/ALLY]  L- TERA
  // EN: Pride 10 (This ally won't obey you unless your champion is level 10 or higher.) /  / [Class Bonus] On Enter: Allies you control get +1 POWER for each Animal and/or Beast ally card in your graveyard until end of turn.
  "vertus-gaias-roar": {
    name: "ヴェルタス、ガイアの咆哮",
    effect:
      "プライド10 *（このアライは、あなたのチャンピオンがレベル10以上でないかぎり、あなたに従わない。）*\n\n" +
      "［クラスボーナス］登場時：ターン終了時まで、あなたがコントロールするアライは、あなたの墓地にある動物および／または獣のアライカード1枚につき＋1パワーを得る。",
  },

  // Visceral Inversion  [ACTION]  L- UMBRA
  // EN: Target attacking ally gets -5POWER until end of turn. If Visceral Inversion is ephemeral, that ally gets -5LIFE instead. /  / Ephemerate â (3) (You may activate this card from your graveyard by paying this cost. Action cards played this way become ephemeral on the effects stack.)
  "visceral-inversion": {
    name: "内臓の反転",
    effect:
      "対象の攻撃しているアライは、ターン終了時まで－5パワーを得る。「内臓の反転」がエフェメラルの場合、代わりにそのアライは－5ライフを得る。\n\n" +
      "エフェメレート — (3) *（あなたはこのコストを支払うことでこのカードを墓地から起動してよい。この方法でプレイしたアクションカードは、エフェクトスタック上でエフェメラルになる。）*",
  },

  // Void's Cloak  [REGALIA/ITEM]  L- EXALTED,NORM
  // EN: You have spellshroud. (A player with spellshroud can't be targeted by Spells.)
  "voids-cloak": {
    name: "虚無の外套",
    effect:
      "あなたはスペルシュラウドを持つ。*（スペルシュラウドを持つプレイヤーはスペルの対象にできない。）*",
  },

  // Volcanic Crescendo  [ACTION]  L- FIRE
  // EN: Banish any amount of fire element cards from your graveyard. Empower 3+X, where X is the amount of cards banished this way. /  / Harmonize â If youâve activated a Melody card this turn, deal X damage to each champion.
  "volcanic-crescendo": {
    name: "火山のクレッシェンド",
    effect:
      "あなたの墓地から好きな数の火エレメントのカードを追放する。エンパワー3＋Xする。Xはこの方法で追放したカードの数。\n\n" +
      "ハーモナイズ — あなたがこのターンにメロディカードを起動している場合、各チャンピオンにX点のダメージを与える。",
  },

  // Volnia  [TOKEN/ITEM]  L- FIRE
  // EN: Sacrifice Volnia: As a Spell, deal 1 damage to target unit. /  / (4), Sacrifice Volnia: As a Spell, deal 4 damage to target unit.
  "volnia": {
    name: "ヴォルニア",
    effect:
      "「ヴォルニア」をサクリファイスする：スペルとして、対象のユニットに1点のダメージを与える。\n\n" +
      "(4)、「ヴォルニア」をサクリファイスする：スペルとして、対象のユニットに4点のダメージを与える。",
  },

  // Voltaic Sphere  [ACTION]  L- ARCANE
  // EN: Deal 3 damage to target unit. If that unit is an ally, deal 5 damage to it instead.  /  / [Class Bonus] Banish Voltaic Sphere from your graveyard: The next arcane element Spell card you activate this turn costs 1 less to activate.
  "voltaic-sphere": {
    name: "ヴォルタの球",
    effect:
      "対象のユニットに3点のダメージを与える。そのユニットがアライの場合、代わりにそれに5点のダメージを与える。\n\n" +
      "［クラスボーナス］「ヴォルタの球」を墓地から追放する：このターン、あなたが起動する次のアーケインエレメントのスペルカードは起動コストが1少なくなる。",
  },

  // Windmill Engineer  [ALLY]  L- WIND
  // EN: Imbue 2 (You may reserve all cards revealed as you activate this card. If at least two of them are wind element, this card becomes imbued.) /  / On Enter: If Windmill Engineer is imbued, draw a card into your memory.
  "windmill-engineer": {
    name: "風車の技師",
    effect:
      "インビュー2 *（あなたはこのカードを起動する際、公開したすべてのカードをリザーブしてよい。そのうち少なくとも2枚が風エレメントの場合、このカードはインビュー状態になる。）*\n\n" +
      "登場時：「風車の技師」がインビュー状態の場合、カードを1枚あなたのメモリーに引く。",
  },

  // Windy Leap  [ACTION]  L- WIND
  // EN: Banish target ally you control, then return it to the field under its ownerâs control rested. If it's a Ranger ally, it becomes distant. (Units stay distant until the end of their controller's turn.) / 
  "windy-leap": {
    name: "風の跳躍",
    effect:
      "あなたがコントロールする対象のアライを追放し、その後それをオーナーのコントロール下でレストして戦場に戻す。それがレンジャーアライの場合、それはディスタントになる。*（ユニットはコントローラーのターン終了までディスタントのままである。）*",
  },

  // Wisp's Protection  [ACTION]  L- CRUX
  // EN: Prevent the next 4+X damage that would be dealt to target unit this turn, where X is the amount of regalia on the field.
  "wisps-protection": {
    name: "ウィスプの守護",
    effect:
      "このターン、対象のユニットに与えられる次の4＋X点のダメージを軽減する。Xは戦場にあるレガリアの数。",
  },

  // Young Beastbonder  [ALLY]  L- NORM
  // EN: [Class Bonus] On Enter: Put a buff counter on another target ally you control. If that ally is a Beast, put two buff counters on it instead. /  / [Class Bonus] Floating Memory
  "young-beastbonder": {
    name: "若き獣の絆使い",
    effect:
      "［クラスボーナス］登場時：あなたがコントロールする別の対象のアライにバフカウンターを1個置く。そのアライが獣の場合、代わりにそれにバフカウンターを2個置く。\n\n" +
      "［クラスボーナス］フローティングメモリー",
  },

  // Zephyr  [ACTION]  L- WIND
  // EN: Suppress target ally or regalia. (To suppress an object, banish it and return it to the field under its owner's control at the beginning of the next end phase.)
  "zephyr": {
    name: "ゼファー",
    effect:
      "対象のアライまたはレガリアをサプレスする。*（オブジェクトをサプレスするには、それを追放し、次のエンドフェイズの開始時にオーナーのコントロール下で戦場に戻す。）*",
  },

  // Zinn, Volnia Abbess  [UNIQUE/ALLY]  L- FIRE
  // EN: [Arisanna Bonus] If you would summon one or more Silvershine and/or Fraysia tokens, summon that many Volnia tokens instead.
  "zinn-volnia-abbess": {
    name: "ジン、ヴォルニアの女子修道院長",
    effect:
      "［アリサナボーナス］あなたが1つ以上のシルバーシャインおよび／またはフレイシアのトークンを召喚する場合、代わりにその数のヴォルニアトークンを召喚する。",
  },
});

