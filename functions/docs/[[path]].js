// docs/ 配下は開発用ドキュメント(設計書・環境構築手順)のため本番では配信しない。
// Pages Functionsは静的アセットより優先されるため、ここで404を返すことで
// pages_build_output_dir="." でもgit管理のまま配信対象外にできる。
// 全メソッド・全パス(/docs/以下すべて)を遮断する。
export function onRequest() {
  return new Response("Not Found", { status: 404 });
}
