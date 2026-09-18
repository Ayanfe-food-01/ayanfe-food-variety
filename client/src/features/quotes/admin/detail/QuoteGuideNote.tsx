import type { ReactNode } from 'react'

interface QuoteGuideNoteProps {
  tone?: 'next' | 'info'
  children: ReactNode
}

const TONE_CLASSES: Record<NonNullable<QuoteGuideNoteProps['tone']>, string> = {
  next: 'rounded-xl border border-orange/25 bg-orange/5 text-orange',
  info: 'rounded-xl border border-green/20 bg-sage/30 text-green-dark',
}

export function QuoteGuideNote({ tone = 'info', children }: QuoteGuideNoteProps) {
  return (
    <p className={`mt-4 px-3 py-2.5 text-xs font-semibold leading-5 ${TONE_CLASSES[tone]}`}>
      {children}
    </p>
  )
}