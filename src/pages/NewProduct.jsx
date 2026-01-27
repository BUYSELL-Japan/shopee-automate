import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useShopeeAuth } from '../hooks/useShopeeAuth'
import { getCategories, uploadImage, addItem, getLogistics, getProducts, getItemDetail } from '../services/shopeeApi'

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
        category: '', // 自動検出
        sku: '',
        weight: '0.5',
        images: [] // { id: string, url: string, preview: string, file: File, status: 'uploading'|'done'|'error' }[]
    })

    // UI状態
    const [categories, setCategories] = useState([])
    const [logistics, setLogistics] = useState([])
    const [isLoadingCategories, setIsLoadingCategories] = useState(false)
    const [detectedCategory, setDetectedCategory] = useState(null)
    const [isUploading, setIsUploading] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [translating, setTranslating] = useState({ name: false, description: false })
    const [priceDetails, setPriceDetails] = useState(null)

    // 既存商品コピー用
    const [sourceItemId, setSourceItemId] = useState('47000206128')
    const [isFetchingSource, setIsFetchingSource] = useState(false)

    // カテゴリー＆物流取得
    useEffect(() => {
        if (isConnected && accessToken && shopId) {
            setIsLoadingCategories(true)

            // 1. カテゴリー一覧取得
            const fetchCats = getCategories(accessToken, shopId)

            // 2. 既存商品から実績のあるカテゴリIDを取得
            const fetchExisting = getProducts(accessToken, shopId, { pageSize: 50 })

            Promise.all([fetchCats, fetchExisting])
                .then(([catResult, prodResult]) => {
                    let allCats = []
                    if (catResult.response && catResult.response.category_list) {
                        allCats = catResult.response.category_list
                    }

                    // 既存商品から有効IDを探す (自動検出)
                    let foundId = null
                    if (prodResult.response && prodResult.response.item_list) {
                        const items = prodResult.response.item_list
                        const targetItem = items.find(item =>
                            /Figure|Toy|Hobby|Action|Gundam|公仔|模型|手辦/i.test(item.item_name) && item.category_id
                        )
                        if (targetItem) {
                            foundId = targetItem.category_id
                            console.log("Auto-detected category ID:", foundId, "from", targetItem.item_name)
                            setDetectedCategory({ id: foundId, source: targetItem.item_name, name: `(検出: ${targetItem.item_name.substring(0, 15)}...)` })
                        }
                    }

                    // リスト表示用フィルタ
                    const figureKeywords = /Figure|Toy|Hobby|Action Figure|公仔|模型|手辦/i
                    const figureCats = allCats.filter(c => figureKeywords.test(c.display_category_name))
                    const otherCats = allCats.filter(c => !figureKeywords.test(c.display_category_name))

                    if (foundId && !allCats.find(c => c.category_id === foundId)) {
                        allCats.unshift({
                            category_id: foundId,
                            display_category_name: `★ Detected ID: ${foundId}`
                        })
                    }

                    setCategories(allCats)

                    if (!formData.category) {
                        if (foundId) {
                            setFormData(prev => ({ ...prev, category: foundId }))
                        } else if (figureCats.length > 0) {
                            setFormData(prev => ({ ...prev, category: figureCats[0].category_id }))
                        }
                    }
                })
                .catch(err => console.error('Data fetch error:', err))
                .finally(() => setIsLoadingCategories(false))

            // 物流チャンネル取得
            getLogistics(accessToken, shopId)
                .then(result => {
                    if (result.response && result.response.logistics_channel_list) {
                        setLogistics(result.response.logistics_channel_list)
                    }
                })
                .catch(err => console.error('Logistics fetch error:', err))
        }
    }, [isConnected, accessToken, shopId])

    // 価格計算ロジック
    useEffect(() => {
        const cost = parseFloat(formData.costPrice)
        if (!isNaN(cost) && cost > 0) {
            const slsJpy = COSTS.SLS_TWD * COSTS.TWD_JPY_RATE
            const totalFixedCostJpy = cost + COSTS.YAMATO_JPY + slsJpy
            const revenueRate = 1 - COSTS.PROFIT_MARGIN - COSTS.COMMISSION_RATE
            const recommendedPriceJpy = Math.ceil(totalFixedCostJpy / revenueRate)
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

    // 既存商品情報取得
    const handleFetchSourceItem = async () => {
        if (!sourceItemId || !accessToken || !shopId) return
        setIsFetchingSource(true)
        try {
            const result = await getItemDetail(accessToken, shopId, sourceItemId)
            // レスポンス構造確認 (item_list [ { item_id, category_id, ... } ])
            if (result.response && result.response.item_list && result.response.item_list.length > 0) {
                const item = result.response.item_list[0]
                console.log("Source item details:", item)

                if (item.category_id) {
                    setFormData(prev => ({ ...prev, category: item.category_id }))
                    // リストになければ追加
                    setCategories(prev => {
                        if (!prev.find(c => c.category_id === item.category_id)) {
                            return [{ category_id: item.category_id, display_category_name: `★ Copy from ${sourceItemId} (ID: ${item.category_id})` }, ...prev]
                        }
                        return prev
                    })
                    setDetectedCategory({ id: item.category_id, name: `(コピー元: ${item.item_name.substring(0, 10)}...)` })
                    alert(`既存商品からカテゴリID: ${item.category_id} を取得・設定しました！此のIDで出品します。`)
                } else {
                    alert('指定された商品のカテゴリID情報を取得できませんでした。')
                }
            } else {
                alert('商品情報の取得に失敗しました。IDが正しいか確認してください。')
            }
        } catch (e) {
            console.error(e)
            alert('取得中にエラーが発生しました')
        } finally {
            setIsFetchingSource(false)
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
        const newImages = files.map(file => ({
            file,
            preview: URL.createObjectURL(file),
            id: null,
            url: null,
            status: 'uploading'
        }))
        setFormData(prev => ({ ...prev, images: [...prev.images, ...newImages] }))

        try {
            const updatedImages = [...formData.images, ...newImages]
            const startIndex = formData.images.length
            for (let i = startIndex; i < updatedImages.length; i++) {
                const img = updatedImages[i]
                if (img.status === 'uploading' && img.file) {
                    try {
                        const result = await uploadImage(accessToken, shopId, img.file)
                        if (result.response && result.response.image_info) {
                            updatedImages[i] = { ...img, id: result.response.image_info.image_id, url: result.response.image_info.image_url, status: 'done' }
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
        setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (isSubmitting) return

        if (!formData.category) {
            alert('カテゴリを選択してください')
            return
        }

        const validImages = formData.images.filter(img => img.status === 'done' && img.id)
        if (validImages.length === 0) {
            alert('画像を少なくとも1枚アップロードしてください')
            return
        }

        setIsSubmitting(true)

        try {
            const imageIdList = validImages.map(img => img.id)
            const logisticInfoPayload = logistics
                .filter(l => l.enabled)
                .map(l => ({ logistic_id: l.logistic_id, enabled: true }))
            const finalPrice = parseFloat(formData.price)

            const payload = {
                item_name: formData.name,
                description: formData.description,
                original_price: finalPrice,
                price: finalPrice,
                normal_stock: parseInt(formData.stock),
                category_id: parseInt(formData.category),
                weight: parseFloat(formData.weight),
                image: { image_id_list: imageIdList },
                logistic_info: logisticInfoPayload,
                attribute_list: []
            }

            console.log("Submitting payload:", payload)
            const result = await addItem(accessToken, shopId, payload)

            if (result.error) {
                alert(`出品エラー: ${result.message || result.error}\n\n(詳細エラーを確認してください)`)
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
                        <div className="card">
                            <h3 className="card-title" style={{ marginBottom: 'var(--spacing-lg)' }}>基本情報</h3>

                            {/* 既存商品からコピー UI */}
                            <div style={{ background: 'var(--color-bg-tertiary)', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '20px', border: '1px solid var(--color-border)' }}>
                                <label style={{ fontSize: '0.85em', fontWeight: 600, marginBottom: '8px', display: 'block', color: 'var(--color-text-secondary)' }}>
                                    🔧 既存の商品IDから設定をコピー (デバッグ用)
                                </label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        type="text"
                                        className="form-input"
                                        style={{ height: '36px', fontSize: '13px' }}
                                        placeholder="Item ID (例: 47000206128)"
                                        value={sourceItemId}
                                        onChange={(e) => setSourceItemId(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        style={{ height: '36px', padding: '0 16px', fontSize: '13px', whiteSpace: 'nowrap' }}
                                        onClick={handleFetchSourceItem}
                                        disabled={isFetchingSource}
                                    >
                                        {isFetchingSource ? '取得中...' : 'カテゴリ取得'}
                                    </button>
                                </div>
                                <p style={{ fontSize: '0.75em', marginTop: '6px', color: 'var(--color-text-secondary)' }}>
                                    指定した商品のカテゴリーIDを取得して自動セットします
                                </p>
                            </div>

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
                                <input type="text" name="name" className="form-input" placeholder="日本語で入力してAI翻訳できます" value={formData.name} onChange={handleChange} required />
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
                                <textarea name="description" className="form-input form-textarea" placeholder="日本語で詳細を入力..." value={formData.description} onChange={handleChange} />
                            </div>

                            <div className="form-group">
                                <label className="form-label">
                                    カテゴリ *
                                    {detectedCategory && <span style={{ fontSize: '0.8em', color: 'var(--color-success)', marginLeft: '8px' }}>{detectedCategory.name}</span>}
                                </label>
                                <select name="category" className="form-input form-select" value={formData.category} onChange={handleChange} required disabled={isLoadingCategories}>
                                    <option value="">{isLoadingCategories ? '読み込み中...' : 'カテゴリを選択'}</option>
                                    {categories.map((cat) => (
                                        <option key={cat.category_id} value={cat.category_id}>
                                            {/Figure|Toy|Hobby|公仔|模型/i.test(cat.display_category_name) ? '★ ' : ''}
                                            {cat.display_category_name}
                                            {detectedCategory && cat.category_id === detectedCategory.id ? ' (推奨)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="card">
                            <h3 className="card-title" style={{ marginBottom: 'var(--spacing-lg)' }}>価格計算・在庫</h3>
                            <div className="form-group">
                                <label className="form-label">仕入れ原価 (円)</label>
                                <input type="number" name="costPrice" className="form-input" placeholder="例: 5000" min="0" value={formData.costPrice} onChange={handleChange} />
                                <small style={{ color: 'var(--color-text-secondary)' }}>ここに入力すると推奨販売価格が自動計算されます</small>
                            </div>

                            {priceDetails && (
                                <div style={{ background: 'var(--color-bg-tertiary)', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-lg)', fontSize: 'var(--font-size-sm)' }}>
                                    <div style={{ fontWeight: 600, marginBottom: '8px' }}>💰 推奨価格の内訳 (利益率20%)</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px' }}>
                                        <span>原価:</span> <span>¥{priceDetails.baseCost.toLocaleString()}</span>
                                        <span>送料(JP):</span> <span>¥{priceDetails.shippingJpy.toLocaleString()}</span>
                                        <span>送料(SLS):</span> <span>¥{priceDetails.slsJpy.toLocaleString()}</span>
                                        <span>手数料(9%):</span> <span>¥{priceDetails.commissionJpy.toLocaleString()}</span>
                                        <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>利益(20%):</span>
                                        <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>¥{priceDetails.profitJpy.toLocaleString()}</span>
                                    </div>
                                    <div style={{ borderTop: '1px solid var(--color-border)', marginTop: '8px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                                        <span>推奨価格 (TWD):</span><span>NT${priceDetails.finalTwd.toLocaleString()}</span>
                                    </div>
                                </div>
                            )}

                            <div className="form-group">
                                <label className="form-label">販売価格 (TWD) *</label>
                                <input type="number" name="price" className="form-input" placeholder="0" min="0" value={formData.price} onChange={handleChange} required />
                            </div>

                            <div className="form-group">
                                <label className="form-label">在庫数 *</label>
                                <input type="number" name="stock" className="form-input" placeholder="0" min="0" value={formData.stock} onChange={handleChange} required />
                            </div>

                            <div className="form-group">
                                <label className="form-label">重量 (kg)</label>
                                <input type="number" name="weight" className="form-input" placeholder="0.5" min="0" step="0.1" value={formData.weight} onChange={handleChange} />
                            </div>

                            <div className="form-group" style={{ marginTop: 'var(--spacing-md)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--spacing-md)' }}>
                                <label className="form-label">物流設定 (配送方法)</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {logistics.length > 0 ? (
                                        logistics.map(l => (
                                            <label key={l.logistics_channel_id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={l.enabled}
                                                    onChange={(e) => {
                                                        const isChecked = e.target.checked
                                                        setLogistics(prev => prev.map(item => item.logistics_channel_id === l.logistics_channel_id ? { ...item, enabled: isChecked } : item))
                                                    }}
                                                />
                                                <span>{l.logistics_channel_name}{['蝦皮日本', 'SLS'].some(k => l.logistics_channel_name.includes(k)) && <span style={{ fontSize: '0.8em', color: 'var(--color-text-secondary)', marginLeft: '4px' }}>(台湾向け配送)</span>}</span>
                                            </label>
                                        ))
                                    ) : (
                                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9em' }}>物流情報を読み込み中...</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ marginTop: 'var(--spacing-xl)' }}>
                        <h3 className="card-title" style={{ marginBottom: 'var(--spacing-lg)' }}>商品画像</h3>
                        <div className="upload-zone" style={{ position: 'relative' }}>
                            <input type="file" accept="image/*" multiple onChange={handleImageUpload} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                            {isUploading ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <div style={{ animation: 'spin 1s linear infinite', fontSize: '24px', marginBottom: '8px' }}>🔄</div>
                                    <div>アップロード中...</div>
                                </div>
                            ) : (
                                <>
                                    <div className="upload-icon">📷</div>
                                    <p style={{ fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>画像をドラッグ＆ドロップ</p>
                                    <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>または<span style={{ color: 'var(--color-accent)' }}>クリックしてアップロード</span></p>
                                </>
                            )}
                        </div>
                        {formData.images.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-lg)' }}>
                                {formData.images.map((img, index) => (
                                    <div key={index} style={{ position: 'relative', aspectRatio: '1' }}>
                                        <img src={img.preview || img.url} alt={`商品画像 ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', opacity: img.status === 'uploading' ? 0.5 : 1 }} />
                                        {img.status === 'uploading' && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🔄</div>}
                                        {img.status === 'error' && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,0,0,0.2)', color: 'red', fontWeight: 'bold' }}>!</div>}
                                        <button type="button" onClick={() => removeImage(index)} style={{ position: 'absolute', top: -8, right: -8, width: 24, height: 24, borderRadius: '50%', background: 'red', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>✕</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-xl)' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => navigate('/products')} disabled={isSubmitting}>キャンセル</button>
                        <button type="submit" className="btn btn-primary btn-lg" disabled={isSubmitting || isUploading}>{isSubmitting ? '出品中...' : '🚀 出品する'}</button>
                    </div>
                </form>
            )}
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    )
}

export default NewProduct
