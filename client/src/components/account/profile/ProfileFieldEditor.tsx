import { useState, type FormEvent } from 'react'
import { isValidE164PhoneNumber } from '../../../utils/phone'
import { PhoneInputField } from '../../ui/PhoneInput'
import { accountFieldErrorClassName, accountInputClassName } from '../accountStyles'

interface ProfileFieldEditorProps {
  label: string
  initialValue: string
  kind: 'name' | 'phone'
  onSave: (value: string) => Promise<void>
  onCancel: () => void
}

function validate(kind: 'name' | 'phone', value: string) {
  if (kind === 'name') {
    if (!value.trim()) return 'Please enter your full name.'
    if (value.trim().length > 120) return 'Your name must be 120 characters or fewer.'
    return undefined
  }
  if (value.trim() && !isValidE164PhoneNumber(value)) return 'Please enter a valid phone number.'
  return undefined
}

export function ProfileFieldEditor({ label, initialValue, kind, onSave, onCancel }: ProfileFieldEditorProps) {
  const [value, setValue] = useState(initialValue)
  const [error, setError] = useState<string | undefined>(undefined)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextError = validate(kind, value)
    if (nextError) {
      setError(nextError)
      return
    }
    setSaving(true)
    try {
      await onSave(value.trim())
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : kind === 'name' ? 'Your name could not be saved.' : 'Your phone number could not be saved.')
      setSaving(false)
    }
  }

  const handleChange = (next: string) => {
    setValue(next)
    setError(undefined)
  }

  return (
    <form className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0" onSubmit={handleSubmit} noValidate>
      <div className="min-w-0 flex-1">
        <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted" htmlFor={`account-edit-${kind}`}>
          {label}
        </label>
        <div className="mt-1">
          {kind === 'phone' ? (
            <PhoneInputField
              id={`account-edit-${kind}`}
              name={kind}
              value={value}
              hasError={Boolean(error)}
              onChange={handleChange}
              aria-describedby={error ? `account-edit-${kind}-error` : undefined}
            />
          ) : (
            <input
              className={accountInputClassName(Boolean(error))}
              id={`account-edit-${kind}`}
              name={kind}
              type="text"
              autoComplete={kind === 'name' ? 'name' : 'tel'}
              value={value}
              onChange={(event) => handleChange(event.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `account-edit-${kind}-error` : undefined}
              required
            />
          )}
        </div>
        {error && (
          <p className={accountFieldErrorClassName} id={`account-edit-${kind}-error`} role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          className="inline-flex items-center justify-center rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-muted transition-colors hover:bg-cream hover:text-green-dark"
          type="button"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          className="inline-flex items-center justify-center rounded-xl bg-green px-4 py-2.5 text-sm font-bold text-cream transition-colors hover:bg-green-dark disabled:cursor-not-allowed disabled:opacity-50"
          type="submit"
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  )
}