'use client'

import { useEffect, useRef } from 'react'

export type ShortcutMap = Record<string, () => void>

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

/**
 * Gmail-style single-key shortcuts, including two-key "g" sequences (g i).
 * Keys are matched on `event.key`; Shift-modified letters arrive uppercase.
 */
export function useKeyboardShortcuts(shortcuts: ShortcutMap, enabled: boolean): void {
  const latest = useRef(shortcuts)
  useEffect(() => { latest.current = shortcuts })

  useEffect(() => {
    if (!enabled) return
    let pendingG = 0

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return
      const now = Date.now()
      const key = pendingG && now - pendingG < 1200 ? `g ${e.key}` : e.key
      pendingG = 0

      if (key === 'g') { pendingG = now; return }
      const action = latest.current[key]
      if (action) {
        e.preventDefault()
        action()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}
