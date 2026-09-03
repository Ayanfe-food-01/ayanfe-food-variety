import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from '../../assets/icons'
import { SubmitButton } from '../ui/SubmitButton'

interface SettingsPageHeaderProps {
  eyebrow: string
  title: string
  description: string
}

export function SettingsPageHeader({ eyebrow, title, description }: SettingsPageHeaderProps) {
  return (
    <div>
      <Link className="inline-flex items-center gap-2 text-sm font-bold text-muted transition-colors hover:text-green-dark" to="/admin/settings">
        <ArrowRight className="rotate-180" size={16} />
        Back to settings
      </Link>
      <p className="mt-8 text-xs font-bold uppercase tracking-[0.16em] text-orange">{eyebrow}</p>
      <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">{title}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{description}</p>
    </div>
  )
}

interface SettingsPanelProps {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
  className?: string
}

export function SettingsPanel({ eyebrow, title, description, children, className = '' }: SettingsPanelProps) {
  return (
    <section className={`rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8 ${className}`.trim()}>
      <div className="border-b border-line pb-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-green-dark">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{description}</p>
      </div>
      <div className="pt-6">{children}</div>
    </section>
  )
}

interface SettingsFieldRenderProps {
  value: string
  onChange: (value: string) => void
  id?: string
  name?: string
  'aria-describedby'?: string
}

export function SettingsField({
  label,
  value,
  onChange,
  renderInput,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string
  renderInput?: (renderProps: SettingsFieldRenderProps) => ReactNode
}) {
  const renderProps: SettingsFieldRenderProps = {
    value: typeof value === 'string' ? value : value == null ? '' : String(value),
    onChange: (next) =>
      onChange?.({ target: { value: next } } as React.ChangeEvent<HTMLInputElement>),
    id: props.id,
    name: props.name,
    'aria-describedby': props['aria-describedby'],
  }

  return (
    <label className="block text-sm font-bold text-green-dark">
      {label}
      {renderInput ? (
        renderInput(renderProps)
      ) : (
        <input
          {...props}
          className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10"
          value={value}
          onChange={onChange}
        />
      )}
    </label>
  )
}

export function SettingsTextArea({ label, value, onChange, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className="block text-sm font-bold text-green-dark">
      {label}
      <textarea
        {...props}
        className="mt-2 min-h-28 w-full resize-y rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10"
        value={value}
        onChange={onChange}
      />
    </label>
  )
}

export function SettingsSaveButton({ saving, label }: { saving: boolean; label: string }) {
  return <SubmitButton busy={saving} busyLabel="Saving…">{label}</SubmitButton>
}

export function SettingsFormState({ isLoading, error, children }: { isLoading: boolean; error: string | null; children: ReactNode }) {
  if (isLoading) return <p className="mt-8 text-sm text-muted">Loading settings…</p>
  return (
    <>
      {error && <p className="mt-5 rounded-xl border border-orange/25 bg-orange/5 p-4 text-sm text-orange" role="alert">{error}</p>}
      <div className="mt-8">{children}</div>
    </>
  )
}