import type { AdminContactMessage, ContactMessageStatus } from '../../../services/contactService'
import { formatDate } from '../../../utils/dateFormat'
import { ResponsiveDataTable } from '../../../components/ui/ResponsiveDataTable'
import { ActionMenu, ActionMenuButton } from '../../../components/admin/ActionMenu'
import { contactStatusClass, formatContactStatus } from './contactStatus'

interface ContactMessagesTableProps {
  messages: AdminContactMessage[]
  busyId: string | null
  onSetStatus: (id: string, status: ContactMessageStatus) => Promise<void>
  onDelete: (message: AdminContactMessage) => void
}

export function ContactMessagesTable({ messages, busyId, onSetStatus, onDelete }: ContactMessagesTableProps) {
  return (
    <div className="min-w-0 overflow-hidden">
      <div className="space-y-3 p-4 lg:hidden">
        {messages.map((message) => (
          <div className="rounded-2xl border border-line bg-cream/45 p-4" key={message.id}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="break-words font-bold text-green-dark">{message.name}</p>
                <a className="mt-1 block break-words text-xs text-green hover:text-orange" href={`mailto:${message.email}`}>{message.email}</a>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${contactStatusClass(message.status)}`}>{formatContactStatus(message.status)}</span>
            </div>
            <p className="mt-3 break-words font-semibold text-green-dark">{message.subject || 'No subject'}</p>
            <p className="mt-1 line-clamp-3 break-words whitespace-pre-line text-xs leading-5 text-muted">{message.message}</p>
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
              <p className="text-xs text-muted">{formatDate(message.createdAt, true)}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-bold text-green-dark hover:border-green"
                  type="button"
                  disabled={busyId === message.id}
                  onClick={() => onSetStatus(message.id, message.status === 'NEW' ? 'RESOLVED' : 'NEW')}
                >
                  {message.status === 'NEW' ? 'Mark resolved' : 'Reopen'}
                </button>
                <button
                  className="rounded-lg border border-orange/30 bg-white px-3 py-1.5 text-xs font-bold text-muted hover:border-orange/60 hover:text-orange"
                  type="button"
                  disabled={busyId === message.id}
                  onClick={() => onDelete(message)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden lg:block">
        <ResponsiveDataTable label="Contact messages table horizontal scroll">
          <table className="w-full min-w-[1080px] whitespace-nowrap text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-line bg-sage/30 text-xs uppercase tracking-[0.12em] text-muted">
              <tr>
                <th className="px-4 py-4 font-bold">From</th>
                <th className="px-4 py-4 font-bold">Subject</th>
                <th className="px-4 py-4 font-bold">Message</th>
                <th className="px-4 py-4 font-bold">Date</th>
                <th className="px-4 py-4 font-bold">Status</th>
                <th className="px-4 py-4 text-center font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {messages.map((message) => (
                <tr className="group hover:bg-cream/60" key={message.id}>
                  <td className="px-4 py-4">
                    <p className="block min-w-0 max-w-[240px] truncate font-semibold text-green-dark">{message.name}</p>
                    <a className="mt-1 block min-w-0 max-w-[240px] truncate text-xs text-green hover:text-orange" href={`mailto:${message.email}`}>{message.email}</a>
                  </td>
                  <td className="px-4 py-4"><span className="block min-w-0 max-w-[220px] truncate font-semibold text-green-dark">{message.subject || 'No subject'}</span></td>
                  <td className="px-4 py-4"><span className="block max-w-[340px] truncate text-muted" title={message.message}>{message.message}</span></td>
                  <td className="whitespace-nowrap px-4 py-4 text-muted">{formatDate(message.createdAt, true)}</td>
                  <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${contactStatusClass(message.status)}`}>{formatContactStatus(message.status)}</span></td>
                  <td className="px-4 py-4 text-center">
                    <ActionMenu ariaLabel={`Actions for message from ${message.name}`} fixedPosition isBusy={busyId === message.id}>
                      {(close) => (
                        <>
                          <ActionMenuButton
                            tone="accent"
                            onClick={() => {
                              close()
                              onSetStatus(message.id, message.status === 'NEW' ? 'RESOLVED' : 'NEW')
                            }}
                          >
                            {message.status === 'NEW' ? 'Mark resolved' : 'Reopen'}
                          </ActionMenuButton>
                          <ActionMenuButton
                            tone="danger"
                            onClick={() => {
                              close()
                              onDelete(message)
                            }}
                          >
                            Delete
                          </ActionMenuButton>
                        </>
                      )}
                    </ActionMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ResponsiveDataTable>
      </div>
    </div>
  )
}