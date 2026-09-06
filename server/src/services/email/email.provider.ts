import { env } from '../../config/env.js'
import { EmailServiceError, type EmailMessage } from './email.template.js'

const getRecipientDomain = (recipient: string): string =>
  recipient.split('@')[1]?.toLowerCase() || 'unknown'

const getRecipientDomains = (recipients: string | string[]): string[] =>
  (Array.isArray(recipients) ? recipients : [recipients]).map(getRecipientDomain)

/**
 * Builds an absolute URL inside the public app, or null when the public app
 * URL is not configured. Shared by every notification email so links always
 * point at the app rather than at API internals.
 */
export function getAppLink(path: string): string | null {
  if (!env.publicAppUrl) return null
  try {
    const baseUrl = new URL(env.publicAppUrl)
    if (!['http:', 'https:'].includes(baseUrl.protocol)) return null
    return new URL(path.replace(/^\/+/, ''), `${baseUrl.toString().replace(/\/+$/, '')}/`).toString()
  } catch {
    return null
  }
}

export function assertEmailConfigured(): void {
  if (!env.email.resendApiKey?.trim()) {
    throw new EmailServiceError('configuration', 'RESEND_API_KEY is not configured on the server.')
  }
  if (!env.email.from?.trim()) {
    throw new EmailServiceError('configuration', 'EMAIL_FROM is not configured on the server.')
  }
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  assertEmailConfigured()

  const recipients = Array.isArray(message.to) ? message.to : [message.to]
  console.info(JSON.stringify({
    event: 'email_provider_request_started',
    provider: 'resend',
    recipientDomains: getRecipientDomains(message.to),
    subject: message.subject,
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
        to: recipients,
        subject: message.subject,
        html: message.html,
        ...(message.text ? { text: message.text } : {}),
      }),
    })
  } catch (error: unknown) {
    console.error(JSON.stringify({
      event: 'email_provider_request_failed',
      provider: 'resend',
      reason: 'network',
      recipientDomains: getRecipientDomains(message.to),
      errorName: error instanceof Error ? error.name : 'UnknownError',
    }))
    throw new EmailServiceError('network', 'The email provider could not be reached.')
  }

  console.info(JSON.stringify({
    event: 'email_provider_response',
    provider: 'resend',
    status: response.status,
    accepted: response.ok,
    recipientDomains: getRecipientDomains(message.to),
  }))

  if (!response.ok) {
    throw new EmailServiceError(
      'provider',
      `Email provider returned ${response.status}.`,
      response.status,
    )
  }
}