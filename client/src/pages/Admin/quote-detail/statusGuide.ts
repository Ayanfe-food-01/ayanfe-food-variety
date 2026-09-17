import type { QuoteRequestStatus } from '../../../services/quoteService'

export interface QuoteStatusGuideEntry {
  stepLabel: string
  adminNextStep: string
  optionHint: string
}

export const QUOTE_FLOW_STEPS: readonly QuoteRequestStatus[] = [
  'PENDING',
  'CONTACTED',
  'QUOTED',
  'ACCEPTED',
  'COMPLETED',
]

export const QUOTE_STATUS_GUIDE: Record<QuoteRequestStatus, QuoteStatusGuideEntry> = {
  PENDING: {
    stepLabel: 'New',
    adminNextStep: 'Reach the customer to confirm quantities, timing and any special needs, then mark this request as Contacted.',
    optionHint: 'Contact the customer to discuss the request before preparing a quotation.',
  },
  CONTACTED: {
    stepLabel: 'Contacted',
    adminNextStep: 'Enter a quoted price for every item (and delivery details) in the Prepare quotation card and submit it — the request moves to Quoted automatically.',
    optionHint: 'Contacted requests move to Quoted by submitting the Prepare quotation card, not through this status menu.',
  },
  QUOTED: {
    stepLabel: 'Quoted',
    adminNextStep: 'The quotation is with the customer. Await their accept or decline; you can revise the quotation any time before that.',
    optionHint: 'Awaiting the customer’s decision — you can revise the quotation if needed.',
  },
  ACCEPTED: {
    stepLabel: 'Accepted',
    adminNextStep: 'The customer accepted the quotation and will place their order at checkout. Mark this request Completed once the order is placed.',
    optionHint: 'Mark the request Completed once the customer’s order has been placed.',
  },
  COMPLETED: {
    stepLabel: 'Completed',
    adminNextStep: 'This quotation has been converted into an order. No further action is needed here.',
    optionHint: 'This request is complete.',
  },
  CANCELLED: {
    stepLabel: 'Cancelled',
    adminNextStep: 'This request was cancelled and can no longer continue.',
    optionHint: 'This request was cancelled.',
  },
}

export const quoteStatusStepIndex = (status: QuoteRequestStatus): number => {
  const index = QUOTE_FLOW_STEPS.indexOf(status)
  return index === -1 ? QUOTE_FLOW_STEPS.length - 1 : index
}