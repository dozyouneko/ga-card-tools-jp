"use strict";
// Re:Collection Heaven's Fury（ReC-HVF）日本語訳。translations.js の後に読み込む。
// テーマ：グオ・ジア（郭嘉）／運命石（Fatestone）・運命縛り（Fatebound）・トランスフォーム。
// ※裏面 seiryuu-azure-dragon は HVN 1st と同一slugのため hvn-1st.js 側で既訳。
window.GA_I18N = window.GA_I18N || { meta: {}, terms: {}, cards: {} };
window.GA_I18N.cards = Object.assign(window.GA_I18N.cards || {}, {

  // Advent of the Shenju  [ACTION]  LUXEM
  "advent-of-the-shenju": {
    name: "神獣の降臨",
    effect:
      "[グオ・ジアボーナス] あなたの追放領域から対象の運命石のカードを場に出す。そのカードがレガリアなら、あなたのチャンピオンに**クエストカウンター**を5個置く。\n\n" +
      "[クラスボーナス] [エレメントボーナス] あなたが自分のメモリーからこのカードを公開するたび、あなたのメモリーにあるすべてのカードを追放してよい。この方法で追放したカード1枚につき、カードを1枚あなたのメモリーに引く。",
  },

  // Band of Burning Verdict  [REGALIA/ITEM]  FIRE
  "band-of-burning-verdict": {
    name: "燃ゆる裁定の腕輪",
    effect:
      "**登場時：** カードを1枚引く。\n\n" +
      "[クラスボーナス] [レスト]：あなたがコントロールする対象の動物または獣のアライは、ターン終了時まで+1[パワー]を得て、**トゥルーサイト**を得る。*（トゥルーサイトを持つユニットはステルスを持つユニットを攻撃できる。この能力は、あなたのチャンピオンのクラスがこのカードのクラスと一致する場合にのみ起動する。）*",
  },

  // Broken Promises  [ACTION]  FIRE
  "broken-promises": {
    name: "破られた約束",
    effect:
      "このカードを起動するための追加コストとして、運命石のアイテム1つまたは運命縛りのアライ1体をサクリファイスする。\n\n" +
      "カードを1枚あなたのメモリーに引く。[グオ・ジアボーナス] あなたのチャンピオンに**クエストカウンター**を1個置く。",
  },

  // Companion Fatestone  [ITEM]  NORM
  "companion-fatestone": {
    name: "伴侶の運命石",
    effect:
      "**登場時：** 「伴侶の運命石」またはあなたがコントロールする運命縛りのアライ1体に**バフカウンター**を1個置く。\n\n" +
      "あなたがコントロールする運命縛りのアライが死亡するたび、「伴侶の運命石」をトランスフォームしてよい。",
  },

  // Craggy Fatestone  [ITEM]  NORM
  "craggy-fatestone": {
    name: "岩肌の運命石",
    effect:
      "対戦相手がメモリーコスト0のカードをマテリアライズするたび、「岩肌の運命石」に**バフカウンター**を1個置く。\n\n" +
      "[グオ・ジアボーナス] [レスト]：「岩肌の運命石」をトランスフォームする。この能力は、「岩肌の運命石」に**バフカウンター**が2個以上置かれている場合にのみ起動する。",
  },

  // Fated Keepsake  [REGALIA/ITEM]  NORM
  "fated-keepsake": {
    name: "運命の形見",
    effect:
      "**登場時：** カードを1枚引く。\n\n" +
      "[グオ・ジアボーナス] あなたが運命石および／または運命縛りのオブジェクトを合計3つ以上コントロールしているときに、あなたのチャンピオンが7点以上のダメージを受ける場合、そのダメージのうち6点を除くすべてを軽減する。",
  },

  // Fatestone of Heaven  [ITEM]  LUXEM
  "fatestone-of-heaven": {
    name: "天の運命石",
    effect:
      "**登場時：** メモリーコストが1以下、またはリザーブコストが5以下の対象の非チャンピオンのオブジェクトを破壊する。\n\n" +
      "[グオ・ジアボーナス] (3)：あなたのメモリーにあるすべてのカードを公開する。この方法でラクサムエレメントのカードが3枚以上公開された場合、「天の運命石」をトランスフォームする。この能力は1ターンに1回のみ、スロースピードで起動する。",
  },

  // Fatestone of Revelations  [ITEM]  NORM
  "fatestone-of-revelations": {
    name: "啓示の運命石",
    effect:
      "**登場時：** あなたの手札および／またはメモリーから、運命石および／または運命縛りのカードを2枚公開してよい。そうした場合、カードを1枚引く。\n\n" +
      "[グオ・ジアボーナス] (6)：「啓示の運命石」をトランスフォームする。この能力は起動コストが(LV)少なくなる。*（LVはあなたのチャンピオンのレベルを指す。）*",
  },

  // Fatestone of Unrelenting  [ITEM]  FIRE
  "fatestone-of-unrelenting": {
    name: "不屈の運命石",
    effect:
      "**ハインダード** *（このオブジェクトはレスト状態で場に出る。）*\n\n" +
      "**登場時：** スペルとして、対象のユニットに1点のダメージを与える。\n\n" +
      "[グオ・ジアボーナス] [レスト]、**あなたの墓地から火エレメントのカードを2枚追放する**：「不屈の運命石」をトランスフォームし、その後それをウェイクアップする。",
  },

  // Flamewreath Call  [ACTION]  FIRE
  "flamewreath-call": {
    name: "炎環の呼び声",
    effect:
      "[クラスボーナス] あなたが獣のアライをコントロールしている場合、このカードは起動コストが3少なくなる。*（この効果は、あなたのチャンピオンのクラスがこのカードのクラスと一致する場合にのみ適用する。）*\n\n" +
      "最大2体の対象のアライに3点のダメージを与える。",
  },

  // Foraging Fox  [ALLY]  NORM
  "foraging-fox": {
    name: "採餌の狐",
    effect:
      "**登場時：** あなたのデッキの一番上から5枚を見る。その中から運命石のカードを1枚公開し、あなたのメモリーに置いてよい。残りを好きな順番であなたのデッキの一番下に置く。",
  },

  // Incandescent Reliquary  [REGALIA/ITEM]  LUXEM
  "incandescent-reliquary": {
    name: "白熱の聖遺物箱",
    effect:
      "[クラスボーナス] このカードはマテリアライズコストが1少なくなる。\n\n" +
      "あなたのリコレクションフェイズ開始時に、あなたが**インフルエンス**の最も少ないプレイヤーである場合、カードを1枚引く。*（プレイヤーのインフルエンスは、その手札とメモリーにあるカードの総枚数に等しい。）*",
  },

  // Journey's Beginning  [ACTION]  NORM
  "journeys-beginning": {
    name: "旅の始まり",
    effect:
      "カードを1枚引く。\n\n" +
      "[グオ・ジアボーナス] あなたのチャンピオンに**クエストカウンター**を1個置く。*（この効果は、あなたのチャンピオンがグオ・ジアである場合にのみ適用する。）*",
  },

  // Lavaplume Fatestone  [ITEM]  FIRE
  "lavaplume-fatestone": {
    name: "溶岩噴きの運命石",
    effect:
      "**ファスト・アクティベーション** *（このカードをファストスピードで起動してよい。）*\n\n" +
      "**登場時：** スペルとして、対象のユニットに**X**点の軽減不能ダメージを与える。**X**は、あなたがコントロールする他の運命石および／または運命縛りのオブジェクトの数。\n\n" +
      "[グオ・ジアボーナス] (4)：「溶岩噴きの運命石」をトランスフォームする。",
  },

  // Light the Hunt  [ACTION]  LUXEM
  "light-the-hunt": {
    name: "狩りの灯火",
    effect:
      "あなたがコントロールする対象の動物または獣のアライに**バフカウンター**を2個置く。\n\n" +
      "[クラスボーナス] [エレメントボーナス] あなたが自分のメモリーからこのカードを公開するたび、あなたがコントロールする動物または獣のアライ1体に**バフカウンター**を1個置く。",
  },

  // Obscuring Threads  [ACTION]  NORM
  "obscuring-threads": {
    name: "覆い隠す糸",
    effect:
      "最大1つの対象の運命石または運命縛りのオブジェクトは、ターン終了時まで**スペルシュラウド**を得る。*（スペルシュラウドを持つオブジェクトはスペルの対象にできない。）*\n\n" +
      "**フローティングメモリー** *（メモリーコストの支払い中に、このカードを墓地から追放してそのコストの1点分の支払いに充ててよい。）*",
  },

  // Peacock of Prosperity  [ALLY]  LUXEM
  "peacock-of-prosperity": {
    name: "繁栄の孔雀",
    effect:
      "[クラスボーナス] [エレメントボーナス] あなたが自分のメモリーからこのカードを公開するたび、あなたのメモリーから「繁栄の孔雀」という名前のカードを1枚場に出してよい。そうした場合、カードを1枚あなたのメモリーに引く。",
  },

  // Rousing Rattle Drum  [REGALIA/ITEM]  NORM
  "rousing-rattle-drum": {
    name: "鼓舞のでんでん太鼓",
    effect:
      "**「鼓舞のでんでん太鼓」を追放する**：防御中の対象の動物または獣のアライをウェイクアップする。",
  },

  // Strengthen the Bonds  [ACTION]  NORM
  "strengthen-the-bonds": {
    name: "絆を強める",
    effect:
      "最大2つの対象の運命石または運命縛りのオブジェクトに**バフカウンター**を1個置く。",
  },

  // ===== 裏面（トランスフォーム先） =====

  // Cheetah of Bound Fury  [ALLY]  FIRE  ※裏面（front: fatestone-of-unrelenting）
  "cheetah-of-bound-fury": {
    name: "束縛の憤怒のチーター",
    effect:
      "**ヒット時：** 「束縛の憤怒のチーター」を追放し、その後オーナーのコントロール下で場に戻してよい。*（それは「不屈の運命石」として場に出る。）*",
  },

  // Fatebound Caracal  [ALLY]  NORM  ※裏面（front: companion-fatestone）
  "fatebound-caracal": {
    name: "運命縛りのカラカル",
    effect:
      "**インターセプト** *（このアライがアウェイクの間にあなたのチャンピオンが攻撃されるたび、対象をこのアライに変更してもよい。）*\n\n" +
      "**リトルト2** *（このアライが反撃している限り、+2[パワー]を得る。）*",
  },

  // Firebird Trailblazer  [ALLY]  FIRE  ※裏面（front: lavaplume-fatestone）
  "firebird-trailblazer": {
    name: "炎鳥の先駆者",
    effect:
      "**攻撃時：** あなたはカードを1枚捨ててもよい。そうした場合、カードを1枚引く。",
  },

  // Heavenly Drake  [ALLY]  LUXEM  ※裏面（front: fatestone-of-heaven）
  "heavenly-drake": {
    name: "天翔の飛竜",
    effect:
      "**スペルシュラウド** *（スペルシュラウドを持つユニットはスペルの対象にできない。）* **ヴィガー** *（あなたのエンドフェイズ開始時に、「天翔の飛竜」をウェイクアップする。）*\n\n" +
      "**死亡時：** **リカバー3**する。",
  },

  // Obstinate Cragback  [ALLY]  NORM  ※裏面（front: craggy-fatestone）
  "obstinate-cragback": {
    name: "頑迷なる岩背",
    effect:
      "**スペルシュラウド** *（スペルシュラウドを持つユニットはスペルの対象にできない。）*\n\n" +
      "あなたの対戦相手はメモリーコスト0のカードをマテリアライズできない。",
  },

  // Young Wyrmling  [ALLY]  NORM  ※裏面（front: fatestone-of-revelations）
  "young-wyrmling": { name: "幼き竜の子", effect: "" },

});
