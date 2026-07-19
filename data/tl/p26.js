"use strict";
// Promo 2026（P26）日本語訳。translations.js の後に読み込む。
// 既存P26カードは再録元セットのtlファイルで既訳のため、ここには新規カード3枚のみを収録する。
window.GA_I18N = window.GA_I18N || { meta: {}, terms: {}, cards: {} };
window.GA_I18N.cards = Object.assign(window.GA_I18N.cards || {}, {

  // Dinah, Lost Spirit  [CHAMPION]  L0 NORM
  "dinah-lost-spirit": {
    name: "ダイナ、迷い込んだ精霊",
    effect: "**登場時：** カードを7枚引く。",
    flavor: "「ちょっとした気まぐれも、悪くないでしょ！」",
  },

  // Transcendental Rite  [REGALIA/ITEM]  L- NORM
  // 効果は imperial-seal（皇帝の玉璽）と同一文面。
  "transcendental-rite": {
    name: "超越の儀式",
    effect:
      "ディヴァインレリック *（このキーワードを持つカードはマテリアルデッキに1枚しか入れられない。）*\n\n" +
      "「超越の儀式」を追放する：ターン終了時まで、すべての基本エレメントがあなたにとって有効になる。*（火・水・風が基本エレメントである。）*",
    flavor: "「これにより、汝の力は疑いなきものとなる。」",
  },

  // Tristan, Ascendant Shadow  [CHAMPION]  L4 NORM
  // flavor は原文のまま（世界王者クレジットは訳さない方針・#1設計書第2版①）。
  // キーを置かないことで card-detail.js / build-card-pages.mjs が英語原文にフォールバックする。
  "tristan-ascendant-shadow": {
    name: "トリスタン、アセンダントの影",
    effect:
      "**トリスタン・リネージュ** *（「トリスタン、アセンダントの影」は、前のレベルの「トリスタン」チャンピオンからレベルアップさせなければならない。）*\n\n" +
      "(2025)：不吉な影トークンを望む数**召喚**する。ゲームの残りの間、あなたがオーナーであるアタックカードは「**ヒット時：** あなたのコントロールするファンタジアのアライを1体レストして、そのアライでアタックを宣言してよい。そうしたなら、このカードをそのアタッカーのインテントに置く。」を持つ。この能力は、トリスタンがアセンダントである場合にのみ起動できる。",
  },

});
