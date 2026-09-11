interface PaymentEmptyStateProps {
  message: string
}

export function PaymentEmptyState({ message }: PaymentEmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-white px-5 py-14 text-center text-sm text-muted">
      {message}
    </div>
  )
}