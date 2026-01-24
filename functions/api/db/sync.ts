/**
 * D1 Database Sync API
 * ShopeeデータとD1の同期を管理
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
                    for (const item of details.response.item_list) {
                        allProducts.push({
                            id: item.item_id,
                            name: item.item_name,
                            description: item.description,
                            category_id: item.category_id,
                            image: item.image?.image_url_list?.[0] || null,
                            images: item.image?.image_url_list || [],
                            originalPrice: item.price_info?.[0]?.original_price || 0,
                            price: item.price_info?.[0]?.current_price || 0,
                            currency: item.price_info?.[0]?.currency || "TWD",
                            stock: item.stock_info_v2?.summary_info?.total_available_stock || 0,
                            status: mapItemStatus(item.item_status),
                            shopee_status: item.item_status,
                            sold: item.sold || 0,
                            views: item.views || 0,
                            likes: item.likes || 0,
                            rating_star: item.rating_star || 0,
                            create_time: item.create_time,
                            update_time: item.update_time
                        });
                    }
                }
            }

            hasMore = result.response.has_next_page;
            offset = result.response.next_offset || offset + 50;
        }

        // 2. D1に同期
        let synced = 0;
        let failed = 0;

        for (const product of allProducts) {
            try {
                await env.DB.prepare(`
                    INSERT INTO products (
                        shopee_item_id, shop_id, name, description, category_id,
                        image_url, images, original_price, current_price, currency,
                        stock, status, shopee_status, sold, views, likes, rating_star,
                        shopee_create_time, shopee_update_time, last_synced_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                    ON CONFLICT(shopee_item_id) DO UPDATE SET
                        name = excluded.name,
                        description = excluded.description,
                        image_url = excluded.image_url,
                        images = excluded.images,
                        original_price = excluded.original_price,
                        current_price = excluded.current_price,
                        stock = excluded.stock,
                        status = excluded.status,
                        shopee_status = excluded.shopee_status,
                        sold = excluded.sold,
                        views = excluded.views,
                        likes = excluded.likes,
                        rating_star = excluded.rating_star,
                        shopee_update_time = excluded.shopee_update_time,
                        last_synced_at = datetime('now'),
                        updated_at = datetime('now')
                `).bind(
                    String(product.id),
                    shopId,
                    product.name,
                    product.description || null,
                    product.category_id || null,
                    product.image || null,
                    JSON.stringify(product.images || []),
                    product.originalPrice || 0,
                    product.price || 0,
                    product.currency || "TWD",
                    product.stock || 0,
                    product.status || "active",
                    product.shopee_status || null,
                    product.sold || 0,
                    product.views || 0,
                    product.likes || 0,
                    product.rating_star || 0,
                    product.create_time || null,
                    product.update_time || null
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
        `).bind(shopId, failed > 0 ? "partial" : "success", synced, failed).run();

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
    const apiUrl = `${SHOPEE_HOST}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&access_token=${accessToken}&shop_id=${shopId}&offset=${offset}&page_size=50&item_status=NORMAL`;
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

function mapItemStatus(status: string): string {
    const statusMap: Record<string, string> = { "NORMAL": "active", "UNLIST": "inactive", "BANNED": "banned", "DELETED": "deleted" };
    return statusMap[status] || "unknown";
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
