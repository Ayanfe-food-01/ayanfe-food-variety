export interface Testimonial {
  name: string
  text: string
  rating?: number
}

/**
 * Temporary sample content for the storefront preview.
 * Replace these entries with approved customer quotes when available.
 */
export const testimonials: Testimonial[] = [
  {
    name: 'Amina — sample customer',
    text: 'The foodstuff arrived neatly packed and everything was exactly what I ordered. Shopping felt simple from start to finish.',
    rating: 5,
  },
  {
    name: 'Chidi — sample customer',
    text: 'I found all my kitchen essentials in one place, and the delivery was smooth. I will definitely shop here again.',
    rating: 5,
  },
  {
    name: 'Fatima — sample customer',
    text: 'The products were fresh, well presented, and worth the price. A really convenient way to stock up for the home.',
    rating: 5,
  },
]