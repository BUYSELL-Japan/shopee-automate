/**
 * D1 Database Products API (Shopee API統一版)
 * 商品データのCRUD操作 - Shopee APIパラメータと完全統一
 */

interface Env {
    DB: D1Database;
    SHOPEE_PARTNER_ID: string;
    SHOPEE_PARTNER_KEY: string;
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
 * GET: 商品一覧または単一商品を取得
 */
async function handleGet(db: D1Database, shopId: string | null, url: URL): Promise<Response> {
    const productId = url.searchParams.get("id");
    const itemId = url.searchParams.get("item_id");
    const status = url.searchParams.get("item_status") || url.searchParams.get("status");
    const limit = parseInt(url.searchParams.get("limit") || "100");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    if (productId) {
        const result = await db.prepare("SELECT * FROM products WHERE id = ?").bind(productId).first();
        if (!result) return errorResponse("Product not found", 404);
        return jsonResponse({ status: "success", data: parseProduct(result) });
    }

    if (itemId) {
        const result = await db.prepare("SELECT * FROM products WHERE item_id = ?").bind(itemId).first();
        return jsonResponse({ status: "success", data: result ? parseProduct(result) : null });
    }

    // 商品一覧取得
    let query = "SELECT * FROM products WHERE 1=1";
    const params: any[] = [];

    if (shopId) {
        query += " AND shop_id = ?";
        params.push(parseInt(shopId));
    }

    if (status && status !== "all") {
        query += " AND item_status = ?";
        params.push(status.toUpperCase());
    }

    query += " ORDER BY update_time DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const results = await db.prepare(query).bind(...params).all();

    // 総数を取得
    let countQuery = "SELECT COUNT(*) as total FROM products WHERE 1=1";
    const countParams: any[] = [];
    if (shopId) {
        countQuery += " AND shop_id = ?";
        countParams.push(parseInt(shopId));
    }
    if (status && status !== "all") {
        countQuery += " AND item_status = ?";
        countParams.push(status.toUpperCase());
    }
    const countResult = await db.prepare(countQuery).bind(...countParams).first<{ total: number }>();

    // JSONフィールドをパース
    const products = results.results.map(parseProduct);

    return jsonResponse({
        status: "success",
        data: {
            products,
            total: countResult?.total || 0,
            limit,
            offset
        }
    });
}

/**
 * POST: 商品を追加（Shopee add_item互換）
 */
async function handlePost(db: D1Database, request: Request): Promise<Response> {
    const product = await request.json() as any;

    // Shopee add_item APIと同じパラメータ名を使用
    const result = await db.prepare(`
        INSERT INTO products (
            item_id, shop_id, item_name, description, description_type, item_sku,
            category_id, original_price, current_price, currency, stock,
            image_url, image_url_list, image_id_list, weight,
            package_length, package_width, package_height,
            condition, item_status, attribute_list, logistic_info,
            has_model, model_list, pre_order_days_to_ship, brand_id,
            wholesale_list, video_info, custom_price, cost_price, source_url, notes, tags
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
        product.item_id || null,
        product.shop_id,
        product.item_name,
        product.description || null,
        product.description_type || 'normal',
        product.item_sku || null,
        product.category_id || null,
        product.original_price || null,
        product.current_price || product.original_price || null,
        product.currency || 'TWD',
        product.stock || 0,
        Array.isArray(product.image_url_list) ? product.image_url_list[0] : (product.image_url || null),
        JSON.stringify(product.image_url_list || product.image?.image_url_list || []),
        JSON.stringify(product.image_id_list || product.image?.image_id_list || []),
        product.weight || null,
        product.dimension?.package_length || product.package_length || null,
        product.dimension?.package_width || product.package_width || null,
        product.dimension?.package_height || product.package_height || null,
        product.condition || 'NEW',
        product.item_status || 'NORMAL',
        JSON.stringify(product.attribute_list || []),
        JSON.stringify(product.logistic_info || []),
        product.has_model ? 1 : 0,
        JSON.stringify(product.model_list || []),
        product.pre_order?.days_to_ship || product.pre_order_days_to_ship || null,
        product.brand?.brand_id || product.brand_id || null,
        JSON.stringify(product.wholesale || []),
        JSON.stringify(product.video_info || null),
        product.custom_price || null,
        product.cost_price || null,
        product.source_url || null,
        product.notes || null,
        JSON.stringify(product.tags || [])
    ).run();

    return jsonResponse({
        status: "success",
        message: "Product created",
        data: { id: result.meta.last_row_id }
    });
}

/**
 * PUT: 商品を更新（Shopee update_item互換）
 */
async function handlePut(db: D1Database, request: Request): Promise<Response> {
    const body = await request.json() as any;
    const { id, item_id, ...updates } = body;

    if (!id && !item_id) {
        return errorResponse("id or item_id required", 400);
    }

    // 現在の価格を取得（履歴用）
    const current = await db.prepare(
        "SELECT id, item_id, current_price FROM products WHERE " + (id ? "id = ?" : "item_id = ?")
    ).bind(id || item_id).first<{ id: number, item_id: number, current_price: number }>();

    // 更新可能フィールド（Shopee API互換）
    const updateFields: string[] = [];
    const params: any[] = [];

    const fieldMapping: Record<string, string> = {
        item_name: 'item_name',
        description: 'description',
        description_type: 'description_type',
        item_sku: 'item_sku',
        category_id: 'category_id',
        original_price: 'original_price',
        current_price: 'current_price',
        stock: 'stock',
        weight: 'weight',
        package_length: 'package_length',
        package_width: 'package_width',
        package_height: 'package_height',
        condition: 'condition',
        item_status: 'item_status',
        custom_price: 'custom_price',
        cost_price: 'cost_price',
        source_url: 'source_url',
        notes: 'notes',
        price_rule_id: 'price_rule_id',
        auto_adjust_enabled: 'auto_adjust_enabled',
        min_price: 'min_price',
        max_price: 'max_price'
    };

    for (const [key, dbField] of Object.entries(fieldMapping)) {
        if (updates[key] !== undefined) {
            updateFields.push(`${dbField} = ?`);
            params.push(updates[key]);
        }
    }

    // JSON フィールド
    if (updates.attribute_list !== undefined) {
        updateFields.push("attribute_list = ?");
        params.push(JSON.stringify(updates.attribute_list));
    }
    if (updates.logistic_info !== undefined) {
        updateFields.push("logistic_info = ?");
        params.push(JSON.stringify(updates.logistic_info));
    }
    if (updates.image_url_list !== undefined) {
        updateFields.push("image_url_list = ?");
        params.push(JSON.stringify(updates.image_url_list));
        if (updates.image_url_list.length > 0) {
            updateFields.push("image_url = ?");
            params.push(updates.image_url_list[0]);
        }
    }
    if (updates.tags !== undefined) {
        updateFields.push("tags = ?");
        params.push(JSON.stringify(updates.tags));
    }

    updateFields.push("updated_at = datetime('now')");
    params.push(id || item_id);

    if (updateFields.length === 1) {
        return errorResponse("No valid fields to update", 400);
    }

    await db.prepare(
        `UPDATE products SET ${updateFields.join(", ")} WHERE ` + (id ? "id = ?" : "item_id = ?")
    ).bind(...params).run();

    // 価格変更履歴を記録
    if ((updates.current_price !== undefined || updates.custom_price !== undefined) && current) {
        const newPrice = updates.custom_price || updates.current_price;
        await db.prepare(`
            INSERT INTO price_history (product_id, item_id, old_price, new_price, change_reason, price_rule_id)
            VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
            current.id,
            current.item_id,
            current.current_price,
            newPrice,
            updates.change_reason || "manual",
            updates.price_rule_id || null
        ).run();
    }

