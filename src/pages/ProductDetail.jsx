import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useShopeeAuth } from '../hooks/useShopeeAuth'
import { formatPrice, getStatusBadge } from '../services/shopeeApi'

function ProductDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { accessToken, shopId, isConnected } = useShopeeAuth()

    const [product, setProduct] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        if (!isConnected || !accessToken || !shopId || !id) {
            setIsLoading(false)
            return
        }

        const fetchProductDetail = async () => {
            setIsLoading(true)
            setError(null)

            try {
                // Shopee APIから商品詳細を取得
                const response = await fetch(
                    `/api/shopee/products?access_token=${accessToken}&shop_id=${shopId}&item_id=${id}`
                )
                const result = await response.json()

                if (result.status === 'success' && result.data?.products?.length > 0) {
                    setProduct(result.data.products[0])
                } else if (result.status === 'success' && result.data?.product) {
                    setProduct(result.data.product)
                } else {
                    // D1から取得を試みる
                    const dbResponse = await fetch(`/api/db/products?item_id=${id}&shop_id=${shopId}`)
                    const dbResult = await dbResponse.json()
                    if (dbResult.status === 'success' && dbResult.data?.products?.length > 0) {
                        const p = dbResult.data.products[0]
                        setProduct({
                            id: p.item_id || p.id,
                            name: p.item_name,
                            description: p.description,
                            price: p.current_price || p.original_price,
                            originalPrice: p.original_price,
                            currency: p.currency || 'TWD',
                            stock: p.stock,
                            status: mapDbStatus(p.item_status),
                            image: p.image_url,
                            images: p.image_url_list ? JSON.parse(p.image_url_list) : [],
                            sold: p.sold,
                            views: p.views,
                            likes: p.likes,
                            rating_star: p.rating_star,
                            create_time: p.create_time,
                            update_time: p.update_time,
                            category_id: p.category_id,
                            item_sku: p.item_sku
                        })
                    } else {
                        setError('商品が見つかりませんでした')
                    }
                }
            } catch (e) {
                setError(e.message || 'エラーが発生しました')
            } finally {
                setIsLoading(false)
            }
        }

        fetchProductDetail()
    }, [isConnected, accessToken, shopId, id])

    // D1ステータスマッピング
    function mapDbStatus(status) {
        const statusMap = {
            'NORMAL': 'active',
            'BANNED': 'banned',
            'DELETED': 'deleted',
            'UNLIST': 'inactive'
        }
        return statusMap[status] || 'active'
    }

    if (!isConnected) {
        return (
            <div className="page-container animate-fade-in">
                <header className="page-header">
                    <div>
                        <h1 className="page-title">商品詳細</h1>
                        <p className="page-subtitle">Shopee APIに接続してください</p>
                    </div>
                </header>
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-icon">🔗</div>
                        <div className="empty-title">API未接続</div>
                        <p>商品詳細を表示するには、まず設定ページでShopee APIに接続してください。</p>
                        <Link to="/settings" className="btn btn-primary" style={{ marginTop: 'var(--spacing-lg)' }}>
                            ⚙️ 設定へ移動
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="page-container animate-fade-in">
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-icon" style={{ animation: 'spin 1s linear infinite' }}>🔄</div>
                        <div className="empty-title">読み込み中...</div>
                    </div>
                </div>
            </div>
        )
    }

    if (error || !product) {
        return (
            <div className="page-container animate-fade-in">
                <header className="page-header">
                    <div>
                        <h1 className="page-title">商品詳細</h1>
                    </div>
                    <button className="btn btn-secondary" onClick={() => navigate(-1)}>
                        ← 戻る
                    </button>
                </header>
                <div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                    <div className="empty-state">
                        <div className="empty-icon">❌</div>
                        <div className="empty-title">{error || '商品が見つかりませんでした'}</div>
                        <Link to="/products" className="btn btn-primary" style={{ marginTop: 'var(--spacing-lg)' }}>
                            📦 商品一覧に戻る
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    const status = getStatusBadge(product.status)

    return (
        <div className="page-container animate-fade-in">
            <header className="page-header">
                <div>
                    <h1 className="page-title">商品詳細</h1>
                    <p className="page-subtitle">ID: {product.id}</p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                    <button className="btn btn-secondary" onClick={() => navigate(-1)}>
                        ← 戻る
                    </button>
                    <Link to={`/products/edit/${product.id}`} className="btn btn-primary">
                        ✏️ 編集
                    </Link>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--spacing-xl)' }}>
                {/* 商品画像 */}
                <div className="card">
                    {product.image ? (
                        <img
                            src={product.image}
                            alt={product.name}
                            style={{
                                width: '100%',
                                borderRadius: 'var(--radius-md)',
                                marginBottom: 'var(--spacing-md)'
                            }}
                        />
                    ) : (
                        <div style={{
                            width: '100%',
                            height: 300,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'var(--color-bg-secondary)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '4rem',
                            marginBottom: 'var(--spacing-md)'
                        }}>
                            📦
                        </div>
                    )}

                    {/* サブ画像 */}
                    {product.images && product.images.length > 1 && (
                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                            {product.images.slice(0, 6).map((img, idx) => (
                                <img
                                    key={idx}
                                    src={img}
                                    alt={`${product.name} - ${idx + 1}`}
                                    style={{
                                        width: 60,
                                        height: 60,
                                        objectFit: 'cover',
                                        borderRadius: 'var(--radius-sm)',
                                        cursor: 'pointer',
                                        border: '2px solid var(--color-border)'
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* 商品情報 */}
                <div className="card">
                    <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                        <span className={`badge ${status.className}`} style={{ marginBottom: 'var(--spacing-md)' }}>
                            {status.label}
                        </span>
                        <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700, marginBottom: 'var(--spacing-sm)' }}>
                            {product.name}
                        </h2>
                        {product.item_sku && (
                            <div style={{ color: 'var(--color-text-secondary)' }}>
                                SKU: {product.item_sku}
                            </div>
                        )}
                    </div>

                    {/* 価格 */}
                    <div style={{
                        padding: 'var(--spacing-lg)',
                        background: 'var(--color-bg-glass)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--spacing-lg)'
                    }}>
                        <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700, color: 'var(--color-accent-light)' }}>
                            {formatPrice(product.price, product.currency)}
                        </div>
                        {product.originalPrice && product.originalPrice !== product.price && (
                            <div style={{
                                color: 'var(--color-text-secondary)',
                                textDecoration: 'line-through',
                                fontSize: 'var(--font-size-lg)'
                            }}>
                                {formatPrice(product.originalPrice, product.currency)}
                            </div>
                        )}
                    </div>

                    {/* 統計情報 */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: 'var(--spacing-md)',
                        marginBottom: 'var(--spacing-lg)'
                    }}>
                        <div style={{ textAlign: 'center', padding: 'var(--spacing-md)', background: 'var(--color-bg-glass)', borderRadius: 'var(--radius-md)' }}>
                            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>{product.stock || 0}</div>
                            <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>在庫</div>
                        </div>
                        <div style={{ textAlign: 'center', padding: 'var(--spacing-md)', background: 'var(--color-bg-glass)', borderRadius: 'var(--radius-md)' }}>
                            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>{product.sold || 0}</div>
                            <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>販売数</div>
                        </div>
                        <div style={{ textAlign: 'center', padding: 'var(--spacing-md)', background: 'var(--color-bg-glass)', borderRadius: 'var(--radius-md)' }}>
                            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>{product.views || 0}</div>
                            <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>閲覧数</div>
                        </div>
                        <div style={{ textAlign: 'center', padding: 'var(--spacing-md)', background: 'var(--color-bg-glass)', borderRadius: 'var(--radius-md)' }}>
                            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>{product.likes || 0}</div>
                            <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>いいね</div>
                        </div>
                    </div>

                    {/* 説明 */}
                    {product.description && (
                        <div>
                            <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>商品説明</h3>
                            <div style={{
                                padding: 'var(--spacing-md)',
                                background: 'var(--color-bg-glass)',
                                borderRadius: 'var(--radius-md)',
                                whiteSpace: 'pre-wrap',
                                maxHeight: 300,
                                overflow: 'auto'
                            }}>
                                {product.description}
                            </div>
                        </div>
                    )}

                    {/* 更新情報 */}
                    <div style={{
                        marginTop: 'var(--spacing-xl)',
                        paddingTop: 'var(--spacing-lg)',
                        borderTop: '1px solid var(--color-border)',
                        color: 'var(--color-text-secondary)',
                        fontSize: 'var(--font-size-sm)'
                    }}>
                        {product.create_time && (
                            <div>作成日: {new Date(product.create_time * 1000).toLocaleDateString('ja-JP')}</div>
                        )}
                        {product.update_time && (
                            <div>更新日: {new Date(product.update_time * 1000).toLocaleDateString('ja-JP')}</div>
                        )}
                        {product.category_id && (
                            <div>カテゴリID: {product.category_id}</div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    )
}

export default ProductDetail
