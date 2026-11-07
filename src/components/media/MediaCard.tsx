import { Link } from 'react-router-dom'
import { Heart, Star } from 'lucide-react'
import { Cover } from '@/components/ui/Cover'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { regionLabel } from '@/lib/countries'
import { TYPE_LABELS, UNIT_LABELS, type MediaItem } from '@/lib/types'
import { cn, percentOf } from '@/lib/utils'

export function MediaCard({ item, index = 0 }: { item: MediaItem; index?: number }) {
  const progress = percentOf(item.progressCurrent, item.progressTotal)
  const unit = UNIT_LABELS[item.progressUnit]
  const classification = [item.year, regionLabel(item.type, item.country)].filter(Boolean).join(' · ')

  return (
    <Link
      to={`/item/${item.id}`}
      className="group block animate-fade-up"
      style={{ animationDelay: `${Math.min(index, 12) * 28}ms` }}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-surface-2">
        <Cover
          src={item.cover}
          title={item.title}
          className="h-full w-full transition-transform duration-500 ease-out group-hover:scale-[1.035]"
          rounded="rounded-2xl"
        />

        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-t from-black/65 via-black/0 to-black/10 opacity-80 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2.5">
          <StatusBadge status={item.status} />
          {item.favorite ? (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/35 backdrop-blur-md">
              <Heart size={12} className="fill-accent text-accent" />
            </span>
          ) : null}
        </div>

        <div className="absolute inset-x-0 bottom-0 p-2.5">
          {item.status === 'doing' && item.progressTotal ? (
            <>
              <div className="mb-1.5 flex items-center justify-between text-[10px] text-white/75">
                <span>
                  {item.progressCurrent} / {item.progressTotal} {unit}
                </span>
                <span className="tabular-nums">{progress}%</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-white/20">
                <div className="h-full rounded-full bg-accent" style={{ width: `${progress}%` }} />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between text-[10px] text-white/70">
              <span>
                {item.year ?? '—'} · {TYPE_LABELS[item.type]}
              </span>
              <span className="flex items-center gap-0.5">
                {item.rating ? (
                  <>
                    <Star size={9} className="fill-accent text-accent" />
                    {item.rating.toFixed(1)}
                  </>
                ) : null}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-2.5 px-0.5">
        <h3 className="truncate text-[13.5px] font-medium tracking-tight text-ink transition-colors group-hover:text-accent">
          {item.title}
        </h3>
        <p className={cn('mt-0.5 truncate text-[11px] text-faint', item.status === 'doing' && 'text-muted')}>
          {item.status === 'doing' && item.progressTotal
            ? `${classification} · 看到第 ${item.progressCurrent} ${unit}`
            : classification}
        </p>
      </div>
    </Link>
  )
}
