import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition duration-150 disabled:cursor-not-allowed disabled:opacity-40',
  {
    variants: {
      variant: {
        primary:
          'border-transparent bg-[var(--primary)] text-slate-950 hover:bg-[var(--primary-2)]',
        secondary:
          'border-[var(--border)] bg-white/4 text-white hover:border-[var(--border-strong)] hover:bg-white/8',
        ghost:
          'border-transparent bg-transparent text-[var(--muted)] hover:bg-white/6 hover:text-white',
      },
    },
    defaultVariants: {
      variant: 'secondary',
    },
  },
)

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>
>

export function Button({ className, variant, children, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant }), className)} {...props}>
      {children}
    </button>
  )
}
