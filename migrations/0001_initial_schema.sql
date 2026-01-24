-- Shopee Auto Database Schema
-- Migration: 0001_initial_schema.sql

-- =====================================================
-- 商品テーブル
-- Shopeeからの商品情報とカスタム設定を保存
-- =====================================================
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shopee_item_id TEXT NOT NULL UNIQUE,
    shop_id TEXT NOT NULL,
    
    -- 基本情報
    name TEXT NOT NULL,
    description TEXT,
    category_id INTEGER,
    
    -- 画像
    image_url TEXT,
    images TEXT, -- JSON array of image URLs
    
    -- 価格情報
    original_price REAL NOT NULL DEFAULT 0,
    current_price REAL NOT NULL DEFAULT 0,
    adjusted_price REAL, -- カスタム調整後価格
    currency TEXT DEFAULT 'TWD',
    
    -- 在庫
    stock INTEGER DEFAULT 0,
    
    -- ステータス
    status TEXT DEFAULT 'active', -- active, inactive, banned, deleted
    shopee_status TEXT, -- Shopee側のステータス
    
    -- 統計
    sold INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    rating_star REAL DEFAULT 0,
    
    -- 価格調整設定
    price_rule_id INTEGER,
    auto_adjust_enabled INTEGER DEFAULT 0, -- boolean
    min_price REAL,
    max_price REAL,
    
    -- タイムスタンプ
    shopee_create_time INTEGER,
    shopee_update_time INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    last_synced_at TEXT,
    
    FOREIGN KEY (price_rule_id) REFERENCES price_rules(id)
);

-- =====================================================
-- 価格調整ルールテーブル
-- 価格調整の自動化ルールを定義
-- =====================================================
CREATE TABLE IF NOT EXISTS price_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id TEXT NOT NULL,
    
    -- ルール名と説明
    name TEXT NOT NULL,
    description TEXT,
    
    -- ルールタイプ
    rule_type TEXT NOT NULL, -- 'fixed', 'percentage', 'competitor', 'margin'
    
    -- 価格計算パラメータ
    adjustment_value REAL, -- 固定金額またはパーセンテージ
    adjustment_direction TEXT, -- 'increase', 'decrease'
    
    -- 制限
    min_price REAL,
    max_price REAL,
    min_margin_percent REAL,
    
    -- 適用条件
    apply_to_category INTEGER, -- カテゴリID (nullは全商品)
    apply_to_tags TEXT, -- JSON array of tags
    
    -- ステータス
    is_active INTEGER DEFAULT 1,
    priority INTEGER DEFAULT 0, -- 高いほど優先
    
    -- タイムスタンプ
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- =====================================================
-- トークンテーブル
-- Shopee APIトークンを安全に保存
-- =====================================================
CREATE TABLE IF NOT EXISTS tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id TEXT NOT NULL UNIQUE,
    
    -- トークン情報
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    
    -- 有効期限
    access_token_expires_at TEXT,
    refresh_token_expires_at TEXT,
    
    -- ショップ情報
    shop_name TEXT,
    region TEXT DEFAULT 'TW',
    
    -- タイムスタンプ
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- =====================================================
-- 価格履歴テーブル
-- 価格変更の履歴を追跡
-- =====================================================
CREATE TABLE IF NOT EXISTS price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    shopee_item_id TEXT NOT NULL,
    
    -- 価格情報
    old_price REAL,
    new_price REAL,
    change_reason TEXT, -- 'manual', 'auto_rule', 'shopee_sync'
    
    -- 関連ルール
    price_rule_id INTEGER,
    
    -- タイムスタンプ
    created_at TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (price_rule_id) REFERENCES price_rules(id)
);

-- =====================================================
-- 同期ログテーブル
-- Shopeeとの同期履歴を記録
-- =====================================================
CREATE TABLE IF NOT EXISTS sync_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id TEXT NOT NULL,
    
    -- 同期タイプ
    sync_type TEXT NOT NULL, -- 'products', 'orders', 'full'
    
    -- 結果
    status TEXT NOT NULL, -- 'success', 'partial', 'failed'
    items_synced INTEGER DEFAULT 0,
    items_failed INTEGER DEFAULT 0,
    error_message TEXT,
    
    -- タイムスタンプ
    started_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT
);

-- =====================================================
-- インデックス
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_products_shop_id ON products(shop_id);
CREATE INDEX IF NOT EXISTS idx_products_shopee_item_id ON products(shopee_item_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_price_rules_shop_id ON price_rules(shop_id);
CREATE INDEX IF NOT EXISTS idx_price_history_product_id ON price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_shop_id ON sync_logs(shop_id);
