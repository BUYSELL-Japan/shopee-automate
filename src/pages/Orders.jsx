import { useState } from 'react'
import { mockOrders, formatPrice, getStatusBadge } from '../data/mockData'

function Orders() {
    const [activeTab, setActiveTab] = useState('all')

    const filteredOrders = mockOrders.filter((order) => {
        if (activeTab === 'all') return true
        return order.status === activeTab
    })

    const tabs = [
        { id: 'all', label: 'すべて', count: mockOrders.length },
        { id: 'pending', label: '保留中', count: mockOrders.filter(o => o.status === 'pending').length },
        { id: 'processing', label: '処理中', count: mockOrders.filter(o => o.status === 'processing').length },
        { id: 'shipped', label: '発送済み', count: mockOrders.filter(o => o.status === 'shipped').length },
        { id: 'delivered', label: '配達完了', count: mockOrders.filter(o => o.status === 'delivered').length },
    ]

    return (
        <div className="page-container animate-fade-in">
            <header className="page-header">
                <div>
                    <h1 className="page-title">注文管理</h1>
                    <p className="page-subtitle">{mockOrders.length}件の注文を管理中</p>
                </div>
                <button className="btn btn-secondary">
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

            {/* Orders Table */}
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
                                                {formatPrice(order.total)}
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
                        <div className="empty-title">該当する注文がありません</div>
                        <p>他のタブを確認するか、注文を待ちましょう。</p>
                    </div>
                )}
            </div>

            {/* Summary Cards */}
            <div className="stats-grid" style={{ marginTop: 'var(--spacing-xl)' }}>
                <div className="stat-card">
                    <div className="stat-icon yellow">⏳</div>
                    <div className="stat-content">
                        <div className="stat-label">要対応</div>
                        <div className="stat-value">
                            {mockOrders.filter(o => o.status === 'pending').length}
                        </div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon blue">📦</div>
                    <div className="stat-content">
                        <div className="stat-label">処理中</div>
                        <div className="stat-value">
                            {mockOrders.filter(o => o.status === 'processing').length}
                        </div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green">✅</div>
                    <div className="stat-content">
                        <div className="stat-label">今日の売上</div>
                        <div className="stat-value">
                            {formatPrice(mockOrders.reduce((sum, o) => sum + o.total, 0))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Orders
