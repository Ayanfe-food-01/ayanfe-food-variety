import type { HelpCategory } from '../types'
import { accountCategory } from './account'
import { contactCategory } from './contact'
import { deliveryCategory } from './delivery'
import { orderingCategory } from './ordering'
import { ordersCategory } from './orders'
import { paymentCategory } from './payment'
import { returnsCategory } from './returns'
import { wholesaleCategory } from './wholesale'

export const helpCategories: HelpCategory[] = [
  orderingCategory,
  paymentCategory,
  deliveryCategory,
  wholesaleCategory,
  ordersCategory,
  returnsCategory,
  accountCategory,
  contactCategory,
]

export const quickLinks = [
  { label: 'Shop now', href: '/shop' },
  { label: 'Track your order', href: '/track-order' },
  { label: 'Your orders', href: '/orders' },
  { label: 'Sign in', href: '/login' },
]