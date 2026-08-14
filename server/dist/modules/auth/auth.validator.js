import { HttpError } from '../../utils/http.js';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
export function validateLoginInput(body) {
    if (!isRecord(body))
        throw new HttpError(400, 'Email and password are required.');
    if (typeof body.email !== 'string' || !body.email.trim() || !EMAIL_PATTERN.test(body.email.trim())) {
        throw new HttpError(400, 'Enter a valid email address.');
    }
    if (typeof body.password !== 'string' || body.password.length < 6 || body.password.length > 256) {
        throw new HttpError(400, 'Password must be at least 6 characters.');
    }
    return { email: body.email.trim().toLowerCase(), password: body.password };
}
export function validateCustomerSignupInput(body) {
    if (!isRecord(body))
        throw new HttpError(400, 'Name, email, and password are required.');
    if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 180) {
        throw new HttpError(400, 'Enter your name.');
    }
    if (typeof body.email !== 'string' || !body.email.trim() || !EMAIL_PATTERN.test(body.email.trim())) {
        throw new HttpError(400, 'Enter a valid email address.');
    }
    if (typeof body.password !== 'string' || body.password.length < 6 || body.password.length > 256) {
        throw new HttpError(400, 'Password must be at least 6 characters.');
    }
    return {
        name: body.name.trim(),
        email: body.email.trim().toLowerCase(),
        password: body.password,
    };
}
export function validateCustomerEmailVerificationInput(body) {
    if (!isRecord(body))
        throw new HttpError(400, 'Email and verification code are required.');
    if (typeof body.email !== 'string' || !body.email.trim() || !EMAIL_PATTERN.test(body.email.trim())) {
        throw new HttpError(400, 'Enter a valid email address.');
    }
    if (typeof body.otp !== 'string' || !/^\d{6}$/.test(body.otp)) {
        throw new HttpError(400, 'Enter the 6-digit verification code.');
    }
    return {
        email: body.email.trim().toLowerCase(),
        otp: body.otp,
    };
}
export function validateCustomerVerificationEmailInput(body) {
    if (!isRecord(body))
        throw new HttpError(400, 'Email is required.');
    if (typeof body.email !== 'string' || !body.email.trim() || !EMAIL_PATTERN.test(body.email.trim())) {
        throw new HttpError(400, 'Enter a valid email address.');
    }
    return { email: body.email.trim().toLowerCase() };
}
export function validatePasswordResetRequestInput(body) {
    if (!isRecord(body))
        throw new HttpError(400, 'Email is required.');
    if (typeof body.email !== 'string' || !body.email.trim() || !EMAIL_PATTERN.test(body.email.trim())) {
        throw new HttpError(400, 'Enter a valid email address.');
    }
    return { email: body.email.trim().toLowerCase() };
}
export function validatePasswordResetInput(body) {
    if (!isRecord(body))
        throw new HttpError(400, 'The reset link and a new password are required.');
    if (typeof body.token !== 'string' || !body.token.trim() || body.token.length > 256) {
        throw new HttpError(400, 'This password reset link is invalid or has expired.');
    }
    if (typeof body.newPassword !== 'string' || body.newPassword.length < 6 || body.newPassword.length > 256) {
        throw new HttpError(400, 'Password must be at least 6 characters.');
    }
    if (typeof body.confirmPassword !== 'string' || body.confirmPassword !== body.newPassword) {
        throw new HttpError(400, 'Passwords do not match.');
    }
    return {
        token: body.token,
        newPassword: body.newPassword,
        confirmPassword: body.confirmPassword,
    };
}
