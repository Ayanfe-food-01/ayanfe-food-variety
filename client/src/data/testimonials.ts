export interface Testimonial {
  name: string
  text: string
  rating?: number
}

/**
 * Placeholder content kept separate from the presentation so approved
 * customer quotes can replace it without changing the homepage component.
 */
export const testimonials: Testimonial[] = [
  {
    name: 'Customer testimonial 01',
    text: 'Approved customer feedback will appear here once the store has a quote ready to publish.',
    rating: 5,
  },
  {
    name: 'Customer testimonial 02',
    text: 'This is a clearly marked placeholder for a real customer story about shopping with Ayanfe.',
    rating: 5,
  },
  {
    name: 'Customer testimonial 03',
    text: 'Replace this placeholder with an approved note about product quality, service, or delivery.',
    rating: 5,
  },
]