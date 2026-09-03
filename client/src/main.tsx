import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import 'react-phone-number-input/style.css'
import './styles/globals.css'
import App from './App.tsx'
import { CartProvider } from './context/CartContext'
import { CustomerAuthProvider } from './context/CustomerAuthContext'
import { WishlistProvider } from './context/WishlistContext'
import { ToastProvider } from './components/ui/Toast'
import { MarketUiProvider } from './context/MarketUiContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <CustomerAuthProvider>
        <WishlistProvider>
          <ToastProvider>
            <CartProvider>
              <MarketUiProvider>
                <App />
              </MarketUiProvider>
            </CartProvider>
          </ToastProvider>
        </WishlistProvider>
      </CustomerAuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
