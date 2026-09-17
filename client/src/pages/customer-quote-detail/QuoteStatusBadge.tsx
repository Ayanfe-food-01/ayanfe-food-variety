import type { QuoteRequestStatus } from '../../services/quoteService'
import { quoteStatusCopy } from './quoteStatusCopy'

interface QuoteStatusBadgeProps {
  status: QuoteRequestStatus
}

export function QuoteStatusBadge({ status }: QuoteStatusBadgeProps) {
  const entry = quoteStatusCopy[status]
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${entry.className}`}>{entry.label}</span>
}