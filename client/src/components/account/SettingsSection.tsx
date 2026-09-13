import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { EyeIcon, EyeOffIcon, ShieldIcon, SettingsIcon } from '../../assets/icons'
import { ApiError } from '../../services/api'
import { changeCustomerAccountPassword, type CustomerAccountProfile } from '../../services/customerAccountService'
import type { ShoppingMode } from '../../services/authService'
import { useToast } from '../ui/Toast'
import {
  accountCardClassName,
  accountFieldErrorClassName,
  accountFieldLabelClassName,
  accountInputClassName,
  accountSectionDescriptionClassName,
  accountSectionHeadingClassName,
} from './accountStyles'

interface SettingsSectionProps {
  profile: CustomerAccountProfile
  shoppingMode: ShoppingMode
}

interface PasswordErrors {
  currentPassword?: string
  newPassword?: string
  confirmPassword?: string
  form?: string
}

const passwordFieldClassName = (hasError: boolean) =>
  `${accountInputClassName(hasError)} pr-12`

function PasswordVisibilityButton({
  visible,
  onToggle,
  label,
}: {
  visible: boolean
  onToggle: () => void
  label: string
}) {
  return (
    <button
      className="absolute right-3 top-[calc(0.75rem+2px)] grid place-items-center rounded-lg p-1.5 text-muted transition-colors hover:bg-sage/40 hover:text-green-dark focus:outline-none focus:ring-2 focus:ring-green/20"
      type="button"
      aria-label={visible ? `Hide ${label}` : `Show ${label}`}
      aria-pressed={visible}
      onClick={onToggle}
    >
      {visible ? <EyeOffIcon size={19} /> : <EyeIcon size={19} />}
    </button>
  )
}

