import { useEffect, useId, useState } from 'react'
import { Button } from '../../ui/Button'
import { SelectField } from '../../ui/SelectField'
import { lockBodyScroll } from '../../../utils/browserCompatibility'
import { ApiError } from '../../../services/api'
import { adjustInventoryStock } from '../../../services/inventoryService'
import { ADJUSTMENT_MOVEMENT_TYPES, MOVEMENT_TYPE_LABELS, type InventoryItem, type MovementType } from '../../../types/inventory'

interface StockAdjustModalProps {
  item: InventoryItem
  onClose: () => void
  onCompleted: () => void
}

type AdjustDirection = 'add' | 'remove'

const directionOptions = [
  { value: 'add', label: 'Add stock' },
  { value: 'remove', label: 'Remove stock' },
] as const

const movementOptions = ADJUSTMENT_MOVEMENT_TYPES.map((type) => ({
  value: type,
  label: MOVEMENT_TYPE_LABELS[type],
}))

export function StockAdjustModal({ item, onClose, onCompleted }: StockAdjustModalProps) {
  const titleId = useId()
  const [direction, setDirection] = useState<AdjustDirection>('add')
  const [quantity, setQuantity] = useState('1')
  const [movementType, setMovementType] = useState<MovementType>('STOCK_RECEIVED')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const releaseBodyScroll = lockBodyScroll()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      releaseBodyScroll()
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isSubmitting, onClose])

  const parsedQuantity = Number(quantity)
  const signedQuantity = direction === 'add' ? parsedQuantity : -parsedQuantity
  const newQuantity = Math.max(0, item.stockQuantity + signedQuantity)
  const quantityValid = Number.isInteger(parsedQuantity) && parsedQuantity > 0
  const canSubmit = quantityValid && reason.trim().length >= 5 && !isSubmitting

  const handleDirectionChange = (value: string) => {
    const next = value as AdjustDirection
    setDirection(next)
    if (next === 'remove') {
      setMovementType('DAMAGED')
      if (movementType === 'STOCK_RECEIVED') setMovementType('DAMAGED')
    } else if (movementType === 'DAMAGED' || movementType === 'EXPIRED') {
      setMovementType('STOCK_RECEIVED')
    }
  }

  const submit = async () => {
    if (!canSubmit) return
    setIsSubmitting(true)
    setError(null)
    try {
      await adjustInventoryStock({
        productId: item.productId,
        productOptionId: item.productOptionId,
        quantity: signedQuantity,
        movementType,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
      })
      onCompleted()
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : 'Stock could not be adjusted. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="safe-modal-backdrop fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-green-dark/45 p-4" role="presentation">
      <div
        className="w-full max-w-lg rounded-3xl border border-line bg-white p-7 shadow-2xl shadow-green-dark/20"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">Adjust stock</p>
        <h2 id={titleId} className="mt-2 text-2xl font-bold tracking-[-0.04em] text-green-dark">{item.productName}</h2>
        <p className="mt-1 text-sm text-muted">
          {item.optionLabel ?? 'Base unit'} · Currently {item.stockQuantity} on hand
        </p>

        <div className="mt-6 space-y-5">
          <div>
            <span className="text-sm font-bold text-green-dark">Adjustment</span>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {directionOptions.map((option) => (
                <button
                  className={`rounded-xl border px-4 py-3 text-sm font-bold transition-colors ${
                    direction === option.value
                      ? 'border-green bg-sage text-green'
                      : 'border-line text-muted hover:border-green/40'
                  }`}
                  key={option.value}
                  type="button"
                  onClick={() => handleDirectionChange(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="text-sm font-bold text-green-dark" htmlFor="adjust-quantity">Quantity</label>
              <input
                className="mt-2 w-full rounded-xl border border-line px-4 py-3 text-sm font-bold text-green-dark focus:border-green focus:outline-none"
                id="adjust-quantity"
                inputMode="numeric"
                min="1"
                onChange={(event) => setQuantity(event.target.value)}
                placeholder="e.g. 10"
                type="number"
                value={quantity}
              />
              {!quantityValid && quantity !== '' && (
                <p className="mt-1 text-xs text-orange">Enter a whole number greater than 0.</p>
              )}
            </div>
            <div>
              <label className="text-sm font-bold text-green-dark" htmlFor="adjust-type">Movement type</label>
              <div className="mt-2">
                <SelectField
                  id="adjust-type"
                  options={movementOptions}
                  value={movementType}
                  onChange={(value) => setMovementType(value as MovementType)}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-bold text-green-dark" htmlFor="adjust-reason">Reason</label>
            <input
              className="mt-2 w-full rounded-xl border border-line px-4 py-3 text-sm text-green-dark focus:border-green focus:outline-none"
              id="adjust-reason"
              onChange={(event) => setReason(event.target.value)}
              placeholder="Short reason, e.g. supplier delivery"
              value={reason}
            />
          </div>

          <div>
            <label className="text-sm font-bold text-green-dark" htmlFor="adjust-notes">Notes (optional)</label>
            <textarea
              className="mt-2 min-h-24 w-full resize-y rounded-xl border border-line px-4 py-3 text-sm text-green-dark focus:border-green focus:outline-none"
              id="adjust-notes"
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Any additional detail"
              value={notes}
            />
          </div>

          <div className="rounded-2xl border border-line bg-cream/45 px-4 py-3 text-sm">
            <span className="text-muted">New stock level:</span>{' '}
            <span className="font-bold text-green-dark">{newQuantity}</span>
            {direction === 'remove' && parsedQuantity > item.stockQuantity && (
              <span className="ml-2 text-xs font-bold text-orange">Capped at 0</span>
            )}
          </div>

          {error && <p className="rounded-xl border border-orange/25 bg-orange/5 px-4 py-3 text-sm text-orange" role="alert">{error}</p>}
        </div>

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" disabled={isSubmitting} onClick={onClose}>Cancel</Button>
          <Button disabled={!canSubmit} onClick={() => void submit()}>
            {isSubmitting ? 'Updating…' : direction === 'add' ? 'Add stock' : 'Remove stock'}
          </Button>
        </div>
      </div>
    </div>
  )
}