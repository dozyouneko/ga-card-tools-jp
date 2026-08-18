"use strict";
// .asphodel/paradise Draft Pack（PRDDP）日本語訳。translations.js の後に読み込む。
// Nameless Champion 3種（クラス組合せ違い：ASSASSIN/WARRIOR・MAGE/TAMER・RANGER/WARRIOR）は
// 既訳15種（ambdp.js）と同一の英語名・効果文のため、同じ訳文をそのまま流用する（#73設計書§2-4）。
// #73 バッチ1（44枚）のうち本ファイルは3枚。
window.GA_I18N = window.GA_I18N || { meta: {}, terms: {}, cards: {} };
window.GA_I18N.cards = Object.assign(window.GA_I18N.cards || {}, {

  // Nameless Champion  [CHAMPION]  NORM  L1  (ASSASSIN/WARRIOR)
  "nameless-champion": {
    name: "名もなきチャンピオン",
    effect: "このチャンピオンはレベルアップできない。\n\n(6)：カードを1枚引き、「名もなきチャンピオン」に**レベルカウンター**を1個置く。この能力は1回のみ起動できる。*（チャンピオンは、自身に置かれた**レベルカウンター**1個につき+1レベルを得る。）*",
  },

  // Nameless Champion  [CHAMPION]  NORM  L1  (MAGE/TAMER)
  "nameless-champion-mt": {
    name: "名もなきチャンピオン",
    effect: "このチャンピオンはレベルアップできない。\n\n(6)：カードを1枚引き、「名もなきチャンピオン」に**レベルカウンター**を1個置く。この能力は1回のみ起動できる。*（チャンピオンは、自身に置かれた**レベルカウンター**1個につき+1レベルを得る。）*",
  },

  // Nameless Champion  [CHAMPION]  NORM  L1  (RANGER/WARRIOR)
  "nameless-champion-rw": {
    name: "名もなきチャンピオン",
    effect: "このチャンピオンはレベルアップできない。\n\n(6)：カードを1枚引き、「名もなきチャンピオン」に**レベルカウンター**を1個置く。この能力は1回のみ起動できる。*（チャンピオンは、自身に置かれた**レベルカウンター**1個につき+1レベルを得る。）*",
  },

});