export function SettingsSection({ profile, shoppingMode }: SettingsSectionProps) {
  const { showToast } = useToast()
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [errors, setErrors] = useState<PasswordErrors>({})
  const [saving, setSaving] = useState(false)

  const usesGoogle = profile.authProvider === 'GOOGLE' || !profile.hasPassword

  const resetPasswordForm = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setShowCurrent(false)
    setShowNew(false)
    setShowConfirm(false)
    setErrors({})
  }

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const next: PasswordErrors = {}
    if (!currentPassword) next.currentPassword = 'Enter your current password.'
    else if (currentPassword.length < 6) next.currentPassword = 'Password must be at least 6 characters.'
    if (!newPassword) next.newPassword = 'Enter a new password.'
    else if (newPassword.length < 6) next.newPassword = 'New password must be at least 6 characters.'
    if (!confirmPassword) next.confirmPassword = 'Repeat your new password.'
    else if (confirmPassword !== newPassword) next.confirmPassword = 'New passwords do not match.'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setSaving(true)
    try {
      await changeCustomerAccountPassword({ currentPassword, newPassword, confirmPassword })
      resetPasswordForm()
      setShowChangePassword(false)
      showToast('Your password has been changed. Other devices have been signed out.', 'success')
    } catch (caught) {
      setErrors({ form: caught instanceof ApiError ? caught.message : 'Your password could not be changed.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className={accountCardClassName}>
        <h2 className={accountSectionHeadingClassName}>Account preferences</h2>
        <p className={accountSectionDescriptionClassName}>
          Settings that shape how you use the store.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-line bg-cream p-5">
            <div className="flex items-center gap-2 text-sm font-bold text-green-dark">
              <SettingsIcon size={17} />
              Shopping mode
            </div>
            <p className="mt-2 text-xs leading-5 text-muted">
              You are currently shopping in{' '}
              <strong className="font-bold text-green-dark">{shoppingMode === 'WHOLESALE' ? 'Wholesale' : 'Retail'}</strong>{' '}
              mode.
            </p>
            <p className="mt-2 text-xs leading-5 text-muted">
              Switch between Retail and Wholesale from the header at any time. Modes keep separate carts.
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-cream p-5">
            <div className="flex items-center gap-2 text-sm font-bold text-green-dark">
              <ShieldIcon size={17} />
              Email address
            </div>
            <p className="mt-2 text-sm text-green-dark">{profile.email}</p>
            <p className="mt-2 text-xs leading-5 text-muted">
              {profile.emailVerified ? (
                <span className="font-semibold text-green">Verified</span>
              ) : (
                <>
                  Not verified yet.{' '}
                  <Link className="font-bold underline" to="/verify-email" state={{ email: profile.email }}>
                    Verify your email
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>
      </section>

      <section className={accountCardClassName}>
        <h2 className={accountSectionHeadingClassName}>Security</h2>
        <p className={accountSectionDescriptionClassName}>
          How you sign in and manage access to your account.
        </p>

        <div className="mt-6 rounded-2xl border border-line p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-green-dark">Sign-in method</p>
              <p className="mt-1 text-xs text-muted">
                {usesGoogle
                  ? 'This account signs in with Google.'
                  : 'This account signs in with email and password.'}
              </p>
            </div>
            {!usesGoogle && (
              <button
                className="rounded-full border border-green/25 px-4 py-2 text-xs font-bold text-green transition-colors hover:bg-green hover:text-cream"
                type="button"
                aria-expanded={showChangePassword}
                onClick={() => setShowChangePassword((current) => !current)}
              >
                {showChangePassword ? 'Cancel' : 'Change password'}
              </button>
            )}
          </div>

          {usesGoogle ? (
            <div className="mt-4 rounded-xl border border-line bg-cream px-4 py-3 text-sm text-muted">
              You signed up with Google, so there is no stored password for this account.
            </div>
          ) : showChangePassword ? (
            <form className="mt-6 grid gap-5 sm:grid-cols-2" onSubmit={handlePasswordSubmit} noValidate>
              <div>
                <label className={accountFieldLabelClassName} htmlFor="account-current-password">
                  Current password <span className="text-orange" aria-hidden="true">*</span>
                </label>
                <div className="relative">
                  <input
                    className={passwordFieldClassName(Boolean(errors.currentPassword))}
                    id="account-current-password"
                    name="currentPassword"
                    type={showCurrent ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    aria-invalid={Boolean(errors.currentPassword)}
                    aria-describedby={errors.currentPassword ? 'account-current-password-error' : undefined}
                    required
                  />
                  <PasswordVisibilityButton visible={showCurrent} onToggle={() => setShowCurrent((current) => !current)} label="current password" />
                </div>
                {errors.currentPassword && (
                  <p className={accountFieldErrorClassName} id="account-current-password-error" role="alert">{errors.currentPassword}</p>
                )}
              </div>

              <div>
                <label className={accountFieldLabelClassName} htmlFor="account-new-password">
                  New password <span className="text-orange" aria-hidden="true">*</span>
                </label>
                <div className="relative">
                  <input
                    className={passwordFieldClassName(Boolean(errors.newPassword))}
                    id="account-new-password"
                    name="newPassword"
                    type={showNew ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    aria-invalid={Boolean(errors.newPassword)}
                    aria-describedby={errors.newPassword ? 'account-new-password-error' : undefined}
                    required
                  />
                  <PasswordVisibilityButton visible={showNew} onToggle={() => setShowNew((current) => !current)} label="new password" />
                </div>
                {errors.newPassword && (
                  <p className={accountFieldErrorClassName} id="account-new-password-error" role="alert">{errors.newPassword}</p>
                )}
              </div>

              <div>
                <label className={accountFieldLabelClassName} htmlFor="account-confirm-password">
                  Confirm new password <span className="text-orange" aria-hidden="true">*</span>
                </label>
                <div className="relative">
                  <input
                    className={passwordFieldClassName(Boolean(errors.confirmPassword))}
                    id="account-confirm-password"
                    name="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    aria-invalid={Boolean(errors.confirmPassword)}
                    aria-describedby={errors.confirmPassword ? 'account-confirm-password-error' : undefined}
                    required
                  />
                  <PasswordVisibilityButton visible={showConfirm} onToggle={() => setShowConfirm((current) => !current)} label="confirmation password" />
                </div>
                {errors.confirmPassword && (
                  <p className={accountFieldErrorClassName} id="account-confirm-password-error" role="alert">{errors.confirmPassword}</p>
                )}
              </div>

              <div>
                <p className="text-xs text-muted">
                  At least 6 characters. Other signed-in devices will be signed out.
                </p>
              </div>

              {errors.form && (
                <p className="rounded-xl border border-orange/25 bg-orange/5 px-4 py-3 text-sm text-orange sm:col-span-2" role="alert">
                  {errors.form}
                </p>
              )}

              <div className="sm:col-span-2">
                <button
                  className="inline-flex items-center gap-2 rounded-xl bg-green px-6 py-3 text-sm font-bold text-cream transition-colors hover:bg-green-dark disabled:cursor-not-allowed disabled:opacity-50"
                  type="submit"
                  disabled={saving}
                >
                  {saving ? 'Changing password…' : 'Change password'}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </section>
    </div>
  )
}