import { Link } from 'react-router-dom'
import { LayersIcon } from '../../../assets/icons'
import type { HelpCategory } from '../types'

export const wholesaleCategory: HelpCategory = {
  id: 'wholesale',
  icon: LayersIcon,
  title: 'Wholesale Shopping',
  intro: 'Bulk, quantity-based pricing for signed-in customers.',
  faqs: [
    {
      question: 'What is wholesale shopping?',
      answer: (
        <p>
          Wholesale shopping shows lower unit prices when you buy in bulk. Instead of a single
          price, each product uses quantity-based tiers, so the more you buy, the lower the price per unit.
        </p>
      ),
    },
    {
      question: 'How do I shop wholesale?',
      answer: (
        <p>
          Sign in to your customer account and switch “Shopping Mode” to Wholesale in the store navigation. Product
          cards will then show the “Wholesale from” price for each item.
        </p>
      ),
    },
    {
      question: 'Do I need an account to shop wholesale?',
      answer: (
        <p>
          Yes. Wholesale is available to signed-in customers and does not require any approval. If you choose
          Wholesale while signed out, you will be asked to{' '}
          <Link to="/login">sign in or create a free account</Link> first.
        </p>
      ),
    },
    {
      question: 'How do wholesale price tiers work?',
      answer: (
        <p>
          Each size is divided into quantity bands, such as 1–9 units, 10–49 units, and 50+ units, with a unit price
          for each band. On a product page in Wholesale mode you can set the quantity and see the unit price for that
          quantity, plus the complete price table.
        </p>
      ),
    },
    {
      question: 'What is a minimum order quantity (MOQ)?',
      answer: (
        <p>
          Some wholesale products require a minimum quantity per order. The product page shows “Minimum order: N
          units”, and you cannot add a quantity below that.
        </p>
      ),
    },
    {
      question: 'How do I switch back to Retail?',
      answer: (
        <p>
          Use the same “Shopping Mode” switch in the store navigation and choose Retail. You can switch between Retail
          and Wholesale at any time.
        </p>
      ),
    },
  ],
}