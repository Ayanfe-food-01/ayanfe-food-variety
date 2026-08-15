export const checkoutInputClassName = (hasError: boolean) =>
  `mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-green focus:ring-2 focus:ring-green/10 ${
    hasError ? 'border-orange' : 'border-line'
  }`