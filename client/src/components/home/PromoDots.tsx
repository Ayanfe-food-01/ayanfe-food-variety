interface PromoDotsProps {
  count: number
  activeIndex: number
  onSelect: (index: number) => void
  ariaLabel?: string
  variant?: 'rail' | 'fade'
}

export function PromoDots({ count, activeIndex, onSelect, ariaLabel = 'Choose slide', variant = 'rail' }: PromoDotsProps) {
  if (count < 2) return null

  const containerClass = variant === 'fade'
    ? 'absolute bottom-4 left-1/2 z-[3] flex -translate-x-1/2 gap-[9px] rounded-full bg-white/80 px-[14px] py-2 backdrop-blur-sm'
    : 'flex justify-center gap-1.5 pt-[14px] md:gap-2 md:pt-4'

  return (
    <div className={containerClass} role="tablist" aria-label={ariaLabel}>
      {Array.from({ length: count }, (_, index) => (
        <button
          type="button"
          key={index}
          className={`h-[9px] cursor-pointer rounded-full border-0 p-0 transition-[width,background-color] duration-200 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green ${index === activeIndex ? 'w-[26px] bg-green' : 'w-[9px] bg-sage'}`}
          aria-label={`Go to slide ${index + 1}`}
          aria-selected={index === activeIndex}
          role="tab"
          onClick={() => onSelect(index)}
        />
      ))}
    </div>
  )
}
