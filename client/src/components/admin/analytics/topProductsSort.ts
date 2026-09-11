import type { AdminAnalytics } from '../../../services/adminService'

export type TopProductSortKey = 'revenue' | 'units'

export const sortedIndex = (products: AdminAnalytics['topProducts'], sortBy: TopProductSortKey): AdminAnalytics['topProducts'] => {
  const direction = sortBy === 'units' ? 1 : -1
  return [...products].sort((left, right) => {
    const comparison = sortBy === 'units'
      ? left.unitsSold - right.unitsSold
      : Number(left.revenue) - Number(right.revenue)
    if (comparison !== 0) return comparison * direction
    return left.productName.localeCompare(right.productName)
  })
}