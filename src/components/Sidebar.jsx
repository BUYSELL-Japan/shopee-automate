import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useShopeeAuth } from '../hooks/useShopeeAuth'

// リージョン設定
const REGIONS = {
    TW: { name: '台湾', flag: '🇹🇼', currency: 'TWD' },
    MY: { name: 'マレーシア', flag: '🇲🇾', currency: 'MYR' }
}

function Sidebar() {
    const location = useLocation()
    const navigate = useNavigate()
    const { exchangeFullAuth } = useShopeeAuth()

    // アクティブリージョン状態（localStorageから復元）
    const [activeRegion, setActiveRegion] = useState(() => {
        return localStorage.getItem('shopee_active_region') || 'TW'
    })
    const [showRegionDropdown, setShowRegionDropdown] = useState(false)

    // リージョン変更時にlocalStorageに保存
    const handleRegionChange = (region) => {
        setActiveRegion(region)
        localStorage.setItem('shopee_active_region', region)
        setShowRegionDropdown(false)
        // ページをリロードして反映
        window.dispatchEvent(new CustomEvent('regionChanged', { detail: region }))
    }

    // 認証コールバック処理
    useEffect(() => {
        const params = new URLSearchParams(location.search)
        const code = params.get('code')
        const shopId = params.get('shop_id')

        if (code && shopId) {
            const handleAuth = async () => {
                // localStorageからリージョンを取得（設定ページで保存される）
                const authRegion = localStorage.getItem('shopee_auth_region') || 'TW'

                const result = await exchangeFullAuth(code, shopId, authRegion)
                if (result.success) {
                    // 成功したらパラメータを削除してリダイレクト
                    navigate('/settings', { replace: true })
                    // リージョンを切り替え
                    handleRegionChange(authRegion)
                    alert(`Shopee ${authRegion}ショップとの接続に成功しました！`)
                } else {
                    alert('接続エラー: ' + result.error)
                }
            }
            handleAuth()
        }
    }, [location.search, exchangeFullAuth, navigate])

    const navItems = [
        { path: '/', icon: '📊', label: 'ダッシュボード' },
        { path: '/products', icon: '📦', label: '商品一覧' },
        { path: '/products/new', icon: '➕', label: '新規出品' },
        { path: '/bulk-upload', icon: '📤', label: '一括出品' },
        { path: '/import', icon: '📥', label: '仕入れインポート' },
        { path: '/orders', icon: '🛒', label: '注文管理' },
        { path: '/profit', icon: '💰', label: '利益計算' },
    ]

    const settingsItems = [
        { path: '/settings', icon: '⚙️', label: '設定' },
    ]

    const currentRegion = REGIONS[activeRegion]

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <div className="logo-icon">🛍️</div>
                    <span className="logo-text">Shopee Auto</span>
                </div>
            </div>

            {/* リージョン切り替え */}
            <div style={{
                padding: '0 var(--spacing-md)',
                marginBottom: 'var(--spacing-md)'
            }}>
                <div
                    onClick={() => setShowRegionDropdown(!showRegionDropdown)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: 'var(--spacing-sm) var(--spacing-md)',
                        background: 'var(--color-bg-glass)',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        border: '1px solid var(--color-border)'
                    }}
                >
                    <span style={{ fontSize: '20px' }}>{currentRegion.flag}</span>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                            {currentRegion.name}
                        </div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                            {currentRegion.currency}
                        </div>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                        {showRegionDropdown ? '▲' : '▼'}
                    </span>
                </div>

                {showRegionDropdown && (
                    <div style={{
                        marginTop: '4px',
                        background: 'var(--color-bg-secondary)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        overflow: 'hidden'
                    }}>
                        {Object.entries(REGIONS).map(([key, region]) => (
                            <div
                                key={key}
                                onClick={() => handleRegionChange(key)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: 'var(--spacing-sm) var(--spacing-md)',
                                    cursor: 'pointer',
                                    background: activeRegion === key ? 'var(--color-bg-glass)' : 'transparent',
                                    borderLeft: activeRegion === key ? '3px solid var(--color-primary)' : '3px solid transparent'
                                }}
                            >
                                <span style={{ fontSize: '18px' }}>{region.flag}</span>
                                <span style={{ fontWeight: activeRegion === key ? 600 : 400 }}>
                                    {region.name}
                                </span>
                                {activeRegion === key && (
                                    <span style={{ marginLeft: 'auto', color: 'var(--color-primary)' }}>✓</span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <nav className="sidebar-nav">
                <div className="nav-section">
                    <div className="nav-section-title">メニュー</div>
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                            end={item.path === '/'}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </div>

                <div className="nav-section">
                    <div className="nav-section-title">システム</div>
                    {settingsItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </div>
            </nav>

            <div className="sidebar-footer">
                <div className="user-card">
                    <div className="user-avatar">{currentRegion.flag}</div>
                    <div className="user-info">
                        <div className="user-name">Shopee {currentRegion.name}</div>
                        <div className="user-status">
                            <span className="status-dot"></span>
                            接続中
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    )
}

export default Sidebar

