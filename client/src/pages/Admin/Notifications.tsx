import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../../services/api'
import {
  getAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  type AdminNotification,
  type AdminNotificationsPage,
} from '../../services/notificationService'
import { AdminNotificationList } from '../../components/admin/AdminNotificationList'
import { useInitialRouteLoad } from '../../hooks/useInitialRouteLoad'

const pageSize = 20

export function Notifications() {
  const navigate = useNavigate()
  const [query, setQuery] = useState({ page: 1, pageSize })
  const [result, setResult] = useState<AdminNotificationsPage | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useInitialRouteLoad(!isLoading)

  useEffect(() => {
    let current = true
    queueMicrotask(() => {
      if (!current) return
      setIsLoading(true)
      setError(null)
    })

    getAdminNotifications(query)
      .then((page) => {
        if (current) setResult(page)
      })
      .catch((caught: unknown) => {
        if (current) setError(caught instanceof ApiError ? caught.message : 'Notifications could not be loaded.')
      })
      .finally(() => {
        if (current) setIsLoading(false)
      })

    return () => {
      current = false
    }
  }, [query])

  const openNotification = async (notification: AdminNotification) => {
    if (!notification.isRead) {
      try {
        await markAdminNotificationRead(notification.id)
        setResult((current) => current
          ? {
              ...current,
              unreadCount: Math.max(0, current.unreadCount - 1),
              notifications: current.notifications.map((item) => (
                item.id === notification.id ? { ...item, isRead: true } : item
              )),
            }
          : current)
      } catch {
        // Keep navigation useful even when the read-state request is temporarily unavailable.
      }
    }
    navigate(notification.href)
  }

  const markAllRead = async () => {
    if (!result || result.unreadCount === 0) return
    setResult((current) => current
      ? {
          ...current,
          unreadCount: 0,
          notifications: current.notifications.map((notification) => ({ ...notification, isRead: true })),
        }
      : current)
    try {
      await markAllAdminNotificationsRead()
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : 'Notifications could not be marked as read.')
    }
  }

  const currentPage = result?.pagination.page ?? query.page
  const total = result?.pagination.total ?? 0
  const totalPages = result?.pagination.totalPages ?? 1

  return (
    <div>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">Admin operations</p>
          <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">Notifications</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            Review the complete history of important order, payment, and stock updates.
          </p>
        </div>
        <Link className="text-sm font-bold text-green hover:text-orange" to="/admin">Back to dashboard</Link>
      </div>

      <section className="mt-8 overflow-hidden rounded-2xl border border-line bg-white shadow-sm" aria-label="Notification history">
        <div className="flex flex-col justify-between gap-3 border-b border-line px-4 py-4 sm:flex-row sm:items-center sm:px-5">
          <div>
            <p className="text-sm font-bold text-green-dark">Notification history</p>
            <p className="mt-1 text-xs text-muted">
              {result?.unreadCount ? `${result.unreadCount} unread` : 'You are all caught up'}
              {' · '}
              {total} {total === 1 ? 'notification' : 'notifications'}
            </p>
          </div>
          {result?.unreadCount ? (
            <button
              className="self-start rounded-lg px-2 py-1 text-xs font-bold text-green hover:bg-sage/45 sm:self-auto"
              type="button"
              onClick={() => void markAllRead()}
            >
              Mark all read
            </button>
          ) : null}
        </div>

        {error && <div className="border-b border-orange/20 bg-orange/5 px-4 py-3 text-sm text-orange sm:px-5" role="alert">{error}</div>}

        {isLoading ? (
          <div className="px-5 py-16 text-center text-sm text-muted">Loading notifications…</div>
        ) : (
          <AdminNotificationList
            notifications={result?.notifications ?? []}
            onOpen={(notification) => void openNotification(notification)}
            emptyTitle="No notifications yet"
            emptyDescription="Important order, payment, and stock updates will appear here."
          />
        )}
      </section>

      {!isLoading && totalPages > 1 && (
        <div className="mt-5 flex items-center justify-between gap-4">
          <button
            className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-green-dark hover:border-green disabled:cursor-not-allowed disabled:opacity-40"
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setQuery((current) => ({ ...current, page: currentPage - 1 }))}
          >
            Previous
          </button>
          <span className="text-xs font-bold text-muted">Page {currentPage} of {totalPages}</span>
          <button
            className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-green-dark hover:border-green disabled:cursor-not-allowed disabled:opacity-40"
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setQuery((current) => ({ ...current, page: currentPage + 1 }))}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}