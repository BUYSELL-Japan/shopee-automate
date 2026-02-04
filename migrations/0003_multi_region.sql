-- マルチリージョン対応マイグレーション
-- shops, region_settings テーブル作成 + products拡張

-- ========================================
-- ショップ管理テーブル
-- ========================================
CREATE TABLE IF NOT EXISTS shops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER UNIQUE NOT NULL,
    shop_name TEXT,
    region TEXT NOT NULL DEFAULT 'TW',  -- 'TW' | 'MY' | 'SG' など
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at INTEGER,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- ========================================
-- リージョン設定テーブル（送料・手数料）
-- ========================================
CREATE TABLE IF NOT EXISTS region_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    region TEXT UNIQUE NOT NULL,
    currency TEXT NOT NULL,
    currency_symbol TEXT NOT NULL,
    exchange_rate REAL NOT NULL,           -- JPY/現地通貨
    commission_rate REAL DEFAULT 0.1,      -- コミッション率 (10%)
    service_fee_rate REAL DEFAULT 0.03,    -- サービス手数料 (3%)
    transaction_fee_rate REAL DEFAULT 0.025,-- 取引手数料 (2.5%)
    shipping_cost_local REAL DEFAULT 0,    -- 現地送料（現地通貨）
    shipping_cost_intl_jpy REAL DEFAULT 0, -- 国際送料（JPY）
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 初期データ：台湾
INSERT OR IGNORE INTO region_settings 
    (region, currency, currency_symbol, exchange_rate, commission_rate, service_fee_rate, transaction_fee_rate, shipping_cost_local, shipping_cost_intl_jpy)
VALUES 
    ('TW', 'TWD', 'NT$', 4.7, 0.1077, 0.03, 0.0254, 60, 1350);

-- 初期データ：マレーシア
INSERT OR IGNORE INTO region_settings 
    (region, currency, currency_symbol, exchange_rate, commission_rate, service_fee_rate, transaction_fee_rate, shipping_cost_local, shipping_cost_intl_jpy)
VALUES 
    ('MY', 'MYR', 'RM', 31.5, 0.1077, 0.03, 0.0254, 10, 1360);

-- ========================================
-- productsテーブル拡張
-- ========================================
-- 日本語商品名カラム追加
ALTER TABLE products ADD COLUMN item_name_ja TEXT;

-- リージョンカラム追加
ALTER TABLE products ADD COLUMN region TEXT DEFAULT 'TW';

-- ========================================
-- インデックス
-- ========================================
CREATE INDEX IF NOT EXISTS idx_shops_region ON shops(region);
CREATE INDEX IF NOT EXISTS idx_products_region ON products(region);
