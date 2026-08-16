import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BellIcon } from '../../assets/icons'
import {
  getAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  type AdminNotification,
} from '../../services/notificationService'

const pollingIntervalMs = 30_000

const formatRelativeTime = (value: string): string => {
  const timestamp = new Date(value).getTime()
  if (Number.isNaN(timestamp)) return 'Recently'

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000))
  if (elapsedSeconds < 60) return 'Just now'
  const minutes = Math.floor(elapsedSeconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function AdminNotifications() {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const notificationMenuRef = useRef<HTMLDivElement>(null)

  const loadNotifications = useCallback(async () => {
    try {
      const result = await getAdminNotifications()
      setNotifications(result.notifications)
      setUnreadCount(result.unreadCount)
    } catch {
      // The protected page remains usable if a background refresh is unavailable.
    }
  }, [])

  useEffect(() => {
    const initialRefreshId = window.setTimeout(() => void loadNotifications(), 0)
    const intervalId = window.setInterval(() => void loadNotifications(), pollingIntervalMs)
    return () => {
      window.clearTimeout(initialRefreshId)
      window.clearInterval(intervalId)
    }
  }, [loadNotifications])

  useEffect(() => {
    if (!isOpen) return

    const closeOnPointerDown = (event: PointerEvent) => {
      if (!notificationMenuRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('pointerdown', closeOnPointerDown)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnPointerDown)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen])

  const toggleMenu = () => {
    setIsOpen((current) => !current)
    if (!isOpen) void loadNotifications()
  }

  const openNotification = async (notification: AdminNotification) => {
    if (!notification.isRead) {
      try {
        await markAdminNotificationRead(notification.id)
        setNotifications((current) => current.map((item) => (
          item.id === notification.id ? { ...item, isRead: true } : item
        )))
        setUnreadCount((current) => Math.max(0, current - 1))
      } catch {
        // Navigation should still take the admin to the relevant record.
      }
    }
    setIsOpen(false)
    navigate(notification.href)
  }

  const markAllRead = async () => {
    if (unreadCount === 0) return
    setNotifications((current) => current.map((notification) => ({ ...notification, isRead: true })))
    setUnreadCount(0)
    try {
      await markAllAdminNotificationsRead()
    } catch {
      void loadNotifications()
    }
  }

  return (
    <div className="relative" ref={notificationMenuRef}>
      <button
        className="relative grid size-10 place-items-center rounded-full border border-transparent bg-sage/45 text-green-dark transition-colors hover:border-line hover:bg-white"
        type="button"
        aria-label={unreadCount > 0 ? `View notifications, ${unreadCount} unread` : 'View notifications'}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={toggleMenu}
      >
        <BellIcon size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-orange px-1 text-[10px] font-bold leading-5 text-white" aria-label={`${unreadCount} unread notifications`}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <section
          className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[min(23rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-white shadow-xl"
          role="dialog"
          aria-label="Admin notifications"
        >
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div>
              <h2 className="text-sm font-bold text-green-dark">Notifications</h2>
              <p className="mt-0.5 text-xs text-muted">
                {unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                className="rounded-lg px-2 py-1 text-xs font-bold text-green hover:bg-sage/45"
                type="button"
                onClick={() => void markAllRead()}
              >
                Mark all read
              </button>
            )}
          </div>

          {notifications.length > 0 ? (
            <div className="max-h-[min(28rem,65vh)] overflow-y-auto p-2">
              {notifications.map((notification) => (
                <button
                  className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-sage/35 ${notification.isRead ? 'bg-white' : 'bg-sage/35'}`}
                  type="button"
                  key={notification.id}
                  onClick={() => void openNotification(notification)}
                >
                  <span className={`mt-1.5 size-2 shrink-0 rounded-full ${notification.isRead ? 'bg-line' : 'bg-orange'}`} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-3">
                      <span className={`text-sm ${notification.isRead ? 'font-semibold text-green-dark' : 'font-bold text-green-dark'}`}>{notification.title}</span>
                      <time className="shrink-0 text-[11px] text-muted" dateTime={notification.createdAt} title={new Date(notification.createdAt).toLocaleString()}>
                        {formatRelativeTime(notification.createdAt)}
                      </time>
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-muted">{notification.message}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-5 py-10 text-center">
              <BellIcon size={24} />
              <p className="mt-3 text-sm font-bold text-green-dark">No notifications yet</p>
              <p className="mt-1 text-xs leading-5 text-muted">Important order, payment, and stock updates will appear here.</p>
            </div>
          )}
        </section>
      )}
    </div>
  )
}