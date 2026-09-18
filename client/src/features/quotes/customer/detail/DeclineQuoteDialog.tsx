import { useEffect } from 'react'
import { SelectField } from '../../../../components/ui/SelectField'
import { lockBodyScroll } from '../../../../utils/browserCompatibility'
import { DECLINE_REASONS, OTHER_REASON_KEY } from './declineReasons'

interface DeclineQuoteDialogProps {
  reasonOption: string | null
  onSelectReason: (value: string) => void
  reason: string
  onChangeReason: (value: string) => void
  error: string | null
  isBusy: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function DeclineQuoteDialog({
  reasonOption,
  onSelectReason,
  reason,
  onChangeReason,
  error,
  isBusy,
  onCancel,
  onConfirm,
}: DeclineQuoteDialogProps) {
  useEffect(() => {
    const releaseBodyScroll = lockBodyScroll()
    return () => { releaseBodyScroll() }
  }, [])

  const reasonOptions = [
    ...DECLINE_REASONS.map((entry) => ({ value: entry, label: entry })),
    { value: OTHER_REASON_KEY, label: 'Other reason' },
  ]

  return (
    <div className="safe-modal-backdrop fixed inset-0 z-50 flex min-h-dvh items-center justify-center overflow-hidden bg-green-dark/50" role="presentation" onClick={(event) => {
      if (event.target === event.currentTarget) onCancel()
    }}>
      <div className="y-scrollbar my-auto max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-3xl border border-line bg-white p-6 shadow-2xl sm:p-8" role="dialog" aria-modal="true" aria-labelledby="decline-quote-title">
        <h2 id="decline-quote-title" className="text-2xl font-bold text-green-dark">Decline this quotation?</h2>
        <p className="mt-3 text-sm leading-6 text-muted">You will not be committed to this quotation. Let us know why so we can improve.</p>
        <div className="mt-6">
          <label className="block text-sm font-bold text-green-dark" htmlFor="decline-reason">
            Reason <span className="font-normal normal-case tracking-normal text-muted">(required)</span>
          </label>
          <SelectField
            ariaLabel="Reason for declining"
            className="mt-2"
            id="decline-reason"
            options={reasonOptions}
            value={reasonOption ?? ''}
            onChange={onSelectReason}
            placeholder="Select a reason…"
            required
          />
        </div>
        {reasonOption === OTHER_REASON_KEY && (
          <label className="mt-3 block text-sm font-bold text-green-dark">
            Please specify <span className="font-normal normal-case tracking-normal text-muted">(required)</span>
            <textarea
              className="mt-2 min-h-24 w-full resize-y rounded-xl border border-line bg-cream/60 px-4 py-3 text-sm font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10"
              value={reason}
              onChange={(event) => onChangeReason(event.target.value)}
              maxLength={500}
              placeholder="Tell us why you are declining."
            />
          </label>
        )}
        {error && <p className="mt-4 rounded-xl border border-orange/25 bg-orange/5 p-3 text-sm text-orange" role="alert">{error}</p>}
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button className="rounded-full border border-line px-5 py-3 text-sm font-bold text-green-dark hover:bg-cream disabled:cursor-not-allowed disabled:opacity-50" type="button" onClick={onCancel} disabled={isBusy}>
            Keep quotation
          </button>
          <button className="rounded-full bg-orange px-5 py-3 text-sm font-bold text-white hover:bg-orange/90 disabled:cursor-not-allowed disabled:opacity-50" type="button" onClick={() => void onConfirm()} disabled={isBusy}>
            {isBusy ? 'Declining…' : 'Decline quotation'}
          </button>
        </div>
      </div>
    </div>
  )
}
