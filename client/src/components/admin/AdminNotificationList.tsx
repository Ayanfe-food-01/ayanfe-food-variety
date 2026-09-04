import { BellIcon } from '../../assets/icons'
import type { AdminNotification } from '../../services/notificationService'
import { formatNotificationTime } from '../../utils/notification'

interface AdminNotificationListProps {
  notifications: AdminNotification[]
  onOpen: (notification: AdminNotification) => void
  emptyTitle?: string
  emptyDescription?: string
  compact?: boolean
}

export function AdminNotificationList({
  notifications,
  onOpen,
  emptyTitle = 'No notifications yet',
  emptyDescription = 'Important order, payment, and stock updates will appear here.',
  compact = false,
}: AdminNotificationListProps) {
  if (notifications.length === 0) {
    return (
      <div className={`text-center ${compact ? 'px-5 py-10' : 'rounded-2xl border border-line bg-white px-5 py-16 shadow-sm'}`}>
        <span className="flex justify-center text-green-dark" aria-hidden="true">
          <BellIcon size={compact ? 24 : 30} />
        </span>
        <p className="mt-3 text-sm font-bold text-green-dark">{emptyTitle}</p>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted">{emptyDescription}</p>
      </div>
    )
  }

  return (
    <div className={compact ? 'y-scrollbar max-h-[min(28rem,65vh)] overflow-y-auto p-2' : 'divide-y divide-line'}>
      {notifications.map((notification) => (
        <button
          className={`flex w-full items-start gap-3 text-left transition-colors hover:bg-sage/35 ${
            compact
              ? `rounded-xl px-3 py-3 ${notification.isRead ? 'bg-white' : 'bg-sage/35'}`
              : `px-4 py-4 sm:px-5 ${notification.isRead ? 'bg-white' : 'bg-sage/20'}`
          }`}
          type="button"
          key={notification.id}
          onClick={() => onOpen(notification)}
        >
          <span className={`mt-1.5 size-2 shrink-0 rounded-full ${notification.isRead ? 'bg-line' : 'bg-orange'}`} aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="flex items-start justify-between gap-3">
              <span className={`text-sm ${notification.isRead ? 'font-semibold text-green-dark' : 'font-bold text-green-dark'}`}>
                {notification.title}
              </span>
              <time
                className="shrink-0 text-[11px] text-muted"
                dateTime={notification.createdAt}
                title={new Date(notification.createdAt).toLocaleString()}
              >
                {formatNotificationTime(notification.createdAt)}
              </time>
            </span>
            <span className="mt-1 block text-xs leading-5 text-muted">{notification.message}</span>
          </span>
        </button>
      ))}
    </div>
  )
}