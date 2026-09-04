interface PromoDotsProps {
  count: number
  activeIndex: number
  onSelect: (index: number) => void
}

export function PromoDots({ count, activeIndex, onSelect }: PromoDotsProps) {
  if (count < 2) return null

  return (
    <div className="promo-dots" role="tablist" aria-label="Choose promotional slide">
      {Array.from({ length: count }, (_, index) => (
        <button
          type="button"
          key={index}
          className={`promo-dot${index === activeIndex ? ' is-active' : ''}`}
          aria-label={`Go to slide ${index + 1}`}
          aria-selected={index === activeIndex}
          role="tab"
          onClick={() => onSelect(index)}
        />
      ))}
    </div>
  )
}
