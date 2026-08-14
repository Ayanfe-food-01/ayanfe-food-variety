import { promisify } from 'node:util';
import { createHmac, randomBytes, randomInt, scrypt as nodeScrypt, timingSafeEqual, } from 'node:crypto';
import { UserRole } from '@prisma/client';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../utils/http.js';
import { assertVerificationEmailConfigured, sendPasswordResetEmail, sendCustomerVerificationEmail, VerificationEmailError, } from './auth.email.js';
const scrypt = promisify(nodeScrypt);
const SESSION_COOKIE_NAME = 'ayanfe_admin_session';
const CUSTOMER_SESSION_COOKIE_NAME = 'ayanfe_customer_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const VERIFICATION_TTL_MS = 10 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 20 * 60 * 1000;
const VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000;
const VERIFICATION_RESEND_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_VERIFICATION_RESENDS_PER_WINDOW = 5;
const MAX_VERIFICATION_ATTEMPTS = 5;
const toUser = (user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone ?? null,
    role: user.role,
});
export const authCookie = {
    name: SESSION_COOKIE_NAME,
    maxAge: SESSION_TTL_MS,
    options: {
        httpOnly: true,
        secure: env.nodeEnv === 'production',
        sameSite: (env.nodeEnv === 'production' ? 'none' : 'lax'),
        path: '/',
    },
};
export const customerAuthCookie = {
    name: CUSTOMER_SESSION_COOKIE_NAME,
    maxAge: SESSION_TTL_MS,
    options: {
        httpOnly: true,
        secure: env.nodeEnv === 'production',
        sameSite: (env.nodeEnv === 'production' ? 'none' : 'lax'),
        path: '/',
    },
};
export async function hashPassword(password) {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = (await scrypt(password, salt, 64));
    return `scrypt$1$${salt}$${derivedKey.toString('hex')}`;
}
export async function verifyPassword(password, storedHash) {
    const [algorithm, version, salt, keyHex] = storedHash.split('$');
    if (algorithm !== 'scrypt' || version !== '1' || !salt || !keyHex || !/^[0-9a-f]+$/i.test(keyHex)) {
        return false;
    }
    const expectedKey = Buffer.from(keyHex, 'hex');
    const actualKey = (await scrypt(password, salt, expectedKey.length));
    return expectedKey.length === actualKey.length && timingSafeEqual(expectedKey, actualKey);
}
const hashSessionToken = (token) => createHmac('sha256', env.sessionSecret).update(token).digest('hex');
const hashPasswordResetToken = (token) => createHmac('sha256', env.sessionSecret).update(`password-reset:${token}`).digest('hex');
const generateVerificationCode = () => randomInt(0, 1_000_000).toString().padStart(6, '0');
const hashVerificationCode = (userId, code) => createHmac('sha256', env.sessionSecret)
    .update(`${userId}:${code}`)
    .digest('hex');
