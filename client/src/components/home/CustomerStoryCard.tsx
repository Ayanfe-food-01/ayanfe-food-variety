import type { CustomerStory } from '../../services/storeSettingsService'

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

const FULL_STARS = 5

interface CustomerStoryCardProps {
  story: CustomerStory
}

export function CustomerStoryCard({ story }: CustomerStoryCardProps) {
  const rating = story.rating ?? 0

  return (
    <article className="flex h-full max-w-md flex-col rounded-3xl border border-line bg-white p-6 shadow-[0_0_5px_-28px_rgba(32,60,36,0.45)] sm:p-7">
      <div className="flex items-start gap-4">
        <span
          className="grid size-14 shrink-0 place-items-center rounded-full bg-sage text-base font-bold text-green-dark"
          aria-hidden="true"
        >
          {getInitials(story.authorName)}
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="m-0 truncate text-lg font-bold text-green-dark">{story.authorName}</h3>
          {story.rating ? (
            <div className="mt-1 flex items-center gap-1.5">
              <span className="font-bold text-green-dark">{story.rating}</span>
              <span
                className="flex text-lg leading-none tracking-[0.08em] text-orange"
                aria-label={`Rated ${story.rating} out of 5 stars`}
              >
                {Array.from({ length: FULL_STARS }, (_, index) => (
                  <span key={index} className={index < rating ? '' : 'text-line'} aria-hidden="true">
                    ★
                  </span>
                ))}
              </span>
            </div>
          ) : null}
        </div>

        <span className="font-display text-5xl leading-none text-sage" aria-hidden="true">
          ”
        </span>
      </div>

      <p className="mt-4 flex-1 text-base italic leading-relaxed text-muted">{story.content}</p>
    </article>
  )
}
