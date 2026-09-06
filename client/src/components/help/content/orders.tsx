import { Link } from 'react-router-dom'
import { ClipboardListIcon } from '../../../assets/icons'
import type { HelpCategory } from '../types'

export const ordersCategory: HelpCategory = {
  id: 'orders',
  icon: ClipboardListIcon,
  title: 'Orders & Tracking',
  intro: 'Placing orders, viewing them, and checking their status.',
  faqs: [
    {
      question: 'How do I place an order?',
      answer: (
        <p>
          Add items to your cart and go to checkout. Enter your contact details, choose pickup or delivery, select
          bank transfer, and place the order. You get an order number and a confirmation page right away.
        </p>
      ),
    },
    {
      question: 'How do I view my orders?',
      answer: (
        <p>
          Sign in and open <Link to="/orders">Orders</Link> (or the account icon in the header) to see all your orders
          and open any of them for details. From there you can submit payment proof while your payment is still
          pending, and cancel orders that are still at “Order Placed” or “Processing”.
        </p>
      ),
    },
    {
      question: 'How do I track an order as a guest?',
      answer: (
        <p>
          Use the <Link to="/track-order">Track order</Link> page with your order number and the email address or
          phone number you used at checkout. This works for orders placed without an account — you also receive a
          secure order link after checkout. Orders placed from an account should be viewed by signing in.
        </p>
      ),
    },
    {
      question: 'How do I check my order status?',
      answer: (
        <p>
          Orders move through Order Placed, Processing, Out for Delivery, then Delivered (or Cancelled). Payment is
          tracked separately (Pending, Paid, or Rejected). Your order details and the tracker show the current stage.
        </p>
      ),
    },
  ],
}