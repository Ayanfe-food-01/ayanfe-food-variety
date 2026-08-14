import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Home } from './pages/Home'
import { About } from './pages/About'
import { Shop } from './pages/Shop'
import { ProductDetails } from './pages/ProductDetails'
import { Cart } from './pages/Cart'
import { Wishlist } from './pages/Wishlist'
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
import { ForgotPassword } from './pages/ForgotPassword'
import { ResetPassword } from './pages/ResetPassword'
import { Products } from './pages/Admin/Products'
import { ProductForm } from './pages/Admin/ProductForm'
import { ProductView } from './pages/Admin/ProductView'
import { Categories } from './pages/Admin/Categories'
import { CategoryForm } from './pages/Admin/CategoryForm'
import { Banners } from './pages/Admin/Banners'
import { BannerForm } from './pages/Admin/BannerForm'
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

function RouteTransition() {
  const location = useLocation()
  const locationKey = `${location.pathname}${location.search}${location.hash}`
  const previousLocationKey = useRef(locationKey)
  const transitionTimeout = useRef<number | undefined>(undefined)
  const [isRouteLoading, setIsRouteLoading] = useState(false)

  const startRouteTransition = useCallback(() => {
    if (transitionTimeout.current !== undefined) {
      window.clearTimeout(transitionTimeout.current)
    }

    setIsRouteLoading(true)
    transitionTimeout.current = window.setTimeout(() => {
      setIsRouteLoading(false)
      transitionTimeout.current = undefined
    }, 650)
  }, [])

  useEffect(() => {
    const handleInternalNavigation = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const target = event.target instanceof Element ? event.target.closest('a') : null
      if (!target || target.target === '_blank' || target.hasAttribute('download')) return

      const destination = new URL(target.href, window.location.href)
      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`
      const next = `${destination.pathname}${destination.search}${destination.hash}`

      if (destination.origin === window.location.origin && next !== current) {
        startRouteTransition()
      }
    }

    const handleHistoryNavigation = () => startRouteTransition()

    document.addEventListener('click', handleInternalNavigation, true)
    window.addEventListener('popstate', handleHistoryNavigation)

    return () => {
      document.removeEventListener('click', handleInternalNavigation, true)
      window.removeEventListener('popstate', handleHistoryNavigation)
      if (transitionTimeout.current !== undefined) window.clearTimeout(transitionTimeout.current)
    }
  }, [startRouteTransition])

  useEffect(() => {
    if (previousLocationKey.current !== locationKey) {
      previousLocationKey.current = locationKey
      startRouteTransition()
    }
  }, [locationKey, startRouteTransition])

  return (
    <>
      {isRouteLoading && (
        <div className="route-loader" role="status" aria-live="polite" aria-label="Loading page">
          <div className="route-loader-mark">
            <span className="route-loader-ring" aria-hidden="true" />
            <img src="/branding/ayanfe-food-variety-logo.png" alt="" />
          </div>
        </div>
      )}
      <div className="route-content" key={locationKey}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/new-arrivals" element={<Shop newArrivalsOnly />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-confirmation/:orderNumber" element={<OrderConfirmation />} />
          <Route path="/orders" element={<CustomerOrders />} />
          <Route path="/orders/:orderNumber" element={<CustomerOrderDetails />} />
          <Route path="/orders/:orderNumber/payment-proof" element={<CustomerPaymentProof />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
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
          <Route path="/admin/banners" element={<RequireAdmin><Banners /></RequireAdmin>} />
          <Route path="/admin/banners/new" element={<RequireAdmin><BannerForm /></RequireAdmin>} />
          <Route path="/admin/banners/:id/edit" element={<RequireAdmin><BannerForm /></RequireAdmin>} />
          <Route path="/admin/payments" element={<RequireAdmin><Payments /></RequireAdmin>} />
          <Route path="/admin/settings" element={<RequireAdmin><Settings /></RequireAdmin>} />
        </Routes>
      </div>
    </>
  )
}

function PrivateRouteSeo() {
  const { pathname } = useLocation()
  const isPrivateRoute =
    pathname === '/login'
    || pathname === '/forgot-password'
    || pathname === '/reset-password'
    || pathname === '/verify-email'
    || pathname === '/cart'
    || pathname === '/wishlist'
    || pathname === '/checkout'
    || pathname.startsWith('/admin')
    || pathname.startsWith('/orders')
    || pathname.startsWith('/order-confirmation')

  if (!isPrivateRoute) return null

  const title = pathname === '/login'
    ? 'Sign in | Ayanfe Food Variety'
    : pathname === '/forgot-password'
      ? 'Forgot password | Ayanfe Food Variety'
      : pathname === '/reset-password'
        ? 'Reset password | Ayanfe Food Variety'
    : pathname === '/verify-email'
      ? 'Verify your email | Ayanfe Food Variety'
    : pathname.startsWith('/admin')
      ? 'Admin area | Ayanfe Food Variety'
      : pathname === '/cart'
        ? 'Your cart | Ayanfe Food Variety'
          : pathname === '/wishlist'
            ? 'Wishlist | Ayanfe Food Variety'
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
      <RouteTransition />
    </>
  )
}

export default App