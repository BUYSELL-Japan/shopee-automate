import { NavLink } from 'react-router-dom'

function Sidebar() {
    const navItems = [
        { path: '/', icon: '📊', label: 'ダッシュボード' },
        { path: '/products', icon: '📦', label: '商品一覧' },
        { path: '/products/new', icon: '➕', label: '新規出品' },
        { path: '/bulk-upload', icon: '📤', label: '一括出品' },
        { path: '/orders', icon: '🛒', label: '注文管理' },
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
