import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useShopeeAuth } from '../hooks/useShopeeAuth'
import { getCategories, uploadImage, addItem, getLogistics, getProducts, getItemDetail, getAttributes } from '../services/shopeeApi'

// 推奨価格計算用の定数（実際の取引データに基づく）
const COSTS = {
    // 日本国内送料
    YAMATO_JPY: 1350,
    // Shopee手数料率（実際の取引データより）
    COMMISSION_RATE: 0.1077,    // 手数料 10.77%
    SERVICE_FEE_RATE: 0.03,      // 服務費 3%
    TRANSACTION_FEE_RATE: 0.0254, // 金流服務費 2.54%
    // 送料関連
    SLS_NET_TWD: 76,             // SLS実質送料（NT$146 - NT$70リベート）
    // 利益マージン
    PROFIT_MARGIN: 0.15,         // 目標利益率 15%
    // 為替レート
    TWD_JPY_RATE: 4.7
}

// ========================================
// 属性定義（Shopee Taiwan フィギュアカテゴリ用）
// ========================================
const PRODUCT_ATTRIBUTES = {
    // Adult products - 必須項目（固定値）
    adult: {
        attribute_id: 101044,
        label_ja: '成人向け商品',
        label_zh: 'Adult products',
        fixed_value_id: 11441, // No
        fixed_label: 'No / いいえ'
    },
    // Material - 素材
    material: {
        attribute_id: 100134,
        label_ja: '素材',
        label_zh: 'Material',
        options: [
            { value_id: 1207, label_zh: 'Plastic', label_ja: 'プラスチック' },
            { value_id: 1178, label_zh: 'PVC', label_ja: 'PVC' },
            { value_id: 1209, label_zh: 'ABS', label_ja: 'ABS' },
            { value_id: 1210, label_zh: 'Resin', label_ja: 'レジン' },
            { value_id: 0, label_zh: 'Other', label_ja: 'その他（自由入力）', isText: true }
        ]
    },
    // Style - スタイル
    style: {
        attribute_id: 100169,
        label_ja: 'スタイル',
        label_zh: 'Style',
        is_text: true, // value_id=0 で自由入力
        preset_options: [
            { value: '動漫風格', label_ja: 'アニメ風' },
            { value: '日系', label_ja: '日系' },
            { value: '和風', label_ja: '和風' },
            { value: '可愛', label_ja: 'かわいい' },
            { value: 'SF', label_ja: 'SF' },
            { value: '奇幻', label_ja: 'ファンタジー' }
        ]
    },
    // Warranty Type - 保証タイプ（固定値）
    warranty: {
        attribute_id: 100370,
        label_ja: '保証タイプ',
        label_zh: 'Warranty Type',
        fixed_value_id: 5576, // No Warranty
        fixed_label: 'No Warranty / 保証なし'
    },
    // Character - キャラクター
    character: {
        attribute_id: 100680,
        label_ja: 'キャラクター',
        label_zh: 'Character',
        is_text: true, // value_id=0 で自由入力
        preset_options: [
            { value: '初音未來', label_ja: '初音ミク' },
            { value: '孫悟空', label_ja: '孫悟空' },
            { value: '魯夫', label_ja: 'ルフィ' },
            { value: '炭治郎', label_ja: '竈門炭治郎' },
            { value: '禰豆子', label_ja: '竈門禰豆子' },
            { value: '五條悟', label_ja: '五条悟' },
            { value: '安妮亞', label_ja: 'アーニャ' },
            { value: '索隆', label_ja: 'ゾロ' },
            { value: '娜美', label_ja: 'ナミ' },
            { value: '其他', label_ja: 'その他（自由入力）' }
        ]
    },
    // Quantity - 数量
    quantity: {
        attribute_id: 100999,
        label_ja: '数量',
        label_zh: 'Quantity',
        is_text: true, // value_id=0 で自由入力
        preset_options: [
            { value: '1', label_ja: '1個' },
            { value: '2', label_ja: '2個' },
            { value: '3', label_ja: '3個' },
            { value: '1套', label_ja: '1セット' }
        ]
    },
    // Material Feature - 素材特性
    materialFeature: {
        attribute_id: 101394,
        label_ja: '素材特性',
        label_zh: 'Material Feature',
        is_text: true, // value_id=0 で自由入力
        preset_options: [
            { value: '已上色', label_ja: '塗装済み' },
            { value: '未上色', label_ja: '未塗装' },
            { value: '可動式', label_ja: '可動式' },
            { value: '固定姿勢', label_ja: '固定ポーズ' },
            { value: '限量版', label_ja: '限定版' }
        ]
    },
    // Goods Type - 商品タイプ
    goodsType: {
        attribute_id: 100131,
        label_ja: '商品タイプ',
        label_zh: 'Goods Type',
        is_text: true, // value_id=0 で自由入力
        preset_options: [
            { value: '手辦', label_ja: 'フィギュア' },
            { value: '模型', label_ja: '模型' },
            { value: '公仔', label_ja: 'ドール/人形' },
            { value: '景品', label_ja: 'プライズ' },
            { value: '娃娃', label_ja: 'ぬいぐるみ' },
            { value: '盒玩', label_ja: '食玩/BOX' },
            { value: '扭蛋', label_ja: 'ガチャ' },
            { value: '黏土人', label_ja: 'ねんどろいど' },
            { value: 'Q版', label_ja: 'Q posket' }
        ]
    }
};

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
        stock: '1',
        category: '101385',
        brandId: '1146303',
        sku: '',
        weight: '0.5',
        images: [],
        sourceUrls: ['', '', '']  // 仕入れ先URL（3つまで）
    })

    // 属性用状態（新方式）
    const [productAttrs, setProductAttrs] = useState({
        material: { value_id: 1207, text: '' },          // デフォルト: Plastic
        style: { value_id: 0, text: '動漫風格' },         // デフォルト: アニメ風
        character: { value_id: 0, text: '' },            // 自由入力
        quantity: { value_id: 0, text: '1' },            // デフォルト: 1
        materialFeature: { value_id: 0, text: '已上色' }, // デフォルト: 塗装済み
        goodsType: { value_id: 0, text: '手辦' }         // デフォルト: フィギュア
    })

    // 旧スペック用状態（互換性のため残す）
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

    // ========================================
    // マルチリージョン対応
    // ========================================
    const [listingTargets, setListingTargets] = useState({
        TW: true,   // 台湾（デフォルトON）
        MY: false   // マレーシア
    })

    const [regionSettings, setRegionSettings] = useState({
        TW: { currency: 'TWD', symbol: 'NT$', exchangeRate: 4.7, commission: 0.1077, serviceFee: 0.03, transactionFee: 0.0254, shippingLocal: 60, shippingIntl: 1350 },
        MY: { currency: 'MYR', symbol: 'RM', exchangeRate: 31.5, commission: 0.1077, serviceFee: 0.03, transactionFee: 0.0254, shippingLocal: 10, shippingIntl: 1360 }
    })

    // 国別翻訳テキスト
    const [regionTexts, setRegionTexts] = useState({
        TW: { name: '', description: '' },
        MY: { name: '', description: '' }
    })

    // 国別価格
    const [regionPrices, setRegionPrices] = useState({
        TW: '',
        MY: ''
    })

    // リージョン設定をD1から取得
    useEffect(() => {
        const fetchRegionSettings = async () => {
            try {
                const response = await fetch('/api/db/region-settings')
                const result = await response.json()
                if (result.status === 'success' && result.data) {
                    const settings = {}
                    result.data.forEach(r => {
                        settings[r.region] = {
                            currency: r.currency,
                            symbol: r.currency_symbol,
                            exchangeRate: r.exchange_rate,
                            commission: r.commission_rate,
                            serviceFee: r.service_fee_rate,
                            transactionFee: r.transaction_fee_rate,
                            shippingLocal: r.shipping_cost_local,
                            shippingIntl: r.shipping_cost_intl_jpy
                        }
                    })
                    setRegionSettings(prev => ({ ...prev, ...settings }))
                }
            } catch (e) {
                console.log('Region settings fetch failed:', e)
            }
        }
        fetchRegionSettings()
    }, [])

    // 国別利益計算
    const calculateRegionProfit = (region, costPriceJpy, sellingPriceLocal) => {
        const s = regionSettings[region]
        if (!costPriceJpy || !sellingPriceLocal || !s) return null

        const salesJpy = sellingPriceLocal * s.exchangeRate
        const feeRate = s.commission + s.serviceFee + s.transactionFee
        const feesLocal = sellingPriceLocal * feeRate
        const feesJpy = feesLocal * s.exchangeRate
        const totalCostJpy = parseFloat(costPriceJpy) + s.shippingIntl + (s.shippingLocal * s.exchangeRate)
        const profitJpy = salesJpy - feesJpy - totalCostJpy

        return {
            profitJpy: Math.round(profitJpy),
            isLoss: profitJpy < 0,
            salesJpy: Math.round(salesJpy),
            feesJpy: Math.round(feesJpy),
            shippingJpy: Math.round(s.shippingIntl + s.shippingLocal * s.exchangeRate)
        }
    }

    // 国別推奨価格計算（目標利益1000円）
    const calculateRecommendedPrice = (region, costPriceJpy, targetProfitJpy = 1000) => {
        const s = regionSettings[region]
        if (!costPriceJpy || !s) return null

        const feeRate = s.commission + s.serviceFee + s.transactionFee
        const totalCostJpy = parseFloat(costPriceJpy) + s.shippingIntl + (s.shippingLocal * s.exchangeRate)
        const requiredSalesJpy = totalCostJpy + targetProfitJpy
        // salesJpy = priceLocal * exchangeRate - priceLocal * feeRate * exchangeRate
        // salesJpy = priceLocal * exchangeRate * (1 - feeRate)
        // priceLocal = salesJpy / (exchangeRate * (1 - feeRate))
        const effectiveRate = s.exchangeRate * (1 - feeRate)
        const priceLocal = Math.ceil(requiredSalesJpy / effectiveRate)

        return priceLocal
    }


    // 属性更新ヘルパー
    const updateProductAttr = (key, field, value) => {
        setProductAttrs(prev => ({
            ...prev,
            [key]: { ...prev[key], [field]: value }
        }))
    }

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
            // 固定費用（円）
            const yamatoJpy = COSTS.YAMATO_JPY
            const slsJpy = Math.round(COSTS.SLS_NET_TWD * COSTS.TWD_JPY_RATE)
            const totalFixedCostJpy = cost + yamatoJpy + slsJpy

            // 手数料率の合計
            const totalFeeRate = COSTS.COMMISSION_RATE + COSTS.SERVICE_FEE_RATE + COSTS.TRANSACTION_FEE_RATE

            // 推奨価格の計算: 固定費用 / (1 - 手数料率 - 利益率)
            const revenueRate = 1 - totalFeeRate - COSTS.PROFIT_MARGIN
            const recommendedPriceJpy = Math.ceil(totalFixedCostJpy / revenueRate)
            const recommendedPriceTwd = Math.ceil(recommendedPriceJpy / COSTS.TWD_JPY_RATE)

            // 各手数料の計算（NTD）
            const commissionTwd = Math.round(recommendedPriceTwd * COSTS.COMMISSION_RATE)
            const serviceTwd = Math.round(recommendedPriceTwd * COSTS.SERVICE_FEE_RATE)
            const transactionTwd = Math.round(recommendedPriceTwd * COSTS.TRANSACTION_FEE_RATE)
            const totalFeesTwd = commissionTwd + serviceTwd + transactionTwd

            // 利益計算
            const profitTwd = recommendedPriceTwd - COSTS.SLS_NET_TWD - totalFeesTwd - Math.round(totalFixedCostJpy / COSTS.TWD_JPY_RATE) + Math.round(COSTS.SLS_NET_TWD)
            const actualProfitTwd = recommendedPriceTwd - COSTS.SLS_NET_TWD - totalFeesTwd - Math.round((cost + yamatoJpy) / COSTS.TWD_JPY_RATE)
            const profitJpy = Math.round(actualProfitTwd * COSTS.TWD_JPY_RATE)

            setPriceDetails({
                // 原価
                baseCostJpy: cost,
                baseCostTwd: Math.round(cost / COSTS.TWD_JPY_RATE),
                // 送料
                yamatoJpy: yamatoJpy,
                yamatoTwd: Math.round(yamatoJpy / COSTS.TWD_JPY_RATE),
                slsTwd: COSTS.SLS_NET_TWD,
                slsJpy: slsJpy,
                // 手数料
                commissionTwd: commissionTwd,
                serviceTwd: serviceTwd,
                transactionTwd: transactionTwd,
                totalFeesTwd: totalFeesTwd,
                totalFeesJpy: Math.round(totalFeesTwd * COSTS.TWD_JPY_RATE),
                // 利益
                profitTwd: actualProfitTwd,
                profitJpy: profitJpy,
                // 最終価格
                finalTwd: recommendedPriceTwd,
                finalJpy: recommendedPriceJpy,
                // 手数料率
                totalFeeRate: totalFeeRate
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
            // 台湾語（繁体字中国語）に翻訳
            const twResponse = await fetch('/api/ai/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, target_lang: 'zh-TW' })
            })
            const twResult = await twResponse.json()

            // 英語（マレーシア用）に翻訳
            const enResponse = await fetch('/api/ai/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, target_lang: 'en' })
            })
            const enResult = await enResponse.json()

            if (twResult.status === 'success') {
                if (field === 'character') {
                    const translated = twResult.translation;
                    updateProductAttr('character', 'text', translated);
                    setSpecs(prev => ({
                        ...prev,
                        character: { ...prev.character, text: translated, translated: translated }
                    }));
                } else {
                    // 台湾語はフォームに設定（メイン表示）
                    setFormData(prev => ({ ...prev, [field]: twResult.translation }))
                    // 国別テキストに保存
                    setRegionTexts(prev => ({
                        ...prev,
                        TW: { ...prev.TW, [field]: twResult.translation },
                        MY: { ...prev.MY, [field]: enResult.status === 'success' ? enResult.translation : '' }
                    }))
                }
            } else {
                alert('翻訳エラー: ' + twResult.message)
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

    // Shopee画像仕様に合わせて最適化
    const optimizeImageForShopee = async (file) => {
        return new Promise((resolve) => {
            const img = new Image()
            img.onload = () => {
                const canvas = document.createElement('canvas')
                const ctx = canvas.getContext('2d')

                // Shopee要件: 最小500x500、最大2000x2000
                let width = img.width
                let height = img.height
                const maxSize = 2000
                const minSize = 500

                // リサイズロジック
                if (width > maxSize || height > maxSize) {
                    const ratio = Math.min(maxSize / width, maxSize / height)
                    width = Math.round(width * ratio)
                    height = Math.round(height * ratio)
                }
                if (width < minSize || height < minSize) {
                    const ratio = Math.max(minSize / width, minSize / height)
                    width = Math.round(width * ratio)
                    height = Math.round(height * ratio)
                }

                canvas.width = width
                canvas.height = height
                ctx.drawImage(img, 0, 0, width, height)

                // JPEGに変換（Shopeeが最も対応しやすい）
                canvas.toBlob((blob) => {
                    const optimizedFile = new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {
                        type: 'image/jpeg'
                    })
                    console.log(`Optimized: ${file.name} (${file.size} bytes) -> ${optimizedFile.name} (${optimizedFile.size} bytes)`)
                    resolve(optimizedFile)
                }, 'image/jpeg', 0.85)
            }
            img.onerror = () => resolve(file) // エラー時は元ファイルを使用
            img.src = URL.createObjectURL(file)
        })
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

        // Add new images to state first
        setFormData(prev => ({ ...prev, images: [...prev.images, ...newImages] }))

        try {
            // Process each new image
            for (let i = 0; i < newImages.length; i++) {
                const img = newImages[i]
                try {
                    // 画像を最適化
                    const optimizedFile = await optimizeImageForShopee(img.file)
                    const result = await uploadImage(accessToken, shopId, optimizedFile)
                    console.log('Upload result:', result)
                    if (result.response && result.response.image_info) {
                        const uploadedImage = {
                            ...img,
                            id: result.response.image_info.image_id,
                            url: result.response.image_info.image_url,
                            status: 'done'
                        }
                        console.log('Uploaded image:', uploadedImage)
                        // Update state using functional update to get latest state
                        setFormData(prev => ({
                            ...prev,
                            images: prev.images.map((existingImg, idx) =>
                                existingImg.preview === img.preview ? uploadedImage : existingImg
                            )
                        }))
                    } else {
                        console.error('Upload failed:', result)
                        setFormData(prev => ({
                            ...prev,
                            images: prev.images.map((existingImg) =>
                                existingImg.preview === img.preview ? { ...existingImg, status: 'error' } : existingImg
                            )
                        }))
                    }
                } catch (err) {
                    console.error('Upload error:', err)
                    setFormData(prev => ({
                        ...prev,
                        images: prev.images.map((existingImg) =>
                            existingImg.preview === img.preview ? { ...existingImg, status: 'error' } : existingImg
                        )
                    }))
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

            // Adult products（必須・固定）
            attributes.push({
                attribute_id: PRODUCT_ATTRIBUTES.adult.attribute_id,
                attribute_value_list: [{ value_id: PRODUCT_ATTRIBUTES.adult.fixed_value_id }]
            });

            // Warranty Type（固定）
            attributes.push({
                attribute_id: PRODUCT_ATTRIBUTES.warranty.attribute_id,
                attribute_value_list: [{ value_id: PRODUCT_ATTRIBUTES.warranty.fixed_value_id }]
            });

            // 新しい属性システムからの追加
            const addNewAttr = (attrKey) => {
                const attrDef = PRODUCT_ATTRIBUTES[attrKey];
                const attrVal = productAttrs[attrKey];
                if (!attrDef || !attrVal) return;

                if (attrDef.is_text || attrVal.value_id === 0) {
                    // テキスト入力型属性
                    if (attrVal.text) {
                        attributes.push({
                            attribute_id: attrDef.attribute_id,
                            attribute_value_list: [{
                                value_id: 0,
                                original_value_name: attrVal.text
                            }]
                        });
                    }
                } else if (attrVal.value_id) {
                    // 選択型属性
                    attributes.push({
                        attribute_id: attrDef.attribute_id,
                        attribute_value_list: [{ value_id: attrVal.value_id }]
                    });
                }
            };

            addNewAttr('material');
            addNewAttr('style');
            addNewAttr('character');
            addNewAttr('quantity');
            addNewAttr('materialFeature');
            addNewAttr('goodsType');

            console.log('=== ATTRIBUTE LIST FOR SUBMISSION ===');
            console.log(JSON.stringify(attributes, null, 2));
            console.log('=====================================');

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
                // D1に仕入れ情報を保存（Shopee APIには送信しない）
                const newItemId = result.response?.item_id || result.item_id
                if (newItemId && (formData.costPrice || formData.sourceUrls.some(url => url))) {
                    try {
                        // ソースURLをJSONに変換（空でないもののみ）
                        const validUrls = formData.sourceUrls.filter(url => url && url.trim())
                        const sourceUrlJson = validUrls.length > 0 ? JSON.stringify(validUrls) : null

                        await fetch(`/api/db/products?shop_id=${shopId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                item_id: newItemId,
                                cost_price: parseFloat(formData.costPrice) || null,
                                source_url: sourceUrlJson
                            })
                        })
                        console.log('D1 saved cost_price and source_urls')
                    } catch (e) {
                        console.log('D1 save failed:', e)
                    }
                }
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

                                {/* 共通フッターは自動挿入されるため非表示 */}

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
                                    <div style={{ background: 'var(--color-bg-tertiary)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '13px' }}>
                                        {/* 推奨価格 */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--color-border)' }}>
                                            <span style={{ fontSize: '14px', fontWeight: 600 }}>推奨価格</span>
                                            <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-accent-light)' }}>
                                                NT${priceDetails.finalTwd.toLocaleString()}
                                            </span>
                                        </div>

                                        {/* コスト内訳 */}
                                        <div style={{ marginBottom: '12px' }}>
                                            <div style={{ color: 'var(--color-text-secondary)', marginBottom: '6px', fontSize: '12px' }}>📦 コスト</div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                                <span>仕入れ原価</span>
                                                <span>¥{priceDetails.baseCostJpy.toLocaleString()} (NT${priceDetails.baseCostTwd.toLocaleString()})</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                                <span>ヤマト送料</span>
                                                <span>¥{priceDetails.yamatoJpy.toLocaleString()} (NT${priceDetails.yamatoTwd.toLocaleString()})</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                                <span>SLS送料 (実質)</span>
                                                <span>NT${priceDetails.slsTwd.toLocaleString()}</span>
                                            </div>
                                        </div>

                                        {/* 手数料内訳 */}
                                        <div style={{ marginBottom: '12px' }}>
                                            <div style={{ color: 'var(--color-text-secondary)', marginBottom: '6px', fontSize: '12px' }}>💰 手数料 ({(priceDetails.totalFeeRate * 100).toFixed(1)}%)</div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                                <span>Commission (10.77%)</span>
                                                <span style={{ color: 'var(--color-error)' }}>-NT${priceDetails.commissionTwd.toLocaleString()}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                                <span>Service (3%)</span>
                                                <span style={{ color: 'var(--color-error)' }}>-NT${priceDetails.serviceTwd.toLocaleString()}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                                <span>Transaction (2.54%)</span>
                                                <span style={{ color: 'var(--color-error)' }}>-NT${priceDetails.transactionTwd.toLocaleString()}</span>
                                            </div>
                                        </div>

                                        {/* 想定利益 */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--color-border)' }}>
                                            <span style={{ fontSize: '14px', fontWeight: 600 }}>💵 想定利益</span>
                                            <div style={{ textAlign: 'right' }}>
                                                <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-success)' }}>
                                                    NT${priceDetails.profitTwd.toLocaleString()}
                                                </span>
                                                <span style={{ marginLeft: '8px', color: 'var(--color-text-secondary)' }}>
                                                    (¥{priceDetails.profitJpy.toLocaleString()})
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 仕入れ情報セクション */}
                                <div style={{ background: 'var(--color-bg-tertiary)', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-md)' }}>
                                    <div style={{ fontWeight: 600, marginBottom: 'var(--spacing-sm)', color: 'var(--color-primary)' }}>📦 仕入れ情報（D1のみ保存）</div>
                                    <div className="form-group">
                                        <label className="form-label">仕入れ原価 (JPY)</label>
                                        <input
                                            type="number"
                                            name="costPrice"
                                            className="form-input"
                                            value={formData.costPrice}
                                            onChange={handleChange}
                                            placeholder="平均仕入れ価格（日本円）"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">仕入れ先URL（最大3つ）</label>
                                        {formData.sourceUrls.map((url, idx) => (
                                            <input
                                                key={idx}
                                                type="url"
                                                className="form-input"
                                                value={url}
                                                onChange={(e) => {
                                                    const newUrls = [...formData.sourceUrls]
                                                    newUrls[idx] = e.target.value
                                                    setFormData(prev => ({ ...prev, sourceUrls: newUrls }))
                                                }}
                                                placeholder={`仕入れ先URL ${idx + 1}`}
                                                style={{ marginBottom: idx < 2 ? '8px' : 0 }}
                                            />
                                        ))}
                                    </div>
                                </div>

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

                        {/* FULL WIDTH: 商品属性セクション */}
                        <div className="card" style={{ marginTop: '20px' }}>
                            <h3 className="card-title">📋 商品属性</h3>

                            {/* 固定値の表示 */}
                            <div style={{ display: 'flex', gap: '24px', marginBottom: '20px', padding: '12px', background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-md)', fontSize: '0.9em' }}>
                                <div>
                                    <span style={{ color: 'var(--color-text-secondary)' }}>🔒 {PRODUCT_ATTRIBUTES.adult.label_ja}:</span>
                                    <span style={{ marginLeft: '8px', color: 'var(--color-success)' }}>✓ No</span>
                                </div>
                                <div>
                                    <span style={{ color: 'var(--color-text-secondary)' }}>🔒 {PRODUCT_ATTRIBUTES.warranty.label_ja}:</span>
                                    <span style={{ marginLeft: '8px', color: 'var(--color-success)' }}>✓ No Warranty</span>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                                {/* Material - 素材 */}
                                <div className="form-group">
                                    <label className="form-label">
                                        {PRODUCT_ATTRIBUTES.material.label_ja} / {PRODUCT_ATTRIBUTES.material.label_zh}
                                    </label>
                                    <select
                                        className="form-input form-select"
                                        value={productAttrs.material.value_id}
                                        onChange={(e) => updateProductAttr('material', 'value_id', parseInt(e.target.value))}

                                    >
                                        <option value="">-- 選択 --</option>
                                        {PRODUCT_ATTRIBUTES.material.options.map(opt => (
                                            <option key={opt.value_id} value={opt.value_id}>
                                                {opt.label_zh} ({opt.label_ja})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Goods Type - 商品タイプ */}
                                <div className="form-group">
                                    <label className="form-label">
                                        {PRODUCT_ATTRIBUTES.goodsType.label_ja} / {PRODUCT_ATTRIBUTES.goodsType.label_zh}
                                    </label>
                                    <select
                                        className="form-input form-select"
                                        value={productAttrs.goodsType.text}
                                        onChange={(e) => updateProductAttr('goodsType', 'text', e.target.value)}

                                    >
                                        <option value="">-- 選択 --</option>
                                        {PRODUCT_ATTRIBUTES.goodsType.preset_options.map(opt => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.value} ({opt.label_ja})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Style - スタイル */}
                                <div className="form-group">
                                    <label className="form-label">
                                        {PRODUCT_ATTRIBUTES.style.label_ja} / {PRODUCT_ATTRIBUTES.style.label_zh}
                                    </label>
                                    <select
                                        className="form-input form-select"
                                        value={productAttrs.style.text}
                                        onChange={(e) => updateProductAttr('style', 'text', e.target.value)}

                                    >
                                        <option value="">-- 選択 --</option>
                                        {PRODUCT_ATTRIBUTES.style.preset_options.map(opt => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.value} ({opt.label_ja})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Material Feature - 素材特性 */}
                                <div className="form-group">
                                    <label className="form-label">
                                        {PRODUCT_ATTRIBUTES.materialFeature.label_ja} / {PRODUCT_ATTRIBUTES.materialFeature.label_zh}
                                    </label>
                                    <select
                                        className="form-input form-select"
                                        value={productAttrs.materialFeature.text}
                                        onChange={(e) => updateProductAttr('materialFeature', 'text', e.target.value)}

                                    >
                                        <option value="">-- 選択 --</option>
                                        {PRODUCT_ATTRIBUTES.materialFeature.preset_options.map(opt => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.value} ({opt.label_ja})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Quantity - 数量 */}
                                <div className="form-group">
                                    <label className="form-label">
                                        {PRODUCT_ATTRIBUTES.quantity.label_ja} / {PRODUCT_ATTRIBUTES.quantity.label_zh}
                                    </label>
                                    <select
                                        className="form-input form-select"
                                        value={productAttrs.quantity.text}
                                        onChange={(e) => updateProductAttr('quantity', 'text', e.target.value)}

                                    >
                                        <option value="">-- 選択 --</option>
                                        {PRODUCT_ATTRIBUTES.quantity.preset_options.map(opt => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.value} ({opt.label_ja})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Character - キャラクター（自由入力付き）*/}
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label className="form-label">
                                        {PRODUCT_ATTRIBUTES.character.label_ja} / {PRODUCT_ATTRIBUTES.character.label_zh}
                                    </label>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        <select
                                            className="form-input form-select"
                                            style={{ flex: '1', minWidth: '200px' }}
                                            value={productAttrs.character.text}
                                            onChange={(e) => updateProductAttr('character', 'text', e.target.value)}
                                        >
                                            <option value="">-- よく使うキャラ --</option>
                                            {PRODUCT_ATTRIBUTES.character.preset_options.map(opt => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.value} ({opt.label_ja})
                                                </option>
                                            ))}
                                        </select>
                                        <input
                                            type="text"
                                            className="form-input"
                                            style={{ flex: '1', minWidth: '200px' }}
                                            placeholder="または直接入力（中国語）..."
                                            value={productAttrs.character.text}
                                            onChange={(e) => updateProductAttr('character', 'text', e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={() => handleTranslate('character')}
                                            disabled={translating.character || !characterInput}
                                            style={{ whiteSpace: 'nowrap' }}
                                        >
                                            ✨ 翻訳
                                        </button>
                                    </div>
                                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <input
                                            type="text"
                                            className="form-input"
                                            style={{ flex: '1' }}
                                            placeholder="日本語で入力して翻訳..."
                                            value={characterInput}
                                            onChange={(e) => setCharacterInput(e.target.value)}
                                        />
                                        <span style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>→ 翻訳結果が上に反映</span>
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
