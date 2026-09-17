import { useLocation } from 'react-router-dom'
import { RouteLoadProvider } from './context/RouteLoadContext'
import { Seo } from './seo/Seo'
import { BrandingHead } from './seo/BrandingHead'
import { WhatsAppFloatButton } from './components/layout/WhatsAppFloatButton'
import { RouteTransition } from './components/layout/RouteTransition'
import { RouteToastBridge } from './components/layout/RouteToastBridge'
import { ScrollToTop } from './components/layout/ScrollToTop'

function PrivateRouteSeo() {
  const { pathname } = useLocation()
  const isPrivateRoute =
    pathname === '/login'
    || pathname === '/forgot-password'
    || pathname === '/reset-password'
    || pathname === '/verify-email'
    || pathname === '/cart'
    || pathname === '/wishlist'
    || pathname.startsWith('/checkout')
    || pathname === '/account'
    || pathname.startsWith('/account/')
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
        : pathname.startsWith('/checkout')
          ? 'Checkout | Ayanfe Food Variety'
          : pathname === '/account/change-password'
            ? 'Change password | Ayanfe Food Variety'
            : pathname === '/account/notifications'
              ? 'Notification preferences | Ayanfe Food Variety'
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