import type { QuoteRequestStatus } from '../../../../services/quoteService'
import { formatQuoteStatus } from '../../../../utils/quoteStatus'
import { SelectField } from '../../../../components/ui/SelectField'
import { QUOTE_STATUS_GUIDE } from './statusGuide'

interface QuoteDetailStatusControlsProps {
  value: QuoteRequestStatus
  options: QuoteRequestStatus[]
  currentStatus: QuoteRequestStatus
  onChange: (status: QuoteRequestStatus) => void
  isSaving: boolean
  onSave: () => void
}

export function QuoteDetailStatusControls({
  value,
  options,
  currentStatus,
  onChange,
  isSaving,
  onSave,
}: QuoteDetailStatusControlsProps) {
  const showQuotedReachHint = currentStatus === 'PENDING' || currentStatus === 'CONTACTED'
  const optionItems = options.map((option) => ({
    value: option,
    label: option === currentStatus ? formatQuoteStatus(option) : `Move to ${formatQuoteStatus(option).toLowerCase()}`,
  }))
  const selectOptions = showQuotedReachHint
    ? [...optionItems, { value: 'QUOTED' as const, label: 'Quoted — set by preparing a quotation' }]
    : optionItems

  return (
    <>
      <div>
        <label className="block text-xs font-bold text-green-dark">
          Status
          <SelectField
            className="mt-2 w-44"
            options={selectOptions}
            disabledOptions={showQuotedReachHint ? ['QUOTED'] : undefined}
            value={value}
            onChange={(next) => onChange(next as QuoteRequestStatus)}
          />
        </label>
        <p className="mt-2 max-w-52 text-[11px] leading-4 text-muted">
          {QUOTE_STATUS_GUIDE[currentStatus].optionHint}
        </p>
      </div>
      <button
        className="rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream disabled:cursor-not-allowed disabled:opacity-50 hover:bg-green-dark"
        type="button"
        disabled={isSaving || value === currentStatus}
        onClick={onSave}
      >
        {isSaving ? 'Saving…' : 'Save'}
      </button>
    </>
  )
}