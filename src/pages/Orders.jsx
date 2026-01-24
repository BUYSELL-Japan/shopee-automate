import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useShopeeAuth } from '../hooks/useShopeeAuth'
import { getOrders, formatPrice, getStatusBadge } from '../services/shopeeApi'

function Orders() {
    const [activeTab, setActiveTab] = useState('all')
    const [orders, setOrders] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)
    const [selectedOrder, setSelectedOrder] = useState(null) // 詳細モーダル用

    const { accessToken, shopId, isConnected } = useShopeeAuth()

    // 注文一覧を取得
    const fetchOrders = async (orderStatus = 'ALL') => {
        if (!isConnected || !accessToken || !shopId) return

        setIsLoading(true)
        setError(null)

        try {
            const result = await getOrders(accessToken, shopId, {
                orderStatus: orderStatus === 'all' ? 'ALL' : orderStatus.toUpperCase(),
                pageSize: 50
            })

            if (result.status === 'success') {
                setOrders(result.data.orders || [])
            } else {
                setError(result.message || '注文の取得に失敗しました')
            }
        } catch (e) {
            setError(e.message || 'エラーが発生しました')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (isConnected) {
            fetchOrders()
        }
    }, [isConnected, accessToken, shopId])

    // タブに応じてフィルタリング
    const filteredOrders = orders.filter((order) => {
        if (activeTab === 'all') return true
        return order.status === activeTab
    })

    const tabs = [
        { id: 'all', label: 'すべて', count: orders.length },
        { id: 'pending', label: '保留中', count: orders.filter(o => o.status === 'pending').length },
        { id: 'processing', label: '処理中', count: orders.filter(o => o.status === 'processing').length },
        { id: 'shipped', label: '発送済み', count: orders.filter(o => o.status === 'shipped').length },
        { id: 'delivered', label: '配達完了', count: orders.filter(o => o.status === 'delivered').length },
    ]

    // 未接続時のUI
    if (!isConnected) {
        return (
            <div className="page-container animate-fade-in">
                <header className="page-header">
                    <div>
                        <h1 className="page-title">注文管理</h1>
                        <p className="page-subtitle">Shopee APIに接続してください</p>
                    </div>
                </header>
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-icon">🔗</div>
                        <div className="empty-title">API未接続</div>
                        <p>注文を表示するには、まず設定ページでShopee APIに接続してください。</p>
                        <Link to="/settings" className="btn btn-primary" style={{ marginTop: 'var(--spacing-lg)' }}>
                            ⚙️ 設定へ移動
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="page-container animate-fade-in">
            <header className="page-header">
                <div>
                    <h1 className="page-title">注文管理</h1>
                    <p className="page-subtitle">
                        {isLoading ? '読み込み中...' : `${orders.length}件の注文`}
                    </p>
                </div>
                <button
                    className="btn btn-secondary"
                    onClick={() => fetchOrders()}
                    disabled={isLoading}
                >
                    🔄 データを更新
                </button>
            </header>

            {/* Tabs */}
            <div className="tabs">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                        <span style={{
                            marginLeft: 'var(--spacing-sm)',
                            padding: '2px 8px',
                            background: activeTab === tab.id
                                ? 'rgba(238, 77, 45, 0.2)'
                                : 'var(--color-bg-glass)',
                            borderRadius: 'var(--radius-full)',
                            fontSize: 'var(--font-size-xs)'
                        }}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-icon" style={{ animation: 'spin 1s linear infinite' }}>🔄</div>
                        <div className="empty-title">読み込み中...</div>
                    </div>
                </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
                <div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                    <div className="empty-state">
                        <div className="empty-icon">❌</div>
                        <div className="empty-title">エラーが発生しました</div>
                        <p style={{ color: 'var(--color-error)' }}>{error}</p>
                        <button
                            className="btn btn-primary"
                            style={{ marginTop: 'var(--spacing-lg)' }}
                            onClick={() => fetchOrders()}
                        >
                            🔄 再試行
                        </button>
                    </div>
                </div>
            )}

            {/* Orders List - カード形式で商品も表示 */}
            {!isLoading && !error && (
                <>
                    {filteredOrders.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                            {filteredOrders.map((order) => {
                                const status = getStatusBadge(order.status)
                                return (
                                    <div key={order.id} className="card" style={{ padding: 'var(--spacing-lg)' }}>
                                        {/* 注文ヘッダー */}
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginBottom: 'var(--spacing-md)',
                                            paddingBottom: 'var(--spacing-md)',
                                            borderBottom: '1px solid var(--color-border)'
                                        }}>
                                            <div>
                                                <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>
                                                    📦 注文 #{order.id}
                                                </div>
                                                <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                                                    👤 {order.customer} ・ 📅 {order.date}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                                                <span className={`badge ${status.className}`}>{status.label}</span>
                                                <div style={{ fontWeight: 700, fontSize: 'var(--font-size-xl)', color: 'var(--color-accent-light)' }}>
                                                    {formatPrice(order.total, order.currency)}
                                                </div>
                                            </div>
                                        </div>

                                        {/* 商品リスト */}
                                        <div style={{ marginBottom: 'var(--spacing-md)' }}>
                                            <div style={{
                                                fontWeight: 600,
                                                marginBottom: 'var(--spacing-sm)',
                                                color: 'var(--color-text-secondary)',
                                                fontSize: 'var(--font-size-sm)'
                                            }}>
                                                🛒 注文商品 ({order.items}点)
                                            </div>
                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                                gap: 'var(--spacing-sm)'
                                            }}>
                                                {order.item_list && order.item_list.length > 0 ? (
                                                    order.item_list.map((item, idx) => (
                                                        <div
                                                            key={idx}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 'var(--spacing-sm)',
                                                                padding: 'var(--spacing-sm)',
                                                                background: 'var(--color-bg-glass)',
                                                                borderRadius: 'var(--radius-md)',
                                                                border: '1px solid var(--color-border)'
                                                            }}
                                                        >
                                                            {/* 商品画像 */}
                                                            <div style={{
                                                                width: 50,
                                                                height: 50,
                                                                borderRadius: 'var(--radius-sm)',
                                                                background: item.image ? `url(${item.image}) center/cover` : 'var(--color-bg-secondary)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                flexShrink: 0
                                                            }}>
                                                                {!item.image && '📦'}
                                                            </div>
                                                            {/* 商品情報 */}
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{
                                                                    fontWeight: 500,
                                                                    fontSize: 'var(--font-size-sm)',
                                                                    whiteSpace: 'nowrap',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis'
                                                                }}>
                                                                    {item.name || '商品名不明'}
                                                                </div>
                                                                <div style={{
                                                                    color: 'var(--color-text-secondary)',
                                                                    fontSize: 'var(--font-size-xs)'
                                                                }}>
                                                                    {formatPrice(item.price, order.currency)} × {item.quantity || 1}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div style={{
                                                        color: 'var(--color-text-secondary)',
                                                        fontSize: 'var(--font-size-sm)',
                                                        fontStyle: 'italic'
                                                    }}>
                                                        商品情報なし
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* アクションボタン */}
                                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                onClick={() => setSelectedOrder(order)}
                                            >
                                                📋 詳細
                                            </button>
                                            {order.status === 'pending' && (
                                                <button className="btn btn-primary btn-sm">処理する</button>
                                            )}
                                            {order.status === 'processing' && (
                                                <button className="btn btn-primary btn-sm">発送する</button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="card">
                            <div className="empty-state">
                                <div className="empty-icon">📭</div>
                                <div className="empty-title">
                                    {activeTab === 'all' ? '注文がありません' : '該当する注文がありません'}
                                </div>
                                <p>
                                    {activeTab === 'all'
                                        ? '新しい注文が入るまでお待ちください。'
                                        : '他のタブを確認してください。'}
                                </p>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Summary Cards */}
            <div className="stats-grid" style={{ marginTop: 'var(--spacing-xl)' }}>
                <div className="stat-card">
                    <div className="stat-icon yellow">⏳</div>
                    <div className="stat-content">
                        <div className="stat-label">要対応</div>
                        <div className="stat-value">
                            {orders.filter(o => o.status === 'pending').length}
                        </div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon blue">📦</div>
                    <div className="stat-content">
                        <div className="stat-label">処理中</div>
                        <div className="stat-value">
                            {orders.filter(o => o.status === 'processing').length}
                        </div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green">✅</div>
                    <div className="stat-content">
                        <div className="stat-label">総売上（15日間）</div>
                        <div className="stat-value">
                            {formatPrice(orders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0), 'TWD')}
                        </div>
                    </div>
                </div>
            </div>

            {/* 詳細モーダル */}
            {selectedOrder && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: 'var(--spacing-lg)'
                    }}
                    onClick={() => setSelectedOrder(null)}
                >
                    <div
                        className="card"
                        style={{
                            maxWidth: 600,
                            width: '100%',
                            maxHeight: '90vh',
                            overflow: 'auto',
                            padding: 'var(--spacing-xl)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
                            <h2 style={{ margin: 0 }}>📦 注文詳細</h2>
                            <button
                                className="btn btn-ghost"
                                onClick={() => setSelectedOrder(null)}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                            <div style={{ padding: 'var(--spacing-md)', background: 'var(--color-bg-glass)', borderRadius: 'var(--radius-md)' }}>
                                <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>注文ID</div>
                                <div style={{ fontWeight: 600 }}>{selectedOrder.id}</div>
                            </div>

                            <div style={{ padding: 'var(--spacing-md)', background: 'var(--color-bg-glass)', borderRadius: 'var(--radius-md)' }}>
                                <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>顧客</div>
                                <div style={{ fontWeight: 600 }}>{selectedOrder.customer}</div>
                            </div>

                            <div style={{ padding: 'var(--spacing-md)', background: 'var(--color-bg-glass)', borderRadius: 'var(--radius-md)' }}>
                                <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>注文日時</div>
                                <div style={{ fontWeight: 600 }}>{selectedOrder.date}</div>
                            </div>

                            <div style={{ padding: 'var(--spacing-md)', background: 'var(--color-bg-glass)', borderRadius: 'var(--radius-md)' }}>
                                <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>ステータス</div>
                                <span className={`badge ${getStatusBadge(selectedOrder.status).className}`}>
                                    {getStatusBadge(selectedOrder.status).label}
                                </span>
                            </div>

                            <div style={{ padding: 'var(--spacing-md)', background: 'var(--color-bg-glass)', borderRadius: 'var(--radius-md)' }}>
                                <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>合計金額</div>
                                <div style={{ fontWeight: 700, fontSize: 'var(--font-size-xl)', color: 'var(--color-accent-light)' }}>
                                    {formatPrice(selectedOrder.total, selectedOrder.currency)}
                                </div>
                            </div>

                            {selectedOrder.item_list && selectedOrder.item_list.length > 0 && (
                                <div style={{ padding: 'var(--spacing-md)', background: 'var(--color-bg-glass)', borderRadius: 'var(--radius-md)' }}>
                                    <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-sm)' }}>
                                        注文商品 ({selectedOrder.items}点)
                                    </div>
                                    {selectedOrder.item_list.map((item, idx) => (
                                        <div key={idx} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--spacing-sm)',
                                            padding: 'var(--spacing-sm) 0',
                                            borderBottom: idx < selectedOrder.item_list.length - 1 ? '1px solid var(--color-border)' : 'none'
                                        }}>
                                            <div style={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: 'var(--radius-sm)',
                                                background: item.image ? `url(${item.image}) center/cover` : 'var(--color-bg-secondary)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0
                                            }}>
                                                {!item.image && '📦'}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 500, fontSize: 'var(--font-size-sm)' }}>{item.name}</div>
                                                <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)' }}>
                                                    {item.sku && `SKU: ${item.sku}`}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontWeight: 600 }}>{formatPrice(item.price, selectedOrder.currency)}</div>
                                                <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)' }}>× {item.quantity || 1}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {selectedOrder.shipping && (
                                <div style={{ padding: 'var(--spacing-md)', background: 'var(--color-bg-glass)', borderRadius: 'var(--radius-md)' }}>
                                    <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-sm)' }}>配送情報</div>
                                    {selectedOrder.shipping.carrier && (
                                        <div style={{ marginBottom: 'var(--spacing-xs)' }}>
                                            <strong>配送業者:</strong> {selectedOrder.shipping.carrier}
                                        </div>
                                    )}
                                    {selectedOrder.shipping.tracking_number && (
                                        <div style={{ marginBottom: 'var(--spacing-xs)' }}>
                                            <strong>追跡番号:</strong> {selectedOrder.shipping.tracking_number}
                                        </div>
                                    )}
                                </div>
                            )}

                            {selectedOrder.note && (
                                <div style={{ padding: 'var(--spacing-md)', background: 'var(--color-bg-glass)', borderRadius: 'var(--radius-md)' }}>
                                    <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>備考</div>
                                    <div>{selectedOrder.note}</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Orders
