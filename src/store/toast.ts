import { create } from 'zustand'
import { uuid } from '@/lib/utils'

export type ToastTone = 'default' | 'success' | 'error'

export interface ToastItem {
  id: string
  message: string
  tone: ToastTone
}

interface ToastState {
  items: ToastItem[]
  push: (message: string, tone?: ToastTone) => void
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  items: [],
  push: (message, tone = 'default') => {
    const id = uuid()
    set((state) => ({ items: [...state.items, { id, message, tone }] }))
    window.setTimeout(() => {
      set((state) => ({ items: state.items.filter((item) => item.id !== id) }))
    }, 3200)
  },
  dismiss: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
}))

export function toast(message: string, tone: ToastTone = 'default') {
  useToastStore.getState().push(message, tone)
}
