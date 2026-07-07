"use strict";
// Promo 2025（P25）日本語訳。translations.js の後に読み込む。
// ほとんどは既訳カードの別slot。未訳はプロモ固有カード＋名前付き0レベルスピリット等。
window.GA_I18N = window.GA_I18N || { meta: {}, terms: {}, cards: {} };
window.GA_I18N.cards = Object.assign(window.GA_I18N.cards || {}, {

  // Acolyte of Cultivation  [ALLY]  NORM
  "acolyte-of-cultivation": {
    name: "修練の侍祭",
    effect:
      "[クラスボーナス] あなたがこのターンにスペルカードを起動している限り、このカードは起動コストが3少なくなる。*（この効果は、あなたのチャンピオンのクラスがこのカードのクラスと一致する場合にのみ適用する。）*",
  },

  // Aithne, Spirit of Fire  [CHAMPION]  L0 FIRE
  "aithne-spirit-of-fire": {
    name: "アスネ、火の精霊",
    effect: "**登場時：** カードを7枚引く。",
  },

  // Cosmic Astroscope  [REGALIA/ITEM]  ASTRA
  "cosmic-astroscope": {
    name: "宇宙の星見鏡",
    effect:
      "[クラスボーナス] 対戦相手が**グリンプス**する場合、代わりにそのプレイヤーに**グリンプス3**させてよい。\n\n" +
      "[レスト]：**グリンプス3**を行う。*（グリンプスするには、デッキの一番上からその枚数のカードを見る。それらのカードを好きな順番でデッキの一番上または一番下に戻す。）*",
  },

  // Devastating Blow  [ATTACK]  FIRE
  "devastating-blow": {
    name: "壊滅の一撃",
    effect:
      "[クラスボーナス] [レベル3以上] 「壊滅の一撃」は+4[パワー]を得て、反撃されない。*（この効果は、あなたのチャンピオンのクラスがこのカードのクラスと一致し、かつあなたのチャンピオンがレベル3以上である場合にのみ適用する。）*",
  },

  // Enrage  [ACTION]  EXIA
  "enrage": {
    name: "激昂",
    effect:
      "[ダメージ20+] このカードは起動コストが2少なくなる。*（この効果は、あなたのチャンピオンにダメージカウンターが20個以上ある場合にのみ適用する。）*\n\n" +
      "あなたのチャンピオンに4点の軽減不能ダメージを与える。その後、このターンのそのチャンピオンの次の攻撃は、そのチャンピオンのダメージカウンター4個ごとに+1[パワー]を得る。",
  },

  // Evasive Maneuvers  [ACTION]  NORM
  "evasive-maneuvers": {
    name: "回避機動",
    effect:
      "このターン、対象のユニットに与えられる次の2点のダメージを軽減する。そのユニットがレンジャーなら、それは**ディスタント**になる。*（ユニットは、そのコントローラーのターン終了時までディスタントのままである。）*",
  },

  // Gwendolyn, Spirit of Wind  [CHAMPION]  L0 WIND
  "gwendolyn-spirit-of-wind": {
    name: "グウェンドリン、風の精霊",
    effect: "**登場時：** カードを7枚引く。",
  },

  // Hanabi, Spirit of Fire  [CHAMPION]  L0 FIRE
  "hanabi-spirit-of-fire": {
    name: "ハナビ、火の精霊",
    effect: "**登場時：** カードを7枚引く。",
  },

  // Heavenly Guide  [ALLY]  NORM
  "heavenly-guide": {
    name: "天の導き手",
    effect:
      "[レベル2以上] **登場時：** 対戦相手がスピリットでないチャンピオンをコントロールしており、そのリネージュの一番上に、プレイされていないカードが置かれている場合、あなたのチャンピオンをレベルアップする。*（あなたのチャンピオンは、あなたのマテリアルデッキから適合するチャンピオンカードにレベルアップする。カードは、起動またはマテリアライズされた場合に「プレイされた」ことになる。）*",
  },

  // Kaze, Spirit of Wind  [CHAMPION]  L0 WIND
  "kaze-spirit-of-wind": {
    name: "カゼ、風の精霊",
    effect: "**登場時：** カードを7枚引く。",
  },

  // Mandate of Honor  [REGALIA/ITEM]  NORM
  "mandate-of-honor": {
    name: "名誉の負託",
    effect:
      "あなたがユニークなアライをコントロールしている限り、**インフルエンス**が8以上の各プレイヤーはカードを引けない。*（プレイヤーのインフルエンスは、その手札とメモリーにあるカードの総枚数に等しい。）*",
  },

  // Mastermind Scheme  [ACTION]  NORM
  "mastermind-scheme": {
    name: "黒幕の策謀",
    effect:
      "[クラスボーナス] **エフィシェンシー** *（このカードの起動コストは**LV**少なくなる。**LV**はあなたのチャンピオンのレベルを指す。）*\n\n" +
      "あなたのチャンピオンの上にある**プレパレーションカウンター**の数を2倍にする。その後、あなたのチャンピオンに**プレパレーションカウンター**が8個以上ある場合、あなたはこのターン**アジリティ3**を得る。*（アジリティ3 — エンドフェイズの開始時に、あなたのメモリーから3枚を手札に戻す。）*",
  },

  // Miao, Spirit of Water  [CHAMPION]  L0 WATER
  "miao-spirit-of-water": {
    name: "ミァオ、水の精霊",
    effect: "**登場時：** カードを7枚引く。",
  },

  // Morrigan, Lost Spirit  [CHAMPION]  L0 NORM
  "morrigan-lost-spirit": {
    name: "モリガン、失われし精霊",
    effect: "**登場時：** カードを7枚引く。",
  },

  // Priscilla, Lost Spirit  [CHAMPION]  L0 NORM
  "priscilla-lost-spirit": {
    name: "プリシラ、失われし精霊",
    effect: "**登場時：** カードを7枚引く。",
  },

  // Retold Fortune  [ACTION]  NORM
  "retold-fortune": {
    name: "再び語られる運命",
    effect:
      "最大1枚のスペルカードを捨てる。そうした場合、カードを1枚引く。\n\n" +
      "[クラスボーナス] [レベル2以上] **フローティングメモリー** *（メモリーコストの支払い中に、このカードを墓地から追放してそのコストの1点分の支払いに充ててよい。）*",
  },

  // Sacramental Rite  [ITEM/REGALIA]  NORM
  "sacramental-rite": {
    name: "秘蹟の儀式",
    effect:
      "**ディヴァインレリック** *（このキーワードを持つカードは、あなたのマテリアルデッキに1枚しか入れられない。）*\n\n" +
      "**登場時：** あなたのマテリアルデッキから非チャンピオンのカードを1枚裏向きに追放する。\n\n" +
      "**「秘蹟の儀式」を追放する：** あなたのチャンピオンは、他のタイプに加えてアセンダントになる。あなたはその追放したカードをプレイしてよい。",
  },

  // Seal the Past  [ACTION]  NORM
  "seal-the-past": {
    name: "過去の封印",
    effect:
      "対象のプレイヤーは、自分のマテリアルデッキからプリザーブされたカードを3枚追放する。\n\n" +
      "**フローティングメモリー** *（メモリーコストの支払い中に、このカードを墓地から追放してそのコストの1点分の支払いに充ててよい。）*",
  },

  // Shadowstrike  [ATTACK]  UMBRA
  "shadowstrike": {
    name: "シャドウストライク",
    effect:
      "**プレパレーションX** *（このカードを起動する際、あなたのチャンピオンから**プレパレーションカウンター**をX個取り除いてよい。）* **X**は0にできない。「シャドウストライク」は**+X**[パワー]を得る。\n\n" +
      "[クラスボーナス] 「シャドウストライク」が**プレパレーション**されていたなら、それは**アンブロッカブル**を持つ。*（アンブロッカブルを持つ攻撃はインターセプトされず、タウントを無視する。）*",
  },

  // Shard of Empowerment  [REGALIA/ITEM]  NORM
  "shard-of-empowerment": {
    name: "強化の欠片",
    effect:
      "**「強化の欠片」を追放する：** **エンパワー2**。*（このターンにあなたが次に起動するスペルカードは、あなたのチャンピオンが+2レベルを得たものとして起動・解決する。）*",
  },

  // Shira, Lost Spirit  [CHAMPION]  L0 NORM
  "shira-lost-spirit": {
    name: "シラ、失われし精霊",
    effect: "**登場時：** カードを7枚引く。",
  },

  // Thunderclap  [ACTION]  FIRE
  "thunderclap": {
    name: "雷鳴",
    effect:
      "[レベル3以上] このカードは起動コストが2少なくなる。*（この効果は、あなたのチャンピオンがレベル3以上である場合にのみ適用する。）*\n\n" +
      "対象のアライに4点のダメージを与える。",
  },

  // Veiled Dash  [ACTION]  WIND
  "veiled-dash": {
    name: "秘めた疾走",
    effect:
      "[クラスボーナス] このカードは起動コストが2少なくなる。\n\n" +
      "最大2体の対象のユニットは**ディスタント**になり、その後あなたのメモリーから任意の枚数の風エレメントのカードを公開する。このターン、それらの各ユニットに与えられる次の**X**点のダメージを軽減する。**X**は、この方法で公開した風エレメントのカードの枚数。",
  },

  // Wandering Glaivier  [ALLY]  FIRE
  "wandering-glaivier": {
    name: "放浪の薙刀使い",
    effect: "**死亡時：** 各プレイヤーはカードを1枚引く。",
  },

});
