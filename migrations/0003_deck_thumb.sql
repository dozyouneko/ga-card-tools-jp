-- デッキ一覧サムネイルの画像指定。公式APIの画像パス(例: /cards/images/xxx.jpg)を保存する。
-- 裏面や特定の版のイラストも選べるように、slugではなく画像パスを直接持つ。
-- NULL のときは従来通り champion_slug のカードの表面デフォルト版を表示する。
ALTER TABLE decks ADD COLUMN thumb_image TEXT;
