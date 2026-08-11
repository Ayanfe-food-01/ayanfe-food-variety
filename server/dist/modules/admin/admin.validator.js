import { OrderStatus } from '@prisma/client';
import { HttpError } from '../../utils/http.js';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const requiredText = (value, field, maxLength) => {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
        throw new HttpError(400, `${field} is required and must be valid.`);
    }
    return value.trim();
};
const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
export const validateAdminId = (value, label) => {
    if (typeof value !== 'string' || !UUID_PATTERN.test(value.trim())) {
        throw new HttpError(400, `${label} must be a valid ID.`);
    }
    return value.trim();
};
export function validateOrderStatusInput(body) {
    if (!isRecord(body) || typeof body.orderStatus !== 'string') {
        throw new HttpError(400, 'orderStatus is required.');
    }
    if (!Object.values(OrderStatus).includes(body.orderStatus)) {
        throw new HttpError(400, 'orderStatus is invalid.');
    }
    return { orderStatus: body.orderStatus };
}
export function validatePaymentSettingsInput(body) {
    if (!isRecord(body))
        throw new HttpError(400, 'Payment settings are required.');
    return {
        bankName: requiredText(body.bankName, 'Bank name', 180),
        accountName: requiredText(body.accountName, 'Account name', 180),
        accountNumber: requiredText(body.accountNumber, 'Account number', 80),
        instructions: requiredText(body.instructions, 'Payment instructions', 2000),
    };
}
