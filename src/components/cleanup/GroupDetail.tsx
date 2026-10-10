'use client'

import { useEffect } from 'react'
import type { MailGroup, MessageMetadata } from '@/types'
import { formatBytes, formatListDate } from '@/lib/client/format'
import { CloseIcon } from '@/components/ui/Icons'

const SHOWN = 200

interface GroupDetailProps {
  group: MailGroup
  messages: MessageMetadata[]
  busy: boolean
  onClose: () => void
  onTrash: () => void
  onArchive: () => void
  onUnsubscribe: (alsoTrash: boolean) => void
}

/** Slide-over listing a group's messages so the user can check before deleting. */
export function GroupDetail({ group, messages, busy, onClose, onTrash, onArchive, onUnsubscribe }: GroupDetailProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const openHref = group.searchQuery ? `/mail?q=${encodeURIComponent(group.searchQuery)}` : null

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={onClose}>
      <aside role="dialog" aria-modal="true" aria-label={group.label}
        className="flex h-full w-full max-w-xl flex-col bg-surface shadow-xl" onClick={e => e.stopPropagation()}>
        <header className="flex items-start gap-3 border-b border-border p-4">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold">{group.label}</h2>
            <p className="truncate text-sm text-muted">
              {group.detail ? `${group.detail} · ` : ''}{group.messageCount.toLocaleString()} messages · {formatBytes(group.totalBytes)}
            </p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-full p-2 hover:bg-surface-muted"><CloseIcon /></button>
        </header>

        <div className="flex flex-wrap gap-2 border-b border-border p-4">
          {group.unsubscribe && (
            <>
              <button type="button" disabled={busy} onClick={() => onUnsubscribe(true)}
                className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground disabled:opacity-50">
                Unsubscribe and trash all
              </button>
              <button type="button" disabled={busy} onClick={() => onUnsubscribe(false)}
                className="rounded-full border border-border px-4 py-1.5 text-sm disabled:opacity-50">
                Unsubscribe only
              </button>
            </>
          )}
          <button type="button" disabled={busy} onClick={onTrash}
            className="rounded-full border border-border px-4 py-1.5 text-sm disabled:opacity-50">Trash all</button>
          <button type="button" disabled={busy} onClick={onArchive}
            className="rounded-full border border-border px-4 py-1.5 text-sm disabled:opacity-50">Archive all</button>
          {openHref && (
            <a href={openHref} className="rounded-full px-4 py-1.5 text-sm text-accent hover:underline">Open in Mail</a>
          )}
        </div>

        <ul className="flex-1 overflow-y-auto">
          {messages.slice(0, SHOWN).map(m => (
            <li key={m.id} className="border-b border-border px-4 py-2">
              <div className="flex items-baseline gap-2">
                <span className={`min-w-0 flex-1 truncate ${m.unread ? 'font-semibold' : ''}`}>{m.subject || '(no subject)'}</span>
                <span className="shrink-0 text-xs text-muted">{formatListDate(m.date)}</span>
              </div>
              <div className="truncate text-xs text-muted">
                {m.from ? (m.from.name ?? m.from.address) : 'Unknown sender'} · {formatBytes(m.sizeEstimate)}
              </div>
            </li>
          ))}
          {messages.length > SHOWN && (
            <li className="p-4 text-center text-sm text-muted">
              and {(messages.length - SHOWN).toLocaleString()} more
            </li>
          )}
        </ul>
      </aside>
    </div>
  )
}
