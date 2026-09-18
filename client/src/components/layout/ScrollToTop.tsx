import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { scrollToTopInstant } from '../../utils/browserCompatibility'

export function ScrollToTop() {
  const { pathname, hash } = useLocation()

  useLayoutEffect(() => {
    scrollToTopInstant()
  }, [pathname, hash])

  return null
}