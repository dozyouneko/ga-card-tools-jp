-- デッキ内カードのイラスト(版)指定。公式APIの edition.image のパス(例: /cards/images/xxx.jpg)を保存する。
-- NULL のときはカードのデフォルト(先頭の版)のイラストを表示する。
ALTER TABLE deck_cards ADD COLUMN art_image TEXT;
