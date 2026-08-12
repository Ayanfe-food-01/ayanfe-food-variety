import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { CloseIcon } from '../../assets/icons'

export type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  message: string
  type: ToastType
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void
  dismissToast: (id: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const toastStyles: Record<ToastType, string> = {
  success: 'border-green/25 bg-sage text-green-dark',
  error: 'border-red-200 bg-red-50 text-red-700',
  info: 'border-line bg-white text-green-dark',
}

interface ToastProviderProps {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = nextId.current++
    setToasts((current) => [...current, { id, message, type }])
    window.setTimeout(() => dismissToast(id), 5000)
  }, [dismissToast])

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 top-4 z-[100] flex flex-col items-end gap-3 sm:left-auto sm:right-6 sm:max-w-md" aria-live="polite">
        {toasts.map((toast) => (
          <div
            className={`toast-slide-in pointer-events-auto flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-xl shadow-green-dark/10 ${toastStyles[toast.type]}`}
            key={toast.id}
            role={toast.type === 'error' ? 'alert' : 'status'}
          >
            <p className="m-0 flex-1 leading-5">{toast.message}</p>
            <button
              className="shrink-0 rounded-full p-0.5 opacity-70 transition-opacity hover:opacity-100"
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
            >
              <CloseIcon size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// This module intentionally exports both the provider component and its hook.
// They must share the same private context instance.
// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within a ToastProvider')
  return context
}