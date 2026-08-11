import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useToast, type ToastType } from '../components/ui/Toast'

interface RouteToastState {
  toast?: {
    message?: unknown
    type?: unknown
  }
  message?: unknown
}

export function useRouteToast() {
  const location = useLocation()
  const navigate = useNavigate()
  const { showToast } = useToast()

  useEffect(() => {
    const state = location.state as RouteToastState | null
    const routeToast = state?.toast
    const message = typeof routeToast?.message === 'string'
      ? routeToast.message
      : typeof state?.message === 'string'
        ? state.message
        : null

    if (!message) return

    const type = routeToast?.type === 'success' || routeToast?.type === 'error' || routeToast?.type === 'info'
      ? routeToast.type
      : 'success'

    showToast(message, type as ToastType)
    navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: null })
  }, [location, navigate, showToast])
}