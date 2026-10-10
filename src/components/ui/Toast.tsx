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
      className={`fixed bottom-5 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-5 px-5 py-3 shadow-lg ${
        toast.tone === 'error' ? 'bg-marker text-accent-foreground' : 'bg-foreground text-background'
      }`}>
      <span>{toast.message}</span>
      {toast.actionLabel && toast.onAction && (
        <button type="button" className="font-mono text-xs uppercase tracking-[0.08em] underline-offset-4 hover:underline"
          onClick={() => { toast.onAction?.(); onDismiss() }}>
          {toast.actionLabel}
        </button>
      )}
    </div>
  )
}
