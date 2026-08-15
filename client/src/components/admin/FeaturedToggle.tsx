interface FeaturedToggleProps {
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}

export function FeaturedToggle({ checked, disabled = false, onChange }: FeaturedToggleProps) {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-line bg-cream/50 p-4 text-sm text-green-dark">
      <input
        className="mt-0.5 size-4 accent-green"
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        <span className="block font-bold">Mark as featured</span>
        <span className="mt-1 block text-xs font-normal leading-5 text-muted">
          Featured products appear in the homepage product section when they are active and available.
        </span>
      </span>
    </label>
  )
}