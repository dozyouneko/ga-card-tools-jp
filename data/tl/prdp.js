"use strict";
// .asphodel/paradise Pantheon（PRDP）日本語訳。translations.js の後に読み込む。
// #73 バッチ1（44枚）のうち本ファイルは2枚（Greater Boon 2種）。
// #73 バッチ3（34枚）を追記して計14枚（本ファイルは12枚）。命名は設計書 §2-8 に従う。
window.GA_I18N = window.GA_I18N || { meta: {}, terms: {}, cards: {} };
window.GA_I18N.cards = Object.assign(window.GA_I18N.cards || {}, {

  // Greater Boon of Connection  [GREATER BOON]  NORM
  "greater-boon-of-connection": {
    name: "絆の大いなる恩恵",
    effect:
      "**レベルロック2** *（このカードは、あなたのチャンピオンの基本レベルが2以上の場合にのみプレイできる。）*\n\n" +
      "あなたがコントロールする、リンクされたアライは、それにリンクしている各オブジェクトにつき+1[パワー]を得る。\n\n" +
      "**(2)、アライリンクを持つオブジェクトをサクリファイスする：** カードを1枚あなたのメモリーに引く。この能力は、このゲーム中に起動した回数1回につき、起動コストが(1)多くなる。",
  },

  // Greater Boon of Flock  [GREATER BOON]  NORM
  "greater-boon-of-flock": {
    name: "群れの大いなる恩恵",
    effect:
      "あなたのコントロール下で鳥のアライが場に出るたび、それがこの能力によって**召喚**されたのでない場合、**カスケード**—\n" +
      "• 1〜4— フレッジリング・トークンを1体**召喚**する。\n" +
      "• 5〜9— あなたがコントロールする鳥のアライに**バフカウンター**を1個置く。\n" +
      "• 10— 「群れの大いなる恩恵」は「あなたがコントロールする鳥は+1[パワー]を得て、**ヴィガー**を持つ。」を得る。\n\n" +
      "*（この能力は**カスケード**するたびに変化する。）*",
  },


  // Greater Boon of Proxia  [GREATER BOON]  NORM
  "greater-boon-of-proxia": {
    name: "プロクシアの大いなる恩恵",
    effect:
      "このカードが入っているデッキは、そのマテリアルデッキに最大3枚多くカードを入れられる。\n\n" +
      "**ファーストブーン** *（この恩恵はゲーム開始時、スピリットが登場する前に授ける。）*\n\n" +
      "(10)：カードを1枚引く。この能力は、あなたがコントロールするレガリア1つにつき起動コストが(1)少なくなる。この能力は1回のみ起動できる。",
  },

  // Greater Boon of Rosen  [GREATER BOON]  NORM
  "greater-boon-of-rosen": {
    name: "ローゼンの大いなる恩恵",
    effect:
      "この恩恵を授けるための追加コストとして、パワーセルのアイテムを2つサクリファイスする。\n\n" +
      "あなたがコントロールするオートマトンのアライが死亡するたび、パワーセル・トークンを1体**召喚**する。",
    flavor: "ローゼンはもはや、ただの機械ではなくなっていた。",
  },

  // Lesser Boon of Elysian Blood  [LESSER BOON]  NORM
  "lesser-boon-of-elysian-blood": {
    name: "エリュシオンの血の小さな恩恵",
    effect:
      "**クラスロック**\n\n" +
      "あなたがコントロールするエリュシオンのオブジェクトは「**[レスト]：エンパワー1。**」を持つ。\n\n" +
      "**(2)：** あなたの墓地から対象のエリュシオンのカードを1枚あなたのデッキの一番上に置く。この能力は、このゲーム中に起動した回数1回につき、起動コストが(1)多くなる。",
  },

  // Lesser Boon of Flock  [LESSER BOON]  NORM
  "lesser-boon-of-flock": {
    name: "群れの小さな恩恵",
    effect:
      "この恩恵を得る際、フレッジリング・トークンを1体**召喚**する。\n\n" +
      "あなたが起動する、アドバンスドエレメントでない鳥のカードのエレメント要件を無視する。",
    flavor: "群れを呼べば、彼らは必ず応える。",
  },

  // Lesser Boon of Fractals  [LESSER BOON]  WATER
  "lesser-boon-of-fractals": {
    name: "フラクタルの小さな恩恵",
    effect:
      "この恩恵は、あなたがコントロールするフラクタル1つにつき、授けるコストが3少なくなる。\n\n" +
      "この恩恵を得る際、コアフラクタル・トークンを2体レスト状態で**召喚**する。",
    flavor: "輝き、光を捨てた者すべての目を眩ませよ。",
  },

  // Lesser Boon of Nourishment  [LESSER BOON]  NORM
  "lesser-boon-of-nourishment": {
    name: "滋養の小さな恩恵",
    effect:
      "この恩恵を得る際、キッチンまたは食料のカードを求めて**スカベンジ13**する。\n\n" +
      "(2)：対象の対戦相手は、あなたがコントロールする対象の食料のアイテムのコントロールを得る。そうしたなら、あなたはカードを1枚あなたのメモリーに引く。この能力はスロースピードでのみ起動できる。",
  },

  // Lesser Boon of Permeation  [LESSER BOON]  WATER
  "lesser-boon-of-permeation": {
    name: "浸透の小さな恩恵",
    effect:
      "あなたがコントロールする「パンテオン・バリア」という名前のドメインから**耐久カウンター**が1個以上取り除かれるたび、あなたのデッキの一番上から**X**枚のカードをあなたの墓地に置く。**X**は、この方法で取り除かれた**耐久カウンター**の数。",
    flavor: "余分を削ぎ落とせば、安らぎが訪れる。",
  },

  // Lesser Boon of Provocation  [LESSER BOON]  FIRE
  "lesser-boon-of-provocation": {
    name: "挑発の小さな恩恵",
    effect:
      "**レベルロック1** *（このカードは、あなたのチャンピオンの基本レベルが1以上の場合にのみプレイできる。）*\n\n" +
      "この恩恵は、対戦相手のリコレクションフェイズ中にのみ授けられる。\n\n" +
      "ターンプレイヤーがコントロールする対象のアライは、このターン、可能なら別の対象の対戦相手がコントロールするユニットを攻撃しなければならない。",
  },

  // Lesser Boon of Proxia  [LESSER BOON]  NORM
  "lesser-boon-of-proxia": {
    name: "プロクシアの小さな恩恵",
    effect:
      "この恩恵を得る際、あなたがコントロールしていない、メモリーコストが0の対象のレガリアのトークンコピーを1つ**召喚**する。",
    flavor: "閃きが訪れ、プロクシアの設計によってそれは現実となる。",
  },

  // Lesser Boon of Refuge  [LESSER BOON]  WIND
  "lesser-boon-of-refuge": {
    name: "避難の小さな恩恵",
    effect:
      "この**恩恵**を得る際、このターン、対象のオブジェクトに与えられる次の2+**X**+**Y**点のダメージを軽減する。**X**はあなたのパンテオンにある風エレメントの恩恵の数、**Y**はあなたのチャンピオンのリネージュにある風エレメントのカードの数。",
    flavor: "避難を求めよ、さらば与えられん。",
  },

  // Lesser Boon of Sword Saint  [LESSER BOON]  NORM
  "lesser-boon-of-sword-saint": {
    name: "剣聖の小さな恩恵",
    effect:
      "あなたがコントロールする剣ウェポンは+1[パワー]を得る。\n\n" +
      "あなたがコントロールする剣ウェポンは、追加の**耐久カウンター**が1個置かれた状態で場に出る。",
    flavor: "刃と刃が打ち合うときにのみ生まれる高揚がある。",
  },

  // Lesser Boon of Virelai  [LESSER BOON]  NORM
  "lesser-boon-of-virelai": {
    name: "ヴィレライの小さな恩恵",
    effect:
      "この恩恵を得る際、ハーモニーまたはメロディのカードを求めて**スカベンジ10**する。",
    flavor: "ヴィレライの歌は、聴く者のあらゆる病を癒すと言われる。だが彼女の声は擦り切れ、今ではごくまれにしか響かない。",
  },
});
