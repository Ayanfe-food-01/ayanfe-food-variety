import { HttpError } from '../../utils/http.js';
import { PaymentMethod } from '@prisma/client';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const requiredText = (value, field, maxLength) => {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new HttpError(400, `${field} is required`);
    }
    const normalizedValue = value.trim();
    if (normalizedValue.length > maxLength) {
        throw new HttpError(400, `${field} must be ${maxLength} characters or fewer`);
    }
    return normalizedValue;
};
const optionalText = (value, field, maxLength) => {
    if (value === undefined || value === null || value === '')
        return undefined;
    if (typeof value !== 'string') {
        throw new HttpError(400, `${field} must be text`);
    }
    const normalizedValue = value.trim();
    if (normalizedValue.length > maxLength) {
        throw new HttpError(400, `${field} must be ${maxLength} characters or fewer`);
    }
    return normalizedValue || undefined;
};
export function validateOrderId(value) {
    if (!value || !UUID_PATTERN.test(value.trim())) {
        throw new HttpError(400, 'order id must be a valid order ID');
    }
    return value.trim();
}
export function validateCheckoutInput(body) {
    if (!isRecord(body))
        throw new HttpError(400, 'Checkout details are required.');
    const checkoutKey = body.checkoutKey;
    if (typeof checkoutKey !== 'string' || !UUID_PATTERN.test(checkoutKey.trim())) {
        throw new HttpError(400, 'A valid checkout key is required.');
    }
    return {
        checkoutKey: checkoutKey.trim(),
        customerName: requiredText(body.customerName, 'customerName', 180),
        phone: requiredText(body.phone, 'phone', 40),
        deliveryAddress: requiredText(body.deliveryAddress, 'deliveryAddress', 2000),
        city: requiredText(body.city, 'city', 120),
        deliveryInstructions: optionalText(body.deliveryInstructions, 'deliveryInstructions', 2000),
        paymentMethod: body.paymentMethod === PaymentMethod.BANK_TRANSFER
            ? PaymentMethod.BANK_TRANSFER
            : (() => { throw new HttpError(400, 'Payment method is not supported.'); })(),
    };
}
export function validateCancellationInput(body) {
    if (body === undefined || body === null)
        return {};
    if (!isRecord(body))
        throw new HttpError(400, 'Cancellation details are invalid.');
    const reason = body.reason;
    if (reason === undefined || reason === null || reason === '')
        return {};
    if (typeof reason !== 'string' || reason.trim().length > 500) {
        throw new HttpError(400, 'Cancellation reason must be 500 characters or fewer.');
    }
    return { reason: reason.trim() || undefined };
}
export function validateOrderNumber(value) {
    if (!value || !/^AFV-\d{4}-\d{6}$/.test(value.trim())) {
        throw new HttpError(400, 'Order number is invalid.');
    }
    return value.trim();
}
