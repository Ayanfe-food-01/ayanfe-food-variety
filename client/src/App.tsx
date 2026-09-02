import { useEffect, useLayoutEffect, useRef } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Home } from './pages/Home'
import { About } from './pages/About'
import { Contact } from './pages/Contact'
import { Help } from './pages/Help'
import { ReturnRefundPolicy } from './pages/ReturnRefundPolicy'
import { PrivacyPolicy } from './pages/PrivacyPolicy'
import { TermsAndConditions } from './pages/TermsAndConditions'
import { Shop } from './pages/Shop'
import { ProductDetails } from './pages/ProductDetails'
import { Cart } from './pages/Cart'
import { Wishlist } from './pages/Wishlist'
import { Checkout } from './pages/Checkout'
import { OrderConfirmation } from './pages/OrderConfirmation'
import { CustomerOrders } from './pages/CustomerOrders'
import { CustomerOrderDetails } from './pages/CustomerOrderDetails'
import { CustomerPaymentProof } from './pages/CustomerPaymentProof'
import { CustomerQuotes } from './pages/CustomerQuotes'
import { CustomerQuoteDetail } from './pages/CustomerQuoteDetail'
import { TrackOrder } from './pages/TrackOrder'
import { RequestQuote } from './pages/RequestQuote'
import { WriteReview } from './pages/WriteReview'
import { Dashboard } from './pages/Admin/Dashboard'
import { Analytics } from './pages/Admin/Analytics'
import { Orders } from './pages/Admin/Orders'
import { OrderDetail } from './pages/Admin/OrderDetail'
import { Payments } from './pages/Admin/Payments'
import { Notifications } from './pages/Admin/Notifications'
import { QuoteRequests } from './pages/Admin/QuoteRequests'
import { QuoteRequestDetail } from './pages/Admin/QuoteRequestDetail'
import { Settings } from './pages/Admin/Settings'
import { StoreSettings } from './pages/Admin/StoreSettings'
import { PaymentSettings } from './pages/Admin/PaymentSettings'
import { ContactSettings } from './pages/Admin/ContactSettings'
import { PasswordSettings } from './pages/Admin/PasswordSettings'
import { Login } from './pages/Login'
import { VerifyEmail } from './pages/VerifyEmail'
import { ForgotPassword } from './pages/ForgotPassword'
import { ResetPassword } from './pages/ResetPassword'
import { Account } from './pages/Account'
import { Products } from './pages/Admin/Products'
import { ProductForm } from './pages/Admin/ProductForm'
import { ProductView } from './pages/Admin/ProductView'
import { Categories } from './pages/Admin/Categories'
import { CategoryForm } from './pages/Admin/CategoryForm'
import { DeliveryZones } from './pages/Admin/DeliveryZones'
import { Banners } from './pages/Admin/Banners'
import { BannerForm } from './pages/Admin/BannerForm'
import { Testimonials } from './pages/Admin/Testimonials'
import { TestimonialForm } from './pages/Admin/TestimonialForm'
import { Reviews } from './pages/Admin/Reviews'
import { ReviewDetail } from './pages/Admin/ReviewDetail'
import { RequireAdmin } from './components/admin/RequireAdmin'
import { RouteLoadProvider } from './context/RouteLoadContext'
import { useRouteToast } from './hooks/useRouteToast'
import { useRouteLoad } from './hooks/useRouteLoad'
import { Seo } from './seo/Seo'
import { BrandingHead } from './seo/BrandingHead'
import { DEFAULT_LOGO_PATH } from './seo/config'
import { useStoreSettings } from './hooks/useStoreSettings'
import { WhatsAppFloatButton } from './components/layout/WhatsAppFloatButton'
import { scrollToTopInstant } from './utils/browserCompatibility'

function ScrollToTop() {
  const { pathname, search } = useLocation()

  useLayoutEffect(() => {
    scrollToTopInstant()
  }, [pathname, search])

  return null
}

function RouteToastBridge() {
  useRouteToast()
  return null
}

