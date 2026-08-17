import { HttpError } from '../../utils/http.js';
import { checkoutCustomerCart, getGuestOrderByNumber, getGuestOrderForTracking, getOrderById } from './order.service.js';
import { validateCheckoutInput, validateGuestOrderTrackingInput, validateOrderId } from './order.validator.js';
import { validateOrderNumber } from './order.validator.js';
export const checkoutController = async (request, response) => {
    const order = await checkoutCustomerCart(request.authenticatedUser?.id ?? null, validateCheckoutInput(request.body));
    response.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: { order },
    });
};
export const guestOrderController = async (request, response) => {
    const orderNumber = validateOrderNumber(typeof request.params.orderNumber === 'string' ? request.params.orderNumber : undefined);
    const accessToken = request.get('X-Guest-Access-Token')?.trim();
    if (!accessToken) {
        throw new HttpError(401, 'Guest order access is required.');
    }
    const order = await getGuestOrderByNumber(orderNumber, accessToken);
    if (!order)
        throw new HttpError(404, 'Order not found.');
    response.json({ success: true, data: { order } });
};
export const guestOrderTrackingController = async (request, response) => {
    const { orderNumber, contact } = validateGuestOrderTrackingInput(request.body);
    const order = await getGuestOrderForTracking(orderNumber, contact);
    if (!order) {
        throw new HttpError(404, 'We could not verify this order. Check the order number and the email or phone used at checkout. Guest tracking is for orders placed without signing in; if you used an account, sign in to view your order.');
    }
    response.json({ success: true, data: { order } });
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
