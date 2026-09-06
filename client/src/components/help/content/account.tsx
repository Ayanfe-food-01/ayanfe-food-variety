import { Link } from 'react-router-dom'
import { UserIcon } from '../../../assets/icons'
import type { HelpCategory } from '../types'

export const accountCategory: HelpCategory = {
  id: 'account',
  icon: UserIcon,
  title: 'Account & Login',
  intro: 'Creating an account, signing in, and shopping as a guest.',
  faqs: [
    {
      question: 'How do I create an account?',
      answer: (
        <p>
          Open the <Link to="/login">sign-in page</Link> and tap “Don’t have an account? Sign up”. Enter your name,
          email address, and a password with at least 6 characters, then confirm the 6-digit verification code we
          email you to verify your account.
        </p>
      ),
    },
    {
      question: 'How do I sign in?',
      answer: (
        <p>
          On the <Link to="/login">sign-in page</Link>, choose “Continue with Email” and enter your email and password.
          If Google sign-in is available, you can also choose “Continue with Google” to use your Google account.
        </p>
      ),
    },
    {
      question: 'What if I forgot my password?',
      answer: (
        <p>
          Tap “Forgot Password?” on the <Link to="/login">sign-in form</Link> and follow the reset link we email you.
        </p>
      ),
    },
    {
      question: 'Can I shop and check out without an account?',
      answer: (
        <p>
          Yes. You can browse, add to cart, and place an order as a guest. At checkout choose “Continue as Guest”.
          Guest orders are confirmed with your email address and phone number, and you can track them with the Track
          order page or the secure link you get after checkout. Creating an account keeps all your orders in one
          place.
        </p>
      ),
    },
    {
      question: 'How is my personal information handled?',
      answer: (
        <p>
          We only collect and use the information needed to run our service, such as your order and account details.
          We do not sell your information or use tracking pixels. For the full details on what we collect and how we
          protect it, please read our <Link to="/privacy-policy">Privacy Policy</Link>. The rules for using the
          website and placing orders are covered in our <Link to="/terms-and-conditions">Terms &amp; Conditions</Link>.
        </p>
      ),
    },
  ],
}