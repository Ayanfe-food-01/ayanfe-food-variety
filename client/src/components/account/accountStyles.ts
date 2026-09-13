// Shared styling for the My Account area. Mirrors the checkout form language
// so the account page feels like part of the same storefront.
export const accountCardClassName =
  'rounded-3xl border border-line bg-white p-6 shadow-sm sm:p-8'

export const accountSectionHeadingClassName =
  'text-2xl font-bold tracking-[-0.03em] text-green-dark'

export const accountSectionDescriptionClassName =
  'mt-1 text-sm leading-6 text-muted'

export const accountFieldLabelClassName =
  'text-sm font-bold text-green-dark'

export const accountInputClassName = (hasError = false) =>
  `mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-green focus:ring-2 focus:ring-green/10 ${
    hasError ? 'border-orange' : 'border-line'
  }`

export const accountFieldErrorClassName = 'mt-1.5 text-xs font-medium text-orange'

export const accountInlineErrorClassName =
  'rounded-xl border border-orange/25 bg-orange/5 px-4 py-3 text-sm text-orange'

export const accountSequentialSelectGridClassName = 'mt-6 grid gap-6 sm:grid-cols-2'