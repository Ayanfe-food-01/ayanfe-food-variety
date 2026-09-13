import { BellIcon, ClipboardListIcon, LogOutIcon, ShieldIcon } from '../../../assets/icons'
import { useCustomerAuth } from '../../../hooks/useCustomerAuth'
import { AccountSection } from '../AccountSection'
import { DisclosureRow } from './DisclosureRow'

export function MoreSection() {
  const { logout } = useCustomerAuth()

  return (
    <AccountSection label="More">
      <div className="divide-y divide-line">
        <DisclosureRow
          icon={<ClipboardListIcon size={18} />}
          label="Order history"
          to="/orders"
        />
        <DisclosureRow
          icon={<ShieldIcon size={18} />}
          label="Change password"
          to="/account/change-password"
        />
        <DisclosureRow
          icon={<BellIcon size={18} />}
          label="Notification preferences"
          to="/account/notifications"
        />
        <DisclosureRow
          icon={<LogOutIcon size={18} />}
          label="Log out"
          danger
          chevron={false}
          onClick={() => void logout()}
        />
      </div>
    </AccountSection>
  )
}