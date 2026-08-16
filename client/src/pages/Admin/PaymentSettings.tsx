import { useEffect, useState, type FormEvent } from 'react'
import { ApiError } from '../../services/api'
import { getPaymentSettings, updatePaymentSettings, type PaymentSettings } from '../../services/adminService'
import { useToast } from '../../components/ui/Toast'
import { SettingsField, SettingsFormState, SettingsPageHeader, SettingsPanel, SettingsSaveButton, SettingsTextArea } from '../../components/admin/SettingsForm'

const emptyPayment: PaymentSettings = {
  paymentMethod: 'BANK_TRANSFER',
  bankName: '',
  accountName: '',
  accountNumber: '',
  instructions: '',
  isActive: true,
}

export function PaymentSettings() {
  const [payment, setPayment] = useState(emptyPayment)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { showToast } = useToast()

  useEffect(() => {
    getPaymentSettings()
      .then((settings) => {
        if (settings) setPayment(settings)
      })
      .catch((caught: unknown) => setError(caught instanceof ApiError ? caught.message : 'Payment settings could not be loaded.'))
      .finally(() => setIsLoading(false))
  }, [])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setIsSaving(true)
    setError(null)
    try {
      setPayment(await updatePaymentSettings(payment))
      showToast('Payment settings saved. Customer checkout now uses these details.', 'success')
    } catch (caught) {
      showToast(caught instanceof ApiError ? caught.message : 'Payment settings could not be saved.', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      <SettingsPageHeader eyebrow="Configuration" title="Payment settings" description="These bank-transfer details are shown to customers after checkout and are read live from the database. Never enter card or gateway credentials here." />
      <SettingsFormState isLoading={isLoading} error={error}>
        <SettingsPanel eyebrow="Payment settings" title="Bank transfer details" description="Keep the payment instructions customers use to complete their order accurate.">
          <form className="space-y-5" onSubmit={submit}>
            <div className="grid gap-5 sm:grid-cols-2">
              <SettingsField label="Bank name" value={payment.bankName} onChange={(event) => setPayment({ ...payment, bankName: event.target.value })} required maxLength={180} />
              <SettingsField label="Account name" value={payment.accountName} onChange={(event) => setPayment({ ...payment, accountName: event.target.value })} required maxLength={180} />
            </div>
            <SettingsField label="Account number" value={payment.accountNumber} onChange={(event) => setPayment({ ...payment, accountNumber: event.target.value })} required maxLength={80} inputMode="numeric" />
            <SettingsTextArea label="Payment instructions" value={payment.instructions} onChange={(event) => setPayment({ ...payment, instructions: event.target.value })} required maxLength={2000} placeholder="Tell customers what reference to use and what to do after transfer." />
            <label className="flex items-start gap-3 rounded-xl border border-line bg-cream/50 p-4 text-sm text-green-dark">
              <input
                className="mt-0.5 size-4 accent-green"
                type="checkbox"
                checked={payment.isActive}
                onChange={(event) => setPayment({ ...payment, isActive: event.target.checked })}
              />
              <span>
                <span className="block font-bold">Available at checkout</span>
                <span className="mt-1 block text-xs font-normal leading-5 text-muted">Turn this off to temporarily stop accepting this payment method without deleting its saved details.</span>
              </span>
            </label>
            <SettingsSaveButton saving={isSaving} label="Save payment settings" />
          </form>
        </SettingsPanel>
      </SettingsFormState>
    </div>
  )
}