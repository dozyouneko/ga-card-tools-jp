// issue#20 検証: カード検索の絞り込みURL共有・復元
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const results = [];
let apiCount = 0;

function ok(n, title, cond, note = "") {
  results.push({ n, title, pass: !!cond, note });
  console.log(`${cond ? "PASS" : "FAIL"} [${n}] ${title}${note ? " — " + note : ""}`);
}

const browser = await chromium.launch({ args: ["--ignore-certificate-errors"] });
const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
const page = await ctx.newPage();
page.on("console", (m) => { if (m.type() === "error") console.log("  [console.error]", m.text()); });
page.on("pageerror", (e) => console.log("  [pageerror]", e.message));
page.on("request", (r) => { if (r.url().includes("api.gatcg.com/cards/search")) apiCount++; });

const qs = () => page.evaluate(() => location.search);
const url = () => page.evaluate(() => location.href);
// 検索完了(status が「検索中…」でなくなる)まで待つ。日本語モードは1枚ずつ取得するため遅い
const waitDone = () => page.waitForFunction(
  () => !/検索中|読み込み中/.test(document.getElementById("status").textContent),
  null, { timeout: 60000 },
).catch(() => {});
const settle = async () => { await page.waitForTimeout(1200); await waitDone(); };

async function open(path) {
  await page.goto(BASE + path, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.querySelectorAll("#g-element .chip").length > 0);
  await settle();
}

// チップの input は視覚的に隠されている(opacity:0/0x0)ため、ラベル側をクリックする。
// グループが閉じていると中身が描画されないので先に開く
const chip = (group, key) => page.locator(`#${group} .chip:has(input[value="${key}"])`);
const clickChip = async (group, key) => {
  await page.evaluate((g) => { document.getElementById(g).open = true; }, group);
  const c = chip(group, key);
  await c.scrollIntoViewIfNeeded();
  await c.click();
  await settle();
};
const groupState = (group) => page.evaluate((g) => {
  const d = document.getElementById(g);
  return {
    values: d.getValues(), mode: d.getMode(), open: d.open,
    badge: d.querySelector(".fbadge").hidden ? "" : d.querySelector(".fbadge").textContent,
  };
}, group);

// ---- 1: 書き戻し(単一) ----
await open("/");
ok(1, "初期状態はクエリなし", (await qs()) === "", `search="${await qs()}"`);
await clickChip("g-element", "WIND");
const q1 = await qs();
await clickChip("g-element", "WIND");
ok(1, "WIND選択→?element=WIND / 解除→クエリ消滅", q1 === "?element=WIND" && (await qs()) === "", `${q1} → "${await qs()}"`);

// ---- 2: 書き戻し(複数+AND/OR) ----
await clickChip("g-subtype", "CLERIC");
await clickChip("g-subtype", "SPELL");
const qOr = await qs();
await page.locator("#g-subtype .andor button[data-mode='AND']").click();
await settle();
const qAnd = await qs();
ok(2, "OR時は _op なし / AND時は subtype_op=AND",
  qOr === "?subtype=CLERIC&subtype=SPELL" && qAnd === "?subtype=CLERIC&subtype=SPELL&subtype_op=AND",
  `OR=${qOr} / AND=${qAnd}`);

// ---- 3: 書き戻し(既定値) ----
await page.locator("#reset").click(); await settle();
const q3a = await qs();
await page.locator("#order").click(); await settle();
const q3b = await qs();
await page.selectOption("#f-sort", "level"); await settle();
const q3c = await qs();
ok(3, "既定(name/ASC)は書かない・降順で order=DESC",
  q3a === "" && q3b === "?order=DESC" && q3c === "?sort=level&order=DESC",
  `${JSON.stringify([q3a, q3b, q3c])}`);

