import type { AdminAnalytics } from '../../../services/adminService'

const escapeCsv = (value: string | number): string => {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

const appendRows = (rows: string[], header: string[], body: Array<Array<string | number>>) => {
  rows.push(header.map(escapeCsv).join(','))
  body.forEach((row) => rows.push(row.map(escapeCsv).join(',')))
}

const buildCsv = (analytics: AdminAnalytics): string => {
  const rows: string[] = [
    'Ayanfe Food Variety - Sales analytics',
    `Period,${analytics.range.from},${analytics.range.to}`,
    `Timezone,${analytics.timezone}`,
    '',
    'Summary',
  ]
  appendRows(
    rows,
    ['Metric', 'Value', 'Trend'],
    [
      ['Total revenue', analytics.summary.revenue, analytics.trends.revenue ?? ''],
      ['Total orders', analytics.summary.orders, analytics.trends.orders ?? ''],
      ['Average order value', analytics.summary.averageOrderValue, analytics.trends.averageOrderValue ?? ''],
      ['Repeat customer rate', analytics.summary.repeatCustomerRate ?? '', analytics.trends.repeatCustomerRate ?? ''],
    ],
  )
  rows.push('', 'Trend')
  appendRows(
    rows,
    ['Period', 'Revenue', 'Orders'],
    analytics.series.map((point) => [point.label, point.revenue, point.orders]),
  )
  rows.push('', 'Top products')
  appendRows(
    rows,
    ['Product', 'Units sold', 'Revenue', 'Category'],
    analytics.topProducts.map((product) => [product.productName, product.unitsSold, product.revenue, product.categoryName]),
  )
  return rows.join('\n')
}

export function downloadAnalyticsCsv(analytics: AdminAnalytics): void {
  const blob = new Blob([buildCsv(analytics)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `sales-analytics-${analytics.range.from}-to-${analytics.range.to}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}