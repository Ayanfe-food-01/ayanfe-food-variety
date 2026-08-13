import { env } from '../../config/env.js';
import { EmailServiceError, escapeHtml, renderBrandedEmail, sendEmail, } from '../../lib/email/email.service.js';
export class VerificationEmailError extends Error {
    reason;
    providerStatus;
    constructor(reason, message, providerStatus) {
        super(message);
        this.reason = reason;
        this.providerStatus = providerStatus;
        this.name = 'VerificationEmailError';
    }
}
export function assertVerificationEmailConfigured() {
    if (!env.email.resendApiKey?.trim()) {
        throw new VerificationEmailError('configuration', 'RESEND_API_KEY is not configured on the server.');
    }
    if (!env.email.from?.trim()) {
        throw new VerificationEmailError('configuration', 'EMAIL_FROM is not configured on the server.');
    }
}
export async function sendCustomerVerificationEmail(input) {
    assertVerificationEmailConfigured();
    const safeCode = escapeHtml(input.code);
    try {
        await sendEmail({
            to: input.recipient,
            subject: 'Verify your email — Ayanfe Food Variety',
            html: renderBrandedEmail({
                title: 'Verify your email',
                preheader: 'Your Ayanfe Food Variety verification code',
                intro: 'Use the code below to verify your email address and finish creating your customer account.',
                contentHtml: `
          <div style="margin:0 0 24px;padding:18px;border-radius:14px;background:#f5f7f1;text-align:center;">
            <p style="margin:0;color:#173b2b;font-size:32px;letter-spacing:8px;font-weight:700;">${safeCode}</p>
          </div>
          <p style="margin:0 0 14px;color:#58695e;font-size:14px;line-height:1.7;">This code expires in <strong style="color:#173b2b;">10 minutes</strong>.</p>
          <p style="margin:0;color:#66756b;font-size:13px;line-height:1.7;">For your security, never share this code with anyone. If you did not request an account, you can safely ignore this email.</p>
        `,
            }),
            text: `Ayanfe Food Variety email verification\n\nYour 6-digit verification code is: ${input.code}\n\nThis code expires in 10 minutes. Never share this code with anyone.`,
        });
    }
    catch (error) {
        if (error instanceof EmailServiceError) {
            throw new VerificationEmailError(error.reason, error.message, error.providerStatus);
        }
        console.error(JSON.stringify({
            event: 'email_provider_request_failed',
            provider: 'resend',
            reason: 'network',
            errorName: error instanceof Error ? error.name : 'UnknownError',
        }));
        throw new VerificationEmailError('network', 'The email provider could not be reached.');
    }
}
