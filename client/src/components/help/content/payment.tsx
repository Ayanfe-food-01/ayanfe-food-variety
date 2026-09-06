import { CreditCardIcon } from '../../../assets/icons'
import type { HelpCategory } from '../types'

export const paymentCategory: HelpCategory = {
  id: 'payment',
  icon: CreditCardIcon,
  title: 'Payment',
  intro: 'How payment works, from bank transfer to payment confirmation.',
  faqs: [
    {
      question: 'Which payment methods do you accept?',
      answer: (
        <p>
          We currently accept <strong>bank transfer</strong>. At checkout you will see the store’s bank name, account
          name, account number, and transfer instructions. Please transfer the exact order total shown.
        </p>
      ),
    },
    {
      question: 'How is my payment confirmed?',
      answer: (
        <p>
          Your order starts as “payment pending”. After you transfer the money, submit your payment proof. The store
          reviews it and, once verified, your payment is marked as confirmed and your order can move forward.
        </p>
      ),
    },
    {
      question: 'How do I submit my payment proof?',
      answer: (
        <>
          <p>
            From your order confirmation or your order details, choose “Submit payment proof”. You will enter your
            sender name, the amount transferred, and the date and time of the transfer, and you can include the
            transaction reference if your bank provides one.
          </p>
          <p>
            Attach a receipt or screenshot of the transfer — JPG, PNG, WEBP, or iPhone HEIC/HEIF images up to 5&nbsp;MB
            are supported — then submit it for review.
          </p>
        </>
      ),
    },
    {
      question: 'What references should I keep?',
      answer: (
        <p>
          Your order number (for example AFV-2026-000123) is the main reference for your purchase — keep it for
          tracking and support. When submitting payment proof, you can also include the bank’s transaction reference
          to help us verify your payment faster.
        </p>
      ),
    },
  ],
}