import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useShopeeAuth } from '../hooks/useShopeeAuth'
import { getCategories, uploadImage } from '../services/shopeeApi'

// 推奨価格計算用の定数
const COSTS = {
    YAMATO_JPY: 1350,
    SLS_TWD: 223,
    COMMISSION_RATE: 0.09,
    PROFIT_MARGIN: 0.20,
    TWD_JPY_RATE: 4.5
}

function NewProduct() {
    const navigate = useNavigate()
    const { accessToken, shopId, isConnected } = useShopeeAuth()

    // フォーム状態
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '', // 販売価格 (TWD)
        costPrice: '', // 原価 (JPY)
        stock: '',
        category: '',
        sku: '',
        weight: '1',
        images: [] // { id: string, url: string }[]
    })

    // UI状態
    const [categories, setCategories] = useState([])
    const [isLoadingCategories, setIsLoadingCategories] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [translating, setTranslating] = useState({ name: false, description: false })
    const [priceDetails, setPriceDetails] = useState(null)

    // カテゴリー取得
    useEffect(() => {
        if (isConnected && accessToken && shopId) {
            setIsLoadingCategories(true)
            getCategories(accessToken, shopId)
                .then(result => {
                    if (result.response && result.response.category_list) {
                        setCategories(result.response.category_list)
                    }
                })
                .catch(err => console.error('Category fetch error:', err))
                .finally(() => setIsLoadingCategories(false))
        }
    }, [isConnected, accessToken, shopId])

    // 価格計算ロジック
    useEffect(() => {
        const cost = parseFloat(formData.costPrice)
        if (!isNaN(cost) && cost > 0) {
            // JPYベースでのコスト計算
            const slsJpy = COSTS.SLS_TWD * COSTS.TWD_JPY_RATE
            const totalFixedCostJpy = cost + COSTS.YAMATO_JPY + slsJpy

            // 必要な売上高 (JPY) = 固定コスト / (1 - 利益率 - 手数料率)
            const revenueRate = 1 - COSTS.PROFIT_MARGIN - COSTS.COMMISSION_RATE // 0.71
            const recommendedPriceJpy = Math.ceil(totalFixedCostJpy / revenueRate)

            // TWD換算
            const recommendedPriceTwd = Math.ceil(recommendedPriceJpy / COSTS.TWD_JPY_RATE)

            // 詳細情報を作成
            setPriceDetails({
                baseCost: cost,
                shippingJpy: COSTS.YAMATO_JPY,
                slsJpy: Math.round(slsJpy),
                commissionJpy: Math.round(recommendedPriceJpy * COSTS.COMMISSION_RATE),
                profitJpy: Math.round(recommendedPriceJpy * COSTS.PROFIT_MARGIN),
                totalJpy: recommendedPriceJpy,
                finalTwd: recommendedPriceTwd
            })

            // 販売価格にセット (手動変更も可能)
            setFormData(prev => ({ ...prev, price: recommendedPriceTwd }))
        } else {
            setPriceDetails(null)
        }
    }, [formData.costPrice])

    const handleTranslate = async (field) => {
        const text = formData[field]
        if (!text) return

        setTranslating(prev => ({ ...prev, [field]: true }))
        try {
            const response = await fetch('/api/ai/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            })
            const result = await response.json()

            if (result.status === 'success') {
                setFormData(prev => ({ ...prev, [field]: result.translation }))
            } else {
                alert('翻訳エラー: ' + result.message)
            }
        } catch (e) {
            alert('翻訳エラーが発生しました')
        } finally {
            setTranslating(prev => ({ ...prev, [field]: false }))
        }
    }

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleImageUpload = async (e) => {
        const files = Array.from(e.target.files)
        if (files.length === 0) return

        setIsUploading(true)
        try {
            for (const file of files) {
                // Shopee APIへアップロード
                const result = await uploadImage(accessToken, shopId, file)
                if (result.response && result.response.image_info) {
                    const { image_id, image_url } = result.response.image_info
                    setFormData(prev => ({
                        ...prev,
                        images: [...prev.images, { id: image_id, url: image_url }]
                    }))
                } else {
                    console.error('Upload failed:', result)
                    alert(`画像のアップロードに失敗しました: ${file.name}`)
                }
            }
        } catch (err) {
            console.error('Upload error:', err)
            alert('画像アップロード中にエラーが発生しました')
        } finally {
            setIsUploading(false)
        }
    }

    const removeImage = (index) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }))
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        // TODO: 商品登録API呼び出し
        console.log('Submit:', formData)
        alert('商品登録APIはまだ実装されていません')
    }

    return (
        <div className="page-container animate-fade-in">
            <header className="page-header">
                <div>
                    <h1 className="page-title">新規出品</h1>
                    <p className="page-subtitle">Shopeeに新しい商品を出品します</p>
                </div>
            </header>

            {!isConnected ? (
                <div className="card">
                    <p>APIに接続されていません。設定ページで接続してください。</p>
                </div>
            ) : (
                <form onSubmit={handleSubmit}>
                    <div className="grid-2">
                        {/* 基本情報 */}
                        <div className="card">
                            <h3 className="card-title" style={{ marginBottom: 'var(--spacing-lg)' }}>基本情報</h3>

                            <div className="form-group">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <label className="form-label" style={{ marginBottom: 0 }}>商品名 *</label>
                                    <button
                                        type="button"
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => handleTranslate('name')}
                                        disabled={translating.name || !formData.name}
                                        style={{ fontSize: '0.75rem', padding: '2px 8px', height: 'auto' }}
                                    >
                                        {translating.name ? '翻訳中...' : '✨ AI翻訳 (台湾語)'}
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    name="name"
                                    className="form-input"
                                    placeholder="日本語で入力してAI翻訳できます"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <label className="form-label" style={{ marginBottom: 0 }}>商品説明</label>
                                    <button
                                        type="button"
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => handleTranslate('description')}
                                        disabled={translating.description || !formData.description}
                                        style={{ fontSize: '0.75rem', padding: '2px 8px', height: 'auto' }}
                                    >
                                        {translating.description ? '翻訳中...' : '✨ AI翻訳 (台湾語)'}
                                    </button>
                                </div>
                                <textarea
                                    name="description"
                                    className="form-input form-textarea"
                                    placeholder="日本語で詳細を入力..."
                                    value={formData.description}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">カテゴリ *</label>
                                <select
                                    name="category"
                                    className="form-input form-select"
                                    value={formData.category}
                                    onChange={handleChange}
                                    required
                                    disabled={isLoadingCategories}
                                >
                                    <option value="">
                                        {isLoadingCategories ? '読み込み中...' : 'カテゴリを選択'}
                                    </option>
                                    {/* APIから取得したカテゴリを表示 */}
                                    {categories.map((cat) => (
                                        <option key={cat.category_id} value={cat.category_id}>
                                            {cat.display_category_name}
                                        </option>
                                    ))}
                                    {categories.length === 0 && !isLoadingCategories && (
                                        <option disabled>カテゴリが見つかりません</option>
                                    )}
                                </select>
                            </div>
                        </div>

                        {/* 価格・在庫 */}
                        <div className="card">
                            <h3 className="card-title" style={{ marginBottom: 'var(--spacing-lg)' }}>価格計算・在庫</h3>

                            <div className="form-group">
                                <label className="form-label">仕入れ原価 (円)</label>
                                <input
                                    type="number"
                                    name="costPrice"
                                    className="form-input"
                                    placeholder="例: 5000"
                                    min="0"
                                    value={formData.costPrice}
                                    onChange={handleChange}
                                />
                                <small style={{ color: 'var(--color-text-secondary)' }}>
                                    ここに入力すると推奨販売価格が自動計算されます
                                </small>
                            </div>

                            {priceDetails && (
                                <div style={{
                                    background: 'var(--color-bg-tertiary)',
                                    padding: 'var(--spacing-md)',
                                    borderRadius: 'var(--radius-md)',
                                    marginBottom: 'var(--spacing-lg)',
                                    fontSize: 'var(--font-size-sm)'
                                }}>
                                    <div style={{ fontWeight: 600, marginBottom: '8px' }}>💰 推奨価格の内訳 (利益率20%)</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px' }}>
                                        <span>原価:</span> <span>¥{priceDetails.baseCost.toLocaleString()}</span>
                                        <span>送料(JP):</span> <span>¥{priceDetails.shippingJpy.toLocaleString()}</span>
                                        <span>送料(SLS):</span> <span>¥{priceDetails.slsJpy.toLocaleString()}</span>
                                        <span>手数料(9%):</span> <span>¥{priceDetails.commissionJpy.toLocaleString()}</span>
                                        <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>利益(20%):</span>
                                        <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>¥{priceDetails.profitJpy.toLocaleString()}</span>
                                    </div>
                                    <div style={{
                                        borderTop: '1px solid var(--color-border)',
                                        marginTop: '8px',
                                        paddingTop: '8px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        fontWeight: 700
                                    }}>
                                        <span>推奨価格 (TWD):</span>
                                        <span>NT${priceDetails.finalTwd.toLocaleString()}</span>
                                    </div>
                                </div>
                            )}

                            <div className="form-group">
                                <label className="form-label">販売価格 (TWD) *</label>
                                <input
                                    type="number"
                                    name="price"
                                    className="form-input"
                                    placeholder="0"
                                    min="0"
                                    value={formData.price}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">在庫数 *</label>
                                <input
                                    type="number"
                                    name="stock"
                                    className="form-input"
                                    placeholder="0"
                                    min="0"
                                    value={formData.stock}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">重量 (kg)</label>
                                <input
                                    type="number"
                                    name="weight"
                                    className="form-input"
                                    placeholder="1.0"
                                    min="0"
                                    step="0.1"
                                    value={formData.weight}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 画像アップロード */}
                    <div className="card" style={{ marginTop: 'var(--spacing-xl)' }}>
                        <h3 className="card-title" style={{ marginBottom: 'var(--spacing-lg)' }}>商品画像</h3>

                        <div className="upload-zone" style={{ position: 'relative' }}>
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleImageUpload}
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    opacity: 0,
                                    cursor: 'pointer'
                                }}
                            />
                            {isUploading ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <div style={{ animation: 'spin 1s linear infinite', fontSize: '24px', marginBottom: '8px' }}>🔄</div>
                                    <div>アップロード中...</div>
                                </div>
                            ) : (
                                <>
                                    <div className="upload-icon">📷</div>
                                    <p style={{ fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                                        画像をドラッグ＆ドロップ
                                    </p>
                                    <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                                        または<span style={{ color: 'var(--color-accent)' }}>クリックしてアップロード</span>
                                    </p>
                                </>
                            )}
                        </div>

                        {formData.images.length > 0 && (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                                gap: 'var(--spacing-md)',
                                marginTop: 'var(--spacing-lg)'
                            }}>
                                {formData.images.map((img, index) => (
                                    <div key={img.id || index} style={{ position: 'relative', aspectRatio: '1' }}>
                                        <img
                                            src={img.url}
                                            alt={`商品画像 ${index + 1}`}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                                borderRadius: 'var(--radius-md)',
                                                border: '1px solid var(--color-border)'
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeImage(index)}
                                            style={{
                                                position: 'absolute',
                                                top: -8,
                                                right: -8,
                                                width: 24,
                                                height: 24,
                                                borderRadius: '50%',
                                                background: 'red',
                                                color: 'white',
                                                border: 'none',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '12px'
                                            }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* アクションボタン */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 'var(--spacing-md)',
                        marginTop: 'var(--spacing-xl)'
                    }}>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => navigate('/products')}
                        >
                            キャンセル
                        </button>
                        <button type="submit" className="btn btn-primary btn-lg">
                            🚀 出品する
                        </button>
                    </div>
                </form>
            )}
            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    )
}

export default NewProduct
