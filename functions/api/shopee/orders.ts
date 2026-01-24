/**
 * Shopee 注文一覧取得エンドポイント
 * 
 * /api/v2/order/get_order_list を使用して注文一覧を取得
 * /api/v2/order/get_order_detail で詳細情報を取得
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
    const orderStatus = url.searchParams.get("order_status") || "READY_TO_SHIP";
    const pageSize = parseInt(url.searchParams.get("page_size") || "20");
    const cursor = url.searchParams.get("cursor") || "";

    if (!accessToken || !shopId) {
        return new Response(JSON.stringify({
            status: "error",
            message: "access_token と shop_id パラメータが必要です"
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

        // 過去15日間の注文を取得（Shopee APIは最大15日間の制限）
        const timeFrom = Math.floor(Date.now() / 1000) - (15 * 24 * 60 * 60);
        const timeTo = Math.floor(Date.now() / 1000);

        // 注文一覧を取得
        const orderList = await getOrderList(
            partnerId,
            partnerKey,
            accessToken,
            parseInt(shopId),
            timeFrom,
            timeTo,
            orderStatus,
            pageSize,
            cursor
        );

        if (orderList.error) {
            return new Response(JSON.stringify({
                status: "error",
                message: orderList.message || orderList.error,
                data: orderList
            }), {
                status: 400,
                headers: { "Content-Type": "application/json", ...getCorsHeaders() },
            });
        }

        // 注文詳細情報を取得
        let orders = [];
        if (orderList.response?.order_list && orderList.response.order_list.length > 0) {
            const orderSns = orderList.response.order_list.map((order: any) => order.order_sn);
            const orderDetails = await getOrderDetail(
                partnerId,
                partnerKey,
                accessToken,
                parseInt(shopId),
                orderSns
            );

            if (orderDetails.response?.order_list) {
                orders = orderDetails.response.order_list.map((order: any) => ({
                    id: order.order_sn,
                    customer: order.buyer_username || "匿名ユーザー",
                    buyer_user_id: order.buyer_user_id,
                    items: order.item_list?.length || 0,
                    item_list: order.item_list?.map((item: any) => ({
                        name: item.item_name,
                        sku: item.item_sku,
                        quantity: item.model_quantity_purchased,
                        price: item.model_discounted_price || item.model_original_price,
                        image: item.image_info?.image_url
                    })) || [],
                    total: order.total_amount,
                    currency: order.currency,
                    status: mapOrderStatus(order.order_status),
                    order_status: order.order_status,
                    date: formatTimestamp(order.create_time),
                    create_time: order.create_time,
                    update_time: order.update_time,
                    shipping: {
                        carrier: order.shipping_carrier,
                        tracking_number: order.tracking_number,
                        recipient_address: order.recipient_address
                    },
                    payment_method: order.payment_method,
                    note: order.note || "",
                    message_to_seller: order.message_to_seller || ""
                }));
            }
        }

        return new Response(JSON.stringify({
            status: "success",
            message: "注文一覧を取得しました",
            data: {
                orders: orders,
                more: orderList.response?.more || false,
                next_cursor: orderList.response?.next_cursor || null,
            }
        }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...getCorsHeaders() },
        });

    } catch (error) {
        return new Response(JSON.stringify({
            status: "error",
            message: `エラー: ${error}`,
        }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...getCorsHeaders() },
        });
    }
};

/**
 * 注文一覧を取得
 */
async function getOrderList(
    partnerId: string,
    partnerKey: string,
    accessToken: string,
    shopId: number,
    timeFrom: number,
    timeTo: number,
    orderStatus: string,
    pageSize: number,
    cursor: string
): Promise<any> {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = "/api/v2/order/get_order_list";

    const baseString = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;
    const sign = await hmacSha256(partnerKey, baseString);

    let apiUrl = `${SHOPEE_HOST}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&access_token=${accessToken}&shop_id=${shopId}&time_range_field=create_time&time_from=${timeFrom}&time_to=${timeTo}&page_size=${pageSize}`;

    if (orderStatus && orderStatus !== "ALL") {
        apiUrl += `&order_status=${orderStatus}`;
    }
    if (cursor) {
        apiUrl += `&cursor=${cursor}`;
    }

    const response = await fetch(apiUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });

    return await response.json();
}

/**
 * 注文詳細を取得
 */
async function getOrderDetail(
    partnerId: string,
    partnerKey: string,
    accessToken: string,
    shopId: number,
    orderSns: string[]
): Promise<any> {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = "/api/v2/order/get_order_detail";

    const baseString = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;
    const sign = await hmacSha256(partnerKey, baseString);

    const orderSnList = orderSns.join(",");
    const apiUrl = `${SHOPEE_HOST}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&access_token=${accessToken}&shop_id=${shopId}&order_sn_list=${orderSnList}&response_optional_fields=buyer_username,item_list,recipient_address,note,message_to_seller`;

    const response = await fetch(apiUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });

    return await response.json();
}

/**
 * Shopee注文ステータスをアプリ内ステータスにマッピング
 */
function mapOrderStatus(status: string): string {
    const statusMap: Record<string, string> = {
        "UNPAID": "pending",
        "READY_TO_SHIP": "processing",
        "PROCESSED": "processing",
        "SHIPPED": "shipped",
        "COMPLETED": "delivered",
        "IN_CANCEL": "cancelled",
        "CANCELLED": "cancelled",
        "INVOICE_PENDING": "pending"
    };
    return statusMap[status] || "pending";
}

/**
 * タイムスタンプをフォーマット
 */
function formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    }).replace(/\//g, "-");
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
