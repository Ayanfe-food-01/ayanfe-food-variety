import { findProductByIdOrSlug, listProducts } from '../services/productService.js';
import { requireRouteId } from '../validators/ids.js';
import { HttpError } from '../utils/http.js';
export const getProducts = async (_request, response) => {
    const products = await listProducts();
    response.json({ data: products });
};
export const getProduct = async (request, response) => {
    const rawIdentifier = request.params.id;
    const identifier = requireRouteId(typeof rawIdentifier === 'string' ? rawIdentifier : undefined, 'product id');
    const product = await findProductByIdOrSlug(identifier);
    if (!product) {
        throw new HttpError(404, 'Product not found');
    }
    response.json({ data: product });
};
