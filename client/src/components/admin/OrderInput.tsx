import { useEffect, useState } from 'react'

interface OrderInputProps {
  value: number
  isBusy?: boolean
  onSave: (value: number) => void
}

export function OrderInput({ value, isBusy = false, onSave }: OrderInputProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDraft(String(value)), 0)
    return () => window.clearTimeout(timeoutId)
  }, [value])

  const cancel = () => {
    setDraft(String(value))
    setEditing(false)
  }

  const commit = () => {
    setEditing(false)
    const parsed = Number(draft.trim())
    const isValid = Number.isInteger(parsed) && parsed >= 0 && parsed <= 999999
    if (!isValid || parsed === value) {
      setDraft(String(value))
      return
    }
    onSave(parsed)
  }

  if (editing) {
    return (
      <input
        className="w-24 rounded-lg border border-green/40 bg-cream px-2 py-1 text-center text-xs font-bold text-green-dark outline-none focus:border-green focus:ring-2 focus:ring-green/10"
        type="number"
        min={0}
        max={999999}
        step={1}
        value={draft}
        autoFocus
        aria-label="Display order"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit()
          if (event.key === 'Escape') cancel()
        }}
      />
    )
  }

  return (
    <button
      className="rounded-lg border border-transparent px-2 py-1 text-xs font-bold text-green-dark transition-colors hover:border-green/30 hover:bg-sage/40 disabled:cursor-wait disabled:opacity-50"
      type="button"
      disabled={isBusy}
      title="Edit display order"
      aria-label={`Display order ${value}. Edit`}
      onClick={() => {
        setDraft(String(value))
        setEditing(true)
      }}
    >
      {value}
    </button>
  )
}