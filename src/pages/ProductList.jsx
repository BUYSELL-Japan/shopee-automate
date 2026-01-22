import { useState } from 'react'
import { Link } from 'react-router-dom'
import { mockProducts, formatPrice, getStatusBadge } from '../data/mockData'

function ProductList() {
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')

    const filteredProducts = mockProducts.filter((product) => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesStatus = statusFilter === 'all' || product.status === statusFilter
        return matchesSearch && matchesStatus
    })

    return (
        <div className="page-container animate-fade-in">
            <header className="page-header">
                <div>
                    <h1 className="page-title">商品一覧</h1>
                    <p className="page-subtitle">{mockProducts.length}件の商品を管理中</p>
                </div>
                <Link to="/products/new" className="btn btn-primary">
                    ➕ 新規出品
                </Link>
            </header>

            {/* Filters */}
            <div className="card" style={{ marginBottom: 'var(--spacing-xl)' }}>
                <div style={{ display: 'flex', gap: 'var(--spacing-lg)', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="🔍 商品名で検索..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="form-group" style={{ minWidth: '150px', marginBottom: 0 }}>
                        <select
                            className="form-input form-select"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">すべてのステータス</option>
                            <option value="active">出品中</option>
                            <option value="low_stock">残りわずか</option>
                            <option value="out_of_stock">在庫切れ</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Product Grid */}
            {filteredProducts.length > 0 ? (
                <div className="product-grid">
                    {filteredProducts.map((product) => {
                        const status = getStatusBadge(product.status)
                        return (
                            <div key={product.id} className="product-card">
                                <div className="product-image">📦</div>
                                <div className="product-info">
                                    <h3 className="product-name">{product.name}</h3>
                                    <div className="product-price">{formatPrice(product.price)}</div>
                                    <div className="product-meta">
                                        <span>在庫: {product.stock}</span>
                                        <span className={`badge ${status.className}`}>{status.label}</span>
                                    </div>
                                    <div style={{
                                        marginTop: 'var(--spacing-md)',
                                        display: 'flex',
                                        gap: 'var(--spacing-sm)'
                                    }}>
                                        <button className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                                            ✏️ 編集
                                        </button>
                                        <button className="btn btn-ghost btn-sm">
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-icon">📭</div>
                        <div className="empty-title">商品が見つかりません</div>
                        <p>検索条件を変更するか、新しい商品を追加してください。</p>
                        <Link to="/products/new" className="btn btn-primary" style={{ marginTop: 'var(--spacing-lg)' }}>
                            ➕ 新規出品
                        </Link>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ProductList
