export const checkoutInputClassName = (hasError: boolean) =>
  `mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-green focus:ring-2 focus:ring-green/10 ${
    hasError ? 'border-orange' : 'border-line'
  }`

export const checkoutFieldsetClassName = 'm-0 border-0 p-0'
export const checkoutSeparatedFieldsetClassName = `${checkoutFieldsetClassName} border-t border-line pt-10`
export const checkoutLegendClassName = 'mt-2 block text-2xl font-bold tracking-[-0.03em] text-green-dark'
export const checkoutDescriptionClassName = 'mt-3 text-sm leading-6 text-muted'
export const checkoutFieldGridClassName = 'mt-6 grid gap-6 sm:grid-cols-2'