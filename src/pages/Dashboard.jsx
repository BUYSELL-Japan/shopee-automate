import { Link } from 'react-router-dom'
import { mockStats, mockProducts, mockOrders, formatPrice, getStatusBadge } from '../data/mockData'

function Dashboard() {
    const recentProducts = mockProducts.slice(0, 4)
    const recentOrders = mockOrders.slice(0, 5)

    return (
        <div className="page-container animate-fade-in">
            <header className="page-header">
                <div>
                    <h1 className="page-title">ダッシュボード</h1>
                    <p className="page-subtitle">ストアの概要を確認できます</p>
                </div>
                <Link to="/products/new" className="btn btn-primary">
                    ➕ 新規出品
                </Link>
            </header>

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon orange">📦</div>
                    <div className="stat-content">
                        <div className="stat-label">総商品数</div>
                        <div className="stat-value">{mockStats.totalProducts}</div>
                        <div className="stat-change positive">↑ 12% 先月比</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon green">✅</div>
                    <div className="stat-content">
                        <div className="stat-label">出品中</div>
                        <div className="stat-value">{mockStats.activeListings}</div>
                        <div className="stat-change positive">↑ 8% 先月比</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon yellow">⏳</div>
                    <div className="stat-content">
                        <div className="stat-label">保留中の注文</div>
                        <div className="stat-value">{mockStats.pendingOrders}</div>
                        <div className="stat-change negative">↓ 5% 先月比</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon blue">💰</div>
                    <div className="stat-content">
                        <div className="stat-label">総売上</div>
                        <div className="stat-value">{formatPrice(mockStats.totalSales)}</div>
                        <div className="stat-change positive">↑ 23% 先月比</div>
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                        {recentProducts.map((product) => {
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
                                        fontSize: '1.5rem'
                                    }}>
                                        📦
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
                                            {formatPrice(product.price)}
                                        </div>
                                        <span className={`badge ${status.className}`}>{status.label}</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Recent Orders */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">最近の注文</h3>
                        <Link to="/orders" className="btn btn-ghost btn-sm">
                            すべて見る →
                        </Link>
                    </div>
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
                                {recentOrders.map((order) => {
                                    const status = getStatusBadge(order.status)
                                    return (
                                        <tr key={order.id}>
                                            <td style={{ fontWeight: 500 }}>{order.id}</td>
                                            <td>{order.customer}</td>
                                            <td>{formatPrice(order.total)}</td>
                                            <td><span className={`badge ${status.className}`}>{status.label}</span></td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
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
