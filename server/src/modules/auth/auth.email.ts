import { env } from '../../config/env.js'

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

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[character] ?? character)

const getRecipientDomain = (recipient: string): string =>
  recipient.split('@')[1]?.toLowerCase() || 'unknown'

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
  console.info(JSON.stringify({
    event: 'email_provider_request_started',
    provider: 'resend',
    recipientDomain: getRecipientDomain(input.recipient),
  }))

  let response: Response
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.email.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.email.from,
        to: [input.recipient],
        subject: 'Verify your email — Ayanfe Food Variety',
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6;color:#173b2b;max-width:560px">
            <h1 style="color:#1f6b45">Ayanfe Food Variety</h1>
            <p>Use the code below to verify your email address and finish creating your customer account.</p>
            <p style="font-size:32px;letter-spacing:8px;font-weight:700;color:#173b2b">${safeCode}</p>
            <p>This code expires in <strong>10 minutes</strong>.</p>
            <p style="color:#6b7280">For your security, never share this code with anyone. If you did not request an account, you can safely ignore this email.</p>
          </div>
        `,
        text: `Ayanfe Food Variety email verification\n\nYour 6-digit verification code is: ${input.code}\n\nThis code expires in 10 minutes. Never share this code with anyone.`,
      }),
    })
  } catch (error: unknown) {
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

  console.info(JSON.stringify({
    event: 'email_provider_response',
    provider: 'resend',
    status: response.status,
    accepted: response.ok,
  }))

  if (!response.ok) {
    throw new VerificationEmailError(
      'provider',
      `Verification email provider returned ${response.status}.`,
      response.status,
    )
  }
}