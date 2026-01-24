/**
 * Shopee API サービス
 * 
 * Shopee APIとの通信を管理するクライアント
 */

const API_BASE = '/api/shopee';

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
 * 商品一覧を取得
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

/**
 * 価格をフォーマット (TWD)
 */
export function formatPrice(price, currency = 'TWD') {
    if (currency === 'TWD') {
        return new Intl.NumberFormat('zh-TW', {
            style: 'currency',
            currency: 'TWD',
            minimumFractionDigits: 0
        }).format(price);
    }
    return new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: currency
    }).format(price);
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
