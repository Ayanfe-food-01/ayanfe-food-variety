import { env } from '../../config/env.js';
export class EmailServiceError extends Error {
    reason;
    providerStatus;
    constructor(reason, message, providerStatus) {
        super(message);
        this.reason = reason;
        this.providerStatus = providerStatus;
        this.name = 'EmailServiceError';
    }
}
export const escapeHtml = (value) => value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
})[character] ?? character);
const getRecipientDomain = (recipient) => recipient.split('@')[1]?.toLowerCase() || 'unknown';
const getRecipientDomains = (recipients) => (Array.isArray(recipients) ? recipients : [recipients]).map(getRecipientDomain);
const getLogoUrl = () => {
    if (!env.publicAppUrl)
        return null;
    try {
        const appUrl = new URL(env.publicAppUrl);
        if (!['http:', 'https:'].includes(appUrl.protocol))
            return null;
        if (['localhost', '127.0.0.1', '::1'].includes(appUrl.hostname))
            return null;
        return new URL('/branding/ayanfe-food-variety-logo.png', appUrl).toString();
    }
    catch {
        return null;
    }
};
const getContactLine = () => env.email.businessEmail
    ? `Questions? Contact ${escapeHtml(env.email.businessEmail)}.`
    : 'Questions? Reply to this email and our team will help.';
export function renderBrandedEmail(input) {
    const logoUrl = getLogoUrl();
    const logo = logoUrl
        ? `<img src="${escapeHtml(logoUrl)}" alt="Ayanfe Food Variety" width="112" style="display:block;width:112px;height:auto;max-height:112px;object-fit:contain;margin:0 auto 18px;">`
        : '';
    const preheader = input.preheader ? escapeHtml(input.preheader) : '';
    const footerNote = input.footerNote
        ? `<p style="margin:0 0 8px;color:#66756b;font-size:12px;line-height:1.6;">${escapeHtml(input.footerNote)}</p>`
        : '';
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escapeHtml(input.title)} — Ayanfe Food Variety</title>
    <style>
      @media only screen and (max-width:620px) {
        .email-shell { width:100% !important; }
        .email-card { border-radius:0 !important; }
        .email-content { padding:30px 22px !important; }
        .email-title { font-size:28px !important; }
        .email-table { font-size:13px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#f5f7f1;color:#173b2b;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f5f7f1;">
      <tr>
        <td align="center" style="padding:28px 12px;">
          <table role="presentation" class="email-shell" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;">
            <tr>
              <td align="center" style="padding:8px 20px 20px;color:#285b37;font-size:13px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;">
                Ayanfe Food Variety
              </td>
            </tr>
            <tr>
              <td class="email-card email-content" style="padding:42px 44px;background:#ffffff;border:1px solid #dfe7dc;border-radius:22px;box-shadow:0 8px 24px rgba(23,59,43,.06);">
                <div style="text-align:center;">${logo}</div>
                <p style="margin:0 0 10px;color:#c66b2f;font-size:11px;font-weight:bold;letter-spacing:2px;text-align:center;text-transform:uppercase;">Ayanfe Food Variety</p>
                <h1 class="email-title" style="margin:0 0 18px;color:#173b2b;font-size:34px;line-height:1.15;letter-spacing:-.7px;text-align:center;">${escapeHtml(input.title)}</h1>
                ${input.intro ? `<p style="margin:0 0 26px;color:#58695e;font-size:15px;line-height:1.75;">${input.intro}</p>` : ''}
                ${input.contentHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:22px 20px 4px;text-align:center;">
                ${footerNote}
                <p style="margin:0;color:#7a887f;font-size:12px;line-height:1.6;">${getContactLine()}</p>
                <p style="margin:8px 0 0;color:#9aa59d;font-size:11px;line-height:1.6;">© ${new Date().getUTCFullYear()} Ayanfe Food Variety. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
/**
 * Builds an absolute URL inside the public app, or null when the public app
 * URL is not configured. Shared by every notification email so links always
 * point at the app rather than at API internals.
 */
export function getAppLink(path) {
    if (!env.publicAppUrl)
        return null;
    try {
        const baseUrl = new URL(env.publicAppUrl);
        if (!['http:', 'https:'].includes(baseUrl.protocol))
            return null;
        return new URL(path.replace(/^\/+/, ''), `${baseUrl.toString().replace(/\/+$/, '')}/`).toString();
    }
    catch {
        return null;
    }
}
export function assertEmailConfigured() {
    if (!env.email.resendApiKey?.trim()) {
        throw new EmailServiceError('configuration', 'RESEND_API_KEY is not configured on the server.');
    }
    if (!env.email.from?.trim()) {
        throw new EmailServiceError('configuration', 'EMAIL_FROM is not configured on the server.');
    }
}
export async function sendEmail(message) {
    assertEmailConfigured();
    const recipients = Array.isArray(message.to) ? message.to : [message.to];
    console.info(JSON.stringify({
        event: 'email_provider_request_started',
        provider: 'resend',
        recipientDomains: getRecipientDomains(message.to),
        subject: message.subject,
    }));
    let response;
    try {
        response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${env.email.resendApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: env.email.from,
                to: recipients,
                subject: message.subject,
                html: message.html,
                ...(message.text ? { text: message.text } : {}),
            }),
        });
    }
    catch (error) {
        console.error(JSON.stringify({
            event: 'email_provider_request_failed',
            provider: 'resend',
            reason: 'network',
            recipientDomains: getRecipientDomains(message.to),
            errorName: error instanceof Error ? error.name : 'UnknownError',
        }));
        throw new EmailServiceError('network', 'The email provider could not be reached.');
    }
    console.info(JSON.stringify({
        event: 'email_provider_response',
        provider: 'resend',
        status: response.status,
        accepted: response.ok,
        recipientDomains: getRecipientDomains(message.to),
    }));
    if (!response.ok) {
        throw new EmailServiceError('provider', `Email provider returned ${response.status}.`, response.status);
    }
}
