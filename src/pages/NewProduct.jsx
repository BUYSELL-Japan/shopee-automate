import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { mockCategories } from '../data/mockData'

function NewProduct() {
    const navigate = useNavigate()
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        stock: '',
        category: '',
        sku: '',
        weight: '',
        images: []
    })

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        // TODO: API連携時に実装
        alert('商品が登録されました！（モックデータ）')
        navigate('/products')
    }

    return (
        <div className="page-container animate-fade-in">
            <header className="page-header">
                <div>
                    <h1 className="page-title">新規出品</h1>
                    <p className="page-subtitle">Shopeeに新しい商品を出品します</p>
                </div>
            </header>

            <form onSubmit={handleSubmit}>
                <div className="grid-2">
                    {/* 基本情報 */}
                    <div className="card">
                        <h3 className="card-title" style={{ marginBottom: 'var(--spacing-lg)' }}>基本情報</h3>

                        <div className="form-group">
                            <label className="form-label">商品名 *</label>
                            <input
                                type="text"
                                name="name"
                                className="form-input"
                                placeholder="商品名を入力"
                                value={formData.name}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">商品説明</label>
                            <textarea
                                name="description"
                                className="form-input form-textarea"
                                placeholder="商品の詳細な説明を入力..."
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
                            >
                                <option value="">カテゴリを選択</option>
                                {mockCategories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* 価格・在庫 */}
                    <div className="card">
                        <h3 className="card-title" style={{ marginBottom: 'var(--spacing-lg)' }}>価格・在庫</h3>

                        <div className="form-group">
                            <label className="form-label">販売価格 (円) *</label>
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
                            <label className="form-label">SKU（商品コード）</label>
                            <input
                                type="text"
                                name="sku"
                                className="form-input"
                                placeholder="SKU-001"
                                value={formData.sku}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">重量 (g)</label>
                            <input
                                type="number"
                                name="weight"
                                className="form-input"
                                placeholder="0"
                                min="0"
                                value={formData.weight}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                </div>

                {/* 画像アップロード */}
                <div className="card" style={{ marginTop: 'var(--spacing-xl)' }}>
                    <h3 className="card-title" style={{ marginBottom: 'var(--spacing-lg)' }}>商品画像</h3>

                    <div className="upload-zone">
                        <div className="upload-icon">📷</div>
                        <p style={{ fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                            画像をドラッグ＆ドロップ
                        </p>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                            または<span style={{ color: 'var(--color-accent)' }}>クリックしてアップロード</span>
                        </p>
                        <p style={{
                            color: 'var(--color-text-muted)',
                            fontSize: 'var(--font-size-xs)',
                            marginTop: 'var(--spacing-md)'
                        }}>
                            JPG, PNG, WebP形式 / 最大5MB / 最大9枚
                        </p>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                        gap: 'var(--spacing-md)',
                        marginTop: 'var(--spacing-lg)'
                    }}>
                        {[1, 2, 3].map((i) => (
                            <div key={i} style={{
                                aspectRatio: '1',
                                background: 'var(--color-bg-tertiary)',
                                borderRadius: 'var(--radius-md)',
                                border: '2px dashed var(--color-border)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--color-text-muted)'
                            }}>
                                ➕
                            </div>
                        ))}
                    </div>
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
        </div>
    )
}

export default NewProduct
