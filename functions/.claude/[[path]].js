// .claude/ 配下はClaude Code用の設定(セッション役割定義・起動ショートカット)のため
// 本番では配信しない。ルート直下のドットフォルダも静的アセットとしてそのまま配信されるため
// (2026-08-05実測: /.claude/agents/design.md が200)、docs/ と同じ方式で遮断する。
// 全メソッド・全パス(/.claude/以下すべて)を遮断する。
export function onRequest() {
  return new Response("Not Found", { status: 404 });
}
