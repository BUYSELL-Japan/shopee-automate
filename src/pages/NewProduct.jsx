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

// デフォルトのフッターテキスト
const DEFAULT_FOOTER_TEXT = `官方授權正品

本店保證所有公仔皆為日本官方授權正品，絕不販售仿冒品或盜版商品。請安心購買！

運送與包裝

商品將從日本倉庫寄出，我們會使用氣泡布與紙箱進行嚴密防護與包裝。

外盒聲明

景品外盒在運送或夾取時可能產生輕微凹痕、摩擦痕跡，若不影響公仔本體，恕不接受退換貨，敬請理解。

【特別提醒】

由於是從日本跨境運送，到貨時程約需 7-14 個工作天，謝謝您的耐心等候！`

// SpecSelect helper component
function SpecSelect({ label, specKey, specData, onChange }) {
    if (!specData || !specData.attrId) return null;
    return (
        <div className="form-group">
            <label className="form-label">{label}</label>
            <select
                className="form-input form-select"
                value={specData.valueId || ''}
                onChange={(e) => onChange ? onChange(specKey, e.target.value) : null}
                style={{ background: specData.valueId ? '#e6fffa' : '#fff' }}
            >
                <option value="">-- 選択 --</option>
                {specData.options && specData.options.map(opt => (
                    <option key={opt.value_id} value={opt.value_id}>{opt.display_value_name}</option>
                ))}
            </select>
        </div>
    );
}

