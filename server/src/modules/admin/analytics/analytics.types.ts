export type AnalyticsRange = 'today' | '7d' | '30d' | 'month' | 'custom'

export interface AnalyticsOptions {
  range: AnalyticsRange
  from?: string
  to?: string
}

export interface AnalyticsRangeInfo {
  key: AnalyticsRange
  from: string
  to: string
}

export interface AnalyticsTrends {
  revenue: number | null
  orders: number | null
  averageOrderValue: number | null
  repeatCustomerRate: number | null
}

export interface RevenuePoint {
  label: string
  revenue: string
  orders: number
}

export interface AnalyticsTopProduct {
  productId: string
  productName: string
  categoryId: string | null
  categoryName: string
  unitsSold: number
  revenue: string
}

export interface AnalyticsCategoryShare {
  categoryId: string | null
  categoryName: string
  revenue: string
  unitsSold: number
  share: number
}

export interface AnalyticsCustomerInsights {
  newCustomers: number
  returningCustomers: number
  totalCustomers: number
  averageOrdersPerCustomer: number
  repeatCustomerRate: number | null
}

export interface AdminAnalytics {
  timezone: string
  range: AnalyticsRangeInfo
  summary: {
    revenue: string
    orders: number
    averageOrderValue: string
    repeatCustomerRate: number | null
  }
  trends: AnalyticsTrends
  series: RevenuePoint[]
  topProducts: AnalyticsTopProduct[]
  categories: AnalyticsCategoryShare[]
  customers: AnalyticsCustomerInsights
}