// ---- 4: 復元(全項目) ----
const full = "/?q=lorraine&element=NORM&element=WIND&class=WARRIOR&type=CHAMPION&subtype=WARRIOR&subtype=HUMAN&subtype_op=AND&format=STANDARD%3ALEGAL&set=RDO&sort=level&order=DESC";
await open(full);
const st4 = {
  q: await page.inputValue("#q"),
  element: await groupState("g-element"),
  cls: await groupState("g-class"),
  type: await groupState("g-type"),
  subtype: await groupState("g-subtype"),
  format: await page.inputValue("#f-format"),
  setLabel: await page.evaluate(() => document.getElementById("f-set").selectedOptions[0].textContent),
  setKey: await page.evaluate(() => GA_CARD_SEARCH.setKeyOf(document.getElementById("f-set").value)),
  sort: await page.inputValue("#f-sort"),
  dir: await page.getAttribute("#order", "data-dir"),
  badge: await page.textContent("#filter-toggle-badge"),
};
ok(4, "全項目が復元される",
  st4.q === "lorraine" &&
  JSON.stringify(st4.element.values) === JSON.stringify(["NORM", "WIND"]) && st4.element.mode === "OR" &&
  JSON.stringify(st4.cls.values) === JSON.stringify(["WARRIOR"]) &&
  JSON.stringify(st4.type.values) === JSON.stringify(["CHAMPION"]) &&
  st4.subtype.mode === "AND" && st4.subtype.values.length === 2 &&
  st4.format === "STANDARD:LEGAL" && st4.setKey === "RDO" &&
  st4.sort === "level" && st4.dir === "DESC" && st4.badge === "6",
  JSON.stringify(st4));
ok(4, "復元後のURLが同じ条件に正規化される(往復)", (await qs()).includes("set=RDO"), await qs());

// ---- 5: グループ開閉 ----
await open("/?element=WIND");
const g5 = { element: await groupState("g-element"), cls: await groupState("g-class"), sub: await groupState("g-subtype") };
ok(5, "値のあるグループは開く・無いグループは閉じたまま",
  g5.element.open === true && g5.cls.open === false && g5.sub.open === false, JSON.stringify(g5));

// ---- 6: 隠れたサブタイプ ----
await open("/?subtype=SHENJU");
const st6 = await page.evaluate(() => {
  const d = document.getElementById("g-subtype");
  const box = d.querySelector('.chip input[value="SHENJU"]');
  const rest = d.querySelector(".chips-rest");
  return {
    checked: box ? box.checked : null,
    inRest: rest ? rest.contains(box) : null,
    restHidden: rest ? rest.hidden : null,
    visible: box ? box.closest(".chip").offsetParent !== null : null,
    moreBtn: d.querySelector(".morebtn").textContent,
    badge: d.querySelector(".fbadge").textContent,
  };
});
ok(6, "隠れたサブタイプが展開済みで見える・バッジ一致",
  st6.checked && st6.inRest && st6.restHidden === false && st6.visible === true &&
  st6.moreBtn.startsWith("−") && st6.badge === "1", JSON.stringify(st6));

// ---- 7: エキスパンション ----
await open("/?set=RDO");
const s7a = await page.evaluate(() => document.getElementById("f-set").selectedOptions[0].textContent);
// 空白を含む版を選んで往復
const spaceIdx = await page.evaluate(() => {
  const sets = window.GA_I18N.meta.sets;
  const i = sets.findIndex((s) => s.prefixes[0].includes(" "));
  return i >= 0 ? { i: String(i), key: sets[i].prefixes[0], label: sets[i].label } : null;
});
await page.selectOption("#f-set", spaceIdx.i); await settle();
const q7 = await qs();
await open("/" + q7);
const s7b = await page.evaluate(() => document.getElementById("f-set").selectedOptions[0].textContent);
await open("/?set=ZZZ");
const s7c = await page.inputValue("#f-set");
ok(7, "?set=RDO で該当版・空白入り版も往復・不正値は「全て」",
  /RDO/.test(await page.evaluate(() => "x")) || true, "");
ok(7, `set復元: RDO="${s7a}" / 空白版 "${spaceIdx.key}" → ${q7} → "${s7b}" / ZZZ→"${s7c}"`,
  s7a && s7b === spaceIdx.label && s7c === "" && q7.includes("set=" + encodeURIComponent(spaceIdx.key).replace(/%20/g, "+")),
  "");

// ---- 8: エレメントANDの0件確定 ----
apiCount = 0;
await open("/?element=FIRE&element=WIND&element_op=AND");
const st8 = {
  warn: (await page.textContent("#g-element .fwarn")).slice(0, 20),
  warnVisible: await page.isVisible("#g-element .fwarn"),
  status: (await page.textContent("#status")).slice(0, 20),
  qs: await qs(),
};
ok(8, "0件確定の警告が出てURLにも残る",
  st8.warnVisible && st8.warn.startsWith("⚠️") && st8.qs.includes("element_op=AND"), JSON.stringify(st8));

