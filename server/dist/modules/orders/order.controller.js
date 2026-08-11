import { HttpError } from '../../utils/http.js';
import { checkoutCustomerCart, getOrderById } from './order.service.js';
import { validateCheckoutInput, validateOrderId } from './order.validator.js';
export const checkoutController = async (request, response) => {
    const order = await checkoutCustomerCart(request.authenticatedUser.id, validateCheckoutInput(request.body));
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
