import type { QuoteRequestStatus } from '../../../../services/quoteService'

export interface QuoteStatusCopyEntry {
  label: string
  className: string
}

export const quoteStatusCopy: Record<QuoteRequestStatus, QuoteStatusCopyEntry> = {
  PENDING: { label: 'Pending review', className: 'bg-sage text-green-dark' },
  CONTACTED: { label: 'We contacted you', className: 'bg-sage text-green-dark' },
  QUOTED: { label: 'Ready for you', className: 'bg-orange/15 text-orange' },
  ACCEPTED: { label: 'Accepted', className: 'bg-green/10 text-green' },
  COMPLETED: { label: 'Completed', className: 'bg-green text-cream' },
  CANCELLED: { label: 'Declined', className: 'bg-orange/10 text-orange' },
}