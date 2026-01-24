/**
 * Shopee 商品一覧取得エンドポイント
 * 
 * /api/v2/product/get_item_list を使用して商品一覧を取得
 * /api/v2/product/get_item_base_info で詳細情報を取得
 */

interface Env {
    SHOPEE_PARTNER_ID: string;
    SHOPEE_PARTNER_KEY: string;
}

const SHOPEE_HOST = "https://partner.shopeemobile.com";

export const onRequest: PagesFunction<Env> = async (context) => {
    const { env, request } = context;
    const url = new URL(request.url);

    // CORSプリフライト
    if (request.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: getCorsHeaders(),
        });
    }

    // クエリパラメータからトークンとショップIDを取得
    const accessToken = url.searchParams.get("access_token");
    const shopId = url.searchParams.get("shop_id");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const pageSize = parseInt(url.searchParams.get("page_size") || "20");

    if (!accessToken || !shopId) {
        return new Response(JSON.stringify({
            status: "error",
            message: "access_token と shop_id パラメータが必要です"
        }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...getCorsHeaders() },
        });
    }

    try {
        const partnerId = env.SHOPEE_PARTNER_ID;
        const partnerKey = env.SHOPEE_PARTNER_KEY;

        if (!partnerId || !partnerKey) {
            throw new Error("環境変数が設定されていません");
        }

        // 商品一覧を取得
        const itemList = await getItemList(
            partnerId,
            partnerKey,
            accessToken,
            parseInt(shopId),
            offset,
            pageSize
        );

        if (itemList.error) {
            return new Response(JSON.stringify({
                status: "error",
                message: itemList.message || itemList.error,
                data: itemList
            }), {
                status: 400,
                headers: { "Content-Type": "application/json", ...getCorsHeaders() },
            });
        }

        // 商品詳細情報を取得（アイテムがある場合）
        let products = [];
        if (itemList.response?.item && itemList.response.item.length > 0) {
            const itemIds = itemList.response.item.map((item: any) => item.item_id);
            const itemInfo = await getItemBaseInfo(
                partnerId,
                partnerKey,
                accessToken,
                parseInt(shopId),
                itemIds
            );

            if (itemInfo.response?.item_list) {
                products = itemInfo.response.item_list.map((item: any) => ({
                    id: item.item_id,
                    name: item.item_name,
                    description: item.description,
                    price: item.price_info?.[0]?.current_price || 0,
                    originalPrice: item.price_info?.[0]?.original_price || 0,
                    currency: item.price_info?.[0]?.currency || "TWD",
                    stock: item.stock_info_v2?.summary_info?.total_available_stock || 0,
                    status: mapItemStatus(item.item_status),
                    image: item.image?.image_url_list?.[0] || null,
                    images: item.image?.image_url_list || [],
                    category_id: item.category_id,
                    sold: item.sold || 0,
                    views: item.views || 0,
                    likes: item.likes || 0,
                    rating_star: item.rating_star || 0,
                    create_time: item.create_time,
                    update_time: item.update_time,
                }));
            }
        }

        return new Response(JSON.stringify({
            status: "success",
            message: "商品一覧を取得しました",
            data: {
                products: products,
                total: itemList.response?.total_count || 0,
                has_next_page: itemList.response?.has_next_page || false,
                next_offset: itemList.response?.next_offset || null,
            }
        }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...getCorsHeaders() },
        });

    } catch (error) {
        return new Response(JSON.stringify({
            status: "error",
            message: `エラー: ${error}`,
        }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...getCorsHeaders() },
        });
    }
};

/**
 * 商品一覧を取得
 */
async function getItemList(
    partnerId: string,
    partnerKey: string,
    accessToken: string,
    shopId: number,
    offset: number,
    pageSize: number
): Promise<any> {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = "/api/v2/product/get_item_list";

    const baseString = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;
    const sign = await hmacSha256(partnerKey, baseString);

    const apiUrl = `${SHOPEE_HOST}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&access_token=${accessToken}&shop_id=${shopId}&offset=${offset}&page_size=${pageSize}`;

    const response = await fetch(apiUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });

    return await response.json();
}

/**
 * 商品詳細情報を取得
 */
async function getItemBaseInfo(
    partnerId: string,
    partnerKey: string,
    accessToken: string,
    shopId: number,
    itemIds: number[]
): Promise<any> {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = "/api/v2/product/get_item_base_info";

    const baseString = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;
    const sign = await hmacSha256(partnerKey, baseString);

    const itemIdList = itemIds.join(",");
    const apiUrl = `${SHOPEE_HOST}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&access_token=${accessToken}&shop_id=${shopId}&item_id_list=${itemIdList}`;

    const response = await fetch(apiUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });

    return await response.json();
}

/**
 * Shopeeステータスをアプリ内ステータスにマッピング
 */
function mapItemStatus(status: string): string {
    const statusMap: Record<string, string> = {
        "NORMAL": "active",
        "UNLIST": "inactive",
        "BANNED": "banned",
        "DELETED": "deleted"
    };
    return statusMap[status] || "unknown";
}

/**
 * HMAC-SHA256署名を生成
 */
async function hmacSha256(key: string, message: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(key);
    const messageData = encoder.encode(message);

    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
    const hashArray = Array.from(new Uint8Array(signature));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

function getCorsHeaders(): Record<string, string> {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    };
}
