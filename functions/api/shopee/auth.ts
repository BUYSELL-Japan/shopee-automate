/**
 * Shopee OAuth認可URL生成エンドポイント
 * 
 * 台湾ショップとの連携を開始するための認可URLを生成します
 */

interface Env {
    SHOPEE_PARTNER_ID: string;
    SHOPEE_PARTNER_KEY: string;
}

// Shopee API設定（台湾）
const SHOPEE_HOST = "https://partner.shopeemobile.com";
const REDIRECT_URL = "https://shopee-automate.pages.dev/api/callback";

export const onRequest: PagesFunction<Env> = async (context) => {
    const { env, request } = context;

    // CORSプリフライト
    if (request.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: getCorsHeaders(),
        });
    }

    try {
        const partnerId = parseInt(env.SHOPEE_PARTNER_ID);
        const partnerKey = env.SHOPEE_PARTNER_KEY;

        if (!partnerId || !partnerKey) {
            return errorResponse("環境変数が設定されていません", 500);
        }

        // タイムスタンプ（秒）
        const timestamp = Math.floor(Date.now() / 1000);

        // 署名計算: partner_id + path + timestamp
        const path = "/api/v2/shop/auth_partner";
        const baseString = `${partnerId}${path}${timestamp}`;
        const sign = await hmacSha256(partnerKey, baseString);

        // 認可URL生成
        const authUrl = new URL(`${SHOPEE_HOST}${path}`);
        authUrl.searchParams.set("partner_id", partnerId.toString());
        authUrl.searchParams.set("timestamp", timestamp.toString());
        authUrl.searchParams.set("sign", sign);
        authUrl.searchParams.set("redirect", REDIRECT_URL);

        return new Response(JSON.stringify({
            status: "success",
            message: "認可URLを生成しました。以下のURLにアクセスしてショップを認可してください。",
            auth_url: authUrl.toString(),
            partner_id: partnerId,
            timestamp: timestamp,
        }), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                ...getCorsHeaders(),
            },
        });

    } catch (error) {
        return errorResponse(`エラーが発生しました: ${error}`, 500);
    }
};

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
