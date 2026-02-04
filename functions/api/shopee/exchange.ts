/**
 * Shopee OAuth認可コード交換エンドポイント
 * 
 * フロントエンドから認可コードを受け取り、Access Tokenに交換してD1に保存します
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
        return new Response(null, {
            status: 204,
            headers: getCorsHeaders(),
        });
    }

    if (request.method !== "POST") {
        return errorResponse("Method not allowed", 405);
    }

    try {
        const body = await request.json() as { code: string, shop_id: number, region?: string };
        const { code, shop_id, region = 'TW' } = body;

        if (!code || !shop_id) {
            return errorResponse("code and shop_id are required", 400);
        }

        // アクセストークンを取得
        const tokenResult = await getAccessToken(
            env.SHOPEE_PARTNER_ID,
            env.SHOPEE_PARTNER_KEY,
            code,
            shop_id
        );

        if (tokenResult.error) {
            return errorResponse(`Shopee API Error: ${tokenResult.error} - ${tokenResult.message || ''}`, 400);
        }

        // D1 tokensテーブルに保存（後方互換性）
        await saveTokenToD1(env.DB, {
            shop_id: shop_id,
            access_token: tokenResult.access_token,
            refresh_token: tokenResult.refresh_token,
            expire_in: tokenResult.expire_in,
            shop_name: null,
            region: region
        });

        // D1 shopsテーブルにも保存（マルチリージョン対応）
        await saveToShopsTable(env.DB, {
            shop_id: shop_id,
            access_token: tokenResult.access_token,
            refresh_token: tokenResult.refresh_token,
            expire_in: tokenResult.expire_in,
            region: region
        });

        return new Response(JSON.stringify({
            status: "success",
            message: "Authentication successful",
            data: {
                shop_id: shop_id,
                access_token: tokenResult.access_token,
                refresh_token: tokenResult.refresh_token,
                expires_in: tokenResult.expire_in,
                region: region
            }
        }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...getCorsHeaders() },
        });

    } catch (error) {
        console.error("Auth exchange error:", error);
        return errorResponse(`Server Error: ${error}`, 500);
    }
};

/**
 * トークンをD1 tokensテーブルに保存
 */
async function saveTokenToD1(db: D1Database, data: {
    shop_id: number;
    access_token: string;
    refresh_token: string;
    expire_in: number;
    shop_name: string | null;
    region: string;
}): Promise<void> {
    const accessExpires = new Date(Date.now() + (data.expire_in * 1000)).toISOString();
    const refreshExpires = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString(); // 30日

    await db.prepare(`
        INSERT INTO tokens (shop_id, access_token, refresh_token, access_token_expires_at, refresh_token_expires_at, shop_name, region)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(shop_id) DO UPDATE SET
            access_token = excluded.access_token,
            refresh_token = excluded.refresh_token,
            access_token_expires_at = excluded.access_token_expires_at,
            refresh_token_expires_at = excluded.refresh_token_expires_at,
            region = excluded.region,
            updated_at = datetime('now')
    `).bind(
        data.shop_id,
        data.access_token,
        data.refresh_token,
        accessExpires,
        refreshExpires,
        data.shop_name,
        data.region
    ).run();
}

/**
 * ショップ情報をD1 shopsテーブルに保存（マルチリージョン対応）
 */
async function saveToShopsTable(db: D1Database, data: {
    shop_id: number;
    access_token: string;
    refresh_token: string;
    expire_in: number;
    region: string;
}): Promise<void> {
    const tokenExpiresAt = Math.floor(Date.now() / 1000) + data.expire_in;

    try {
        await db.prepare(`
            INSERT INTO shops (shop_id, shop_name, region, access_token, refresh_token, token_expires_at, is_active)
            VALUES (?, ?, ?, ?, ?, ?, 1)
            ON CONFLICT(shop_id) DO UPDATE SET
                access_token = excluded.access_token,
                refresh_token = excluded.refresh_token,
                token_expires_at = excluded.token_expires_at,
                region = excluded.region,
                is_active = 1,
                updated_at = datetime('now')
        `).bind(
            data.shop_id,
            `${data.region} Shop`,
            data.region,
            data.access_token,
            data.refresh_token,
            tokenExpiresAt
        ).run();
    } catch (e) {
        // shopsテーブルが存在しない場合はスキップ（後方互換性）
        console.warn("Failed to save to shops table:", e);
    }
}

/**
 * 認可コードからAccess Tokenを取得
 */
async function getAccessToken(
    partnerId: string,
    partnerKey: string,
    code: string,
    shopId: number
): Promise<any> {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = "/api/v2/auth/token/get";

    // 署名計算
    const baseString = `${partnerId}${path}${timestamp}`;
    const sign = await hmacSha256(partnerKey, baseString);

    const tokenUrl = `${SHOPEE_HOST}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`;

    const response = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            code: code,
            shop_id: parseInt(shopId.toString()),
            partner_id: parseInt(partnerId),
        }),
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
