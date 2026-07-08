"use strict";
/*
 * カードの日本語訳・画像URLまわりの共通ヘルパー。
 * トップページ(app.js)とデッキ構築ツールの両方から使う。
 * data/translations.js(window.GA_I18N)より後、利用側スクリプトより前に読み込むこと。
 */
window.GA_CARD_I18N = (() => {
  const IMG_BASE = "https://api.gatcg.com";
  const I18N = window.GA_I18N || { meta: {}, terms: {}, cards: {} };

  function tr(card) {
    return (I18N.cards && I18N.cards[card.slug]) || null;
  }

  function jpName(card) {
    const t = tr(card);
    return t && t.name ? t.name : card.name;
  }

  function firstEdition(card) {
    const eds = card.editions || card.result_editions || [];
    return eds[0] || null;
  }

  function imageUrl(card) {
    const ed = firstEdition(card);
    return ed && ed.image ? IMG_BASE + ed.image : null;
  }

  // ---------- 両面（flip）カード ----------
  // 公式APIは常に「表面」のカードを返し、裏面は edition.other_orientations[0] に格納する。
  // 画像は other_orientations[0].edition.image、裏面は独自の slug/name/effect を持つ。

  // flip 構成（表面）を持つ edition を返す。無ければ null。
  function flipEdition(card) {
    const eds = card.editions || card.result_editions || [];
    return eds.find((ed) => ed.configuration === "flip" && ed.other_orientations && ed.other_orientations.length) || null;
  }

  // 裏面を card 形状に正規化して返す（tr/jpName 等をそのまま流用可能にする）。
  function backFace(card) {
    const ed = flipEdition(card);
    const b = ed && ed.other_orientations[0];
    if (!b) return null;
    const bed = b.edition || {};
    return {
      slug: b.slug,
      name: b.name,
      effect: b.effect,
      classes: b.classes || [],
      elements: b.elements || [],
      types: b.types || [],
      subtypes: b.subtypes || [],
      cost: b.cost,
      level: b.level,
      power: b.power,
      life: b.life,
      durability: b.durability,
      speed: b.speed,
      flavor: b.flavor || bed.flavor || null,
      image: bed.image ? IMG_BASE + bed.image : null,
    };
  }

  return { tr, jpName, firstEdition, imageUrl, flipEdition, backFace };
})();
