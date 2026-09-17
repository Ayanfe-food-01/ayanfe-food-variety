import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ApiError } from '../../services/api'
import {
  getAdminQuoteRequest,
  prepareAdminQuotePricing,
  reviseAdminQuoteRequest,
  updateAdminQuoteRequestNote,
  updateAdminQuoteRequestStatus,
  type AdminQuoteRequestDetail,
  type QuoteRequestStatus,
} from '../../services/quoteService'
import { formatPrice } from '../../utils/formatPrice'
import { getQuoteStatusOptions } from '../../utils/quoteStatus'
import { useToast } from '../../components/ui/Toast'
import { Breadcrumb } from '../../components/ui/Breadcrumb'
import { useInitialRouteLoad } from '../../hooks/useInitialRouteLoad'
import { scrollToTopInstant } from '../../utils/browserCompatibility'
import {
  isValidDeliveryFee,
  isValidUnitPrice,
  MAX_DELIVERY_FEE,
  MAX_UNIT_PRICE,
  OTHER_REASON_KEY,
  type QuoteFulfillmentOption,
} from './quote-detail/constants'
import { QuoteDetailCustomerCard } from './quote-detail/QuoteDetailCustomerCard'
import { QuoteDetailCustomerResponse } from './quote-detail/QuoteDetailCustomerResponse'
import { QuoteDetailHeader } from './quote-detail/QuoteDetailHeader'
import { QuoteDetailItemsTable } from './quote-detail/QuoteDetailItemsTable'
import { QuoteDetailModals } from './quote-detail/QuoteDetailModals'
import { QuoteDetailPrepareSection } from './quote-detail/QuoteDetailPrepareSection'
import { QuoteDetailSnapshotSection } from './quote-detail/QuoteDetailSnapshotSection'
import { QuoteDetailStatusSection } from './quote-detail/QuoteDetailStatusSection'
import { QuoteStatusStepper } from './quote-detail/QuoteStatusStepper'

