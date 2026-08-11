interface StatCardProps {
  label: string
  value: string | number
  detail: string
  accent?: 'green' | 'orange'
}

export function StatCard({ label, value, detail, accent = 'green' }: StatCardProps) {
  return (
    <article className="rounded-2xl border border-line bg-white p-5 shadow-sm">
      <div className={`mb-6 size-2.5 rounded-full ${accent === 'orange' ? 'bg-orange' : 'bg-green'}`} />
      <p className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-[-0.04em] text-green-dark">{value}</p>
      <p className="mt-2 text-xs text-muted">{detail}</p>
    </article>
  )
}