-- Shopee API統一スキーマ
-- Migration: 0002_shopee_api_aligned_schema.sql
-- 
-- Shopee APIのパラメータと完全に統一したスキーマ
-- add_item / update_item / get_item_base_info と互換性あり

-- =====================================================
-- 既存テーブルを削除して再作成
-- =====================================================
DROP TABLE IF EXISTS price_history;
DROP TABLE IF EXISTS sync_logs;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS price_rules;
DROP TABLE IF EXISTS tokens;

-- =====================================================
-- 商品テーブル (Shopee API統一)
-- get_item_base_info / add_item のパラメータに準拠
-- =====================================================
CREATE TABLE products (
    -- 主キー
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Shopee 識別子
    item_id INTEGER UNIQUE,           -- Shopee item_id (INT64)
    shop_id INTEGER NOT NULL,         -- Shopee shop_id
    
    -- 基本情報 (get_item_base_info / add_item 共通)
    item_name TEXT NOT NULL,          -- 商品名 (max 120文字)
    description TEXT,                 -- 商品説明 (normal type)
    description_type TEXT DEFAULT 'normal', -- normal / extended
    item_sku TEXT,                    -- 販売者が設定するSKU
    
    -- カテゴリ
    category_id INTEGER,              -- Shopeeカテゴリ ID
    
    -- 価格情報 (price_info)
    original_price REAL,              -- 元の価格
    current_price REAL,               -- 現在の価格（プロモーション時はプロモ価格）
    currency TEXT DEFAULT 'TWD',      -- 通貨コード
    
    -- 在庫情報 (stock_info)
    stock INTEGER DEFAULT 0,          -- 総在庫数
    
    -- 画像 (image)
    image_url TEXT,                   -- メイン画像URL
    image_url_list TEXT,              -- 画像URLリスト (JSON array)
    image_id_list TEXT,               -- 画像IDリスト (JSON array) - add_item用
    
    -- 重量・配送 (add_item用)
    weight REAL,                      -- 重量 (kg)
    
    -- 寸法 (dimension)
    package_length INTEGER,           -- パッケージ長さ (cm)
    package_width INTEGER,            -- パッケージ幅 (cm)
    package_height INTEGER,           -- パッケージ高さ (cm)
    
    -- 商品状態
    condition TEXT DEFAULT 'NEW',     -- NEW / USED
    item_status TEXT DEFAULT 'NORMAL', -- NORMAL / UNLIST / BANNED / DELETED
    
    -- 統計情報 (get_item_base_info)
    sold INTEGER DEFAULT 0,           -- 販売数
    views INTEGER DEFAULT 0,          -- 閲覧数
    likes INTEGER DEFAULT 0,          -- いいね数
    rating_star REAL DEFAULT 0,       -- 評価星
    cmt_count INTEGER DEFAULT 0,      -- コメント数
    
    -- 属性 (attribute_list) - JSON形式で保存
    attribute_list TEXT,              -- 属性リスト (JSON)
    
    -- 配送情報 (logistic_info) - JSON形式で保存
    logistic_info TEXT,               -- 配送オプション (JSON)
    
    -- バリエーション情報
    has_model INTEGER DEFAULT 0,      -- バリエーションあり (boolean)
    model_list TEXT,                  -- バリエーションリスト (JSON)
    
    -- 事前注文 (pre_order)
    pre_order_days_to_ship INTEGER,   -- 事前注文の発送日数
    
    -- ブランド
    brand_id INTEGER,                 -- ブランドID
    
    -- 卸売 (wholesale)
    wholesale_list TEXT,              -- 卸売価格リスト (JSON)
    
    -- 動画
    video_info TEXT,                  -- 動画情報 (JSON)
    
    -- 税金情報
    tax_info TEXT,                    -- 税金情報 (JSON)
    
    -- カスタムフィールド (D1用)
    custom_price REAL,                -- カスタム調整価格
    price_rule_id INTEGER,            -- 適用する価格ルールID
    auto_adjust_enabled INTEGER DEFAULT 0, -- 自動価格調整
    min_price REAL,                   -- 最低価格制限
    max_price REAL,                   -- 最高価格制限
    source_url TEXT,                  -- 仕入れ元URL
    cost_price REAL,                  -- 原価
    notes TEXT,                       -- メモ
    tags TEXT,                        -- タグ (JSON array)
    
    -- タイムスタンプ
    create_time INTEGER,              -- Shopee作成日時 (Unix timestamp)
    update_time INTEGER,              -- Shopee更新日時 (Unix timestamp)
    created_at TEXT DEFAULT (datetime('now')), -- D1作成日時
    updated_at TEXT DEFAULT (datetime('now')), -- D1更新日時
    last_synced_at TEXT,              -- 最終同期日時
    
    FOREIGN KEY (price_rule_id) REFERENCES price_rules(id)
);

-- =====================================================
-- 価格調整ルールテーブル
-- =====================================================
CREATE TABLE price_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    rule_type TEXT NOT NULL,          -- fixed, percentage, margin
    adjustment_value REAL,
    adjustment_direction TEXT,        -- increase, decrease
    min_price REAL,
    max_price REAL,
    min_margin_percent REAL,
    apply_to_category INTEGER,
    apply_to_tags TEXT,               -- JSON array
    is_active INTEGER DEFAULT 1,
    priority INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- =====================================================
-- トークンテーブル
-- =====================================================
CREATE TABLE tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER NOT NULL UNIQUE,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    access_token_expires_at TEXT,
    refresh_token_expires_at TEXT,
    shop_name TEXT,
    region TEXT DEFAULT 'TW',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- =====================================================
-- 価格履歴テーブル
-- =====================================================
CREATE TABLE price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    old_price REAL,
    new_price REAL,
    change_reason TEXT,
    price_rule_id INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (price_rule_id) REFERENCES price_rules(id)
);

-- =====================================================
-- 同期ログテーブル
-- =====================================================
CREATE TABLE sync_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER NOT NULL,
    sync_type TEXT NOT NULL,
    status TEXT NOT NULL,
    items_synced INTEGER DEFAULT 0,
    items_failed INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT
);

-- =====================================================
-- インデックス
-- =====================================================
CREATE INDEX idx_products_shop_id ON products(shop_id);
CREATE INDEX idx_products_item_id ON products(item_id);
CREATE INDEX idx_products_item_status ON products(item_status);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_price_rules_shop_id ON price_rules(shop_id);
CREATE INDEX idx_price_history_product_id ON price_history(product_id);
CREATE INDEX idx_sync_logs_shop_id ON sync_logs(shop_id);
