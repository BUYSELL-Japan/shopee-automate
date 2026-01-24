/**
 * D1 Database Price Rules API
 * 価格調整ルールのCRUD操作
 */

interface Env {
    DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
    const { env, request } = context;
    const url = new URL(request.url);

    // CORSプリフライト
    if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: getCorsHeaders() });
    }

    const shopId = url.searchParams.get("shop_id");

    try {
        switch (request.method) {
            case "GET":
                return await handleGet(env.DB, shopId, url);
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

/**
 * GET: 価格ルール一覧または単一ルールを取得
 */
async function handleGet(db: D1Database, shopId: string | null, url: URL): Promise<Response> {
    const ruleId = url.searchParams.get("id");

    if (ruleId) {
        const result = await db.prepare(
            "SELECT * FROM price_rules WHERE id = ?"
        ).bind(ruleId).first();

        if (!result) {
            return errorResponse("Rule not found", 404);
        }

        return jsonResponse({ status: "success", data: result });
    }

    // ルール一覧取得
    let query = "SELECT * FROM price_rules";
    const params: any[] = [];

    if (shopId) {
        query += " WHERE shop_id = ?";
        params.push(shopId);
    }

    query += " ORDER BY priority DESC, created_at DESC";

    const results = await db.prepare(query).bind(...params).all();

    return jsonResponse({
        status: "success",
        data: results.results
    });
}

/**
 * POST: 価格ルールを追加
 */
async function handlePost(db: D1Database, request: Request): Promise<Response> {
    const rule = await request.json() as any;

    if (!rule.shop_id || !rule.name || !rule.rule_type) {
        return errorResponse("shop_id, name, and rule_type are required", 400);
    }

    const result = await db.prepare(`
        INSERT INTO price_rules (
            shop_id, name, description, rule_type,
            adjustment_value, adjustment_direction,
            min_price, max_price, min_margin_percent,
            apply_to_category, apply_to_tags,
            is_active, priority
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
        rule.shop_id,
        rule.name,
        rule.description || null,
        rule.rule_type,
        rule.adjustment_value || null,
        rule.adjustment_direction || "decrease",
        rule.min_price || null,
        rule.max_price || null,
        rule.min_margin_percent || null,
        rule.apply_to_category || null,
        rule.apply_to_tags ? JSON.stringify(rule.apply_to_tags) : null,
        rule.is_active !== false ? 1 : 0,
        rule.priority || 0
    ).run();

    return jsonResponse({
        status: "success",
        message: "Price rule created",
        data: { id: result.meta.last_row_id }
    });
}

/**
 * PUT: 価格ルールを更新
 */
async function handlePut(db: D1Database, request: Request): Promise<Response> {
    const { id, ...updates } = await request.json() as any;

    if (!id) {
        return errorResponse("id is required", 400);
    }

    const updateFields: string[] = [];
    const params: any[] = [];

    const allowedFields = [
        "name", "description", "rule_type", "adjustment_value",
        "adjustment_direction", "min_price", "max_price",
        "min_margin_percent", "apply_to_category", "is_active", "priority"
    ];

    for (const field of allowedFields) {
        if (updates[field] !== undefined) {
            updateFields.push(`${field} = ?`);
            if (field === "is_active") {
                params.push(updates[field] ? 1 : 0);
            } else {
                params.push(updates[field]);
            }
        }
    }

    if (updates.apply_to_tags !== undefined) {
        updateFields.push("apply_to_tags = ?");
        params.push(JSON.stringify(updates.apply_to_tags));
    }

    updateFields.push("updated_at = datetime('now')");
    params.push(id);

    await db.prepare(
        `UPDATE price_rules SET ${updateFields.join(", ")} WHERE id = ?`
    ).bind(...params).run();

    return jsonResponse({ status: "success", message: "Price rule updated" });
}

/**
 * DELETE: 価格ルールを削除
 */
async function handleDelete(db: D1Database, url: URL): Promise<Response> {
    const id = url.searchParams.get("id");

    if (!id) {
        return errorResponse("id is required", 400);
    }

    // 関連する商品のprice_rule_idをnullに
    await db.prepare(
        "UPDATE products SET price_rule_id = NULL WHERE price_rule_id = ?"
    ).bind(id).run();

    await db.prepare("DELETE FROM price_rules WHERE id = ?").bind(id).run();

    return jsonResponse({ status: "success", message: "Price rule deleted" });
}

// ヘルパー関数
function jsonResponse(data: any, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json", ...getCorsHeaders() }
    });
}

function errorResponse(message: string, status: number): Response {
    return jsonResponse({ status: "error", message }, status);
}

function getCorsHeaders(): Record<string, string> {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
    };
}
