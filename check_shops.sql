SELECT shop_id, shop_name, region, is_active, access_token IS NOT NULL as has_token, updated_at FROM shops;
SELECT shop_id, shop_name, region, access_token IS NOT NULL as has_token, updated_at FROM tokens;
