import { useState } from 'react'

function Settings() {
    const [activeTab, setActiveTab] = useState('api')
    const [apiSettings, setApiSettings] = useState({
        partnerId: '',
        partnerKey: '',
        shopId: '',
        accessToken: '',
        isConnected: false
    })

    const handleApiChange = (e) => {
        const { name, value } = e.target
        setApiSettings((prev) => ({ ...prev, [name]: value }))
    }

    const handleConnect = () => {
        // TODO: API連携時に実装
        setApiSettings((prev) => ({ ...prev, isConnected: true }))
        alert('API接続が完了しました！（モックデータ）')
    }

    const handleDisconnect = () => {
        setApiSettings((prev) => ({ ...prev, isConnected: false }))
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
                                background: apiSettings.isConnected
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
                                        {apiSettings.isConnected ? '✅' : '⚠️'}
                                    </span>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>
                                            {apiSettings.isConnected ? '接続済み' : '未接続'}
                                        </div>
                                        <div style={{
                                            fontSize: 'var(--font-size-sm)',
                                            color: 'var(--color-text-secondary)'
                                        }}>
                                            {apiSettings.isConnected
                                                ? 'Shopee APIに正常に接続されています'
                                                : 'API認証情報を入力して接続してください'}
                                        </div>
                                    </div>
                                </div>
                                {apiSettings.isConnected && (
                                    <button className="btn btn-ghost btn-sm" onClick={handleDisconnect}>
                                        切断
                                    </button>
                                )}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Partner ID</label>
                                <input
                                    type="text"
                                    name="partnerId"
                                    className="form-input"
                                    placeholder="あなたのPartner IDを入力"
                                    value={apiSettings.partnerId}
                                    onChange={handleApiChange}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Partner Key</label>
                                <input
                                    type="password"
                                    name="partnerKey"
                                    className="form-input"
                                    placeholder="••••••••••••••••"
                                    value={apiSettings.partnerKey}
                                    onChange={handleApiChange}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Shop ID</label>
                                <input
                                    type="text"
                                    name="shopId"
                                    className="form-input"
                                    placeholder="あなたのShop IDを入力"
                                    value={apiSettings.shopId}
                                    onChange={handleApiChange}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Access Token（オプション）</label>
                                <input
                                    type="password"
                                    name="accessToken"
                                    className="form-input"
                                    placeholder="••••••••••••••••"
                                    value={apiSettings.accessToken}
                                    onChange={handleApiChange}
                                />
                            </div>

                            <div style={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: 'var(--spacing-md)',
                                marginTop: 'var(--spacing-lg)'
                            }}>
                                <button className="btn btn-secondary">
                                    🧪 接続テスト
                                </button>
                                <button className="btn btn-primary" onClick={handleConnect}>
                                    💾 保存して接続
                                </button>
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
                                    defaultValue="My Shopee Store"
                                />
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
