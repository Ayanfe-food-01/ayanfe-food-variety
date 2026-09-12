import { LoginModal } from '../../components/auth/LoginModal'
import { Navbar } from '../../components/layout/Navbar'

/**
 * Dedicated admin sign-in page. Used as the redirect target whenever an admin
 * session is missing or has expired, so the context is never ambiguous.
 */
export function AdminLogin() {
  return (
    <>
      <Navbar />
      <main className="min-h-dvh bg-cream" />
      <LoginModal standalone adminMode />
    </>
  )
}