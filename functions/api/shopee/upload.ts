/**
 * Shopee Image Upload API
 * 
 * Shopee Media Spaceへ画像をアップロードします
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
        const url = new URL(request.url);
        const accessToken = url.searchParams.get("access_token");
        const shopId = url.searchParams.get("shop_id");

        if (!accessToken || !shopId) {
            return errorResponse("access_token and shop_id are required", 400);
        }

        const formData = await request.formData();
        const image = formData.get("image");

        if (!image) {
            return errorResponse("image file is required", 400);
        }

        const partnerId = env.SHOPEE_PARTNER_ID;
        const partnerKey = env.SHOPEE_PARTNER_KEY;

        const path = "/api/v2/media_space/upload_image";
        const timestamp = Math.floor(Date.now() / 1000);

        // 署名計算
        const baseString = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;
        const sign = await hmacSha256(partnerKey, baseString);

        const apiUrl = `${SHOPEE_HOST}${path}?partner_id=${partnerId}&timestamp=${timestamp}&access_token=${accessToken}&shop_id=${shopId}&sign=${sign}`;

        // FormDataの再構築
        const shopeeBody = new FormData();
        shopeeBody.append("image", image);

        const response = await fetch(apiUrl, {
            method: "POST",
            body: shopeeBody
        });

        const data = await response.json();

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { "Content-Type": "application/json", ...getCorsHeaders() },
        });

    } catch (error) {
        console.error("Upload error:", error);
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
