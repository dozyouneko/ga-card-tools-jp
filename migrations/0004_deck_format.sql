-- デッキの構築フォーマット。'STANDARD' | 'PANTHEON' の2値。
-- 既存デッキはすべて 'STANDARD' として扱う(作成時にフォーマットの概念が無かったため)。
-- CHECK制約は付けない(D1/SQLite の ALTER TABLE ADD COLUMN で制約を足すとテーブル再作成が要り、
-- ロールバックが重くなるため)。値の検証はAPI側(functions/api/decks/)で行う。
ALTER TABLE decks ADD COLUMN format TEXT NOT NULL DEFAULT 'STANDARD';
