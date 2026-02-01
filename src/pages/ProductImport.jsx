import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useShopeeAuth } from '../hooks/useShopeeAuth'

// NewProductと同じ費用定数
const COSTS = {
    COMMISSION_RATE: 0.1077,
    SERVICE_FEE_RATE: 0.03,
    TRANSACTION_FEE_RATE: 0.0254,
    YAMATO_JPY: 1350,
    SLS_NET_TWD: 76,
    TWD_JPY_RATE: 4.7,
    PROFIT_MARGIN: 0.15
}

const TOTAL_FEE_RATE = COSTS.COMMISSION_RATE + COSTS.SERVICE_FEE_RATE + COSTS.TRANSACTION_FEE_RATE

// 利益計算
function calculateProfitFromCost(costPriceJpy, sellingPriceTwd) {
    if (!costPriceJpy || costPriceJpy <= 0) return null

    const salesJpy = Math.round(sellingPriceTwd * COSTS.TWD_JPY_RATE)
    const feesTwd = Math.round(sellingPriceTwd * TOTAL_FEE_RATE)
    const feesJpy = Math.round(feesTwd * COSTS.TWD_JPY_RATE)
    const slsJpy = Math.round(COSTS.SLS_NET_TWD * COSTS.TWD_JPY_RATE)
    const totalCostJpy = costPriceJpy + COSTS.YAMATO_JPY + slsJpy + feesJpy
    const profitJpy = salesJpy - totalCostJpy

    return {
        salesJpy,
        totalCostJpy,
        profitJpy,
        profitTwd: Math.round(profitJpy / COSTS.TWD_JPY_RATE),
        isLoss: profitJpy < 0
    }
}

