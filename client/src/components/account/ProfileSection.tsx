import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../services/api'
import {
  updateCustomerAccountProfileService,
  type CustomerAccountProfile,
} from '../../services/customerAccountService'
import { isValidE164PhoneNumber } from '../../utils/phone'
import { useToast } from '../ui/Toast'
import { PhoneInputField } from '../ui/PhoneInput'
import {
  accountCardClassName,
  accountFieldErrorClassName,
  accountFieldLabelClassName,
  accountInputClassName,
  accountSectionDescriptionClassName,
  accountSectionHeadingClassName,
} from './accountStyles'

interface ProfileSectionProps {
  profile: CustomerAccountProfile
  onProfileUpdated: (profile: CustomerAccountProfile) => void
}

interface ProfileErrors {
  name?: string
  phone?: string
}

export function ProfileSection({ profile, onProfileUpdated }: ProfileSectionProps) {
  const { showToast } = useToast()
  const [name, setName] = useState(profile.name)
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [errors, setErrors] = useState<ProfileErrors>({})
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  const validate = (): boolean => {
    const next: ProfileErrors = {}
    if (!name.trim()) next.name = 'Please enter your full name.'
    else if (name.trim().length > 120) next.name = 'Your name must be 120 characters or fewer.'
    if (phone.trim() && !isValidE164PhoneNumber(phone)) {
      next.phone = 'Please enter a valid phone number.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      const updated = await updateCustomerAccountProfileService({
        name: name.trim(),
        phone: phone.trim() || null,
      })
      onProfileUpdated(updated)
      setSavedAt(Date.now())
      showToast('Your profile has been updated.', 'success')
    } catch (caught) {
      showToast(
        caught instanceof ApiError ? caught.message : 'Your profile could not be saved. Please try again.',
        'error',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className={accountCardClassName}>
      <h2 className={accountSectionHeadingClassName}>Profile</h2>
      <p className={accountSectionDescriptionClassName}>
        Personal information Ayanfe Food Variety uses to reach you.
      </p>

      <form className="mt-8" onSubmit={handleSubmit} noValidate>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className={accountFieldLabelClassName} htmlFor="account-full-name">
              Full name <span className="text-orange" aria-hidden="true">*</span>
            </label>
            <input
              className={accountInputClassName(Boolean(errors.name))}
              id="account-full-name"
              name="fullName"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'account-name-error' : undefined}
              required
            />
            {errors.name && (
              <p className={accountFieldErrorClassName} id="account-name-error" role="alert">{errors.name}</p>
            )}
          </div>

          <div>
            <label className={accountFieldLabelClassName} htmlFor="account-email">
              Email address
            </label>
            <div className="mt-2">
              <input
                className={`${accountInputClassName(false)} bg-cream/60 text-muted`}
                id="account-email"
                name="email"
                type="email"
                autoComplete="email"
                value={profile.email}
                readOnly
                disabled
              />
            </div>
            <p className="mt-2 text-xs text-muted">
              Your email on this account. Contact us to change it.
            </p>
          </div>
        </div>

        <div className="mt-6 max-w-sm">
          <label className={accountFieldLabelClassName} htmlFor="account-phone">
            Phone number <span className="font-normal text-muted">(optional)</span>
          </label>
          <div className="mt-2">
            <PhoneInputField
              id="account-phone"
              name="phone"
              value={phone}
              hasError={Boolean(errors.phone)}
              onChange={setPhone}
              aria-describedby={errors.phone ? 'account-phone-error' : undefined}
            />
          </div>
          {errors.phone && (
            <p className={accountFieldErrorClassName} id="account-phone-error" role="alert">{errors.phone}</p>
          )}
        </div>

        {!profile.emailVerified && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-orange/25 bg-orange/5 px-4 py-3 text-sm text-orange">
            <p className="m-0">Your email is not verified yet.</p>
            <Link className="font-bold underline" to="/verify-email" state={{ email: profile.email }}>
              Verify your email
            </Link>
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <button
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-green px-6 py-3 text-sm font-bold text-cream transition-colors hover:bg-green-dark disabled:cursor-not-allowed disabled:opacity-50"
            type="submit"
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {!saving && savedAt && (
            <p className="text-sm font-semibold text-green" role="status" aria-live="polite">
              Saved just now.
            </p>
          )}
        </div>
      </form>
    </section>
  )
}