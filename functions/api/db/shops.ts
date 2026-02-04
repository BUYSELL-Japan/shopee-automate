/**
 * D1 Database Shops API
 * マルチショップ管理用API
 */

interface Env {
    DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
    const { env, request } = context;
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: getCorsHeaders() });
    }

    try {
        switch (request.method) {
            case "GET":
                return await handleGet(env.DB, url);
            case "POST":
                return await handlePost(env.DB, request);
            case "PUT":
                return await handlePut(env.DB, request);
            case "DELETE":
                return await handleDelete(env.DB, url);
            default:
                return errorResponse("Method not allowed", 405);
        }
    } catch (error) {
        console.error("Database error:", error);
        return errorResponse(`Database error: ${error}`, 500);
    }
};

async function handleGet(db: D1Database, url: URL): Promise<Response> {
    const shopId = url.searchParams.get("shop_id");
    const region = url.searchParams.get("region");
    const activeOnly = url.searchParams.get("active") !== "false";

    if (shopId) {
        const result = await db.prepare(
            "SELECT * FROM shops WHERE shop_id = ?"
        ).bind(parseInt(shopId)).first();
        return jsonResponse({ status: "success", data: result });
    }

    let query = "SELECT * FROM shops WHERE 1=1";
    const params: any[] = [];

    if (region) {
        query += " AND region = ?";
        params.push(region);
    }

    if (activeOnly) {
        query += " AND is_active = 1";
    }

    query += " ORDER BY region, shop_name";

    const results = await db.prepare(query).bind(...params).all();
    return jsonResponse({ status: "success", data: results.results });
}

async function handlePost(db: D1Database, request: Request): Promise<Response> {
    const body = await request.json() as any;
    const { shop_id, shop_name, region, access_token, refresh_token, token_expires_at } = body;

    if (!shop_id || !region) {
        return errorResponse("shop_id and region are required", 400);
    }

    await db.prepare(`
        INSERT INTO shops (shop_id, shop_name, region, access_token, refresh_token, token_expires_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(shop_id) DO UPDATE SET
            shop_name = excluded.shop_name,
            region = excluded.region,
            access_token = excluded.access_token,
            refresh_token = excluded.refresh_token,
            token_expires_at = excluded.token_expires_at,
            updated_at = datetime('now')
    `).bind(
        shop_id,
        shop_name || null,
        region,
        access_token || null,
        refresh_token || null,
        token_expires_at || null
    ).run();

    return jsonResponse({ status: "success", message: "Shop saved" });
}

async function handlePut(db: D1Database, request: Request): Promise<Response> {
    const body = await request.json() as any;
    const { shop_id, ...updates } = body;

    if (!shop_id) {
        return errorResponse("shop_id required", 400);
    }

    const updateFields: string[] = [];
    const params: any[] = [];

    const fields = ['shop_name', 'region', 'access_token', 'refresh_token', 'token_expires_at', 'is_active'];
    for (const field of fields) {
        if (updates[field] !== undefined) {
            updateFields.push(`${field} = ?`);
            params.push(updates[field]);
        }
    }

    if (updateFields.length === 0) {
        return errorResponse("No valid fields to update", 400);
    }

    updateFields.push("updated_at = datetime('now')");
    params.push(shop_id);

    await db.prepare(
        `UPDATE shops SET ${updateFields.join(", ")} WHERE shop_id = ?`
    ).bind(...params).run();

    return jsonResponse({ status: "success", message: "Shop updated" });
}

async function handleDelete(db: D1Database, url: URL): Promise<Response> {
    const shopId = url.searchParams.get("shop_id");

    if (!shopId) {
        return errorResponse("shop_id required", 400);
    }

    await db.prepare("DELETE FROM shops WHERE shop_id = ?").bind(parseInt(shopId)).run();
    return jsonResponse({ status: "success", message: "Shop deleted" });
}

function jsonResponse(data: any, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...getCorsHeaders(), "Content-Type": "application/json" }
    });
}

function errorResponse(message: string, status = 400): Response {
    return jsonResponse({ status: "error", message }, status);
}

function getCorsHeaders(): Record<string, string> {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
    };
}
