'use client'

import { useEffect } from 'react'

export interface ToastState {
  id: number
  message: string
  actionLabel?: string
  onAction?: () => void
  tone?: 'default' | 'error'
  durationMs?: number
}

export function Toast({ toast, onDismiss }: { toast: ToastState | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(onDismiss, toast.durationMs ?? 6000)
    return () => clearTimeout(timer)
  }, [toast, onDismiss])

  if (!toast) return null
  return (
    <div role="status" aria-live="polite"
      className={`fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-lg px-4 py-3 text-sm shadow-lg ${
        toast.tone === 'error' ? 'bg-red-700 text-white' : 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
      }`}>
      <span>{toast.message}</span>
      {toast.actionLabel && toast.onAction && (
        <button type="button" className="font-semibold text-blue-300 hover:underline dark:text-blue-700"
          onClick={() => { toast.onAction?.(); onDismiss() }}>
          {toast.actionLabel}
        </button>
      )}
    </div>
  )
}
