import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useShopeeAuth } from '../hooks/useShopeeAuth'
import { getOrders, formatPrice, formatPriceWithJPY, twdToJpy, jpyToTwd } from '../services/shopeeApi'

// デフォルトの費用設定
const DEFAULT_COSTS = {
    commissionRate: 0.1631, // 手数料16.31% (実際のShopee手数料率)
    yamatoShipping: 1350, // ヤマト送料（JPY）
    slsShipping: 76,      // SLS送料（TWD）実質コスト
}

function ProfitCalculator() {
    const [orders, setOrders] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState(null)
    const [saveMessage, setSaveMessage] = useState(null)
    const [costSettings, setCostSettings] = useState(DEFAULT_COSTS)
    const [orderCosts, setOrderCosts] = useState({}) // 注文ごとの費用編集
    const [savedCosts, setSavedCosts] = useState({}) // D1から読み込んだデータ
    const [statusFilter, setStatusFilter] = useState('all') // ステータスフィルタ

    const { accessToken, shopId, isConnected } = useShopeeAuth()

    // D1から保存済み費用を読み込む
    const loadSavedCosts = useCallback(async () => {
        if (!shopId) return
        try {
            const response = await fetch(`/api/db/order-costs?shop_id=${shopId}`)
            const result = await response.json()
            if (result.status === 'success' && result.data) {
                const costsMap = {}
                result.data.forEach(item => {
                    costsMap[item.order_id] = {
                        commission: item.commission_twd,
                        yamatoShipping: item.yamato_shipping,
                        slsShipping: item.sls_shipping,
                        productCost: item.product_cost,
                        otherCost: item.other_cost,
                        salesTwd: item.sales_twd,
                        notes: item.notes
                    }
                })
                setSavedCosts(costsMap)
                setOrderCosts(prev => ({ ...costsMap, ...prev }))
            }
        } catch (e) {
            console.error('Failed to load saved costs:', e)
        }
    }, [shopId])

    // 注文一覧を取得（全注文）
    const fetchOrders = async () => {
        if (!isConnected || !accessToken || !shopId) return

        setIsLoading(true)
        setError(null)

        try {
            // 全注文を取得（ステータス指定なし）
            const result = await getOrders(accessToken, shopId, {
                pageSize: 100
            })

            if (result.status === 'success') {
                const allOrders = result.data.orders || []
                setOrders(allOrders)

                // 初期費用を設定（保存済みデータがあればそれを使う）
                const initialCosts = {}
                allOrders.forEach(order => {
                    if (!savedCosts[order.id]) {
                        initialCosts[order.id] = {
                            commission: Math.round(order.total * costSettings.commissionRate),
                            yamatoShipping: costSettings.yamatoShipping,
                            slsShipping: costSettings.slsShipping,
                            otherCost: 0,
                            productCost: 0
                        }
                    }
                })
                setOrderCosts(prev => ({ ...prev, ...initialCosts }))
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
        if (isConnected && shopId) {
            loadSavedCosts()
        }
    }, [isConnected, shopId, loadSavedCosts])

    useEffect(() => {
        if (isConnected && Object.keys(savedCosts).length >= 0) {
            fetchOrders()
        }
    }, [isConnected, accessToken, shopId, savedCosts])

    // 費用を更新
    const updateOrderCost = (orderId, field, value) => {
        setOrderCosts(prev => ({
            ...prev,
            [orderId]: {
                ...prev[orderId],
                [field]: parseFloat(value) || 0
            }
        }))
    }

    // 単一注文を保存
    const saveOrderCost = async (orderId) => {
        if (!shopId) return
        const costs = orderCosts[orderId]
        if (!costs) return

        const order = orders.find(o => o.id === orderId)

        try {
            const response = await fetch(`/api/db/order-costs?shop_id=${shopId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderCost: {
                        order_id: orderId,
                        order_sn: order?.order_sn,
                        commission_twd: costs.commission || 0,
                        yamato_shipping: costs.yamatoShipping || 0,
                        sls_shipping: costs.slsShipping || 0,
                        product_cost: costs.productCost || 0,
                        other_cost: costs.otherCost || 0,
                        sales_twd: order?.total || 0
                    }
                })
            })
            const result = await response.json()
            if (result.status === 'success') {
                setSavedCosts(prev => ({ ...prev, [orderId]: costs }))
                return true
            }
        } catch (e) {
            console.error('Save error:', e)
        }
        return false
    }

    // すべての費用を一括保存
    const saveAllOrderCosts = async () => {
        if (!shopId) return
        setIsSaving(true)
        setSaveMessage(null)

        try {
            const orderCostsArray = orders.map(order => {
                const costs = orderCosts[order.id] || {}
                return {
                    order_id: order.id,
                    order_sn: order.order_sn,
                    commission_twd: costs.commission || Math.round(order.total * costSettings.commissionRate),
                    yamato_shipping: costs.yamatoShipping || costSettings.yamatoShipping,
                    sls_shipping: costs.slsShipping || costSettings.slsShipping,
                    product_cost: costs.productCost || 0,
                    other_cost: costs.otherCost || 0,
                    sales_twd: order.total || 0
                }
            })

            const response = await fetch(`/api/db/order-costs?shop_id=${shopId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderCosts: orderCostsArray })
            })
            const result = await response.json()

            if (result.status === 'success') {
                setSaveMessage({ type: 'success', text: `${orders.length}件の費用データを保存しました` })
                await loadSavedCosts()
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

    // 利益計算
    const calculateProfit = (order) => {
        const costs = orderCosts[order.id] || {}
        const salesTWD = order.total || 0
        const salesJPY = twdToJpy(salesTWD)

        // 費用（手数料はTWDベース、送料はJPYベース）
        const commissionTWD = costs.commission || Math.round(salesTWD * costSettings.commissionRate)
        const commissionJPY = twdToJpy(commissionTWD)

        const yamatoJPY = costs.yamatoShipping || costSettings.yamatoShipping
        const slsTWD = costs.slsShipping || costSettings.slsShipping
        const slsJPY = twdToJpy(slsTWD)

        const otherCostJPY = costs.otherCost || 0
        const productCostJPY = costs.productCost || 0

        // 総コスト（JPY）
        const totalCostJPY = commissionJPY + yamatoJPY + slsJPY + otherCostJPY + productCostJPY

        // 利益（JPY）
        const profitJPY = salesJPY - totalCostJPY

        return {
            salesTWD,
            salesJPY,
            commissionTWD,
            commissionJPY,
            yamatoJPY,
            slsTWD,
            slsJPY,
            otherCostJPY,
            productCostJPY,
            totalCostJPY,
            profitJPY,
            profitTWD: jpyToTwd(profitJPY)
        }
    }

    // フィルタリング
    const filteredOrders = orders.filter(order => {
        if (statusFilter === 'all') return true
        return order.status === statusFilter || order.order_status === statusFilter
    })

    // 合計計算
    const calculateTotals = () => {
        let totalSalesJPY = 0
        let totalCostsJPY = 0
        let totalProfitJPY = 0

        filteredOrders.forEach(order => {
            const profit = calculateProfit(order)
            totalSalesJPY += profit.salesJPY
            totalCostsJPY += profit.totalCostJPY
            totalProfitJPY += profit.profitJPY
        })

        return {
            totalSalesJPY,
            totalSalesTWD: jpyToTwd(totalSalesJPY),
            totalCostsJPY,
            totalCostsTWD: jpyToTwd(totalCostsJPY),
            totalProfitJPY,
            totalProfitTWD: jpyToTwd(totalProfitJPY),
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
            <div className="card" style={{ marginBottom: 'var(--spacing-xl)' }}>
                <h3 style={{ marginBottom: 'var(--spacing-lg)' }}>⚙️ デフォルト費用設定</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">手数料率 (%)</label>
                        <input
                            type="number"
                            className="form-input"
                            value={costSettings.commissionRate * 100}
                            onChange={(e) => setCostSettings(prev => ({ ...prev, commissionRate: parseFloat(e.target.value) / 100 || 0 }))}
                            min="0"
                            max="100"
                            step="0.1"
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">ヤマト送料 (¥)</label>
                        <input
                            type="number"
                            className="form-input"
                            value={costSettings.yamatoShipping}
                            onChange={(e) => setCostSettings(prev => ({ ...prev, yamatoShipping: parseFloat(e.target.value) || 0 }))}
                            min="0"
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">SLS送料 (NT$)</label>
                        <input
                            type="number"
                            className="form-input"
                            value={costSettings.slsShipping}
                            onChange={(e) => setCostSettings(prev => ({ ...prev, slsShipping: parseFloat(e.target.value) || 0 }))}
                            min="0"
                        />
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
                                    <th>手数料9%</th>
                                    <th>ヤマト送料</th>
                                    <th>SLS送料</th>
                                    <th>商品原価</th>
                                    <th>その他</th>
                                    <th>利益</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrders.map(order => {
                                    const profit = calculateProfit(order)
                                    const costs = orderCosts[order.id] || {}

                                    return (
                                        <tr key={order.id}>
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
                                                <div style={{ fontWeight: 600 }}>¥{profit.salesJPY.toLocaleString()}</div>
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                                                    NT${profit.salesTWD.toLocaleString()}
                                                </div>
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    style={{ width: 80, padding: '4px 8px', fontSize: 'var(--font-size-sm)' }}
                                                    value={costs.commission ?? profit.commissionTWD}
                                                    onChange={(e) => updateOrderCost(order.id, 'commission', e.target.value)}
                                                />
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>NT$</div>
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    style={{ width: 80, padding: '4px 8px', fontSize: 'var(--font-size-sm)' }}
                                                    value={costs.yamatoShipping ?? costSettings.yamatoShipping}
                                                    onChange={(e) => updateOrderCost(order.id, 'yamatoShipping', e.target.value)}
                                                />
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>¥</div>
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    style={{ width: 80, padding: '4px 8px', fontSize: 'var(--font-size-sm)' }}
                                                    value={costs.slsShipping ?? costSettings.slsShipping}
                                                    onChange={(e) => updateOrderCost(order.id, 'slsShipping', e.target.value)}
                                                />
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>NT$</div>
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    style={{ width: 80, padding: '4px 8px', fontSize: 'var(--font-size-sm)' }}
                                                    value={costs.productCost ?? 0}
                                                    onChange={(e) => updateOrderCost(order.id, 'productCost', e.target.value)}
                                                />
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>¥</div>
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    style={{ width: 80, padding: '4px 8px', fontSize: 'var(--font-size-sm)' }}
                                                    value={costs.otherCost ?? 0}
                                                    onChange={(e) => updateOrderCost(order.id, 'otherCost', e.target.value)}
                                                />
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>¥</div>
                                            </td>
                                            <td>
                                                <div style={{
                                                    fontWeight: 700,
                                                    fontSize: 'var(--font-size-lg)',
                                                    color: profit.profitJPY >= 0 ? 'var(--color-success)' : 'var(--color-error)'
                                                }}>
                                                    ¥{profit.profitJPY.toLocaleString()}
                                                </div>
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                                                    NT${profit.profitTWD.toLocaleString()}
                                                </div>
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
