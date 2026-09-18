import type { QuoteRequestStatus } from '../../../../services/quoteService'
import { isTerminal } from './constants'
import { QuoteDetailNoteEditor } from './QuoteDetailNoteEditor'
import { QuoteDetailStatusControls } from './QuoteDetailStatusControls'

interface QuoteDetailStatusSectionProps {
  status: QuoteRequestStatus
  currentStatus: QuoteRequestStatus
  statusOptions: QuoteRequestStatus[]
  onStatusChange: (status: QuoteRequestStatus) => void
  isSavingStatus: boolean
  onSaveStatus: () => void
  internalNote: string
  onInternalNoteChange: (value: string) => void
  savedNote: string
  isSavingNote: boolean
  onSaveNote: () => void
}

export function QuoteDetailStatusSection({
  status,
  currentStatus,
  statusOptions,
  onStatusChange,
  isSavingStatus,
  onSaveStatus,
  internalNote,
  onInternalNoteChange,
  savedNote,
  isSavingNote,
  onSaveNote,
}: QuoteDetailStatusSectionProps) {
  return (
    <section className="mt-5 rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6" aria-label="Status and notes">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-lg font-bold text-green-dark">Quote status</h2>
          <p className="mt-1 text-sm text-muted">Move the request through your normal flow as you respond to the customer.</p>
        </div>
        {!isTerminal(currentStatus) && (
          <div className="flex items-end gap-2">
            <QuoteDetailStatusControls
              value={status}
              options={statusOptions}
              currentStatus={currentStatus}
              onChange={onStatusChange}
              isSaving={isSavingStatus}
              onSave={onSaveStatus}
            />
          </div>
        )}
      </div>

      <div className="mt-6 border-t border-line pt-6">
        <QuoteDetailNoteEditor
          value={internalNote}
          onChange={onInternalNoteChange}
          savedValue={savedNote}
          isSaving={isSavingNote}
          onSave={onSaveNote}
        />
      </div>
    </section>
  )
}