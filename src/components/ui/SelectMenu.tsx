import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
  hint?: string
}

/**
 * A styled dropdown. Native <select> menus follow the OS look (macOS renders a
 * blue system menu), which clashes with the app's palette, so everything that
 * used to be a <select> goes through this instead.
 */
export function SelectMenu({
  value,
  options,
  onChange,
  className,
  panelClassName,
  size = 'md',
  align = 'left',
  placeholder = '请选择',
  ariaLabel,
  disabled,
}: {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  className?: string
  panelClassName?: string
  size?: 'sm' | 'md'
  align?: 'left' | 'right'
  placeholder?: string
  ariaLabel?: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const current = options.find((option) => option.value === value)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (disabled) setOpen(false)
  }, [disabled])

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-lg border border-line bg-surface text-ink transition-colors',
          'hover:border-line-strong disabled:pointer-events-none disabled:opacity-50',
          size === 'sm' ? 'h-8 px-2.5 text-[12px]' : 'h-9 px-3 text-[12px]',
        )}
      >
        <span className={cn('truncate', !current && 'text-faint')}>{current?.label ?? placeholder}</span>
        <ChevronDown
          size={13}
          className={cn('shrink-0 text-faint transition-transform', open && 'rotate-180')}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          className={cn(
            'absolute z-50 mt-1 max-h-64 min-w-full overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-[0_18px_40px_-20px_rgba(0,0,0,0.45)]',
            align === 'right' ? 'right-0' : 'left-0',
            panelClassName,
          )}
        >
          {options.map((option) => {
            const selected = option.value === value
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] transition-colors',
                  selected ? 'bg-accent-soft text-accent' : 'text-ink-soft hover:bg-surface-2 hover:text-ink',
                )}
              >
                <span className="flex-1 whitespace-nowrap">{option.label}</span>
                {option.hint ? <span className="text-[10.5px] text-faint">{option.hint}</span> : null}
                {selected ? <Check size={12} className="shrink-0" /> : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
