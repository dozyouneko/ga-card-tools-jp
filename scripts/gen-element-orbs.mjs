// タスク#15: 属性玉アイコン(32px WebP)の生成(設計: docs/design/15-順位表の属性チャンピオン表示/)
//
//   node scripts/gen-element-orbs.mjs
//
// 公式カード画像から属性玉を円形に切り出して 32px の WebP にし、base64 を
// scripts/lib/element-orbs.json へ書き出す。build-tournament-pages.mjs はこのJSONを読んで
// tournaments.css に data URI として埋め込むだけなので、日次cronのビルドは
// ネットワークにも画像処理ライブラリにも依存しない。
//
// ⚠ このスクリプトは手動実行専用(新しい属性が追加されたときだけ再生成する)。
//    出力JSONは必ずコミットすること。sharp は wrangler 経由で node_modules に入っている
//    ため、無い場合は `npm i -D sharp` してから実行する。
//
// 切り出し座標はデッキ構築ツールの drawElementOrb() と同一(500×700基準で中心449,47・半径22)。
// 元画像は各属性の「単属性カード」を使う(複属性カードは玉の周りにEXALTEDの金装飾が
// 写り込むため。tools/deck-builder/app.js の orbSourceCard() と同じ考え方)。

import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadCards } from "./lib/cards-snapshot.mjs";
import { loadPageI18n } from "./lib/page-i18n.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "scripts", "lib", "element-orbs.json");
const SIZE = 32;
const QUALITY = 80;

// 属性 → 切り出し元カードのslug(設計書の実測値。すべて単属性カード)
const SRC = {
  FIRE: "absolving-flames",
  WATER: "acquiescing-rejection",
  WIND: "adept-swordmaster",
  ARCANE: "advent-of-the-stormcaller",
  ASTRA: "aethercloak-sentinel",
  CRUX: "beacon-knight",
  EXIA: "annihilation",
  LUXEM: "advent-of-the-shenju",
  NEOS: "aegis-of-dawn",
  NORM: "academy-attendant",
  TERA: "acerbica",
  UMBRA: "abnegation",
};

const log = (s) => process.stderr.write(s + "\n");

async function main() {
  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    throw new Error("sharp が見つかりません。`npm i -D sharp` を実行してから再試行してください。");
  }

  const { CI } = loadPageI18n(ROOT);
  const cards = await loadCards(ROOT);
  const bySlug = new Map(cards.map((c) => [c.slug, c]));

  // 円形マスク(切り出した正方形の外側を透明にする)
  const mask = Buffer.from(
    `<svg width="${SIZE}" height="${SIZE}"><circle cx="${SIZE / 2}" cy="${SIZE / 2}" r="${SIZE / 2}" fill="#fff"/></svg>`
  );

  const out = {};
  for (const [element, slug] of Object.entries(SRC)) {
    const card = bySlug.get(slug);
    if (!card) throw new Error(`${element}: カード ${slug} がスナップショットにありません`);
    const els = card.elements || [];
    if (els.length !== 1 || els[0] !== element) {
      throw new Error(`${element}: ${slug} は単属性カードではありません(${els.join("/")})`);
    }
    const imgs = CI.cardImages(card);
    if (!imgs.length) throw new Error(`${element}: ${slug} に画像がありません`);

    const res = await fetch(imgs[0].url);
    if (!res.ok) throw new Error(`${imgs[0].url}: HTTP ${res.status}`);
    const src = sharp(Buffer.from(await res.arrayBuffer()));
    const { width: w, height: h } = await src.metadata();
    const cx = (449 / 500) * w, cy = (47 / 700) * h, r = (22 / 500) * w;

    const buf = await src
      .extract({
        left: Math.round(cx - r), top: Math.round(cy - r),
        width: Math.round(r * 2), height: Math.round(r * 2),
      })
      .resize(SIZE, SIZE, { kernel: "lanczos3" })
      .composite([{ input: mask, blend: "dest-in" }])
      .webp({ quality: QUALITY, effort: 6 })
      .toBuffer();

    out[element] = { src: slug, b64: buf.toString("base64") };
    log(`  ${element.padEnd(7)} ${slug} → ${buf.length}B`);
  }

  mkdirSync(path.dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify({
    generatedAt: new Date().toISOString().slice(0, 10),
    size: SIZE, quality: QUALITY, format: "webp",
    orbs: out,
  }, null, 1) + "\n");
  const total = Object.values(out).reduce((n, v) => n + v.b64.length, 0);
  log(`\n生成: ${Object.keys(out).length}属性 / base64合計 ${(total / 1024).toFixed(1)}KB → ${path.relative(ROOT, OUT)}`);
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
