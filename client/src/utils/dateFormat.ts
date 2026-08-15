const dateOptions: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
}

const dateTimeOptions: Intl.DateTimeFormatOptions = {
  ...dateOptions,
  hour: 'numeric',
  minute: '2-digit',
}

export const formatDate = (value: string, includeTime = false): string =>
  new Intl.DateTimeFormat('en-NG', includeTime ? dateTimeOptions : dateOptions).format(new Date(value))