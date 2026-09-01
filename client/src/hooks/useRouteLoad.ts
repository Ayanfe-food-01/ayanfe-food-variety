import { useContext } from 'react'
import { RouteLoadContext } from '../context/routeLoadContext'

export function useRouteLoad() {
  const context = useContext(RouteLoadContext)
  if (!context) throw new Error('useRouteLoad must be used within RouteLoadProvider')
  return context
}
