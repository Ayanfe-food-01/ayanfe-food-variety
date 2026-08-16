import { useState, type FormEvent } from 'react'
import { ApiError } from '../../services/api'
import { changeAdminPassword, type AdminPasswordChangeInput } from '../../services/adminService'
import { useToast } from '../../components/ui/Toast'
import { SettingsField, SettingsPageHeader, SettingsPanel, SettingsSaveButton } from '../../components/admin/SettingsForm'

const emptyPassword: AdminPasswordChangeInput = { currentPassword: '', newPassword: '', confirmPassword: '' }

export function PasswordSettings() {
  const [password, setPassword] = useState(emptyPassword)
  const [isSaving, setIsSaving] = useState(false)
  const { showToast } = useToast()

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (password.newPassword !== password.confirmPassword) {
      showToast('New passwords do not match.', 'error')
      return
    }
    setIsSaving(true)
    try {
      await changeAdminPassword(password)
      setPassword(emptyPassword)
      showToast('Admin password changed. Other admin sessions were signed out.', 'success')
    } catch (caught) {
      showToast(caught instanceof ApiError ? caught.message : 'Password could not be changed.', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      <SettingsPageHeader eyebrow="Security" title="Change password" description="Update the password used to access this admin portal. Your current session will stay active while other admin sessions are signed out." />
      <div className="mt-8">
        <SettingsPanel eyebrow="Security" title="Admin password" description="Use a strong password that is unique to your admin account.">
          <form className="space-y-5" onSubmit={submit}>
            <SettingsField label="Current password" type="password" autoComplete="current-password" value={password.currentPassword} onChange={(event) => setPassword({ ...password, currentPassword: event.target.value })} minLength={6} maxLength={256} required />
            <div className="grid gap-5 sm:grid-cols-2">
              <SettingsField label="New password" type="password" autoComplete="new-password" value={password.newPassword} onChange={(event) => setPassword({ ...password, newPassword: event.target.value })} minLength={6} maxLength={256} required />
              <SettingsField label="Confirm new password" type="password" autoComplete="new-password" value={password.confirmPassword} onChange={(event) => setPassword({ ...password, confirmPassword: event.target.value })} minLength={6} maxLength={256} required />
            </div>
            <p className="-mt-2 text-xs leading-5 text-muted">Use at least 6 characters. You will need the new password the next time you sign in.</p>
            <SettingsSaveButton saving={isSaving} label="Change admin password" />
          </form>
        </SettingsPanel>
      </div>
    </div>
  )
}