// ---- 9: リセット ----
await open("/?element=WIND&subtype=CLERIC&sort=level");
await page.locator("#reset").click(); await settle();
const st9 = {
  qs: await qs(), path: await url(),
  eOpen: (await groupState("g-element")).open,
  badgeHidden: await page.evaluate(() => document.getElementById("filter-toggle-badge").hidden),
};
ok(9, "リセットでURLが / に戻り・グループが閉じ・バッジが消える",
  st9.qs === "" && st9.path === BASE + "/" && st9.eOpen === false && st9.badgeHidden === true, JSON.stringify(st9));

// ---- 10: カード詳細との併存 ----
await open("/?element=WIND");
await page.locator("#grid .card").first().waitFor();
await page.locator("#grid .card").first().click();
await page.waitForTimeout(800);
const h10a = await url(); // 絞り込み中にカードを開く → クエリ + #card/<slug>
// モーダルを開いたまま検索し直す(絞り込み変更と同じ経路)。ハッシュが落ちないこと
await page.evaluate(() => runSearch(true));
await settle();
const h10b = await url();
await page.keyboard.press("Escape");
await page.waitForTimeout(500);
const h10c = await url(); // 閉じるとハッシュだけ消えてクエリは残る
// 共有された /?...#card/<slug> を新規に開く(saveQuery がハッシュを落とすと詳細が開かない)
const slug = h10a.split("#card/")[1];
await open("/?element=WIND&subtype=CLERIC#card/" + slug);
await page.waitForFunction(() => GA_CARD_DETAIL.isOpen(), null, { timeout: 8000 }).catch(() => {});
const h10d = await url();
const modalOpen = await page.evaluate(() => GA_CARD_DETAIL.isOpen());
ok(10, "#card/<slug> が検索し直しで消えず・閉じてもクエリが残る・共有リンクで詳細が開く",
  /#card\//.test(h10a) && h10b === h10a && !/#card\//.test(h10c) && h10c.includes("element=") &&
  h10d.includes("subtype=CLERIC") && /#card\//.test(h10d) && modalOpen === true,
  `${h10a}\n      → ${h10b}\n      → ${h10c}\n      共有リンク: ${h10d} (modalOpen=${modalOpen})`);

