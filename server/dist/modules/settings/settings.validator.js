import { HttpError } from '../../utils/http.js';
import { PaymentMethod } from '@prisma/client';
const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const requiredText = (value, field, maxLength) => {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
        throw new HttpError(400, `${field} is required and must be ${maxLength} characters or fewer.`);
    }
    return value.trim();
};
const optionalText = (value, field, maxLength) => {
    if (typeof value !== 'string' || value.trim().length > maxLength) {
        throw new HttpError(400, `${field} must be ${maxLength} characters or fewer.`);
    }
    return value.trim();
};
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[0-9][0-9\s().-]{6,38}$/;
const validatePhone = (value, field) => {
    const phone = requiredText(value, field, 40);
    if (!phonePattern.test(phone))
        throw new HttpError(400, `${field} must be a valid phone number.`);
    return phone;
};
const optionalUrl = (value, field, maxLength) => {
    const url = optionalText(value ?? '', field, maxLength);
    if (!url)
        return '';
    try {
        if (new URL(url).protocol !== 'https:')
            throw new Error('protocol');
    }
    catch {
        throw new HttpError(400, `${field} must be a valid HTTPS URL.`);
    }
    return url;
};
export function validateStoreInformationInput(body) {
    if (!isRecord(body))
        throw new HttpError(400, 'Store information is required.');
    return {
        businessName: requiredText(body.businessName, 'Business name', 180),
        callToOrderPhone: validatePhone(body.callToOrderPhone, 'Call to order phone'),
        announcementText: optionalText(body.announcementText ?? '', 'Announcement text', 2000),
        address: optionalText(body.address, 'Business address', 500),
        description: optionalText(body.description, 'Business description', 500),
    };
}
export function validateContactInformationInput(body) {
    if (!isRecord(body))
        throw new HttpError(400, 'Contact information is required.');
    const businessEmail = requiredText(body.businessEmail, 'Business email', 255);
    if (!emailPattern.test(businessEmail))
        throw new HttpError(400, 'Business email must be valid.');
    return {
        businessEmail,
        businessPhone: validatePhone(body.businessPhone, 'Business phone'),
        whatsappNumber: validatePhone(body.whatsappNumber, 'WhatsApp number'),
        openingHours: optionalText(body.openingHours ?? '', 'Opening hours', 500),
        pickupInformation: optionalText(body.pickupInformation ?? '', 'Pickup information', 1000),
        deliveryInformation: optionalText(body.deliveryInformation ?? '', 'Delivery information', 1000),
        mapEmbedUrl: optionalUrl(body.mapEmbedUrl, 'Map embed URL', 2000),
    };
}
export function validatePaymentSettingsInput(body) {
    if (!isRecord(body))
        throw new HttpError(400, 'Payment settings are required.');
    const paymentMethod = body.paymentMethod === undefined
        ? PaymentMethod.BANK_TRANSFER
        : body.paymentMethod;
    if (paymentMethod !== PaymentMethod.BANK_TRANSFER) {
        throw new HttpError(400, 'Payment method is not supported.');
    }
    if (body.isActive !== undefined && typeof body.isActive !== 'boolean') {
        throw new HttpError(400, 'Payment method availability must be true or false.');
    }
    const accountNumber = requiredText(body.accountNumber, 'Account number', 80);
    const accountDigits = accountNumber.replace(/\D/g, '');
    if (!/^[0-9][0-9 -]*[0-9]$/.test(accountNumber) || accountDigits.length < 6 || accountDigits.length > 34) {
        throw new HttpError(400, 'Account number must contain between 6 and 34 digits.');
    }
    return {
        paymentMethod,
        bankName: requiredText(body.bankName, 'Bank name', 180),
        accountName: requiredText(body.accountName, 'Account name', 180),
        accountNumber,
        instructions: requiredText(body.instructions, 'Payment instructions', 2000),
        isActive: body.isActive ?? true,
    };
}
