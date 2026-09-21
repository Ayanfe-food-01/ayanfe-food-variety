import { LoginModal } from '../../components/auth/LoginModal'
import { Navbar } from '../../components/layout/Navbar'

/**
 * Admin sign-in page. Used as the redirect target whenever an admin session is
 * missing or has expired. Renders the same unified login used across the
 * storefront, so the sign-in experience is identical everywhere.
 */
export function AdminLogin() {
  return (
    <>
      <Navbar />
      <main className="min-h-dvh bg-cream" />
      <LoginModal standalone />
    </>
  )
}