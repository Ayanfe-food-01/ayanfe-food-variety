import { CheckCircleIcon } from '../../assets/icons'

interface ContactFormSuccessProps {
  onReset: () => void
}

export function ContactFormSuccess({ onReset }: ContactFormSuccessProps) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center" role="status">
      <span className="grid size-14 place-items-center rounded-full bg-sage/70 text-green-dark">
        <CheckCircleIcon size={28} />
      </span>
      <h3 className="mt-5 text-2xl font-bold tracking-[-0.03em] text-green-dark">Message sent</h3>
      <p className="mt-3 max-w-sm text-sm leading-6 text-muted">
        Thank you for getting in touch. Our team has received your message and will get back to you as soon as possible.
      </p>
      <button
        className="mt-7 inline-flex items-center gap-2 rounded-xl border border-line bg-white px-5 py-3 text-sm font-bold text-green transition-colors hover:border-green/50 hover:bg-sage/20"
        type="button"
        onClick={onReset}
      >
        Send another message
      </button>
    </div>
  )
}