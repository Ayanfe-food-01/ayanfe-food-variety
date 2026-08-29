import type { QuoteRequestStatus } from '../services/quoteService'

export const quoteStatusLabels: Record<QuoteRequestStatus, string> = {
  PENDING: 'Pending',
  CONTACTED: 'Contacted',
  QUOTED: 'Quoted',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

export const formatQuoteStatus = (status: QuoteRequestStatus): string => quoteStatusLabels[status]

export const quoteStatusClass = (status: QuoteRequestStatus): string => {
  if (status === 'COMPLETED') return 'bg-green/10 text-green'
  if (status === 'CANCELLED') return 'bg-orange/10 text-orange'
  if (status === 'CONTACTED' || status === 'QUOTED') return 'bg-orange/10 text-orange'
  return 'bg-sage text-green-dark'
}

export const allowedNextQuoteStatuses: Record<QuoteRequestStatus, readonly QuoteRequestStatus[]> = {
  PENDING: ['CONTACTED', 'CANCELLED'],
  CONTACTED: ['QUOTED', 'CANCELLED'],
  QUOTED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
}

export const getAllQuoteStatuses = (): QuoteRequestStatus[] => ['PENDING', 'CONTACTED', 'QUOTED', 'COMPLETED', 'CANCELLED']

export const getQuoteStatusOptions = (current: QuoteRequestStatus): QuoteRequestStatus[] => [
  current,
  ...allowedNextQuoteStatuses[current],
]