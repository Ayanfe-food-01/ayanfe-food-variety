import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BellIcon } from '../../assets/icons'
import {
  getAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  type AdminNotification,
} from '../../services/notificationService'
import { AdminNotificationList } from './AdminNotificationList'

const pollingIntervalMs = 30_000
const recentNotificationPageSize = 8

export function AdminNotifications() {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const notificationMenuRef = useRef<HTMLDivElement>(null)

  const loadNotifications = useCallback(async () => {
    try {
      const result = await getAdminNotifications({ page: 1, pageSize: recentNotificationPageSize })
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
          className="absolute left-1/2 top-[calc(100%+0.75rem)] z-50 w-[min(23rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-2xl border border-line bg-white shadow-xl sm:left-auto sm:right-0 sm:translate-x-0"
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

          <AdminNotificationList
            compact
            notifications={notifications}
            onOpen={(notification) => void openNotification(notification)}
          />
          <div className="border-t border-line px-4 py-3 text-center">
            <Link
              className="text-xs font-bold text-green hover:text-orange"
              to="/admin/notifications"
              onClick={() => setIsOpen(false)}
            >
              View all notifications
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}