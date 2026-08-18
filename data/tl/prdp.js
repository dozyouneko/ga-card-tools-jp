"use strict";
// .asphodel/paradise Pantheon（PRDP）日本語訳。translations.js の後に読み込む。
// #73 バッチ1（44枚）のうち本ファイルは2枚（Greater Boon 2種）。
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

});
