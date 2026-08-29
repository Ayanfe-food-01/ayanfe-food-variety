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

const EMPTY_STATE: ProductSearchAutocompleteState = {
  suggestions: [],
  isLoading: false,
  hasError: false,
}

export function useProductSearchAutocomplete(value: string): ProductSearchAutocompleteState {
  const [result, setResult] = useState<{
    query: string
    suggestions: Product[]
    hasError: boolean
  } | null>(null)

  const query = value.trim()
  const isQueryTooShort = query.length < MINIMUM_SEARCH_LENGTH

  useEffect(() => {
    if (isQueryTooShort) return

    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => {
      void getProducts({
        search: query,
        limit: SUGGESTION_LIMIT,
        signal: controller.signal,
      })
        .then((result) => {
          if (controller.signal.aborted) return
          setResult({ query, suggestions: result.products, hasError: false })
        })
        .catch(() => {
          if (controller.signal.aborted) return
          setResult({ query, suggestions: [], hasError: true })
        })
    }, DEBOUNCE_MS)

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [query, isQueryTooShort])

  if (isQueryTooShort) return EMPTY_STATE

  // Only results belonging to the current query are relevant. Anything else
  // means a search for this exact query is pending (debounce or request).
  const hasCurrentResult = result !== null && result.query === query
  return hasCurrentResult
    ? { suggestions: result!.suggestions, isLoading: false, hasError: result!.hasError }
    : { suggestions: [], isLoading: true, hasError: false }
}