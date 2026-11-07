import { createPortal } from 'react-dom'
import { CheckCircle2, X, XCircle } from 'lucide-react'
import { useToastStore } from '@/store/toast'
import { cn } from '@/lib/utils'

export function Toaster() {
  const items = useToastStore((state) => state.items)
  const dismiss = useToastStore((state) => state.dismiss)

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-8">
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            'pointer-events-auto flex max-w-md items-center gap-2.5 rounded-full border border-line bg-surface-2/95 px-4 py-2.5 text-[13px] text-ink shadow-[var(--shadow-soft)] backdrop-blur-xl animate-fade-up',
            item.tone === 'error' && 'border-danger/30',
          )}
        >
          {item.tone === 'success' ? (
            <CheckCircle2 size={15} className="shrink-0 text-ok" />
          ) : item.tone === 'error' ? (
            <XCircle size={15} className="shrink-0 text-danger" />
          ) : null}
          <span className="min-w-0 flex-1">{item.message}</span>
          <button
            type="button"
            onClick={() => dismiss(item.id)}
            className="text-faint transition-colors hover:text-ink"
            aria-label="关闭提示"
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  )
}
