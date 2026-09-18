interface AnnouncementTickerProps {
  messages: string[]
}

export function AnnouncementTicker({ messages }: AnnouncementTickerProps) {
  if (messages.length === 0) return null

  return (
    <div className="flex items-center justify-center overflow-hidden bg-green-dark text-cream font-semibold tracking-[0.04em] min-h-[21px] text-[10px] md:min-h-[27px] md:text-[11px]" aria-label="Store announcements">
      <div className="overflow-hidden w-full whitespace-nowrap">
        <div className="flex w-max animate-ticker">
          {[0, 1].map((group) => (
            <div className="flex flex-none items-center" aria-hidden={group === 1} key={group}>
              {messages.map((message, index) => (
                <span className="inline-flex items-center" key={`${group}-${index}-${message}`}>
                  {message}
                  <span className="inline-block mx-[28px] text-orange" aria-hidden="true">•</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
