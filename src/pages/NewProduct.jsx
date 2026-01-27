import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useShopeeAuth } from '../hooks/useShopeeAuth'
import { getCategories, uploadImage, addItem, getLogistics } from '../services/shopeeApi'

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
        category: '', // APIから自動取得
        sku: '',
        weight: '0.5',
        images: [] // { id: string, url: string, preview: string, file: File, status: 'uploading'|'done'|'error' }[]
    })

    // UI状態
    const [categories, setCategories] = useState([])
    const [logistics, setLogistics] = useState([])
    const [isLoadingCategories, setIsLoadingCategories] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [translating, setTranslating] = useState({ name: false, description: false })
    const [priceDetails, setPriceDetails] = useState(null)

    // カテゴリー＆物流取得
    useEffect(() => {
        if (isConnected && accessToken && shopId) {
            setIsLoadingCategories(true)

            // カテゴリー取得
            // カテゴリー取得
            getCategories(accessToken, shopId)
                .then(result => {
                    if (result.response && result.response.category_list) {
                        const allCats = result.response.category_list

                        // フィギュア関連を優先的に表示
                        const figureKeywords = /Figure|Toy|Hobby|Action Figure|公仔|模型|手辦/i
                        const figureCats = allCats.filter(c => figureKeywords.test(c.display_category_name))
                        const otherCats = allCats.filter(c => !figureKeywords.test(c.display_category_name))

                        // カテゴリリストを並び替え
                        setCategories([...figureCats, ...otherCats])

                        // 有効なカテゴリを選択 (フィギュア関連があればその先頭、なければ全リストの先頭)
                        // ユーザー指定ID (11041646) がリストにある場合のみ、それを優先することも可能だが
                        // invalidと言われているので、APIから返ってきた確実なIDを使う方が安全
                        if (!formData.category) {
                            const defaultCat = figureCats.length > 0 ? figureCats[0] : allCats[0]
                            if (defaultCat) {
                                setFormData(prev => ({ ...prev, category: defaultCat.category_id }))
                            }
                        }
                    }
                })
                .catch(err => console.error('Category fetch error:', err))
                .finally(() => setIsLoadingCategories(false))

            // 物流チャンネル取得
            getLogistics(accessToken, shopId)
                .then(result => {
                    if (result.response && result.response.logistics_channel_list) {
                        setLogistics(result.response.logistics_channel_list)
                        console.log("Logistics channels:", result.response.logistics_channel_list)
                    }
                })
                .catch(err => console.error('Logistics fetch error:', err))
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

            setPriceDetails({
                baseCost: cost,
                shippingJpy: COSTS.YAMATO_JPY,
                slsJpy: Math.round(slsJpy),
                commissionJpy: Math.round(recommendedPriceJpy * COSTS.COMMISSION_RATE),
                profitJpy: Math.round(recommendedPriceJpy * COSTS.PROFIT_MARGIN),
                totalJpy: recommendedPriceJpy,
                finalTwd: recommendedPriceTwd
            })

            // 自動入力
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

        // まずプレビュー表示用にオブジェクト作成
        const newImages = files.map(file => ({
            file,
            preview: URL.createObjectURL(file), // 即時プレビュー
            id: null,
            url: null,
            status: 'uploading'
        }))

        setFormData(prev => ({
            ...prev,
            images: [...prev.images, ...newImages]
        }))

        try {
            // 順次アップロード
            const updatedImages = [...formData.images, ...newImages]
            // 新しく追加された画像のインデックス範囲
            const startIndex = formData.images.length

            for (let i = startIndex; i < updatedImages.length; i++) {
                const img = updatedImages[i]
                if (img.status === 'uploading' && img.file) {
                    try {
                        const result = await uploadImage(accessToken, shopId, img.file)
                        if (result.response && result.response.image_info) {
                            updatedImages[i] = {
                                ...img,
                                id: result.response.image_info.image_id,
                                url: result.response.image_info.image_url,
                                status: 'done'
                            }
                            setFormData(prev => ({ ...prev, images: [...updatedImages] }))
                        } else {
                            updatedImages[i] = { ...img, status: 'error' }
                            setFormData(prev => ({ ...prev, images: [...updatedImages] }))
                        }
                    } catch (e) {
                        updatedImages[i] = { ...img, status: 'error' }
                        setFormData(prev => ({ ...prev, images: [...updatedImages] }))
                    }
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

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (isSubmitting) return

        // バリデーション
        if (!formData.category) {
            alert('カテゴリを選択してください')
            return
        }

        const validImages = formData.images.filter(img => img.status === 'done' && img.id)
        if (validImages.length === 0) {
            alert('画像を少なくとも1枚アップロードしてください（アップロード待ちの場合は完了までお待ちください）')
            return
        }

        setIsSubmitting(true)

        try {
            const imageIdList = validImages.map(img => img.id)

            // 物流情報構築: ショップで有効なものを全て有効化
            // API取得できていない場合は空配列になり、これだとエラーになる可能性が高い
            // ユーザーはSLS必須と言っている
            const logisticInfoPayload = logistics
                .filter(l => l.enabled)
                .map(l => ({
                    logistic_id: l.logistic_id,
                    enabled: true
                }))

            // 価格はオリジナルと販売価格を同じにする（セールなどは別途設定）
            const finalPrice = parseFloat(formData.price)

            const payload = {
                item_name: formData.name,
                description: formData.description,
                original_price: finalPrice,
                price: finalPrice, // 追加: V2 APIではこれも必要
                normal_stock: parseInt(formData.stock),
                category_id: parseInt(formData.category),
                weight: parseFloat(formData.weight),
                image: {
                    image_id_list: imageIdList
                },
                logistic_info: logisticInfoPayload,
                attribute_list: [] // 必須属性がある場合エラーになるが、まずは空で送る
            }

            console.log("Submitting payload:", payload)

            const result = await addItem(accessToken, shopId, payload)

            if (result.error) {
                // エラーメッセージを見やすく表示
                alert(`出品エラー: ${result.message || result.error}\n\n(Shopeeのバリデーションエラーの可能性があります。必須項目が不足している場合は、詳細エラーを確認してください)`)
                console.error("Add Item Error:", result)
            } else {
                alert('✅ 出品に成功しました！')
                navigate('/products')
            }
        } catch (e) {
            alert(`出品エラー: ${e.message}`)
            console.error(e)
        } finally {
            setIsSubmitting(false)
        }
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
                                {/* カテゴリIDがリストにない場合の警告などは特に出さず、強制的に選択肢に入れる */}
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
                                    {categories.map((cat) => (
                                        <option key={cat.category_id} value={cat.category_id}>
                                            {/Figure|Toy|Hobby|公仔|模型/i.test(cat.display_category_name) ? '★ ' : ''}
                                            {cat.display_category_name}
                                        </option>
                                    ))}
                                    {categories.length === 0 && !isLoadingCategories && (
                                        <option value={formData.category}>{formData.category} (Default)</option>
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
                                    placeholder="0.5"
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
                                    <div key={index} style={{ position: 'relative', aspectRatio: '1' }}>
                                        {/* プレビュー表示 */}
                                        <img
                                            src={img.preview || img.url}
                                            alt={`商品画像 ${index + 1}`}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                                borderRadius: 'var(--radius-md)',
                                                border: '1px solid var(--color-border)',
                                                opacity: img.status === 'uploading' ? 0.5 : 1
                                            }}
                                        />
                                        {img.status === 'uploading' && (
                                            <div style={{
                                                position: 'absolute',
                                                inset: 0,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '20px'
                                            }}>
                                                🔄
                                            </div>
                                        )}
                                        {img.status === 'error' && (
                                            <div style={{
                                                position: 'absolute',
                                                inset: 0,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                background: 'rgba(255,0,0,0.2)',
                                                color: 'red',
                                                fontWeight: 'bold'
                                            }}>
                                                !
                                            </div>
                                        )}
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
                            disabled={isSubmitting}
                        >
                            キャンセル
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary btn-lg"
                            disabled={isSubmitting || isUploading}
                        >
                            {isSubmitting ? '出品中...' : '🚀 出品する'}
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
