import { useEffect, useState } from 'react'
import { cn, gradientFor, initials } from '@/lib/utils'

export function Cover({
  src,
  title,
  className,
  imgClassName,
  rounded = 'rounded-2xl',
  eager = false,
}: {
  src?: string
  title: string
  className?: string
  imgClassName?: string
  rounded?: string
  eager?: boolean
}) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [src])

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-surface-2',
        rounded,
        'shadow-[0_18px_40px_-24px_rgba(0,0,0,0.8)]',
        className,
      )}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={title}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailed(true)}
          className={cn('h-full w-full object-cover', imgClassName)}
        />
      ) : (
        <div
          className="flex h-full w-full flex-col justify-between p-[12%] text-white"
          style={{ backgroundImage: gradientFor(title) }}
        >
          <span className="text-[9px] font-medium uppercase tracking-[0.22em] text-white/55">
            Meme · Library
          </span>
          <div>
            <div className="whitespace-nowrap font-display text-[clamp(18px,2.6vw,40px)] font-semibold leading-tight tracking-wide">
              {initials(title)}
            </div>
            <div className="mt-1 line-clamp-2 text-[11px] leading-snug text-white/65">{title}</div>
          </div>
          <div className="h-px w-8 bg-white/30" />
        </div>
      )}
    </div>
  )
}
