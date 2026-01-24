import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useShopeeAuth } from '../hooks/useShopeeAuth'
import { getOrders, formatPrice, getStatusBadge } from '../services/shopeeApi'

function Orders() {
    const [activeTab, setActiveTab] = useState('all')
    const [orders, setOrders] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)

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

            {/* Orders Table */}
            {!isLoading && !error && (
                <div className="card">
                    {filteredOrders.length > 0 ? (
                        <div className="table-container" style={{ border: 'none' }}>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>注文ID</th>
                                        <th>顧客名</th>
                                        <th>商品数</th>
                                        <th>合計金額</th>
                                        <th>注文日時</th>
                                        <th>ステータス</th>
                                        <th>アクション</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredOrders.map((order) => {
                                        const status = getStatusBadge(order.status)
                                        return (
                                            <tr key={order.id}>
                                                <td style={{ fontWeight: 600 }}>{order.id}</td>
                                                <td>{order.customer}</td>
                                                <td>{order.items}点</td>
                                                <td style={{ fontWeight: 600, color: 'var(--color-accent-light)' }}>
                                                    {formatPrice(order.total, order.currency)}
                                                </td>
                                                <td style={{ color: 'var(--color-text-secondary)' }}>
                                                    {order.date}
                                                </td>
                                                <td>
                                                    <span className={`badge ${status.className}`}>{status.label}</span>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                                                        <button className="btn btn-ghost btn-sm">📋 詳細</button>
                                                        {order.status === 'pending' && (
                                                            <button className="btn btn-primary btn-sm">処理する</button>
                                                        )}
                                                        {order.status === 'processing' && (
                                                            <button className="btn btn-primary btn-sm">発送する</button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
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
                    )}
                </div>
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
                        <div className="stat-label">総売上（30日間）</div>
                        <div className="stat-value">
                            {formatPrice(orders.reduce((sum, o) => sum + (o.total || 0), 0), 'TWD')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Orders
