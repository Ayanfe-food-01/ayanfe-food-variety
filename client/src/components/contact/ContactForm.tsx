import { useRef, useState } from 'react'
import { createContactMessage, type CreateContactMessageInput } from '../../services/contactService'
import { ApiError } from '../../services/api'
import { useCustomerAuth } from '../../hooks/useCustomerAuth'
import { ContactField, ContactTextarea } from './ContactFormField'
import { ContactFormSuccess } from './ContactFormSuccess'

const MAX_SUBJECT_LENGTH = 180
const MAX_MESSAGE_LENGTH = 2000
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const makeRequestKey = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `cm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

interface ContactFormState {
  name: string
  email: string
  subject: string
  message: string
}

type ContactFormFieldName = keyof ContactFormState
type ContactFormErrors = Partial<Record<ContactFormFieldName, string>>

const initialForm = (userName: string, userEmail: string): ContactFormState => ({
  name: userName,
  email: userEmail,
  subject: '',
  message: '',
})

const validateField = (name: ContactFormFieldName, value: string, errors: ContactFormErrors): void => {
  switch (name) {
    case 'name':
      if (!value.trim()) errors.name = 'Please tell us your name.'
      else if (value.trim().length > 180) errors.name = 'Name must be 180 characters or fewer.'
      break
    case 'email':
      if (!value.trim()) errors.email = 'Email is required.'
      else if (!EMAIL_PATTERN.test(value.trim())) errors.email = 'Enter a valid email address.'
      break
    case 'subject':
      if (value.trim().length > MAX_SUBJECT_LENGTH) errors.subject = `Subject must be ${MAX_SUBJECT_LENGTH} characters or fewer.`
      break
    case 'message':
      if (!value.trim()) errors.message = 'Please write a short message.'
      else if (value.trim().length > MAX_MESSAGE_LENGTH) errors.message = `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`
      break
  }
}

export function ContactForm() {
  const { user } = useCustomerAuth()
  const [form, setForm] = useState<ContactFormState>(() => initialForm(user?.name ?? '', user?.email ?? ''))
  const [errors, setErrors] = useState<ContactFormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const requestKeyRef = useRef(makeRequestKey())

  const updateField = (name: ContactFormFieldName, value: string) => {
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => {
      const next = { ...current }
      validateField(name, value, next)
      return next
    })
    setSubmitError(null)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    const nextErrors: ContactFormErrors = {}
    ;(Object.keys(form) as ContactFormFieldName[]).forEach((name) => validateField(name, form[name], nextErrors))
    setErrors(nextErrors)
    setSubmitError(null)

    if (Object.keys(nextErrors).length > 0) return

    const input: CreateContactMessageInput = {
      requestKey: requestKeyRef.current,
      name: form.name.trim(),
      email: form.email.trim(),
      subject: form.subject.trim(),
      message: form.message.trim(),
    }

    setIsSending(true)
    try {
      await createContactMessage(input)
      setSubmitted(true)
    } catch (caught) {
      setSubmitError(caught instanceof ApiError ? caught.message : 'Your message could not be sent. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  const handleReset = () => {
    requestKeyRef.current = makeRequestKey()
    setForm(initialForm('', ''))
    setErrors({})
    setSubmitError(null)
    setSubmitted(false)
  }

  if (submitted) {
    return <ContactFormSuccess onReset={handleReset} />
  }

  return (
    <section className="rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8" aria-labelledby="contact-form-heading">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange">Send a message</p>
      <h2 id="contact-form-heading" className="mt-2 text-2xl font-bold tracking-[-0.03em] text-green-dark sm:text-3xl">
        How can we help?
      </h2>
      <p className="mt-3 text-sm leading-6 text-muted">
        Fill in the form below and our team will reply to your email address.
      </p>

      <form className="mt-7 space-y-5" onSubmit={handleSubmit} noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <ContactField
            name="name"
            label="Your name"
            required
            autoComplete="name"
            value={form.name}
            error={errors.name}
            onChange={(event) => updateField('name', event.target.value)}
          />
          <ContactField
            name="email"
            label="Email address"
            type="email"
            required
            autoComplete="email"
            value={form.email}
            error={errors.email}
            onChange={(event) => updateField('email', event.target.value)}
          />
        </div>

        <ContactField
          name="subject"
          label="Subject"
          placeholder="What is your message about? (optional)"
          value={form.subject}
          error={errors.subject}
          onChange={(event) => updateField('subject', event.target.value)}
        />

        <ContactTextarea
          name="message"
          label="Message"
          required
          rows={6}
          placeholder="How can we help? Include any order number if you have one."
          value={form.message}
          error={errors.message}
          onChange={(event) => updateField('message', event.target.value)}
        />

        {submitError && (
          <p className="rounded-xl border border-orange/25 bg-orange/5 p-3 text-sm font-semibold text-orange" role="alert">
            {submitError}
          </p>
        )}

        <button
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green py-3.5 text-sm font-bold text-cream shadow-lg shadow-green/15 transition-all duration-200 hover:-translate-y-0.5 hover:bg-green-dark focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0"
          type="submit"
          disabled={isSending}
        >
          {isSending ? 'Sending…' : 'Send message'}
        </button>
      </form>
    </section>
  )
}