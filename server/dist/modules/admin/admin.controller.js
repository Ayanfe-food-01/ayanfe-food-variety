import { PaymentSubmissionStatus } from '@prisma/client';
import { HttpError } from '../../utils/http.js';
import { reviewPayment } from '../payments/payment.service.js';
import { validateReviewPaymentInput, validatePaymentSubmissionId } from '../payments/payment.validator.js';
import { getAdminOrder, getAdminPayment, getDashboardStats, listAdminOrders, listAdminPayments, updateAdminOrderStatus, } from './admin.service.js';
import { validateAdminOrdersQuery, validateOrderNumber, validateOrderStatusInput, } from './admin.validator.js';
export const getDashboardController = async (_request, response) => {
    response.json({ success: true, data: { stats: await getDashboardStats() } });
};
export const listAdminOrdersController = async (request, response) => {
    response.json({ success: true, data: await listAdminOrders(validateAdminOrdersQuery(request.query)) });
};
export const getAdminOrderController = async (request, response) => {
    const orderNumber = validateOrderNumber(request.params.orderNumber);
    response.json({ success: true, data: { order: await getAdminOrder(orderNumber) } });
};
export const updateAdminOrderStatusController = async (request, response) => {
    const orderNumber = validateOrderNumber(request.params.orderNumber);
    response.json({
        success: true,
        message: 'Order status updated.',
        data: { order: await updateAdminOrderStatus(orderNumber, validateOrderStatusInput(request.body), request.authenticatedUser.id) },
    });
};
const parsePaymentStatus = (value) => {
    if (value === undefined)
        return PaymentSubmissionStatus.PENDING;
    if (typeof value !== 'string' || !Object.values(PaymentSubmissionStatus).includes(value)) {
        throw new HttpError(400, 'Payment status is invalid.');
    }
    return value;
};
export const listAdminPaymentsController = async (request, response) => {
    response.json({ success: true, data: { payments: await listAdminPayments(parsePaymentStatus(request.query.status)) } });
};
export const getAdminPaymentController = async (request, response) => {
    const id = validatePaymentSubmissionId(request.params.id);
    response.json({ success: true, data: { payment: await getAdminPayment(id) } });
};
export const verifyAdminPaymentController = async (request, response) => {
    const id = validatePaymentSubmissionId(request.params.id);
    response.json({
        success: true,
        message: 'Payment verified.',
        data: { payment: await reviewPayment(id, true, validateReviewPaymentInput(request.body, false)) },
    });
};
export const rejectAdminPaymentController = async (request, response) => {
    const id = validatePaymentSubmissionId(request.params.id);
    response.json({
        success: true,
        message: 'Payment rejected.',
        data: { payment: await reviewPayment(id, false, validateReviewPaymentInput(request.body, true)) },
    });
};
