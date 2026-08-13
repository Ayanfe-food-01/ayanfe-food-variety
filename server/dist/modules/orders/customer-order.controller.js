import { HttpError } from '../../utils/http.js';
import { cancelCustomerOrder, getCustomerOrderByNumber, listCustomerOrders } from './order.service.js';
import { validateCancellationInput, validateOrderNumber } from './order.validator.js';
export const listCustomerOrdersController = async (request, response) => {
    response.json({ success: true, data: { orders: await listCustomerOrders(request.authenticatedUser.id) } });
};
export const getCustomerOrderController = async (request, response) => {
    const orderNumber = validateOrderNumber(typeof request.params.orderNumber === 'string' ? request.params.orderNumber : undefined);
    const order = await getCustomerOrderByNumber(request.authenticatedUser.id, orderNumber);
    if (!order)
        throw new HttpError(404, 'Order not found.');
    response.json({ success: true, data: { order } });
};
export const cancelCustomerOrderController = async (request, response) => {
    const orderNumber = validateOrderNumber(typeof request.params.orderNumber === 'string' ? request.params.orderNumber : undefined);
    const order = await cancelCustomerOrder(request.authenticatedUser.id, orderNumber, validateCancellationInput(request.body).reason);
    response.json({
        success: true,
        message: 'Order cancelled.',
        data: { order },
    });
};
