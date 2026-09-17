import type { QuoteRequestStatus } from '../../../services/quoteService'
import { QuoteDetailNoteEditor } from './QuoteDetailNoteEditor'
import { QuoteDetailStatusControls } from './QuoteDetailStatusControls'
import { QuoteGuideNote } from './QuoteGuideNote'

interface QuoteDetailStatusCardProps {
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

export function QuoteDetailStatusCard({
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
}: QuoteDetailStatusCardProps) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-bold text-green-dark">Quote status</h2>
      <p className="mt-1 text-sm text-muted">Move the request through your normal flow as you respond to the customer.</p>
      <div className="mt-4 flex items-end gap-2">
        <QuoteDetailStatusControls
          value={status}
          options={statusOptions}
          currentStatus={currentStatus}
          onChange={onStatusChange}
          isSaving={isSavingStatus}
          onSave={onSaveStatus}
        />
      </div>
      {currentStatus === 'CONTACTED' && (
        <QuoteGuideNote tone="next">
          This request moves to Quoted when you submit a prepared quotation below — no manual status change is required.
        </QuoteGuideNote>
      )}

      <div className="mt-6 border-t border-line pt-6">
        <QuoteDetailNoteEditor
          value={internalNote}
          onChange={onInternalNoteChange}
          savedValue={savedNote}
          isSaving={isSavingNote}
          onSave={onSaveNote}
        />
      </div>
    </div>
  )
}