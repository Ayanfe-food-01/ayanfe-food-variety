import type { ContactMessage as ContactMessageRow } from '@prisma/client'
import {
  escapeHtml,
  getAppLink,
  renderBrandedEmail,
  sendEmail,
  type EmailMessage,
} from '../../services/email/email.service.js'

/**
 * Branded email to the store owner summarizing a new contact form submission.
 * Internal only — never sent to the customer who submitted the form.
 */
export const contactMessageReceivedMessage = (message: ContactMessageRow, businessName: string): EmailMessage => {
  const inboxLink = getAppLink('/admin/contact')
  const messageText = message.message.replace(/\r?\n/g, '\n')
  return {
    to: '',
    subject: `New contact message from ${escapeHtml(message.name)}`,
    html: renderBrandedEmail({
      title: 'New contact message',
      preheader: `${escapeHtml(message.name)} (${escapeHtml(message.email)}) sent a message through the contact page.`,
      intro: `${escapeHtml(businessName)} received a new message through the website contact page.`,
      contentHtml: `
        <table role="presentation" class="email-table" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin:24px 0;border-collapse:collapse;color:#173b2b;font-size:14px;">
          <tr>
            <td style="padding:0 0 10px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#66756b;">From</td>
            <td align="right" style="padding:0 0 10px;color:#173b2b;font-weight:bold;">${escapeHtml(message.name)} · ${escapeHtml(message.email)}</td>
          </tr>
          <tr style="border-top:1px solid #edf1eb;">
            <td style="padding:12px 0;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#66756b;">Subject</td>
            <td align="right" style="padding:12px 0;color:#173b2b;font-weight:bold;">${message.subject ? escapeHtml(message.subject) : '<span style="color:#94a19a;">No subject</span>'}</td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f5f7f1;border:1px solid #dfe7dc;border-radius:14px;margin:0 0 18px;color:#58695e;font-size:14px;">
          <tr><td style="padding:16px 18px;line-height:1.7;white-space:pre-wrap;">${escapeHtml(messageText)}</td></tr>
        </table>
        ${inboxLink ? `<p style="margin:28px 0 0;text-align:center;"><a href="${escapeHtml(inboxLink)}" style="display:inline-block;padding:13px 20px;border-radius:999px;background:#285b37;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;">Open contact inbox</a></p>` : ''}
      `,
      footerNote: 'Reply to the customer directly from your email client.',
    }),
    text: [
      'Ayanfe Food Variety — new contact message',
      `From: ${message.name} (${message.email})`,
      `Subject: ${message.subject || '(no subject)'}`,
      '',
      'Message:',
      messageText,
      '',
      inboxLink ? `Open the inbox: ${inboxLink}` : '',
    ].filter(Boolean).join('\n'),
  }
}

/**
 * Sends the owner notification for a new contact message. Failures are logged
 * and never bubble up, so a notification problem can never roll back a stored
 * message. When the store has no business email set, the notification is
 * skipped entirely.
 */
export async function notifyContactMessageReceived(
  message: ContactMessageRow,
  businessName: string,
  recipient: string | null,
): Promise<void> {
  if (!recipient?.trim()) {
    console.info(JSON.stringify({
      event: 'contact_message_email_skipped',
      reason: 'no_recipient',
      messageId: message.id,
    }))
    return
  }
  try {
    await sendEmail({
      ...contactMessageReceivedMessage(message, businessName),
      to: recipient.trim(),
    })
  } catch (error: unknown) {
    console.error(JSON.stringify({
      event: 'contact_message_email_failed',
      audience: 'admin',
      messageId: message.id,
      reason: error instanceof Error ? error.message : 'UnknownError',
      errorName: error instanceof Error ? error.name : 'UnknownError',
    }))
  }
}