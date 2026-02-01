import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useShopeeAuth } from '../hooks/useShopeeAuth'
import { getOrders, twdToJpy, jpyToTwd } from '../services/shopeeApi'

// NewProductと同じ費用定数（実際の取引データに基づく）
const COSTS = {
    // Shopee手数料率（実際の取引データより）
    COMMISSION_RATE: 0.1077,      // 手数料 10.77%
    SERVICE_FEE_RATE: 0.03,       // 服務費 3%
    TRANSACTION_FEE_RATE: 0.0254, // 金流服務費 2.54%
    // 送料
    YAMATO_JPY: 1350,             // ヤマト送料（JPY）
    SLS_NET_TWD: 76,              // SLS実質送料（TWD）
    // 為替レート
    TWD_JPY_RATE: 4.7
}

// 合計手数料率
const TOTAL_FEE_RATE = COSTS.COMMISSION_RATE + COSTS.SERVICE_FEE_RATE + COSTS.TRANSACTION_FEE_RATE

function ProfitCalculator() {
    const [orders, setOrders] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState(null)
    const [saveMessage, setSaveMessage] = useState(null)
    const [orderCosts, setOrderCosts] = useState({}) // 注文ごとの費用編集
    const [statusFilter, setStatusFilter] = useState('all')

    const { accessToken, shopId, isConnected } = useShopeeAuth()

    // D1から保存済み費用を読み込む
    const loadSavedCosts = useCallback(async () => {
        if (!shopId) return {}
        try {
            const response = await fetch(`/api/db/order-costs?shop_id=${shopId}`)
            const result = await response.json()
            if (result.status === 'success' && result.data) {
                const costsMap = {}
                result.data.forEach(item => {
                    costsMap[item.order_id] = {
                        commissionTwd: item.commission_twd,
                        yamatoJpy: item.yamato_shipping,
                        slsTwd: item.sls_shipping,
                        productCostJpy: item.product_cost,
                        otherCostJpy: item.other_cost,
                        notes: item.notes,
                        saved: true
                    }
                })
                return costsMap
            }
        } catch (e) {
            console.error('Failed to load saved costs:', e)
        }
        return {}
    }, [shopId])

    // 注文一覧を取得
    const fetchOrders = async () => {
        if (!isConnected || !accessToken || !shopId) return

        setIsLoading(true)
        setError(null)

        try {
            // まず保存済みデータを読み込む
            const savedData = await loadSavedCosts()

            const result = await getOrders(accessToken, shopId, { pageSize: 100 })

            if (result.status === 'success') {
                const allOrders = result.data.orders || []
                setOrders(allOrders)

                // 各注文の初期費用を設定（保存済みデータがあれば使用）
                const initialCosts = {}
                allOrders.forEach(order => {
                    const salesTwd = order.total || 0
                    if (savedData[order.id]) {
                        initialCosts[order.id] = savedData[order.id]
                    } else {
                        // NewProductと同じロジックで計算
                        initialCosts[order.id] = {
                            commissionTwd: Math.round(salesTwd * COSTS.COMMISSION_RATE),
                            serviceTwd: Math.round(salesTwd * COSTS.SERVICE_FEE_RATE),
                            transactionTwd: Math.round(salesTwd * COSTS.TRANSACTION_FEE_RATE),
                            yamatoJpy: COSTS.YAMATO_JPY,
                            slsTwd: COSTS.SLS_NET_TWD,
                            productCostJpy: 0,
                            otherCostJpy: 0,
                            saved: false
                        }
                    }
                })
                setOrderCosts(initialCosts)
            } else {
                setError(result.message || '注文の取得に失敗しました')
            }
        } catch (e) {
            setError(e.message || 'エラーが発生しました')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (isConnected) {
            fetchOrders()
        }
    }, [isConnected, accessToken, shopId, loadSavedCosts])

    // 費用を更新
    const updateOrderCost = (orderId, field, value) => {
        setOrderCosts(prev => ({
            ...prev,
            [orderId]: {
                ...prev[orderId],
                [field]: parseFloat(value) || 0,
                saved: false // 変更されたことを記録
            }
        }))
    }

    // 単一注文を保存
    const saveOrderCost = async (orderId) => {
        if (!shopId) return false
        const costs = orderCosts[orderId]
        if (!costs) return false

        const order = orders.find(o => o.id === orderId)
        const salesTwd = order?.total || 0

        setIsSaving(true)
        try {
            const response = await fetch(`/api/db/order-costs?shop_id=${shopId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderCost: {
                        order_id: String(orderId),
                        order_sn: order?.order_sn || '',
                        commission_twd: costs.commissionTwd || Math.round(salesTwd * TOTAL_FEE_RATE),
                        yamato_shipping: costs.yamatoJpy || COSTS.YAMATO_JPY,
                        sls_shipping: costs.slsTwd || COSTS.SLS_NET_TWD,
                        product_cost: costs.productCostJpy || 0,
                        other_cost: costs.otherCostJpy || 0,
                        sales_twd: salesTwd
                    }
                })
            })
            const result = await response.json()
            if (result.status === 'success') {
                setOrderCosts(prev => ({
                    ...prev,
                    [orderId]: { ...prev[orderId], saved: true }
                }))
                setSaveMessage({ type: 'success', text: '保存しました' })
                setTimeout(() => setSaveMessage(null), 2000)
                return true
            } else {
                setSaveMessage({ type: 'error', text: result.message || '保存失敗' })
                setTimeout(() => setSaveMessage(null), 3000)
            }
        } catch (e) {
            setSaveMessage({ type: 'error', text: e.message })
            setTimeout(() => setSaveMessage(null), 3000)
        } finally {
            setIsSaving(false)
        }
        return false
    }

    // すべて保存
    const saveAllOrderCosts = async () => {
        if (!shopId || orders.length === 0) return
        setIsSaving(true)
        setSaveMessage(null)

        try {
            const orderCostsArray = orders.map(order => {
                const costs = orderCosts[order.id] || {}
                const salesTwd = order.total || 0
                return {
                    order_id: String(order.id),
                    order_sn: order.order_sn || '',
                    commission_twd: costs.commissionTwd || Math.round(salesTwd * TOTAL_FEE_RATE),
                    yamato_shipping: costs.yamatoJpy || COSTS.YAMATO_JPY,
                    sls_shipping: costs.slsTwd || COSTS.SLS_NET_TWD,
                    product_cost: costs.productCostJpy || 0,
                    other_cost: costs.otherCostJpy || 0,
                    sales_twd: salesTwd
                }
            })

            const response = await fetch(`/api/db/order-costs?shop_id=${shopId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderCosts: orderCostsArray })
            })
            const result = await response.json()

            if (result.status === 'success') {
                // 全てsavedに更新
                setOrderCosts(prev => {
                    const updated = { ...prev }
                    Object.keys(updated).forEach(id => {
                        updated[id] = { ...updated[id], saved: true }
                    })
                    return updated
                })
                setSaveMessage({ type: 'success', text: `${orders.length}件を保存しました` })
            } else {
                setSaveMessage({ type: 'error', text: result.message })
            }
        } catch (e) {
            setSaveMessage({ type: 'error', text: e.message })
        } finally {
            setIsSaving(false)
            setTimeout(() => setSaveMessage(null), 3000)
        }
    }

    // 利益計算（NewProductと同じロジック）
    const calculateProfit = (order) => {
        const costs = orderCosts[order.id] || {}
        const salesTwd = order.total || 0
        const salesJpy = Math.round(salesTwd * COSTS.TWD_JPY_RATE)

        // 手数料（TWD）- NewProductと同じ計算
        const commissionTwd = costs.commissionTwd ?? Math.round(salesTwd * COSTS.COMMISSION_RATE)
        const serviceTwd = costs.serviceTwd ?? Math.round(salesTwd * COSTS.SERVICE_FEE_RATE)
        const transactionTwd = costs.transactionTwd ?? Math.round(salesTwd * COSTS.TRANSACTION_FEE_RATE)
        const totalFeesTwd = commissionTwd + serviceTwd + transactionTwd

        // 送料
        const yamatoJpy = costs.yamatoJpy ?? COSTS.YAMATO_JPY
        const slsTwd = costs.slsTwd ?? COSTS.SLS_NET_TWD

        // 原価・その他
        const productCostJpy = costs.productCostJpy ?? 0
        const otherCostJpy = costs.otherCostJpy ?? 0

        // 総コスト計算（円換算）
        const feesTotalJpy = Math.round(totalFeesTwd * COSTS.TWD_JPY_RATE)
        const slsJpy = Math.round(slsTwd * COSTS.TWD_JPY_RATE)
        const totalCostJpy = feesTotalJpy + yamatoJpy + slsJpy + productCostJpy + otherCostJpy

        // 利益
        const profitJpy = salesJpy - totalCostJpy
        const profitTwd = Math.round(profitJpy / COSTS.TWD_JPY_RATE)

        return {
            salesTwd,
            salesJpy,
            commissionTwd,
            serviceTwd,
            transactionTwd,
            totalFeesTwd,
            yamatoJpy,
            slsTwd,
            slsJpy,
            productCostJpy,
            otherCostJpy,
            totalCostJpy,
            profitJpy,
            profitTwd
        }
    }

    // フィルタリング
    const filteredOrders = orders.filter(order => {
        if (statusFilter === 'all') return true
        return order.status === statusFilter || order.order_status === statusFilter
    })

    // 合計計算
    const calculateTotals = () => {
        let totalSalesJpy = 0
        let totalCostsJpy = 0
        let totalProfitJpy = 0

        filteredOrders.forEach(order => {
            const profit = calculateProfit(order)
            totalSalesJpy += profit.salesJpy
            totalCostsJpy += profit.totalCostJpy
            totalProfitJpy += profit.profitJpy
        })

        return {
            totalSalesJPY: totalSalesJpy,
            totalSalesTWD: Math.round(totalSalesJpy / COSTS.TWD_JPY_RATE),
            totalCostsJPY: totalCostsJpy,
            totalCostsTWD: Math.round(totalCostsJpy / COSTS.TWD_JPY_RATE),
            totalProfitJPY: totalProfitJpy,
            totalProfitTWD: Math.round(totalProfitJpy / COSTS.TWD_JPY_RATE),
            orderCount: filteredOrders.length
        }
    }

    if (!isConnected) {
        return (
            <div className="page-container animate-fade-in">
                <header className="page-header">
                    <div>
                        <h1 className="page-title">💰 利益計算</h1>
                        <p className="page-subtitle">Shopee APIに接続してください</p>
                    </div>
                </header>
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-icon">🔗</div>
                        <div className="empty-title">API未接続</div>
                        <p>利益を計算するには、まず設定ページでShopee APIに接続してください。</p>
                        <Link to="/settings" className="btn btn-primary" style={{ marginTop: 'var(--spacing-lg)' }}>
                            ⚙️ 設定へ移動
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    const totals = calculateTotals()

    return (
        <div className="page-container animate-fade-in">
            <header className="page-header">
                <div>
                    <h1 className="page-title">💰 利益計算</h1>
                    <p className="page-subtitle">
                        {isLoading ? '読み込み中...' : `${filteredOrders.length}件の注文 (総数: ${orders.length})`}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={fetchOrders}
                        disabled={isLoading}
                    >
                        🔄 更新
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={saveAllOrderCosts}
                        disabled={isSaving || isLoading}
                    >
                        {isSaving ? '⏳ 保存中...' : '💾 すべて保存'}
                    </button>
                </div>
            </header>

            {/* 保存メッセージ */}
            {saveMessage && (
                <div style={{
                    padding: 'var(--spacing-md)',
                    marginBottom: 'var(--spacing-lg)',
                    borderRadius: 'var(--radius-md)',
                    background: saveMessage.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    border: `1px solid ${saveMessage.type === 'success' ? 'var(--color-success)' : 'var(--color-error)'}`,
                    color: saveMessage.type === 'success' ? 'var(--color-success)' : 'var(--color-error)'
                }}>
                    {saveMessage.type === 'success' ? '✅' : '❌'} {saveMessage.text}
                </div>
            )}

            {/* ステータスフィルタ */}
            <div className="card" style={{ marginBottom: 'var(--spacing-lg)', padding: 'var(--spacing-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                    <span>📊 ステータスで絞り込み:</span>
                    <select
                        className="form-input form-select"
                        style={{ width: 'auto', minWidth: 150 }}
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">すべての注文</option>
                        <option value="COMPLETED">完了</option>
                        <option value="SHIPPED">発送済み</option>
                        <option value="READY_TO_SHIP">発送準備中</option>
                        <option value="TO_CONFIRM_RECEIVE">配送中</option>
                        <option value="UNPAID">未払い</option>
                        <option value="CANCELLED">キャンセル</option>
                    </select>
                </div>
            </div>

            {/* 費用設定 */}
            {/* 費用設定表示（参照用） */}
            <div className="card" style={{ marginBottom: 'var(--spacing-xl)' }}>
                <h3 style={{ marginBottom: 'var(--spacing-lg)' }}>⚙️ 現在の費用設定</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)' }}>
                    <div style={{ padding: 'var(--spacing-md)', background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>手数料合計</div>
                        <div style={{ fontWeight: 600, fontSize: 'var(--font-size-lg)' }}>{(TOTAL_FEE_RATE * 100).toFixed(2)}%</div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                            Commission: {(COSTS.COMMISSION_RATE * 100).toFixed(2)}%<br />
                            Service: {(COSTS.SERVICE_FEE_RATE * 100).toFixed(2)}%<br />
                            Transaction: {(COSTS.TRANSACTION_FEE_RATE * 100).toFixed(2)}%
                        </div>
                    </div>
                    <div style={{ padding: 'var(--spacing-md)', background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>ヤマト送料</div>
                        <div style={{ fontWeight: 600, fontSize: 'var(--font-size-lg)' }}>¥{COSTS.YAMATO_JPY.toLocaleString()}</div>
                    </div>
                    <div style={{ padding: 'var(--spacing-md)', background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>SLS送料</div>
                        <div style={{ fontWeight: 600, fontSize: 'var(--font-size-lg)' }}>NT${COSTS.SLS_NET_TWD}</div>
                    </div>
                    <div style={{ padding: 'var(--spacing-md)', background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>為替レート</div>
                        <div style={{ fontWeight: 600, fontSize: 'var(--font-size-lg)' }}>1 NT$ = ¥{COSTS.TWD_JPY_RATE}</div>
                    </div>
                </div>
            </div>

            {/* 合計サマリー */}
            <div className="stats-grid" style={{ marginBottom: 'var(--spacing-xl)' }}>
                <div className="stat-card">
                    <div className="stat-icon green">💵</div>
                    <div className="stat-content">
                        <div className="stat-label">総売上</div>
                        <div className="stat-value">¥{totals.totalSalesJPY.toLocaleString()}</div>
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                            NT${totals.totalSalesTWD.toLocaleString()}
                        </div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon red">📉</div>
                    <div className="stat-content">
                        <div className="stat-label">総コスト</div>
                        <div className="stat-value">¥{totals.totalCostsJPY.toLocaleString()}</div>
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                            NT${totals.totalCostsTWD.toLocaleString()}
                        </div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: totals.totalProfitJPY >= 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)' }}>
                        {totals.totalProfitJPY >= 0 ? '📈' : '📉'}
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">純利益</div>
                        <div className="stat-value" style={{ color: totals.totalProfitJPY >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
                            ¥{totals.totalProfitJPY.toLocaleString()}
                        </div>
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                            NT${totals.totalProfitTWD.toLocaleString()}
                        </div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon blue">📦</div>
                    <div className="stat-content">
                        <div className="stat-label">注文数</div>
                        <div className="stat-value">{totals.orderCount}</div>
                    </div>
                </div>
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-icon" style={{ animation: 'spin 1s linear infinite' }}>🔄</div>
                        <div className="empty-title">読み込み中...</div>
                    </div>
                </div>
            )}

            {/* Error */}
            {error && !isLoading && (
                <div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                    <div className="empty-state">
                        <div className="empty-icon">❌</div>
                        <div className="empty-title">{error}</div>
                        <button className="btn btn-primary" onClick={fetchOrders} style={{ marginTop: 'var(--spacing-lg)' }}>
                            🔄 再試行
                        </button>
                    </div>
                </div>
            )}

            {/* 注文リスト */}
            {!isLoading && !error && filteredOrders.length > 0 && (
                <div className="card">
                    <h3 style={{ marginBottom: 'var(--spacing-lg)' }}>📋 注文別利益一覧</h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="table" style={{ minWidth: 1000 }}>
                            <thead>
                                <tr>
                                    <th>注文ID</th>
                                    <th>ステータス</th>
                                    <th>商品</th>
                                    <th>売上</th>
                                    <th>手数料(16.3%)</th>
                                    <th>ヤマト送料</th>
                                    <th>SLS送料</th>
                                    <th>商品原価</th>
                                    <th>その他</th>
                                    <th>利益</th>
                                    <th>保存</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrders.map(order => {
                                    const profit = calculateProfit(order)
                                    const costs = orderCosts[order.id] || {}
                                    const isSaved = costs.saved === true

                                    return (
                                        <tr key={order.id} style={{ background: isSaved ? 'transparent' : 'rgba(234, 179, 8, 0.05)' }}>
                                            <td style={{ fontWeight: 600 }}>{order.id}</td>
                                            <td>
                                                <span className={`badge ${order.status === 'COMPLETED' || order.order_status === 'COMPLETED' ? 'badge-success' : 'badge-warning'}`}>
                                                    {order.status || order.order_status || 'N/A'}
                                                </span>
                                            </td>
                                            <td>
                                                {order.item_list?.slice(0, 2).map((item, idx) => (
                                                    <div key={idx} style={{ fontSize: 'var(--font-size-sm)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 150 }}>
                                                        {item.name}
                                                    </div>
                                                ))}
                                                {order.item_list?.length > 2 && (
                                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                                                        +{order.item_list.length - 2}件
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>¥{profit.salesJpy.toLocaleString()}</div>
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                                                    NT${profit.salesTwd.toLocaleString()}
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-error)' }}>
                                                    -NT${profit.totalFeesTwd.toLocaleString()}
                                                </div>
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                                                    ({(TOTAL_FEE_RATE * 100).toFixed(1)}%)
                                                </div>
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    style={{ width: 80, padding: '4px 8px', fontSize: 'var(--font-size-sm)' }}
                                                    value={costs.yamatoJpy ?? COSTS.YAMATO_JPY}
                                                    onChange={(e) => updateOrderCost(order.id, 'yamatoJpy', e.target.value)}
                                                />
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>¥</div>
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    style={{ width: 70, padding: '4px 8px', fontSize: 'var(--font-size-sm)' }}
                                                    value={costs.slsTwd ?? COSTS.SLS_NET_TWD}
                                                    onChange={(e) => updateOrderCost(order.id, 'slsTwd', e.target.value)}
                                                />
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>NT$</div>
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    style={{ width: 80, padding: '4px 8px', fontSize: 'var(--font-size-sm)' }}
                                                    value={costs.productCostJpy ?? 0}
                                                    onChange={(e) => updateOrderCost(order.id, 'productCostJpy', e.target.value)}
                                                />
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>¥</div>
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    style={{ width: 70, padding: '4px 8px', fontSize: 'var(--font-size-sm)' }}
                                                    value={costs.otherCostJpy ?? 0}
                                                    onChange={(e) => updateOrderCost(order.id, 'otherCostJpy', e.target.value)}
                                                />
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>¥</div>
                                            </td>
                                            <td>
                                                <div style={{
                                                    fontWeight: 700,
                                                    fontSize: 'var(--font-size-lg)',
                                                    color: profit.profitJpy >= 0 ? 'var(--color-success)' : 'var(--color-error)'
                                                }}>
                                                    ¥{profit.profitJpy.toLocaleString()}
                                                </div>
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                                                    NT${profit.profitTwd.toLocaleString()}
                                                </div>
                                            </td>
                                            <td>
                                                <button
                                                    className={`btn btn-sm ${isSaved ? 'btn-secondary' : 'btn-primary'}`}
                                                    onClick={() => saveOrderCost(order.id)}
                                                    disabled={isSaving}
                                                    style={{ padding: '4px 8px', fontSize: 'var(--font-size-xs)' }}
                                                >
                                                    {isSaved ? '✓' : '💾'}
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && orders.length === 0 && (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-icon">📭</div>
                        <div className="empty-title">完了した注文がありません</div>
                        <p>注文が完了すると、ここで利益を計算できます。</p>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    )
}

export default ProfitCalculator
