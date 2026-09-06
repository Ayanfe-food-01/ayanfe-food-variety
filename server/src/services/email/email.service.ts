export {
  EmailServiceError,
  escapeHtml,
  renderBrandedEmail,
} from './email.template.js'
export type {
  EmailFailureReason,
  EmailMessage,
  BrandedEmailInput,
} from './email.template.js'
export { assertEmailConfigured, getAppLink, sendEmail } from './email.provider.js'