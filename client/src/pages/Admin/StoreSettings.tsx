import { useEffect, useState, type FormEvent } from 'react'
import { ApiError } from '../../services/api'
import { getStoreInformation, updateStoreInformation, type StoreInformation } from '../../services/adminService'
import { useToast } from '../../components/ui/Toast'
import { SettingsField, SettingsFormState, SettingsPageHeader, SettingsPanel, SettingsSaveButton, SettingsTextArea } from '../../components/admin/SettingsForm'

const emptyStore: StoreInformation = { businessName: '', callToOrderPhone: '', announcementText: '', address: '', description: '' }

export function StoreSettings() {
  const [store, setStore] = useState(emptyStore)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { showToast } = useToast()

  useEffect(() => {
    getStoreInformation()
      .then((settings) => {
        if (settings) setStore(settings)
      })
      .catch((caught: unknown) => setError(caught instanceof ApiError ? caught.message : 'Store information could not be loaded.'))
      .finally(() => setIsLoading(false))
  }, [])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setIsSaving(true)
    setError(null)
    try {
      setStore(await updateStoreInformation(store))
      showToast('Store information saved.', 'success')
    } catch (caught) {
      showToast(caught instanceof ApiError ? caught.message : 'Store information could not be saved.', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      <SettingsPageHeader eyebrow="Configuration" title="Store information" description="Keep the public business identity, header messages, and description current. Address and description may be left blank until they are ready to publish." />
      <SettingsFormState isLoading={isLoading} error={error}>
        <SettingsPanel eyebrow="Store information" title="Business details" description="These details appear across the customer-facing storefront.">
          <form className="space-y-5" onSubmit={submit}>
            <SettingsField label="Business name" value={store.businessName} onChange={(event) => setStore({ ...store, businessName: event.target.value })} required maxLength={180} />
            <div className="grid gap-5 sm:grid-cols-2">
              <SettingsField label="Call to order phone" type="tel" value={store.callToOrderPhone} onChange={(event) => setStore({ ...store, callToOrderPhone: event.target.value })} required maxLength={40} inputMode="tel" placeholder="0801 234 5678" />
              <SettingsTextArea label="Announcement ticker messages" value={store.announcementText} onChange={(event) => setStore({ ...store, announcementText: event.target.value })} maxLength={2000} placeholder={'Fresh stock available today\nFree delivery on qualifying orders'} />
            </div>
            <p className="-mt-2 text-xs font-normal leading-5 text-muted">The green ticker rotates each line continuously. You can also separate messages with a vertical bar (|).</p>
            <SettingsField label="Business / pickup address" value={store.address} onChange={(event) => setStore({ ...store, address: event.target.value })} maxLength={500} />
            <SettingsTextArea label="Short business description" value={store.description} onChange={(event) => setStore({ ...store, description: event.target.value })} maxLength={500} />
            <SettingsSaveButton saving={isSaving} label="Save store information" />
          </form>
        </SettingsPanel>
      </SettingsFormState>
    </div>
  )
}