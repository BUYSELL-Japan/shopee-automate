import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useShopeeAuth } from '../hooks/useShopeeAuth'
import { getProducts, formatPrice, getStatusBadge } from '../services/shopeeApi'

function ProductList() {
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [products, setProducts] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)
    const [pagination, setPagination] = useState({
        total: 0,
        hasNextPage: false,
        nextOffset: 0
    })

    const { accessToken, shopId, isConnected } = useShopeeAuth()

    // 商品一覧を取得
    const fetchProducts = async (offset = 0) => {
        if (!isConnected || !accessToken || !shopId) return

        setIsLoading(true)
        setError(null)

        try {
            const result = await getProducts(accessToken, shopId, { offset, pageSize: 50 })

            if (result.status === 'success') {
                setProducts(result.data.products || [])
                setPagination({
                    total: result.data.total || 0,
                    hasNextPage: result.data.has_next_page || false,
                    nextOffset: result.data.next_offset || 0
                })
            } else {
                setError(result.message || '商品の取得に失敗しました')
            }
        } catch (e) {
            setError(e.message || 'エラーが発生しました')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (isConnected) {
            fetchProducts()
        }
    }, [isConnected, accessToken, shopId])

    // フィルタリング
    const filteredProducts = products.filter((product) => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesStatus = statusFilter === 'all' || product.status === statusFilter
        return matchesSearch && matchesStatus
    })

    // 未接続時のUI
    if (!isConnected) {
        return (
            <div className="page-container animate-fade-in">
                <header className="page-header">
                    <div>
                        <h1 className="page-title">商品一覧</h1>
                        <p className="page-subtitle">Shopee APIに接続してください</p>
                    </div>
                </header>
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-icon">🔗</div>
                        <div className="empty-title">API未接続</div>
                        <p>商品を表示するには、まず設定ページでShopee APIに接続してください。</p>
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
                    <h1 className="page-title">商品一覧</h1>
                    <p className="page-subtitle">
                        {isLoading ? '読み込み中...' : `${pagination.total}件の商品を管理中`}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={() => fetchProducts()}
                        disabled={isLoading}
                    >
                        🔄 更新
                    </button>
                    <Link to="/products/new" className="btn btn-primary">
                        ➕ 新規出品
                    </Link>
                </div>
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
                            <option value="inactive">非公開</option>
                            <option value="banned">停止</option>
                        </select>
                    </div>
                </div>
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
                            onClick={() => fetchProducts()}
                        >
                            🔄 再試行
                        </button>
                    </div>
                </div>
            )}

            {/* Product Grid */}
            {!isLoading && !error && filteredProducts.length > 0 && (
                <div className="product-grid">
                    {filteredProducts.map((product) => {
                        const status = getStatusBadge(product.status)
                        return (
                            <div key={product.id} className="product-card">
                                <div className="product-image">
                                    {product.image ? (
                                        <img
                                            src={product.image}
                                            alt={product.name}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                                borderRadius: 'var(--radius-md)'
                                            }}
                                            onError={(e) => {
                                                e.target.style.display = 'none'
                                                e.target.parentElement.innerHTML = '📦'
                                            }}
                                        />
                                    ) : '📦'}
                                </div>
                                <div className="product-info">
                                    <h3 className="product-name">{product.name}</h3>
                                    <div className="product-price">
                                        {formatPrice(product.price, product.currency)}
                                    </div>
                                    <div className="product-meta">
                                        <span>在庫: {product.stock}</span>
                                        <span className={`badge ${status.className}`}>{status.label}</span>
                                    </div>
                                    <div style={{
                                        marginTop: 'var(--spacing-sm)',
                                        fontSize: 'var(--font-size-xs)',
                                        color: 'var(--color-text-secondary)'
                                    }}>
                                        販売数: {product.sold || 0} | ⭐ {product.rating_star?.toFixed(1) || 'N/A'}
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
            )}

            {/* Empty State */}
            {!isLoading && !error && filteredProducts.length === 0 && products.length > 0 && (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-icon">🔍</div>
                        <div className="empty-title">検索結果がありません</div>
                        <p>検索条件を変更してください。</p>
                    </div>
                </div>
            )}

            {!isLoading && !error && products.length === 0 && (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-icon">📭</div>
                        <div className="empty-title">商品がありません</div>
                        <p>新しい商品を出品してみましょう。</p>
                        <Link to="/products/new" className="btn btn-primary" style={{ marginTop: 'var(--spacing-lg)' }}>
                            ➕ 新規出品
                        </Link>
                    </div>
                </div>
            )}

            {/* Load More */}
            {pagination.hasNextPage && !isLoading && (
                <div style={{ textAlign: 'center', marginTop: 'var(--spacing-xl)' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={() => fetchProducts(pagination.nextOffset)}
                    >
                        さらに読み込む
                    </button>
                </div>
            )}
        </div>
    )
}

export default ProductList
