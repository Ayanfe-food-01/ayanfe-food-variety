import type { StoreSettings } from '../../services/storeSettingsService'

interface ContactMapProps {
  settings: StoreSettings | null
  isLoading: boolean
}

export function ContactMap({ settings, isLoading }: ContactMapProps) {
  const businessName = settings?.businessName?.trim() || 'Ayanfe Food Variety'
  const mapEmbedUrl = settings?.mapEmbedUrl?.trim()

  return (
    <section className="container py-14 sm:py-18 lg:py-24" aria-labelledby="contact-map-heading">
      <div className="mx-auto max-w-2xl text-center">
        <p className="mb-3 flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-orange">
          <span className="inline-block size-2 rounded-full bg-orange" /> Pickup location
        </p>
        <h2 id="contact-map-heading" className="m-0 text-3xl font-bold tracking-[-0.04em] text-green-dark sm:text-4xl">
          Where to find us.
        </h2>
        <p className="mt-4 text-base leading-7 text-muted">
          Visit the store to pick up an order or say hello in person. Please confirm the address before visiting.
        </p>
      </div>

      <div className="mt-10 overflow-hidden rounded-3xl border border-line bg-sage/30">
        {mapEmbedUrl ? (
          <iframe
            className="aspect-[16/9] min-h-[320px] w-full border-0 sm:min-h-[380px]"
            src={mapEmbedUrl}
            title={`${businessName} pickup location map`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        ) : (
          <div className="flex min-h-[320px] items-center justify-center p-8 text-center sm:min-h-[380px]">
            <div className="max-w-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">Store map</p>
              <p className="mt-3 text-sm leading-6 text-muted">
                {isLoading
                  ? 'Loading map…'
                  : 'The store map will appear here once the admin adds a Google Maps embed URL in Store Settings.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}