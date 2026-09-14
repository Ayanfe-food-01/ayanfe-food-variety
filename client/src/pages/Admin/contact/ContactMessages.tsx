import { useState } from 'react'
import { ApiError } from '../../../services/api'
import type { AdminContactMessage } from '../../../services/contactService'
import { Breadcrumb } from '../../../components/ui/Breadcrumb'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { AdminPagination } from '../../../components/admin/AdminPagination'
import { AdminTableSkeleton } from '../../../components/admin/AdminTableSkeleton'
import { useContactMessages } from './useContactMessages'
import { ContactMessagesToolbar } from './ContactMessagesToolbar'
import { ContactMessagesTable } from './ContactMessagesTable'

export function ContactMessages() {
  const {
    result,
    isLoading,
    error,
    busyId,
    searchInput,
    onSearchInputChange,
    onSearch,
    status,
    onStatus,
    sort,
    onSort,
    onPageChange,
    setMessageStatus,
    removeMessage,
  } = useContactMessages()

  const [pendingDelete, setPendingDelete] = useState<AdminContactMessage | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const total = result?.pagination.total ?? 0
  const currentPage = result?.pagination.page ?? 1
  const totalPages = result?.pagination.totalPages ?? 1

  const confirmDelete = async () => {
    if (!pendingDelete) return
    setDeleteError(null)
    setIsDeleting(true)
    try {
      await removeMessage(pendingDelete.id)
      setPendingDelete(null)
    } catch (caught) {
      setDeleteError(caught instanceof ApiError ? caught.message : 'The message could not be deleted.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div>
      <div>
        <Breadcrumb className="mb-5" items={[{ label: 'Dashboard', href: '/admin' }, { label: 'Contact messages' }]} />
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">Customer enquiries</p>
        <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">Contact messages</h1>
        <p className="mt-3 text-sm text-muted">Read, resolve, and manage messages sent from the contact page.</p>
      </div>

      <ContactMessagesToolbar
        searchInput={searchInput}
        onSearchInputChange={onSearchInputChange}
        onSearch={onSearch}
        status={status}
        onStatus={onStatus}
        sort={sort}
        onSort={onSort}
      />

      {error && <div className="mt-6 rounded-2xl border border-orange/25 bg-orange/5 p-4 text-sm text-orange" role="alert">{error}</div>}

      <section className="mt-6 rounded-2xl border border-line bg-white shadow-sm" aria-label="Contact messages">
        {isLoading ? (
          <AdminTableSkeleton desktopColumns={6} label="Loading contact messages" />
        ) : result?.contactMessages.length ? (
          <>
            <div className="mb-4 flex items-center justify-between px-5 pt-5 text-sm text-muted">
              <span>{total} {total === 1 ? 'message' : 'messages'}</span>
              <span>Page {currentPage} of {totalPages}</span>
            </div>
            <ContactMessagesTable
              messages={result?.contactMessages ?? []}
              busyId={busyId}
              onSetStatus={setMessageStatus}
              onDelete={setPendingDelete}
            />
            {totalPages > 1 && (
              <AdminPagination
                className="border-t border-line px-5 py-4"
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={onPageChange}
              />
            )}
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-green/25 bg-sage/25 px-6 py-16 text-center">
            <h2 className="text-xl font-bold text-green-dark">No contact messages found</h2>
            <p className="mt-2 text-sm text-muted">Try a different filter.</p>
          </div>
        )}
      </section>

      {pendingDelete && (
        <ConfirmDialog
          eyebrow="Delete contact message"
          title="Delete this message?"
          description={`This will permanently remove the message from ${pendingDelete.name}. This action cannot be undone.`}
          error={deleteError}
          isBusy={isDeleting}
          confirmLabel="Delete"
          busyLabel="Deleting…"
          onCancel={() => {
            setPendingDelete(null)
            setDeleteError(null)
          }}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  )
}