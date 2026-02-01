import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useShopeeAuth } from '../hooks/useShopeeAuth'
import { formatPrice, getStatusBadge, getItemDetail } from '../services/shopeeApi'

function ProductDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { accessToken, shopId, isConnected } = useShopeeAuth()

    const [product, setProduct] = useState(null)
    const [rawApiResponse, setRawApiResponse] = useState(null) // 生APIレスポンス
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
                // Shopee item_detail APIから詳細を取得
                console.log('=== Fetching Product Detail ===')
                console.log('Item ID:', id)
                console.log('Shop ID:', shopId)

                const result = await getItemDetail(accessToken, shopId, id)

                // 完全なAPIレスポンスをコンソールに出力
                console.log('=== FULL API RESPONSE ===')
                console.log(JSON.stringify(result, null, 2))
                console.log('=========================')

                setRawApiResponse(result)

                if (result.response && result.response.item_list && result.response.item_list.length > 0) {
                    const item = result.response.item_list[0]

                    // 属性情報をログ出力
                    console.log('=== ATTRIBUTE LIST ===')
                    console.log(JSON.stringify(item.attribute_list, null, 2))
                    console.log('======================')

                    // ブランド情報をログ出力
                    console.log('=== BRAND INFO ===')
                    console.log('Brand ID:', item.brand?.brand_id)
                    console.log('Brand Name:', item.brand?.original_brand_name)
                    console.log('==================')

                    // カテゴリ情報をログ出力
                    console.log('=== CATEGORY INFO ===')
                    console.log('Category ID:', item.category_id)
                    console.log('=====================')

                    setProduct({
                        id: item.item_id,
                        name: item.item_name,
                        description: item.description,
                        price: item.price_info?.[0]?.current_price || item.price_info?.[0]?.original_price,
                        originalPrice: item.price_info?.[0]?.original_price,
                        currency: item.price_info?.[0]?.currency || 'TWD',
                        stock: item.stock_info_v2?.summary_info?.total_available_stock || item.stock_info?.[0]?.current_stock,
                        status: mapApiStatus(item.item_status),
                        image: item.image?.image_url_list?.[0],
                        images: item.image?.image_url_list || [],
                        sold: item.sold || 0,
                        views: item.views || 0,
                        likes: item.likes || 0,
                        rating_star: item.rating_star,
                        create_time: item.create_time,
                        update_time: item.update_time,
                        category_id: item.category_id,
                        item_sku: item.item_sku,
                        // 追加情報
                        brand: item.brand,
                        attribute_list: item.attribute_list,
                        logistic_info: item.logistic_info,
                        weight: item.weight,
                        dimension: item.dimension,
                        condition: item.condition
                    })
                } else {
                    // フォールバック: D1から取得
                    const dbResponse = await fetch(`/api/db/products?item_id=${id}&shop_id=${shopId}`)
                    const dbResult = await dbResponse.json()
                    console.log('=== D1 RESPONSE ===')
                    console.log(JSON.stringify(dbResult, null, 2))
                    console.log('===================')

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
                console.error('Fetch error:', e)
                setError(e.message || 'エラーが発生しました')
            } finally {
                setIsLoading(false)
            }
        }

        fetchProductDetail()
    }, [isConnected, accessToken, shopId, id])

    // APIステータスマッピング
    function mapApiStatus(status) {
        const statusMap = {
            'NORMAL': 'active',
            'BANNED': 'banned',
            'DELETED': 'deleted',
            'UNLIST': 'inactive'
        }
        return statusMap[status] || 'active'
    }

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
