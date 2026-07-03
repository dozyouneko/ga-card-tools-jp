"use strict";
// Mortal Ambition Alter Ed.（AMB Alter）翻訳。translations.js の後に読み込む。空欄は未翻訳。
window.GA_I18N = window.GA_I18N || { meta: {}, terms: {}, cards: {} };
window.GA_I18N.cards = Object.assign(window.GA_I18N.cards || {}, {

  // Bairui, Resplendent Barrier  [UNIQUE/PHANTASIA]  L- TERA
  // EN: If damage would be dealt to your champion while CARDNAME has two or less **charge** counters on it, prevent 2 of that damage and put a **charge** counter on CARDNAME instead. /  / [Kongming Bonus] **Sacrifice CARDNAME:** **Empower 7**. Activate this ability only if there are three **charge** counters on CARDNAME and only if your Shifting Currents face South.
  "bairui-resplendent-barrier": {
    name: "バイルイ、輝ける障壁",
    effect:
      "「バイルイ、輝ける障壁」の上のチャージカウンターが2個以下のときにあなたのチャンピオンにダメージが与えられる場合、そのダメージのうち2点を軽減し、代わりに「バイルイ、輝ける障壁」にチャージカウンターを1個置く。\n\n" +
      "［コンミンボーナス］「バイルイ、輝ける障壁」をサクリファイスする：エンパワー7する。この能力は、「バイルイ、輝ける障壁」の上にチャージカウンターが3個あり、かつあなたの「移ろう潮流」が南を向いている場合のみ起動する。",
  },

  // Blinding Lapse  [ACTION]  L- LUXEM
  // EN: Target opponent with **influence** nine or more puts all cards from their hand into their memory. Then that player banishes three cards at random from their memory. *(A playerâs **influence** is equal to the total amount of cards in their hand and memory.)*
  "blinding-lapse": {
    name: "目くらましの失念",
    effect:
      "インフルエンスが9以上の対象の対戦相手は、自分の手札のすべてのカードを自分のメモリーに置く。その後、そのプレイヤーは自分のメモリーからランダムに3枚を追放する。*（プレイヤーのインフルエンスは、その手札とメモリーのカードの合計枚数に等しい。）*",
  },

  // Dong Zhou, False Liege  [UNIQUE/ALLY]  L- TERA
  // EN: **Intercept** /  / [Class Bonus] **On Enter:** You may rest CARDNAME. If you do, choose twoâ / â¢ Deal 3 damage to all other allies. / â¢ **Empower 3**. / â¢ CARDNAME gains **vigor** until end of turn.
  "dong-zhou-false-liege": {
    name: "ドン・ジョウ、偽りの君主",
    effect:
      "インターセプト\n\n" +
      "［クラスボーナス］登場時：あなたは「ドン・ジョウ、偽りの君主」をレストしてよい。そうしたなら、2つ選ぶ——\n" +
      "・他のすべてのアライに3点のダメージを与える。\n" +
      "・エンパワー3する。\n" +
      "・「ドン・ジョウ、偽りの君主」はターン終了時までヴィガーを得る。",
  },

  // Dragon's Dawn  [REGALIA/WEAPON]  L- FIRE
  // EN: As an additional cost to materialize this card, banish three fire element cards from your graveyard.  /  / [Class Bonus] **On Attack:** You may discard a fire element card and have CARDNAME deal 2 unpreventable damage to your champion. If you do, this attack gets +2 [POWER] and gains "**On Champion Hit:** Draw a card."
  "dragons-dawn": {
    name: "竜の夜明け",
    effect:
      "このカードをマテリアライズするための追加コストとして、あなたの墓地から火エレメントのカードを3枚追放する。\n\n" +
      "［クラスボーナス］攻撃時：あなたは火エレメントのカードを1枚捨て、「竜の夜明け」にあなたのチャンピオンへ2点の軽減不能のダメージを与えさせてよい。そうしたなら、この攻撃は＋2パワーを得て、「チャンピオンヒット時：カードを1枚引く。」を得る。",
  },

  // Ebbing Tide  [REGALIA/ITEM]  L- WATER
  // EN: **Hindered** *(This object enters the field rested)* /  / [REST]**: Empower 2**. Activate this ability only if your Shifting Currents face East or West. /  / [REST], **Banish CARDNAME:** **Empower X**, where **X** is the amount of water element cards in your graveyard. Activate this ability only at slow speed and only if your Shifting Currents face North or South.
  "ebbing-tide": {
    name: "引き潮",
    effect:
      "ヒンダード *（このオブジェクトはレストして戦場に出る。）*\n\n" +
      "レスト：エンパワー2する。この能力は、あなたの「移ろう潮流」が東または西を向いている場合のみ起動する。\n\n" +
      "レスト、「引き潮」を追放する：エンパワーXする。Xはあなたの墓地にある水エレメントのカードの数。この能力はスロースピードでのみ、かつあなたの「移ろう潮流」が北または南を向いている場合のみ起動する。",
  },

  // Equanimity's Ashes  [ACTION]  L- FIRE
  // EN: **[Level 3+]** This card costs 3 less to activate.  /  / Deal 3 damage to target champion.  /  / **[Class Bonus]** Then if that champion has five or less damage counters on them, deal an additional 4 damage to them.
  "equanimitys-ashes": {
    name: "平静の灰",
    effect:
      "［レベル3以上］このカードは起動コストが3少なくなる。\n\n" +
      "対象のチャンピオンに3点のダメージを与える。\n\n" +
      "［クラスボーナス］その後、そのチャンピオンのダメージカウンターが5個以下の場合、それに追加で4点のダメージを与える。",
  },

  // Everflame Staff  [REGALIA/ITEM]  L- FIRE
  // EN: Whenever a fire element Spell source you control deals damage, put a **refinement** counter on CARDNAME. /  / [Class Bonus] **Banish CARDNAME:** As a Spell, deal 4 damage to target champion. Activate this ability only if there are three or more **refinement** counters on CARDNAME.
  "everflame-staff": {
    name: "永炎の杖",
    effect:
      "あなたがコントロールする火エレメントのスペルの発生源がダメージを与えるたび、「永炎の杖」に精製カウンターを1個置く。\n\n" +
      "［クラスボーナス］「永炎の杖」を追放する：スペルとして、対象のチャンピオンに4点のダメージを与える。この能力は、「永炎の杖」の上に精製カウンターが3個以上ある場合のみ起動する。",
  },

  // Floodward Sergeant  [ALLY]  L- WATER
  // EN: **Taunt** *(While awake, this ally must be targeted before other objects you control during your opponentsâ attack declarations if able.)* /  / If damage would be dealt to CARDNAME, prevent that damage. Apply this replacement effect only once each turn.
  "floodward-sergeant": {
    name: "防水の軍曹",
    effect:
      "タウント *（アウェイクの間、可能ならこのアライは対戦相手の攻撃宣言時にあなたがコントロールする他のオブジェクトより先に対象にされなければならない。）*\n\n" +
      "「防水の軍曹」にダメージが与えられる場合、そのダメージを軽減する。この置換効果は各ターンに1回のみ適用する。",
  },

  // Galvanizing Gale  [ACTION]  L- WIND
  // EN: Target ally's next attack this turn gets +3 [POWER]. If CARDNAME was **empowered**, draw a card into your memory.
  "galvanizing-gale": {
    name: "鼓舞する疾風",
    effect:
      "このターン、対象のアライの次の攻撃は＋3パワーを得る。「鼓舞する疾風」がエンパワーされていた場合、カードを1枚あなたのメモリーに引く。",
  },

  // Gustguard Bastion  [ALLY]  L- WIND
  // EN: [Class Bonus] **Fast Activation** *(You may activate this card at fast speed.)* /  / [Class Bonus] **On Enter:** Prevent the next 2 damage that would be dealt to another target unit you control this turn.
  "gustguard-bastion": {
    name: "突風防御の砦",
    effect:
      "［クラスボーナス］ファスト起動 *（あなたはこのカードをファストスピードで起動してよい。）*\n\n" +
      "［クラスボーナス］登場時：このターン、あなたがコントロールする別の対象のユニットに与えられる次の2点のダメージを軽減する。",
  },

  // Hailfinch  [ALLY]  L- WATER
  // EN: Players canât declare attacks targeting CARDNAME unless they pay (2) for each attack declaration. /  / [Class Bonus] **On Hit:** You may remove a **buff** counter from CARDNAME. If you do, rest the hit object and it doesn't wake up during its controller's next wake up phase. 
  "hailfinch": {
    name: "ヘイルフィンチ",
    effect:
      "プレイヤーは、攻撃宣言ごとに(2)を支払わないかぎり、「ヘイルフィンチ」を対象とする攻撃を宣言できない。\n\n" +
      "［クラスボーナス］ヒット時：あなたは「ヘイルフィンチ」からバフカウンターを1個取り除いてよい。そうしたなら、ヒットしたオブジェクトをレストし、それはコントローラーの次のウェイクアップフェイズにアウェイクにならない。",
  },

  // Herd of the Hearth  [ACTION]  L- FIRE
  // EN: Animal and Beast allies you control get +1 [POWER] until end of turn. Horse allies you control also gain "**On Attack:** Draw a card, then discard a card" until end of turn. /  / [Class Bonus] **Floating Memory**
  "herd-of-the-hearth": {
    name: "炉辺の群れ",
    effect:
      "ターン終了時まで、あなたがコントロールする動物および獣のアライは＋1パワーを得る。ターン終了時まで、あなたがコントロールする馬アライはさらに「攻撃時：カードを1枚引き、その後カードを1枚捨てる。」を得る。\n\n" +
      "［クラスボーナス］フローティングメモリー",
  },

  // Huang Zhong, Unerring Aim  [UNIQUE/ALLY]  L- WIND
  // EN: **Ranged 2** /  / [Class Bonus] (3), **Return CARDNAME to its owner's memory:** Ranger units you control become **distant**. This ability costs (2) less to activate as long as CARDNAME is **distant**. 
  "huang-zhong-unerring-aim": {
    name: "ホァン・ジョン、狂いなき狙い",
    effect:
      "レンジド2\n\n" +
      "［クラスボーナス］(3)、「ホァン・ジョン、狂いなき狙い」をオーナーのメモリーに戻す：あなたがコントロールするレンジャーユニットはディスタントになる。「ホァン・ジョン、狂いなき狙い」がディスタントであるかぎり、この能力は起動コストが(2)少なくなる。",
  },

  // Hua Xiong, Insurgent's Fang  [UNIQUE/ALLY]  L- NORM
  // EN: **Vigor** /  / [Jin Bonus] Polearm attack cards you activate enter the intent with +2[POWER]. /  / [Jin Bonus] **[REST], Discard a Polearm attack card**: Prevent the next 2 damage that would be dealt to target unit you control this turn.
  "hua-xiong-insurgents-fang": {
    name: "ホァ・ション、反乱者の牙",
    effect:
      "ヴィガー\n\n" +
      "［ジンボーナス］あなたが起動する長柄武器のアタックカードは＋2パワーを持ってインテントに入る。\n\n" +
      "［ジンボーナス］レスト、長柄武器のアタックカードを1枚捨てる：このターン、あなたがコントロールする対象のユニットに与えられる次の2点のダメージを軽減する。",
  },

  // Imperial Seal  [REGALIA/ITEM]  L- NORM
  // EN: **Divine Relic** *(You can only have one card with this keyword in your material deck.)* /  / **Banish CARDNAME:** All basic elements are enabled for you until end of turn. *(Fire, water, and wind are basic elements.)*
  "imperial-seal": {
    name: "皇帝の玉璽",
    effect:
      "ディヴァインレリック *（このキーワードを持つカードはマテリアルデッキに1枚しか入れられない。）*\n\n" +
      "「皇帝の玉璽」を追放する：ターン終了時まで、すべての基本エレメントがあなたにとって有効になる。*（火・水・風が基本エレメントである。）*",
  },

  // Incantation of Prosperity  [ACTION]  L- NORM
  // EN: Depending on your Shifting Currentsâ directionâ / â¢ North or Southâ **Empower 2**. / â¢ East or Westâ **Recover 2**. /  / **Floating Memory** *(While paying for a memory cost, you may banish this card from your graveyard to pay for 1 of that cost.)*
  "incantation-of-prosperity": {
    name: "繁栄の呪文",
    effect:
      "あなたの「移ろう潮流」の向きに応じて——\n" +
      "・北または南 — エンパワー2する。\n" +
      "・東または西 — リカバー2する。\n\n" +
      "フローティングメモリー *（メモリーコストを支払う際、あなたはこのカードを墓地から追放してそのコストの1分を支払ってよい。）*",
  },

  // Leading Charge  [ATTACK]  L- NORM
  // EN: [Class Bonus] As long as you control a unique Warrior ally, this card costs 2 less to activate. /  / [Class Bonus] **Floating Memory** *(While paying for a memory cost, you may banish this card from your graveyard to pay for 1 of that cost.)*
  "leading-charge": {
    name: "先陣の突撃",
    effect:
      "［クラスボーナス］あなたがユニークなウォリアーアライをコントロールしているかぎり、このカードは起動コストが2少なくなる。\n\n" +
      "［クラスボーナス］フローティングメモリー *（メモリーコストを支払う際、あなたはこのカードを墓地から追放してそのコストの1分を支払ってよい。）*",
  },

  // Lunge of Evoking Winds  [ATTACK]  L- WIND
  // EN: [Jin Bonus] **On Hit:** Reveal up to two wind element cards from your memory and return them to your hand.  /  / **Floating Memory**
  "lunge-of-evoking-winds": {
    name: "招風の突き",
    effect:
      "［ジンボーナス］ヒット時：あなたのメモリーから風エレメントのカードを最大2枚公開し、それらを手札に戻す。\n\n" +
      "フローティングメモリー",
  },

  // Magnificent Banquet  [ACTION]  L- TERA
  // EN: **Recover 5**. Then put CARDNAME into its owner's material deck **preserved**. *(If you would materialize a card, you may instead return a **preserved** card to your hand.)* /  / At the beginning of your recollection phase, if this card is in your material deck **preserved**, **recover 1**.
  "magnificent-banquet": {
    name: "華麗なる宴",
    effect:
      "リカバー5する。その後、「華麗なる宴」をプリザーブしてオーナーのマテリアルデッキに置く。*（あなたがカードをマテリアライズする場合、代わりにプリザーブされたカードを1枚手札に戻してよい。）*\n\n" +
      "あなたのリコレクションフェイズの開始時に、このカードがマテリアルデッキにプリザーブされている場合、リカバー1する。",
  },

  // Mortal Ambition  [ACTION]  L- NORM
  // EN: This card costs 2 less to activate for each unique ally you control. /  / Until end of turn, Human and Horse allies you control get +1 [LIFE] and gain **ambush** and **steadfast**.
  "mortal-ambition": {
    name: "乱世の野望",
    effect:
      "このカードは、あなたがコントロールするユニークなアライ1体につき、起動コストが2少なくなる。\n\n" +
      "ターン終了時まで、あなたがコントロールする人間および馬のアライは＋1ライフを得て、アンブッシュとステッドファストを得る。",
  },

  // Nature's Insight  [ACTION]  L- TERA
  // EN: [Class Bonus] This card costs 2 less to activate. /  / Reveal a card from your memory and put it into your material deck **preserved**. **X** is that card's reserve cost. Then reveal the top **X** cards of your deck and put them into your material deck **preserved**.
  "natures-insight": {
    name: "自然の洞察",
    effect:
      "［クラスボーナス］このカードは起動コストが2少なくなる。\n\n" +
      "あなたのメモリーからカードを1枚公開し、プリザーブしてあなたのマテリアルデッキに置く。Xはそのカードのリザーブコスト。その後、あなたのデッキの一番上からX枚を公開し、プリザーブしてあなたのマテリアルデッキに置く。",
  },

  // Oath of the Sakura  [ACTION]  L- WIND
  // EN: Put a **buff** counter on each ally you control. /  / If you control exactly three allies that are all unique, they each get +2 [POWER] until end of turn.
  "oath-of-the-sakura": {
    name: "桜の誓い",
    effect:
      "あなたがコントロールする各アライにバフカウンターを1個置く。\n\n" +
      "あなたがちょうど3体のアライをコントロールし、それらがすべてユニークである場合、それらはそれぞれターン終了時まで＋2パワーを得る。",
  },

  // Pole-armed Steed  [ALLY]  L- NORM
  // EN: [Jin Bonus] **On Enter:** Materialize a Polearm regalia card from your material deck.
  "polearmed-steed": {
    name: "長柄の軍馬",
    effect:
      "［ジンボーナス］登場時：あなたのマテリアルデッキから長柄武器のレガリアカードを1枚マテリアライズする。",
  },

  // Restoring Embers  [ACTION]  L- FIRE
  // EN: **Kindle 4** *(You may banish up to four fire element cards from your graveyard as you activate this card. Each one pays for (1) of this cardâs cost.)* /  / **Recover 4**. Then if your **influence** is four or less, draw a card into your memory. / 
  "restoring-embers": {
    name: "再生の残り火",
    effect:
      "キンドル4 *（このカードを起動する際、あなたの墓地から火エレメントのカードを最大4枚追放してよい。1枚につきこのカードのコストの(1)分を支払う。）*\n\n" +
      "リカバー4する。その後、あなたのインフルエンスが4以下の場合、カードを1枚あなたのメモリーに引く。",
  },

  // Scarlet Tassel  [REGALIA/ITEM]  L- EXIA
  // EN: **Regalia Link** *(This object enters the field linked to target regalia. If the link is broken, sacrifice this object.)* /  / (2), [REST]: Linked regalia gains **omnishroud** until end of turn. *(An object with **omnishroud** canât be targeted by activations, materializations, or triggers.)* / 
  "scarlet-tassel": {
    name: "緋色の房飾り",
    effect:
      "レガリアリンク *（このオブジェクトは対象のレガリアにリンクして戦場に出る。リンクが解除された場合、このオブジェクトをサクリファイスする。）*\n\n" +
      "(2)、レスト：リンクされたレガリアはターン終了時までオムニシュラウドを得る。*（オムニシュラウドを持つオブジェクトは、起動・マテリアライズ・誘発の対象にできない。）*",
  },

  // Sink the Mind  [ACTION]  L- WATER
  // EN: [Class Bonus] This card costs 1 less to activate.  /  / Activate this card only during an opponent's recollection phase.  /  / Until end of turn, whenever a card from the turn player's memory is put into their hand, that player puts the top card of their deck into their graveyard.
  "sink-the-mind": {
    name: "心を沈める",
    effect:
      "［クラスボーナス］このカードは起動コストが1少なくなる。\n\n" +
      "このカードは対戦相手のリコレクションフェイズ中にのみ起動する。\n\n" +
      "ターン終了時まで、ターンプレイヤーのメモリーからカードが手札に入るたび、そのプレイヤーは自分のデッキの一番上のカードを自分の墓地に置く。",
  },

  // Sundering Moon  [REGALIA/WEAPON]  L- WIND
  // EN: [Jin Bonus] **On Enter:** If you control two or more wind element allies, CARDNAME gets +1 [POWER] until end of turn. /  / [Jin Bonus] (2)**, Return CARDNAME to your material deck:** Prevent the next 1 damage that would be dealt to target unit you control this turn.
  "sundering-moon": {
    name: "断月",
    effect:
      "［ジンボーナス］登場時：あなたが2体以上の風エレメントのアライをコントロールしている場合、「断月」はターン終了時まで＋1パワーを得る。\n\n" +
      "［ジンボーナス］(2)、「断月」をあなたのマテリアルデッキに戻す：このターン、あなたがコントロールする対象のユニットに与えられる次の1点のダメージを軽減する。",
  },

  // Three Visits  [ACTION]  L- WIND
  // EN: As an additional cost to activate this card, rest your champion. /  / [Class Bonus] You may activate this card from your graveyard. If you do, banish it as it resolves. /  / [Class Bonus] You may activate this card from your banishment. If you do, put it on the bottom of your deck as it resolves. /  / **Glimpse 2** and **recover 2**.
  "three-visits": {
    name: "三顧の礼",
    effect:
      "このカードを起動するための追加コストとして、あなたのチャンピオンをレストする。\n\n" +
      "［クラスボーナス］あなたはこのカードを墓地から起動してよい。そうしたなら、それが解決される際に追放する。\n\n" +
      "［クラスボーナス］あなたはこのカードを追放領域から起動してよい。そうしたなら、それが解決される際にデッキの一番下に置く。\n\n" +
      "グリンプス2し、リカバー2する。",
  },

  // Torching Reach  [ACTION]  L- FIRE
  // EN: Draw a card, then discard a card. Then if your champion is **distant**, draw another card. 
  "torching-reach": {
    name: "焼き尽くす手",
    effect:
      "カードを1枚引き、その後カードを1枚捨てる。その後、あなたのチャンピオンがディスタントの場合、追加でカードを1枚引く。",
  },

  // Zhao Yun, Dragonsblood  [UNIQUE/ALLY]  L- EXIA
  // EN: [Class Bonus] **On Attack:** You may have CARDNAME deal 2 unpreventable damage to your champion. If you do, this attack gets +2 [POWER]. /  / [Class Bonus] **On Kill:** CARDNAME gains **immortality**. *(This effect lasts indefinitely.)*
  "zhao-yun-dragonsblood": {
    name: "ジャオ・ユン、竜のリネージュ",
    effect:
      "［クラスボーナス］攻撃時：あなたは「ジャオ・ユン、竜のリネージュ」にあなたのチャンピオンへ2点の軽減不能のダメージを与えさせてよい。そうしたなら、この攻撃は＋2パワーを得る。\n\n" +
      "［クラスボーナス］キル時：「ジャオ・ユン、竜のリネージュ」はイモータリティを得る。*（この効果は無期限に続く。）*",
  },

});
