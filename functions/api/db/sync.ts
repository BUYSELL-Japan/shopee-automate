/**
 * D1 Database Sync API (Shopee API統一版)
 * ShopeeデータをShopee APIパラメータと完全に統一してD1に保存
 */

interface Env {
    DB: D1Database;
    SHOPEE_PARTNER_ID: string;
    SHOPEE_PARTNER_KEY: string;
}

const SHOPEE_HOST = "https://partner.shopeemobile.com";

export const onRequest: PagesFunction<Env> = async (context) => {
    const { env, request } = context;
    const url = new URL(request.url);

    // CORSプリフライト
    if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: getCorsHeaders() });
    }

    if (request.method !== "POST") {
        return errorResponse("Method not allowed", 405);
    }

    const accessToken = url.searchParams.get("access_token");
    const shopId = url.searchParams.get("shop_id");

    if (!accessToken || !shopId) {
        return errorResponse("access_token and shop_id required", 400);
    }

    try {
        const partnerId = env.SHOPEE_PARTNER_ID;
        const partnerKey = env.SHOPEE_PARTNER_KEY;

        // 1. Shopeeから全商品を取得
        const allProducts: any[] = [];
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
            const result = await getItemList(partnerId, partnerKey, accessToken, parseInt(shopId), offset);

            if (result.error || !result.response?.item) {
                break;
            }

            // 商品詳細を取得
            if (result.response.item.length > 0) {
                const itemIds = result.response.item.map((i: any) => i.item_id);
                const details = await getItemBaseInfo(partnerId, partnerKey, accessToken, parseInt(shopId), itemIds);

                if (details.response?.item_list) {
                    // Shopee APIのレスポンスをそのまま保存
                    for (const item of details.response.item_list) {
                        allProducts.push(item);
                    }
                }
            }

            hasMore = result.response.has_next_page;
            offset = result.response.next_offset || offset + 50;
        }

        // 2. D1に同期（Shopee APIパラメータと完全統一）
        let synced = 0;
        let failed = 0;

        for (const item of allProducts) {
            try {
                await env.DB.prepare(`
                    INSERT INTO products (
                        item_id, shop_id, item_name, description, description_type, item_sku,
                        category_id, original_price, current_price, currency, stock,
                        image_url, image_url_list, weight, package_length, package_width, package_height,
                        condition, item_status, sold, views, likes, rating_star, cmt_count,
                        attribute_list, logistic_info, has_model, brand_id,
                        create_time, update_time, last_synced_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                    ON CONFLICT(item_id) DO UPDATE SET
                        item_name = excluded.item_name,
                        description = excluded.description,
                        description_type = excluded.description_type,
                        item_sku = excluded.item_sku,
                        category_id = excluded.category_id,
                        original_price = excluded.original_price,
                        current_price = excluded.current_price,
                        currency = excluded.currency,
                        stock = excluded.stock,
                        image_url = excluded.image_url,
                        image_url_list = excluded.image_url_list,
                        weight = excluded.weight,
                        package_length = excluded.package_length,
                        package_width = excluded.package_width,
                        package_height = excluded.package_height,
                        condition = excluded.condition,
                        item_status = excluded.item_status,
                        sold = excluded.sold,
                        views = excluded.views,
                        likes = excluded.likes,
                        rating_star = excluded.rating_star,
                        cmt_count = excluded.cmt_count,
                        attribute_list = excluded.attribute_list,
                        logistic_info = excluded.logistic_info,
                        has_model = excluded.has_model,
                        brand_id = excluded.brand_id,
                        update_time = excluded.update_time,
                        last_synced_at = datetime('now'),
                        updated_at = datetime('now')
                `).bind(
                    // Shopee APIパラメータをそのまま使用
                    item.item_id,
                    parseInt(shopId),
                    item.item_name,
                    item.description || null,
                    item.description_type || 'normal',
                    item.item_sku || null,
                    item.category_id || null,
                    item.price_info?.[0]?.original_price || null,
                    item.price_info?.[0]?.current_price || null,
                    item.price_info?.[0]?.currency || 'TWD',
                    item.stock_info_v2?.summary_info?.total_available_stock || 0,
                    item.image?.image_url_list?.[0] || null,
                    JSON.stringify(item.image?.image_url_list || []),
                    item.weight || null,
                    item.dimension?.package_length || null,
                    item.dimension?.package_width || null,
                    item.dimension?.package_height || null,
                    item.condition || 'NEW',
                    item.item_status || 'NORMAL',
                    item.sold || 0,
                    item.views || 0,
                    item.likes || 0,
                    item.rating_star || 0,
                    item.cmt_count || 0,
                    JSON.stringify(item.attribute_list || []),
                    JSON.stringify(item.logistic_info || []),
                    item.has_model ? 1 : 0,
                    item.brand?.brand_id || null,
                    item.create_time || null,
                    item.update_time || null
                ).run();
                synced++;
            } catch (e) {
                console.error("Sync error:", e);
                failed++;
            }
        }

        // 3. 同期ログを記録
        await env.DB.prepare(`
            INSERT INTO sync_logs (shop_id, sync_type, status, items_synced, items_failed, completed_at)
            VALUES (?, 'products', ?, ?, ?, datetime('now'))
        `).bind(parseInt(shopId), failed > 0 ? "partial" : "success", synced, failed).run();

        return jsonResponse({
            status: "success",
            message: `Synced ${synced} products from Shopee`,
            data: {
                total_fetched: allProducts.length,
                synced,
                failed
            }
        });

    } catch (error) {
        console.error("Sync error:", error);
        return errorResponse(`Sync error: ${error}`, 500);
    }
};

// Shopee API呼び出し関数
async function getItemList(partnerId: string, partnerKey: string, accessToken: string, shopId: number, offset = 0): Promise<any> {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = "/api/v2/product/get_item_list";
    const baseString = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;
    const sign = await hmacSha256(partnerKey, baseString);
    const apiUrl = `${SHOPEE_HOST}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&access_token=${accessToken}&shop_id=${shopId}&offset=${offset}&page_size=50&item_status=NORMAL&item_status=UNLIST`;
    const response = await fetch(apiUrl);
    return await response.json();
}

async function getItemBaseInfo(partnerId: string, partnerKey: string, accessToken: string, shopId: number, itemIds: number[]): Promise<any> {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = "/api/v2/product/get_item_base_info";
    const baseString = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;
    const sign = await hmacSha256(partnerKey, baseString);
    const itemIdList = itemIds.join(",");
    const apiUrl = `${SHOPEE_HOST}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&access_token=${accessToken}&shop_id=${shopId}&item_id_list=${itemIdList}`;
    const response = await fetch(apiUrl);
    return await response.json();
}

async function hmacSha256(key: string, message: string): Promise<string> {
    const encoder = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey("raw", encoder.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
    return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function jsonResponse(data: any, status = 200): Response {
    return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...getCorsHeaders() } });
}

function errorResponse(message: string, status: number): Response {
    return jsonResponse({ status: "error", message }, status);
}

function getCorsHeaders(): Record<string, string> {
    return { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
}
