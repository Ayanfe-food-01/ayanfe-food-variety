import { Link } from 'react-router-dom'
import { RefreshCwIcon } from '../../../assets/icons'
import type { HelpCategory } from '../types'

export const returnsCategory: HelpCategory = {
  id: 'returns',
  icon: RefreshCwIcon,
  title: 'Returns & Refunds',
  intro: 'Cancelling an order or getting help with returns and refunds.',
  faqs: [
    {
      question: 'Can I cancel an order?',
      answer: (
        <p>
          Yes. If you placed an order from an account and it is still at “Order Placed” or “Processing”, you can
          cancel it from your <Link to="/orders">orders</Link>. Once an order is out for delivery or delivered, it can
          no longer be cancelled.
        </p>
      ),
    },
    {
      question: 'What should I do about a return or refund?',
      answer: (
        <p>
          Contact us with your order number and explain the issue. Our team will review it and let you know the next
          steps — reach us through the <Link to="/contact">Contact page</Link>, WhatsApp, or email. For the full
          details on eligibility and how returns and refunds are handled, read our{' '}
          <Link to="/return-refund-policy">Return &amp; Refund Policy</Link>.
        </p>
      ),
    },
  ],
}