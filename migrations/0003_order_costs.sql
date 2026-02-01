-- 注文費用テーブル
-- 利益計算ページで入力した費用を保存
CREATE TABLE IF NOT EXISTS order_costs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER NOT NULL,
    order_id TEXT NOT NULL,              -- Shopee注文ID
    order_sn TEXT,                       -- Shopee注文番号
    
    -- 費用情報（JPYベース）
    commission_twd REAL DEFAULT 0,       -- 手数料（TWD）
    yamato_shipping REAL DEFAULT 0,      -- ヤマト送料（JPY）
    sls_shipping REAL DEFAULT 0,         -- SLS送料（TWD）
    product_cost REAL DEFAULT 0,         -- 商品原価（JPY）
    other_cost REAL DEFAULT 0,           -- その他費用（JPY）
    
    -- 売上情報
    sales_twd REAL DEFAULT 0,            -- 売上（TWD）
    
    -- メモ
    notes TEXT,
    
    -- タイムスタンプ
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    
    UNIQUE(shop_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_order_costs_shop_id ON order_costs(shop_id);
CREATE INDEX IF NOT EXISTS idx_order_costs_order_id ON order_costs(order_id);
