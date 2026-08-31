interface FeaturedStatusProps {
  isFeatured: boolean
}

export function FeaturedStatus({ isFeatured }: FeaturedStatusProps) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${isFeatured ? 'bg-orange/10 text-orange' : 'bg-line text-muted'}`}>
      {isFeatured ? 'Featured' : 'Not featured'}
    </span>
  )
}