    return jsonResponse({ status: "success", message: "Product updated" });
}

/**
 * DELETE: 商品を削除
 */
async function handleDelete(db: D1Database, url: URL): Promise<Response> {
    const id = url.searchParams.get("id");
    const itemId = url.searchParams.get("item_id");

    if (!id && !itemId) {
        return errorResponse("id or item_id required", 400);
    }

    await db.prepare(
        "DELETE FROM products WHERE " + (id ? "id = ?" : "item_id = ?")
    ).bind(id || itemId).run();

    return jsonResponse({ status: "success", message: "Product deleted" });
}

/**
 * JSONフィールドをパースして返す
 */
function parseProduct(row: any): any {
    return {
        ...row,
        image_url_list: safeJsonParse(row.image_url_list, []),
        image_id_list: safeJsonParse(row.image_id_list, []),
        attribute_list: safeJsonParse(row.attribute_list, []),
        logistic_info: safeJsonParse(row.logistic_info, []),
        model_list: safeJsonParse(row.model_list, []),
        wholesale_list: safeJsonParse(row.wholesale_list, []),
        video_info: safeJsonParse(row.video_info, null),
        tags: safeJsonParse(row.tags, []),
        has_model: !!row.has_model,
        auto_adjust_enabled: !!row.auto_adjust_enabled
    };
}

function safeJsonParse(str: string | null, defaultValue: any): any {
    if (!str) return defaultValue;
    try {
        return JSON.parse(str);
    } catch {
        return defaultValue;
    }
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
