interface RevenuePoint {
  label: string
  revenue: string
  orders: number
}

interface RevenueLineChartProps {
  points: RevenuePoint[]
  isLoading?: boolean
}

const chartWidth = 1000
const chartHeight = 320
const chartPadding = { top: 24, right: 24, bottom: 48, left: 68 }

const formatAxisValue = (value: number) =>
  new Intl.NumberFormat('en-NG', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)

export function RevenueLineChart({ points, isLoading = false }: RevenueLineChartProps) {
  if (isLoading) {
    return <div className="h-[320px] animate-pulse rounded-xl bg-sage/45" aria-label="Loading revenue chart" />
  }

  const values = points.map((point) => Number(point.revenue))
  const maxValue = Math.max(...values, 1)
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom
  const coordinates = points.map((point, index) => {
    const x = points.length === 1
      ? chartPadding.left + plotWidth / 2
      : chartPadding.left + (index / (points.length - 1)) * plotWidth
    const y = chartPadding.top + (1 - Number(point.revenue) / maxValue) * plotHeight
    return { ...point, x, y }
  })
  const line = coordinates.map(({ x, y }) => `${x},${y}`).join(' ')
  const labelIndexes = points.length <= 8
    ? points.map((_, index) => index)
    : [0, Math.floor((points.length - 1) / 2), points.length - 1]

  return (
    <div className="overflow-x-auto">
      <svg
        className="h-auto min-w-[620px] w-full"
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        role="img"
        aria-label="Revenue over time line chart"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = chartPadding.top + ratio * plotHeight
          const value = maxValue * (1 - ratio)
          return (
            <g key={ratio}>
              <line x1={chartPadding.left} x2={chartWidth - chartPadding.right} y1={y} y2={y} stroke="currentColor" strokeOpacity="0.12" />
              <text x={chartPadding.left - 12} y={y + 4} fill="currentColor" fillOpacity="0.58" fontSize="12" textAnchor="end">
                {formatAxisValue(value)}
              </text>
            </g>
          )
        })}
        <polyline points={line} fill="none" stroke="var(--color-green)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
        {coordinates.map((point) => (
          <circle
            cx={point.x}
            cy={point.y}
            fill="var(--color-cream)"
            r="5"
            stroke="var(--color-green)"
            strokeWidth="3"
            key={`${point.label}-${point.x}`}
          >
            <title>{`${point.label}: ${new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(point.revenue))} · ${point.orders} ${point.orders === 1 ? 'order' : 'orders'}`}</title>
          </circle>
        ))}
        {labelIndexes.map((index) => {
          const point = coordinates[index]
          if (!point) return null
          return (
            <text key={`${point.label}-label`} x={point.x} y={chartHeight - 14} fill="currentColor" fillOpacity="0.62" fontSize="12" textAnchor="middle">
              {point.label}
            </text>
          )
        })}
      </svg>
    </div>
  )
}