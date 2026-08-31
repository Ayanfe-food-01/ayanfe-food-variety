import { useCallback, useEffect, useState } from 'react'
import {
  getProductReviews,
  type ProductReviewAction,
  type ProductReviewItem,
  type ProductReviewSummary,
} from '../services/reviewService'

const REVIEWS_PER_PAGE = 5

export interface ProductReviewsState {
  summary: ProductReviewSummary | null
  items: ProductReviewItem[]
  reviewAction: ProductReviewAction | null
  totalPages: number
  status: 'idle' | 'loading' | 'ready' | 'error'
  errorMessage: string | null
}

export interface UseProductReviewsResult extends ProductReviewsState {
  hasMore: boolean
  isLoadingMore: boolean
  loadMore: () => Promise<void>
}

export function useProductReviews(productId: string | null): UseProductReviewsResult {
  const [state, setState] = useState<ProductReviewsState>({
    summary: null,
    items: [],
    reviewAction: null,
    totalPages: 1,
    status: 'idle',
    errorMessage: null,
  })
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const load = useCallback(async (targetId: string) => {
    setState((current) => ({ ...current, status: 'loading', errorMessage: null }))
    try {
      const result = await getProductReviews(targetId, { page: 1, limit: REVIEWS_PER_PAGE })
      setState({
        summary: result.summary,
        items: result.items,
        reviewAction: result.reviewAction,
        totalPages: result.pagination.totalPages,
        status: 'ready',
        errorMessage: null,
      })
    } catch (error: unknown) {
      setState((current) => ({
        ...current,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'The reviews could not be loaded right now.',
      }))
    }
  }, [])

  useEffect(() => {
    if (!productId) {
      setState({
        summary: null,
        items: [],
        reviewAction: null,
        totalPages: 1,
        status: 'idle',
        errorMessage: null,
      })
      return
    }
    const timeoutId = window.setTimeout(() => {
      void load(productId)
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [load, productId])

  const loadMore = useCallback(async () => {
    if (!productId || state.status !== 'ready' || isLoadingMore) return
    const nextPage = Math.ceil(state.items.length / REVIEWS_PER_PAGE) + 1
    setIsLoadingMore(true)
    try {
      const result = await getProductReviews(productId, { page: nextPage, limit: REVIEWS_PER_PAGE })
      setState((current) => ({
        ...current,
        items: [...current.items, ...result.items],
        summary: result.summary,
        reviewAction: result.reviewAction,
        totalPages: result.pagination.totalPages,
        status: 'ready',
        errorMessage: null,
      }))
    } catch {
      setState((current) => ({ ...current, status: 'error', errorMessage: null }))
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, productId, state.items.length, state.status])

  const hasMore = state.status === 'ready' && state.summary !== null
    && state.items.length < state.summary.reviewCount

  return {
    ...state,
    hasMore: Boolean(hasMore),
    isLoadingMore,
    loadMore,
  }
}