export function QuoteRequestDetail() {
  const { reference } = useParams()
  const [quote, setQuote] = useState<AdminQuoteRequestDetail | null>(null)
  const [status, setStatus] = useState<QuoteRequestStatus>('PENDING')
  const [internalNote, setInternalNote] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingStatus, setIsSavingStatus] = useState(false)
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [isPreparingQuotation, setIsPreparingQuotation] = useState(false)
  const [unitPrices, setUnitPrices] = useState<Record<string, string>>({})
  const [deliveryFeeInput, setDeliveryFeeInput] = useState('')
  const [fulfillmentMethod, setFulfillmentMethod] = useState<QuoteFulfillmentOption>('PICKUP')
  const [quotationError, setQuotationError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [pendingTerminal, setPendingTerminal] = useState<'CANCELLED' | 'COMPLETED' | null>(null)
  const [cancelReasonOption, setCancelReasonOption] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelReasonError, setCancelReasonError] = useState<string | null>(null)
  const [isRevising, setIsRevising] = useState(false)
  const [isReviseConfirmOpen, setIsReviseConfirmOpen] = useState(false)

  useInitialRouteLoad(!isLoading)
  const { showToast } = useToast()

  const syncFromLoaded = (loaded: AdminQuoteRequestDetail) => {
    setUnitPrices(Object.fromEntries(loaded.items.map((item) => [item.id, item.quotedUnitPrice ?? ''])))
    setDeliveryFeeInput(loaded.deliveryFee ?? '')
    setFulfillmentMethod(loaded.fulfillmentMethod === 'DELIVERY' ? 'DELIVERY' : 'PICKUP')
  }

  useEffect(() => {
    if (!reference) return
    getAdminQuoteRequest(reference)
      .then((loaded) => {
        setQuote(loaded)
        setStatus(loaded.status)
        setInternalNote(loaded.adminNote ?? '')
        syncFromLoaded(loaded)
      })
      .catch((caught: unknown) => setError(caught instanceof ApiError ? caught.message : 'Quote request details could not be loaded.'))
      .finally(() => setIsLoading(false))
  }, [reference])

  const persistStatus = async (target = status, reason?: string) => {
    if (!quote || !reference || target === quote.status) return
    setIsSavingStatus(true)
    setError(null)
    try {
      const updated = await updateAdminQuoteRequestStatus(reference, target, reason)
      setQuote(updated)
      setStatus(updated.status)
      syncFromLoaded(updated)
      setPendingTerminal(null)
      setCancelReasonOption(null)
      setCancelReason('')
      setCancelReasonError(null)
      showToast('Quote request status updated.', 'success')
    } catch (caught: unknown) {
      setStatus(quote.status)
      if (pendingTerminal) setPendingTerminal(null)
      showToast(caught instanceof ApiError ? caught.message : 'Quote request status could not be updated.', 'error')
    } finally {
      setIsSavingStatus(false)
    }
  }

  const handleSaveStatus = () => {
    if (status === 'CANCELLED') {
      setPendingTerminal('CANCELLED')
      return
    }
    if (status === 'COMPLETED') {
      setPendingTerminal('COMPLETED')
      return
    }
    void persistStatus(status)
  }

  const resetPendingTerminal = () => {
    setPendingTerminal(null)
    setCancelReasonOption(null)
    setCancelReason('')
    setCancelReasonError(null)
  }

  const confirmTerminal = () => {
    if (pendingTerminal === 'CANCELLED') {
      if (!cancelReasonOption) {
        setCancelReasonError('Please select a cancellation reason.')
        return
      }
      const finalReason = cancelReasonOption === OTHER_REASON_KEY ? cancelReason.trim() : cancelReasonOption
      if (cancelReasonOption === OTHER_REASON_KEY && !finalReason) {
        setCancelReasonError('Please provide a reason for cancelling.')
        return
      }
      setCancelReasonError(null)
      void persistStatus('CANCELLED', finalReason)
      return
    }
    if (pendingTerminal === 'COMPLETED') {
      void persistStatus('COMPLETED')
    }
  }

  const handleRevise = async () => {
    if (!quote || !reference) return
    setIsReviseConfirmOpen(false)
    setIsRevising(true)
    try {
      const updated = await reviseAdminQuoteRequest(reference)
      setQuote(updated)
      setStatus(updated.status)
      syncFromLoaded(updated)
      showToast('Quotation revised and returned to the contacted stage.', 'success')
    } catch (caught: unknown) {
      showToast(caught instanceof ApiError ? caught.message : 'The quotation could not be revised.', 'error')
    } finally {
      setIsRevising(false)
    }
  }

  const persistNote = async () => {
    if (!quote || !reference || internalNote === (quote.adminNote ?? '')) return
    setIsSavingNote(true)
    setError(null)
    try {
      setQuote(await updateAdminQuoteRequestNote(reference, internalNote))
      showToast('Internal note saved.', 'success')
    } catch (caught: unknown) {
      showToast(caught instanceof ApiError ? caught.message : 'The internal note could not be saved.', 'error')
    } finally {
      setIsSavingNote(false)
    }
  }

  const handleFulfillmentMethodChange = (value: QuoteFulfillmentOption) => {
    setFulfillmentMethod(value)
    if (value === 'PICKUP') setDeliveryFeeInput('')
  }

  const missingUnitPriceCount = quote ? quote.items.filter((item) => !isValidUnitPrice(unitPrices[item.id] ?? '')).length : 0

  const persistQuotation = async () => {
    if (!quote || !reference || quote.items.length === 0) return
    setQuotationError(null)
    for (const item of quote.items) {
      const priceValue = (unitPrices[item.id] ?? '').trim()
      if (!isValidUnitPrice(priceValue)) {
        setQuotationError('Enter a valid unit price for every item (a positive amount with up to two decimal places).')
        return
      }
      if (Number(priceValue) > MAX_UNIT_PRICE) {
        setQuotationError(`Unit price cannot exceed ${formatPrice(MAX_UNIT_PRICE)}.`)
        return
      }
    }
    if (fulfillmentMethod === 'PICKUP' && Number(deliveryFeeInput) > 0) {
      setQuotationError('Pickup quotations cannot include a delivery fee.')
      return
    }
    // A blank delivery fee is valid: the fee is then calculated from the
    // customer's delivery zone when they check out. A value locks it as an
    // override.
    if (fulfillmentMethod === 'DELIVERY' && deliveryFeeInput.trim() !== '' && !isValidDeliveryFee(deliveryFeeInput)) {
      setQuotationError('Delivery fee must be a non-negative amount with up to two decimal places, or left blank.')
      return
    }
    if (fulfillmentMethod === 'DELIVERY' && deliveryFeeInput.trim() !== '' && Number(deliveryFeeInput) > MAX_DELIVERY_FEE) {
      setQuotationError(`Delivery fee cannot exceed ${formatPrice(MAX_DELIVERY_FEE)}.`)
      return
    }
    setIsPreparingQuotation(true)
    try {
      const updated = await prepareAdminQuotePricing(reference, {
        items: quote.items.map((item) => ({ itemId: item.id, quotedUnitPrice: (unitPrices[item.id] ?? '').trim() })),
        deliveryFee: fulfillmentMethod === 'PICKUP' ? '' : deliveryFeeInput.trim(),
        fulfillmentMethod,
      })
      setQuote(updated)
      setStatus(updated.status)
      syncFromLoaded(updated)
      showToast('Quotation prepared.', 'success')
      scrollToTopInstant()
    } catch (caught: unknown) {
      showToast(caught instanceof ApiError ? caught.message : 'The quotation could not be prepared.', 'error')
    } finally {
      setIsPreparingQuotation(false)
    }
  }

  if (isLoading) return <div className="rounded-2xl border border-line bg-white px-5 py-14 text-center text-sm text-muted">Loading quote request…</div>
  if (!quote) return <div><Breadcrumb items={[{ label: 'Dashboard', href: '/admin' }, { label: 'Quote requests', href: '/admin/quote-requests' }, { label: 'Quote request' }]} /><div className="mt-6 rounded-2xl border border-orange/25 bg-orange/5 p-5 text-sm text-orange" role="alert">{error ?? 'Quote request not found.'}</div></div>

  const statusOptions = getQuoteStatusOptions(quote.status)
  const canPrepareQuotation = quote.status === 'PENDING' || quote.status === 'CONTACTED'
  const hasQuotation = quote.quotedTotal !== null || quote.quotedAt !== null
  const previewDeliveryFeeCents = Number.isFinite(Number(deliveryFeeInput)) && Number(deliveryFeeInput) > 0
    ? Math.round(Number(deliveryFeeInput) * 100)
    : 0
  const previewSubtotalCents = quote.items.reduce((total, item) => {
    const unitPrice = Number(unitPrices[item.id] ?? '')
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) return total
    return total + Math.round(unitPrice * item.quantity * 100)
  }, 0)
  const previewTotalCents = previewSubtotalCents + previewDeliveryFeeCents

  return (
    <div>
      <QuoteDetailHeader quote={quote} />
      <QuoteStatusStepper status={quote.status} />

      {error && <div className="mt-6 rounded-2xl border border-orange/25 bg-orange/5 p-4 text-sm text-orange" role="alert">{error}</div>}

      <QuoteDetailCustomerCard quote={quote} />
      <QuoteDetailItemsTable items={quote.items} />

      {canPrepareQuotation && (
        <QuoteDetailPrepareSection
          quote={quote}
          unitPrices={unitPrices}
          onPriceChange={(itemId, value) => setUnitPrices((current) => ({ ...current, [itemId]: value }))}
          missingUnitPriceCount={missingUnitPriceCount}
          fulfillmentMethod={fulfillmentMethod}
          onFulfillmentMethodChange={handleFulfillmentMethodChange}
          deliveryFeeInput={deliveryFeeInput}
          onDeliveryFeeInputChange={setDeliveryFeeInput}
          subtotalCents={previewSubtotalCents}
          deliveryFeeCents={previewDeliveryFeeCents}
          deliveryFeeIsBlank={fulfillmentMethod === 'DELIVERY' && deliveryFeeInput.trim() === ''}
          totalCents={previewTotalCents}
          quotationError={quotationError}
          isPreparingQuotation={isPreparingQuotation}
          onPrepare={() => void persistQuotation()}
          status={status}
          statusOptions={statusOptions}
          onStatusChange={(next) => setStatus(next)}
          isSavingStatus={isSavingStatus}
          onSaveStatus={handleSaveStatus}
          internalNote={internalNote}
          onInternalNoteChange={setInternalNote}
          isSavingNote={isSavingNote}
          onSaveNote={() => void persistNote()}
        />
      )}

      {hasQuotation && !canPrepareQuotation && (
        <QuoteDetailSnapshotSection
          quote={quote}
          isRevising={isRevising}
          onRevise={() => setIsReviseConfirmOpen(true)}
        />
      )}

      <QuoteDetailCustomerResponse quote={quote} />

      {!canPrepareQuotation && (
        <QuoteDetailStatusSection
          status={status}
          currentStatus={quote.status}
          statusOptions={statusOptions}
          onStatusChange={setStatus}
          isSavingStatus={isSavingStatus}
          onSaveStatus={handleSaveStatus}
          internalNote={internalNote}
          onInternalNoteChange={setInternalNote}
          savedNote={quote.adminNote ?? ''}
          isSavingNote={isSavingNote}
          onSaveNote={() => void persistNote()}
        />
      )}

      <QuoteDetailModals
        pendingTerminal={pendingTerminal}
        isSavingStatus={isSavingStatus}
        cancelReasonOption={cancelReasonOption}
        cancelReason={cancelReason}
        cancelReasonError={cancelReasonError}
        onSelectCancelReason={(option) => { setCancelReasonOption(option); setCancelReasonError(null) }}
        onCancelReasonChange={(value) => { setCancelReason(value); setCancelReasonError(null) }}
        onCloseCancel={resetPendingTerminal}
        onConfirm={confirmTerminal}
        isRevising={isRevising}
        isReviseConfirmOpen={isReviseConfirmOpen}
        onCloseRevise={() => setIsReviseConfirmOpen(false)}
        onRevise={() => void handleRevise()}
      />
    </div>
  )
}