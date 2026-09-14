import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { MailIcon, PencilIcon, PhoneIcon } from '../../assets/icons'
import { Modal } from '../ui/Modal'
import { useToast } from '../ui/Toast'
import {
  updateCustomerAccountProfileService,
  type CustomerAccountProfile,
} from '../../services/customerAccountService'
import { isValidE164PhoneNumber } from '../../utils/phone'
import { PhoneInputField } from '../ui/PhoneInput'
import { accountInputClassName, accountFieldErrorClassName } from './accountStyles'
import { AccountCard } from './AccountCard'

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'C'
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

interface PersonalInformationCardProps {
  profile: CustomerAccountProfile
  onProfileUpdated: (profile: CustomerAccountProfile) => void
}

export function PersonalInformationCard({ profile, onProfileUpdated }: PersonalInformationCardProps) {
  const { showToast } = useToast()
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [editName, setEditName] = useState(profile.name)
  const [editPhone, setEditPhone] = useState(profile.phone ?? '')
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({})
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const openEdit = () => {
    setEditName(profile.name)
    setEditPhone(profile.phone ?? '')
    setErrors({})
    setServerError(null)
    setIsEditingProfile(true)
  }

  const closeEdit = () => {
    setIsEditingProfile(false)
    setErrors({})
    setServerError(null)
  }

  const validate = () => {
    const next: typeof errors = {}
    if (!editName.trim()) next.name = 'Please enter your full name.'
    else if (editName.trim().length > 120) next.name = 'Your name must be 120 characters or fewer.'
    if (editPhone && !isValidE164PhoneNumber(editPhone)) next.phone = 'Please enter a valid phone number.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!validate()) return
    setSaving(true)
    setServerError(null)
    try {
      const updated = await updateCustomerAccountProfileService({ name: editName.trim(), phone: editPhone || null })
      onProfileUpdated(updated)
      setIsEditingProfile(false)
      showToast('Your profile has been updated.', 'success')
    } catch (caught) {
      setServerError(caught instanceof Error ? caught.message : 'Your profile could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  const createdAtYear = new Date(profile.createdAt).getFullYear()

  const header = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-xl font-bold text-green-dark">Personal Information</h2>
        <p className="mt-1 text-sm text-muted">Update your details to keep your account secure and up to date.</p>
      </div>
      <button
        className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-bold text-green-dark transition-colors hover:bg-cream sm:px-4"
        type="button"
        onClick={openEdit}
        aria-label="Edit profile"
      >
        <PencilIcon size={16} /> <span className="hidden sm:inline">Edit Profile</span>
      </button>
    </div>
  )

  return (
    <AccountCard header={header}>
      <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="flex items-center gap-4 sm:w-1/3">
          <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-sage text-lg font-bold text-green">
            {initialsOf(profile.name)}
          </span>
          <div>
            <p className="font-bold text-green-dark">{profile.name}</p>
            <p className="mt-0.5 text-xs text-muted">Customer since {createdAtYear}</p>
          </div>
        </div>

        <div className="flex-1 space-y-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-muted">
              <MailIcon size={18} />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Email Address</p>
              <div className="mt-0.5 text-sm text-green-dark">
                {profile.emailVerified ? (
                  profile.email
                ) : (
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    {profile.email}
                    <Link className="font-bold text-orange underline" to="/verify-email" state={{ email: profile.email }}>
                      Verify your email
                    </Link>
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-muted">
              <PhoneIcon size={18} />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Phone Number</p>
              <p className="mt-0.5 text-sm text-green-dark">
                {profile.phone || <span className="text-muted">Not added</span>}
              </p>
            </div>
          </div>
        </div>

        <div className="shrink-0">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Account Status</p>
          <span className="mt-2 inline-block rounded-full bg-green px-3 py-1 text-xs font-bold text-cream">Active</span>
        </div>
      </div>

      {isEditingProfile && (
        <Modal
          title="Edit profile"
          onClose={closeEdit}
          footer={
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                className="rounded-xl border border-line px-5 py-3 text-sm font-bold text-green-dark hover:bg-cream disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                disabled={saving}
                onClick={closeEdit}
              >
                Cancel
              </button>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-green px-6 py-3 text-sm font-bold text-cream transition-colors hover:bg-green-dark disabled:cursor-not-allowed disabled:opacity-50"
                type="submit"
                form="profile-edit-form"
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          }
        >
          <form id="profile-edit-form" className="space-y-5" onSubmit={handleSubmit} noValidate>
            {serverError && (
              <div className="rounded-xl border border-orange/25 bg-orange/5 px-4 py-3 text-sm text-orange" role="alert">
                {serverError}
              </div>
            )}
            <div>
              <label className="text-sm font-bold text-green-dark" htmlFor="profile-edit-name">
                Full name
              </label>
              <input
                className={accountInputClassName(Boolean(errors.name))}
                id="profile-edit-name"
                name="name"
                type="text"
                autoComplete="name"
                value={editName}
                onChange={(event) => {
                  setEditName(event.target.value)
                  setErrors((prev) => ({ ...prev, name: undefined }))
                }}
                required
              />
              {errors.name && (
                <p className={accountFieldErrorClassName} role="alert">
                  {errors.name}
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-bold text-green-dark" htmlFor="profile-edit-phone">
                Phone number
              </label>
              <PhoneInputField
                id="profile-edit-phone"
                name="phone"
                value={editPhone}
                hasError={Boolean(errors.phone)}
                onChange={(value) => {
                  setEditPhone(value)
                  setErrors((prev) => ({ ...prev, phone: undefined }))
                }}
              />
              {errors.phone && (
                <p className={accountFieldErrorClassName} role="alert">
                  {errors.phone}
                </p>
              )}
            </div>
          </form>
        </Modal>
      )}
    </AccountCard>
  )
}