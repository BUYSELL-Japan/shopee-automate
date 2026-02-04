/**
 * D1 Database Tokens API
 * トークンの取得・更新・削除
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

    try {
        switch (request.method) {
            case "GET":
                return await handleGet(env.DB, url);
            case "POST":
                return await handleRefresh(env, url);
            case "DELETE":
                return await handleDelete(env.DB, url);
            default:
                return errorResponse("Method not allowed", 405);
        }
    } catch (error) {
        console.error("Token API error:", error);
        return errorResponse(`Error: ${error}`, 500);
    }
};

/**
 * GET: トークンを取得
 */
async function handleGet(db: D1Database, url: URL): Promise<Response> {
    const shopId = url.searchParams.get("shop_id");
    const region = url.searchParams.get("region");

    if (shopId) {
        // 特定のショップのトークンを取得
        const token = await db.prepare(`
            SELECT * FROM tokens WHERE shop_id = ?
        `).bind(parseInt(shopId)).first();

        if (!token) {
            return jsonResponse({ status: "error", message: "Token not found", data: null });
        }

        // 有効期限をチェック
        const now = new Date();
        const accessExpires = token.access_token_expires_at ? new Date(token.access_token_expires_at as string) : null;
        const isExpired = accessExpires ? now > accessExpires : true;

        return jsonResponse({
            status: "success",
            data: {
                shop_id: token.shop_id,
                access_token: token.access_token,
                refresh_token: token.refresh_token,
                shop_name: token.shop_name,
                region: token.region,
                access_token_expires_at: token.access_token_expires_at,
                refresh_token_expires_at: token.refresh_token_expires_at,
                is_expired: isExpired,
                updated_at: token.updated_at
            }
        });
    }

    // リージョン指定で取得
    if (region) {
        const token = await db.prepare(`
            SELECT * FROM tokens WHERE region = ? ORDER BY updated_at DESC LIMIT 1
        `).bind(region).first();

        if (!token) {
            return jsonResponse({ status: "error", message: `No token found for region ${region}`, data: null });
        }

        const now = new Date();
        const accessExpires = token.access_token_expires_at ? new Date(token.access_token_expires_at as string) : null;
        const isExpired = accessExpires ? now > accessExpires : true;

        return jsonResponse({
            status: "success",
            data: {
                shop_id: token.shop_id,
                access_token: token.access_token,
                refresh_token: token.refresh_token,
                shop_name: token.shop_name,
                region: token.region,
                access_token_expires_at: token.access_token_expires_at,
                refresh_token_expires_at: token.refresh_token_expires_at,
                is_expired: isExpired,
                updated_at: token.updated_at
            }
        });
    }

    // 全トークン一覧を取得
    const tokens = await db.prepare(`
        SELECT shop_id, shop_name, region, access_token_expires_at, updated_at FROM tokens
        ORDER BY updated_at DESC
    `).all();

    return jsonResponse({
        status: "success",
        data: tokens.results
    });
}

/**
 * POST: Refresh Tokenを使ってAccess Tokenを更新
 */
async function handleRefresh(env: Env, url: URL): Promise<Response> {
    const shopId = url.searchParams.get("shop_id");

    if (!shopId) {
        return errorResponse("shop_id required", 400);
    }

    // D1から現在のトークンを取得
    const current = await env.DB.prepare(`
        SELECT * FROM tokens WHERE shop_id = ?
    `).bind(parseInt(shopId)).first();

    if (!current || !current.refresh_token) {
        return errorResponse("No refresh token found", 404);
    }

    // Shopee APIでトークンをリフレッシュ
    const refreshResult = await refreshAccessToken(
        env.SHOPEE_PARTNER_ID,
        env.SHOPEE_PARTNER_KEY,
        current.refresh_token as string,
        parseInt(shopId)
    );

    if (refreshResult.error) {
        return jsonResponse({
            status: "error",
            message: refreshResult.message || refreshResult.error,
            data: refreshResult
        }, 400);
    }

    // 新しいトークンをD1に保存
    const accessExpires = new Date(Date.now() + (refreshResult.expire_in * 1000)).toISOString();
    const refreshExpires = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString();

    await env.DB.prepare(`
        UPDATE tokens SET
            access_token = ?,
            refresh_token = ?,
            access_token_expires_at = ?,
            refresh_token_expires_at = ?,
            updated_at = datetime('now')
        WHERE shop_id = ?
    `).bind(
        refreshResult.access_token,
        refreshResult.refresh_token,
        accessExpires,
        refreshExpires,
        parseInt(shopId)
    ).run();

    return jsonResponse({
        status: "success",
        message: "Token refreshed and saved to D1",
        data: {
            access_token: refreshResult.access_token,
            refresh_token: refreshResult.refresh_token,
            expire_in: refreshResult.expire_in,
            access_token_expires_at: accessExpires
        }
    });
}

/**
 * DELETE: トークンを削除
 */
async function handleDelete(db: D1Database, url: URL): Promise<Response> {
    const shopId = url.searchParams.get("shop_id");

    if (!shopId) {
        return errorResponse("shop_id required", 400);
    }

    await db.prepare(`DELETE FROM tokens WHERE shop_id = ?`).bind(parseInt(shopId)).run();

    return jsonResponse({ status: "success", message: "Token deleted" });
}

/**
 * Refresh Tokenを使ってAccess Tokenを更新
 */
async function refreshAccessToken(
    partnerId: string,
    partnerKey: string,
    refreshToken: string,
    shopId: number
): Promise<any> {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = "/api/v2/auth/access_token/get";

    const baseString = `${partnerId}${path}${timestamp}`;
    const sign = await hmacSha256(partnerKey, baseString);

    const apiUrl = `${SHOPEE_HOST}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`;

    const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            refresh_token: refreshToken,
            shop_id: shopId,
            partner_id: parseInt(partnerId)
        })
    });

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
    return { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
}
