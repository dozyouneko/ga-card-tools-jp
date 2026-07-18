// 第9版⑲ 検証スクリプト（.stats-pane の max-width:880px）
//
// 実行方法（リポジトリルートで）:
//   PORT=3111 node scripts/serve.mjs &            # 静的サーバ起動
//   npx playwright install chromium               # 初回のみ（システム依存が要る場合 sudo npx playwright install-deps chromium）
//   node docs/design/12-デッキ統計タブ/検証/第9版⑲/verify.mjs
//
// 本番ページ(index.html + style.css)を実際に読み込み、renderStatsInto と同一クラスの
// 統計マークアップを #ed-pane-stats に注入して、1920/768/390px でパネル幅・棒幅・
// 横スクロールの有無を実測する。app.js のAPI呼び出しは失敗するが、DOMを直接差し込むため影響なし。
import { chromium } from 'playwright';

const URL = process.env.URL || 'http://localhost:3111/tools/deck-builder/index.html';
const OUT = new URL('.', import.meta.url).pathname; // このスクリプトと同じフォルダに出力

// 本番 statsHtml が生成するマークアップを模した代表的な統計DOM（クラス名は本番と一致）
const statsMarkup = `
<div class="stat-card"><h3>メインデッキ <span class="cnt">60枚</span></h3>
  <div class="stat-sec"><h4>エレメント別</h4>
    <div class="statrow"><span class="sr-label">WIND（風）</span><span class="sr-track"><i data-w="100" data-c="#3f9d63"></i></span><span class="sr-val">18</span></div>
    <div class="statrow"><span class="sr-label">WATER（水）</span><span class="sr-track"><i data-w="60" data-c="#3f97c4"></i></span><span class="sr-val">11</span></div>
    <div class="statrow"><span class="sr-label">PHANTASIA（ファンタジア）</span><span class="sr-track"><i data-w="30" data-c="#7b8fd4"></i></span><span class="sr-val">5</span></div>
    <p class="sr-note sr-note--multi">※複数のエレメント・タイプ・サブタイプを持つカードは各項目に数えるため、合計がデッキ枚数と一致しないことがあります。</p>
  </div>
  <div class="stat-sec"><h4>タイプ別</h4>
    <div class="statrow"><span class="sr-label">ALLY（アライ）</span><span class="sr-track"><i data-w="100" data-c="#56779e"></i></span><span class="sr-val">32</span></div>
    <div class="statrow"><span class="sr-label">ACTION（アクション）</span><span class="sr-track"><i data-w="55" data-c="#56779e"></i></span><span class="sr-val">18</span></div>
  </div>
  <details class="stat-fold stat-sec" data-zone="main"><summary>サブタイプ別 6種</summary>
    <p class="subtype-line">WARRIOR（ウォリアー） <b>12</b><span class="sep">・</span>SPIRIT（スピリット） <b>8</b><span class="sep">・</span>MAGE（メイジ） <b>6</b><span class="sep">・</span>ELEMENTAL（エレメンタル） <b>5</b><span class="sep">・</span>BEAST（ビースト） <b>4</b><span class="sep">・</span>ASSASSIN（アサシン） <b>3</b></p>
  </details>
  <div class="stat-sec"><h4>キーワード</h4>
    <p class="subtype-line">Floating Memory（フローティングメモリー） <b>9</b> <span class="inner">（うち条件付き 3枚）</span></p>
  </div>
</div>
<div class="stat-card"><h3>フォーマット適合</h3>
  <div class="stat-sec"><h4>スタンダード</h4>
    <p class="fmt-ng">⚠️ メイン同名4枚制限の超過 3種 — Baby Green Slime（緑のベビースライム） ×5・Some Long English Card Name（とても長い日本語のカード名前） ×6・Another（別の） ×5</p>
  </div>
  <p class="sr-note">※パンテオンは別途Boon 2枚（Lesser／Greater 各1）が必要です（本ツールでは管理対象外）。パンテオンにサイドボードはありません。</p>
</div>`;

const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', () => {}); // app.js のAPI失敗は無視
await page.goto(URL, { waitUntil: 'domcontentloaded' });

// 実ページの #view-editor / stats-pane を可視化して本番マークアップを注入
await page.evaluate((html) => {
  document.querySelectorAll('body > section').forEach((s) => { s.hidden = true; });
  document.getElementById('view-editor').hidden = false;
  document.getElementById('ed-pane-deck').hidden = true;
  const pane = document.getElementById('ed-pane-stats');
  pane.hidden = false;
  pane.innerHTML = html;
  // 本番 renderStatsInto と同じ CSSOM での幅・色適用（CSP style-src 'self' 対応）
  pane.querySelectorAll('.sr-track i[data-w]').forEach((bar) => {
    bar.style.width = bar.dataset.w + '%';
    bar.style.background = bar.dataset.c;
  });
}, statsMarkup);

const measure = async (w, h, tag) => {
  await page.setViewportSize({ width: w, height: h });
  await page.waitForTimeout(120);
  const m = await page.evaluate(() => {
    const pane = document.getElementById('ed-pane-stats');
    const track = pane.querySelector('.sr-track');
    const longLabel = [...pane.querySelectorAll('.sr-label')].find(e => e.textContent.includes('PHANTASIA'));
    const paneRect = pane.getBoundingClientRect();
    const trackRect = track.getBoundingClientRect();
    return {
      docScrollW: document.documentElement.scrollWidth,
      innerW: window.innerWidth,
      paneW: Math.round(paneRect.width),
      paneLeft: Math.round(paneRect.left),
      paneRight: Math.round(paneRect.right),
      trackW: Math.round(trackRect.width),
      trackRight: Math.round(trackRect.right),
      longLabelWraps: longLabel ? longLabel.scrollWidth > longLabel.clientWidth + 1 : null,
    };
  });
  m.horizontalScroll = m.docScrollW > m.innerW;
  console.log(`[${tag}] ${w}x${h}`, JSON.stringify(m));
  await page.evaluate(() => document.getElementById('ed-pane-stats').scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(60);
  await page.screenshot({ path: `${OUT}/stats-${tag}.png`, fullPage: false });
  return m;
};

const r1920 = await measure(1920, 1000, '1920');
const r768 = await measure(768, 1000, '768');
const r390 = await measure(390, 800, '390');

console.log('\n=== 判定 (第9版⑲ 検証項目) ===');
const checks = [];
checks.push(['1920px: paneが880pxで止まる (<=881)', r1920.paneW <= 881]);
checks.push(['1920px: 左寄せ (pane.left が画面左端付近 <40)', r1920.paneLeft < 40]);
checks.push(['1920px: 棒/行が880px内に収まる (track.right <= pane.right)', r1920.trackRight <= r1920.paneRight + 1]);
checks.push(['1920px: 横スクロールなし', !r1920.horizontalScroll]);
checks.push(['768px: 従来どおり pane はほぼ画面幅 (>700 かつ <=768)', r768.paneW > 700 && r768.paneW <= 768]);
checks.push(['768px: 横スクロールなし', !r768.horizontalScroll]);
checks.push(['390px: 横スクロールなし', !r390.horizontalScroll]);
checks.push(['サブタイプ別が初期閉 (details.open=false)', await page.evaluate(() => !document.querySelector('details.stat-fold').open)]);

let allPass = true;
for (const [name, ok] of checks) { console.log(`${ok ? '✅' : '❌'} ${name}`); if (!ok) allPass = false; }
console.log('\n' + (allPass ? '✅ ALL PASS' : '❌ FAIL あり'));

await browser.close();
process.exit(allPass ? 0 : 1);
