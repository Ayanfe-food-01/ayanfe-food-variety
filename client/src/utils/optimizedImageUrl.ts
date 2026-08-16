export function optimizedImageUrl(url: string, width: number): string {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/image/upload/')) return url
  if (/\/image\/upload\/[^/]*(?:f_auto|q_auto|w_\d+)/.test(url)) return url
  return url.replace('/image/upload/', `/image/upload/f_auto,q_auto,w_${width}/`)
}