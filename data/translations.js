/*
 * Grand Archive 日本語訳データ（非公式・コミュニティ翻訳）
 * -------------------------------------------------------
 * このファイルはカードの英語データに「日本語レイヤー」を重ねるための辞書です。
 *  - meta   : クラス / エレメント / タイプ など列挙値のラベル訳
 *  - terms  : ゲーム用語（効果テキスト中に登場するキーワード）の対訳と解説
 *  - cards  : カード個別の名前・効果・フレーバーの訳（キー = API の card.slug）
 *
 * 訳が無いカードは英語原文のまま「翻訳募集中」バッジで表示されます。
 * ここに slug を足していけば、その場で日本語表示が増えていく設計です。
 */
window.GA_I18N = {
  // --- 列挙値のラベル（ゲーム用語なので比較的安定） ---
  meta: {
    // エキスパンション（製品ライン単位。prefixes は API の prefix パラメータへ複数送る）
    // 新セットが出たら prefixes に追記、または新エントリを先頭付近に追加する。
    sets: [
      { label: "Fractured Crown", prefixes: ["FTC", "FTCA"] },
      { label: "Mercurial Heart", prefixes: ["MRC", "MRC 1st", "MRC Alter"] },
      { label: "Phantom Monarchs", prefixes: ["PTM", "PTM 1st", "PTMEVP"] },
      { label: "Distorted Reflections", prefixes: ["DTR", "DTR 1st", "DTRSD"] },
      { label: "Abyssal Heaven", prefixes: ["HVN", "HVN 1st"] },
      { label: "Mortal Ambition", prefixes: ["AMB", "AMB 1st", "AMB Alter", "AMBSD", "AMBDP"] },
      { label: "Alchemical Revolution", prefixes: ["ALC", "ALC 1st", "ALC Alter", "ALCSD"] },
      { label: "Dawn of Ashes", prefixes: ["DOA 1st", "DOA Alter", "DOAp", "DOASD"] },
      { label: "Radiant Origins", prefixes: ["RDO", "RDO 1st", "RDOA", "RDOP", "RDOPD", "RDOEVP"] },
      { label: "Re:Collection", prefixes: ["ReC-AUR", "ReC-BRV", "ReC-HVF", "ReC-IDY", "ReC-SHD", "ReC-SLM"] },
      { label: "Promotional（P22〜P26）", prefixes: ["P22", "P23", "P24", "P25", "P26"] },
      { label: "Supporter / Pantheon Pack", prefixes: ["SP1", "SP2", "SP3", "PP1"] },
    ],
    classes: {
      ANOMALY: "アノマリー", ASSASSIN: "アサシン", CLERIC: "クレリック",
      GUARDIAN: "ガーディアン", MAGE: "メイジ", RANGER: "レンジャー",
      SPIRIT: "スピリット", TAMER: "テイマー", WARRIOR: "ウォリアー",
    },
    elements: {
      ARCANE: "秘術", ASTRA: "星幽", CRUX: "十字", EXALTED: "高揚",
      EXIA: "エクシア", FIRE: "火", LUXEM: "光", NEOS: "ネオス",
      NORM: "無", TERA: "地", UMBRA: "闇", WATER: "水", WIND: "風",
    },
    types: {
      ACTION: "アクション", ALLY: "アライ", ATTACK: "アタック",
      CHAMPION: "チャンピオン", DOMAIN: "ドメイン", ITEM: "アイテム",
      PHANTASIA: "ファンタジア", REGALIA: "レガリア", TOKEN: "トークン",
      UNIQUE: "ユニーク", WEAPON: "ウェポン",
    },
    subtypes: {
      ACCESSORY: "アクセサリ", AETHERCHARGE: "エーテルチャージ", AETHERWING: "エーテルウィング",
      ANGEL: "天使", ANIMAL: "動物", ANOMALY: "アノマリー", ARMOR: "鎧",
      ARTIFACT: "アーティファクト", ASSASSIN: "アサシン", AUTOMATON: "オートマトン",
      AVATAR: "アバター", BAUBLE: "装身具", BEAR: "熊", BEAST: "獣", BOOK: "書物",
      BULLET: "弾丸", CASTLE: "城", CAT: "猫", CATACLYSM: "大災害", CATALYST: "触媒",
      CHESSMAN: "チェスの駒", CLERIC: "クレリック", COMMAND: "号令", CONSTRUCT: "構築物",
      CRAFT: "工作物", CROSSROADS: "岐路", CRYSTAL: "水晶", CURSE: "呪い", DAGGER: "短剣",
      DEER: "鹿", DEVICE: "装置", DISTORTION: "歪み", ELEMENTAL: "エレメンタル",
      FATEBOUND: "運命縛り", FATESTONE: "運命石", FLOWER: "花", FOX: "狐", FRACTAL: "フラクタル",
      FROG: "蛙", GOLEM: "ゴーレム", GUARDIAN: "ガーディアン", GUN: "銃", HAMMER: "鎚",
      HARMONY: "調和", HERB: "薬草", HORSE: "馬", HUMAN: "人間", ISLE: "島", KING: "キング",
      LIZARD: "トカゲ", MAGE: "メイジ", MAP: "地図", MELODY: "旋律", MEMORITE: "メモライト",
      PHOENIX: "不死鳥", POLEARM: "長柄武器", POTION: "ポーション", QUEEN: "クイーン",
      RABBIT: "兎", RACCOON: "アライグマ", RANGER: "レンジャー", REACTION: "リアクション",
      RING: "指輪", RIVER: "川", ROBE: "ローブ", ROOT: "根", SCRIPTURE: "聖典",
      SHARD: "破片", SHIELD: "盾", SIEGEABLE: "攻城可能", SKILL: "スキル", SLIME: "スライム",
      SOLVENT: "溶剤", SPECTER: "亡霊", SPELL: "呪文", SPIRIT: "スピリット", STAFF: "杖",
      SUITED: "スーツ持ち", SWORD: "剣", TAMER: "テイマー", TIGER: "虎", TURTLE: "亀",
      ULTIMATE: "アルティメット", WARRIOR: "ウォリアー", WOLF: "狼",
    },
  },

  // --- ゲーム用語辞書（効果文中に出現したら詳細画面で解説を表示） ---
  terms: {
    "materialize": { jp: "マテリアライズ（実体化）", desc: "マテリアルデッキのカードを、そのコストを支払って場に出す行為。" },
    "generate":    { jp: "生成（Generate）", desc: "デッキ外のトークン／レガリア等を新たに作り出して場に出す。" },
    "summon":      { jp: "召喚（Summon）", desc: "指定されたトークンを場に出す。" },
    "banish":      { jp: "追放（Banish）", desc: "カードをゲームから取り除く一時的・恒久的な領域。" },
    "memory":      { jp: "メモリー", desc: "伏せて管理する専用領域。多くのカードがここを経由して起動される。" },
    "reserve":     { jp: "リザーブ", desc: "リソース（コスト支払い）に使う領域。リザーブコストはここから支払う。" },
    "fast activation": { jp: "高速起動", desc: "相手ターンや割り込みタイミングでも起動できる速度。" },
    "ascendant":   { jp: "アセンダント", desc: "チャンピオンが到達しうる最上位のレベル帯／進化形態。" },
    "regalia":     { jp: "レガリア", desc: "チャンピオンに紐づく装備・紋章系のカードタイプ。" },
    "preparation": { jp: "準備カウンター", desc: "一部のチャンピオン能力の起動条件に使うカウンター。" },
    "class bonus": { jp: "クラスボーナス", desc: "自分のチャンピオンのクラスが一致するとき追加効果／コスト軽減を得る。" },
    "level":       { jp: "レベル", desc: "チャンピオンの成長段階。レベルを上げて強力な形態にできる。" },
  },

  // --- カード個別訳（キー = card.slug）。まずは代表的なカードから ---
  cards: {
    "lorraine-ascendant-wings": {
      name: "ローレイン、昇華せし翼",
      effect:
        "**ローレインの血脈**\n\n" +
        "(2024)：任意の枚数のソード・レガリアカードを生成し、それらを場に出す。以後このゲームの間、あなたがコントロールするソード・ウェポンはアライであるかのように攻撃できる。この能力は、ローレインがアセンダントである場合にのみ起動できる。",
      flavor: "グレン “GlenyBoi” ウィリアムズ — 世界大会2024 チャンピオン",
    },
    "academy-guide": {
      name: "アカデミーの案内人",
      effect: "あなたがマテリアライズするチャンピオンカードのマテリアライズコストが1少なくなる。",
    },
    "accelerate": {
      name: "アクセラレート",
      effect:
        "このターン、あなたが次に起動するカード1枚は**高速起動**を持つかのように起動できる。\n\n" +
        "カードを1枚あなたのメモリーに引く。",
    },
    "accepted-contract": {
      name: "受託した契約",
      effect: "あなたのチャンピオンに**準備**カウンターを3個置く。",
    },
    "acerbica": {
      name: "アセルビカ",
      effect: "あなたがコントロールするチャンピオンはレベル-1を得る。",
    },
    "adorned-stag": {
      name: "着飾られた牡鹿",
      effect:
        "[クラスボーナス] このカードの起動コストが1少なくなる。*（この効果は、あなたのチャンピオンのクラスがこのカードのクラスと一致する場合のみ適用する。）*",
    },
    "aegis-of-dawn": {
      name: "暁のイージス",
      effect:
        "[クラスボーナス] このカードのマテリアライズコストが1少なくなる。\n\n" +
        "あなたのチャンピオンが4点以上のダメージを受けるたび、オートマトン・ドローン・ドローントークンを1体**召喚**する。",
    },
    "spirit-of-fire": {
      name: "火の精霊",
    },
  },
};
