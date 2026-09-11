import { LoginModal } from '../components/auth/LoginModal'
import { Navbar } from '../components/layout/Navbar'

export function Login() {
  return (
    <>
      <Navbar />
      <main className="min-h-dvh bg-cream" />
      <LoginModal standalone />
    </>
  )
}