function ProductImport() {
    const [csvData, setCsvData] = useState([])
    const [matchedProducts, setMatchedProducts] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState(null)
    const [message, setMessage] = useState(null)
    const [step, setStep] = useState(1) // 1: アップロード, 2: プレビュー, 3: 完了

    const { shopId, isConnected } = useShopeeAuth()

    // CSVパース
    const parseCSV = (text) => {
        const lines = text.trim().split('\n')
        if (lines.length < 2) return []

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
        const data = []

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
            const row = {}
            headers.forEach((header, idx) => {
                row[header] = values[idx] || ''
            })
            data.push(row)
        }
        return data
    }

    // ファイル読み込み
    const handleFileUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        setIsLoading(true)
        setError(null)

        try {
            const text = await file.text()
            const parsed = parseCSV(text)

            if (parsed.length === 0) {
                setError('CSVにデータがありません')
                return
            }

            // 必要なカラムを確認
            const firstRow = parsed[0]
            const hasParentSKU = 'Parent SKU' in firstRow
            const hasItemName = '商品名　台湾' in firstRow || '商品名' in firstRow
            const hasAvgPrice = '平均価格' in firstRow

            if (!hasAvgPrice) {
                setError('「平均価格」カラムが見つかりません')
                return
            }

            if (!hasParentSKU && !hasItemName) {
                setError('「Parent SKU」または「商品名　台湾」カラムが必要です')
                return
            }

            setCsvData(parsed)
            await matchProducts(parsed)
            setStep(2)
        } catch (e) {
            setError('CSVの読み込みに失敗しました: ' + e.message)
        } finally {
            setIsLoading(false)
        }
    }

    // D1の商品とマッチング
    const matchProducts = async (csvRows) => {
        if (!shopId) return

        try {
            // D1から商品一覧を取得
            const response = await fetch(`/api/db/products?shop_id=${shopId}&limit=500`)
            const result = await response.json()

            if (result.status !== 'success') {
                setError('商品の取得に失敗しました')
                return
            }

            const dbProducts = result.data.products || []
            const matched = []

            csvRows.forEach(row => {
                const parentSku = row['Parent SKU'] || ''
                const itemName = row['商品名　台湾'] || row['商品名'] || ''
                const avgPrice = parseFloat(row['平均価格']) || 0
                const sourceUrl = row['仕入れ先URL'] || row['URL'] || ''

                // item_sku または item_name でマッチング
                let matchedProduct = null

                if (parentSku) {
                    matchedProduct = dbProducts.find(p => p.item_sku === parentSku)
                }

                if (!matchedProduct && itemName) {
                    matchedProduct = dbProducts.find(p =>
                        p.item_name && p.item_name.includes(itemName.substring(0, 30))
                    )
                }

                if (matchedProduct) {
                    const profit = calculateProfitFromCost(avgPrice, matchedProduct.current_price || matchedProduct.original_price || 0)
                    matched.push({
                        ...matchedProduct,
                        csvParentSku: parentSku,
                        csvItemName: itemName,
                        newCostPrice: avgPrice,
                        newSourceUrl: sourceUrl,
                        profitInfo: profit
                    })
                } else {
                    matched.push({
                        id: null,
                        item_name: itemName || parentSku,
                        csvParentSku: parentSku,
                        csvItemName: itemName,
                        newCostPrice: avgPrice,
                        newSourceUrl: sourceUrl,
                        matched: false
                    })
                }
            })

            setMatchedProducts(matched)
        } catch (e) {
            setError('マッチングに失敗しました: ' + e.message)
        }
    }

    // D1に保存
    const saveToD1 = async () => {
        if (!shopId) return

        const toSave = matchedProducts.filter(p => p.id)
        if (toSave.length === 0) {
            setError('保存する商品がありません')
            return
        }

        setIsSaving(true)
        setError(null)

        try {
            let successCount = 0

            for (const product of toSave) {
                // 更新データを構築（空のURLはスキップ）
                const updateData = {
                    id: product.id,
                    cost_price: product.newCostPrice
                }
                // source_urlが空でない場合のみ追加
                if (product.newSourceUrl && product.newSourceUrl.trim()) {
                    updateData.source_url = product.newSourceUrl
                }

                const response = await fetch(`/api/db/products?shop_id=${shopId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updateData)
                })
                const result = await response.json()
                if (result.status === 'success') successCount++
            }

            setMessage({ type: 'success', text: `${successCount}件の商品を更新しました` })
            setStep(3)
        } catch (e) {
            setError('保存に失敗しました: ' + e.message)
        } finally {
            setIsSaving(false)
        }
    }

    if (!isConnected) {
        return (
            <div className="page-container animate-fade-in">
                <header className="page-header">
                    <div>
                        <h1 className="page-title">📥 仕入れ情報インポート</h1>
                        <p className="page-subtitle">Shopee APIに接続してください</p>
                    </div>
                </header>
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-icon">🔗</div>
                        <div className="empty-title">API未接続</div>
                        <Link to="/settings" className="btn btn-primary" style={{ marginTop: 'var(--spacing-lg)' }}>
                            ⚙️ 設定へ移動
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    const matchedCount = matchedProducts.filter(p => p.id).length
    const lossCount = matchedProducts.filter(p => p.profitInfo?.isLoss).length

    return (
        <div className="page-container animate-fade-in">
            <header className="page-header">
                <div>
                    <h1 className="page-title">📥 仕入れ情報インポート</h1>
                    <p className="page-subtitle">
                        スプレッドシートから平均仕入れ価格をインポート
                    </p>
                </div>
                <Link to="/products" className="btn btn-secondary">
                    ← 商品一覧へ
                </Link>
            </header>

            {/* ステップ表示 */}
            <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-around', padding: 'var(--spacing-md)' }}>
                    <div style={{ textAlign: 'center', opacity: step >= 1 ? 1 : 0.5 }}>
                        <div style={{ fontSize: '24px' }}>📄</div>
                        <div>1. CSVアップロード</div>
                    </div>
                    <div style={{ textAlign: 'center', opacity: step >= 2 ? 1 : 0.5 }}>
                        <div style={{ fontSize: '24px' }}>👀</div>
                        <div>2. プレビュー確認</div>
                    </div>
                    <div style={{ textAlign: 'center', opacity: step >= 3 ? 1 : 0.5 }}>
                        <div style={{ fontSize: '24px' }}>✅</div>
                        <div>3. 完了</div>
                    </div>
                </div>
            </div>

            {/* エラー表示 */}
            {error && (
                <div style={{
                    padding: 'var(--spacing-md)',
                    marginBottom: 'var(--spacing-lg)',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid var(--color-error)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-error)'
                }}>
                    ❌ {error}
                </div>
            )}

            {/* メッセージ */}
            {message && (
                <div style={{
                    padding: 'var(--spacing-md)',
                    marginBottom: 'var(--spacing-lg)',
                    background: message.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    border: `1px solid ${message.type === 'success' ? 'var(--color-success)' : 'var(--color-error)'}`,
                    borderRadius: 'var(--radius-md)',
                    color: message.type === 'success' ? 'var(--color-success)' : 'var(--color-error)'
                }}>
                    {message.type === 'success' ? '✅' : '❌'} {message.text}
                </div>
            )}

            {/* Step 1: アップロード */}
            {step === 1 && (
                <div className="card">
                    <h3 style={{ marginBottom: 'var(--spacing-lg)' }}>📄 CSVファイルをアップロード</h3>

                    <div style={{ marginBottom: 'var(--spacing-lg)', padding: 'var(--spacing-md)', background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ fontWeight: 600, marginBottom: '8px' }}>必要なカラム:</div>
                        <ul style={{ margin: 0, paddingLeft: '20px' }}>
                            <li><code>Parent SKU</code> - 商品SKU（マッチング用）</li>
                            <li><code>商品名　台湾</code> - 商品名（マッチング用、オプション）</li>
                            <li><code>平均価格</code> - 平均仕入れ価格（JPY）</li>
                            <li><code>仕入れ先URL</code>（オプション）</li>
                        </ul>
                    </div>

                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        disabled={isLoading}
                        style={{ display: 'none' }}
                        id="csv-upload"
                    />
                    <label
                        htmlFor="csv-upload"
                        className="btn btn-primary"
                        style={{ cursor: 'pointer', display: 'inline-block' }}
                    >
                        {isLoading ? '⏳ 読み込み中...' : '📁 CSVファイルを選択'}
                    </label>
                </div>
            )}

            {/* Step 2: プレビュー */}
            {step === 2 && (
                <div className="card">
                    <h3 style={{ marginBottom: 'var(--spacing-lg)' }}>👀 インポートプレビュー</h3>

                    {/* サマリー */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
                        <div style={{ padding: 'var(--spacing-md)', background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                            <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>{csvData.length}</div>
                            <div style={{ color: 'var(--color-text-secondary)' }}>CSVの行数</div>
                        </div>
                        <div style={{ padding: 'var(--spacing-md)', background: 'rgba(34, 197, 94, 0.15)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                            <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-success)' }}>{matchedCount}</div>
                            <div style={{ color: 'var(--color-text-secondary)' }}>マッチした商品</div>
                        </div>
                        <div style={{ padding: 'var(--spacing-md)', background: lossCount > 0 ? 'rgba(239, 68, 68, 0.15)' : 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                            <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: lossCount > 0 ? 'var(--color-error)' : 'inherit' }}>{lossCount}</div>
                            <div style={{ color: 'var(--color-text-secondary)' }}>赤字商品⚠️</div>
                        </div>
                    </div>

                    {/* テーブル */}
                    <div style={{ overflowX: 'auto', marginBottom: 'var(--spacing-lg)' }}>
                        <table className="table" style={{ minWidth: 800 }}>
                            <thead>
                                <tr>
                                    <th>マッチ</th>
                                    <th>Parent SKU</th>
                                    <th>商品名</th>
                                    <th>平均仕入れ価格</th>
                                    <th>現在価格</th>
                                    <th>予想利益</th>
                                </tr>
                            </thead>
                            <tbody>
                                {matchedProducts.slice(0, 50).map((product, idx) => (
                                    <tr key={idx} style={{ background: product.profitInfo?.isLoss ? 'rgba(239, 68, 68, 0.1)' : 'transparent' }}>
                                        <td>
                                            {product.id ? (
                                                <span className="badge badge-success">✓</span>
                                            ) : (
                                                <span className="badge badge-warning">未マッチ</span>
                                            )}
                                        </td>
                                        <td>{product.csvParentSku || '-'}</td>
                                        <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {product.item_name}
                                        </td>
                                        <td>¥{product.newCostPrice?.toLocaleString()}</td>
                                        <td>
                                            {product.current_price ? `NT$${product.current_price.toLocaleString()}` : '-'}
                                        </td>
                                        <td>
                                            {product.profitInfo ? (
                                                <span style={{
                                                    fontWeight: 600,
                                                    color: product.profitInfo.isLoss ? 'var(--color-error)' : 'var(--color-success)'
                                                }}>
                                                    {product.profitInfo.isLoss ? '⚠️ ' : ''}
                                                    ¥{product.profitInfo.profitJpy.toLocaleString()}
                                                </span>
                                            ) : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {matchedProducts.length > 50 && (
                            <div style={{ textAlign: 'center', padding: 'var(--spacing-md)', color: 'var(--color-text-secondary)' }}>
                                他 {matchedProducts.length - 50} 件...
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                        <button className="btn btn-secondary" onClick={() => setStep(1)}>
                            ← 戻る
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={saveToD1}
                            disabled={isSaving || matchedCount === 0}
                        >
                            {isSaving ? '⏳ 保存中...' : `💾 ${matchedCount}件をD1に保存`}
                        </button>
                    </div>
                </div>
            )}

            {/* Step 3: 完了 */}
            {step === 3 && (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-icon">🎉</div>
                        <div className="empty-title">インポート完了！</div>
                        <p>仕入れ価格が更新されました。商品一覧で確認できます。</p>
                        <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-lg)' }}>
                            <Link to="/products" className="btn btn-primary">
                                📦 商品一覧を確認
                            </Link>
                            <button className="btn btn-secondary" onClick={() => { setStep(1); setCsvData([]); setMatchedProducts([]) }}>
                                🔄 別のファイルをインポート
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ProductImport
