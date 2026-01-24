/**
 * Shopee API Callback Handler (D1永続化対応版)
 * 
 * このエンドポイントは以下の目的で使用されます：
 * 1. Shopeeサーバーからの疎通確認（Verification）
 * 2. OAuth認可コードの受け取り → Access Token取得
 * 3. トークンをD1データベースに永続保存
 * 4. プッシュ通知の受信
 */

interface Env {
    SHOPEE_PARTNER_ID: string;
    SHOPEE_PARTNER_KEY: string;
    DB: D1Database;
}

const SHOPEE_HOST = "https://partner.shopeemobile.com";

export const onRequest: PagesFunction<Env> = async (context) => {
    const { request, env } = context;
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

    // リクエスト情報をログ出力
    console.log("========== Shopee Callback Received ==========");
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Method: ${request.method}`);
    console.log(`Code: ${code || "N/A"}`);
    console.log(`Shop ID: ${shopId || "N/A"}`);
    console.log(`Main Account ID: ${mainAccountId || "N/A"}`);

    // 認可コードがある場合はAccess Tokenを取得
    if (code && shopId) {
        try {
            const tokenResult = await getAccessToken(
                env.SHOPEE_PARTNER_ID,
                env.SHOPEE_PARTNER_KEY,
                code,
                parseInt(shopId)
            );

            console.log("Token Result:", JSON.stringify(tokenResult, null, 2));

            // トークン取得成功時、D1に保存
            let d1Saved = false;
            let d1Error = null;

            if (!tokenResult.error && tokenResult.access_token) {
                try {
                    await saveTokenToD1(env.DB, {
                        shop_id: parseInt(shopId),
                        access_token: tokenResult.access_token,
                        refresh_token: tokenResult.refresh_token,
                        expire_in: tokenResult.expire_in,
                        shop_name: null
                    });
                    d1Saved = true;
                    console.log("Token saved to D1 successfully");
                } catch (e) {
                    d1Error = String(e);
                    console.error("D1 save error:", e);
                }
            }

            // 成功ページを返す（D1保存状態も表示）
            return new Response(generateSuccessHtml(tokenResult, shopId, d1Saved, d1Error), {
                status: 200,
                headers: {
                    "Content-Type": "text/html; charset=utf-8",
                    ...getCorsHeaders(),
                },
            });

        } catch (error) {
            console.error("Token取得エラー:", error);
            return new Response(generateErrorHtml(String(error)), {
                status: 500,
                headers: {
                    "Content-Type": "text/html; charset=utf-8",
                    ...getCorsHeaders(),
                },
            });
        }
    }

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

    // 通常のレスポンス
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
 * トークンをD1に保存
 */
async function saveTokenToD1(db: D1Database, data: {
    shop_id: number;
    access_token: string;
    refresh_token: string;
    expire_in: number;
    shop_name: string | null;
}): Promise<void> {
    // 有効期限を計算（秒単位で返ってくる）
    const accessExpires = new Date(Date.now() + (data.expire_in * 1000)).toISOString();
    const refreshExpires = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString(); // 30日

    await db.prepare(`
        INSERT INTO tokens (shop_id, access_token, refresh_token, access_token_expires_at, refresh_token_expires_at, shop_name, region)
        VALUES (?, ?, ?, ?, ?, ?, 'TW')
        ON CONFLICT(shop_id) DO UPDATE SET
            access_token = excluded.access_token,
            refresh_token = excluded.refresh_token,
            access_token_expires_at = excluded.access_token_expires_at,
            refresh_token_expires_at = excluded.refresh_token_expires_at,
            updated_at = datetime('now')
    `).bind(
        data.shop_id,
        data.access_token,
        data.refresh_token,
        accessExpires,
        refreshExpires,
        data.shop_name
    ).run();
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

    // 署名計算: partner_id + path + timestamp
    const baseString = `${partnerId}${path}${timestamp}`;
    const sign = await hmacSha256(partnerKey, baseString);

    const tokenUrl = `${SHOPEE_HOST}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`;

    const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            code: code,
            shop_id: shopId,
            partner_id: parseInt(partnerId),
        }),
    });

    const result = await response.json();
    return result;
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

/**
 * 成功時のHTMLを生成（D1保存状態も表示）
 */
function generateSuccessHtml(tokenResult: any, shopId: string, d1Saved: boolean, d1Error: string | null): string {
    const isSuccess = !tokenResult.error;

    return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Shopee 認証${isSuccess ? '成功' : '失敗'}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #fff;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
            padding: 20px;
        }
        .container {
            background: rgba(255,255,255,0.1);
            padding: 40px;
            border-radius: 16px;
            max-width: 600px;
            text-align: center;
            backdrop-filter: blur(10px);
        }
        .icon { font-size: 64px; margin-bottom: 20px; }
        h1 { color: ${isSuccess ? '#22c55e' : '#ef4444'}; margin: 0 0 20px; }
        .info { background: rgba(0,0,0,0.3); padding: 20px; border-radius: 8px; text-align: left; margin: 20px 0; }
        .label { color: #888; font-size: 12px; }
        .value { font-family: monospace; word-break: break-all; }
        pre { text-align: left; overflow: auto; background: #000; padding: 10px; border-radius: 8px; font-size: 12px; }
        .d1-status { 
            padding: 15px; 
            border-radius: 8px; 
            margin: 20px 0;
            text-align: center;
        }
        .d1-success { background: rgba(34, 197, 94, 0.2); border: 1px solid #22c55e; }
        .d1-error { background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; }
        .btn {
            display: inline-block;
            padding: 12px 24px;
            background: #6366f1;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            margin-top: 20px;
            font-weight: 600;
        }
        .btn:hover { background: #4f46e5; }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">${isSuccess ? '✅' : '❌'}</div>
        <h1>${isSuccess ? 'ショップ認証完了！' : '認証エラー'}</h1>
        <div class="info">
            <div class="label">Shop ID</div>
            <div class="value">${shopId}</div>
        </div>
        ${isSuccess ? `
        <div class="info">
            <div class="label">Access Token</div>
            <div class="value">${tokenResult.access_token || 'N/A'}</div>
        </div>
        <div class="info">
            <div class="label">Refresh Token</div>
            <div class="value">${tokenResult.refresh_token || 'N/A'}</div>
        </div>
        <div class="info">
            <div class="label">有効期限</div>
            <div class="value">${tokenResult.expire_in ? Math.floor(tokenResult.expire_in / 3600) + '時間' : 'N/A'}</div>
        </div>
        
        <!-- D1保存状態 -->
        <div class="d1-status ${d1Saved ? 'd1-success' : 'd1-error'}">
            ${d1Saved
                ? '💾 トークンはD1データベースに永続保存されました！'
                : `⚠️ D1保存エラー: ${d1Error || 'データベースに接続できませんでした。スキーマが適用されているか確認してください。'}`
            }
        </div>
        ` : ''}
        <details>
            <summary>詳細レスポンス</summary>
            <pre>${JSON.stringify(tokenResult, null, 2)}</pre>
        </details>
        <a href="/" class="btn">🏠 ダッシュボードへ</a>
    </div>
    
    ${isSuccess ? `
    <script>
        // localStorageにも保存（バックアップ）
        try {
            localStorage.setItem('shopee_auth', JSON.stringify({
                shopId: '${shopId}',
                accessToken: '${tokenResult.access_token || ''}',
                refreshToken: '${tokenResult.refresh_token || ''}',
                shopName: null,
                connectedAt: new Date().toISOString()
            }));
            console.log('Saved to localStorage as backup');
        } catch(e) {
            console.error('localStorage save error:', e);
        }
    </script>
    ` : ''}
</body>
</html>`;
}

/**
 * エラー時のHTMLを生成
 */
function generateErrorHtml(error: string): string {
    return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>エラー</title>
    <style>
        body { font-family: sans-serif; background: #1a1a2e; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
        .container { background: rgba(255,255,255,0.1); padding: 40px; border-radius: 16px; text-align: center; }
        h1 { color: #ef4444; }
    </style>
</head>
<body>
    <div class="container">
        <h1>❌ エラーが発生しました</h1>
        <p>${error}</p>
    </div>
</body>
</html>`;
}

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
