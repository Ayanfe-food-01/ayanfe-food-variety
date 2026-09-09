import { Link } from 'react-router-dom'
import { CartIcon } from '../../../assets/icons'
import type { HelpCategory } from '../types'

export const orderingCategory: HelpCategory = {
  id: 'ordering',
  icon: CartIcon,
  title: 'Ordering & Shopping',
  intro: 'How to find, choose, and add products to your cart.',
  faqs: [
    {
      question: 'How do I browse the products?',
      answer: (
        <>
          <p>
            Open <Link to="/shop">Shop</Link> to browse everything. Use the search bar to look up a product by name,
            filter by category (for example Rice or Beans), and sort the results the way you like. The{' '}
            <Link to="/new-arrivals">New arrivals</Link> page shows the latest additions.
          </p>
        </>
      ),
    },
    {
      question: 'How do I choose a size or quantity?',
      answer: (
        <p>
          Some products are sold in different sizes. On those products, choose your size on the product page, then set
          the quantity you want. Products without size options can be added straight from the catalogue. Your choice
          is saved when you add the item to your cart.
        </p>
      ),
    },
    {
      question: 'How do I add a product to my cart?',
      answer: (
        <p>
          Tap “Add to cart” on a product card or on the product page. A confirmation message appears and the cart
          badge in the header updates right away. Tap the cart icon whenever you’re ready to review or change your
          items.
        </p>
      ),
    },
    {
      question: 'How do I view or manage my cart?',
      answer: (
        <p>
          Tap the cart icon in the header to open your cart. From there you can change quantities, remove items, and
          continue to checkout or open the full <Link to="/cart">cart page</Link>.
        </p>
      ),
    },
    {
      question: 'What is the difference between Retail and Wholesale shopping?',
      answer: (
        <p>
          Retail is everyday shopping at the standard unit price — you can do this as a guest without an account.
          Wholesale sells items in ready-made packages at package prices and is available to signed-in customers. You
          can switch between the two with the “Shopping Mode” switch in the store navigation.
        </p>
      ),
    },
    {
      question: 'How does wholesale pricing work?',
      answer: (
        <p>
          For wholesale, each product is sold in ready-made packages (such as a carton of 20 units) at a fixed price
          per package. On a product page in Wholesale mode, choose the package and set how many packages you want. The
          price is always per whole package, and there is no minimum order quantity.
        </p>
      ),
    },
  ],
}