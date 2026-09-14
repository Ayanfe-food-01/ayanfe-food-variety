import type { StoreSettings } from '../../services/storeSettingsService'
import { ContactInfoCard } from './ContactInfoCard'
import { buildContactCards } from './contactData'

interface ContactInfoCardsProps {
  settings: StoreSettings | null
  isLoading: boolean
}

export function ContactInfoCards({ settings, isLoading }: ContactInfoCardsProps) {
  const cards = buildContactCards(settings, isLoading)

  if (cards.length === 0) return null

  return (
    <aside className="flex flex-col gap-4" aria-label="Contact details">
      {cards.map((item) => <ContactInfoCard key={item.id} item={item} />)}
    </aside>
  )
}