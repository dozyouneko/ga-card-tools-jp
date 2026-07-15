// env.DB (D1) クエリ用の薄いヘルパー。prepare/bind の定型を減らすだけで、
// それ以上の抽象化はしない。

// 1行だけ取得（なければ null）
export function one(db, sql, ...params) {
  return db.prepare(sql).bind(...params).first();
}

// 全行取得（結果の配列を返す）
export async function all(db, sql, ...params) {
  const { results } = await db.prepare(sql).bind(...params).all();
  return results;
}

// INSERT/UPDATE/DELETE の実行（meta.last_row_id 等が必要な場合は戻り値を使う）
export function run(db, sql, ...params) {
  return db.prepare(sql).bind(...params).run();
}

// 複数ステートメントを1トランザクションで実行（順次・アトミック）。
// stmts = [{ sql, params }]。順序どおりに実行されFK等の依存も満たせる。
export function batch(db, stmts) {
  return db.batch(stmts.map(({ sql, params = [] }) => db.prepare(sql).bind(...params)));
}
