import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Home } from './pages/Home'
import { Shop } from './pages/Shop'
import { ProductDetails } from './pages/ProductDetails'
import { Cart } from './pages/Cart'
import { Checkout } from './pages/Checkout'
import { OrderConfirmation } from './pages/OrderConfirmation'
import { CustomerOrders } from './pages/CustomerOrders'
import { CustomerOrderDetails } from './pages/CustomerOrderDetails'
import { CustomerPaymentProof } from './pages/CustomerPaymentProof'
import { Dashboard } from './pages/Admin/Dashboard'
import { Orders } from './pages/Admin/Orders'
import { OrderDetail } from './pages/Admin/OrderDetail'
import { Payments } from './pages/Admin/Payments'
import { Settings } from './pages/Admin/Settings'
import { Login } from './pages/Login'
import { VerifyEmail } from './pages/VerifyEmail'
import { Products } from './pages/Admin/Products'
import { ProductForm } from './pages/Admin/ProductForm'
import { ProductView } from './pages/Admin/ProductView'
import { Categories } from './pages/Admin/Categories'
import { CategoryForm } from './pages/Admin/CategoryForm'
import { RequireAdmin } from './components/admin/RequireAdmin'
import { useRouteToast } from './hooks/useRouteToast'
import { Seo } from './seo/Seo'

function ScrollToTop() {
  const { pathname, search } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname, search])

  return null
}

function RouteToastBridge() {
  useRouteToast()
  return null
}

function PrivateRouteSeo() {
  const { pathname } = useLocation()
  const isPrivateRoute =
    pathname === '/login'
    || pathname === '/verify-email'
    || pathname === '/cart'
    || pathname === '/checkout'
    || pathname.startsWith('/admin')
    || pathname.startsWith('/orders')
    || pathname.startsWith('/order-confirmation')

  if (!isPrivateRoute) return null

  const title = pathname === '/login'
    ? 'Sign in | Ayanfe Food Variety'
    : pathname === '/verify-email'
      ? 'Verify your email | Ayanfe Food Variety'
    : pathname.startsWith('/admin')
      ? 'Admin area | Ayanfe Food Variety'
      : pathname === '/cart'
        ? 'Your cart | Ayanfe Food Variety'
        : pathname === '/checkout'
          ? 'Checkout | Ayanfe Food Variety'
          : 'Your orders | Ayanfe Food Variety'

  return (
    <Seo
      title={title}
      description="This page is for your Ayanfe Food Variety account and order activity."
      canonicalPath={pathname}
      noIndex
    />
  )
}

function App() {
  return (
    <>
      <ScrollToTop />
      <RouteToastBridge />
      <PrivateRouteSeo />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/new-arrivals" element={<Shop newArrivalsOnly />} />
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
         <Route path="/order-confirmation/:orderNumber" element={<OrderConfirmation />} />
        <Route path="/orders" element={<CustomerOrders />} />
        <Route path="/orders/:orderNumber" element={<CustomerOrderDetails />} />
        <Route path="/orders/:orderNumber/payment-proof" element={<CustomerPaymentProof />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/admin/login" element={<Navigate replace to="/login" />} />
        <Route path="/admin" element={<RequireAdmin><Dashboard /></RequireAdmin>} />
        <Route path="/admin/orders" element={<RequireAdmin><Orders /></RequireAdmin>} />
        <Route path="/admin/orders/:orderNumber" element={<RequireAdmin><OrderDetail /></RequireAdmin>} />
        <Route path="/admin/products" element={<RequireAdmin><Products /></RequireAdmin>} />
        <Route path="/admin/products/new" element={<RequireAdmin><ProductForm /></RequireAdmin>} />
        <Route path="/admin/products/:id" element={<RequireAdmin><ProductView /></RequireAdmin>} />
        <Route path="/admin/products/:id/edit" element={<RequireAdmin><ProductForm /></RequireAdmin>} />
        <Route path="/admin/categories" element={<RequireAdmin><Categories /></RequireAdmin>} />
        <Route path="/admin/categories/new" element={<RequireAdmin><CategoryForm /></RequireAdmin>} />
        <Route path="/admin/categories/:id/edit" element={<RequireAdmin><CategoryForm /></RequireAdmin>} />
        <Route path="/admin/payments" element={<RequireAdmin><Payments /></RequireAdmin>} />
        <Route path="/admin/settings" element={<RequireAdmin><Settings /></RequireAdmin>} />
      </Routes>
    </>
  )
}

export default App