const isVerificationCodeValid = (userId, code, storedHash) => {
    if (!/^[0-9a-f]{64}$/i.test(storedHash))
        return false;
    const expected = Buffer.from(storedHash, 'hex');
    const actual = Buffer.from(hashVerificationCode(userId, code), 'hex');
    return expected.length === actual.length && timingSafeEqual(expected, actual);
};
const verificationResult = (email) => ({
    email,
    verificationExpiresInSeconds: VERIFICATION_TTL_MS / 1000,
});
const getEmailDomain = (email) => email.split('@')[1]?.toLowerCase() || 'unknown';
const logVerificationEvent = (event, email, extra) => {
    console.info(JSON.stringify({
        event,
        recipientDomain: getEmailDomain(email),
        ...extra,
    }));
};
const getEmailDeliveryError = (error) => {
    if (error instanceof VerificationEmailError && error.reason === 'configuration') {
        return new HttpError(503, 'Email verification is not configured on the server. Please contact support.');
    }
    return new HttpError(503, 'We could not send a verification email. Please try again later.');
};
const readCookie = (cookieHeader, name) => {
    if (!cookieHeader)
        return null;
    for (const part of cookieHeader.split(';')) {
        const [key, ...valueParts] = part.trim().split('=');
        if (key === name)
            return decodeURIComponent(valueParts.join('='));
    }
    return null;
};
export const getSessionToken = (cookieHeader) => readCookie(cookieHeader, SESSION_COOKIE_NAME);
export async function login(input) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !user.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) {
        throw new HttpError(401, 'Invalid email or password.');
    }
    if (user.role === UserRole.CUSTOMER) {
        if (!user.emailVerified) {
            throw new HttpError(403, 'Please verify your email before signing in.');
        }
        const customerSession = await createSession(user, 'customer');
        return { ...customerSession, sessionType: 'customer' };
    }
    const adminSession = await createSession(user, 'admin');
    return { ...adminSession, sessionType: 'admin' };
}
async function createSession(user, kind) {
    const token = randomBytes(32).toString('base64url');
    const sessionData = {
        userId: user.id,
        tokenHash: hashSessionToken(token),
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    };
    await prisma.$transaction(async (transaction) => {
        if (kind === 'admin') {
            await transaction.adminSession.create({ data: sessionData });
        }
        else {
            await transaction.customerSession.create({ data: sessionData });
        }
        await transaction.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });
    });
    return { user: toUser(user), token };
}
export async function signupCustomer(input) {
    try {
        assertVerificationEmailConfigured();
    }
    catch (error) {
        logVerificationEvent('email_verification_configuration_failed', input.email);
        throw getEmailDeliveryError(error);
    }
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing)
        throw new HttpError(409, 'An account with this email already exists.');
    const now = new Date();
    const code = generateVerificationCode();
    const passwordHash = await hashPassword(input.password);
    logVerificationEvent('email_verification_requested', input.email);
    const user = await prisma.$transaction(async (transaction) => {
        const createdUser = await transaction.user.create({
            data: {
                name: input.name,
                email: input.email,
                passwordHash,
                role: UserRole.CUSTOMER,
                emailVerified: false,
            },
        });
        await transaction.customerEmailVerification.create({
            data: {
                userId: createdUser.id,
                otpHash: hashVerificationCode(createdUser.id, code),
                expiresAt: new Date(now.getTime() + VERIFICATION_TTL_MS),
                requestWindowStart: now,
            },
        });
        return createdUser;
    });
    try {
        await sendCustomerVerificationEmail({ recipient: user.email, code });
    }
    catch (error) {
        try {
            await prisma.$transaction([
                prisma.customerEmailVerification.deleteMany({ where: { userId: user.id } }),
                prisma.user.delete({ where: { id: user.id } }),
            ]);
        }
        catch (cleanupError) {
            console.error(JSON.stringify({
                event: 'email_verification_signup_cleanup_failed',
                recipientDomain: getEmailDomain(user.email),
                errorName: cleanupError instanceof Error ? cleanupError.name : 'UnknownError',
            }));
        }
        logVerificationEvent('email_verification_delivery_failed', user.email);
        throw getEmailDeliveryError(error);
    }
    logVerificationEvent('email_verification_record_created', user.email);
    return { user: toUser(user), ...verificationResult(user.email) };
}
export async function loginCustomer(input) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || user.role !== UserRole.CUSTOMER || !user.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) {
        throw new HttpError(401, 'Invalid email or password.');
    }
    if (!user.emailVerified) {
        throw new HttpError(403, 'Please verify your email before signing in.');
    }
    return createSession(user, 'customer');
}
const genericPasswordResetMessage = "If an account exists with this email, we've sent password reset instructions.";
export async function requestPasswordReset(input) {
    const user = await prisma.user.findUnique({
        where: { email: input.email },
        select: { id: true, email: true, passwordHash: true },
    });
    if (!user?.passwordHash)
        return { message: genericPasswordResetMessage };
    const rawToken = randomBytes(32).toString('base64url');
    const now = new Date();
    const resetToken = await prisma.$transaction(async (transaction) => {
        await transaction.passwordResetToken.updateMany({
            where: { userId: user.id, usedAt: null },
            data: { usedAt: now },
        });
        return transaction.passwordResetToken.create({
            data: {
                userId: user.id,
                tokenHash: hashPasswordResetToken(rawToken),
                expiresAt: new Date(now.getTime() + PASSWORD_RESET_TTL_MS),
            },
        });
    });
    try {
        await sendPasswordResetEmail({
            recipient: user.email,
            token: rawToken,
            expiresInMinutes: PASSWORD_RESET_TTL_MS / 60_000,
        });
    }
    catch (error) {
        await prisma.passwordResetToken.deleteMany({
            where: { id: resetToken.id, usedAt: null },
        }).catch((cleanupError) => {
            console.error(JSON.stringify({
                event: 'password_reset_email_cleanup_failed',
                recipientDomain: getEmailDomain(user.email),
                errorName: cleanupError instanceof Error ? cleanupError.name : 'UnknownError',
            }));
        });
        console.error(JSON.stringify({
            event: 'password_reset_email_delivery_failed',
            recipientDomain: getEmailDomain(user.email),
            errorName: error instanceof Error ? error.name : 'UnknownError',
        }));
    }
    return { message: genericPasswordResetMessage };
}
export async function resetPassword(input) {
    const tokenHash = hashPasswordResetToken(input.token);
    const now = new Date();
    const resetToken = await prisma.passwordResetToken.findUnique({
        where: { tokenHash },
        select: { id: true, userId: true, expiresAt: true, usedAt: true },
    });
    if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= now) {
        throw new HttpError(400, 'This password reset link is invalid or has expired.');
    }
    const passwordHash = await hashPassword(input.newPassword);
    await prisma.$transaction(async (transaction) => {
        const claimed = await transaction.passwordResetToken.updateMany({
            where: {
                id: resetToken.id,
                usedAt: null,
                expiresAt: { gt: now },
            },
            data: { usedAt: now },
        });
        if (claimed.count !== 1) {
            throw new HttpError(400, 'This password reset link is invalid or has expired.');
        }
        await transaction.user.update({
            where: { id: resetToken.userId },
            data: { passwordHash },
        });
        await transaction.adminSession.updateMany({
            where: { userId: resetToken.userId, revokedAt: null },
            data: { revokedAt: now },
        });
        await transaction.customerSession.updateMany({
            where: { userId: resetToken.userId, revokedAt: null },
            data: { revokedAt: now },
        });
        await transaction.passwordResetToken.updateMany({
            where: { userId: resetToken.userId, usedAt: null },
            data: { usedAt: now },
        });
    });
}
export async function changeAdminPassword(userId, currentSessionToken, input) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, passwordHash: true },
    });
    if (!user || user.role !== UserRole.ADMIN || !user.passwordHash || !(await verifyPassword(input.currentPassword, user.passwordHash))) {
        throw new HttpError(400, 'Current password is incorrect.');
    }
    if (await verifyPassword(input.newPassword, user.passwordHash)) {
        throw new HttpError(400, 'New password must be different from your current password.');
    }
    const passwordHash = await hashPassword(input.newPassword);
    const currentTokenHash = currentSessionToken ? hashSessionToken(currentSessionToken) : null;
    await prisma.$transaction(async (transaction) => {
        await transaction.user.update({
            where: { id: user.id },
            data: { passwordHash },
        });
        await transaction.adminSession.updateMany({
            where: {
                userId: user.id,
                revokedAt: null,
                ...(currentTokenHash ? { tokenHash: { not: currentTokenHash } } : {}),
            },
            data: { revokedAt: new Date() },
        });
    });
}
export async function verifyCustomerEmail(input) {
    const user = await prisma.user.findUnique({
        where: { email: input.email },
        select: { id: true, email: true, role: true, emailVerified: true },
    });
    if (!user || user.role !== UserRole.CUSTOMER) {
        throw new HttpError(400, 'The verification code is invalid or has expired.');
    }
    if (user.emailVerified) {
        throw new HttpError(400, 'This email is already verified. You can sign in.');
    }
    const pending = await prisma.customerEmailVerification.findUnique({ where: { userId: user.id } });
    if (!pending) {
        throw new HttpError(400, 'The verification code is invalid or has expired.');
    }
    if (pending.expiresAt <= new Date()) {
        await prisma.customerEmailVerification.deleteMany({ where: { id: pending.id } });
        throw new HttpError(400, 'This verification code has expired. Request a new code.');
    }
    if (pending.attempts >= MAX_VERIFICATION_ATTEMPTS) {
        await prisma.customerEmailVerification.deleteMany({ where: { id: pending.id } });
        throw new HttpError(429, 'Too many incorrect attempts. Request a new code.');
    }
    if (!isVerificationCodeValid(user.id, input.otp, pending.otpHash)) {
        const nextAttempts = pending.attempts + 1;
        await prisma.customerEmailVerification.updateMany({
            where: { id: pending.id, attempts: pending.attempts },
            data: { attempts: { increment: 1 } },
        });
        if (nextAttempts >= MAX_VERIFICATION_ATTEMPTS) {
            await prisma.customerEmailVerification.deleteMany({ where: { id: pending.id } });
            throw new HttpError(429, 'Too many incorrect attempts. Request a new code.');
        }
        throw new HttpError(400, 'The verification code is incorrect.');
    }
    await prisma.$transaction(async (transaction) => {
        const updated = await transaction.user.updateMany({
            where: { id: user.id, emailVerified: false },
            data: { emailVerified: true },
        });
        if (updated.count !== 1) {
            throw new HttpError(400, 'This email is already verified. You can sign in.');
        }
        await transaction.customerEmailVerification.deleteMany({ where: { id: pending.id } });
    });
    return { email: user.email };
}
export async function resendCustomerVerificationEmail(input) {
    const genericResult = {
        email: input.email,
        verificationExpiresInSeconds: VERIFICATION_TTL_MS / 1000,
    };
    const user = await prisma.user.findUnique({
        where: { email: input.email },
        select: { id: true, email: true, role: true, emailVerified: true },
    });
    if (!user || user.role !== UserRole.CUSTOMER || user.emailVerified) {
        return genericResult;
    }
    const now = new Date();
    const pending = await prisma.customerEmailVerification.findUnique({ where: { userId: user.id } });
    if (pending && now.getTime() - pending.createdAt.getTime() < VERIFICATION_RESEND_COOLDOWN_MS) {
        throw new HttpError(429, 'Please wait before requesting another verification code.');
    }
    const requestWindowIsActive = pending && now.getTime() - pending.requestWindowStart.getTime() < VERIFICATION_RESEND_WINDOW_MS;
    if (requestWindowIsActive && pending.requestCount >= MAX_VERIFICATION_RESENDS_PER_WINDOW) {
        throw new HttpError(429, 'Too many verification emails requested. Please try again later.');
    }
    const code = generateVerificationCode();
    const requestWindowStart = requestWindowIsActive ? pending.requestWindowStart : now;
    const requestCount = requestWindowIsActive ? (pending?.requestCount ?? 0) + 1 : 1;
    const replacement = {
        otpHash: hashVerificationCode(user.id, code),
        expiresAt: new Date(now.getTime() + VERIFICATION_TTL_MS),
        attempts: 0,
        requestCount,
        requestWindowStart,
        createdAt: now,
    };
    const saved = await prisma.customerEmailVerification.upsert({
        where: { userId: user.id },
        create: { userId: user.id, ...replacement },
        update: replacement,
    });
    try {
        await sendCustomerVerificationEmail({ recipient: user.email, code });
    }
    catch (error) {
        try {
            if (pending) {
                await prisma.customerEmailVerification.updateMany({
                    where: { id: saved.id, createdAt: now },
                    data: {
                        otpHash: pending.otpHash,
                        expiresAt: pending.expiresAt,
                        attempts: pending.attempts,
                        requestCount: pending.requestCount,
                        requestWindowStart: pending.requestWindowStart,
                        createdAt: pending.createdAt,
                    },
                });
            }
            else {
                await prisma.customerEmailVerification.deleteMany({
                    where: { id: saved.id, createdAt: now },
                });
            }
        }
        catch (rollbackError) {
            console.error(JSON.stringify({
                event: 'email_verification_resend_rollback_failed',
                recipientDomain: getEmailDomain(user.email),
                errorName: rollbackError instanceof Error ? rollbackError.name : 'UnknownError',
            }));
        }
        logVerificationEvent('email_verification_resend_failed', user.email);
        throw getEmailDeliveryError(error);
    }
    logVerificationEvent('email_verification_resend_sent', user.email);
    return { ...genericResult, email: user.email };
}
export async function getAuthenticatedUser(token) {
    if (!token)
        return null;
    const session = await prisma.adminSession.findUnique({
        where: { tokenHash: hashSessionToken(token) },
        include: { user: true },
    });
    if (!session || session.revokedAt || session.expiresAt <= new Date())
        return null;
    return toUser(session.user);
}
export async function revokeSession(token) {
    if (!token)
        return;
    await prisma.adminSession.updateMany({
        where: { tokenHash: hashSessionToken(token), revokedAt: null },
        data: { revokedAt: new Date() },
    });
}
export const getCustomerSessionToken = (cookieHeader) => readCookie(cookieHeader, CUSTOMER_SESSION_COOKIE_NAME);
export async function getAuthenticatedCustomer(token) {
    if (!token)
        return null;
    const session = await prisma.customerSession.findUnique({
        where: { tokenHash: hashSessionToken(token) },
        include: { user: true },
    });
    if (!session || session.revokedAt || session.expiresAt <= new Date() || session.user.role !== UserRole.CUSTOMER)
        return null;
    return toUser(session.user);
}
export async function revokeCustomerSession(token) {
    if (!token)
        return;
    await prisma.customerSession.updateMany({
        where: { tokenHash: hashSessionToken(token), revokedAt: null },
        data: { revokedAt: new Date() },
    });
}
export const isGoogleOAuthConfigured = Boolean(env.googleOAuth.clientId && env.googleOAuth.clientSecret && env.googleOAuth.redirectUri);
export async function createInitialAdmin(input) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (!existing) {
        await prisma.user.create({
            data: {
                name: input.name,
                email: input.email,
                passwordHash: await hashPassword(input.password),
                role: UserRole.ADMIN,
            },
        });
        return 'created';
    }
    if (!input.forceReset)
        return 'exists';
    await prisma.user.update({
        where: { id: existing.id },
        data: {
            name: input.name,
            passwordHash: await hashPassword(input.password),
            role: UserRole.ADMIN,
        },
    });
    await prisma.adminSession.updateMany({
        where: { userId: existing.id, revokedAt: null },
        data: { revokedAt: new Date() },
    });
    return 'updated';
}
