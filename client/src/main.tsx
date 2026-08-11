import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App.tsx'
import { CartProvider } from './context/CartContext'
import { CustomerAuthProvider } from './context/CustomerAuthContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CustomerAuthProvider>
      <CartProvider>
        <App />
      </CartProvider>
    </CustomerAuthProvider>
  </StrictMode>,
)
