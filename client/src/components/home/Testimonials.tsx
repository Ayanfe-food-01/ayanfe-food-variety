import { RevealOnScroll } from '../ui/RevealOnScroll'
import { useCustomerStories } from '../../hooks/useCustomerStories'
import { useScrollSnapRail } from '../../hooks/useScrollSnapRail'
import { CustomerStoryCard } from './CustomerStoryCard'
import { PromoDots } from './PromoDots'

export function Testimonials() {
  const stories = useCustomerStories()
  const { trackRef, activeIndex, goTo, interruptAutoAdvance, onScroll } = useScrollSnapRail({
    itemCount: stories.length,
  })

  if (stories.length === 0) return null

  return (
    <RevealOnScroll>
      <section className="border-y border-line bg-sage/25 py-16 sm:py-20 lg:py-24" aria-labelledby="testimonials-heading">
        <div className="container">
          <div className="max-w-2xl">
            <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-orange">
              <span className="inline-block size-2 rounded-full bg-orange" />
              Customer stories
            </p>
            <h2 id="testimonials-heading" className="m-0 text-4xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">
              What Our Customers Say
            </h2>
            <p className="mt-4 text-base leading-7 text-muted">
              Trusted by shoppers who want quality foodstuff delivered with care.
            </p>
          </div>

          <div
            className="testimonial-rail"
            ref={trackRef}
            onKeyDown={interruptAutoAdvance}
            onPointerDown={interruptAutoAdvance}
            onScroll={onScroll}
            onTouchStart={interruptAutoAdvance}
            onWheel={interruptAutoAdvance}
          >
            {stories.map((story) => (
              <div className="testimonial-slide" key={story.id}>
                <CustomerStoryCard story={story} />
              </div>
            ))}
          </div>

          <PromoDots
            count={stories.length}
            activeIndex={activeIndex}
            onSelect={(i) => { goTo(i); interruptAutoAdvance() }}
            ariaLabel="Choose testimonial slide"
          />
        </div>
      </section>
    </RevealOnScroll>
  )
}