/**
 * Shopee API Callback Handler
 * 
 * このエンドポイントは以下の目的で使用されます：
 * 1. Shopeeサーバーからの疎通確認（Verification）
 * 2. OAuth認可コードの受け取り
 * 3. プッシュ通知の受信
 */

interface Env {
    // 将来的な環境変数（例：SHOPEE_PARTNER_KEY）を追加
}

export const onRequest: PagesFunction<Env> = async (context) => {
    const { request } = context;
    const url = new URL(request.url);

    // CORSプリフライトリクエストへの対応
    if (request.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: getCorsHeaders(),
        });
    }

    // クエリパラメータを取得（OAuth認可コード用）
    const code = url.searchParams.get("code");
    const shopId = url.searchParams.get("shop_id");
    const mainAccountId = url.searchParams.get("main_account_id");

    // リクエスト情報をログ出力（デバッグ・将来の拡張用）
    console.log("========== Shopee Callback Received ==========");
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Method: ${request.method}`);
    console.log(`URL: ${request.url}`);
    console.log(`Code: ${code || "N/A"}`);
    console.log(`Shop ID: ${shopId || "N/A"}`);
    console.log(`Main Account ID: ${mainAccountId || "N/A"}`);

    // POSTリクエストの場合はボディも取得（プッシュ通知用）
    let requestBody = null;
    if (request.method === "POST") {
        try {
            requestBody = await request.json();
            console.log("Request Body:", JSON.stringify(requestBody, null, 2));
        } catch (e) {
            console.log("Request body is not JSON or empty");
        }
    }

    console.log("===============================================");

    // TODO: 将来的な拡張ポイント
    // 1. codeを使用してAccess Tokenを取得
    // 2. Access TokenをKV Storageに保存
    // 3. プッシュ通知の処理

    // レスポンスデータを構築
    const responseData = {
        status: "success",
        message: "Shopee callback received",
        timestamp: new Date().toISOString(),
        data: {
            code: code || null,
            shopId: shopId || null,
            mainAccountId: mainAccountId || null,
        },
    };

    return new Response(JSON.stringify(responseData), {
        status: 200,
        headers: {
            "Content-Type": "application/json",
            ...getCorsHeaders(),
        },
    });
};

/**
 * CORSヘッダーを取得
 */
function getCorsHeaders(): Record<string, string> {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
    };
}
