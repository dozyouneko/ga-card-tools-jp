// 公式API(api.gatcg.com)へ送る User-Agent(#147 W2)。
// 日次cron(GitHub Actions)とローカルの生成スクリプトが、名乗ってからAPIを叩くためのもの。
// ⚠ 値はここ1箇所だけに置く。fetchJson を持つ各スクリプトはこの定数を import する
//   (文字列を書き写すと片方だけ古くなる)。
// ⚠ メールアドレスは入れない(このファイルは scripts/ 配下なので本番配信される)。
//   連絡先はリポジトリのURL(= issue)で足りる。
// ⚠ ブラウザ側(shared/js/)には適用しない(ブラウザは User-Agent を書き換えられない)。
export const USER_AGENT = "ga-card-tools-jp/1.0 (+https://github.com/dozyouneko/ga-card-tools-jp)";

/** fetch() の第2引数に渡すヘッダ */
export const API_FETCH_INIT = Object.freeze({ headers: Object.freeze({ "User-Agent": USER_AGENT }) });
