import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Home } from './pages/Home'
import { Shop } from './pages/Shop'
import { ProductDetails } from './pages/ProductDetails'
import { Cart } from './pages/Cart'
import { Checkout } from './pages/Checkout'
import { CustomerOrders } from './pages/CustomerOrders'
import { CustomerOrderDetails } from './pages/CustomerOrderDetails'
import { CustomerPaymentProof } from './pages/CustomerPaymentProof'
import { Dashboard } from './pages/Admin/Dashboard'
import { Orders } from './pages/Admin/Orders'
import { OrderDetail } from './pages/Admin/OrderDetail'
import { Payments } from './pages/Admin/Payments'
import { Settings } from './pages/Admin/Settings'
import { Login } from './pages/Admin/Login'
import { RequireAdmin } from './components/admin/RequireAdmin'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/orders" element={<CustomerOrders />} />
        <Route path="/orders/:orderNumber" element={<CustomerOrderDetails />} />
        <Route path="/orders/:orderNumber/payment-proof" element={<CustomerPaymentProof />} />
        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin" element={<RequireAdmin><Dashboard /></RequireAdmin>} />
        <Route path="/admin/orders" element={<RequireAdmin><Orders /></RequireAdmin>} />
        <Route path="/admin/orders/:orderNumber" element={<RequireAdmin><OrderDetail /></RequireAdmin>} />
        <Route path="/admin/payments" element={<RequireAdmin><Payments /></RequireAdmin>} />
        <Route path="/admin/settings" element={<RequireAdmin><Settings /></RequireAdmin>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App