import { VerifiedPurchaseBadge } from '../reviews/VerifiedPurchaseBadge'
import type { CustomerStory } from '../../services/storeSettingsService'

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

interface CustomerStoryCardProps {
  story: CustomerStory
}

export function CustomerStoryCard({ story }: CustomerStoryCardProps) {
  return (
    <article className="flex h-full flex-col rounded-3xl border border-line bg-white p-6 shadow-sm sm:p-7">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="grid size-10 shrink-0 place-items-center rounded-full bg-sage text-xs font-bold text-green-dark"
            aria-hidden="true"
          >
            {getInitials(story.authorName)}
          </span>
          <p className="m-0 truncate text-xs font-bold uppercase tracking-[0.14em] text-muted">
            {story.authorName}
          </p>
        </div>
        {story.rating ? (
          <span className="text-lg leading-none tracking-[0.1em] text-orange" aria-label={`${story.rating} out of 5 stars`}>
            {'★'.repeat(story.rating)}
          </span>
        ) : null}
      </div>
      {story.type === 'review' && story.verifiedPurchase ? (
        <p className="mt-4"><VerifiedPurchaseBadge /></p>
      ) : null}
      <p className={`line-clamp-3 flex-1 text-base leading-7 text-green-dark ${story.type === 'review' && story.verifiedPurchase ? 'mt-4' : 'mt-5'}`}>{story.content}</p>
    </article>
  )
}