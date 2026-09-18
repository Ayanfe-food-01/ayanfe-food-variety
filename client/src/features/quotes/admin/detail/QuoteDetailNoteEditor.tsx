interface QuoteDetailNoteEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  savedValue: string
  isSaving: boolean
  onSave: () => void
}

export function QuoteDetailNoteEditor({
  value,
  onChange,
  placeholder,
  savedValue,
  isSaving,
  onSave,
}: QuoteDetailNoteEditorProps) {
  const isDirty = value !== savedValue
  return (
    <div>
      <label className="block text-sm font-bold text-green-dark" htmlFor="admin-quote-note">
        Internal note <span className="font-normal normal-case tracking-normal text-muted">(never shown to customers)</span>
      </label>
      <textarea
        className="mt-2 w-full resize-y rounded-xl border border-line bg-cream px-4 py-3 text-sm font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10"
        id="admin-quote-note"
        rows={4}
        maxLength={2000}
        placeholder={placeholder ?? 'Internal context for this request — pricing notes, agreed amounts, etc. This note is private to the admin portal.'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <div className="mt-3 flex justify-end">
        <button
          className="rounded-xl border border-green/25 px-5 py-2.5 text-sm font-bold text-green disabled:cursor-not-allowed disabled:opacity-50 hover:bg-green hover:text-cream"
          type="button"
          disabled={isSaving || !isDirty}
          onClick={onSave}
        >
          {isSaving ? 'Saving…' : 'Save note'}
        </button>
      </div>
    </div>
  )
}