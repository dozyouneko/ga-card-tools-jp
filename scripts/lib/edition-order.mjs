// 版の正規順序(#71 / 親タスク「版順序の非決定性」)の比較器を1か所に集約したモジュール(#108)。
//
// ⚠ このモジュールはトップレベルで一切の副作用を持たないこと(ファイル読み書き・ネットワーク・
//   console を書かない)。scripts/validate.mjs が import して比較器そのものを検査するため、
//   import しただけでカード2,495ページのビルドが走る build-card-pages.mjs から切り出してある。
// ⚠ 中身は scripts/build-card-pages.mjs からの移動で、ロジックは1文字も変えていない
//   (変えると生成物が動く)。

// API側で日付が未設定のセットは epoch 0 が返るため、日付なし("")として扱う。
// 空文字は降順ソートで末尾に来るので、newestFirst() の並び順は従来(1970-01-01)と変わらない。
export const day = (iso) => {
  const d = (iso || "").slice(0, 10);
  return d === "1970-01-01" ? "" : d;
};

// meta.sets(発売日の新しい順)から prefix → {label, order} を引く
// ⚠ setLabel() と SET_LABELS も一緒にここへ置く。setOrder() だけを切り出すと SET_LABELS の
//   構築が呼び出し側に写され、そこが新しい二重定義になる(片方だけ壊れても誰も気づかない)。
export function makeSetOrder(metaSets) {
  const SET_LABELS = new Map();
  (metaSets || []).forEach((s, i) => {
    (s.prefixes || []).forEach((p) => { if (!SET_LABELS.has(p)) SET_LABELS.set(p, { label: s.label, order: i }); });
  });
  const setLabel = (prefix) => (SET_LABELS.get(prefix) || {}).label || prefix;
  const setOrder = (prefix) => SET_LABELS.has(prefix) ? SET_LABELS.get(prefix).order : 9999;
  return { SET_LABELS, setLabel, setOrder };
}

// 版の正規順序。⚠ この比較器の出力順が、次の4つを支配する:
//   ① 代表画像(og:image / twitter:image / 本文の画像) ② イラスト切替サムネイルの並び
//   ③ 収録セット表の行順 ④ セットページが各セットで採る版(main() のグルーピング)
// ⚠ 公式APIの editions 配列順は予告なく入れ替わる。第2キー以降を削ると出力が非決定的になり、
//   中身が変わらない日に日次cronがノイズコミットを作る(#71)。整形目的で簡略化しないこと。
//   1. 所属セットの発売日 降順   … 代表は最新セットの版(既存の主キー。最古版だと旧セットの絵柄になる)
//   2. meta.sets の並び 昇順     … 同日なら本編セット→サプリメント→プロモ(未登録セットは 9999 で末尾)
//   3. レアリティ 昇順           … 通常版を特殊仕様(PR/CSR/CUR/CPR)より優先
//   4. カード番号 昇順(数値考慮) … 同一セット内が #048A → #048B → #048C の自然順になる
//   5. 版slug 昇順               … 最終決着キー(カード内で一意。実測: 4,940版で重複0)
// ⚠ この5段は npm run validate の「edition order is a total order」が検査している(#108)。
export function makeEditionOrder(setOrder) {
  return function editionOrder(a, b) {
    const byDate = day(b.set && b.set.release_date).localeCompare(day(a.set && a.set.release_date));
    if (byDate) return byDate;
    const bySet = setOrder((a.set && a.set.prefix) || "") - setOrder((b.set && b.set.prefix) || "");
    if (bySet) return bySet;
    const byRarity = (a.rarity == null ? 99 : a.rarity) - (b.rarity == null ? 99 : b.rarity);
    if (byRarity) return byRarity;
    const byNumber = String(a.collector_number || "")
      .localeCompare(String(b.collector_number || ""), "en", { numeric: true });
    if (byNumber) return byNumber;
    return String(a.slug || "").localeCompare(String(b.slug || ""));
  };
}