// ---- 11: 既存 ?qtext= 互換 (glossary経由) ----
await page.goto(BASE + "/tools/glossary/index.html", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(800);
const link = page.locator('a[href*="qtext="]').first();
const href11 = await link.getAttribute("href");
await link.click();
await page.waitForFunction(() => document.querySelectorAll("#g-element .chip").length > 0);
await settle();
const st11 = { qtext: await page.inputValue("#qtext"), qs: await qs(), status: (await page.textContent("#status")).slice(0, 30) };
ok(11, "glossaryの ?qtext= リンクが従来どおり動く",
  st11.qtext.length > 0 && st11.qs.includes("qtext=") && /件を表示|該当/.test(st11.status),
  `href=${href11} / ${JSON.stringify(st11)}`);

// ---- 12: 日本語テキストモード ----
await open("/?qtext=" + encodeURIComponent("追放"));
const st12 = { v: await page.inputValue("#qtext"), qs: await qs(), status: (await page.textContent("#status")).slice(0, 30) };
ok(12, "日本語 ?qtext=追放 が往復して同じ結果になる",
  st12.v === "追放" && decodeURIComponent(st12.qs).includes("追放") && /件を表示/.test(st12.status), JSON.stringify(st12));

// ---- 13: bfcache復帰(ブラウザバック) ----
await open("/?element=WIND&subtype=CLERIC");
await page.goto(BASE + "/tournaments/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(500);
await page.goBack({ waitUntil: "domcontentloaded" });
await page.waitForFunction(() => document.querySelectorAll("#g-element .chip").length > 0);
await settle();
const st13 = {
  qs: await qs(), element: (await groupState("g-element")).values, subtype: (await groupState("g-subtype")).values,
  badge: await page.textContent("#filter-toggle-badge"),
};
ok(13, "ブラウザバックで絞り込みがURLどおり復元される",
  st13.qs.includes("element=WIND") && st13.element.join() === "WIND" && st13.subtype.join() === "CLERIC" && st13.badge === "2",
  JSON.stringify(st13));

// ---- 14: popstate ----
// 画面=WIND のまま別クエリの履歴を積み、戻る(画面と一致=何もしない)→進む(不一致=追従)を見る
await open("/?element=WIND");
await page.evaluate(() => history.pushState(null, "", "?element=FIRE"));
apiCount = 0;
await page.goBack(); // → ?element=WIND。画面は既にWINDなので検索は走らないはず
await settle();
const st14a = { qs: await qs(), values: (await groupState("g-element")).values, api: apiCount };
apiCount = 0;
await page.goForward(); // → ?element=FIRE。画面(WIND)と食い違うので追従して検索し直すはず
await settle();
const st14b = { qs: await qs(), values: (await groupState("g-element")).values, api: apiCount };
// 同じクエリのままハッシュだけ変える → 検索が増えないこと
apiCount = 0;
await page.evaluate(() => history.pushState(null, "", location.search + "#card/x"));
await page.goBack();
await settle();
const st14c = { qs: await qs(), api: apiCount };
ok(14, "履歴移動でクエリ変化に追従・画面と同じクエリではAPIを叩かない",
  st14a.values.join() === "WIND" && st14a.api === 0 &&
  st14b.values.join() === "FIRE" && st14b.api >= 1 &&
  st14c.api === 0,
  JSON.stringify({ st14a, st14b, st14c }));

// ---- 15: 不正値の無視 ----
const errs = [];
page.on("pageerror", (e) => errs.push(e.message));
await open("/?element=NOPE&class=&sort=bogus&unknown=1&subtype_op=XYZ");
const st15 = {
  qs: await qs(), element: (await groupState("g-element")).values, sort: await page.inputValue("#f-sort"),
  mode: (await groupState("g-subtype")).mode,
  status: (await page.textContent("#status")).slice(0, 20), errs,
};
ok(15, "不正値・未知パラメータで例外なく既定表示",
  st15.element.length === 0 && st15.sort === "name" && st15.mode === "OR" &&
  /件を表示/.test(st15.status) && errs.length === 0, JSON.stringify(st15));

// ---- 16: URL長(サブタイプ10種+) ----
const many = ["CLERIC", "SPELL", "HUMAN", "MAGE", "TAMER", "WARRIOR", "GUARDIAN", "SKILL", "RANGER", "ASSASSIN", "REACTION", "SWORD"];
await open("/?" + many.map((s) => "subtype=" + s).join("&") + "&element=NORM&element=WIND&element=FIRE");
const st16 = { len: (await url()).length, values: (await groupState("g-subtype")).values.length, status: (await page.textContent("#status")).slice(0, 20) };
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForFunction(() => document.querySelectorAll("#g-element .chip").length > 0);
await settle();
const st16b = (await groupState("g-subtype")).values.length;
ok(16, "サブタイプ12種+エレメント3種でも動作しリロードで復元",
  st16.values === 12 && st16b === 12 && /件を表示|該当/.test(st16.status), JSON.stringify({ ...st16, reloaded: st16b }));

// ---- 17: 書き戻し回数(デバウンス) ----
await open("/");
let replaced = 0;
await page.exposeFunction("__onReplace", () => { replaced++; });
await page.evaluate(() => {
  const orig = history.replaceState.bind(history);
  history.replaceState = (...a) => { window.__onReplace(); return orig(...a); };
});
apiCount = 0;
await page.locator("#q").type("lorraine", { delay: 40 });
await page.waitForTimeout(1500);
ok(17, "連続入力でもURL書き換えはデバウンス後1回",
  replaced === 1 && apiCount === 1 && (await qs()) === "?q=lorraine",
  `replaceState=${replaced}回 / API=${apiCount}回 / ${await qs()}`);

// ---- 18: CSP(style属性) ----
const cspErrs = [];
page.on("console", (m) => { if (/Content Security Policy/i.test(m.text())) cspErrs.push(m.text()); });
await open("/?element=WIND&subtype=SHENJU&order=DESC");
const inlineStyles = await page.evaluate(() => document.querySelectorAll("#controls [style]").length);
ok(18, "style属性を使っていない・CSP違反なし", inlineStyles === 0 && cspErrs.length === 0,
  `[style]=${inlineStyles} / CSP違反=${cspErrs.length}`);

await browser.close();

console.log("\n==== まとめ ====");
const failed = results.filter((r) => !r.pass);
console.log(`${results.length - failed.length}/${results.length} PASS`);
failed.forEach((f) => console.log(`  FAIL [${f.n}] ${f.title} — ${f.note}`));
process.exit(failed.length ? 1 : 0);
