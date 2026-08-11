import { HttpError } from '../../utils/http.js';
import { createOrder, getOrderById } from './order.service.js';
import { validateCreateOrderInput, validateOrderId } from './order.validator.js';
export const createOrderController = async (request, response) => {
    const input = validateCreateOrderInput(request.body);
    const order = await createOrder({
        ...input,
        userId: request.authenticatedUser?.role === 'CUSTOMER' ? request.authenticatedUser.id : undefined,
    });
    response.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: { order },
    });
};
export const getOrderByIdController = async (request, response) => {
    const id = validateOrderId(typeof request.params.id === 'string' ? request.params.id : undefined);
    const order = await getOrderById(id);
    if (!order) {
        throw new HttpError(404, 'Order not found');
    }
    response.json({
        success: true,
        data: { order },
    });
};
