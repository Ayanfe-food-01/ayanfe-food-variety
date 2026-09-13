import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../../services/api'
import { updateCustomerAccountProfileService, type CustomerAccountProfile } from '../../../services/customerAccountService'
import { useToast } from '../../ui/Toast'
import { AccountSection } from '../AccountSection'
import { ProfileFieldEditor } from './ProfileFieldEditor'
import { ProfileRow } from './ProfileRow'

type EditingField = 'name' | 'phone' | null

interface ProfileSectionProps {
  profile: CustomerAccountProfile
  onProfileUpdated: (profile: CustomerAccountProfile) => void
}

export function ProfileSection({ profile, onProfileUpdated }: ProfileSectionProps) {
  const { showToast } = useToast()
  const [editing, setEditing] = useState<EditingField>(null)

  const saveField = (field: 'name' | 'phone') => async (value: string) => {
    try {
      const updated = await updateCustomerAccountProfileService(
        field === 'name' ? { name: value } : { phone: value || null },
      )
      onProfileUpdated(updated)
      setEditing(null)
      showToast(field === 'name' ? 'Your name has been updated.' : 'Your phone number has been updated.', 'success')
    } catch (caught) {
      throw new Error(caught instanceof ApiError ? caught.message : 'Your profile could not be saved.', { cause: caught })
    }
  }

  const emailValue = profile.emailVerified ? (
    profile.email
  ) : (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {profile.email}
      <Link className="font-bold text-orange underline" to="/verify-email" state={{ email: profile.email }}>
        Verify your email
      </Link>
    </span>
  )

  return (
    <AccountSection label="Profile">
      <div className="divide-y divide-line">
        {editing === 'name' ? (
          <ProfileFieldEditor
            label="Full name"
            initialValue={profile.name}
            kind="name"
            onSave={saveField('name')}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <ProfileRow label="Full name" value={profile.name} onEdit={() => setEditing('name')} editLabel="Edit full name" />
        )}

        {editing === 'phone' ? (
          <ProfileFieldEditor
            label="Phone number"
            initialValue={profile.phone ?? ''}
            kind="phone"
            onSave={saveField('phone')}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <ProfileRow
            label="Phone number"
            value={profile.phone || <span className="text-muted">Not added</span>}
            onEdit={() => setEditing('phone')}
            editLabel="Edit phone number"
          />
        )}

        <ProfileRow label="Email address" value={emailValue} hint="Your email on this account. Contact us to change it." />
      </div>
    </AccountSection>
  )
}