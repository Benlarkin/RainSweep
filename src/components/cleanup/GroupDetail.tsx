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
    <div className="fixed inset-0 z-40 flex justify-end bg-foreground/25" onClick={onClose}>
      <aside role="dialog" aria-modal="true" aria-label={group.label}
        className="flex h-full w-full max-w-xl flex-col border-l-[1.5px] border-foreground bg-letter shadow-xl" onClick={e => e.stopPropagation()}>
        <header className="flex items-start gap-3 border-b-[1.5px] border-foreground px-6 py-5">
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-2xl font-semibold tracking-tight">{group.label}</h2>
            <p className="truncate italic text-muted">
              {group.detail ? `${group.detail} · ` : ''}{group.messageCount.toLocaleString()} messages · {formatBytes(group.totalBytes)}
            </p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="p-2 text-muted hover:text-foreground"><CloseIcon /></button>
        </header>

        <div className="flex flex-wrap gap-2 border-b border-border px-6 py-4">
          {group.unsubscribe && (
            <>
              <button type="button" disabled={busy} onClick={() => onUnsubscribe(true)}
                className="bg-foreground px-4 py-2 font-mono text-xs uppercase tracking-[0.08em] text-background disabled:opacity-50">
                Unsubscribe and trash all
              </button>
              <button type="button" disabled={busy} onClick={() => onUnsubscribe(false)}
                className="border border-foreground px-4 py-2 font-mono text-xs uppercase tracking-[0.08em] transition hover:bg-surface-muted disabled:opacity-50">
                Unsubscribe only
              </button>
            </>
          )}
          <button type="button" disabled={busy} onClick={onTrash}
            className="border border-foreground px-4 py-2 font-mono text-xs uppercase tracking-[0.08em] transition hover:bg-surface-muted disabled:opacity-50">Trash all</button>
          <button type="button" disabled={busy} onClick={onArchive}
            className="border border-foreground px-4 py-2 font-mono text-xs uppercase tracking-[0.08em] transition hover:bg-surface-muted disabled:opacity-50">Archive all</button>
          {openHref && (
            <a href={openHref} className="meta px-2 py-2 text-accent hover:text-foreground">Open in mail</a>
          )}
        </div>

        <ul className="flex-1 overflow-y-auto">
          {messages.slice(0, SHOWN).map(m => (
            <li key={m.id} className="border-b border-border px-6 py-2.5">
              <div className="flex items-baseline gap-2">
                <span className={`min-w-0 flex-1 truncate ${m.unread ? 'font-semibold' : ''}`}>{m.subject || '(no subject)'}</span>
                <span className="meta shrink-0">{formatListDate(m.date)}</span>
              </div>
              <div className="truncate text-[0.9rem] italic text-muted">
                {m.from ? (m.from.name ?? m.from.address) : 'Unknown sender'} · {formatBytes(m.sizeEstimate)}
              </div>
            </li>
          ))}
          {messages.length > SHOWN && (
            <li className="p-5 text-center italic text-muted">
              and {(messages.length - SHOWN).toLocaleString()} more
            </li>
          )}
        </ul>
      </aside>
    </div>
  )
}
