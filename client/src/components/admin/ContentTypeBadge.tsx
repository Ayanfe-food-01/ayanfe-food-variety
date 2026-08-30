interface ContentTypeBadgeProps {
  type: 'testimonial' | 'review'
}

export function ContentTypeBadge({ type }: ContentTypeBadgeProps) {
  if (type === 'review') {
    return (
      <span className="inline-flex rounded-full bg-sage px-2.5 py-1 font-bold text-green">Customer review</span>
    )
  }
  return (
    <span className="inline-flex rounded-full bg-line px-2.5 py-1 font-bold text-muted">Manual testimonial</span>
  )
}