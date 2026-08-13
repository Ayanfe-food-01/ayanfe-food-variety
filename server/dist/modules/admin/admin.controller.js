import { PaymentMethod, PaymentSubmissionStatus } from '@prisma/client';
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
    if (value === undefined || value === '' || value === 'ALL')
        return undefined;
    if (typeof value !== 'string' || !Object.values(PaymentSubmissionStatus).includes(value)) {
        throw new HttpError(400, 'Payment status is invalid.');
    }
    return value;
};
const parsePaymentQuery = (query) => {
    const page = Number(query.page ?? 1);
    const pageSize = Number(query.pageSize ?? 20);
    if (!Number.isInteger(page) || page < 1)
        throw new HttpError(400, 'Page must be a positive integer.');
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50)
        throw new HttpError(400, 'Page size must be between 1 and 50.');
    const parseDate = (value, field, endOfDay = false) => {
        if (value === undefined || value === '')
            return undefined;
        if (typeof value !== 'string')
            throw new HttpError(400, `${field} is invalid.`);
        const date = new Date(endOfDay ? `${value}T23:59:59.999Z` : value);
        if (Number.isNaN(date.getTime()))
            throw new HttpError(400, `${field} is invalid.`);
        return date;
    };
    const from = parseDate(query.from, 'Start date');
    const to = parseDate(query.to, 'End date', true);
    if (from && to && from > to)
        throw new HttpError(400, 'Start date cannot be after end date.');
    const paymentMethod = query.paymentMethod === undefined || query.paymentMethod === '' || query.paymentMethod === 'ALL'
        ? undefined
        : query.paymentMethod;
    if (paymentMethod !== undefined && (typeof paymentMethod !== 'string' || !Object.values(PaymentMethod).includes(paymentMethod))) {
        throw new HttpError(400, 'Payment method is invalid.');
    }
    return {
        search: typeof query.search === 'string' ? query.search.trim().slice(0, 120) || undefined : undefined,
        status: parsePaymentStatus(query.status),
        paymentMethod: paymentMethod,
        from,
        to,
        sort: query.sort === 'oldest' ? 'oldest' : 'newest',
        page,
        pageSize,
    };
};
export const listAdminPaymentsController = async (request, response) => {
    response.json({ success: true, data: await listAdminPayments(parsePaymentQuery(request.query)) });
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
        data: { payment: await reviewPayment(id, true, validateReviewPaymentInput(request.body, false), request.authenticatedUser.id) },
    });
};
export const rejectAdminPaymentController = async (request, response) => {
    const id = validatePaymentSubmissionId(request.params.id);
    response.json({
        success: true,
        message: 'Payment rejected.',
        data: { payment: await reviewPayment(id, false, validateReviewPaymentInput(request.body, true), request.authenticatedUser.id) },
    });
};
