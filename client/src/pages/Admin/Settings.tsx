import { useEffect, useState, type FormEvent } from 'react'
import { ApiError } from '../../services/api'
import { getPaymentSettings, updatePaymentSettings, type PaymentSettings } from '../../services/adminService'

const emptySettings: PaymentSettings = { bankName: '', accountName: '', accountNumber: '', instructions: '' }

export function Settings() {
  const [settings, setSettings] = useState<PaymentSettings>(emptySettings)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { getPaymentSettings().then((current) => { if (current) setSettings(current) }).catch((caught) => setError(caught instanceof ApiError ? caught.message : 'Settings could not be loaded.')).finally(() => setIsLoading(false)) }, [])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setIsSaving(true); setError(null); setMessage(null)
    try { setSettings(await updatePaymentSettings(settings)); setMessage('Payment settings saved. Customer checkout now uses these details.') } catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Payment settings could not be saved.') } finally { setIsSaving(false) }
  }

  const update = (field: keyof PaymentSettings, value: string) => setSettings((current) => ({ ...current, [field]: value }))

  return <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">Configuration</p><h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">Settings</h1><p className="mt-3 max-w-xl text-sm leading-6 text-muted">Manage the payment instructions customers see after creating an order. These values are stored in the database, not in code.</p><div className="mt-8 max-w-3xl rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">{isLoading ? <p className="text-sm text-muted">Loading payment settings…</p> : <form className="space-y-5" onSubmit={submit}><div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-bold text-green-dark">Bank name<input className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green" value={settings.bankName} onChange={(event) => update('bankName', event.target.value)} required maxLength={180} /></label><label className="text-sm font-bold text-green-dark">Account name<input className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green" value={settings.accountName} onChange={(event) => update('accountName', event.target.value)} required maxLength={180} /></label></div><label className="block text-sm font-bold text-green-dark">Account number<input className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green" value={settings.accountNumber} onChange={(event) => update('accountNumber', event.target.value)} required maxLength={80} /></label><label className="block text-sm font-bold text-green-dark">Payment instructions<textarea className="mt-2 min-h-32 w-full resize-y rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green" value={settings.instructions} onChange={(event) => update('instructions', event.target.value)} required maxLength={2000} placeholder="Tell customers what reference to use and what to do after transfer." /></label>{error && <p className="text-sm text-orange" role="alert">{error}</p>}{message && <p className="text-sm font-semibold text-green" role="status">{message}</p>}<button className="rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark disabled:opacity-50" type="submit" disabled={isSaving}>{isSaving ? 'Saving settings…' : 'Save payment settings'}</button></form>}</div></div>
}