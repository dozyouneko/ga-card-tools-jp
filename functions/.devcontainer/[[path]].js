// .devcontainer/ 配下は開発環境の定義のため本番では配信しない。
// ルート直下のドットフォルダも静的アセットとしてそのまま配信されるため
// (2026-08-05実測: /.devcontainer/devcontainer.json が200)、docs/ と同じ方式で遮断する。
// 全メソッド・全パス(/.devcontainer/以下すべて)を遮断する。
export function onRequest() {
  return new Response("Not Found", { status: 404 });
}
