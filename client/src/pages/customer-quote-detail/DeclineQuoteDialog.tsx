import { useEffect } from 'react'
import { lockBodyScroll } from '../../utils/browserCompatibility'

interface DeclineQuoteDialogProps {
  reason: string
  onChange: (value: string) => void
  error: string | null
  isBusy: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function DeclineQuoteDialog({
  reason,
  onChange,
  error,
  isBusy,
  onCancel,
  onConfirm,
}: DeclineQuoteDialogProps) {
  useEffect(() => {
    const releaseBodyScroll = lockBodyScroll()
    return () => { releaseBodyScroll() }
  }, [])

  return (
    <div className="safe-modal-backdrop fixed inset-0 z-50 flex min-h-dvh items-center justify-center overflow-hidden bg-green-dark/50" role="presentation" onClick={(event) => {
      if (event.target === event.currentTarget) onCancel()
    }}>
      <div className="y-scrollbar my-auto max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-3xl border border-line bg-white p-6 shadow-2xl sm:p-8" role="dialog" aria-modal="true" aria-labelledby="decline-quote-title">
        <h2 id="decline-quote-title" className="text-2xl font-bold text-green-dark">Decline this quotation?</h2>
        <p className="mt-3 text-sm leading-6 text-muted">You will not be committed to this quotation. Let us know if anything can be improved.</p>
        <label className="mt-6 block text-sm font-bold text-green-dark">
          Reason <span className="font-normal text-muted">(optional)</span>
          <textarea
            className="mt-2 min-h-24 w-full resize-y rounded-xl border border-line bg-cream/60 px-4 py-3 text-sm font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10"
            value={reason}
            onChange={(event) => onChange(event.target.value)}
            maxLength={500}
            placeholder="Tell us why you are declining (optional)"
          />
        </label>
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