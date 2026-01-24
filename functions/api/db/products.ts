/**
 * D1 Database Products API
 * 商品データのCRUD操作とShopee同期
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
    const shopeeItemId = url.searchParams.get("shopee_item_id");
    const status = url.searchParams.get("status");
    const limit = parseInt(url.searchParams.get("limit") || "100");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    if (productId) {
        // 単一商品取得
        const result = await db.prepare(
            "SELECT * FROM products WHERE id = ?"
        ).bind(productId).first();

        if (!result) {
            return errorResponse("Product not found", 404);
        }

        return jsonResponse({ status: "success", data: result });
    }

    if (shopeeItemId) {
        // Shopee Item IDで検索
        const result = await db.prepare(
            "SELECT * FROM products WHERE shopee_item_id = ?"
        ).bind(shopeeItemId).first();

        return jsonResponse({ status: "success", data: result || null });
    }

    // 商品一覧取得
    let query = "SELECT * FROM products WHERE 1=1";
    const params: any[] = [];

    if (shopId) {
        query += " AND shop_id = ?";
        params.push(shopId);
    }

    if (status && status !== "all") {
        query += " AND status = ?";
        params.push(status);
    }

    query += " ORDER BY updated_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const results = await db.prepare(query).bind(...params).all();

    // 総数を取得
    let countQuery = "SELECT COUNT(*) as total FROM products WHERE 1=1";
    const countParams: any[] = [];
    if (shopId) {
        countQuery += " AND shop_id = ?";
        countParams.push(shopId);
    }
    if (status && status !== "all") {
        countQuery += " AND status = ?";
        countParams.push(status);
    }
    const countResult = await db.prepare(countQuery).bind(...countParams).first<{ total: number }>();

    return jsonResponse({
        status: "success",
        data: {
            products: results.results,
            total: countResult?.total || 0,
            limit,
            offset
        }
    });
}

/**
 * POST: 商品を追加または一括同期
 */
async function handlePost(db: D1Database, request: Request): Promise<Response> {
    const body = await request.json() as any;

    // 一括同期モード
    if (body.action === "sync" && body.products) {
        return await syncProducts(db, body.shop_id, body.products);
    }

    // 単一商品追加
    const product = body;

    const result = await db.prepare(`
        INSERT INTO products (
            shopee_item_id, shop_id, name, description, category_id,
            image_url, images, original_price, current_price, currency,
            stock, status, shopee_status, sold, views, likes, rating_star,
            shopee_create_time, shopee_update_time, last_synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(shopee_item_id) DO UPDATE SET
            name = excluded.name,
            description = excluded.description,
            original_price = excluded.original_price,
            current_price = excluded.current_price,
            stock = excluded.stock,
            status = excluded.status,
            shopee_status = excluded.shopee_status,
            sold = excluded.sold,
            views = excluded.views,
            likes = excluded.likes,
            rating_star = excluded.rating_star,
            shopee_update_time = excluded.shopee_update_time,
            last_synced_at = datetime('now'),
            updated_at = datetime('now')
    `).bind(
        product.shopee_item_id,
        product.shop_id,
        product.name,
        product.description || null,
        product.category_id || null,
        product.image_url || null,
        JSON.stringify(product.images || []),
        product.original_price || 0,
        product.current_price || 0,
        product.currency || "TWD",
        product.stock || 0,
        product.status || "active",
        product.shopee_status || null,
        product.sold || 0,
        product.views || 0,
        product.likes || 0,
        product.rating_star || 0,
        product.shopee_create_time || null,
        product.shopee_update_time || null
    ).run();

    return jsonResponse({
        status: "success",
        message: "Product saved",
        data: { changes: result.meta.changes }
    });
}

/**
 * 商品一括同期
 */
