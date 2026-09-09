import { Link } from 'react-router-dom'
import { LayersIcon } from '../../../assets/icons'
import type { HelpCategory } from '../types'

export const wholesaleCategory: HelpCategory = {
  id: 'wholesale',
  icon: LayersIcon,
  title: 'Wholesale Shopping',
  intro: 'Package-based bulk pricing for signed-in customers.',
  faqs: [
    {
      question: 'What is wholesale shopping?',
      answer: (
        <p>
          Wholesale shopping sells products in ready-made packages (cartons or cases). Instead of buying individual
          units, you choose a package and order whole packages at a fixed price per package.
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
      question: 'How do wholesale packages work?',
      answer: (
        <p>
          Each product can have one or more packages, for example a carton of 20 units or a crate of 25 units. A
          package belongs to a specific size when the product comes in sizes. On a product page in Wholesale mode,
          pick a package and set how many packages you want; the quantity you choose is counted in whole packages.
        </p>
      ),
    },
    {
      question: 'Is there a minimum order quantity?',
      answer: (
        <p>
          No. Wholesale items have no minimum order quantity — you can start with a single package. Packages are sold
          as whole units (you cannot order a fraction of a carton).
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