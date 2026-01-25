import { useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useShopeeAuth } from '../hooks/useShopeeAuth'

function Sidebar() {
    const location = useLocation()
    const navigate = useNavigate()
    const { exchangeFullAuth } = useShopeeAuth()

    // 認証コールバック処理
    useEffect(() => {
        const params = new URLSearchParams(location.search)
        const code = params.get('code')
        const shopId = params.get('shop_id')

        if (code && shopId) {
            const handleAuth = async () => {
                const result = await exchangeFullAuth(code, shopId)
                if (result.success) {
                    // 成功したらパラメータを削除してリダイレクト
                    navigate('/settings', { replace: true })
                    alert('Shopeeとの接続に成功しました！')
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
        { path: '/orders', icon: '🛒', label: '注文管理' },
        { path: '/profit', icon: '💰', label: '利益計算' },
    ]

    const settingsItems = [
        { path: '/settings', icon: '⚙️', label: '設定' },
    ]

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <div className="logo-icon">🛍️</div>
                    <span className="logo-text">Shopee Auto</span>
                </div>
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
                    <div className="user-avatar">S</div>
                    <div className="user-info">
                        <div className="user-name">Shopee Store</div>
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
