import type { AdminQuoteRequestDetail, QuoteRequestStatus } from '../../../services/quoteService'
import type { QuoteFulfillmentOption } from './constants'
import { QuoteDetailFulfillmentCard } from './QuoteDetailFulfillmentCard'
import { QuoteDetailPricingTable } from './QuoteDetailPricingTable'
import { QuoteDetailStatusCard } from './QuoteDetailStatusCard'

interface QuoteDetailPrepareSectionProps {
  quote: AdminQuoteRequestDetail
  unitPrices: Record<string, string>
  onPriceChange: (itemId: string, value: string) => void
  missingUnitPriceCount: number
  fulfillmentMethod: QuoteFulfillmentOption
  onFulfillmentMethodChange: (value: QuoteFulfillmentOption) => void
  deliveryFeeInput: string
  onDeliveryFeeInputChange: (value: string) => void
  subtotalCents: number
  deliveryFeeCents: number
  totalCents: number
  quotationError: string | null
  isPreparingQuotation: boolean
  onPrepare: () => void
  status: QuoteRequestStatus
  statusOptions: QuoteRequestStatus[]
  onStatusChange: (status: QuoteRequestStatus) => void
  isSavingStatus: boolean
  onSaveStatus: () => void
  internalNote: string
  onInternalNoteChange: (value: string) => void
  isSavingNote: boolean
  onSaveNote: () => void
}

export function QuoteDetailPrepareSection({
  quote,
  unitPrices,
  onPriceChange,
  missingUnitPriceCount,
  fulfillmentMethod,
  onFulfillmentMethodChange,
  deliveryFeeInput,
  onDeliveryFeeInputChange,
  subtotalCents,
  deliveryFeeCents,
  totalCents,
  quotationError,
  isPreparingQuotation,
  onPrepare,
  status,
  statusOptions,
  onStatusChange,
  isSavingStatus,
  onSaveStatus,
  internalNote,
  onInternalNoteChange,
  isSavingNote,
  onSaveNote,
}: QuoteDetailPrepareSectionProps) {
  return (
    <section className="mt-5 rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6" aria-label="Prepare quotation">
      <div>
        <h2 className="text-lg font-bold text-green-dark">Prepare quotation</h2>
        <p className="mt-1 text-sm text-muted">Enter a quoted unit price for each requested item and an optional delivery fee. Totals are calculated on the server and saved as a snapshot, so later catalog price changes never affect this quotation.</p>
      </div>

      <QuoteDetailPricingTable
        items={quote.items}
        unitPrices={unitPrices}
        onPriceChange={onPriceChange}
        shoppingMode={quote.shoppingMode}
      />

      {missingUnitPriceCount > 0 && (
        <p className="mt-3 rounded-xl border border-orange/25 bg-orange/5 p-3 text-xs font-semibold text-orange">
          {missingUnitPriceCount} item(s) without a valid unit price are excluded from the totals below.
        </p>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <QuoteDetailFulfillmentCard
          fulfillmentMethod={fulfillmentMethod}
          onFulfillmentMethodChange={onFulfillmentMethodChange}
          deliveryFeeInput={deliveryFeeInput}
          onDeliveryFeeInputChange={onDeliveryFeeInputChange}
          subtotalCents={subtotalCents}
          deliveryFeeCents={deliveryFeeCents}
          totalCents={totalCents}
          quotationError={quotationError}
          isPreparingQuotation={isPreparingQuotation}
          onPrepare={onPrepare}
        />
        <QuoteDetailStatusCard
          status={status}
          currentStatus={quote.status}
          statusOptions={statusOptions}
          onStatusChange={onStatusChange}
          isSavingStatus={isSavingStatus}
          onSaveStatus={onSaveStatus}
          internalNote={internalNote}
          onInternalNoteChange={onInternalNoteChange}
          savedNote={quote.adminNote ?? ''}
          isSavingNote={isSavingNote}
          onSaveNote={onSaveNote}
        />
      </div>
    </section>
  )
}