import { useState } from 'react'
import { useShopeeAuth } from '../hooks/useShopeeAuth'
import { getAuthUrl } from '../services/shopeeApi'

function Settings() {
    const [activeTab, setActiveTab] = useState('api')
    const [formData, setFormData] = useState({
        shopId: '',
        accessToken: ''
    })
    const [testMessage, setTestMessage] = useState(null)

    const {
        shopId: savedShopId,
        shopName,
        isConnected,
        isLoading,
        error,
        shopInfo,
        testConnection,
        disconnect
    } = useShopeeAuth()

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleTestConnection = async () => {
        setTestMessage(null)
        const result = await testConnection(formData.accessToken, formData.shopId)
        if (result.success) {
            setTestMessage({ type: 'success', text: `✅ 接続成功！ショップ名: ${result.shopInfo?.shop_name}` })
        } else {
            setTestMessage({ type: 'error', text: `❌ ${result.error}` })
        }
    }

    const handleGetAuthUrl = async () => {
        try {
            const result = await getAuthUrl()
            if (result.status === 'success') {
                window.open(result.auth_url, '_blank')
            } else {
                alert('認可URL取得に失敗しました: ' + result.message)
            }
        } catch (e) {
            alert('エラー: ' + e.message)
        }
    }

    const handleDisconnect = () => {
        if (confirm('本当に切断しますか？')) {
            disconnect()
            setTestMessage(null)
            setFormData({ shopId: '', accessToken: '' })
        }
    }

    return (
        <div className="page-container animate-fade-in">
            <header className="page-header">
                <div>
                    <h1 className="page-title">設定</h1>
                    <p className="page-subtitle">APIとアカウントの設定を管理します</p>
                </div>
            </header>

            <div style={{ display: 'flex', gap: 'var(--spacing-xl)' }}>
                {/* Settings Navigation */}
                <div className="card" style={{ width: '240px', flexShrink: 0, height: 'fit-content' }}>
                    <nav style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                        <button
                            className={`nav-link ${activeTab === 'api' ? 'active' : ''}`}
                            onClick={() => setActiveTab('api')}
                            style={{ textAlign: 'left' }}
                        >
                            <span className="nav-icon">🔑</span>
                            <span>API設定</span>
                        </button>
                        <button
                            className={`nav-link ${activeTab === 'account' ? 'active' : ''}`}
                            onClick={() => setActiveTab('account')}
                            style={{ textAlign: 'left' }}
                        >
                            <span className="nav-icon">👤</span>
                            <span>アカウント</span>
                        </button>
                        <button
                            className={`nav-link ${activeTab === 'notifications' ? 'active' : ''}`}
                            onClick={() => setActiveTab('notifications')}
                            style={{ textAlign: 'left' }}
                        >
                            <span className="nav-icon">🔔</span>
                            <span>通知設定</span>
                        </button>
                        <button
                            className={`nav-link ${activeTab === 'automation' ? 'active' : ''}`}
                            onClick={() => setActiveTab('automation')}
                            style={{ textAlign: 'left' }}
                        >
                            <span className="nav-icon">⚡</span>
                            <span>自動化設定</span>
                        </button>
                    </nav>
                </div>

                {/* Settings Content */}
                <div style={{ flex: 1 }}>
                    {activeTab === 'api' && (
                        <div className="card">
                            <h3 className="card-title" style={{ marginBottom: 'var(--spacing-lg)' }}>
                                🔑 Shopee API設定
                            </h3>

                            {/* Connection Status */}
                            <div style={{
                                padding: 'var(--spacing-lg)',
                                background: isConnected
                                    ? 'rgba(34, 197, 94, 0.1)'
                                    : 'rgba(245, 158, 11, 0.1)',
                                borderRadius: 'var(--radius-md)',
                                marginBottom: 'var(--spacing-xl)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                                    <span style={{ fontSize: '1.5rem' }}>
                                        {isConnected ? '✅' : '⚠️'}
                                    </span>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>
                                            {isConnected ? `接続済み: ${shopName || savedShopId}` : '未接続'}
                                        </div>
                                        <div style={{
                                            fontSize: 'var(--font-size-sm)',
                                            color: 'var(--color-text-secondary)'
                                        }}>
                                            {isConnected
                                                ? `Shop ID: ${savedShopId} | Region: ${shopInfo?.region || 'TW'}`
                                                : 'API認証情報を入力して接続してください'}
                                        </div>
                                    </div>
                                </div>
                                {isConnected && (
                                    <button className="btn btn-ghost btn-sm" onClick={handleDisconnect}>
                                        切断
                                    </button>
                                )}
                            </div>

                            {/* OAuth Button */}
                            <div style={{
                                padding: 'var(--spacing-md)',
                                background: 'var(--color-bg-glass)',
                                borderRadius: 'var(--radius-md)',
                                marginBottom: 'var(--spacing-xl)',
                                textAlign: 'center'
                            }}>
                                <p style={{ marginBottom: 'var(--spacing-md)', color: 'var(--color-text-secondary)' }}>
                                    新しいショップを認証する場合はこちら
                                </p>
                                <button className="btn btn-secondary" onClick={handleGetAuthUrl}>
                                    🔗 Shopee OAuth認証を開始
                                </button>
                            </div>

                            {/* Manual Token Input */}
                            <div style={{
                                padding: 'var(--spacing-lg)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-md)',
                                marginBottom: 'var(--spacing-lg)'
                            }}>
                                <h4 style={{ marginBottom: 'var(--spacing-md)' }}>手動でトークンを設定</h4>

                                <div className="form-group">
                                    <label className="form-label">Shop ID</label>
                                    <input
                                        type="text"
                                        name="shopId"
                                        className="form-input"
                                        placeholder="例: 1648252597"
                                        value={formData.shopId}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Access Token</label>
                                    <input
                                        type="password"
                                        name="accessToken"
                                        className="form-input"
                                        placeholder="••••••••••••••••"
                                        value={formData.accessToken}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                {testMessage && (
                                    <div style={{
                                        padding: 'var(--spacing-md)',
                                        background: testMessage.type === 'success'
                                            ? 'rgba(34, 197, 94, 0.1)'
                                            : 'rgba(239, 68, 68, 0.1)',
                                        borderRadius: 'var(--radius-md)',
                                        marginBottom: 'var(--spacing-md)',
                                        color: testMessage.type === 'success'
                                            ? 'var(--color-success)'
                                            : 'var(--color-error)'
                                    }}>
                                        {testMessage.text}
                                    </div>
                                )}

                                {error && !testMessage && (
                                    <div style={{
                                        padding: 'var(--spacing-md)',
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        borderRadius: 'var(--radius-md)',
                                        marginBottom: 'var(--spacing-md)',
                                        color: 'var(--color-error)'
                                    }}>
                                        ❌ {error}
                                    </div>
                                )}

                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'flex-end',
                                    gap: 'var(--spacing-md)'
                                }}>
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleTestConnection}
                                        disabled={isLoading || !formData.shopId || !formData.accessToken}
                                    >
                                        {isLoading ? '🔄 テスト中...' : '🧪 接続テスト & 保存'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'account' && (
                        <div className="card">
                            <h3 className="card-title" style={{ marginBottom: 'var(--spacing-lg)' }}>
                                👤 アカウント設定
                            </h3>

                            <div className="form-group">
                                <label className="form-label">ストア名</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="あなたのストア名"
                                    defaultValue={shopName || "My Shopee Store"}
                                    readOnly={isConnected}
                                />
                                {isConnected && (
                                    <small style={{ color: 'var(--color-text-secondary)' }}>
                                        ※ Shopee APIから自動取得されます
                                    </small>
                                )}
                            </div>

                            <div className="form-group">
                                <label className="form-label">メールアドレス</label>
                                <input
                                    type="email"
                                    className="form-input"
                                    placeholder="your@email.com"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">言語</label>
                                <select className="form-input form-select">
                                    <option value="ja">日本語</option>
                                    <option value="en">English</option>
                                </select>
                            </div>

                            <button className="btn btn-primary" style={{ marginTop: 'var(--spacing-lg)' }}>
                                💾 変更を保存
                            </button>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="card">
                            <h3 className="card-title" style={{ marginBottom: 'var(--spacing-lg)' }}>
                                🔔 通知設定
                            </h3>

                            {[
                                { label: '新規注文', desc: '新しい注文が入った時に通知', defaultChecked: true },
                                { label: '在庫アラート', desc: '在庫が少なくなった時に通知', defaultChecked: true },
                                { label: '出品完了', desc: '商品の出品が完了した時に通知', defaultChecked: false },
                                { label: 'API エラー', desc: 'API接続でエラーが発生した時に通知', defaultChecked: true },
                            ].map((item, i) => (
                                <div key={i} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: 'var(--spacing-md)',
                                    borderBottom: '1px solid var(--color-border)'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 500 }}>{item.label}</div>
                                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                                            {item.desc}
                                        </div>
                                    </div>
                                    <label style={{
                                        position: 'relative',
                                        width: '48px',
                                        height: '24px',
                                        cursor: 'pointer'
                                    }}>
                                        <input
                                            type="checkbox"
                                            defaultChecked={item.defaultChecked}
                                            style={{ display: 'none' }}
                                        />
                                        <span style={{
                                            position: 'absolute',
                                            inset: 0,
                                            background: item.defaultChecked ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                                            borderRadius: 'var(--radius-full)',
                                            transition: 'var(--transition-fast)'
                                        }}>
                                            <span style={{
                                                position: 'absolute',
                                                width: '20px',
                                                height: '20px',
                                                background: 'white',
                                                borderRadius: 'var(--radius-full)',
                                                top: '2px',
                                                left: item.defaultChecked ? '26px' : '2px',
                                                transition: 'var(--transition-fast)'
                                            }} />
                                        </span>
                                    </label>
                                </div>
                            ))}

                            <button className="btn btn-primary" style={{ marginTop: 'var(--spacing-xl)' }}>
                                💾 変更を保存
                            </button>
                        </div>
                    )}

                    {activeTab === 'automation' && (
                        <div className="card">
                            <h3 className="card-title" style={{ marginBottom: 'var(--spacing-lg)' }}>
                                ⚡ 自動化設定
                            </h3>

                            <div className="form-group">
                                <label className="form-label">自動価格更新</label>
                                <select className="form-input form-select">
                                    <option value="disabled">無効</option>
                                    <option value="daily">毎日</option>
                                    <option value="weekly">毎週</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">在庫低下時のアクション</label>
                                <select className="form-input form-select">
                                    <option value="notify">通知のみ</option>
                                    <option value="hide">自動で非表示</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">注文自動処理</label>
                                <select className="form-input form-select">
                                    <option value="manual">手動</option>
                                    <option value="auto">自動処理</option>
                                </select>
                            </div>

                            <button className="btn btn-primary" style={{ marginTop: 'var(--spacing-lg)' }}>
                                💾 変更を保存
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Settings
