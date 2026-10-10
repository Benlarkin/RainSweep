'use client'

import { CloseIcon } from '@/components/ui/Icons'

export const SHORTCUTS: ReadonlyArray<[string, string]> = [
  ['c', 'Compose'],
  ['/', 'Search'],
  ['j / k', 'Next / previous conversation'],
  ['o or Enter', 'Open conversation'],
  ['x', 'Select conversation'],
  ['*', 'Select all / none'],
  ['u or Esc', 'Back to list'],
  ['e', 'Archive'],
  ['#', 'Delete'],
  ['s', 'Star / unstar'],
  ['Shift + I', 'Mark as read'],
  ['Shift + U', 'Mark as unread'],
  ['r', 'Reply'],
  ['a', 'Reply all'],
  ['f', 'Forward'],
  ['g then i', 'Go to Inbox'],
  ['g then s', 'Go to Starred'],
  ['g then t', 'Go to Sent'],
  ['g then c', 'Go to Clean up'],
  ['Ctrl/⌘ + Enter', 'Send message'],
  ['?', 'Show this help'],
]

export function ShortcutsHelp({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" onClick={e => e.stopPropagation()}
        className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-xl bg-surface p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Keyboard shortcuts</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="text-muted hover:text-foreground"><CloseIcon /></button>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          {SHORTCUTS.map(([keys, action]) => (
            <div key={keys} className="contents">
              <dt><kbd className="rounded border border-border bg-surface-muted px-1.5 py-0.5 font-mono text-xs">{keys}</kbd></dt>
              <dd className="text-muted">{action}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}
