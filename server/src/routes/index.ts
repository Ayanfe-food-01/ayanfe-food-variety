import { Router } from 'express'
import { adminRoutes } from './admin.routes.js'
import { authRoutes } from './auth.routes.js'
import { bannerRoutes } from './banner.routes.js'
import { cartRoutes } from './cart.routes.js'
import { customerCartRoutes } from './cart.customer.routes.js'
import { categoryRoutes } from './category.routes.js'
import { customerStoriesRoutes } from './customer-stories.routes.js'
import { deliveryZoneRoutes } from './delivery-zone.routes.js'
import { orderRoutes } from './order.routes.js'
import { paymentRoutes } from './payment.routes.js'
import { productRoutes } from './product.routes.js'
import { quoteRoutes } from './quote.routes.js'
import { settingsRoutes } from './settings.routes.js'
import { wishlistRoutes } from './wishlist.routes.js'

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