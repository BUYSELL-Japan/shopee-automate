/**
 * Shopee 接続テストエンドポイント
 * 
 * Access Tokenを使用してショップ情報を取得し、
 * 台湾Shopeeとの接続が正常かどうかをテストします
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

    if (!accessToken || !shopId) {
        return new Response(JSON.stringify({
            status: "error",
            message: "access_token と shop_id パラメータが必要です",
            usage: "/api/shopee/test-connection?access_token=YOUR_TOKEN&shop_id=YOUR_SHOP_ID"
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

        // Shop Info APIを呼び出し
        const shopInfo = await getShopInfo(
            partnerId,
            partnerKey,
            accessToken,
            parseInt(shopId)
        );

        const isSuccess = !shopInfo.error;

        return new Response(JSON.stringify({
            status: isSuccess ? "success" : "error",
            message: isSuccess ? "台湾Shopeeショップとの接続が確認できました！" : "接続エラー",
            shop_info: shopInfo,
            tested_at: new Date().toISOString(),
        }), {
            status: isSuccess ? 200 : 400,
            headers: { "Content-Type": "application/json", ...getCorsHeaders() },
        });

    } catch (error) {
        return new Response(JSON.stringify({
            status: "error",
            message: `テスト失敗: ${error}`,
        }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...getCorsHeaders() },
        });
    }
};

/**
 * ショップ情報を取得
 */
async function getShopInfo(
    partnerId: string,
    partnerKey: string,
    accessToken: string,
    shopId: number
): Promise<any> {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = "/api/v2/shop/get_shop_info";

    // 署名計算: partner_id + path + timestamp + access_token + shop_id
    const baseString = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;
    const sign = await hmacSha256(partnerKey, baseString);

    const apiUrl = `${SHOPEE_HOST}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&access_token=${accessToken}&shop_id=${shopId}`;

    console.log("Calling Shop Info API:", apiUrl.replace(accessToken, "***"));

    const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });

    const result = await response.json();
    console.log("Shop Info Result:", JSON.stringify(result, null, 2));
    return result;
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
