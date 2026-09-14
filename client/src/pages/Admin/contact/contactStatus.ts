import type { ContactMessageStatus } from '../../../services/contactService'

export const CONTACT_STATUSES: ContactMessageStatus[] = ['NEW', 'RESOLVED']

export const formatContactStatus = (status: ContactMessageStatus): string =>
  status === 'RESOLVED' ? 'Resolved' : 'New'

export const contactStatusClass = (status: ContactMessageStatus): string =>
  status === 'NEW' ? 'bg-orange/10 text-orange' : 'bg-sage text-green-dark'