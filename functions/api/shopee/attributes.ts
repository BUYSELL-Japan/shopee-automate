/**
 * Shopee Attributes API
 * 
 * カテゴリごとの属性情報を取得します（ブランドなど）
 * Endpoint: /api/v2/product/get_attributes
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

    try {
        const url = new URL(request.url);
        const accessToken = url.searchParams.get("access_token");
        const shopId = url.searchParams.get("shop_id");
        const categoryId = url.searchParams.get("category_id");
        const language = url.searchParams.get("language") || "zh-Hant"; // デフォルト繁体字

        if (!accessToken || !shopId || !categoryId) {
            return errorResponse("access_token, shop_id, and category_id are required", 400);
        }

        const partnerId = env.SHOPEE_PARTNER_ID;
        const partnerKey = env.SHOPEE_PARTNER_KEY;

        const path = "/api/v2/product/get_attributes";
        const timestamp = Math.floor(Date.now() / 1000);

        // 署名計算
        const baseString = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;
        const sign = await hmacSha256(partnerKey, baseString);

        // クエリパラメータ
        const apiUrl = `${SHOPEE_HOST}${path}?partner_id=${partnerId}&timestamp=${timestamp}&access_token=${accessToken}&shop_id=${shopId}&sign=${sign}&category_id=${categoryId}&language=${language}`;

        const response = await fetch(apiUrl, {
            method: "GET",
        });

        const data = await response.json();

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { "Content-Type": "application/json", ...getCorsHeaders() },
        });

    } catch (error) {
        console.error("Attributes API error:", error);
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
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    };
}

function errorResponse(message: string, status: number): Response {
    return new Response(JSON.stringify({ status: "error", message }), {
        status,
        headers: { "Content-Type": "application/json", ...getCorsHeaders() },
    });
}
