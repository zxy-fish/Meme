import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STATUS_LABELS, type MediaStatus } from '@/lib/types'

const STATUS_STYLES: Record<MediaStatus, string> = {
  doing: 'bg-accent text-accent-ink',
  wish: 'bg-teal/15 text-teal',
  done: 'bg-ok/15 text-ok',
  onhold: 'bg-surface-3 text-muted',
  dropped: 'bg-danger/10 text-danger',
}

export function StatusBadge({
  status,
  className,
  size = 'sm',
}: {
  status: MediaStatus
  className?: string
  size?: 'sm' | 'md'
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium backdrop-blur-md',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]',
        STATUS_STYLES[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

export function Rating({ value, className }: { value?: number; className?: string }) {
  if (value === undefined || value === null) return null
  return (
    <span className={cn('inline-flex items-center gap-1 text-[12px] font-medium text-accent', className)}>
      <Star size={12} className="fill-accent" />
      {value.toFixed(1)}
    </span>
  )
}

export function RatingPicker({
  value,
  onChange,
}: {
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {Array.from({ length: 10 }, (_, index) => index + 1).map((score) => (
        <button
          key={score}
          type="button"
          onClick={() => onChange(value === score ? 0 : score)}
          className={cn(
            'h-7 w-7 rounded-md text-[11px] font-medium transition-colors',
            score <= value
              ? 'bg-accent text-accent-ink'
              : 'bg-surface-2 text-faint hover:bg-surface-3 hover:text-ink-soft',
          )}
          aria-label={`评分 ${score}`}
        >
          {score}
        </button>
      ))}
      <span className="ml-2 text-[12px] text-muted">{value > 0 ? `${value}.0` : '未评分'}</span>
    </div>
  )
}
