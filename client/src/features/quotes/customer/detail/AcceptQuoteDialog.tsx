import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog'

interface AcceptQuoteDialogProps {
  quoteNumber: string
  totalLabel: string
  error: string | null
  isBusy: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function AcceptQuoteDialog({
  quoteNumber,
  totalLabel,
  error,
  isBusy,
  onCancel,
  onConfirm,
}: AcceptQuoteDialogProps) {
  return (
    <ConfirmDialog
      eyebrow="Accept quotation"
      title="Accept this quotation?"
      description={`You are accepting the quotation ${quoteNumber} for ${totalLabel}. You can then place your order and choose how to pay.`}
      error={error}
      isBusy={isBusy}
      confirmLabel="Accept quotation"
      busyLabel="Accepting…"
      onCancel={onCancel}
      onConfirm={() => void onConfirm()}
    />
  )
}