function NewProduct() {
    const navigate = useNavigate()
    const { accessToken, shopId, isConnected } = useShopeeAuth()

    // フォーム状態
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        descriptionFooter: DEFAULT_FOOTER_TEXT,
        price: '',
        costPrice: '',
        stock: '',
        category: '101385',
        brandId: '1146303',
        sku: '',
        weight: '0.5',
        images: []
    })

    // スペック用状態
    const [specs, setSpecs] = useState({
        material: { attrId: null, valueId: '', options: [] },
        goodsType: { attrId: null, valueId: '', options: [] },
        style: { attrId: null, valueId: '', options: [] },
        feature: { attrId: null, valueId: '', options: [] },
        warranty: { attrId: null, valueId: '', options: [] },
        character: { attrId: null, valueId: '', options: [], text: '', translated: '' }
    })

    const [characterInput, setCharacterInput] = useState('')

    const [categories, setCategories] = useState([])
    const [logistics, setLogistics] = useState([])
    const [brandAttributeId, setBrandAttributeId] = useState(null)
    const [brandOptions, setBrandOptions] = useState([])
    const ADULT_ATTR_ID = 101044;
    const ADULT_VALUE_ID = 11441;
    const [isLoadingBrands, setIsLoadingBrands] = useState(false)
    const [brandFilter, setBrandFilter] = useState('')
    const [debugAttributes, setDebugAttributes] = useState(null)
    const [isLoadingCategories, setIsLoadingCategories] = useState(false)
    const [detectedCategory, setDetectedCategory] = useState(null)
    const [isUploading, setIsUploading] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [translating, setTranslating] = useState({ name: false, description: false, character: false })
    const [priceDetails, setPriceDetails] = useState(null)
    const [sourceItemId, setSourceItemId] = useState('47000206128')
    const [isFetchingSource, setIsFetchingSource] = useState(false)

    useEffect(() => {
        if (isConnected && accessToken && shopId) {
            setIsLoadingCategories(true)
            const fetchCats = getCategories(accessToken, shopId)
            const fetchExisting = getProducts(accessToken, shopId, { pageSize: 50 })

            Promise.all([fetchCats, fetchExisting])
                .then(([catResult, prodResult]) => {
                    let allCats = []
                    if (catResult.response && catResult.response.category_list) {
                        allCats = catResult.response.category_list
                    }
                    const defaultId = 101385
                    const defaultCatExists = allCats.find(c => c.category_id === defaultId)
                    if (!defaultCatExists) {
                        allCats.unshift({
                            category_id: defaultId,
                            display_category_name: `Action Figure (Default ID: ${defaultId})`
                        })
                    }

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

                    setCategories(allCats)
                    if (!formData.category) {
                        setFormData(prev => ({ ...prev, category: defaultId }))
                    }
                })
                .catch(err => console.error('Data fetch error:', err))
                .finally(() => setIsLoadingCategories(false))

            getLogistics(accessToken, shopId)
                .then(result => {
                    if (result.response && result.response.logistics_channel_list) {
                        // Exclude Sea Shipping
                        const filtered = result.response.logistics_channel_list.filter(l =>
                            l.logistics_channel_name !== '蝦皮海外 - 蝦皮店到店（海運）' &&
                            !l.logistics_channel_name.includes('海運')
                        );
                        setLogistics(filtered)
                    }
                })
                .catch(err => console.error('Logistics fetch error:', err))
        }
    }, [isConnected, accessToken, shopId])

    // ブランド・属性情報の取得
    useEffect(() => {
        if (!formData.category || !accessToken || !shopId) return;

        setIsLoadingBrands(true)
        setBrandAttributeId(null)
        setBrandFilter('')
        setDebugAttributes(null)
        setSpecs({
            material: { attrId: null, valueId: '', options: [] },
            goodsType: { attrId: null, valueId: '', options: [] },
            style: { attrId: null, valueId: '', options: [] },
            feature: { attrId: null, valueId: '', options: [] },
            warranty: { attrId: null, valueId: '', options: [] },
            character: { attrId: null, valueId: '', options: [], text: '', translated: '' }
        });
        setCharacterInput('');

        getAttributes(accessToken, shopId, parseInt(formData.category))
            .then(result => {
                if (result.response && result.response.attribute_list) {
                    const attrs = result.response.attribute_list;
                    // Note: Not setting debugAttributes automatically here to avoid clutter if fetch works but user only wants manual button
                    // But good for verifying load.
                    // setDebugAttributes(attrs); 

                    const brandAttr = attrs.find(a => /Brand|品牌|メーカー/i.test(a.display_attribute_name) || a.mandatory);
                    if (brandAttr) {
                        setBrandAttributeId(brandAttr.attribute_id);
                        let opts = brandAttr.attribute_value_list || [];
                        if (!opts.find(o => o.value_id === 1146303)) {
                            opts.unshift({ value_id: 1146303, display_value_name: 'BANPRESTO (Recommended)' });
                        }
                        setBrandOptions(opts);
                        if (!formData.brandId) setFormData(prev => ({ ...prev, brandId: '1146303' }));
                    }

                    const newSpecs = { ...specs };
                    const findAttr = (keywords) => attrs.find(a => keywords.some(k => a.display_attribute_name.toLowerCase().includes(k.toLowerCase())));
                    const findVal = (list, keywords) => list ? list.find(v => keywords.some(k => v.display_value_name.toLowerCase().includes(k.toLowerCase()))) : null;

                    const setupSpec = (attrKey, keywordsAttr, keywordsVal) => {
                        const attr = findAttr(keywordsAttr);
                        if (attr) {
                            const opts = attr.attribute_value_list || [];
                            const defaultVal = findVal(opts, keywordsVal);
                            newSpecs[attrKey] = {
                                attrId: attr.attribute_id,
                                valueId: defaultVal ? defaultVal.value_id : '',
                                options: opts
                            };
                        }
                    };

                    setupSpec('material', ['Material', '材質'], ['PVC']);
                    setupSpec('goodsType', ['Goods Type', 'Type', 'Commodity', '商品類型'], ['Figure', '手辦', '公仔']);
                    setupSpec('style', ['Style', '風格'], ['Anime', '動漫', 'Cartoon']);
                    setupSpec('feature', ['Feature', '特性'], ['Painted', '已上色']);
                    setupSpec('warranty', ['Warranty', '保固'], ['No', '無', 'NA']);

                    const charAttr = findAttr(['Character', '角色', '人物']);
                    if (charAttr) {
                        newSpecs.character = {
                            attrId: charAttr.attribute_id,
                            valueId: '',
                            options: charAttr.attribute_value_list || [],
                            text: '',
                            translated: ''
                        };
                    }

                    setSpecs(newSpecs);
                }
            })
            .catch(err => console.error('Attribute fetch error:', err))
            .finally(() => setIsLoadingBrands(false))
    }, [formData.category, accessToken, shopId]);


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
        const text = field === 'character' ? characterInput : formData[field]
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
                if (field === 'character') {
                    const translated = result.translation;
                    let matchId = '';
                    if (specs.character.options.length > 0) {
                        const match = specs.character.options.find(o => o.display_value_name === translated || o.original_value_name === translated);
                        if (match) matchId = match.value_id;
                    }
                    setSpecs(prev => ({
                        ...prev,
                        character: { ...prev.character, text: translated, translated: translated, valueId: matchId }
                    }));
                } else {
                    setFormData(prev => ({ ...prev, [field]: result.translation }))
                }
            } else {
                alert('翻訳エラー: ' + result.message)
            }
        } catch (e) {
            alert('翻訳エラー: ' + e.message)
        } finally {
            setTranslating(prev => ({ ...prev, [field]: false }))
        }
    }

    const handleFetchSourceItem = async () => {
        if (!sourceItemId || !accessToken || !shopId) return
        setIsFetchingSource(true)
        try {
            const result = await getItemDetail(accessToken, shopId, sourceItemId)
            if (result.response && result.response.item_list && result.response.item_list.length > 0) {
                const item = result.response.item_list[0]
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
            alert('取得中にエラーが発生しました')
        } finally {
            setIsFetchingSource(false)
        }
    }

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleSpecChange = (key, value) => {
        setSpecs(prev => ({
            ...prev,
            [key]: { ...prev[key], valueId: value }
        }));
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

        if (!formData.category) { alert('カテゴリを選択してください'); return }
        if (!formData.brandId) { alert('ブランドを選択してください'); return }
        const validImages = formData.images.filter(img => img.status === 'done' && img.id)
        if (validImages.length === 0) { alert('画像を少なくとも1枚アップロードしてください'); return }

        setIsSubmitting(true)

        try {
            const imageIdList = validImages.map(img => img.id)
            const logisticInfoPayload = logistics.filter(l => l.enabled).map(l => ({ logistic_id: l.logistics_channel_id, enabled: true }))
            const finalPrice = parseFloat(formData.price)
            const fullDescription = `${formData.description}\n\n${formData.descriptionFooter}`;

            const attributes = []
            // Adult
            attributes.push({ attribute_id: ADULT_ATTR_ID, attribute_value_list: [{ value_id: ADULT_VALUE_ID }] });

            // Specs
            const addSpec = (specObj) => {
                if (specObj && specObj.attrId && specObj.valueId) {
                    attributes.push({ attribute_id: specObj.attrId, attribute_value_list: [{ value_id: parseInt(specObj.valueId) }] });
                }
            };
            addSpec(specs.material);
            addSpec(specs.goodsType);
            addSpec(specs.style);
            addSpec(specs.feature);
            addSpec(specs.warranty);
            addSpec(specs.character);

            // Brand
            let brandPayload = undefined;
            if (formData.brandId) {
                const brandIdNum = parseInt(formData.brandId);
                let brandName = "";
                const matchOption = brandOptions.find(o => o.value_id === brandIdNum);
                if (matchOption) brandName = matchOption.display_value_name;
                else if (brandIdNum === 1146303) brandName = "BANPRESTO";
                else brandName = "General";

                brandPayload = { brand_id: brandIdNum, original_brand_name: brandName };
            }

            const stockVal = parseInt(formData.stock);
            const payload = {
                item_name: formData.name,
                description: fullDescription,
                original_price: finalPrice,
                price: finalPrice,
                normal_stock: stockVal,
                seller_stock: [{ stock: stockVal }],
                category_id: parseInt(formData.category),
                weight: parseFloat(formData.weight),
                image: { image_id_list: imageIdList },
                logistic_info: logisticInfoPayload,
                attribute_list: attributes,
                brand: brandPayload
            }

            console.log("Submitting payload:", JSON.stringify(payload, null, 2))
            const result = await addItem(accessToken, shopId, payload)

            if (result.error || (result.response && result.response.error)) {
                const msg = result.message || result.error || (result.response && result.response.message) || "Unknown Error";
                alert(`出品エラー: ${msg}\n\n(詳細: ${JSON.stringify(result.response || result)})`)
            } else {
                alert('✅ 出品に成功しました！')
                navigate('/products')
            }
        } catch (e) {
            alert(`出品エラー: ${e.message}`)
        } finally {
            setIsSubmitting(false)
        }
    }

    // Popular brands with confirmed Shopee Brand IDs
    const BRAND_MAP = {
        'BANPRESTO': 1146303,
        'SEGA': 1146999,
        'Good Smile Company': 1146546,
        'TAITO': 1802638,
        'Furyu': 1801231,
        'Kotobukiya': 1146669,
        'MegaHouse': 1801884,
        'BANDAI': 4605655,
        'Bandai Namco': 2559617
    };
    const popularBrands = Object.keys(BRAND_MAP);
    const filteredBrandOptions = brandOptions.filter(o => o.display_value_name.toLowerCase().includes(brandFilter.toLowerCase()));

    {/* MANUAL DEBUG OVERLAY REMOVED */ }

    return (
        <div className="page-container">
            <header className="page-header">
                <div>
                    <h1 className="page-title">新規出品</h1>
                    <p className="page-subtitle">Shopeeに新しい商品を出品します</p>
                </div>
            </header>

            {
                !isConnected ? (
                    <div className="card">
                        <p>APIに接続されていません。設定ページで接続してください。</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="grid-2">
                            {/* LEFT COLUMN */}
                            <div className="card">
                                <h3 className="card-title" style={{ marginBottom: 'var(--spacing-lg)' }}>基本情報</h3>

                                <div style={{ background: 'var(--color-bg-tertiary)', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '20px', border: '1px solid var(--color-border)' }}>
                                    <label style={{ fontSize: '0.85em', fontWeight: 600, marginBottom: '8px', display: 'block', color: 'var(--color-text-secondary)' }}>
                                        🔧 既存商品からコピー
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
                                    <input type="text" name="name" className="form-input" placeholder="日本語で入力してAI翻訳" value={formData.name} onChange={handleChange} required />
                                    <div style={{ marginTop: '4px', textAlign: 'right' }}>
                                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleTranslate('name')} disabled={translating.name || !formData.name}>✨ AI翻訳</button>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">商品説明</label>
                                    <textarea name="description" className="form-input form-textarea" placeholder="日本語で入力..." value={formData.description} onChange={handleChange} />
                                    <div style={{ marginTop: '4px', textAlign: 'right' }}>
                                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleTranslate('description')} disabled={translating.description || !formData.description}>✨ AI翻訳</button>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">共通フッター (自動挿入)</label>
                                    <textarea name="descriptionFooter" className="form-input form-textarea" style={{ height: '150px', background: '#f9f9f9', fontSize: '0.9em' }} value={formData.descriptionFooter} onChange={handleChange} />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">
                                        カテゴリ * {detectedCategory && <span style={{ fontSize: '0.8em', color: 'var(--color-success)', marginLeft: '8px' }}>{detectedCategory.name}</span>}
                                    </label>
                                    <select name="category" className="form-input form-select" value={formData.category} onChange={handleChange} required disabled={isLoadingCategories}>
                                        <option value="">{isLoadingCategories ? '読み込み中...' : 'カテゴリを選択'}</option>
                                        {categories.map((cat) => (
                                            <option key={cat.category_id} value={cat.category_id}>
                                                {cat.category_id === 101385 ? '◎ ' : /Figure|Toy|Hobby/i.test(cat.display_category_name) ? '★ ' : ''}
                                                {cat.display_category_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">品牌 (Brand) *</label>
                                    <div style={{ background: 'var(--color-bg-secondary)', padding: '12px', borderRadius: '8px' }}>
                                        {/* Always show popular brand buttons using BRAND_MAP */}
                                        <div style={{ marginBottom: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                            {popularBrands.map(brandName => {
                                                const brandId = BRAND_MAP[brandName];
                                                return <button key={brandId} type="button" className={`btn btn-sm ${formData.brandId == brandId ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFormData(prev => ({ ...prev, brandId: brandId.toString() }))} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px' }}>{brandName}</button>;
                                            })}
                                        </div>
                                        <select className="form-input form-select" value={formData.brandId} onChange={handleChange} name="brandId">
                                            <option value="">-- 一覧から選択 --</option>
                                            {/* Show BRAND_MAP options first */}
                                            {Object.entries(BRAND_MAP).map(([name, id]) => (
                                                <option key={id} value={id}>★ {name}</option>
                                            ))}
                                            {/* Then show API options if available */}
                                            {filteredBrandOptions.length > 0 && filteredBrandOptions.slice(0, 100).map(opt => <option key={opt.value_id} value={opt.value_id}>{opt.display_value_name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT COLUMN */}
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
                                <div className="form-group"><label className="form-label">販売価格 (TWD) *</label><input type="number" name="price" className="form-input" value={formData.price} onChange={handleChange} required /></div>
                                <div className="form-group"><label className="form-label">在庫数 *</label><input type="number" name="stock" className="form-input" value={formData.stock} onChange={handleChange} required /></div>
                                <div className="form-group">
                                    <label className="form-label">物流設定</label>
                                    {logistics.map(l => (
                                        <label key={l.logistics_channel_id} style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                                            <input type="checkbox" checked={l.enabled} onChange={(e) => setLogistics(prev => prev.map(item => item.logistics_channel_id === l.logistics_channel_id ? { ...item, enabled: e.target.checked } : item))} />
                                            {l.logistics_channel_name}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* FULL WIDTH SPECIFICATIONS */}
                        <div className="card" style={{ marginTop: '20px', border: '1px solid #d0d0d0', background: '#fafafa' }}>
                            <h3 className="card-title">📋 Specifications</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                                <SpecSelect label="Material (PVC)" specKey="material" specData={specs.material} onChange={handleSpecChange} />
                                <SpecSelect label="Goods Type (Figure)" specKey="goodsType" specData={specs.goodsType} onChange={handleSpecChange} />
                                <SpecSelect label="Style (Anime)" specKey="style" specData={specs.style} onChange={handleSpecChange} />
                                <SpecSelect label="Feature (Painted)" specKey="feature" specData={specs.feature} onChange={handleSpecChange} />
                                <SpecSelect label="Warranty (NA)" specKey="warranty" specData={specs.warranty} onChange={handleSpecChange} />

                                <div className="form-group">
                                    <label className="form-label">Character (Manual or Select)</label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input type="text" className="form-input" placeholder="例: 孫悟空" value={characterInput} onChange={(e) => setCharacterInput(e.target.value)} />
                                            <button type="button" className="btn btn-secondary" onClick={() => handleTranslate('character')} disabled={translating.character}>翻訳</button>
                                        </div>
                                        {specs.character.text && <div style={{ color: 'green', fontSize: '0.9em' }}>Translated: {specs.character.text}</div>}

                                        {specs.character.attrId && (
                                            <select className="form-input form-select" value={specs.character.valueId} onChange={(e) => handleSpecChange('character', e.target.value)} style={{ background: specs.character.valueId ? '#e6fffa' : '#fff' }}>
                                                <option value="">(Select from list if matched)</option>
                                                {specs.character.options.map(opt => <option key={opt.value_id} value={opt.value_id}>{opt.display_value_name}</option>)}
                                            </select>
                                        )}
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
                )
            }
        </div >
    )
}

export default NewProduct
