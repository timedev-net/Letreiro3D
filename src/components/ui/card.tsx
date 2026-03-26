import type { HTMLAttributes, PropsWithChildren } from 'react'
import { cn } from '../../lib/utils'

export function Card({
  className,
  children,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background-panel)] shadow-[var(--shadow-lg)] backdrop-blur',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
