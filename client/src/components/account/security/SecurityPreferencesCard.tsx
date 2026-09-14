import { ClipboardListIcon, BellIcon, LogOutIcon, ShieldIcon, LockIcon } from '../../../assets/icons'
import { useCustomerAuth } from '../../../hooks/useCustomerAuth'
import { AccountCard } from '../AccountCard'
import { DisclosureRow } from '../more/DisclosureRow'

export function SecurityPreferencesCard() {
  const { logout } = useCustomerAuth()

  const header = (
    <div className="flex items-center gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sage/60 text-green">
        <ShieldIcon size={18} />
      </span>
      <h2 className="text-xl font-bold text-green-dark">Security & Preferences</h2>
    </div>
  )

  return (
    <AccountCard header={header}>
      <div className="divide-y divide-line">
        <DisclosureRow icon={<ClipboardListIcon size={18} />} label="Order history" to="/orders" />
        <DisclosureRow icon={<LockIcon size={18} />} label="Change password" to="/account/change-password" />
        <DisclosureRow icon={<BellIcon size={18} />} label="Notification preferences" to="/account/notifications" />
        <DisclosureRow
          icon={<LogOutIcon size={18} />}
          label="Log out"
          danger
          chevron={false}
          onClick={() => void logout()}
        />
      </div>
    </AccountCard>
  )
}