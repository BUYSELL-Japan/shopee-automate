import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useShopeeAuth } from '../hooks/useShopeeAuth'
import { formatPrice, updateShopeeProduct, updateDbProduct } from '../services/shopeeApi'

function ProductEdit() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { accessToken, shopId, isConnected } = useShopeeAuth()

    const [product, setProduct] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState(null)
    const [saveMessage, setSaveMessage] = useState(null)

    // フォームデータ
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        stock: '',
        notes: '',
        cost_price: '',
        source_url: ''
    })

    useEffect(() => {
        if (!isConnected || !accessToken || !shopId || !id) {
            setIsLoading(false)
            return
        }

        const fetchProduct = async () => {
            setIsLoading(true)
            setError(null)

            try {
                // まずD1から取得を試みる
                const dbResponse = await fetch(`/api/db/products?item_id=${id}&shop_id=${shopId}`)
                const dbResult = await dbResponse.json()

                if (dbResult.status === 'success' && dbResult.data?.products?.length > 0) {
                    const p = dbResult.data.products[0]
                    setProduct(p)
                    setFormData({
                        name: p.item_name || '',
                        description: p.description || '',
                        price: p.current_price || p.original_price || '',
                        stock: p.stock || 0,
                        notes: p.notes || '',
                        cost_price: p.cost_price || '',
                        source_url: p.source_url || ''
                    })
                } else {
                    // Shopee APIから取得
                    const response = await fetch(
                        `/api/shopee/products?access_token=${accessToken}&shop_id=${shopId}&item_id=${id}`
                    )
                    const result = await response.json()

                    if (result.status === 'success' && result.data?.products?.length > 0) {
                        const p = result.data.products[0]
                        setProduct(p)
                        setFormData({
                            name: p.name || '',
                            description: p.description || '',
                            price: p.price || '',
                            stock: p.stock || 0,
                            notes: '',
                            cost_price: '',
                            source_url: ''
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

        fetchProduct()
    }, [isConnected, accessToken, shopId, id])

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSave = async () => {
        if (!product) return

        setIsSaving(true)
        setSaveMessage(null)

        const itemId = product.item_id || product.id || id
        const updates = {
            item_name: formData.name,
            description: formData.description,
            price: parseFloat(formData.price) || 0,
            stock: parseInt(formData.stock) || 0
        }

        try {
            // 1. Shopee APIに送信（価格・在庫・商品情報）
            const shopeeResult = await updateShopeeProduct(accessToken, shopId, itemId, updates)

            if (shopeeResult.status === 'success' || shopeeResult.status === 'partial_error') {
                // 2. D1にも保存
                const d1Result = await updateDbProduct({
                    item_id: parseInt(itemId),
                    shop_id: parseInt(shopId),
                    item_name: formData.name,
                    description: formData.description,
                    current_price: updates.price,
                    stock: updates.stock,
                    notes: formData.notes,
                    cost_price: parseFloat(formData.cost_price) || null,
                    source_url: formData.source_url || null
                })

                if (shopeeResult.status === 'partial_error') {
                    // 部分的に成功
                    const errors = Object.entries(shopeeResult.data || {})
                        .filter(([key, val]) => val?.error)
                        .map(([key, val]) => `${key}: ${val.message || val.error}`)
                        .join(', ')
                    setSaveMessage({
                        type: 'warning',
                        text: `⚠️ Shopee一部更新失敗: ${errors}`
                    })
                } else {
                    setSaveMessage({ type: 'success', text: '✅ ShopeeとD1に保存しました！' })
                }
            } else {
                // Shopee APIエラー
                setSaveMessage({
                    type: 'error',
                    text: `❌ Shopee更新エラー: ${shopeeResult.message}`
                })
            }
        } catch (e) {
            setSaveMessage({ type: 'error', text: `❌ エラー: ${e.message}` })
        } finally {
            setIsSaving(false)
        }
    }

    if (!isConnected) {
        return (
            <div className="page-container animate-fade-in">
                <header className="page-header">
                    <div>
                        <h1 className="page-title">商品編集</h1>
                        <p className="page-subtitle">Shopee APIに接続してください</p>
                    </div>
                </header>
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-icon">🔗</div>
                        <div className="empty-title">API未接続</div>
                        <p>商品を編集するには、まず設定ページでShopee APIに接続してください。</p>
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
                        <h1 className="page-title">商品編集</h1>
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

    return (
        <div className="page-container animate-fade-in">
            <header className="page-header">
                <div>
                    <h1 className="page-title">商品編集</h1>
                    <p className="page-subtitle">ID: {product.item_id || product.id || id}</p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                    <button className="btn btn-secondary" onClick={() => navigate(-1)}>
                        ← 戻る
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? '⏳ 保存中...' : '💾 保存'}
                    </button>
                </div>
            </header>

            {saveMessage && (
                <div
                    className="card"
                    style={{
                        marginBottom: 'var(--spacing-lg)',
                        background: saveMessage.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: saveMessage.type === 'success' ? 'var(--color-success)' : 'var(--color-error)'
                    }}
                >
                    {saveMessage.text}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--spacing-xl)' }}>
                {/* 商品画像 */}
                <div className="card">
                    {(product.image_url || product.image) ? (
                        <img
                            src={product.image_url || product.image}
                            alt={formData.name}
                            style={{
                                width: '100%',
                                borderRadius: 'var(--radius-md)'
                            }}
                        />
                    ) : (
                        <div style={{
                            width: '100%',
                            height: 200,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'var(--color-bg-secondary)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '3rem'
                        }}>
                            📦
                        </div>
                    )}

                    <div style={{ marginTop: 'var(--spacing-lg)', padding: 'var(--spacing-md)', background: 'var(--color-bg-glass)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>現在の価格</div>
                        <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-accent-light)' }}>
                            {formatPrice(product.current_price || product.price, product.currency || 'TWD')}
                        </div>
                    </div>

                    <div style={{ marginTop: 'var(--spacing-md)', padding: 'var(--spacing-md)', background: 'var(--color-bg-glass)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>在庫数</div>
                        <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600 }}>
                            {product.stock || 0} 個
                        </div>
                    </div>
                </div>

                {/* 編集フォーム */}
                <div className="card">
                    <h3 style={{ marginBottom: 'var(--spacing-lg)' }}>📝 商品情報を編集</h3>

                    <div className="form-group">
                        <label className="form-label">商品名</label>
                        <input
                            type="text"
                            name="name"
                            className="form-input"
                            value={formData.name}
                            onChange={handleInputChange}
                            placeholder="商品名を入力"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">説明</label>
                        <textarea
                            name="description"
                            className="form-input"
                            rows={5}
                            value={formData.description}
                            onChange={handleInputChange}
                            placeholder="商品説明を入力"
                            style={{ resize: 'vertical' }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
                        <div className="form-group">
                            <label className="form-label">価格 (NT$)</label>
                            <input
                                type="number"
                                name="price"
                                className="form-input"
                                value={formData.price}
                                onChange={handleInputChange}
                                placeholder="0"
                                min="0"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">在庫数</label>
                            <input
                                type="number"
                                name="stock"
                                className="form-input"
                                value={formData.stock}
                                onChange={handleInputChange}
                                placeholder="0"
                                min="0"
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
                        <div className="form-group">
                            <label className="form-label">仕入れ原価 (¥)</label>
                            <input
                                type="number"
                                name="cost_price"
                                className="form-input"
                                value={formData.cost_price}
                                onChange={handleInputChange}
                                placeholder="平均仕入れ価格"
                                min="0"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                🔗 仕入れ先URL
                            </label>
                            <input
                                type="url"
                                name="source_url"
                                className="form-input"
                                value={formData.source_url}
                                onChange={handleInputChange}
                                placeholder="https://..."
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">メモ（内部用）</label>
                        <textarea
                            name="notes"
                            className="form-input"
                            rows={3}
                            value={formData.notes}
                            onChange={handleInputChange}
                            placeholder="仕入れ先、コストなど内部用のメモ"
                            style={{ resize: 'vertical' }}
                        />
                    </div>

                    <div style={{
                        marginTop: 'var(--spacing-xl)',
                        padding: 'var(--spacing-md)',
                        background: 'rgba(245, 158, 11, 0.1)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-text-secondary)'
                    }}>
                        ⚠️ 注意: 変更はD1データベースに保存されます。Shopeeへの反映は別途同期が必要です。
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

export default ProductEdit
