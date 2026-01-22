import { useState } from 'react'

function BulkUpload() {
    const [isDragging, setIsDragging] = useState(false)
    const [uploadedFile, setUploadedFile] = useState(null)

    const handleDragOver = (e) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = () => {
        setIsDragging(false)
    }

    const handleDrop = (e) => {
        e.preventDefault()
        setIsDragging(false)
        const files = e.dataTransfer.files
        if (files.length > 0) {
            setUploadedFile(files[0])
        }
    }

    const handleFileSelect = (e) => {
        if (e.target.files.length > 0) {
            setUploadedFile(e.target.files[0])
        }
    }

    const handleUpload = () => {
        // TODO: API連携時に実装
        alert('ファイルがアップロードされました！（モックデータ）')
        setUploadedFile(null)
    }

    return (
        <div className="page-container animate-fade-in">
            <header className="page-header">
                <div>
                    <h1 className="page-title">一括出品</h1>
                    <p className="page-subtitle">CSVファイルで複数の商品を一度に出品できます</p>
                </div>
            </header>

            {/* ステップ説明 */}
            <div className="card" style={{ marginBottom: 'var(--spacing-xl)' }}>
                <h3 className="card-title" style={{ marginBottom: 'var(--spacing-lg)' }}>一括出品の手順</h3>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 'var(--spacing-lg)'
                }}>
                    <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            background: 'var(--color-accent-gradient)',
                            borderRadius: 'var(--radius-full)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '700',
                            flexShrink: 0
                        }}>1</div>
                        <div>
                            <div style={{ fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>テンプレートを取得</div>
                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                                CSVテンプレートをダウンロード
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            background: 'var(--color-accent-gradient)',
                            borderRadius: 'var(--radius-full)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '700',
                            flexShrink: 0
                        }}>2</div>
                        <div>
                            <div style={{ fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>商品情報を入力</div>
                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                                テンプレートに商品情報を記入
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            background: 'var(--color-accent-gradient)',
                            borderRadius: 'var(--radius-full)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '700',
                            flexShrink: 0
                        }}>3</div>
                        <div>
                            <div style={{ fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>アップロード</div>
                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                                ファイルをアップロードして完了
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid-2">
                {/* テンプレートダウンロード */}
                <div className="card">
                    <h3 className="card-title" style={{ marginBottom: 'var(--spacing-lg)' }}>
                        📄 CSVテンプレート
                    </h3>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-lg)' }}>
                        まずはテンプレートをダウンロードして、商品情報を入力してください。
                    </p>
                    <button className="btn btn-secondary" style={{ width: '100%' }}>
                        📥 テンプレートをダウンロード
                    </button>
                </div>

                {/* ファイルアップロード */}
                <div className="card">
                    <h3 className="card-title" style={{ marginBottom: 'var(--spacing-lg)' }}>
                        📤 ファイルアップロード
                    </h3>

                    <div
                        className="upload-zone"
                        style={{
                            borderColor: isDragging ? 'var(--color-accent)' : 'var(--color-border)',
                            background: isDragging ? 'rgba(238, 77, 45, 0.1)' : 'transparent'
                        }}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById('file-input').click()}
                    >
                        <input
                            id="file-input"
                            type="file"
                            accept=".csv,.xlsx,.xls"
                            style={{ display: 'none' }}
                            onChange={handleFileSelect}
                        />
                        {uploadedFile ? (
                            <>
                                <div style={{ fontSize: '2rem', marginBottom: 'var(--spacing-md)' }}>📄</div>
                                <p style={{ fontWeight: 600 }}>{uploadedFile.name}</p>
                                <p style={{
                                    color: 'var(--color-text-secondary)',
                                    fontSize: 'var(--font-size-sm)',
                                    marginTop: 'var(--spacing-xs)'
                                }}>
                                    {(uploadedFile.size / 1024).toFixed(1)} KB
                                </p>
                            </>
                        ) : (
                            <>
                                <div className="upload-icon">📤</div>
                                <p style={{ fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                                    CSVファイルをドラッグ＆ドロップ
                                </p>
                                <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                                    または<span style={{ color: 'var(--color-accent)' }}>クリックして選択</span>
                                </p>
                            </>
                        )}
                    </div>

                    {uploadedFile && (
                        <div style={{
                            display: 'flex',
                            gap: 'var(--spacing-md)',
                            marginTop: 'var(--spacing-lg)'
                        }}>
                            <button
                                className="btn btn-secondary"
                                style={{ flex: 1 }}
                                onClick={() => setUploadedFile(null)}
                            >
                                キャンセル
                            </button>
                            <button
                                className="btn btn-primary"
                                style={{ flex: 1 }}
                                onClick={handleUpload}
                            >
                                🚀 一括出品を開始
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* アップロード履歴 */}
            <div className="card" style={{ marginTop: 'var(--spacing-xl)' }}>
                <h3 className="card-title" style={{ marginBottom: 'var(--spacing-lg)' }}>
                    📋 アップロード履歴
                </h3>
                <div className="empty-state">
                    <div className="empty-icon">📭</div>
                    <div className="empty-title">アップロード履歴はありません</div>
                    <p>一括出品を行うと、ここに履歴が表示されます。</p>
                </div>
            </div>
        </div>
    )
}

export default BulkUpload
