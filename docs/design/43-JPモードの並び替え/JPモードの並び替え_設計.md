# #43 JPモード（日本語テキスト検索）では並び替えが完全に無視される

対象issue: [#43](https://github.com/dozyouneko/ga-card-tools-jp/issues/43)
関連: [#39](https://github.com/dozyouneko/ga-card-tools-jp/issues/39)（本issueの分離元。**除外規則をそのまま流用する** → §6.2）／
[#27](https://github.com/dozyouneko/ga-card-tools-jp/issues/27)（メタ索引。**本設計で形式を拡張する** → §5）／
[#29](https://github.com/dozyouneko/ga-card-tools-jp/issues/29)（索引の日次cron再生成）／
[#2](https://github.com/dozyouneko/ga-card-tools-jp/issues/2)（絞り込み強化。**数値索引はここで先に入る**）／
[#44](https://github.com/dozyouneko/ga-card-tools-jp/issues/44)（同点ページングの不安定。⭐ **JPモードは本方式で影響を受けない** → §9.3）

## 改版履歴

| 版 | 日付 | 内容 |
|---|---|---|
| **完了** | 2026-08-02 | ユーザーの公開判断を得て push（`8dea2d22..69cbf903`）。**本番検証を全項目クリアし issue #43 をクローズ**。⚠️⚠️ **ここでも「push直後の1回だけの測定」に引っかかった** —— 4ファイルの伝播をキャッシュ回避 curl（`?_=$RANDOM`）で確認してから Playwright を回したのに、**ブラウザは旧 `card-search.js` を掴んでいた**（`GA_CARD_SEARCH.jpSortNote` が `undefined`・**JPモードの並び替えが1つも効かない画面**が撮れた＝修正が丸ごと無かったように見える）。素のURLを引き直すと新版だったので、伝播境界か**クエリ文字列がエッジの別キーになって origin から取り直されていた**かのどちらか。⭐ **教訓: 確認は「ブラウザが実際に読むURL」＝クエリ無しで行う。キャッシュ回避版は「originに届いたか」しか言えない。** 再測定で全項目 ✅（下記） |
| **実装レビュー・承認（第2版）** | 2026-08-02 | 実装 `0342aea5` を設計適合レビューし **承認**。⚠️ **pushは未実施**（ユーザーの公開判断待ち・未push2コミット）。**設計担当側で独立に検証**: ①索引2262エントリの内部整合（8要素・`entry[7]`と`entry[4]`の長さ一致・値域1〜9）に不整合0件、②**スナップショット2240枚すべてについて `nums` / prefix並び / prefix別minレアリティを再計算して照合 → 不一致0件**、③Playwright実駆動で **V6〜V17・V25 が期待表と完全一致・JS例外0件**（⭐ **V17 が per-prefix レアリティを実証** —— `眩惑の遊女(2)` 始まりで、誤実装なら来るはずの `宇宙の稲妻(1)` は6番目）。⚠️⚠️ **§12.2 の V15 期待値が誤っていたので訂正** —— 期待値を「候補列」で書いており、表示側の「表面カードへの置換＋slug重複除去」が入っていなかった。⭐ **開発担当の「#43 が持ち込んだものではない」という判断を本番で独立に確認**（`#43` を含まない本番で 効果欄「グオ・ジアボーナス」→ `30 件を表示 / 全 34 件`）→ **[#45](https://github.com/dozyouneko/ga-card-tools-jp/issues/45) として分離・起票**。✅ 実装側の逸脱2件（`base.length > 0` ガード・`jpMatched` の追加）を**承認**——どちらも設計の穴を正しく塞いでいる（§6.5・§7.3 を訂正） |
| 第1版・実装待ち | 2026-08-02 | 初版。⭐ 方式は **案A（メタ索引に数値を持たせてクライアント側で並べ替える）をユーザーが選択**（案B=UI無効化は却下 → §10）。「名前順」は **slug順のまま昇降だけ直す**をユーザーが選択（§6.1）。⚠️ §2 で **起票時に書いた「レアリティは索引にある」が誤りだったことを訂正**。⚠️ §5.3 で **レアリティは「全editionのmin」ではなく「絞り込み後のeditionのmin」でなければ非JPモードと並びが食い違う**ことを本番APIで実測して確定 |

---

## 1. 問題

**日本語テキスト検索（JPモード）に入ると、並び替えの選択（`sort` / `order`）が完全に無視される。**
プルダウンも ▲▼ も通常どおり操作できてしまうため、「効いていない」ことに気づけない。

原因は [`shared/js/card-search.js`](../../../shared/js/card-search.js) の構造:

```
run()
 ├ isJpTextMode() が真 → jpSlugs = localJpSlugs()      … 最後に out.sort() ＝ slug昇順で固定
 │                        jpCand  = jpSlugs.filter(metaMatches)   … 索引で取得前フィルタ（#27）
 │                        jpCand.slice(from, from+JP_PAGE_SIZE) を1枚ずつ fetchCard()
 │                        ↑ この経路に sort / order を見る箇所が1つも無い
 └ 偽 → buildQuery() が sort / order を API に渡す
```

JPモードは公式APIの `/cards/search` を使わず「候補slugをクライアント側で決めてから個別取得する」構造なので、
**並べ替えるには取得前に全候補の並び替えキーを知っている必要がある**。

---

## 2. ⚠️ 先に前提を1つ訂正する（起票時の記述が誤り）

issue #43 の「対処の候補」表で、案Cの説明に **「レアリティは索引にある」と書いたが、これは誤り**である。

`data/card-meta-index.json` の辞書 **233トークンを全数確認**した結果:

| 種別 | 例 | 件数 |
|---|---|---|
| class / element / type / subtype | `CLERIC` `FIRE` `ALLY` `SWORD` … | ほぼ全部 |
| setPrefix | `AMB` `SP4` `DOA 1st` `ReC-HVF` … | 〃 |
| format（禁止判定用） | `STANDARD` `DRAFT` `PANTHEON` | 3 |
| **レアリティ** | — | **0件** |
| **数値（level / power / life / cost_memory）** | — | **0件** |

つまり **索引は「列挙値のトークン」しか持たず、レアリティも数値も持っていない**。
案Cの「索引不要の範囲で部分的に直す」は、実際には **名前順（slug順）しか直せない**。

> 💡 教訓（メモリの `verify-before-asserting` と同種）: **起票時に書いた「〜は索引にある」は推測だった。**
> 仕様化のときに辞書を全数展開して初めて誤りが分かった。**起票時の記述は設計時に必ず裏を取る。**

---

## 3. 方針 — 案A（索引に並び替えキーを持たせる）

✅ **ユーザー判断（2026-08-02）: 案A を採用。案B（UI無効化）は却下。**

案Bを想定していたのは「索引の拡張は重い」と思っていたためだが、**実測したらそうではなかった**（§4）。
案Aなら **6つの並び替えすべてが実際に効く**ようになり、案Bの目的（「効いていないのに操作できる」状態の解消）も
同時に達成される。

### 3.1 ルール（これ1つ）

> **JPモードの候補slug列（`jpCand`）を、ページに切り出す前に並び替える。**
> 並び替えキーはメタ索引から取る（名前順だけは slug をそのまま使う）。
> 数値項目のときは **#39 と同じ規則でその項目を持たないカードを候補から除く**。
> 索引にキーが無いカードは **除外せず末尾に置き、件数に注記を添える**。

---

## 4. 実測したデータ（すべて 2026-08-02 に実測）

### 4.1 索引のサイズ

`data/card-meta-index.json`（2262slug）に並び替えキーを足したときの増分:

| 内容 | 生 | gzip |
|---|---|---|
| 現状 | 126.2KB | **34.0KB** |
| ＋数値4項目 | 168.3KB | 38.2KB |
| ＋数値4項目＋レアリティ（1カード1値） | 172.8KB | 39.6KB |
| **＋数値4項目＋レアリティ（prefix別・採用案）** | **181.3KB** | **41.6KB** |
| （参考）さらに英語名も入れる | 216.4KB | 54.7KB ← §6.1 で却下 |

**採用案の増分は gzip で +7.6KB。** 索引は「JPモードに初めて入ったとき」に1回だけ取得するので、
体感への影響は無視できる。

### 4.2 索引JSONのキャッシュ

```
$ curl -sI https://ga-card-tools-jp.pages.dev/data/card-meta-index.json
cache-control: public, max-age=0, must-revalidate
etag: "ac81e986a52ff7e1ddaa70a6a8a9e4d7"
```

⭐ **`max-age=0, must-revalidate` なので「古い形式の索引がブラウザに焼き付く」心配は無い。**
ただし push 直後の数十秒は新旧が混ざりうるので、**旧形式（7要素）でも落ちない実装にする**（§6.4）。

### 4.3 ⭐ 公式APIの `sort=rarity` は「絞り込み後のeditionの最小レアリティ」で並ぶ

レアリティはカードではなく **edition（版）** の属性で、1枚のカードが複数のレアリティを持つ。
非JPモードと並びを合わせるには、APIが何を基準にしているかを知る必要がある。

**実測1 — 絞り込み無し:**

```
sort=rarity&order=ASC  先頭50件 → 全カードの min(edition.rarity) 集合 = {1}
sort=rarity&order=DESC 先頭50件 → 全カードの min(edition.rarity) 集合 = {5,6,9}
```

スナップショットでの min の分布は `{1:662, 2:549, 3:541, 4:357, 5:104, 6:11, 9:16}`。
DESC の先頭50件は `9`(16件)＋`6`(11件)＋`5` から23件 ＝ ちょうど50件で一致する。
→ **`min(edition.rarity)` の昇順・降順**である（`max` ではない）。

**実測2 — `prefix=SP4` で絞り込んだとき:**

```
prefix=SP4&sort=rarity&order=ASC 先頭5件
  armored-valkyrie   | eds SP4:2      ← 全editionで見ると ALC に rarity 1 の版がある
  bolt-of-diamonds   | eds SP4:2
  brisk-windtrotter  | eds SP4:2
  …
```

⭐⭐ **APIは `result_editions` を絞り込み後のセットに狭め、その中の min で並べている。**
`armored-valkyrie` は全editionの min が 1 なのに、SP4絞り込み下では 2 として扱われている。

**この差は無視できない** — スナップショットで数えると「そのセット内のminが全editionのminより大きい」カードは
`P25:162件` `P24:150件` `PP1:64件` `P26:56件` `SP2:40件` `SP4:29件` ある。
→ ⚠️ **索引は「カードごとに1つのレアリティ」ではなく「prefixごとの最小レアリティ」を持つ**（§5.1）。

### 4.4 slug昇順は「英語名の昇順」ではない

```
slug昇順と name昇順で位置が違うカード: 1399 / 2240
  位置19: slug順=aethercloak-sentinel / name順=aethers-embrace
  位置88: slug順=armed-and-dangerous  / name順=armed-squallguard
```

→ 現在の `out.sort()`（slug昇順）は APIの `sort=name&order=ASC` と**別物**。§6.1 で扱いを決める。

---

## 5. 索引フォーマットの変更（`scripts/gen-card-meta-index.mjs`）

### 5.1 形式

```
現在: { d: [token,…], m: { slug: [[c],[e],[t],[s],[p],[b]] } }
変更: { d: [token,…], m: { slug: [[c],[e],[t],[s],[p],[b], [nums], [rarities]] } }
                                                            ↑6      ↑7
```

| 位置 | 内容 |
|---|---|
| `entry[6]` | `[level, power, life, cost_memory]`。**その項目を持たないカードは `null`** |
| `entry[7]` | **`entry[4]`（setPrefixトークン列）と同じ並びの「そのセット内の最小レアリティ」** |

`entry[7]` は `entry[4]` と要素数・順序が一致していなければならない。
`entry[4]` は既に `sorted()` 済みなので、**同じソート済み配列から `map` して作れば決定性は保たれる**
（⚠️ 出力の決定性は #29 の必須要件。中身が変わらない日に差分が出ると cron が毎日ノイズコミットする）。

サンプル（`armored-valkyrie`・prefixes は `["ALC","SP4"]`）:

```json
[[23],[38],[9],[10,23],[11,108],[],[null,2,2,null],[1,2]]
                                    ↑ level=null power=2 life=2 cost_memory=null
                                                  ↑ ALC内min=1 / SP4内min=2
```

### 5.2 `metaOf()` の変更

```js
function metaOf(card) {
  const eds = card.editions || card.result_editions || [];
  const prefixes = sorted([...new Set(eds.map((e) => e.set && e.set.prefix).filter(Boolean))]);
  const leg = card.legality || {};
  const banned = ALL_FORMATS.filter((f) => leg[f] && leg[f].limit === 0);
  return {
    classes: sorted(card.classes || []),
    elements: sorted(card.elements || []),
    types: sorted(card.types || []),
    subtypes: sorted(card.subtypes || []),
    prefixes,
    banned: sorted(banned),
    // #43: 並び替え用。null は「その項目を持たない」を意味し、消費側が #39 の規則で除外する。
    // ⚠ 0 と null を混同しないこと（level 0・power 0・life 0・cost_memory 0 はいずれも実在する）
    nums: NUM_FIELDS.map((f) => (card[f] == null ? null : card[f])),
    // #43: prefixes と同じ並びの「そのセット内の最小レアリティ」。
    // 公式APIの sort=rarity が「絞り込み後のeditionの min」で並ぶことに合わせる（設計 §4.3 で実測）
    rarities: prefixes.map((p) => {
      const v = eds.filter((e) => e.set && e.set.prefix === p && e.rarity != null).map((e) => e.rarity);
      return v.length ? Math.min(...v) : null;
    }),
  };
}
const NUM_FIELDS = ["level", "power", "life", "cost_memory"];
```

⚠️ 現在の実装は `prefixes` を「未ソートで作って return 内で `sorted()`」しているので、
**`rarities` と並びを揃えるために、先にソートしてから両方を作る**（上のとおり）。

### 5.3 エントリ組み立て

```js
m[slug] = [
  x.classes.map(tok), x.elements.map(tok), x.types.map(tok),
  x.subtypes.map(tok), x.prefixes.map(tok), x.banned.map(tok),
  x.nums, x.rarities,
];
```

⚠️ **`nums` / `rarities` は辞書化しない**（数値なのでトークン化してもサイズが減らない）。

### 5.4 完走サマリに1行足す（cronログに痕跡を残す）

```
生成: 2262slug / 辞書233トークン / 181.3KB → data/card-meta-index.json
並び替えキー: level 124 / power 908 / life 767 / cost_memory 473 / rarity 2262   ← 追加
```

⚠️ **ここで exit 1 にしてはいけない**（cronの後段に到達しないとその日の大会データの取り込みごと失われる。
CLAUDE.md の `gen-card-meta-index.mjs` の項と同じ理由）。**人を止めるのは `npm run validate` の役**（§8）。

---

## 6. クライアント側の並べ替え（`shared/js/card-search.js`）

### 6.1 並び替えキーの対応表

| プルダウン | `sortField()` | JPモードのキー | 出所 |
|---|---|---|---|
| 名前順 | `name` | **slug** | 索引不要 |
| コスト順 | `cost_memory` | `entry[6][3]` | 索引 |
| レベル順 | `level` | `entry[6][0]` | 索引 |
| パワー順 | `power` | `entry[6][1]` | 索引 |
| ライフ順 | `life` | `entry[6][2]` | 索引 |
| レアリティ順 | `rarity` | `min(entry[7] のうち絞り込み対象prefixのもの)` | 索引 |

✅ **ユーザー判断（2026-08-02）: 「名前順」は slug順のまま、昇降の切替だけ直す。**

理由: §4.4 のとおり slug順は API の name順と1399件ぶんズレるが、**索引に英語名を入れると gzip が +15.1KB 増える**
一方で、**JPモードの画面には日本語名しか出ない**ため、英語名順でも slug順でも利用者には
「アルファベット順に見える」体感は変わらない。**増分に見合う利得が無いと判断した。**
（日本語名の五十音順は却下 → §10）

⚠️ **この妥協は設計書に明記しておく。** 非JPモードと同じ検索語で並びが微妙に違うのは仕様である。

### 6.2 除外規則は #39 をそのまま流用する

数値4項目（`level` / `power` / `life` / `cost_memory`）で並べ替えるときは、
**その項目を持たないカードを候補から除く**。判定は既存の `isNullish()` と同一の規則:

```
v == null  または  (field === "cost_memory" && v === -1)      ← -1 は Xコスト（該当1枚）
```

⚠️ **`isNullish(field, card)` はカードオブジェクトを取るので、索引から擬似カードを組み立てて渡すか、
値を直接判定するヘルパーに分ける**（`metaMatches()` が `pseudo` を組み立てているのと同じ流儀でよい）。
**規則を2箇所に書き写さないこと**（#39 と食い違うと片方だけ静かに壊れる）。

### 6.3 並べ替えの実装

```js
const NUM_POS = { level: 0, power: 1, life: 2, cost_memory: 3 };

// 並び替えキーを索引から取り出す。
//   数値/文字列 … キーが確定した
//   null        … 「その項目を持たない」ことが確定した（数値項目のみ。#39 の規則で除外する）
//   undefined   … 索引に無い・旧形式 ＝ 不明（除外せず末尾へ）
function sortKeyOf(idx, slug, field) {
  if (field === "name") return slug;             // 索引不要（§6.1）
  const entry = idx && idx.m[slug];
  if (!entry || entry.length < 8) return undefined;   // 未収録 or 旧形式（§6.4）
  if (field === "rarity") {
    const names = (entry[4] || []).map((i) => idx.d[i]);
    const rar = entry[7] || [];
    const pre = setPrefixes(val(els.set));
    // エキスパンション絞り込み中は、そのセット内の min で並べる（§4.3）
    const use = names.map((p, i) => ((!pre.length || pre.includes(p)) ? rar[i] : null))
                     .filter((v) => v != null);
    return use.length ? Math.min(...use) : undefined;
  }
  const pos = NUM_POS[field];
  if (pos === undefined) return undefined;
  return (entry[6] || [])[pos];                  // 値 or null or undefined
}

// jpCand を並べ替える。reset のときに1回だけ呼ぶ（loadMore では呼ばない）
function sortJpCand(idx, list) {
  const field = sortField();
  const dir = orderDir() === "DESC" ? -1 : 1;
  const numeric = isNumericSort();
  const keys = new Map();
  const known = [];
  const unknown = [];
  for (const slug of list) {
    const k = sortKeyOf(idx, slug, field);
    if (k === undefined) { unknown.push(slug); continue; }      // 不明 → 末尾（除外しない）
    if (numeric && isNullishValue(field, k)) continue;          // #39 の除外規則（§6.2）
    keys.set(slug, k);
    known.push(slug);
  }
  known.sort((a, b) => {
    const ka = keys.get(a), kb = keys.get(b);
    if (ka !== kb) return (ka < kb ? -1 : 1) * dir;
    return (a < b ? -1 : a > b ? 1 : 0) * dir;   // 同点は slug で決める（降順＝昇順の完全な逆順）
  });
  unknown.sort();   // 索引が無いので方向に依らず slug 昇順で固定
  return { list: known.concat(unknown), unknown: unknown.length };
}
```

⚠️ **`sort()` の比較関数は必ず全順序にする**（同点を slug で決める）。
これを怠ると `Array.prototype.sort` の安定性に依存した「元の並び次第で変わる」順序になる。

### 6.4 fail-open — 索引が使えないときに黙って壊れないこと

| 状況 | `sortKeyOf` | 結果 | 表示 |
|---|---|---|---|
| 索引の取得に失敗（`idx === null`） | 全て `undefined` | 全件が `unknown` ＝ slug昇順・**除外も起きない** | 「並び替えの情報を取得できなかったため、名前順で表示しています」 |
| 旧形式の索引（7要素） | 同上 | 同上 | 同上 |
| 一部のslugが索引に未収録（訳を足した直後〜翌朝のcronまで） | そのslugだけ `undefined` | 末尾に寄る | 「うち◯件は並び替えの情報が無いため末尾にあります」 |

⚠️⚠️ **ここを fail-close（＝キー不明のカードを落とす）にしてはいけない。**
訳を追記して `gen-tl-json.mjs` だけ実行した状態（索引の再生成は翌朝のcron）では、
**新しく訳したカードが JPモードの並び替え下から丸ごと消える**ことになる。
そのカードを見るために訳を足したのに、である。

### 6.5 `run()` への組み込み

```js
if (jpCand === null) {
  const idx = await metaIndex();
  if (mySeq !== seq) return;
  const base = idx ? jpSlugs.filter((s) => metaMatches(idx, s)) : jpSlugs;
  jpApprox = /* 既存のまま */;
  const s = sortJpCand(idx, base);          // ← #43
  jpCand = s.list;
  jpSortUnknown = s.unknown;
  // ⚠ 第2版で訂正: base.length > 0 が要る。候補0件のとき 0 === 0 が成立して
  //   「並び替えを諦めた」扱いになり、§7.3 の0件メッセージが出なくなる（実装側の指摘）
  jpSortDropped = base.length > 0 && s.unknown === base.length && sortField() !== "name";
}
```

⚠️ `jpSortUnknown` / `jpSortDropped` は `jpApprox` と同じスコープに置く
（**`loadMore` でも参照するので、reset のたびに作り直す状態として保持する**）。

⚠️ **並べ替えは `metaMatches` の絞り込みの「後」**。先に並べても結果は同じだが、
除外で件数が減ってからのほうが比較回数が少ない。

⚠️ **`sort` / `order` の変更は `runSearch(true)`（reset）を通る**ことを確認済み
（`app.js:591,593` / デッキ構築ツールも同じ）。よって `jpCand` は毎回作り直され、並びも更新される。

---

## 7. 件数表示とメッセージ

### 7.1 `onResults` に渡す `info`

```js
opts.onResults(cards, {
  …,
  // JPモードでも数値ソートの除外が効くようになったので、注記の条件から !jpSlugs を外す（#43）
  numericSort: isNumericSort() && !jpSortDropped ? sortField() : null,
  jpSortUnknown: jpSlugs ? jpSortUnknown : 0,   // ← 追加
  jpSortDropped: jpSlugs ? jpSortDropped : false, // ← 追加
});
```

⚠️ `jpSortDropped` のときは **除外も起きていない**ので `numericSort` を `null` にする。
そうしないと「全 577 件（レベルを持つカードのみ）」という**嘘の注記**が出る。

### 7.2 注記（`card-search.js` から関数で公開する）

`numericSortNote()` と同じ流儀で、**両ページが同じ文言を共有する**ように公開する:

```js
function jpSortNote(info) {
  if (!info || !info.jpMode) return "";
  if (info.jpSortDropped) return "（並び替えの情報を取得できなかったため、名前順で表示しています）";
  if (info.jpSortUnknown > 0) return `（うち${info.jpSortUnknown}件は並び替えの情報が無いため末尾にあります）`;
  return "";
}
```

`app.js` / `tools/deck-builder/app.js` の両方で、`numericSortNote` の直後に足す:

```js
suffix += GA_CARD_SEARCH.numericSortNote?.(info.numericSort) || "";
suffix += GA_CARD_SEARCH.jpSortNote?.(info) || "";   // ← 追加
```

⚠️ **`?.` は必須**（push直後の伝播ラグで新しい `app.js` と古い `card-search.js` が数十秒だけ組み合わさる。#39 §7.2 と同じ理由）。

### 7.3 ⚠️ 0件のときのメッセージを直す（新規・見落としやすい）

現在の0件メッセージは JPモードでは:

> 日本語テキストに一致する翻訳済みカードが見つかりませんでした（未翻訳のカードは日本語検索できません。英語での検索もお試しください）。

**#43 の修正後、これは嘘になりうる。** 実例（実データで確認済み）:

- 名前欄に `ロレイン` → 候補5件。**「パワー順」にすると 0件**（チャンピオン5枚は power を持たない）
- 効果欄に `ドロー` → 候補17件。**「レベル順」にすると 0件**（レベルを持つカードが無い）

一致はしているのに「見つかりませんでした」と出て、**しかも原因（並び替え）が画面のどこにも出ない**。
利用者は検索語を疑い続けることになる。

→ **JPモードかつ `numericSort` が立っているときは、専用の文言にする:**

> 日本語テキストには一致しましたが、**レベル**を持つカードはありませんでした（並び替えを「名前順」に戻すと表示できます）。

項目名は `numericSortNote()` が使っている `NUMERIC_SORT_LABELS` から取る。
**ラベル表を各ページに書き写さないよう、`card-search.js` から `numericSortLabel(field)` を公開する。**

⚠️ **この分岐は `jpSlugs.length > 0`（＝日本語一致はあった）のときだけ。**
日本語一致が本当に0件のときは従来の文言のままにする。

⚠️ **第2版で訂正**: `jpSlugs.length` は**ページ側からは見えない**（`info.jpMode` は
「JPモードか」でしかなく**日本語一致が0件でも `true`**。`info.total` はどちらの場合も 0）。
→ **`info.jpMatched`（日本語に一致した件数・絞り込みと除外の前）を `onResults` に追加する**（実装側の指摘）。
⭐ 伝播ラグにも強い —— 古い `card-search.js` と新しい `app.js` の組み合わせでは
`info.jpMatched` が `undefined` になり `undefined > 0` は偽なので、**従来の文言に落ちる**。

---

## 8. 静かに劣化しないための検査（`npm run validate` に追加）

⚠️ この修正は **cronが毎日再生成する生成物のフォーマットを変える**ため、
「jobは緑・差分も出ないのに索引の中身だけ壊れる」経路ができる。次の2本で止める:

| 経路 | 何が起きたら | どこで気づくか |
|---|---|---|
| 生成スクリプトのデグレで `nums` が全部 null になる | JPモードの数値ソートが常に0件 | ⭐ **`npm run validate` が exit 1**（下記） |
| `rarities` と `prefixes` の並びがズレる | レアリティ順だけ静かに間違う | 〃 |
| cronだけで壊れる | — | ⚠️ **cronは `validate` を実行しない** → §5.4 の完走サマリがログに残る |

`scripts/validate.mjs` に追加する検査（**索引ファイルだけを読んで内部整合を見る**。
⚠️ 生成スクリプトを呼んで結果を突き合わせると**両辺が同源になり常に通る**ので、そうしないこと）:

1. 全エントリが **8要素**であること
2. `entry[7].length === entry[4].length`（レアリティとprefixの並びが一致）
3. `entry[6].length === 4`
4. `level` / `power` / `life` / `cost_memory` それぞれ **非nullが1件以上**あること
   （全滅＝生成デグレの現実的な形。件数の固定値は新セットで動くので使わない）
5. `entry[7]` の各値が `null` または `1〜9` の整数

---

## 9. 既存機能との相互作用

### 9.1 AND絞り込み・取得後フィルタ

`matchesActiveFilters()` による取得後の間引きは**並べ替えの後**に効くので、ページ内の表示件数は
従来どおり不揃いになりうる。**並び自体は崩れない**（`jpCand` の順序を保ったまま `slice` するため）。

### 9.2 URL共有（#20）

`sort` / `order` は既に URL に載っており（`app.js:525,558`）、復元時に `runSearch(true)` を通る。
**#43 の変更で追加のURL項目は不要。** ⭐ ただし **これまで共有URLの `sort` はJPモードで無視されていた**ので、
既存の共有URLを開くと**今回から並びが変わる**。これは意図した修正である。

### 9.3 ⭐ #44（同点行のページング不安定）の影響を受けない

#44 は「APIに同じクエリでページを引き直すと同点行が入れ替わる」問題。
JPモードは **候補列を1回作ってクライアント側で保持し、`slice` でページに切る**ため、
**ページ跨ぎの重複・欠落は原理的に起きない**（§6.3 で全順序にすることが前提）。

### 9.4 デッキ構築ツール

`shared/js/card-search.js` を共有しているため、**ロジック側の変更は自動的に効く**。
`tools/deck-builder/app.js` 側は §7.2 の1行と §7.3 の0件メッセージだけ。
`jpPageSize` は 24（トップは 40）。

### 9.5 カード個別ページ・セットページ

JPモードの検索UIを持たないため**影響なし**。索引も読まない。

---

## 10. 却下した案

| 案 | 却下理由 |
|---|---|
| **案B: JPモードで並び替えUIを無効化する** | 「効いていないのに操作できる」状態は消えるが、**並び替えが使えないままになる**。案Aの実装コスト（索引 +7.6KB gzip・生成スクリプト十数行）が想定より小さいと実測で分かったため不要になった |
| **案C: 名前順・レアリティ順だけ直す** | §2 のとおり**索引にレアリティが無い**ため、実際には名前順しか直せない。案Aとの差はほぼ無い |
| 索引に英語名を入れて名前順をAPIと完全一致させる | gzip +15.1KB に対し、**JPモードの画面には日本語名しか出ない**ため利得が体感できない（§6.1） |
| 名前順を日本語名の五十音順にする | ⚠️ 日本語名は漢字を含み、`localeCompare("ja")` でも**読み順にはならない**（ICUの漢字照合は読みを持たない）。利用者から見て「五十音順になっていない」状態になり、かえって悪化する |
| 候補を全件取得してから並べ替える | 候補が577件（効果「追放」）に達するケースがあり、**1回の検索で数百リクエスト**になる。現実的でない |
| レアリティを「カードごとに1値（全editionのmin）」で持つ | gzip は 2.0KB 安いが、**エキスパンション絞り込み中に非JPモードと並びが食い違う**（§4.3）。ズレるカードは P25 で162件・SP4 で29件あり無視できない |

---

## 11. 実装箇所

| ファイル | 変更 |
|---|---|
| `scripts/gen-card-meta-index.mjs` | §5.2 `metaOf()` に `nums` / `rarities`・§5.3 エントリ・§5.4 サマリ・冒頭コメントの形式説明 |
| **`data/card-meta-index.json`** | ⚠️ **再生成してコミットする**（ネットワーク必須。忘れると翌朝のcronが同じ差分を無関係な自動コミットとしてpushする） |
| `shared/js/card-search.js` | §6.3 `sortKeyOf` / `sortJpCand`・§6.5 `run()` 組み込み・§7.1 `info`・§7.2 `jpSortNote`・§7.3 `numericSortLabel` の公開。**`sortField()` 付近の「JPモードは並び替え自体が効かないので対象外 → #43」というコメントを消す** |
| `app.js` | §7.2 の1行・§7.3 の0件メッセージ分岐 |
| `tools/deck-builder/app.js` | 同上 |
| `scripts/validate.mjs` | §8 の検査5本 |

⚠️ **`cards/` `sets/` `tournaments/` の生成物には影響しない**（これらは索引を読まない）。
`build:cards` の再実行は不要。

---

## 12. 検証項目

### 12.1 索引（`npm run validate` とスクリプト）

| # | 内容 | 期待 |
|---|---|---|
| V1 | 生成後、全エントリが8要素・`entry[7].length === entry[4].length` | `npm run validate` が通る |
| V2 | 生成サマリの件数 | `level 124` / `power 908` / `life 767` / `cost_memory 473以上` / `rarity 2262`。⚠️ **スナップショット未収録22件は個別取得されるので、`cost_memory` は 473 より増える可能性がある**（実測: 3件中2件が cost_memory を持つ）。**実際の値を報告すること**（設計担当が照合する） |
| V3 | **決定性** — 同じ日に2回実行してバイト一致 | `git diff` が空 |
| V4 | サイズ | 生 181KB前後・gzip 41〜42KB |
| V5 | わざと `entry[6]` を全 null にした索引で `npm run validate` | **exit 1 で落ちる**（⭐ 直す前に「落ちること」を先に確認する） |

### 12.2 トップページ（Playwright実駆動・`--ignore-certificate-errors`）

期待値は **§6.3 の比較関数をそのまま実装した参照実装**に、ローカルの `data/tl-names.json` /
`data/tl-effects.json` / スナップショット（＋フリップ面3件の個別取得値）を通して算出した。

⚠️ **同点の並びに注意**: 同点は slug で決め、**降順では slug も降順になる**（＝降順は昇順の完全な逆順）。
下の期待値はこの規則で算出してある。**同点の順序が下表と違ったら、比較関数のタイブレークを疑うこと。**

| # | 検索条件 | 並び替え | 期待 |
|---|---|---|---|
| V6 | 名前欄 `ロレイン` | 名前順 ▲ | 5件。`昇華せし翼 → 剣の達人 → クラックスの騎士 → 精霊の支配者 → 放浪の戦士`（slug昇順 `lorraine-ascendant-wings / blademaster / crux-knight / spirit-ruler / wandering-warrior`） |
| V7 | 〃 | 名前順 ▼ | **V6の完全な逆順**（`放浪の戦士 → 精霊の支配者 → クラックスの騎士 → 剣の達人 → 昇華せし翼`）。⭐ **現在は▼にしても並びが変わらない＝これが直ることの確認** |
| V8 | 〃 | レベル順 ▼ | 全 **5** 件。`昇華せし翼(4) → 精霊の支配者(3) → クラックスの騎士(3) → 剣の達人(2) → 放浪の戦士(1)`。注記 `（レベルを持つカードのみ）` ⚠️ **3の同点は spirit-ruler が先**（slug降順） |
| V9 | 〃 | ライフ順 ▼ | 全 **5** 件。`昇華せし翼(32) → 精霊の支配者(28) → クラックスの騎士(28) → 剣の達人(24) → 放浪の戦士(20)` |
| V10 | 〃 | **パワー順** ▼ | **0件**。⚠️ §7.3 の文言「日本語テキストには一致しましたが、パワーを持つカードはありませんでした…」が出る |
| V11 | 〃 | レアリティ順 ▲ | 全 **5** 件。`剣の達人(1) → クラックスの騎士(1) → 精霊の支配者(1) → 放浪の戦士(1) → 昇華せし翼(6)`（1の同点は slug昇順） |
| V12 | 効果欄 `追放` | レベル順 ▼ | 全 **20** 件（候補577件から除外）。先頭 `トリスタン、影を裂く者(3) → ライ、嵐の予見者(3) → マーリン、燦然たる残影(3) → ロレイン、精霊の支配者(3) → ロレイン、クラックスの騎士(3)`。注記 `（レベルを持つカードのみ）` |
| V13 | 〃 | パワー順 ▼ | 全 **193** 件。先頭 `アーケインのエレメンタル(7) → 魅惑のフィナーレ(6) → クラール、石鱗の暴君(6) → 火の一振り(6) → オーバーロード Mk III(5)` |
| V14 | 〃 | ライフ順 ▼ | 全 **147** 件。先頭 `シエル、蜃気楼の墓標(30) → ロレイン、精霊の支配者(28) → ロレイン、クラックスの騎士(28) → トリスタン、影を裂く者(25) → ライ、嵐の予見者(25)` |
| V15 | 〃 | コスト順 ▼ | 全 **208** 件。⚠️⚠️ **画面の行は 39件で、先頭は `伝説の瑠璃運命石 → 伝説の紅玉運命石 → トリスタン、影を裂く者 → 涙滴の宝冠 → ライ、嵐の予見者`**（第2版で訂正。下記） |

#### ⚠️⚠️ V15 の期待値は第1版が誤っていた（第2版で訂正・2026-08-02）

第1版は **候補列**（`sortJpCand()` の出力）で期待値を書いており、**表示側の変換が入っていなかった**。
候補列は設計どおり `seiryuu-azure-dragon(10) → fabled-azurite-fatestone(10) → suzaku-vermillion-phoenix(7) → …`
だが、画面はこうなる:

1. `fetchCard("seiryuu-azure-dragon")` は**表面 `fabled-azurite-fatestone` を返す**（#27 からの仕様）
   → 1行目が「伝説の瑠璃運命石」として描画される
2. 2件目 `fabled-azurite-fatestone` は**同じslugなので `shownSlugs` が重複として弾く** → 1行減る
3. 3件目 `suzaku-vermillion-phoenix` も表面 `fabled-ruby-fatestone` を返す → 「伝説の紅玉運命石」

⭐ **これは #43 が持ち込んだものではない。** 設計担当が**本番（`#43` を含まない）で独立に確認済み**:

```
効果欄「グオ・ジアボーナス」→ 30 件を表示 / 全 34 件   ← 修正前の本番でも4件足りない
```

→ **[#45](https://github.com/dozyouneko/ga-card-tools-jp/issues/45) として分離**（フリップ面22件は表面も全部翻訳済みなので、
最大22件の過大になる）。**本設計の実装は変更しない。**
| V16 | 効果欄 `ドロー` | レベル順 | **0件**＋§7.3 の文言（候補17件・レベル持ち0件） |
| V17 | 効果欄 `追放` ＋ エキスパンション `SP4` | レアリティ順 ▲ | 全 **11** 件。`眩惑の遊女(2) → 浚渫の流れ(2) → 嘆きの弔鐘(2) → 海妖精の潜水者(2) → 玉座の番人ウシガエル(2) → 宇宙の稲妻(3) → 進軍(3) → マレディクトゥム・ヴィタエ(4) …`。⚠️⚠️ **「全editionのmin」で実装すると `宇宙の稲妻(1) → 眩惑の遊女(1) → 浚渫の流れ(1) → 進軍(1) → 玉座の番人ウシガエル(1) → 嘆きの弔鐘(2) …` になる**（先頭も件数の分かれ方も違う）。§4.3 の実装誤りはここで露見する |

### 12.3 ⚠️ fail-open（**壊れることを先に確認してから直す**）

| # | 内容 | 期待 |
|---|---|---|
| V18 | `metaIndexUrl` を存在しないパスに差し替えて JP検索＋レベル順 | **落ちない**。候補が slug昇順で出て、注記 `（並び替えの情報を取得できなかったため、名前順で表示しています）`。⚠️ **`（レベルを持つカードのみ）` は出ない** |
| V19 | `entry` を7要素に削った索引を置いて同じ操作 | V18と同じ結果（JS例外0件） |
| V20 | 索引から1件だけ slug を削って JP検索＋レベル順 | **そのカードが消えない**。末尾に出て、注記 `（うち1件は並び替えの情報が無いため末尾にあります）` |

### 12.4 ページング・その他

| # | 内容 | 期待 |
|---|---|---|
| V21 | 効果欄 `追放` ＋ パワー順 ▼ で「もっと見る」を最後まで | **193件ちょうど・重複0・欠落0**（⭐ #44 の症状が出ないこと。JP_PAGE_SIZE=40 → 5ページ） |
| V22 | 検索中（索引fetch中）に並び替えを変える | 古い結果が残らない（`mySeq !== seq` のガードが効く） |
| V23 | URL共有（#20）: `?...&sort=level&order=DESC` ＋日本語の検索語 | 復元後に**レベル降順で表示される**（従来は無視されていた） |
| V24 | デッキ構築ツールで V8 / V10 / V17 相当 | 同じ結果（`jpPageSize=24`） |
| V25 | **非JPモードの回帰** | 名前順・レアリティ順が `全 2240 件`（注記なし）、レベル順▼が `全 124 件（レベルを持つカードのみ）`。#39 の挙動が変わっていないこと |
| V26 | JS例外 | 全ケースで **0件** |

---

## 13. 判断が済んだ項目 / 実装側で決めずに待つこと

### ✅ 済（2026-08-02・ユーザー判断）

- **方式は案A**（索引に並び替えキーを持たせる）。案B・案Cは却下（§10）
- **名前順は slug順のまま**、昇降の切替だけ直す（§6.1）

### ⏳ 実装側で判断せず、issueに書いて待つこと

- **§7.3 の0件メッセージの文言**を変えたくなった場合（利用者に出る文言のため）
- **`entry[6]` / `entry[7]` の位置や形式を変えたくなった場合**（cron生成物のフォーマットのため、
  ロールバック手順にも関わる）
- 検証で **V2 の件数が想定と食い違った**場合 — 差の内訳（どのslugがどの項目で増減したか）を報告する。
  ⚠️ **「フリップ面のぶんだと思う」で片付けない**（#39 の §3.4 は同種の推測で誤っていた）
- **V17 が通らなかった**場合 — レアリティの基準（§4.3）は本番APIで実測した結論なので、
  **実装を合わせる方向で直す**。基準そのものを変えたい場合は待つ

### ⚠️ ロールバック手順（push前に用意しておくこと）

本番配信物（`shared/js/card-search.js` `app.js` `tools/deck-builder/app.js` `data/card-meta-index.json`）が
変わるため、**push前にロールバック手順を書き、別ワークツリーで適用を検証する**
（メモリ `rollback-ready-release.md`／#21・#39 では検証を省いた）。

`git revert` で索引も同時に戻る。⚠️ **索引だけを古い形式に戻すと、新しい `card-search.js` が
§6.4 の fail-open 経路に入る**（＝並び替えが効かないだけで、落ちも消えもしない）ことを V19 で確認済みにしておく。
