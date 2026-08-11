import { addCustomerCartItem, clearCustomerCart, getCustomerCart, mergeCustomerCart, removeCustomerCartItem, replaceCustomerCart, updateCustomerCartItem, } from './cart.service.js';
import { validateCartItemId, validateCartItemInput, validateCartItems, validateQuantity } from './cart.validator.js';
const customerId = (request) => request.authenticatedUser.id;
export const getCustomerCartController = async (request, response) => {
    response.json({ success: true, data: await getCustomerCart(customerId(request)) });
};
export const addCustomerCartItemController = async (request, response) => {
    response.status(201).json({
        success: true,
        data: await addCustomerCartItem(customerId(request), validateCartItemInput(request.body)),
    });
};
export const updateCustomerCartItemController = async (request, response) => {
    const itemId = validateCartItemId(typeof request.params.id === 'string' ? request.params.id : undefined);
    const quantity = validateQuantity(request.body?.quantity);
    response.json({
        success: true,
        data: await updateCustomerCartItem(customerId(request), itemId, quantity),
    });
};
export const removeCustomerCartItemController = async (request, response) => {
    const itemId = validateCartItemId(typeof request.params.id === 'string' ? request.params.id : undefined);
    response.json({
        success: true,
        data: await removeCustomerCartItem(customerId(request), itemId),
    });
};
export const clearCustomerCartController = async (request, response) => {
    response.json({
        success: true,
        data: await clearCustomerCart(customerId(request)),
    });
};
export const syncCustomerCartController = async (request, response) => {
    response.json({ success: true, data: await mergeCustomerCart(customerId(request), validateCartItems(request.body)) });
};
export const replaceCustomerCartController = async (request, response) => {
    response.json({ success: true, data: await replaceCustomerCart(customerId(request), validateCartItems(request.body)) });
};
