import { Modal } from '../../../../components/ui/Modal'
import { SelectField } from '../../../../components/ui/SelectField'
import { CANCEL_REASONS, OTHER_REASON_KEY } from './constants'

interface QuoteDetailModalsProps {
  pendingTerminal: 'CANCELLED' | 'COMPLETED' | null
  isSavingStatus: boolean
  cancelReasonOption: string | null
  cancelReason: string
  cancelReasonError: string | null
  onSelectCancelReason: (option: string) => void
  onCancelReasonChange: (value: string) => void
  onCloseCancel: () => void
  onConfirm: () => void
  isRevising: boolean
  isReviseConfirmOpen: boolean
  onCloseRevise: () => void
  onRevise: () => void
}

export function QuoteDetailModals({
  pendingTerminal,
  isSavingStatus,
  cancelReasonOption,
  cancelReason,
  cancelReasonError,
  onSelectCancelReason,
  onCancelReasonChange,
  onCloseCancel,
  onConfirm,
  isRevising,
  isReviseConfirmOpen,
  onCloseRevise,
  onRevise,
}: QuoteDetailModalsProps) {
  const cancelReasonOptions = [
    ...CANCEL_REASONS.map((reason) => ({ value: reason, label: reason })),
    { value: OTHER_REASON_KEY, label: 'Other reason' },
  ]

  return (
    <>
      {pendingTerminal === 'CANCELLED' && (
        <Modal title="Cancel quote request" onClose={onCloseCancel} footer={
          <div className="flex justify-end gap-3">
            <button className="rounded-xl border border-line px-5 py-2.5 text-sm font-bold text-green-dark hover:bg-sage/40" type="button" onClick={onCloseCancel}>Keep current status</button>
            <button className="rounded-xl bg-orange px-5 py-3 text-sm font-bold text-cream disabled:cursor-not-allowed disabled:opacity-50 hover:bg-orange/80" type="button" disabled={isSavingStatus} onClick={onConfirm}>
              {isSavingStatus ? 'Saving…' : 'Confirm cancellation'}
            </button>
          </div>
        }>
          <p className="text-sm text-muted">Moving this request to <strong className="font-semibold text-green-dark">Cancelled</strong> marks it as closed and prevents any further action by the customer.</p>
          <div className="mt-4">
            <label className="block text-sm font-bold text-green-dark" htmlFor="cancel-reason">
              Why is this request being cancelled? <span className="font-normal normal-case tracking-normal text-muted">(required)</span>
            </label>
            <SelectField
              ariaLabel="Cancellation reason"
              className="mt-2"
              id="cancel-reason"
              options={cancelReasonOptions}
              value={cancelReasonOption ?? ''}
              onChange={onSelectCancelReason}
              placeholder="Select a reason…"
              required
            />
          </div>
          {cancelReasonOption === OTHER_REASON_KEY && (
            <div className="mt-3">
              <label className="block text-xs font-bold text-green-dark" htmlFor="cancel-reason-detail">
                Please specify <span className="font-normal normal-case tracking-normal text-muted">(required)</span>
              </label>
              <textarea
                className="mt-2 w-full resize-y rounded-xl border border-line bg-cream px-4 py-3 text-sm font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10"
                id="cancel-reason-detail"
                rows={3}
                maxLength={500}
                placeholder="Explain why this request is being cancelled."
                value={cancelReason}
                onChange={(event) => onCancelReasonChange(event.target.value)}
              />
            </div>
          )}
          {cancelReasonError && <p className="mt-2 text-xs font-semibold text-orange">{cancelReasonError}</p>}
        </Modal>
      )}

      {pendingTerminal === 'COMPLETED' && (
        <Modal title="Mark as completed" onClose={() => onCloseCancel()} footer={
          <div className="flex justify-end gap-3">
            <button className="rounded-xl border border-line px-5 py-2.5 text-sm font-bold text-green-dark hover:bg-sage/40" type="button" onClick={onCloseCancel}>Cancel</button>
            <button className="rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream disabled:cursor-not-allowed disabled:opacity-50 hover:bg-green-dark" type="button" disabled={isSavingStatus} onClick={onConfirm}>
              {isSavingStatus ? 'Saving…' : 'Confirm completion'}
            </button>
          </div>
        }>
          <p className="text-sm text-muted">This marks the quotation as <strong className="font-semibold text-green-dark">Completed</strong>. Completed requests show as closed and the customer cannot take further action.</p>
          <p className="mt-3 text-sm text-muted">Use this when the fulfilment is finalised and no further edits to the quotation are expected.</p>
        </Modal>
      )}

      {isReviseConfirmOpen && (
        <Modal title="Revise quotation" onClose={onCloseRevise} footer={
          <div className="flex justify-end gap-3">
            <button className="rounded-xl border border-line px-5 py-2.5 text-sm font-bold text-green-dark hover:bg-sage/40" type="button" onClick={onCloseRevise}>Cancel</button>
            <button className="rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream disabled:cursor-not-allowed disabled:opacity-50 hover:bg-green-dark" type="button" disabled={isRevising} onClick={onRevise}>
              {isRevising ? 'Revising…' : 'Confirm revise'}
            </button>
          </div>
        }>
          <p className="text-sm text-muted">This clears the current pricing snapshot and returns the request to <strong className="font-semibold text-green-dark">Contacted</strong>, so you can prepare a corrected quotation.</p>
          <p className="mt-3 text-sm text-muted">The customer will not see the previously quoted prices.</p>
        </Modal>
      )}
    </>
  )
}