import { Link } from 'react-router-dom'
import { PhoneIcon } from '../../../assets/icons'
import type { HelpCategory } from '../types'

export const contactCategory: HelpCategory = {
  id: 'contact',
  icon: PhoneIcon,
  title: 'Contact Support',
  intro: 'How to reach our team when you need direct help.',
  faqs: [
    {
      question: 'How can I contact you?',
      answer: (
        <p>
          The <Link to="/contact">Contact page</Link> lists our phone number, email address, opening hours, and
          pickup location. You can also chat with us on WhatsApp using the chat link or the floating WhatsApp button.
        </p>
      ),
    },
    {
      question: 'What should I have ready when I contact you?',
      answer: (
        <p>
          Your order number (if you have one) and the email address or phone number you used at checkout. This helps
          us find your order quickly.
        </p>
      ),
    },
  ],
}