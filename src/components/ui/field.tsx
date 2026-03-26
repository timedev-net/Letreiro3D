import {
  useState,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { cn } from '../../lib/utils'

export function FieldLabel({
  children,
  hint,
}: {
  children: string
  hint?: string
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-sm font-semibold text-white">{children}</span>
      {hint ? <span className="text-xs leading-5 text-[var(--muted)]">{hint}</span> : null}
    </label>
  )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'h-12 w-full min-w-0 rounded-2xl border border-[var(--border)] bg-[rgba(7,11,20,0.72)] px-4 text-sm text-white outline-none ring-0 transition placeholder:text-[var(--muted-2)] focus:border-[var(--border-strong)] focus:bg-[rgba(10,16,28,0.92)]',
        props.className,
      )}
    />
  )
}

type NumberInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'onChange'
> & {
  value?: number
  onValueChange: (value: number | undefined) => void
  allowEmpty?: boolean
}

function formatNumberValue(value?: number) {
  return value === undefined || Number.isNaN(value) ? '' : String(value)
}

function clampNumber(value: number, min?: number, max?: number) {
  if (min !== undefined && value < min) {
    return min
  }
  if (max !== undefined && value > max) {
    return max
  }
  return value
}

function toOptionalNumber(value: number | string | undefined) {
  if (typeof value === 'number') {
    return value
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

export function NumberInput({
  value,
  onValueChange,
  allowEmpty = false,
  min,
  max,
  onBlur,
  onFocus,
  onKeyDown,
  ...props
}: NumberInputProps) {
  const [draft, setDraft] = useState(() => formatNumberValue(value))
  const [isFocused, setIsFocused] = useState(false)

  function commit(nextDraft = draft) {
    const trimmed = nextDraft.trim()

    if (!trimmed) {
      if (allowEmpty) {
        setDraft('')
        onValueChange(undefined)
      } else {
        setDraft(formatNumberValue(value))
      }
      return
    }

    const normalized = trimmed.replace(',', '.')
    const parsed = Number(normalized)
    const minValue = toOptionalNumber(min)
    const maxValue = toOptionalNumber(max)

    if (!Number.isFinite(parsed)) {
      setDraft(formatNumberValue(value))
      return
    }

    const clamped = clampNumber(parsed, minValue, maxValue)
    setDraft(formatNumberValue(clamped))
    onValueChange(clamped)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      commit()
      event.currentTarget.blur()
    }
    onKeyDown?.(event)
  }

  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      value={isFocused ? draft : formatNumberValue(value)}
      onFocus={(event) => {
        setDraft(formatNumberValue(value))
        setIsFocused(true)
        onFocus?.(event)
      }}
      onChange={(event) => {
        const nextValue = event.target.value
        if (/^-?\d*([.,]\d*)?$/.test(nextValue) || nextValue === '') {
          setDraft(nextValue)
        }
      }}
      onBlur={(event) => {
        setIsFocused(false)
        commit(event.target.value)
        onBlur?.(event)
      }}
      onKeyDown={handleKeyDown}
    />
  )
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        'h-12 w-full min-w-0 appearance-none rounded-2xl border border-[var(--border)] bg-[rgba(7,11,20,0.72)] px-4 pr-11 text-sm text-white outline-none ring-0 transition focus:border-[var(--border-strong)] focus:bg-[rgba(10,16,28,0.92)]',
        props.className,
      )}
    />
  )
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        'min-h-32 w-full min-w-0 rounded-3xl border border-[var(--border)] bg-[rgba(7,11,20,0.72)] px-4 py-3.5 text-sm leading-6 text-white outline-none ring-0 transition placeholder:text-[var(--muted-2)] focus:border-[var(--border-strong)] focus:bg-[rgba(10,16,28,0.92)]',
        props.className,
      )}
    />
  )
}
