import { useEffect, useState, type FormEvent, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { ApiError } from '../../services/api'
import { useToast } from '../../components/ui/Toast'
import {
  getContactInformation,
  getPaymentSettings,
  getStoreInformation,
  updateContactInformation,
  updatePaymentSettings,
  updateStoreInformation,
  type ContactInformation,
  type PaymentSettings,
  type StoreInformation,
} from '../../services/adminService'

const emptyStore: StoreInformation = { businessName: '', address: '', description: '' }
const emptyContact: ContactInformation = { businessEmail: '', businessPhone: '', whatsappNumber: '' }
const emptyPayment: PaymentSettings = { bankName: '', accountName: '', accountNumber: '', instructions: '' }

interface SettingsSectionProps {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
}

function SettingsSection({ eyebrow, title, description, children }: SettingsSectionProps) {
  return (
    <section className="rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
      <div className="border-b border-line pb-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-green-dark">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{description}</p>
      </div>
      <div className="pt-6">{children}</div>
    </section>
  )
}

function Field({ label, value, onChange, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block text-sm font-bold text-green-dark">
      {label}
      <input
        {...props}
        className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10"
        value={value}
        onChange={onChange}
      />
    </label>
  )
}

function TextArea({ label, value, onChange, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
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

export function Settings() {
  const [store, setStore] = useState(emptyStore)
  const [contact, setContact] = useState(emptyContact)
  const [payment, setPayment] = useState(emptyPayment)
  const [isLoading, setIsLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { showToast } = useToast()

  useEffect(() => {
    Promise.all([getStoreInformation(), getContactInformation(), getPaymentSettings()])
      .then(([loadedStore, loadedContact, loadedPayment]) => {
        if (loadedStore) setStore(loadedStore)
        if (loadedContact) setContact(loadedContact)
        if (loadedPayment) setPayment(loadedPayment)
      })
      .catch((caught: unknown) => setError(caught instanceof ApiError ? caught.message : 'Settings could not be loaded.'))
      .finally(() => setIsLoading(false))
  }, [])

  const save = async <T,>(section: string, action: () => Promise<T>, onSuccess: (value: T) => void, successMessage: string) => {
    setSaving(section)
    setError(null)
    try {
      const value = await action()
      onSuccess(value)
      showToast(successMessage, 'success')
    } catch (caught) {
      showToast(caught instanceof ApiError ? caught.message : 'Settings could not be saved.', 'error')
    } finally {
      setSaving(null)
    }
  }

  const submitStore = (event: FormEvent) => {
    event.preventDefault()
    void save('store', () => updateStoreInformation(store), setStore, 'Store information saved.')
  }
  const submitContact = (event: FormEvent) => {
    event.preventDefault()
    void save('contact', () => updateContactInformation(contact), setContact, 'Contact information saved.')
  }
  const submitPayment = (event: FormEvent) => {
    event.preventDefault()
    void save('payment', () => updatePaymentSettings(payment), setPayment, 'Payment settings saved. Customer checkout now uses these details.')
  }

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">Configuration</p>
      <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">Settings</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Manage the store information and payment instructions customers see. Changes are stored in the database and take effect without a redeployment.</p>
      {error && <p className="mt-5 rounded-xl border border-orange/25 bg-orange/5 p-4 text-sm text-orange" role="alert">{error}</p>}
      {isLoading ? <p className="mt-8 text-sm text-muted">Loading settings…</p> : (
        <div className="mt-8 space-y-6">
          <SettingsSection eyebrow="Store information" title="Store Information" description="Keep the public business identity and description current. Address and description may be left blank until they are ready to publish.">
            <form className="space-y-5" onSubmit={submitStore}>
              <Field label="Business name" value={store.businessName} onChange={(event) => setStore({ ...store, businessName: event.target.value })} required maxLength={180} />
              <Field label="Business address" value={store.address} onChange={(event) => setStore({ ...store, address: event.target.value })} maxLength={500} />
              <TextArea label="Short business description" value={store.description} onChange={(event) => setStore({ ...store, description: event.target.value })} maxLength={500} />
              <SaveButton saving={saving === 'store'} label="Save store information" />
            </form>
          </SettingsSection>

          <SettingsSection eyebrow="Payment settings" title="Payment Settings" description="These bank-transfer details are shown to customers after checkout and are read live from the database. Never enter card or gateway credentials here.">
            <form className="space-y-5" onSubmit={submitPayment}>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Bank name" value={payment.bankName} onChange={(event) => setPayment({ ...payment, bankName: event.target.value })} required maxLength={180} />
                <Field label="Account name" value={payment.accountName} onChange={(event) => setPayment({ ...payment, accountName: event.target.value })} required maxLength={180} />
              </div>
              <Field label="Account number" value={payment.accountNumber} onChange={(event) => setPayment({ ...payment, accountNumber: event.target.value })} required maxLength={80} inputMode="numeric" />
              <TextArea label="Payment instructions" value={payment.instructions} onChange={(event) => setPayment({ ...payment, instructions: event.target.value })} required maxLength={2000} placeholder="Tell customers what reference to use and what to do after transfer." />
              <SaveButton saving={saving === 'payment'} label="Save payment settings" />
            </form>
          </SettingsSection>

          <SettingsSection eyebrow="Contact information" title="Contact Information" description="These details power the customer-facing contact section and footer.">
            <form className="space-y-5" onSubmit={submitContact}>
              <Field label="Business email" type="email" value={contact.businessEmail} onChange={(event) => setContact({ ...contact, businessEmail: event.target.value })} required maxLength={255} />
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Business phone" type="tel" value={contact.businessPhone} onChange={(event) => setContact({ ...contact, businessPhone: event.target.value })} required maxLength={40} />
                <Field label="WhatsApp number" type="tel" value={contact.whatsappNumber} onChange={(event) => setContact({ ...contact, whatsappNumber: event.target.value })} required maxLength={40} />
              </div>
              <SaveButton saving={saving === 'contact'} label="Save contact information" />
            </form>
          </SettingsSection>
        </div>
      )}
    </div>
  )
}

function SaveButton({ saving, label }: { saving: boolean; label: string }) {
  return <button className="rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark disabled:opacity-50" type="submit" disabled={saving}>{saving ? 'Saving…' : label}</button>
}