import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useShopeeAuth } from '../hooks/useShopeeAuth'
import { getCategories, uploadImage, addItem, getLogistics, getProducts, getItemDetail, getAttributes } from '../services/shopeeApi'

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
        category: '101385', // デフォルト: ユーザー指定
        brandId: '', // ブランドID (選択式)
        sku: '',
        weight: '0.5',
        images: []
    })

    // UI状態
    const [categories, setCategories] = useState([])
    const [logistics, setLogistics] = useState([])

    // ブランド関連
    const [brandAttributeId, setBrandAttributeId] = useState(null)
    const [brandOptions, setBrandOptions] = useState([])
    const [isLoadingBrands, setIsLoadingBrands] = useState(false)
    const [brandFilter, setBrandFilter] = useState('') // ブランド検索用フィルタ

    // その他UI
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

                    // ユーザー指定のデフォルトIDを確認
                    const defaultId = 101385
                    const defaultCatExists = allCats.find(c => c.category_id === defaultId)
                    if (!defaultCatExists) {
                        allCats.unshift({
                            category_id: defaultId,
                            display_category_name: `Action Figure (Default ID: ${defaultId})`
                        })
                    }

                    // 既存商品から有効IDを探す
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

                    // 表示用リスト構築
                    const figureKeywords = /Figure|Toy|Hobby|Action Figure|公仔|模型|手辦/i
                    const figureCats = allCats.filter(c => figureKeywords.test(c.display_category_name) || c.category_id === defaultId)
                    const otherCats = allCats.filter(c => !figureKeywords.test(c.display_category_name) && c.category_id !== defaultId)

                    if (foundId && !allCats.find(c => c.category_id === foundId)) {
                        allCats.unshift({
                            category_id: foundId,
                            display_category_name: `★ Detected ID: ${foundId}`
                        })
                    }

                    setCategories(allCats)

                    if (!formData.category) {
                        setFormData(prev => ({ ...prev, category: defaultId }))
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

    // ブランド情報の取得 (カテゴリ変更時に発火)
    useEffect(() => {
        if (!formData.category || !accessToken || !shopId) return;

        setIsLoadingBrands(true)
        setBrandOptions([])
        setBrandAttributeId(null)
        setFormData(prev => ({ ...prev, brandId: '' })) // リセット
        setBrandFilter('')

        getAttributes(accessToken, shopId, parseInt(formData.category))
            .then(result => {
                if (result.response && result.response.attribute_list) {
                    const attrs = result.response.attribute_list;
                    console.log("Category Attributes:", attrs);

                    const brandAttr = attrs.find(a =>
                        /Brand|品牌|メーカー/i.test(a.display_attribute_name) || a.mandatory
                    );

                    if (brandAttr) {
                        setBrandAttributeId(brandAttr.attribute_id);
                        if (brandAttr.attribute_value_list) {
                            setBrandOptions(brandAttr.attribute_value_list);
                        }
                    }
                }
            })
            .catch(err => console.error('Attribute fetch error:', err))
            .finally(() => setIsLoadingBrands(false))

    }, [formData.category, accessToken, shopId]);


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
            if (result.response && result.response.item_list && result.response.item_list.length > 0) {
                const item = result.response.item_list[0]
                console.log("Source item details:", item)

                if (item.category_id) {
                    setFormData(prev => ({ ...prev, category: item.category_id }))
                    setCategories(prev => {
                        if (!prev.find(c => c.category_id === item.category_id)) {
                            return [{ category_id: item.category_id, display_category_name: `★ Copy from ${sourceItemId} (ID: ${item.category_id})` }, ...prev]
                        }
                        return prev
                    })
                    setDetectedCategory({ id: item.category_id, name: `(コピー元: ${item.item_name.substring(0, 10)}...)` })
                    alert(`既存商品からカテゴリID: ${item.category_id} を取得しました。`)
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

        if (brandAttributeId && !formData.brandId) {
            alert('ブランドを選択してください（またはIDを手入力してください）')
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

            // 属性リスト構築
            const attributes = []
            if (brandAttributeId && formData.brandId) {
                attributes.push({
                    attribute_id: brandAttributeId,
                    attribute_value_list: [{ value_id: parseInt(formData.brandId) }]
                })
            }

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
                attribute_list: attributes
            }

            console.log("Submitting payload:", payload)
            const result = await addItem(accessToken, shopId, payload)

            if (result.error) {
                alert(`出品エラー: ${result.message || result.error}\n\n(詳細: ${JSON.stringify(result.response || {})})`)
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

    // 主要ブランド
    const popularBrands = [
        'BANPRESTO', 'SEGA', 'Bandai Spirits', 'Taito', 'Furyu', 'Good Smile Company', 'Kotobukiya', 'MegaHouse'
    ];

    // フィルタリングされたブランドリスト
    const filteredBrandOptions = brandOptions.filter(o =>
        o.display_value_name.toLowerCase().includes(brandFilter.toLowerCase())
    );

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

                            {/* 既存商品からコピー */}
                            <div style={{ background: 'var(--color-bg-tertiary)', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '20px', border: '1px solid var(--color-border)' }}>
                                <label style={{ fontSize: '0.85em', fontWeight: 600, marginBottom: '8px', display: 'block', color: 'var(--color-text-secondary)' }}>
                                    🔧 既存の商品IDからコピー
                                </label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input type="text" className="form-input" style={{ height: '36px', fontSize: '13px' }} placeholder="Item ID" value={sourceItemId} onChange={(e) => setSourceItemId(e.target.value)} />
                                    <button type="button" className="btn btn-secondary" style={{ height: '36px', padding: '0 16px', fontSize: '13px', whiteSpace: 'nowrap' }} onClick={handleFetchSourceItem} disabled={isFetchingSource}>
                                        {isFetchingSource ? '取得中...' : 'カテゴリ取得'}
                                    </button>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">商品名 *</label>
                                <input type="text" name="name" className="form-input" placeholder="日本語で入力してAI翻訳できます" value={formData.name} onChange={handleChange} required />
                                <div style={{ marginTop: '4px', textAlign: 'right' }}>
                                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleTranslate('name')} disabled={translating.name || !formData.name}>
                                        {translating.name ? '翻訳中...' : '✨ AI翻訳'}
                                    </button>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">商品説明</label>
                                <textarea name="description" className="form-input form-textarea" placeholder="日本語で詳細を入力..." value={formData.description} onChange={handleChange} />
                                <div style={{ marginTop: '4px', textAlign: 'right' }}>
                                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleTranslate('description')} disabled={translating.description || !formData.description}>
                                        {translating.description ? '翻訳中...' : '✨ AI翻訳'}
                                    </button>
                                </div>
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
                                            {cat.category_id === 101385 ? '◎ ' : /Figure|Toy|Hobby|公仔|模型/i.test(cat.display_category_name) ? '★ ' : ''}
                                            {cat.display_category_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* ブランド選択UI (改善版) */}
                            <div className="form-group">
                                <label className="form-label">
                                    ブランド (Brand) *
                                    {isLoadingBrands && <span style={{ fontSize: '0.8em', color: 'var(--color-text-secondary)', marginLeft: '8px' }}>読み込み中...</span>}
                                </label>

                                <div style={{ background: 'var(--color-bg-secondary)', padding: '12px', borderRadius: '8px' }}>
                                    {brandOptions.length > 0 ? (
                                        <>
                                            {/* 推奨ブランドクイック選択 */}
                                            <div style={{ marginBottom: '8px' }}>
                                                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '4px', display: 'block' }}>よく使うブランド:</label>
                                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                    {popularBrands.map(brandName => {
                                                        let match = brandOptions.find(o => o.display_value_name.toLowerCase() === brandName.toLowerCase())
                                                        if (!match) match = brandOptions.find(o => o.display_value_name.toLowerCase().includes(brandName.toLowerCase()))

                                                        if (match) {
                                                            return (
                                                                <button
                                                                    key={match.value_id}
                                                                    type="button"
                                                                    className={`btn btn-sm ${formData.brandId == match.value_id ? 'btn-primary' : 'btn-secondary'}`}
                                                                    onClick={() => setFormData(prev => ({ ...prev, brandId: match.value_id.toString() }))}
                                                                    style={{ fontSize: '11px', padding: '2px 8px', height: 'auto', borderRadius: '12px' }}
                                                                >
                                                                    {match.display_value_name}
                                                                </button>
                                                            )
                                                        }
                                                        return null
                                                    })}
                                                </div>
                                            </div>

                                            {/* 検索と選択 */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    placeholder="ブランド名を検索..."
                                                    value={brandFilter}
                                                    onChange={(e) => setBrandFilter(e.target.value)}
                                                />
                                                <select
                                                    className="form-input form-select"
                                                    value={formData.brandId}
                                                    onChange={handleChange}
                                                    name="brandId"
                                                    size={5} // リスト表示にする
                                                    style={{ height: 'auto' }}
                                                >
                                                    <option value="">-- 一覧から選択 --</option>
                                                    {filteredBrandOptions.slice(0, 100).map(opt => (
                                                        <option key={opt.value_id} value={opt.value_id}>
                                                            {opt.display_value_name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                                    <span style={{ fontSize: '0.9em' }}>または ID直接入力:</span>
                                                    <input
                                                        type="text"
                                                        className="form-input"
                                                        style={{ width: '120px' }}
                                                        placeholder="例: 1146303"
                                                        value={formData.brandId}
                                                        onChange={handleChange}
                                                        name="brandId"
                                                    />
                                                </div>
                                                {formData.brandId && (
                                                    <div style={{ color: 'var(--color-success)', fontSize: '0.9em' }}>
                                                        現在設定中のID: <strong>{formData.brandId}</strong>
                                                        {brandOptions.find(o => o.value_id == formData.brandId) &&
                                                            ` (${brandOptions.find(o => o.value_id == formData.brandId).display_value_name})`
                                                        }
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <p style={{ fontSize: '0.9em', color: 'orange' }}>
                                                ブランドリストが取得できていないか、空です。IDを手動入力してください。
                                                (例: BANPRESTO = 1146303)
                                            </p>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="ブランドID入力"
                                                value={formData.brandId}
                                                onChange={handleChange}
                                                name="brandId"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <h3 className="card-title">価格・在庫・物流</h3>

                            <div className="form-group">
                                <label className="form-label">仕入れ原価 (JPY)</label>
                                <input type="number" name="costPrice" className="form-input" value={formData.costPrice} onChange={handleChange} />
                            </div>

                            {priceDetails && (
                                <div style={{ background: 'var(--color-bg-tertiary)', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '13px' }}>
                                    <div>推奨価格: <strong>NT${priceDetails.finalTwd.toLocaleString()}</strong></div>
                                </div>
                            )}

                            <div className="form-group">
                                <label className="form-label">販売価格 (TWD) *</label>
                                <input type="number" name="price" className="form-input" value={formData.price} onChange={handleChange} required />
                            </div>

                            <div className="form-group">
                                <label className="form-label">在庫数 *</label>
                                <input type="number" name="stock" className="form-input" value={formData.stock} onChange={handleChange} required />
                            </div>

                            <div className="form-group">
                                <label className="form-label">物流設定</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {logistics.map(l => (
                                        <label key={l.logistics_channel_id} style={{ display: 'flex', align: 'center', gap: '8px' }}>
                                            <input type="checkbox" checked={l.enabled} onChange={(e) => setLogistics(prev => prev.map(item => item.logistics_channel_id === l.logistics_channel_id ? { ...item, enabled: e.target.checked } : item))} />
                                            <span>{l.logistics_channel_name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ marginTop: '20px' }}>
                        <h3 className="card-title">画像</h3>
                        <input type="file" multiple onChange={handleImageUpload} />
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                            {formData.images.map((img, i) => (
                                <img key={i} src={img.preview || img.url} style={{ width: 80, height: 80, objectFit: 'cover' }} />
                            ))}
                        </div>
                    </div>

                    <div style={{ marginTop: '20px', textAlign: 'right' }}>
                        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>出品する</button>
                    </div>
                </form>
            )}
        </div>
    )
}

export default NewProduct
