import { HttpError } from '../../utils/http.js';
import { getCustomerOrderByNumber, listCustomerOrders } from './order.service.js';
import { validateOrderNumber } from './order.validator.js';
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
