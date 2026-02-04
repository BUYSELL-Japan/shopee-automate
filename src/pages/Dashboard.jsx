import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useShopeeAuth } from '../hooks/useShopeeAuth'
import { getProducts, getOrders, formatPrice, twdToJpy, getStatusBadge } from '../services/shopeeApi'

// リージョン情報
const REGIONS = {
    TW: { name: '台湾', flag: '🇹🇼', currency: 'TWD', symbol: 'NT$' },
    MY: { name: 'マレーシア', flag: '🇲🇾', currency: 'MYR', symbol: 'RM' }
}

function Dashboard() {
    const [stats, setStats] = useState({
        totalProducts: 0,
        activeListings: 0,
        pendingOrders: 0,
        totalSales: 0
    })
    const [products, setProducts] = useState([])
    const [orders, setOrders] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)

    const { accessToken, shopId, shopName, isConnected, activeRegion } = useShopeeAuth()
    const regionInfo = REGIONS[activeRegion] || REGIONS.TW

    // データを取得
    const fetchData = async () => {
        if (!isConnected || !accessToken || !shopId) return

        setIsLoading(true)
        setError(null)

        try {
            // 商品と注文を並行取得
            const [productsResult, ordersResult] = await Promise.all([
                getProducts(accessToken, shopId, { pageSize: 50 }),
                getOrders(accessToken, shopId, { orderStatus: 'ALL', pageSize: 50 })
            ])

            if (productsResult.status === 'success') {
                const productList = productsResult.data.products || []
                setProducts(productList.slice(0, 4))
                setStats(prev => ({
                    ...prev,
                    totalProducts: productsResult.data.total || productList.length,
                    activeListings: productList.filter(p => p.status === 'active').length
                }))
            }

            if (ordersResult.status === 'success') {
                const orderList = ordersResult.data.orders || []
                setOrders(orderList.slice(0, 5))
                setStats(prev => ({
                    ...prev,
                    pendingOrders: orderList.filter(o => o.status === 'pending' || o.status === 'processing').length,
                    totalSales: orderList.reduce((sum, o) => sum + (o.total || 0), 0)
                }))
            }

        } catch (e) {
            setError(e.message || 'データの取得に失敗しました')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (isConnected) {
            fetchData()
        }
    }, [isConnected, accessToken, shopId, activeRegion])

    // 未接続時のUI
    if (!isConnected) {
        return (
            <div className="page-container animate-fade-in">
                <header className="page-header">
                    <div>
                        <h1 className="page-title">ダッシュボード</h1>
                        <p className="page-subtitle">Shopee APIに接続してください</p>
                    </div>
                </header>
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-icon">🔗</div>
                        <div className="empty-title">API未接続</div>
                        <p>ダッシュボードを表示するには、まず設定ページでShopee APIに接続してください。</p>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h1 className="page-title">ダッシュボード</h1>
                        <span style={{
                            background: 'var(--color-bg-glass)',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: 'var(--font-size-sm)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            border: '1px solid var(--color-border)'
                        }}>
                            {regionInfo.flag} {regionInfo.name}
                        </span>
                    </div>
                    <p className="page-subtitle">
                        {shopName ? `${shopName} の概要` : 'ストアの概要を確認できます'}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={fetchData}
                        disabled={isLoading}
                    >
                        🔄 更新
                    </button>
                    <Link to="/products/new" className="btn btn-primary">
                        ➕ 新規出品
                    </Link>
                </div>
            </header>

            {/* Error Message */}
            {error && (
                <div className="card" style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    marginBottom: 'var(--spacing-xl)'
                }}>
                    <p style={{ color: 'var(--color-error)', margin: 0 }}>❌ {error}</p>
                </div>
            )}

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon orange">📦</div>
                    <div className="stat-content">
                        <div className="stat-label">総商品数</div>
                        <div className="stat-value">
                            {isLoading ? '...' : stats.totalProducts}
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon green">✅</div>
                    <div className="stat-content">
                        <div className="stat-label">出品中</div>
                        <div className="stat-value">
                            {isLoading ? '...' : stats.activeListings}
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon yellow">⏳</div>
                    <div className="stat-content">
                        <div className="stat-label">保留中の注文</div>
                        <div className="stat-value">
                            {isLoading ? '...' : stats.pendingOrders}
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon blue">💰</div>
                    <div className="stat-content">
                        <div className="stat-label">総売上（30日間）</div>
                        <div className="stat-value">
                            {isLoading ? '...' : formatPrice(stats.totalSales, 'TWD')}
                        </div>
                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                            {isLoading ? '' : `¥${twdToJpy(stats.totalSales || 0).toLocaleString()}`}
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="grid-2">
                {/* Recent Products */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">最近の商品</h3>
                        <Link to="/products" className="btn btn-ghost btn-sm">
                            すべて見る →
                        </Link>
                    </div>
                    {isLoading ? (
                        <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>
                            🔄 読み込み中...
                        </div>
                    ) : products.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                            {products.map((product) => {
                                const status = getStatusBadge(product.status)
                                return (
                                    <div key={product.id} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--spacing-md)',
                                        padding: 'var(--spacing-md)',
                                        background: 'var(--color-bg-glass)',
                                        borderRadius: 'var(--radius-md)'
                                    }}>
                                        <div style={{
                                            width: '48px',
                                            height: '48px',
                                            background: 'var(--color-bg-tertiary)',
                                            borderRadius: 'var(--radius-md)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '1.5rem',
                                            overflow: 'hidden'
                                        }}>
                                            {product.image ? (
                                                <img
                                                    src={product.image}
                                                    alt={product.name}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.textContent = '📦' }}
                                                />
                                            ) : '📦'}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontWeight: 500,
                                                marginBottom: '2px',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis'
                                            }}>
                                                {product.name}
                                            </div>
                                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                                                在庫: {product.stock}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 600, color: 'var(--color-accent-light)' }}>
                                                {formatPrice(product.price, product.currency)}
                                            </div>
                                            <span className={`badge ${status.className}`}>{status.label}</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                            商品がありません
                        </div>
                    )}
                </div>

                {/* Recent Orders */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">最近の注文</h3>
                        <Link to="/orders" className="btn btn-ghost btn-sm">
                            すべて見る →
                        </Link>
                    </div>
                    {isLoading ? (
                        <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>
                            🔄 読み込み中...
                        </div>
                    ) : orders.length > 0 ? (
                        <div className="table-container" style={{ border: 'none' }}>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>注文ID</th>
                                        <th>顧客</th>
                                        <th>金額</th>
                                        <th>状態</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map((order) => {
                                        const status = getStatusBadge(order.status)
                                        return (
                                            <tr key={order.id}>
                                                <td style={{ fontWeight: 500 }}>{order.id?.slice(-10) || order.id}</td>
                                                <td>{order.customer}</td>
                                                <td>{formatPrice(order.total, order.currency)}</td>
                                                <td><span className={`badge ${status.className}`}>{status.label}</span></td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                            注文がありません
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="card" style={{ marginTop: 'var(--spacing-xl)' }}>
                <h3 className="card-title" style={{ marginBottom: 'var(--spacing-lg)' }}>クイックアクション</h3>
                <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                    <Link to="/products/new" className="btn btn-primary">
                        ➕ 新規出品
                    </Link>
                    <Link to="/bulk-upload" className="btn btn-secondary">
                        📤 一括出品
                    </Link>
                    <Link to="/orders" className="btn btn-secondary">
                        🛒 注文確認
                    </Link>
                    <Link to="/settings" className="btn btn-secondary">
                        ⚙️ 設定
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default Dashboard
