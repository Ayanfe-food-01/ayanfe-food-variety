import { Router } from 'express'
import { adminRoutes } from '../modules/admin/admin.routes.js'
import { authRoutes } from '../modules/auth/auth.routes.js'
import { bannerRoutes } from '../modules/banners/banner.routes.js'
import { cartRoutes } from '../modules/cart/cart.routes.js'
import { customerCartRoutes } from '../modules/cart/cart.customer.routes.js'
import { categoryRoutes } from '../modules/categories/category.routes.js'
import { customerStoriesRoutes } from '../modules/customer-stories/customer-stories.routes.js'
import { deliveryZoneRoutes } from '../modules/delivery-zones/delivery-zone.routes.js'
import { orderRoutes } from '../modules/orders/order.routes.js'
import { paymentRoutes } from '../modules/payments/payment.routes.js'
import { productRoutes } from '../modules/products/product.routes.js'
import { quoteRoutes } from '../modules/quotes/quote.routes.js'
import { settingsRoutes } from '../modules/settings/settings.routes.js'
import { wishlistRoutes } from '../modules/wishlist/wishlist.routes.js'

export const apiRoutes = Router()

apiRoutes.use('/categories', categoryRoutes)
apiRoutes.use('/products', productRoutes)
apiRoutes.use('/orders', orderRoutes)
apiRoutes.use('/payments', paymentRoutes)
apiRoutes.use('/admin', adminRoutes)
apiRoutes.use('/auth', authRoutes)
apiRoutes.use('/customer', customerCartRoutes)
apiRoutes.use('/cart', cartRoutes)
apiRoutes.use('/store/settings', settingsRoutes)
apiRoutes.use('/store/banners', bannerRoutes)
apiRoutes.use('/store/customer-stories', customerStoriesRoutes)
apiRoutes.use('/wishlist', wishlistRoutes)
apiRoutes.use('/quotes', quoteRoutes)
apiRoutes.use('/delivery-zones', deliveryZoneRoutes)