import { useEffect, useState, type FormEvent } from 'react'
import { ApiError } from '../../services/api'
import {
  getStoreBranding,
  getStoreInformation,
  updateStoreBranding,
  updateStoreInformation,
  type StoreBranding,
  type StoreInformation,
} from '../../services/adminService'
import { useToast } from '../../components/ui/Toast'
import { SettingsField, SettingsFormState, SettingsPageHeader, SettingsPanel, SettingsSaveButton, SettingsTextArea } from '../../components/admin/SettingsForm'
import { ImageUploadField } from '../../components/admin/ImageUploadField'

const emptyStore: StoreInformation = { businessName: '', callToOrderPhone: '', announcementText: '', address: '', description: '' }
const emptyBranding: StoreBranding = { logoUrl: null, faviconUrl: null }

const validateSquareFavicon = (file: File): Promise<string | null> => new Promise((resolve) => {
  const previewUrl = URL.createObjectURL(file)
  const image = new Image()
  image.onload = () => {
    URL.revokeObjectURL(previewUrl)
    resolve(image.naturalWidth > 0 && image.naturalWidth === image.naturalHeight
      ? null
      : 'Favicon images must be square so browsers can display them correctly.')
  }
  image.onerror = () => {
    URL.revokeObjectURL(previewUrl)
    resolve('This favicon image could not be read. Choose a valid PNG, JPG, or WEBP image.')
  }
  image.src = previewUrl
})

export function StoreSettings() {
  const [store, setStore] = useState(emptyStore)
  const [branding, setBranding] = useState(emptyBranding)
  const [logoFile, setLogoFile] = useState<File | undefined>()
  const [faviconFile, setFaviconFile] = useState<File | undefined>()
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null)
  const [logoError, setLogoError] = useState<string | null>(null)
  const [faviconError, setFaviconError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isBrandingSaving, setIsBrandingSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { showToast } = useToast()

  useEffect(() => {
    Promise.all([getStoreInformation(), getStoreBranding()])
      .then(([settings, currentBranding]) => {
        if (settings) setStore(settings)
        setBranding(currentBranding)
      })
      .catch((caught: unknown) => setError(caught instanceof ApiError ? caught.message : 'Store information could not be loaded.'))
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => () => {
    if (logoPreview) URL.revokeObjectURL(logoPreview)
    if (faviconPreview) URL.revokeObjectURL(faviconPreview)
  }, [faviconPreview, logoPreview])

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

  const submitBranding = async (event: FormEvent) => {
    event.preventDefault()
    if (!logoFile && !faviconFile) {
      showToast('Choose a logo or favicon before saving.', 'error')
      return
    }
    setIsBrandingSaving(true)
    try {
      setBranding(await updateStoreBranding({ logo: logoFile, favicon: faviconFile }))
      setLogoFile(undefined)
      setFaviconFile(undefined)
      setLogoPreview(null)
      setFaviconPreview(null)
      showToast('Branding updated.', 'success')
    } catch (caught) {
      showToast(caught instanceof ApiError ? caught.message : 'Branding could not be saved.', 'error')
    } finally {
      setIsBrandingSaving(false)
    }
  }

  const resetBrandingAsset = async (asset: 'logo' | 'favicon') => {
    setIsBrandingSaving(true)
    try {
      const updatedBranding = await updateStoreBranding(asset === 'logo' ? { removeLogo: true } : { removeFavicon: true })
      setBranding(updatedBranding)
      if (asset === 'logo') {
        if (logoPreview) URL.revokeObjectURL(logoPreview)
        setLogoFile(undefined)
        setLogoPreview(null)
        setLogoError(null)
      } else {
        if (faviconPreview) URL.revokeObjectURL(faviconPreview)
        setFaviconFile(undefined)
        setFaviconPreview(null)
        setFaviconError(null)
      }
      showToast(`${asset === 'logo' ? 'Logo' : 'Favicon'} reset to the default asset.`, 'success')
    } catch (caught) {
      showToast(caught instanceof ApiError ? caught.message : 'Branding could not be reset.', 'error')
    } finally {
      setIsBrandingSaving(false)
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
        <SettingsPanel className="mt-10" eyebrow="Brand identity" title="Logo and favicon" description="Choose the images customers see on your storefront and in their browser tabs.">
          <form className="space-y-6" onSubmit={submitBranding}>
            <div className="grid gap-6 lg:grid-cols-2">
              <ImageUploadField
                label="Website logo"
                helperText="JPG, PNG, WEBP, or HEIC/HEIF up to 5 MB. Transparent PNG and WEBP logos are supported."
                alt="Current website logo"
                currentUrl={branding.logoUrl}
                previewUrl={logoPreview}
                error={logoError ?? undefined}
                previewClassName="h-40 w-full max-w-md rounded-2xl bg-sage/30 object-contain p-4"
                 onReset={() => void resetBrandingAsset('logo')}
                 isResetting={isBrandingSaving}
                onChange={(file, previewUrl, uploadError) => {
                  if (logoPreview) URL.revokeObjectURL(logoPreview)
                  setLogoFile(file)
                  setLogoPreview(previewUrl)
                  setLogoError(uploadError)
                }}
              />
              <ImageUploadField
                label="Favicon"
                helperText="Square PNG, JPG, or WEBP up to 5 MB. A square image is required for browser compatibility."
                alt="Current favicon"
                currentUrl={branding.faviconUrl}
                previewUrl={faviconPreview}
                error={faviconError ?? undefined}
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                previewClassName="mt-3 size-32 rounded-2xl bg-sage/30 object-contain p-5"
                validateFile={validateSquareFavicon}
                 onReset={() => void resetBrandingAsset('favicon')}
                 isResetting={isBrandingSaving}
                onChange={(file, previewUrl, uploadError) => {
                  if (faviconPreview) URL.revokeObjectURL(faviconPreview)
                  setFaviconFile(file)
                  setFaviconPreview(previewUrl)
                  setFaviconError(uploadError)
                }}
              />
            </div>
            <SettingsSaveButton saving={isBrandingSaving} label="Save branding" />
          </form>
        </SettingsPanel>
      </SettingsFormState>
    </div>
  )
}