import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import ProductList from './pages/ProductList'
import ProductDetail from './pages/ProductDetail'
import NewProduct from './pages/NewProduct'
import BulkUpload from './pages/BulkUpload'
import Orders from './pages/Orders'
import Settings from './pages/Settings'

function App() {
    return (
        <div className="app-container">
            <Sidebar />
            <main className="main-content">
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/products" element={<ProductList />} />
                    <Route path="/products/:id" element={<ProductDetail />} />
                    <Route path="/products/new" element={<NewProduct />} />
                    <Route path="/bulk-upload" element={<BulkUpload />} />
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/settings" element={<Settings />} />
                </Routes>
            </main>
        </div>
    )
}

export default App

