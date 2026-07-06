"use strict";
// Dawn of Ashes Prelude（DOAp）日本語訳。translations.js の後に読み込む。
// 既存キャラのlv3チャンピオン（ロレイン/ライ/シルヴィ/ザンダー・リネージュ）＋レガリア。
window.GA_I18N = window.GA_I18N || { meta: {}, terms: {}, cards: {} };
window.GA_I18N.cards = Object.assign(window.GA_I18N.cards || {}, {

  // Clarent, Sword of Peace  [REGALIA/WEAPON]  NORM
  "clarent-sword-of-peace": {
    name: "クラレント、平和の剣",
    effect:
      "[クラスボーナス] **「クラレント、平和の剣」から耐久カウンターを1個取り除く：** このターン、あなたがコントロールする各ユニットに与えられる次の1点の非戦闘ダメージを軽減する。*（この能力は、あなたのチャンピオンのクラスがこのカードのクラスと一致する場合にのみ起動できる。）*",
  },

  // Endura, Scepter of Ignition  [REGALIA/ITEM]  NORM
  "endura-scepter-of-ignition": {
    name: "エンデュラ、着火の笏",
    effect:
      "[レスト]、**あなたのチャンピオンからエンライト・カウンターを1個取り除く：** 対象のユニットに1点のダメージを与える。この能力はスロースピードでのみ起動できる。",
  },

  // Flute of Taming  [REGALIA/ITEM]  NORM
  "flute-of-taming": {
    name: "調教の笛",
    effect:
      "[レスト]：あなたのチャンピオンは、ターン終了時まで+1レベルを得る。\n\n" +
      "[レスト]：対象の動物または獣のアライは、ターン終了時まで、あなたの選択で+1[パワー]または+1[ライフ]を得る。",
  },

  // Lorraine, Crux Knight  [CHAMPION]  CRUX  lv3
  "lorraine-crux-knight": {
    name: "ロレイン、クラックスの騎士",
    effect:
      "**ロレイン・リネージュ** *（「ロレイン、クラックスの騎士」は、前のレベルの「ロレイン」チャンピオンからレベルアップさせなければならない。）*\n\n" +
      "ロレインの攻撃は、あなたの追放領域にあるレガリア・ウェポンカード1枚につき+1[パワー]を得る。",
  },

  // Orb of Choking Fumes  [REGALIA/ITEM]  NORM
  "orb-of-choking-fumes": {
    name: "窒息の煙のオーブ",
    effect:
      "**「窒息の煙のオーブ」を追放する：** このターン、対戦相手が起動するカードは、起動コストが(1)多くなる。**クラスボーナス：** カードを1枚引く。*（追加の効果は、あなたのチャンピオンのクラスがこのカードのクラスと一致する場合にのみ適用する。）*",
  },

  // Rai, Storm Seer  [CHAMPION]  ARCANE  lv3
  "rai-storm-seer": {
    name: "ライ、嵐の予見者",
    effect:
      "**ライ・リネージュ** *（「ライ、嵐の予見者」は、前のレベルの「ライ」チャンピオンからレベルアップさせなければならない。）*\n\n" +
      "「ライ、嵐の予見者」は、あなたの追放領域にあるアーケインエレメントのメイジのスペルカード1枚につき+1レベルを得る。",
  },

  // Seed of Nature  [REGALIA/ITEM]  TERA
  "seed-of-nature": {
    name: "自然の種子",
    effect:
      "「自然の種子」はレスト状態で場に出る。\n\n" +
      "**登場時：** あなたのチャンピオンは、ターン終了時まで+2レベルを得る。\n\n" +
      "[クラスボーナス] [レスト]、**「自然の種子」を追放する：** あなたのチャンピオンは、ターン終了時まで+2レベルを得る。",
  },

  // Silvie, Loved by All  [CHAMPION]  TERA  lv3
  "silvie-loved-by-all": {
    name: "シルヴィ、皆に愛される者",
    effect:
      "**シルヴィ・リネージュ** *（「シルヴィ、皆に愛される者」は、前のレベルの「シルヴィ」チャンピオンからレベルアップさせなければならない。）*\n\n" +
      "あなたがコントロールする動物および獣のアライは+1[ライフ]を得て、**インターセプト**を持つ。",
  },

  // Zander, Blinding Steel  [CHAMPION]  LUXEM  lv3
  "zander-blinding-steel": {
    name: "ザンダー、眩き鋼",
    effect:
      "**ザンダー・リネージュ** *（「ザンダー、眩き鋼」は、前のレベルの「ザンダー」チャンピオンからレベルアップさせなければならない。）*\n\n" +
      "あなたのリコレクションフェイズ開始時に、あなたのメモリーにあるすべてのカードを公開してよい。公開されたラクサムエレメントのカード1枚につき、各対戦相手は自分の手札からカードを1枚自分のメモリーに置く。",
  },

});
