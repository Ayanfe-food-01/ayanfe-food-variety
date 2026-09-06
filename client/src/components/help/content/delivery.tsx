import { Link } from 'react-router-dom'
import { TruckIcon } from '../../../assets/icons'
import type { HelpCategory } from '../types'

export const deliveryCategory: HelpCategory = {
  id: 'delivery',
  icon: TruckIcon,
  title: 'Delivery & Pickup',
  intro: 'Your options for receiving your order.',
  faqs: [
    {
      question: 'What delivery options are available?',
      answer: (
        <p>
          At checkout you can choose <strong>Pickup</strong> or <strong>Delivery</strong>. Pickup means collecting
          your order from the store when it is ready, with no delivery fee. Delivery means your order is brought to
          the address you enter. Once your order is placed, this choice cannot be changed.
        </p>
      ),
    },
    {
      question: 'How much is delivery?',
      answer: (
        <p>
          Delivery is priced by delivery zone. During delivery checkout you choose your state and city, and the
          matching delivery zone and fee are shown automatically before you place the order. Some zones offer free
          delivery once your order reaches a minimum subtotal. Pickup has no delivery fee.
        </p>
      ),
    },
    {
      question: 'When is my order ready and how will I know?',
      answer: (
        <p>
          We contact you using the phone number on your order when your items are ready for collection or on their
          way to you. You can review the store’s pickup and delivery information on the{' '}
          <Link to="/contact">Contact page</Link>.
        </p>
      ),
    },
  ],
}