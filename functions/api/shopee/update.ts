/**
 * Shopee Product Update API
 * 
 * 商品情報をShopee APIに送信して更新します
 * - update_item (商品名、説明など)
 * - update_price (価格)
 * - update_stock (在庫)
 */

interface Env {
    SHOPEE_PARTNER_ID: string;
    SHOPEE_PARTNER_KEY: string;
    DB: D1Database;
}

const SHOPEE_HOST = "https://partner.shopeemobile.com";

export const onRequest: PagesFunction<Env> = async (context) => {
    const { request, env } = context;

    // CORSプリフライト
    if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: getCorsHeaders() });
    }

    if (request.method !== "POST") {
        return errorResponse("Method not allowed", 405);
    }

    try {
        const body = await request.json() as {
            access_token: string;
            shop_id: number;
            item_id: number;
            update_type: 'item' | 'price' | 'stock' | 'all';
            // 商品情報
            item_name?: string;
            description?: string;
            // 価格
            price?: number;
            // 在庫
            stock?: number;
        };

        const { access_token, shop_id, item_id, update_type } = body;

        if (!access_token || !shop_id || !item_id) {
            return errorResponse("access_token, shop_id, item_id are required", 400);
        }

        const partnerId = env.SHOPEE_PARTNER_ID;
        const partnerKey = env.SHOPEE_PARTNER_KEY;
        const results: any = {};

        // 商品情報の更新
        if (update_type === 'item' || update_type === 'all') {
            if (body.item_name || body.description) {
                const updateData: any = { item_id };
                if (body.item_name) updateData.item_name = body.item_name;
                if (body.description) updateData.description = body.description;

                results.item = await callShopeeApi(
                    partnerId,
                    partnerKey,
                    access_token,
                    shop_id,
                    "/api/v2/product/update_item",
                    updateData
                );
            }
        }

        // 価格の更新
        if ((update_type === 'price' || update_type === 'all') && body.price !== undefined) {
            results.price = await callShopeeApi(
                partnerId,
                partnerKey,
                access_token,
                shop_id,
                "/api/v2/product/update_price",
                {
                    item_id,
                    price_list: [{
                        model_id: 0,
                        original_price: body.price
                    }]
                }
            );
        }

        // 在庫の更新
        if ((update_type === 'stock' || update_type === 'all') && body.stock !== undefined) {
            results.stock = await callShopeeApi(
                partnerId,
                partnerKey,
                access_token,
                shop_id,
                "/api/v2/product/update_stock",
                {
                    item_id,
                    stock_list: [{
                        model_id: 0,
                        seller_stock: [{
                            stock: body.stock
                        }]
                    }]
                }
            );
        }

        // エラーチェック
        const hasError = Object.values(results).some((r: any) => r?.error);

        if (hasError) {
            return new Response(JSON.stringify({
                status: "partial_error",
                message: "Some updates failed",
                data: results
            }), {
                status: 207,
                headers: { "Content-Type": "application/json", ...getCorsHeaders() },
            });
        }

        return new Response(JSON.stringify({
            status: "success",
            message: "Product updated on Shopee",
            data: results
        }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...getCorsHeaders() },
        });

    } catch (error) {
        console.error("Update error:", error);
        return errorResponse(`Server Error: ${error}`, 500);
    }
};

/**
 * Shopee APIを呼び出す汎用関数
 */
async function callShopeeApi(
    partnerId: string,
    partnerKey: string,
    accessToken: string,
    shopId: number,
    path: string,
    body: any
): Promise<any> {
    const timestamp = Math.floor(Date.now() / 1000);

    // 署名計算: partner_id + path + timestamp + access_token + shop_id
    const baseString = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;
    const sign = await hmacSha256(partnerKey, baseString);

    const url = `${SHOPEE_HOST}${path}?partner_id=${partnerId}&timestamp=${timestamp}&access_token=${accessToken}&shop_id=${shopId}&sign=${sign}`;

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    return await response.json();
}

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
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    };
}

function errorResponse(message: string, status: number): Response {
    return new Response(JSON.stringify({ status: "error", message }), {
        status,
        headers: { "Content-Type": "application/json", ...getCorsHeaders() },
    });
}
