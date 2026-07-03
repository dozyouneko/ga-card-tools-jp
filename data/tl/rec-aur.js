"use strict";
// Re:Collection Aurelian Regent（ReC-AUR）翻訳。translations.js の後に読み込む。空欄は未翻訳。
window.GA_I18N = window.GA_I18N || { meta: {}, terms: {}, cards: {} };
window.GA_I18N.cards = Object.assign(window.GA_I18N.cards || {}, {

  // Dauntless Assault  [ATTACK]  L- EXALTED,NORM
  // EN: *(Exalted â This element is enabled for you as long as you have another advanced element enabled.)* /  / [Mordred Bonus] **On Attack:** Wake up the attacker.
  "dauntless-assault": {
    name: "不屈の強襲",
    effect:
      "*（エグザルテッド — このエレメントは、あなたが他のアドバンスドエレメントを有効にしているかぎり、あなたにとって有効となる。）*\n\n" +
      "［モードレッドボーナス］攻撃時：攻撃者をアウェイクにする。",
  },

  // Deflecting Edge  [ACTION]  L- NORM
  // EN: This card costs 1 less to activate if you control a Sword weapon. /  / Prevent the next 3 combat damage that would be dealt to target unit this turn.
  "deflecting-edge": {
    name: "受け流しの刃",
    effect:
      "あなたが剣武器をコントロールしている場合、このカードは起動コストが1少なくなる。\n\n" +
      "このターン、対象のユニットに与えられる次の3点の戦闘ダメージを軽減する。",
  },

  // Drawn Blade  [REGALIA/WEAPON]  L- NORM
  // EN: [Class Bonus] **On Enter:** Draw a card. *(Apply this effect only if your champion's class matches this card's class.)*
  "drawn-blade": {
    name: "抜き放たれた刃",
    effect:
      "［クラスボーナス］登場時：カードを1枚引く。*（この効果は、あなたのチャンピオンのクラスがこのカードのクラスと一致する場合のみ適用する。）*",
  },

  // Dredging Streams  [ACTION]  L- WATER
  // EN: Banish target card from a graveyard.  /  / [Level 2+] **Floating Memory** *(While paying for a memory cost, you may banish this card from your graveyard to pay for 1 of that cost. Apply this effect only if your champion is level 2 or higher.)*
  "dredging-streams": {
    name: "浚渫の流れ",
    effect:
      "墓地にある対象のカードを追放する。\n\n" +
      "［レベル2以上］フローティングメモリー *（メモリーコストを支払う際、あなたはこのカードを墓地から追放してそのコストの1分を支払ってよい。この効果は、あなたのチャンピオンがレベル2以上の場合のみ適用する。）*",
  },

  // Drenching Finish  [ATTACK]  L- WATER
  // EN: [Class Bonus] **On Kill: **Target player puts the top three cards of their deck into their graveyard.
  "drenching-finish": {
    name: "水浸しの止め",
    effect:
      "［クラスボーナス］キル時：対象のプレイヤーは自分のデッキの一番上から3枚を自分の墓地に置く。",
  },

  // Dummy Trainer  [REGALIA/ITEM]  L- NORM
  // EN: (3)**, Banish CARDNAME:** Draw a card into your memory. Then target opponent **summons** a Training Dummy token. 
  "dummy-trainer": {
    name: "ダミートレーナー",
    effect:
      "(3)、「ダミートレーナー」を追放する：カードを1枚あなたのメモリーに引く。その後、対象の対戦相手は訓練用ダミートークンを1つ召喚する。",
  },

  // Dungeon Guide  [ALLY]  L- NORM
  // EN: **On Enter:** You may banish two cards at random from your memory. If you do, level up your champion. *(Your champion levels up into a compatible champion card from your material deck, ignoring materialization costs.)*
  "dungeon-guide": {
    name: "ダンジョンの案内人",
    effect:
      "登場時：あなたのメモリーからランダムに2枚を追放してよい。そうしたなら、あなたのチャンピオンをレベルアップする。*（あなたのチャンピオンは、マテリアライズコストを無視して、マテリアルデッキから適合するチャンピオンカードにレベルアップする。）*",
  },

  // Flawless Spirit of Mordred  [CHAMPION]  L0 WATER
  // EN: **Divine Relic** *(You can only have one card with this keyword in your material deck.)* /  / CARDNAME can only level up into a "Mordred" champion. /  / **On Enter:** Draw seven cards, then **glimpse 4**. / 
  "flawless-spirit-of-mordred": {
    name: "無欠なるモードレッドの精霊",
    effect:
      "ディヴァインレリック *（このキーワードを持つカードはマテリアルデッキに1枚しか入れられない。）*\n\n" +
      "「無欠なるモードレッドの精霊」は「モードレッド」チャンピオンにのみレベルアップできる。\n\n" +
      "登場時：カードを7枚引き、その後グリンプス4する。",
  },

  // Freezing Hail  [ACTION]  L- WATER
  // EN: Deal 2 damage to target unit. That unit doesn't wake up during its controller's next wake up phase. 
  "freezing-hail": {
    name: "凍える雹",
    effect:
      "対象のユニットに2点のダメージを与える。そのユニットは、コントローラーの次のウェイクアップフェイズにアウェイクにならない。",
  },

  // Frostsworn Paladin  [ALLY]  L- WATER
  // EN: **Intercept** *(Whenever your champion is attacked while this ally is awake, you may redirect that attack to this ally.)* /  / **On Enter:** You may banish a card with **floating memory** from your graveyard. If you do, draw a card and put a **buff** counter on CARDNAME.
  "frostsworn-paladin": {
    name: "霜誓いのパラディン",
    effect:
      "インターセプト *（このアライがアウェイクの間にあなたのチャンピオンが攻撃されるたび、あなたはその攻撃をこのアライに向け直してよい。）*\n\n" +
      "登場時：あなたの墓地からフローティングメモリーを持つカードを1枚追放してよい。そうしたなら、カードを1枚引き、「霜誓いのパラディン」にバフカウンターを1個置く。",
  },

  // Gildas, Faesworn Monarch  [UNIQUE/ALLY]  L- EXALTED,NORM
  // EN: **Stealth**, **Vigor** /  / [Mordred Bonus] (2),  [REST]: Prevent the next 4 damage that would be dealt to target unit this turn. As long as you control another Fairy ally, this ability costs (2) less to activate. *(Activate this ability only if your champion is Mordred.)*
  "gildas-faesworn-monarch": {
    name: "ギルダス、妖精誓いの君主",
    effect:
      "ステルス、ヴィガー\n\n" +
      "［モードレッドボーナス］(2)、レスト：このターン、対象のユニットに与えられる次の4点のダメージを軽減する。あなたが別の妖精アライをコントロールしているかぎり、この能力は起動コストが(2)少なくなる。*（この能力は、あなたのチャンピオンがモードレッドの場合のみ起動する。）*",
  },

  // Inspiring Call  [ACTION]  L- NORM
  // EN: This card costs 2 less to activate if your champion has attacked this turn. /  / Allies you control get +1 [POWER] until end of turn. Draw a card into your memory.
  "inspiring-call": {
    name: "鼓舞の号令",
    effect:
      "あなたのチャンピオンがこのターンに攻撃している場合、このカードは起動コストが2少なくなる。\n\n" +
      "ターン終了時まで、あなたがコントロールするアライは＋1パワーを得る。カードを1枚あなたのメモリーに引く。",
  },

  // Invigorated Slash  [ATTACK]  L- NORM
  // EN: As long as your champion has leveled up this turn, CARDNAME gets +2ï¿° [POWER].
  "invigorated-slash": {
    name: "活気づく斬撃",
    effect:
      "あなたのチャンピオンがこのターンにレベルアップしているかぎり、「活気づく斬撃」は＋2パワーを得る。",
  },

  // Lakereaving Chill  [PHANTASIA]  L- WATER
  // EN: **Item or Weapon Link** *(This object enters the field linked to target item or weapon. If the link is broken, sacrifice this object.)* /  / Linked object loses all abilities, and can't be used for an attack. 
  "lakereaving-chill": {
    name: "湖を裂く冷気",
    effect:
      "アイテム／武器リンク *（このオブジェクトは対象のアイテムまたは武器にリンクして戦場に出る。リンクが解除された場合、このオブジェクトをサクリファイスする。）*\n\n" +
      "リンクされたオブジェクトはすべての能力を失い、攻撃に使えない。",
  },

  // Luminescent Slash  [ATTACK]  L- LUXEM
  // EN: [Mordred Bonus] This card costs 2 less to activate for each other attack card you've activated this turn. /  / [Mordred Bonus] CARDNAME gets +2[POWER] for each other attack card you've activated this turn.
  "luminescent-slash": {
    name: "発光の斬撃",
    effect:
      "［モードレッドボーナス］このカードは、あなたがこのターンに起動した他のアタックカード1枚につき、起動コストが2少なくなる。\n\n" +
      "［モードレッドボーナス］「発光の斬撃」は、あなたがこのターンに起動した他のアタックカード1枚につき、＋2パワーを得る。",
  },

  // Mirrordepth's Blade  [REGALIA/WEAPON]  L- WATER
  // EN: **On Banish:** Look at the top card of your deck. You may put it into your graveyard.
  "mirrordepths-blade": {
    name: "鏡淵の刃",
    effect:
      "追放時：あなたのデッキの一番上のカードを見る。あなたはそれをあなたの墓地に置いてよい。",
  },

  // Mordred, Aurelian Regent  [CHAMPION]  L3 LUXEM
  // EN: **Mordred Lineage** /  / **On Enter:** Mordred's next attack this turn gets +3[POWER] and gains "**On Hit: Recover 3**." /  / Whenever you activate a luxem element card, delevel Mordred. /  / 
  "mordred-aurelian-regent": {
    name: "モードレッド、黄金の摂政",
    effect:
      "モードレッドのリネージュ\n\n" +
      "登場時：このターン、「モードレッド」の次の攻撃は＋3パワーを得て、「ヒット時：リカバー3する。」を得る。\n\n" +
      "あなたが光エレメントのカードを起動するたび、「モードレッド」をデレベルする。",
  },

  // Mordred, Burnished Avenger  [CHAMPION]  L1 WATER
  // EN: **Flawless Spirit of Mordred Lineage** /  / **On Enter:** Look at the top card of your deck. If its an attack card, you may banish it. If you do, you may activate that card this turn. /  / [Mordred Bonus] **Inherited Effect **â As long as Mordred has leveled up this turn, the first attack card you activate this turn costs 2 less to activate.
  "mordred-burnished-avenger": {
    name: "モードレッド、磨かれし復讐者",
    effect:
      "「無欠なるモードレッドの精霊」のリネージュ\n\n" +
      "登場時：あなたのデッキの一番上のカードを見る。それがアタックカードの場合、あなたはそれを追放してよい。そうしたなら、あなたはこのターンそのカードを起動してよい。\n\n" +
      "［モードレッドボーナス］継承効果 — 「モードレッド」がこのターンにレベルアップしているかぎり、あなたがこのターンに最初に起動するアタックカードは起動コストが2少なくなる。",
  },

  // Mordred, Fated Luminary  [CHAMPION]  L3 EXALTED,NORM
  // EN: **Mordred Lineage** /  / Mordred can level up into champions of the same base level. When he does, draw two cards. /  / Attack cards in your graveyard have **floating memory** and "**Ephemerate â **(X)", where **X** is that card's reserve cost. *(You may activate cards with **ephemerate** from your graveyard by paying that cost. Attack cards played this way become **ephemeral** in the intent.)*
  "mordred-fated-luminary": {
    name: "モードレッド、運命の輝き",
    effect:
      "モードレッドのリネージュ\n\n" +
      "「モードレッド」は同じ基本レベルのチャンピオンにレベルアップできる。そうしたとき、カードを2枚引く。\n\n" +
      "あなたの墓地にあるアタックカードはフローティングメモリーと「エフェメレート — (X)」を持つ。Xはそのカードのリザーブコスト。*（あなたはエフェメレートを持つカードをそのコストを支払って墓地から起動してよい。この方法でプレイしたアタックカードはインテント内でエフェメラルになる。）*",
  },

  // Mordred, Flawless Blade  [CHAMPION]  L2 NORM
  // EN: Attack cards in your graveyard have **floating memory**. *(While paying for a memory cost, you may banish a card with **floating memory** from your graveyard to pay for 1 of that cost.)*
  "mordred-flawless-blade": {
    name: "モードレッド、無欠の刃",
    effect:
      "あなたの墓地にあるアタックカードはフローティングメモリーを持つ。*（メモリーコストを支払う際、あなたはフローティングメモリーを持つカードを墓地から追放してそのコストの1分を支払ってよい。）*",
  },

  // Regulus Blitz  [ATTACK]  L- WATER
  // EN: [Mordred Bonus] **Banish a card with floating memory from your graveyard:** **Negate** each card activation you don't control unless its controller pays (2).  /  / [Mordred Bonus] (2)**, Discard this card from your hand:** The next non-Command attack card you activate this turn doesn't rest its attacker as part of its cost.
  "regulus-blitz": {
    name: "レグルスの奇襲",
    effect:
      "［モードレッドボーナス］あなたの墓地からフローティングメモリーを持つカードを1枚追放する：そのコントローラーが(2)を支払わないかぎり、あなたがコントロールしていない各カードの起動を打ち消す。\n\n" +
      "［モードレッドボーナス］(2)、このカードを手札から捨てる：このターン、あなたが次に起動する非コマンドのアタックカードは、そのコストとして攻撃者をレストしない。",
  },

  // Rhongomiant, Grove's Spire  [REGALIA/WEAPON]  L- EXALTED,NORM
  // EN: **Spellshroud** /  / [Mordred Bonus] As long as an opponent has **influence** eight or more, CARDNAME gets +4[POWER]. *(A playerâs **influence** is equal to the total amount of cards in their hand and memory.)* /  / [Mordred Bonus] Whenever a **durability** counter is removed from CARDNAME, you may return a card from your memory to your hand.
  "rhongomiant-groves-spire": {
    name: "ロンゴミアント、木立の尖塔",
    effect:
      "スペルシュラウド\n\n" +
      "［モードレッドボーナス］対戦相手のインフルエンスが8以上であるかぎり、「ロンゴミアント、木立の尖塔」は＋4パワーを得る。*（プレイヤーのインフルエンスは、その手札とメモリーのカードの合計枚数に等しい。）*\n\n" +
      "［モードレッドボーナス］「ロンゴミアント、木立の尖塔」から耐久カウンターが取り除かれるたび、あなたはあなたのメモリーからカードを1枚手札に戻してよい。",
  },

  // Safeguard Amulet  [REGALIA/ITEM]  L- NORM
  // EN: **Banish CARDNAME:** If your champion would take non-combat damage this turn, prevent 4 of that damage.
  "safeguard-amulet": {
    name: "守護のアミュレット",
    effect:
      "「守護のアミュレット」を追放する：このターン、あなたのチャンピオンが非戦闘ダメージを受ける場合、そのダメージのうち4点を軽減する。",
  },

  // Safeguard Paragon  [ALLY]  L- NORM
  // EN: **Sacrifice Safeguard Paragon**: Prevent the next 4 non-combat damage that would be dealt to each unit you control this turn.
  "safeguard-paragon": {
    name: "守護の模範",
    effect:
      "「守護の模範」をサクリファイスする：このターン、あなたがコントロールする各ユニットに与えられる次の4点の非戦闘ダメージを軽減する。",
  },

  // Savage Slash  [ATTACK]  L- NORM
  // EN: [Class Bonus] **Floating Memory** *(While paying for a memory cost, you may banish this card from your graveyard to pay for 1 of that cost. Apply this effect only if your champion's class matches this card's class.)*
  "savage-slash": {
    name: "野蛮な斬撃",
    effect:
      "［クラスボーナス］フローティングメモリー *（メモリーコストを支払う際、あなたはこのカードを墓地から追放してそのコストの1分を支払ってよい。この効果は、あなたのチャンピオンのクラスがこのカードのクラスと一致する場合のみ適用する。）*",
  },

  // Snow Fairy  [ALLY]  L- WATER
  // EN: **Stealth** *(This unit can't be targeted by attacks unless permitted by **true sight**.)* /  / **On Enter:** Rest target ally you don't control. That ally doesn't wake up during its controller's wake up phase as long as you control CARDNAME.
  "snow-fairy": {
    name: "雪の妖精",
    effect:
      "ステルス *（このユニットは、トゥルーサイトによって許可されないかぎり、攻撃の対象にできない。）*\n\n" +
      "登場時：あなたがコントロールしていない対象のアライをレストする。あなたが「雪の妖精」をコントロールしているかぎり、そのアライはコントローラーのウェイクアップフェイズにアウェイクにならない。",
  },

  // Striking Tides  [ATTACK]  L- WATER
  // EN: [Mordred Bonus] **On Hit:** You may banish a card with **floating memory** from your graveyard. If you do, wake up your champion.
  "striking-tides": {
    name: "打ち寄せる潮",
    effect:
      "［モードレッドボーナス］ヒット時：あなたの墓地からフローティングメモリーを持つカードを1枚追放してよい。そうしたなら、あなたのチャンピオンをアウェイクにする。",
  },

  // Sudden Steel  [ATTACK]  L- NORM
  // EN: [Class Bonus] **Efficiency** *(This card costs **LV** less to activate. **LV** refers to your champion's level. Apply this effect only if your champion's class matches this card's class.)*
  "sudden-steel": {
    name: "突然の刃",
    effect:
      "［クラスボーナス］エフィシェンシー *（このカードは起動コストがLV少なくなる。LVはあなたのチャンピオンのレベルを指す。この効果は、あなたのチャンピオンのクラスがこのカードのクラスと一致する場合のみ適用する。）*",
  },

  // Sword of Seeking  [REGALIA/WEAPON]  L- NORM
  // EN: [Class Bonus] **True Sight** *(Attacks using this weapon can target units with **stealth**. Apply this effect only if your champion's class matches this card's class.)* 
  "sword-of-seeking": {
    name: "探求の剣",
    effect:
      "［クラスボーナス］トゥルーサイト *（この武器を使う攻撃はステルスを持つユニットを対象にできる。この効果は、あなたのチャンピオンのクラスがこのカードのクラスと一致する場合のみ適用する。）*",
  },

  // Training Dummy  [TOKEN/ALLY]  L- NORM
  // EN: CARDNAME can't attack.
  "training-dummy": {
    name: "訓練用ダミー",
    effect: "「訓練用ダミー」は攻撃できない。",
  },

  // Trickster of the Fae Realm  [ALLY]  L- NORM
  // EN: **Stealth** /  / **On Enter:** Look at the top five cards of target opponent's deck. Banish up to two of them and put the rest back on top of their owner's deck in any order. /  / **On Leave:** Return the banished cards to the top of their owner's deck in any order.
  "trickster-of-the-fae-realm": {
    name: "妖精界のトリックスター",
    effect:
      "ステルス\n\n" +
      "登場時：対象の対戦相手のデッキの一番上から5枚を見る。そのうち最大2枚を追放し、残りを好きな順番でオーナーのデッキの一番上に戻す。\n\n" +
      "退場時：その追放したカードを好きな順番でオーナーのデッキの一番上に戻す。",
  },

  // Warrior of the Fae Realm  [ALLY]  L- NORM
  // EN: **Stealth** /  / **On Enter:** You may banish a Sword attack card from your hand or memory. If you do, draw a card into your memory. As long as you control CARDNAME, you may activate the banished card on a later turn.
  "warrior-of-the-fae-realm": {
    name: "妖精界の戦士",
    effect:
      "ステルス\n\n" +
      "登場時：あなたは手札またはメモリーから剣アタックカードを1枚追放してよい。そうしたなら、カードを1枚あなたのメモリーに引く。あなたが「妖精界の戦士」をコントロールしているかぎり、あなたはその追放したカードを後のターンに起動してよい。",
  },

});
