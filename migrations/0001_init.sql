-- デッキ構築ツール用の初期スキーマ。
-- users / auth_identities を分離しているのは、将来 Discord 以外の
-- ログイン方法（Google, X 等）を追加してもデッキ側のテーブルに
-- 手を入れずに済むようにするため。

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- プロバイダに依存しない認証の紐付け。今は provider='discord' のみ。
CREATE TABLE auth_identities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  provider_username TEXT,
  provider_avatar_url TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(provider, provider_user_id)
);

-- セッション。Cookie には生トークンを入れ、ここには SHA-256 ハッシュのみ保存する。
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  user_agent TEXT
);

-- デッキ本体。id は共有リンクにそのまま使うランダムな推測困難な文字列。
CREATE TABLE decks (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  champion_slug TEXT,
  description TEXT,
  is_public INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- デッキ内のカード構成。board はチャンピオン/メイン/マテリアル等の
-- 自由入力ラベル（既定 'main'）で、正当性チェックは行わない。
CREATE TABLE deck_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deck_id TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  card_slug TEXT NOT NULL,
  board TEXT NOT NULL DEFAULT 'main',
  qty INTEGER NOT NULL DEFAULT 1,
  UNIQUE(deck_id, card_slug, board)
);

CREATE INDEX idx_auth_identities_user ON auth_identities(user_id);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
CREATE INDEX idx_decks_user ON decks(user_id);
CREATE INDEX idx_deck_cards_deck ON deck_cards(deck_id);
