/**
 * Shopee Add Item API
 * 
 * 商品をShopeeに新規出品します
 * Endpoint: /api/v2/product/add_item
 */

interface Env {
    SHOPEE_PARTNER_ID: string;
    SHOPEE_PARTNER_KEY: string;
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
        const body = await request.json() as any;
        const { access_token, shop_id, ...itemData } = body;

        if (!access_token || !shop_id) {
            return errorResponse("access_token and shop_id are required", 400);
        }

        const partnerId = env.SHOPEE_PARTNER_ID;
        const partnerKey = env.SHOPEE_PARTNER_KEY;

        const path = "/api/v2/product/add_item";
        const timestamp = Math.floor(Date.now() / 1000);

        // 署名計算
        const baseString = `${partnerId}${path}${timestamp}${access_token}${shop_id}`;
        const sign = await hmacSha256(partnerKey, baseString);

        const apiUrl = `${SHOPEE_HOST}${path}?partner_id=${partnerId}&timestamp=${timestamp}&access_token=${access_token}&shop_id=${shop_id}&sign=${sign}`;

        // Shopee APIへのリクエストデータ構築
        // 必須項目: original_price, description, item_name, item_status, normal_stock, category_id, image, weight, logistic_info

        const payload = {
            original_price: itemData.original_price,
            description: itemData.description,
            item_name: itemData.item_name,
            item_status: "NORMAL", // 出品中
            normal_stock: itemData.normal_stock,
            category_id: itemData.category_id,
            image: itemData.image, // { image_id_list: string[] }
            weight: itemData.weight || 0.5,
            logistic_info: itemData.logistic_info || [], // 送料設定
            attribute_list: itemData.attribute_list || [],
            ...itemData
        };

        const response = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { "Content-Type": "application/json", ...getCorsHeaders() },
        });

    } catch (error) {
        console.error("Add Item error:", error);
        return errorResponse(`Server Error: ${error}`, 500);
    }
};

async function hmacSha256(key: string, message: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(key);
    const messageData = encoder.encode(message);

    const cryptoKey = await crypto.subtle.importKey(
        "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
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
