interface SectionHeadingProps {
  id: string
  title: string
  hint: string
}

export function SectionHeading({ id, title, hint }: SectionHeadingProps) {
  return (
    <>
      <h2 id={id} className="text-xl font-bold tracking-[-0.02em] text-green-dark">{title}</h2>
      <p className="mt-1 text-sm font-normal text-muted">{hint}</p>
    </>
  )
}