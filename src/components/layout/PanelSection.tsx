import type { PropsWithChildren } from 'react'

export function PanelSection({
  title,
  subtitle,
  children,
}: PropsWithChildren<{ title: string; subtitle?: string }>) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight text-white">{title}</h2>
        {subtitle ? (
          <p className="text-sm text-[var(--muted)]">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </section>
  )
}
