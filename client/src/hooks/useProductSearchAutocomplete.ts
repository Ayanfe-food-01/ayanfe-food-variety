import { useEffect, useState } from 'react'
import { getProducts } from '../services/productService'
import type { Product } from '../types/product'

const MINIMUM_SEARCH_LENGTH = 2
const DEBOUNCE_MS = 280
const SUGGESTION_LIMIT = 8

interface ProductSearchAutocompleteState {
  suggestions: Product[]
  isLoading: boolean
  hasError: boolean
}

export function useProductSearchAutocomplete(value: string): ProductSearchAutocompleteState {
  const [state, setState] = useState<ProductSearchAutocompleteState>({
    suggestions: [],
    isLoading: false,
    hasError: false,
  })

  useEffect(() => {
    const query = value.trim()
    if (query.length < MINIMUM_SEARCH_LENGTH) {
      setState({ suggestions: [], isLoading: false, hasError: false })
      return
    }

    const controller = new AbortController()
    setState({ suggestions: [], isLoading: true, hasError: false })
    const timeoutId = window.setTimeout(() => {
      void getProducts({
        search: query,
        limit: SUGGESTION_LIMIT,
        signal: controller.signal,
      })
        .then((result) => {
          if (controller.signal.aborted) return
          setState({ suggestions: result.products, isLoading: false, hasError: false })
        })
        .catch(() => {
          if (controller.signal.aborted) return
          setState({ suggestions: [], isLoading: false, hasError: true })
        })
    }, DEBOUNCE_MS)

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [value])

  return state
}