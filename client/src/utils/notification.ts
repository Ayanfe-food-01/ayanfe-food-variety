export const formatNotificationTime = (value: string): string => {
  const timestamp = new Date(value).getTime()
  if (Number.isNaN(timestamp)) return 'Recently'

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000))
  if (elapsedSeconds < 60) return 'Just now'
  const minutes = Math.floor(elapsedSeconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}