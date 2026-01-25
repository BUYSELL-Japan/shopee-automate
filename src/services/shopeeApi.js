/**
 * Shopee API サービス
 * 
 * Shopee APIとの通信を管理するクライアント
 */

const API_BASE = '/api/shopee';
const DB_API_BASE = '/api/db';

/**
 * ショップ情報を取得（接続テスト）
 */
export async function testConnection(accessToken, shopId) {
    const response = await fetch(
        `${API_BASE}/test-connection?access_token=${accessToken}&shop_id=${shopId}`
    );
    return await response.json();
}

/**
 * 認可URLを取得
 */
export async function getAuthUrl() {
    const response = await fetch(`${API_BASE}/auth`);
    return await response.json();
}

/**
 * 商品一覧を取得（Shopee API直接）
 */
export async function getProducts(accessToken, shopId, options = {}) {
    const { offset = 0, pageSize = 20 } = options;

    const params = new URLSearchParams({
        access_token: accessToken,
        shop_id: shopId,
        offset: offset.toString(),
        page_size: pageSize.toString()
    });

    const response = await fetch(`${API_BASE}/products?${params}`);
    return await response.json();
}

/**
 * 注文一覧を取得
 */
export async function getOrders(accessToken, shopId, options = {}) {
    const { orderStatus = 'ALL', pageSize = 20, cursor = '' } = options;

    const params = new URLSearchParams({
        access_token: accessToken,
        shop_id: shopId,
        order_status: orderStatus,
        page_size: pageSize.toString()
    });

    if (cursor) {
        params.append('cursor', cursor);
    }

    const response = await fetch(`${API_BASE}/orders?${params}`);
    return await response.json();
}

// =====================================================
// D1 Database API
// =====================================================

/**
 * D1から商品一覧を取得
 */
export async function getDbProducts(shopId, options = {}) {
    const { status = 'all', limit = 100, offset = 0 } = options;

    const params = new URLSearchParams({
        shop_id: shopId,
        status,
        limit: limit.toString(),
        offset: offset.toString()
    });

    const response = await fetch(`${DB_API_BASE}/products?${params}`);
    return await response.json();
}

/**
 * D1の商品を更新（価格調整など）
 */
export async function updateDbProduct(productData) {
    const response = await fetch(`${DB_API_BASE}/products`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
    });
    return await response.json();
}

/**
 * ShopeeデータをD1に同期
 */
export async function syncProductsToDb(accessToken, shopId) {
    const response = await fetch(
        `${DB_API_BASE}/sync?access_token=${accessToken}&shop_id=${shopId}`,
        { method: 'POST' }
    );
    return await response.json();
}

/**
 * 価格ルール一覧を取得
 */
export async function getPriceRules(shopId) {
    const response = await fetch(`${DB_API_BASE}/price-rules?shop_id=${shopId}`);
    return await response.json();
}

/**
 * 価格ルールを作成
 */
export async function createPriceRule(ruleData) {
    const response = await fetch(`${DB_API_BASE}/price-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleData)
    });
    return await response.json();
}

/**
 * 価格ルールを更新
 */
export async function updatePriceRule(ruleData) {
    const response = await fetch(`${DB_API_BASE}/price-rules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleData)
    });
    return await response.json();
}

/**
 * 価格ルールを削除
 */
export async function deletePriceRule(ruleId) {
    const response = await fetch(`${DB_API_BASE}/price-rules?id=${ruleId}`, {
        method: 'DELETE'
    });
    return await response.json();
}

/**
 * 価格をフォーマット (TWD → NT$)
 */
export function formatPrice(price, currency = 'TWD') {
    // 数値でない場合は0として処理
    const numPrice = parseFloat(price) || 0;

    if (currency === 'TWD') {
        // NT$表記で統一
        return `NT$${numPrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    return new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: currency
    }).format(numPrice);
}

/**
 * TWDから日本円への変換レート（固定レート使用、実際は為替APIで取得推奨）
 * 1 TWD ≈ 4.5 JPY (2024年レート目安)
 */
const TWD_TO_JPY_RATE = 4.5;

/**
 * NT$と日本円の両方を表示
 */
export function formatPriceWithJPY(price, currency = 'TWD') {
    const numPrice = parseFloat(price) || 0;

    if (currency === 'TWD') {
        const ntdStr = `NT$${numPrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
        const jpyValue = Math.round(numPrice * TWD_TO_JPY_RATE);
        const jpyStr = `¥${jpyValue.toLocaleString('ja-JP')}`;
        return { ntd: ntdStr, jpy: jpyStr, combined: `${ntdStr} (${jpyStr})` };
    }

    const formatted = new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: currency
    }).format(numPrice);
    return { ntd: formatted, jpy: formatted, combined: formatted };
}

/**
 * 日本円からNT$への変換
 */
export function jpyToTwd(jpyAmount) {
    return Math.round(jpyAmount / TWD_TO_JPY_RATE);
}

/**
 * NT$から日本円への変換
 */
export function twdToJpy(twdAmount) {
    return Math.round(twdAmount * TWD_TO_JPY_RATE);
}

/**
 * ステータスバッジを取得
 */
export function getStatusBadge(status) {
    const statusMap = {
        // 商品ステータス
        active: { label: '出品中', className: 'badge-success' },
        inactive: { label: '非公開', className: 'badge-warning' },
        banned: { label: '停止', className: 'badge-error' },
        deleted: { label: '削除済み', className: 'badge-error' },
        // 注文ステータス
        pending: { label: '保留中', className: 'badge-warning' },
        processing: { label: '処理中', className: 'badge-info' },
        shipped: { label: '発送済み', className: 'badge-info' },
        delivered: { label: '配達完了', className: 'badge-success' },
        cancelled: { label: 'キャンセル', className: 'badge-error' }
    };
    return statusMap[status] || { label: status, className: 'badge-info' };
}
