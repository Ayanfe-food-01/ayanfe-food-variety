import { HttpError } from '../../utils/http.js';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
export function validateCartItems(body) {
    if (!isRecord(body) || !Array.isArray(body.items) || body.items.length > 50) {
        throw new HttpError(400, 'Cart items are required and must be valid.');
    }
    const productIds = new Set();
    return body.items.map((value, index) => {
        if (!isRecord(value))
            throw new HttpError(400, `items[${index}] must be an object.`);
        if (typeof value.productId !== 'string' || !UUID_PATTERN.test(value.productId)) {
            throw new HttpError(400, `items[${index}].productId must be valid.`);
        }
        if (typeof value.quantity !== 'number' || !Number.isInteger(value.quantity) || value.quantity < 1 || value.quantity > 1000) {
            throw new HttpError(400, `items[${index}].quantity must be a positive integer.`);
        }
        if (productIds.has(value.productId))
            throw new HttpError(400, 'Duplicate products are not allowed in a cart.');
        productIds.add(value.productId);
        return { productId: value.productId, quantity: value.quantity };
    });
}