async function syncProducts(db: D1Database, shopId: string, products: any[]): Promise<Response> {
    let synced = 0;
    let failed = 0;

    for (const product of products) {
        try {
            await db.prepare(`
                INSERT INTO products (
                    shopee_item_id, shop_id, name, description, category_id,
                    image_url, images, original_price, current_price, currency,
                    stock, status, shopee_status, sold, views, likes, rating_star,
                    shopee_create_time, shopee_update_time, last_synced_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                ON CONFLICT(shopee_item_id) DO UPDATE SET
                    name = excluded.name,
                    original_price = excluded.original_price,
                    current_price = excluded.current_price,
                    stock = excluded.stock,
                    status = excluded.status,
                    sold = excluded.sold,
                    rating_star = excluded.rating_star,
                    last_synced_at = datetime('now'),
                    updated_at = datetime('now')
            `).bind(
                String(product.id),
                shopId,
                product.name,
                product.description || null,
                product.category_id || null,
                product.image || null,
                JSON.stringify(product.images || []),
                product.originalPrice || product.price || 0,
                product.price || 0,
                product.currency || "TWD",
                product.stock || 0,
                product.status || "active",
                product.shopee_status || null,
                product.sold || 0,
                product.views || 0,
                product.likes || 0,
                product.rating_star || 0,
                product.create_time || null,
                product.update_time || null
            ).run();
            synced++;
        } catch (e) {
            console.error("Sync error for product:", product.id, e);
            failed++;
        }
    }

    // 同期ログを記録
    await db.prepare(`
        INSERT INTO sync_logs (shop_id, sync_type, status, items_synced, items_failed, completed_at)
        VALUES (?, 'products', ?, ?, ?, datetime('now'))
    `).bind(shopId, failed > 0 ? "partial" : "success", synced, failed).run();

    return jsonResponse({
        status: "success",
        message: `Synced ${synced} products, ${failed} failed`,
        data: { synced, failed }
    });
}

/**
 * PUT: 商品を更新（価格調整など）
 */
async function handlePut(db: D1Database, request: Request): Promise<Response> {
    const body = await request.json() as any;
    const { id, shopee_item_id, ...updates } = body;

    if (!id && !shopee_item_id) {
        return errorResponse("id or shopee_item_id required", 400);
    }

    // 現在の価格を取得（履歴用）
    const current = await db.prepare(
        "SELECT id, current_price FROM products WHERE " + (id ? "id = ?" : "shopee_item_id = ?")
    ).bind(id || shopee_item_id).first<{ id: number, current_price: number }>();

    // 更新クエリを構築
    const updateFields: string[] = [];
    const params: any[] = [];

    if (updates.adjusted_price !== undefined) {
        updateFields.push("adjusted_price = ?");
        params.push(updates.adjusted_price);
    }
    if (updates.price_rule_id !== undefined) {
        updateFields.push("price_rule_id = ?");
        params.push(updates.price_rule_id);
    }
    if (updates.auto_adjust_enabled !== undefined) {
        updateFields.push("auto_adjust_enabled = ?");
        params.push(updates.auto_adjust_enabled ? 1 : 0);
    }
    if (updates.min_price !== undefined) {
        updateFields.push("min_price = ?");
        params.push(updates.min_price);
    }
    if (updates.max_price !== undefined) {
        updateFields.push("max_price = ?");
        params.push(updates.max_price);
    }
    if (updates.status !== undefined) {
        updateFields.push("status = ?");
        params.push(updates.status);
    }

    updateFields.push("updated_at = datetime('now')");

    if (updateFields.length === 1) {
        return errorResponse("No valid fields to update", 400);
    }

    const query = `UPDATE products SET ${updateFields.join(", ")} WHERE ` + (id ? "id = ?" : "shopee_item_id = ?");
    params.push(id || shopee_item_id);

    await db.prepare(query).bind(...params).run();

    // 価格変更履歴を記録
    if (updates.adjusted_price !== undefined && current) {
        await db.prepare(`
            INSERT INTO price_history (product_id, shopee_item_id, old_price, new_price, change_reason, price_rule_id)
            VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
            current.id,
            shopee_item_id || String(id),
            current.current_price,
            updates.adjusted_price,
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
    const shopeeItemId = url.searchParams.get("shopee_item_id");

    if (!id && !shopeeItemId) {
        return errorResponse("id or shopee_item_id required", 400);
    }

    await db.prepare(
        "DELETE FROM products WHERE " + (id ? "id = ?" : "shopee_item_id = ?")
    ).bind(id || shopeeItemId).run();

    return jsonResponse({ status: "success", message: "Product deleted" });
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
