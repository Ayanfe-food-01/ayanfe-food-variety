interface FormErrorBannerProps {
  message: string | null
}

export function FormErrorBanner({ message }: FormErrorBannerProps) {
  if (!message) return null
  return (
    <p className="rounded-xl border border-orange/25 bg-orange/5 px-4 py-3 text-sm font-medium text-orange" role="alert">
      {message}
    </p>
  )
}