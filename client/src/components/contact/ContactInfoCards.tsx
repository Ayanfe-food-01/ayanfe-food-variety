import type { StoreSettings } from '../../services/storeSettingsService'
import { ContactInfoCard } from './ContactInfoCard'
import { ContactInfoCardSkeleton } from './ContactInfoCardSkeleton'
import { buildContactCards } from './contactData'

const SKELETON_COUNT = 4

interface ContactInfoCardsProps {
  settings: StoreSettings | null
  isLoading: boolean
}

export function ContactInfoCards({ settings, isLoading }: ContactInfoCardsProps) {
  if (isLoading) {
    return (
      <aside className="flex flex-col gap-4" aria-label="Contact details" aria-busy="true">
        <span className="sr-only">Loading contact details</span>
        {Array.from({ length: SKELETON_COUNT }, (_, index) => <ContactInfoCardSkeleton key={index} />)}
      </aside>
    )
  }

  const cards = buildContactCards(settings, false)

  if (cards.length === 0) return null

  return (
    <aside className="flex flex-col gap-4" aria-label="Contact details">
      {cards.map((item) => <ContactInfoCard key={item.id} item={item} />)}
    </aside>
  )
}