export function ContactInfoCardSkeleton() {
  return (
    <article className="flex items-start gap-4 rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6" aria-hidden="true">
      <span className="grid size-11 shrink-0 place-items-center">
        <span className="size-11 animate-pulse rounded-full bg-sage/70" />
      </span>
      <div className="min-w-0 flex-1">
        <span className="block h-2.5 w-20 animate-pulse rounded-full bg-sage/70" />
        <span className="mt-3 block h-4 w-44 animate-pulse rounded-full bg-sage/70" />
        <span className="mt-3 block h-3 w-24 animate-pulse rounded-full bg-sage/70" />
      </div>
    </article>
  )
}