function RouteTransition() {
  const location = useLocation()
  const { settings } = useStoreSettings()
  const logoUrl = settings?.logoUrl || DEFAULT_LOGO_PATH
  const locationKey = `${location.pathname}${location.search}${location.hash}`
  const previousLocationKey = useRef(locationKey)
  const { isLoading, beginNavigation } = useRouteLoad()

  useEffect(() => {
    const handleInternalNavigation = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const target = event.target instanceof Element ? event.target.closest('a') : null
      if (!target || target.target === '_blank' || target.hasAttribute('download')) return

      const destination = new URL(target.href, window.location.href)
      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`
      const next = `${destination.pathname}${destination.search}${destination.hash}`

      if (destination.origin === window.location.origin && next !== current) {
        beginNavigation()
      }
    }

    const handleHistoryNavigation = () => beginNavigation()

    document.addEventListener('click', handleInternalNavigation, true)
    window.addEventListener('popstate', handleHistoryNavigation)

    return () => {
      document.removeEventListener('click', handleInternalNavigation, true)
      window.removeEventListener('popstate', handleHistoryNavigation)
    }
  }, [beginNavigation])

  useEffect(() => {
    if (previousLocationKey.current !== locationKey) {
      previousLocationKey.current = locationKey
      beginNavigation()
    }
  }, [beginNavigation, locationKey])

  return (
    <>
      {isLoading && (
        <div className="route-loader" role="status" aria-live="polite" aria-label="Loading page">
          <div className="route-loader-mark">
            <span className="route-loader-ring" aria-hidden="true" />
            <img src={logoUrl} alt="" />
          </div>
        </div>
      )}
      <div className="route-content" key={locationKey}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/help" element={<Help />} />
          <Route path="/return-refund-policy" element={<ReturnRefundPolicy />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/new-arrivals" element={<Shop newArrivalsOnly />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-confirmation/:orderNumber" element={<OrderConfirmation />} />
          <Route path="/track-order" element={<TrackOrder />} />
          <Route path="/request-a-quote" element={<RequestQuote />} />
          <Route path="/orders" element={<CustomerOrders />} />
          <Route path="/orders/:orderNumber" element={<CustomerOrderDetails />} />
          <Route path="/orders/:orderNumber/payment-proof" element={<CustomerPaymentProof />} />
          <Route path="/orders/:orderNumber/review/:orderItemId" element={<WriteReview />} />
          <Route path="/quotes" element={<CustomerQuotes />} />
          <Route path="/quotes/:reference" element={<CustomerQuoteDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/account" element={<Account />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/admin/login" element={<Navigate replace to="/login" />} />
          <Route path="/admin" element={<RequireAdmin><Dashboard /></RequireAdmin>} />
          <Route path="/admin/analytics" element={<RequireAdmin><Analytics /></RequireAdmin>} />
          <Route path="/admin/orders" element={<RequireAdmin><Orders /></RequireAdmin>} />
          <Route path="/admin/orders/:orderNumber" element={<RequireAdmin><OrderDetail /></RequireAdmin>} />
          <Route path="/admin/quote-requests" element={<RequireAdmin><QuoteRequests /></RequireAdmin>} />
          <Route path="/admin/quote-requests/:reference" element={<RequireAdmin><QuoteRequestDetail /></RequireAdmin>} />
          <Route path="/admin/products" element={<RequireAdmin><Products /></RequireAdmin>} />
          <Route path="/admin/products/new" element={<RequireAdmin><ProductForm /></RequireAdmin>} />
          <Route path="/admin/products/:id" element={<RequireAdmin><ProductView /></RequireAdmin>} />
          <Route path="/admin/products/:id/edit" element={<RequireAdmin><ProductForm /></RequireAdmin>} />
          <Route path="/admin/categories" element={<RequireAdmin><Categories /></RequireAdmin>} />
          <Route path="/admin/categories/new" element={<RequireAdmin><CategoryForm /></RequireAdmin>} />
          <Route path="/admin/categories/:id/edit" element={<RequireAdmin><CategoryForm /></RequireAdmin>} />
          <Route path="/admin/delivery-zones" element={<RequireAdmin><DeliveryZones /></RequireAdmin>} />
          <Route path="/admin/banners" element={<RequireAdmin><Banners /></RequireAdmin>} />
          <Route path="/admin/banners/new" element={<RequireAdmin><BannerForm /></RequireAdmin>} />
          <Route path="/admin/banners/:id/edit" element={<RequireAdmin><BannerForm /></RequireAdmin>} />
          <Route path="/admin/testimonials" element={<RequireAdmin><Testimonials /></RequireAdmin>} />
          <Route path="/admin/testimonials/new" element={<RequireAdmin><TestimonialForm /></RequireAdmin>} />
          <Route path="/admin/testimonials/:id/edit" element={<RequireAdmin><TestimonialForm /></RequireAdmin>} />
          <Route path="/admin/reviews" element={<RequireAdmin><Reviews /></RequireAdmin>} />
          <Route path="/admin/reviews/:id" element={<RequireAdmin><ReviewDetail /></RequireAdmin>} />
          <Route path="/admin/payments" element={<RequireAdmin><Payments /></RequireAdmin>} />
          <Route path="/admin/notifications" element={<RequireAdmin><Notifications /></RequireAdmin>} />
          <Route path="/admin/settings" element={<RequireAdmin><Settings /></RequireAdmin>} />
          <Route path="/admin/settings/store" element={<RequireAdmin><StoreSettings /></RequireAdmin>} />
          <Route path="/admin/settings/payment" element={<RequireAdmin><PaymentSettings /></RequireAdmin>} />
          <Route path="/admin/settings/contact" element={<RequireAdmin><ContactSettings /></RequireAdmin>} />
          <Route path="/admin/settings/password" element={<RequireAdmin><PasswordSettings /></RequireAdmin>} />
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
    || pathname === '/account'
    || pathname.startsWith('/admin')
    || pathname.startsWith('/orders')
    || pathname.startsWith('/quotes')
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
          : pathname.startsWith('/quotes')
            ? 'Your quotations | Ayanfe Food Variety'
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
  const location = useLocation()
  const isAdminRoute = location.pathname.startsWith('/admin')

  return (
    <>
      <BrandingHead />
      <ScrollToTop />
      <RouteToastBridge />
      <PrivateRouteSeo />
      <RouteLoadProvider>
        <RouteTransition />
      </RouteLoadProvider>
      {!isAdminRoute && <WhatsAppFloatButton />}
    </>
  )
}

export default App