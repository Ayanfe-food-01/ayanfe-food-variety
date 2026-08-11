import { getCustomerCart, mergeCustomerCart, replaceCustomerCart } from './cart.service.js';
import { validateCartItems } from './cart.validator.js';
const customerId = (request) => request.authenticatedUser.id;
export const getCustomerCartController = async (request, response) => {
    response.json({ success: true, data: { items: await getCustomerCart(customerId(request)) } });
};
export const syncCustomerCartController = async (request, response) => {
    response.json({ success: true, data: { items: await mergeCustomerCart(customerId(request), validateCartItems(request.body)) } });
};
export const replaceCustomerCartController = async (request, response) => {
    response.json({ success: true, data: { items: await replaceCustomerCart(customerId(request), validateCartItems(request.body)) } });
};
