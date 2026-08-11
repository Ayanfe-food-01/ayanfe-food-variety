import { HttpError } from '../../utils/http.js';
import { getCustomerOrder, listCustomerOrders } from './order.service.js';
import { validateOrderId } from './order.validator.js';
export const listCustomerOrdersController = async (request, response) => {
    response.json({ success: true, data: { orders: await listCustomerOrders(request.authenticatedUser.id) } });
};
export const getCustomerOrderController = async (request, response) => {
    const id = validateOrderId(typeof request.params.id === 'string' ? request.params.id : undefined);
    const order = await getCustomerOrder(request.authenticatedUser.id, id);
    if (!order)
        throw new HttpError(404, 'Order not found.');
    response.json({ success: true, data: { order } });
};
