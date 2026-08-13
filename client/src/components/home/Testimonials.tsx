import { RevealOnScroll } from '../ui/RevealOnScroll'
import { testimonials } from '../../data/testimonials'

export function Testimonials() {
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
              Kind words from our community.
            </h2>
            <p className="mt-4 text-base leading-7 text-muted">
              Sample feedback for now — approved customer quotes can be added here later.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {testimonials.map((testimonial) => (
              <article className="flex h-full flex-col rounded-3xl border border-line bg-white p-6 shadow-sm sm:p-7" key={testimonial.name}>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-2xl leading-none text-orange" aria-hidden="true">“</span>
                  {testimonial.rating && (
                    <span className="text-sm tracking-[0.16em] text-orange" aria-label={`${testimonial.rating} out of 5 stars`}>
                      {'★'.repeat(testimonial.rating)}
                    </span>
                  )}
                </div>
                <p className="mt-5 flex-1 text-base leading-7 text-green-dark">{testimonial.text}</p>
                <p className="mt-6 border-t border-line pt-4 text-xs font-bold uppercase tracking-[0.14em] text-muted">
                  {testimonial.name}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </RevealOnScroll>
  )
}