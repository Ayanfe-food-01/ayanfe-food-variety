import { env } from '../../config/env.js'
import {
  assertEmailConfigured,
  EmailServiceError,
  escapeHtml,
  renderBrandedEmail,
  sendEmail,
} from '../../lib/email/email.service.js'

type VerificationEmailFailureReason = 'configuration' | 'provider' | 'network'

export class VerificationEmailError extends Error {
  constructor(
    public readonly reason: VerificationEmailFailureReason,
    message: string,
    public readonly providerStatus?: number,
  ) {
    super(message)
    this.name = 'VerificationEmailError'
  }
}

export function assertVerificationEmailConfigured(): void {
  if (!env.email.resendApiKey?.trim()) {
    throw new VerificationEmailError(
      'configuration',
      'RESEND_API_KEY is not configured on the server.',
    )
  }

  if (!env.email.from?.trim()) {
    throw new VerificationEmailError(
      'configuration',
      'EMAIL_FROM is not configured on the server.',
    )
  }
}

export async function sendCustomerVerificationEmail(input: {
  recipient: string
  code: string
}): Promise<void> {
  assertVerificationEmailConfigured()

  const safeCode = escapeHtml(input.code)
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
    })
  } catch (error: unknown) {
    if (error instanceof EmailServiceError) {
      throw new VerificationEmailError(error.reason, error.message, error.providerStatus)
    }
    console.error(JSON.stringify({
      event: 'email_provider_request_failed',
      provider: 'resend',
      reason: 'network',
      errorName: error instanceof Error ? error.name : 'UnknownError',
    }))
    throw new VerificationEmailError(
      'network',
      'The email provider could not be reached.',
    )
  }
}

type PasswordResetEmailFailureReason = 'configuration' | 'provider' | 'network'

export class PasswordResetEmailError extends Error {
  constructor(
    public readonly reason: PasswordResetEmailFailureReason,
    message: string,
    public readonly providerStatus?: number,
  ) {
    super(message)
    this.name = 'PasswordResetEmailError'
  }
}

const getPasswordResetUrl = (token: string): string => {
  if (!env.publicAppUrl?.trim()) {
    throw new PasswordResetEmailError(
      'configuration',
      'PUBLIC_APP_URL is not configured on the server.',
    )
  }

  let appUrl: URL
  try {
    appUrl = new URL(env.publicAppUrl)
  } catch {
    throw new PasswordResetEmailError(
      'configuration',
      'PUBLIC_APP_URL is not a valid URL.',
    )
  }

  if (!['http:', 'https:'].includes(appUrl.protocol)) {
    throw new PasswordResetEmailError(
      'configuration',
      'PUBLIC_APP_URL must use HTTP or HTTPS.',
    )
  }

  const resetUrl = new URL('/reset-password', appUrl)
  resetUrl.searchParams.set('token', token)
  return resetUrl.toString()
}

export async function sendPasswordResetEmail(input: {
  recipient: string
  token: string
  expiresInMinutes: number
}): Promise<void> {
  try {
    assertEmailConfigured()
    const resetUrl = getPasswordResetUrl(input.token)
    const safeResetUrl = escapeHtml(resetUrl)

    await sendEmail({
      to: input.recipient,
      subject: 'Reset your password — Ayanfe Food Variety',
      html: renderBrandedEmail({
        title: 'Reset your password',
        preheader: 'Password reset instructions for your Ayanfe Food Variety account',
        intro: 'We received a request to reset the password for your Ayanfe Food Variety account.',
        contentHtml: `
          <div style="margin:0 0 24px;text-align:center;">
            <a href="${safeResetUrl}" style="display:inline-block;padding:14px 24px;border-radius:12px;background:#324f2d;color:#f8f8f3;font-size:14px;font-weight:700;text-decoration:none;">Reset your password</a>
          </div>
          <p style="margin:0 0 14px;color:#58695e;font-size:14px;line-height:1.7;">This link expires in <strong style="color:#173b2b;">${input.expiresInMinutes} minutes</strong> and can only be used once.</p>
          <p style="margin:0;color:#66756b;font-size:13px;line-height:1.7;">If you did not request a password reset, you can safely ignore this email. Your password will not change.</p>
        `,
      }),
      text: `Ayanfe Food Variety password reset\n\nReset your password: ${resetUrl}\n\nThis link expires in ${input.expiresInMinutes} minutes and can only be used once. If you did not request this, you can safely ignore this email.`,
    })
  } catch (error: unknown) {
    if (error instanceof PasswordResetEmailError) throw error
    if (error instanceof EmailServiceError) {
      throw new PasswordResetEmailError(error.reason, error.message, error.providerStatus)
    }
    console.error(JSON.stringify({
      event: 'password_reset_email_provider_request_failed',
      provider: 'resend',
      reason: 'network',
      errorName: error instanceof Error ? error.name : 'UnknownError',
    }))
    throw new PasswordResetEmailError(
      'network',
      'The email provider could not be reached.',
    )
  }
}