import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useShopeeAuth } from '../hooks/useShopeeAuth'
import { getProducts, getDbProducts, syncProductsToDb, formatPrice, formatPriceWithJPY, twdToJpy, getStatusBadge } from '../services/shopeeApi'

// リージョン情報
const REGIONS = {
    TW: { name: '台湾', flag: '🇹🇼', currency: 'TWD', symbol: 'NT$' },
    MY: { name: 'マレーシア', flag: '🇲🇾', currency: 'MYR', symbol: 'RM' }
}

function ProductList() {
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [stockFilter, setStockFilter] = useState('all') // 在庫フィルタ
    const [products, setProducts] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)
    const [pagination, setPagination] = useState({
        total: 0,
        hasNextPage: false,
        nextOffset: 0
    })

    // データソース切り替え: 'shopee' | 'd1'
    const [dataSource, setDataSource] = useState('shopee')
    const [isSyncing, setIsSyncing] = useState(false)
    const [syncMessage, setSyncMessage] = useState(null)

    const { accessToken, shopId, isConnected, activeRegion } = useShopeeAuth()
    const regionInfo = REGIONS[activeRegion] || REGIONS.TW

    // 商品一覧を取得（データソースに応じて切り替え）
    const fetchProducts = async (offset = 0) => {
        if (!isConnected || !accessToken || !shopId) return

        setIsLoading(true)
        setError(null)

        try {
            let result;

            if (dataSource === 'shopee') {
                // Shopee API から直接取得
                result = await getProducts(accessToken, shopId, { offset, pageSize: 50 })
                if (result.status === 'success') {
                    const shopeeProducts = result.data.products || []

                    // D1からコストデータを取得してマージ
                    try {
                        const d1Response = await fetch(`/api/db/products?shop_id=${shopId}&limit=500`)
                        const d1Data = await d1Response.json()
                        if (d1Data.status === 'success' && d1Data.data?.products) {
                            const costMap = {}
                            d1Data.data.products.forEach(p => {
                                costMap[p.item_id] = {
                                    cost_price: p.cost_price,
                                    source_url: p.source_url
                                }
                            })
                            // Shopee商品にコストデータをマージ
                            shopeeProducts.forEach(p => {
                                const costData = costMap[p.id]
                                if (costData) {
                                    p.cost_price = costData.cost_price
                                    p.source_url = costData.source_url
                                }
                            })
                        }
                    } catch (e) {
                        console.log('D1 cost data fetch failed:', e)
                    }

                    setProducts(shopeeProducts)
                    setPagination({
                        total: result.data.total || 0,
                        hasNextPage: result.data.has_next_page || false,
                        nextOffset: result.data.next_offset || 0
                    })
                } else {
                    setError(result.message || '商品の取得に失敗しました')
                }
            } else {
                // D1 データベースから取得
                result = await getDbProducts(shopId, { offset, limit: 100 })
                if (result.status === 'success') {
                    // D1の商品データをShopee形式に変換
                    const dbProducts = (result.data.products || []).map(p => ({
                        id: p.item_id || p.id,
                        item_sku: p.item_sku,  // Parent SKU
                        name: p.item_name,
                        description: p.description,
                        price: p.current_price || p.original_price || 0,
                        originalPrice: p.original_price || 0,
                        currency: p.currency || 'TWD',
                        stock: p.stock || 0,
                        status: mapDbStatus(p.item_status),
                        image: p.image_url,
                        images: p.image_url_list || [],
                        category_id: p.category_id,
                        sold: p.sold || 0,
                        views: p.views || 0,
                        likes: p.likes || 0,
                        rating_star: p.rating_star || 0,
                        create_time: p.create_time,
                        update_time: p.update_time,
                        // D1固有のフィールド
                        custom_price: p.custom_price,
                        cost_price: p.cost_price,
                        source_url: p.source_url,
                        notes: p.notes,
                        last_synced_at: p.last_synced_at
                    }))
                    setProducts(dbProducts)
                    setPagination({
                        total: result.data.total || dbProducts.length,
                        hasNextPage: false,
                        nextOffset: 0
                    })
                } else {
                    setError(result.message || 'D1からの取得に失敗しました')
                }
            }
        } catch (e) {
            setError(e.message || 'エラーが発生しました')
        } finally {
            setIsLoading(false)
        }
    }

    // D1に同期
    const handleSync = async () => {
        if (!accessToken || !shopId) return

        setIsSyncing(true)
        setSyncMessage(null)

        try {
            const result = await syncProductsToDb(accessToken, shopId)
            if (result.status === 'success') {
                setSyncMessage({
                    type: 'success',
                    text: `✅ ${result.data.synced}件の商品をD1に同期しました`
                })
                // D1表示に切り替えてリロード
                setDataSource('d1')
            } else {
                setSyncMessage({
                    type: 'error',
                    text: `❌ 同期に失敗: ${result.message}`
                })
            }
        } catch (e) {
            setSyncMessage({
                type: 'error',
                text: `❌ エラー: ${e.message}`
            })
        } finally {
            setIsSyncing(false)
        }
    }

    // ステータスを変換
    const mapDbStatus = (status) => {
        const map = {
            'NORMAL': 'active',
            'UNLIST': 'inactive',
            'BANNED': 'banned',
            'DELETED': 'deleted'
        }
        return map[status] || status || 'unknown'
    }

    useEffect(() => {
        if (isConnected) {
            fetchProducts()
        }
    }, [isConnected, accessToken, shopId, dataSource, activeRegion])

    // フィルタリング
    const filteredProducts = products.filter((product) => {
        const matchesSearch = product.name?.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesStatus = statusFilter === 'all' || product.status === statusFilter
        // 在庫フィルタ
        let matchesStock = true
        if (stockFilter === 'zero') {
            matchesStock = (product.stock || 0) === 0
        } else if (stockFilter === 'low') {
            matchesStock = (product.stock || 0) > 0 && (product.stock || 0) <= 5
        } else if (stockFilter === 'available') {
            matchesStock = (product.stock || 0) > 0
        }
        return matchesSearch && matchesStatus && matchesStock
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h1 className="page-title">商品一覧</h1>
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
                        {isLoading ? '読み込み中...' : `${pagination.total}件の商品を管理中`}
                        {dataSource === 'd1' && ' (D1データベース)'}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={() => fetchProducts()}
                        disabled={isLoading}
                    >
                        🔄 更新
                    </button>
                    <button
                        className="btn btn-success"
                        onClick={handleSync}
                        disabled={isSyncing || isLoading}
                    >
                        {isSyncing ? '⏳ 同期中...' : '💾 D1に保存'}
                    </button>
                    <Link to="/products/new" className="btn btn-primary">
                        ➕ 新規出品
                    </Link>
                </div>
            </header>

            {/* 同期メッセージ */}
            {syncMessage && (
                <div className={`card ${syncMessage.type === 'success' ? 'card-success' : 'card-error'}`}
                    style={{
                        marginBottom: 'var(--spacing-lg)',
                        padding: 'var(--spacing-md)',
                        background: syncMessage.type === 'success'
                            ? 'rgba(16, 185, 129, 0.1)'
                            : 'rgba(239, 68, 68, 0.1)',
                        border: syncMessage.type === 'success'
                            ? '1px solid var(--success)'
                            : '1px solid var(--error)'
                    }}>
                    {syncMessage.text}
                    <button
                        onClick={() => setSyncMessage(null)}
                        style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* データソース切り替えタブ */}
            <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
                    <button
                        className={`btn ${dataSource === 'shopee' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setDataSource('shopee')}
                    >
                        🛍️ Shopee API
                    </button>
                    <button
                        className={`btn ${dataSource === 'd1' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setDataSource('d1')}
                    >
                        💾 D1データベース
                    </button>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                    {dataSource === 'shopee'
                        ? '📡 Shopee APIからリアルタイムでデータを取得しています'
                        : '💾 D1データベースに保存されたデータを表示しています（編集可能）'}
                </p>
            </div>

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
                    <div className="form-group" style={{ minWidth: '150px', marginBottom: 0 }}>
                        <select
                            className="form-input form-select"
                            value={stockFilter}
                            onChange={(e) => setStockFilter(e.target.value)}
                        >
                            <option value="all">すべての在庫</option>
                            <option value="zero">在庫0のみ</option>
                            <option value="low">在庫少（1-5）</option>
                            <option value="available">在庫あり</option>
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
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-icon">⚠️</div>
                        <div className="empty-title">エラー</div>
                        <p>{error}</p>
                        <button className="btn btn-primary" onClick={() => fetchProducts()}>
                            🔄 再試行
                        </button>
                    </div>
                </div>
            )}

            {/* Products Grid */}
            {!isLoading && !error && (
                <div className="products-grid">
                    {filteredProducts.length > 0 ? (
                        filteredProducts.map((product) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                dataSource={dataSource}
                            />
                        ))
                    ) : (
                        <div className="card" style={{ gridColumn: '1 / -1' }}>
                            <div className="empty-state">
                                <div className="empty-icon">📦</div>
                                <div className="empty-title">商品が見つかりません</div>
                                <p>{dataSource === 'd1' ? 'D1にデータがありません。「D1に保存」ボタンで同期してください。' : '検索条件に一致する商品がありません。'}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Pagination */}
            {pagination.hasNextPage && !isLoading && (
                <div style={{ textAlign: 'center', marginTop: 'var(--spacing-xl)' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={() => fetchProducts(pagination.nextOffset)}
                    >
                        📥 さらに読み込む
                    </button>
                </div>
            )}

            <style>{`
                .products-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: var(--spacing-lg);
                }

                .product-card {
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                }

                .product-card:hover {
                    transform: translateY(-4px);
                    box-shadow: var(--shadow-xl);
                }

                .product-image {
                    width: 100%;
                    height: 160px;
                    object-fit: cover;
                    border-radius: var(--radius-md);
                    margin-bottom: var(--spacing-md);
                    background: var(--bg-secondary);
                }

                .product-image-placeholder {
                    width: 100%;
                    height: 160px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--bg-secondary);
                    border-radius: var(--radius-md);
                    margin-bottom: var(--spacing-md);
                    font-size: 3rem;
                }

                .product-info {
                    display: flex;
                    flex-direction: column;
                    gap: var(--spacing-sm);
                }

                .product-name {
                    font-weight: 600;
                    font-size: 1rem;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .product-price {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: var(--primary);
                }

                .product-meta {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                }

                .product-actions {
                    display: flex;
                    gap: var(--spacing-sm);
                    margin-top: var(--spacing-md);
                }

                .d1-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    padding: 2px 8px;
                    background: rgba(99, 102, 241, 0.1);
                    color: var(--primary);
                    border-radius: 999px;
                    font-size: 0.7rem;
                    font-weight: 600;
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    )
}

// 費用定数（NewProductと同じ）
const COSTS = {
    COMMISSION_RATE: 0.1077,
    SERVICE_FEE_RATE: 0.03,
    TRANSACTION_FEE_RATE: 0.0254,
    YAMATO_JPY: 1350,
    SLS_NET_TWD: 76,
    TWD_JPY_RATE: 4.7
}
const TOTAL_FEE_RATE = COSTS.COMMISSION_RATE + COSTS.SERVICE_FEE_RATE + COSTS.TRANSACTION_FEE_RATE

// 利益計算関数
function calculateProfit(costPriceJpy, sellingPriceTwd) {
    if (!costPriceJpy || costPriceJpy <= 0) return null
    const salesJpy = Math.round(sellingPriceTwd * COSTS.TWD_JPY_RATE)
    const feesTwd = Math.round(sellingPriceTwd * TOTAL_FEE_RATE)
    const feesJpy = Math.round(feesTwd * COSTS.TWD_JPY_RATE)
    const slsJpy = Math.round(COSTS.SLS_NET_TWD * COSTS.TWD_JPY_RATE)
    const totalCostJpy = costPriceJpy + COSTS.YAMATO_JPY + slsJpy + feesJpy
    const profitJpy = salesJpy - totalCostJpy
    return { profitJpy, isLoss: profitJpy < 0 }
}

// 商品カードコンポーネント
function ProductCard({ product, dataSource }) {
    const profit = calculateProfit(product.cost_price, product.price)

    return (
        <div className="card product-card" style={{ position: 'relative' }}>
            {/* 赤字警告バッジ */}
            {profit?.isLoss && (
                <div style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    background: 'rgba(239, 68, 68, 0.9)',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 600,
                    zIndex: 10
                }}>
                    ⚠️ 赤字
                </div>
            )}
            {product.image ? (
                <img
                    src={product.image}
                    alt={product.name}
                    className="product-image"
                    onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                    }}
                />
            ) : null}
            <div className="product-image-placeholder" style={{ display: product.image ? 'none' : 'flex' }}>
                📦
            </div>
            <div className="product-info">
                <div className="product-name" title={product.name}>
                    {product.name}
                </div>
                <div className="product-price">
                    {formatPrice(product.price, product.currency)}
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                        ¥{twdToJpy(product.price || 0).toLocaleString()}
                    </div>
                </div>

                {/* 原価・利益表示 */}
                {product.cost_price > 0 && (
                    <div style={{
                        marginTop: 'var(--spacing-xs)',
                        padding: 'var(--spacing-xs)',
                        background: profit?.isLoss ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 'var(--font-size-xs)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--color-text-secondary)' }}>原価:</span>
                            <span>¥{product.cost_price.toLocaleString()}</span>
                        </div>
                        {profit && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--color-text-secondary)' }}>利益:</span>
                                <span style={{
                                    fontWeight: 600,
                                    color: profit.isLoss ? 'var(--color-error)' : 'var(--color-success)'
                                }}>
                                    ¥{profit.profitJpy.toLocaleString()}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                <div className="product-meta">
                    <span>在庫: {product.stock}</span>
                    <span className={`badge ${getStatusBadge(product.status).className}`}>
                        {getStatusBadge(product.status).label}
                    </span>
                </div>

                {/* 仕入れ先URL */}
                {product.source_url && (
                    <a
                        href={product.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'block',
                            marginTop: 'var(--spacing-xs)',
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--color-primary)',
                            textDecoration: 'none',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}
                        title={product.source_url}
                    >
                        🔗 仕入れ先
                    </a>
                )}

                {dataSource === 'd1' && (
                    <div style={{ marginTop: 'var(--spacing-sm)' }}>
                        <span className="d1-badge">
                            💾 D1保存済
                        </span>
                        {product.last_synced_at && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                                同期: {new Date(product.last_synced_at).toLocaleDateString('ja-JP')}
                            </span>
                        )}
                    </div>
                )}
                <div className="product-actions">
                    <Link
                        to={`/products/${product.id}`}
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1 }}
                    >
                        詳細
                    </Link>
                    <Link
                        to={`/products/edit/${product.id}`}
                        className="btn btn-primary btn-sm"
                        style={{ flex: 1 }}
                    >
                        編集
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default ProductList
