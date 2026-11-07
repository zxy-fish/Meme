import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import { Button } from './Button'

export function FloatingAction({
  onClick,
  label,
  children,
}: {
  onClick: () => void
  label: string
  children: ReactNode
}) {
  return createPortal(
    <Button
      variant="primary"
      onClick={onClick}
      aria-label={label}
      className="fixed bottom-24 right-5 z-40 h-12 w-12 rounded-full p-0 shadow-[0_16px_40px_-12px_rgba(232,176,106,0.65)] sm:hidden"
    >
      {children}
    </Button>,
    document.body,
  )
}
