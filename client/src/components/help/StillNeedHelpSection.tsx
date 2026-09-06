import { ArrowUpRight, HelpIcon, MailIcon, PhoneIcon } from '../../assets/icons'

export interface StillNeedHelpStore {
  phone?: string
  email?: string
  whatsappHref?: string
}

export function StillNeedHelpSection({ phone, email, whatsappHref }: StillNeedHelpStore) {
  return (
    <section
      className="border-y border-line/70 bg-sage/40 py-14 sm:py-18 lg:py-24"
      aria-labelledby="still-need-help-heading"
    >
      <div className="container">
        <div className="max-w-2xl">
          <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-orange">
            <HelpIcon size={15} /> Still need help
          </p>
          <h2
            id="still-need-help-heading"
            className="m-0 text-3xl font-bold tracking-[-0.04em] text-green-dark sm:text-4xl"
          >
            Can’t find what you’re looking for?
          </h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted">
            Our team is happy to help with your order, payment, delivery or account questions.
          </p>
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-muted">
          {phone && (
            <a
              className="inline-flex items-center gap-2 font-bold text-green transition-colors hover:text-orange"
              href={`tel:${phone}`}
            >
              <PhoneIcon size={16} /> Call us
            </a>
          )}
          {email && (
            <a
              className="inline-flex items-center gap-2 font-bold text-green transition-colors hover:text-orange"
              href={`mailto:${email}`}
            >
              <MailIcon size={16} /> Email us
            </a>
          )}
          {whatsappHref && (
            <a
              className="inline-flex items-center gap-2 font-bold text-orange transition-colors hover:text-green"
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
            >
              Chat on WhatsApp <ArrowUpRight size={15} />
            </a>
          )}
        </div>
      </div>
    </section>
  )
}