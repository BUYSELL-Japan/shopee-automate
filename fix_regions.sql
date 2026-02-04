-- shop_id 581234742 を MY に変更
UPDATE tokens SET region = 'MY' WHERE shop_id = 581234742;

-- shopsテーブルにも追加
INSERT INTO shops (shop_id, shop_name, region, is_active) 
VALUES (581234742, 'Malaysia Shop', 'MY', 1)
ON CONFLICT(shop_id) DO UPDATE SET region = 'MY', is_active = 1;

INSERT INTO shops (shop_id, shop_name, region, is_active) 
VALUES (1648252597, 'Taiwan Shop', 'TW', 1)
ON CONFLICT(shop_id) DO UPDATE SET region = 'TW', is_active = 1;

-- 確認
SELECT shop_id, shop_name, region FROM tokens;
SELECT shop_id, shop_name, region, is_active FROM shops;
