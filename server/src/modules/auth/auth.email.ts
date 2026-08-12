import { env } from '../../config/env.js'

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[character] ?? character)

export async function sendCustomerVerificationEmail(input: {
  recipient: string
  code: string
}): Promise<void> {
  if (!env.email.resendApiKey || !env.email.from) {
    throw new Error('Verification email delivery is not configured.')
  }

  const safeCode = escapeHtml(input.code)
  const response = await fetch('https://api.resend.com/emails', {
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

  if (!response.ok) {
    throw new Error(`Verification email provider returned ${response.status}.`)
  }
}