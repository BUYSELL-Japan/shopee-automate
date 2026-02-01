// 注文費用API（D1に保存/取得）
export interface Env {
    DB: D1Database;
}

interface OrderCost {
    order_id: string;
    order_sn?: string;
    commission_twd: number;
    yamato_shipping: number;
    sls_shipping: number;
    product_cost: number;
    other_cost: number;
    sales_twd: number;
    notes?: string;
}

// すべての注文費用を取得
async function getOrderCosts(env: Env, shop_id: number): Promise<Response> {
    try {
        const result = await env.DB.prepare(
            'SELECT * FROM order_costs WHERE shop_id = ? ORDER BY updated_at DESC'
        ).bind(shop_id).all();

        return Response.json({
            status: 'success',
            data: result.results || []
        });
    } catch (error) {
        return Response.json({
            status: 'error',
            message: error instanceof Error ? error.message : 'Failed to fetch order costs'
        }, { status: 500 });
    }
}

// 注文費用を保存（upsert）
async function saveOrderCost(env: Env, shop_id: number, orderCost: OrderCost): Promise<Response> {
    try {
        const result = await env.DB.prepare(`
            INSERT INTO order_costs (shop_id, order_id, order_sn, commission_twd, yamato_shipping, sls_shipping, product_cost, other_cost, sales_twd, notes, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(shop_id, order_id) DO UPDATE SET
                commission_twd = excluded.commission_twd,
                yamato_shipping = excluded.yamato_shipping,
                sls_shipping = excluded.sls_shipping,
                product_cost = excluded.product_cost,
                other_cost = excluded.other_cost,
                sales_twd = excluded.sales_twd,
                notes = excluded.notes,
                updated_at = datetime('now')
        `).bind(
            shop_id,
            orderCost.order_id,
            orderCost.order_sn || null,
            orderCost.commission_twd || 0,
            orderCost.yamato_shipping || 0,
            orderCost.sls_shipping || 0,
            orderCost.product_cost || 0,
            orderCost.other_cost || 0,
            orderCost.sales_twd || 0,
            orderCost.notes || null
        ).run();

        return Response.json({
            status: 'success',
            message: 'Order cost saved successfully'
        });
    } catch (error) {
        return Response.json({
            status: 'error',
            message: error instanceof Error ? error.message : 'Failed to save order cost'
        }, { status: 500 });
    }
}

// バッチ保存
async function saveOrderCostsBatch(env: Env, shop_id: number, orderCosts: OrderCost[]): Promise<Response> {
    try {
        const statements = orderCosts.map(oc =>
            env.DB.prepare(`
                INSERT INTO order_costs (shop_id, order_id, order_sn, commission_twd, yamato_shipping, sls_shipping, product_cost, other_cost, sales_twd, notes, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                ON CONFLICT(shop_id, order_id) DO UPDATE SET
                    commission_twd = excluded.commission_twd,
                    yamato_shipping = excluded.yamato_shipping,
                    sls_shipping = excluded.sls_shipping,
                    product_cost = excluded.product_cost,
                    other_cost = excluded.other_cost,
                    sales_twd = excluded.sales_twd,
                    notes = excluded.notes,
                    updated_at = datetime('now')
            `).bind(
                shop_id,
                oc.order_id,
                oc.order_sn || null,
                oc.commission_twd || 0,
                oc.yamato_shipping || 0,
                oc.sls_shipping || 0,
                oc.product_cost || 0,
                oc.other_cost || 0,
                oc.sales_twd || 0,
                oc.notes || null
            )
        );

        await env.DB.batch(statements);

        return Response.json({
            status: 'success',
            message: `${orderCosts.length} order costs saved successfully`
        });
    } catch (error) {
        return Response.json({
            status: 'error',
            message: error instanceof Error ? error.message : 'Failed to save order costs'
        }, { status: 500 });
    }
}

// 注文費用を削除
async function deleteOrderCost(env: Env, shop_id: number, order_id: string): Promise<Response> {
    try {
        await env.DB.prepare(
            'DELETE FROM order_costs WHERE shop_id = ? AND order_id = ?'
        ).bind(shop_id, order_id).run();

        return Response.json({
            status: 'success',
            message: 'Order cost deleted successfully'
        });
    } catch (error) {
        return Response.json({
            status: 'error',
            message: error instanceof Error ? error.message : 'Failed to delete order cost'
        }, { status: 500 });
    }
}

export const onRequest: PagesFunction<Env> = async (context) => {
    const { request, env } = context;
    const url = new URL(request.url);
    const method = request.method;

    // shop_id をクエリパラメータから取得
    const shop_id = parseInt(url.searchParams.get('shop_id') || '0');
    if (!shop_id) {
        return Response.json({
            status: 'error',
            message: 'shop_id is required'
        }, { status: 400 });
    }

    try {
        if (method === 'GET') {
            return await getOrderCosts(env, shop_id);
        }

        if (method === 'POST') {
            const body = await request.json() as { orderCost?: OrderCost; orderCosts?: OrderCost[] };

            // バッチ保存
            if (body.orderCosts && Array.isArray(body.orderCosts)) {
                return await saveOrderCostsBatch(env, shop_id, body.orderCosts);
            }

            // 単一保存
            if (body.orderCost) {
                return await saveOrderCost(env, shop_id, body.orderCost);
            }

            return Response.json({
                status: 'error',
                message: 'orderCost or orderCosts is required in request body'
            }, { status: 400 });
        }

        if (method === 'DELETE') {
            const order_id = url.searchParams.get('order_id');
            if (!order_id) {
                return Response.json({
                    status: 'error',
                    message: 'order_id is required'
                }, { status: 400 });
            }
            return await deleteOrderCost(env, shop_id, order_id);
        }

        return Response.json({
            status: 'error',
            message: 'Method not allowed'
        }, { status: 405 });

    } catch (error) {
        return Response.json({
            status: 'error',
            message: error instanceof Error ? error.message : 'Internal server error'
        }, { status: 500 });
    }
};
