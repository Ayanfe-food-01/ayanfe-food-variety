import { Router } from 'express';
import { requireCustomerAuthentication, requireCustomerRole } from '../middleware/auth.middleware.js';
import { addToWishlistController, getWishlistController, getWishlistStatusController, removeFromWishlistController, } from '../modules/wishlist/wishlist.controller.js';
export const wishlistRoutes = Router();
wishlistRoutes.use(requireCustomerAuthentication, requireCustomerRole);
wishlistRoutes.get('/', getWishlistController);
wishlistRoutes.get('/:productId/status', getWishlistStatusController);
wishlistRoutes.post('/:productId', addToWishlistController);
wishlistRoutes.delete('/:productId', removeFromWishlistController);
