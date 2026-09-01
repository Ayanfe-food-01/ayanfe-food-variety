import { useEffect, useState, type FormEvent } from 'react'
import { ApiError } from '../../services/api'
import { getContactInformation, updateContactInformation, type ContactInformation } from '../../services/adminService'
import { useToast } from '../../components/ui/Toast'
import { SettingsField, SettingsFormState, SettingsPageHeader, SettingsPanel, SettingsSaveButton, SettingsTextArea } from '../../components/admin/SettingsForm'
import { useInitialRouteLoad } from '../../hooks/useInitialRouteLoad'

const emptyContact: ContactInformation = {
  businessEmail: '',
  businessPhone: '',
  whatsappNumber: '',
  openingHours: '',
  pickupInformation: '',
  deliveryInformation: '',
  mapEmbedUrl: '',
}

export function ContactSettings() {
  const [contact, setContact] = useState(emptyContact)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useInitialRouteLoad(!isLoading)

  const { showToast } = useToast()

  useEffect(() => {
    getContactInformation()
      .then((settings) => {
        if (settings) setContact(settings)
      })
      .catch((caught: unknown) => setError(caught instanceof ApiError ? caught.message : 'Contact information could not be loaded.'))
      .finally(() => setIsLoading(false))
  }, [])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setIsSaving(true)
    setError(null)
    try {
      setContact(await updateContactInformation(contact))
      showToast('Contact information saved.', 'success')
    } catch (caught) {
      showToast(caught instanceof ApiError ? caught.message : 'Contact information could not be saved.', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      <SettingsPageHeader eyebrow="Configuration" title="Contact information" description="These details power the customer-facing contact section and footer." />
      <SettingsFormState isLoading={isLoading} error={error}>
        <SettingsPanel eyebrow="Contact information" title="Customer contact details" description="Give customers the information they need to reach your business or understand fulfillment.">
          <form className="space-y-5" onSubmit={submit}>
            <SettingsField label="Business email" type="email" value={contact.businessEmail} onChange={(event) => setContact({ ...contact, businessEmail: event.target.value })} required maxLength={255} />
            <div className="grid gap-5 sm:grid-cols-2">
              <SettingsField label="Business phone" type="tel" value={contact.businessPhone} onChange={(event) => setContact({ ...contact, businessPhone: event.target.value })} required maxLength={40} />
              <SettingsField label="WhatsApp number" type="tel" value={contact.whatsappNumber} onChange={(event) => setContact({ ...contact, whatsappNumber: event.target.value })} required maxLength={40} />
            </div>
            <SettingsTextArea label="Opening hours" value={contact.openingHours} onChange={(event) => setContact({ ...contact, openingHours: event.target.value })} maxLength={500} placeholder={'Add the hours customers can visit or contact the business.\nExample: Monday–Saturday, 9:00am–5:00pm'} />
            <div className="grid gap-5 sm:grid-cols-2">
              <SettingsTextArea label="Pickup information" value={contact.pickupInformation} onChange={(event) => setContact({ ...contact, pickupInformation: event.target.value })} maxLength={1000} placeholder="Explain where and how customers can collect orders." />
              <SettingsTextArea label="Delivery information" value={contact.deliveryInformation} onChange={(event) => setContact({ ...contact, deliveryInformation: event.target.value })} maxLength={1000} placeholder="Explain how customers should choose delivery during checkout." />
            </div>
            <div>
              <SettingsField label="Google Maps embed URL" type="url" value={contact.mapEmbedUrl} onChange={(event) => setContact({ ...contact, mapEmbedUrl: event.target.value })} maxLength={2000} placeholder="https://www.google.com/maps/embed?pb=…" />
              <p className="mt-2 text-xs font-normal leading-5 text-muted">Paste the HTTPS iframe embed URL from Google Maps. No API key is required or stored.</p>
            </div>
            <SettingsSaveButton saving={isSaving} label="Save contact information" />
          </form>
        </SettingsPanel>
      </SettingsFormState>
    </div>
  )
}