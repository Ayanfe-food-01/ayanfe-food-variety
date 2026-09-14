import { ArrowUpRight } from '../../assets/icons'
import type { ContactCardItem } from './contactData'

interface ContactInfoCardProps {
  item: ContactCardItem
}

export function ContactInfoCard({ item }: ContactInfoCardProps) {
  const Icon = item.icon
  return (
    <article className="flex items-start gap-4 rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-sage/60 text-green">
        <Icon size={20} className="text-green-dark" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">{item.eyebrow}</p>
        <p className="mt-1.5 break-words whitespace-pre-line text-sm font-bold leading-6 text-green-dark">{item.value}</p>
        {item.href && (
          <a
            className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-orange transition-colors hover:text-green-dark"
            href={item.href}
            target={item.external ? '_blank' : undefined}
            rel={item.external ? 'noreferrer' : undefined}
          >
            {item.actionLabel} <ArrowUpRight size={13} />
          </a>
        )}
      </div>
    </article>
  )
}