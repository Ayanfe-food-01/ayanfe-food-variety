function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'C'
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

interface IdentityHeaderProps {
  name: string
  email: string
}

export function IdentityHeader({ name, email }: IdentityHeaderProps) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <span className="inline-flex size-16 items-center justify-center rounded-full bg-sage text-2xl font-bold text-green">
        {initialsOf(name)}
      </span>
      <div className="min-w-0">
        <p className="text-xl font-bold tracking-[-0.02em] text-green-dark">{name}</p>
        <p className="mt-0.5 text-sm text-muted">{email}</p>
      </div>
    </div>
  )
}