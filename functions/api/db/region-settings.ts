/**
 * D1 Database Region Settings API
 * 国別送料・手数料設定用API
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
            case "PUT":
                return await handlePut(env.DB, request);
            default:
                return errorResponse("Method not allowed", 405);
        }
    } catch (error) {
        console.error("Database error:", error);
        return errorResponse(`Database error: ${error}`, 500);
    }
};

async function handleGet(db: D1Database, url: URL): Promise<Response> {
    const region = url.searchParams.get("region");

    if (region) {
        const result = await db.prepare(
            "SELECT * FROM region_settings WHERE region = ?"
        ).bind(region).first();

        if (!result) {
            return errorResponse("Region not found", 404);
        }
        return jsonResponse({ status: "success", data: result });
    }

    // 全リージョン取得
    const results = await db.prepare(
        "SELECT * FROM region_settings ORDER BY region"
    ).all();

    return jsonResponse({ status: "success", data: results.results });
}

async function handlePut(db: D1Database, request: Request): Promise<Response> {
    const body = await request.json() as any;
    const { region, ...updates } = body;

    if (!region) {
        return errorResponse("region required", 400);
    }

    const updateFields: string[] = [];
    const params: any[] = [];

    const fields = [
        'currency', 'currency_symbol', 'exchange_rate',
        'commission_rate', 'service_fee_rate', 'transaction_fee_rate',
        'shipping_cost_local', 'shipping_cost_intl_jpy'
    ];

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
    params.push(region);

    await db.prepare(
        `UPDATE region_settings SET ${updateFields.join(", ")} WHERE region = ?`
    ).bind(...params).run();

    return jsonResponse({ status: "success", message: "Settings updated" });
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
        "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
    };
}
