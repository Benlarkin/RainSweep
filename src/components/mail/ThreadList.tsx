'use client'

import { useEffect, useRef } from 'react'
import type { ThreadSummary } from '@/types'
import type { ThreadAction } from '@/managers/mailbox/MailboxRequests'
import { AddressUtility } from '@/utilities/AddressUtility'
import { formatListDate } from '@/lib/client/format'
import { ArchiveIcon, StarIcon, TrashIcon, MailIcon, MailOpenIcon } from '@/components/ui/Icons'

interface ThreadListProps {
  threads: ThreadSummary[]
  selectedId: string | null
  checkedIds: Set<string>
  focusIndex: number
  loading: boolean
  loadingMore: boolean
  error: string | null
  hasMore: boolean
  emptyMessage: string
  onOpen: (id: string) => void
  onFocus: (index: number) => void
  onToggleChecked: (id: string) => void
  onAction: (id: string, action: ThreadAction) => void
  onLoadMore: () => void
  onRetry: () => void
}

export function ThreadList(props: ThreadListProps) {
  const { threads, selectedId, focusIndex, loading, error, hasMore, onLoadMore } = props
  const sentinel = useRef<HTMLDivElement>(null)
  const focusedRow = useRef<HTMLLIElement>(null)

  // Infinite scroll: fetch the next page as the end of the list comes into view.
  useEffect(() => {
    const el = sentinel.current
    if (!el || !hasMore) return
    const observer = new IntersectionObserver(entries => { if (entries[0]?.isIntersecting) onLoadMore() }, { rootMargin: '400px' })
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, onLoadMore])

  useEffect(() => { focusedRow.current?.scrollIntoView({ block: 'nearest' }) }, [focusIndex])

  if (loading && threads.length === 0) {
    return (
      <ul aria-busy="true" aria-label="Loading conversations" className="divide-y divide-border">
        {Array.from({ length: 8 }, (_, i) => (
          <li key={i} className="animate-pulse space-y-2 px-4 py-3">
            <div className="h-3 w-1/3 rounded bg-surface-muted" />
            <div className="h-3 w-2/3 rounded bg-surface-muted" />
          </li>
        ))}
      </ul>
    )
  }

  if (error && threads.length === 0) {
    return (
      <div className="p-6 text-center text-sm">
        <p className="text-muted">{error}</p>
        <button type="button" onClick={props.onRetry} className="mt-3 font-medium text-accent hover:underline">Try again</button>
      </div>
    )
  }

  if (threads.length === 0) {
    return <p className="p-10 text-center text-sm text-muted">{props.emptyMessage}</p>
  }

  return (
    <div>
      <ul role="listbox" aria-label="Conversations" className="divide-y divide-border">
        {threads.map((thread, index) => {
          const selected = thread.id === selectedId
          const checked = props.checkedIds.has(thread.id)
          const selecting = props.checkedIds.size > 0
          const focused = index === focusIndex
          const names = thread.participants.map(AddressUtility.displayName)
          return (
            <li key={thread.id} ref={focused ? focusedRow : undefined} role="option" aria-selected={selected}
              className={`group relative flex cursor-pointer items-start gap-3 px-4 py-3 transition ${
                selected || checked ? 'bg-selected' : focused ? 'bg-surface-muted' : 'hover:bg-surface-muted'
              } ${focused ? 'shadow-[inset_3px_0_0_var(--accent)]' : ''}`}
              onClick={() => { props.onFocus(index); if (selecting) props.onToggleChecked(thread.id); else props.onOpen(thread.id) }}>
              <input type="checkbox" checked={checked} aria-label={`Select conversation: ${thread.subject || '(no subject)'}`}
                onClick={e => e.stopPropagation()} onChange={() => props.onToggleChecked(thread.id)}
                className={`mt-1 h-4 w-4 shrink-0 accent-[var(--accent)] ${selecting ? '' : 'opacity-40 group-hover:opacity-100'}`} />
              <button type="button" aria-label={thread.starred ? 'Unstar' : 'Star'} aria-pressed={thread.starred}
                onClick={e => { e.stopPropagation(); props.onAction(thread.id, thread.starred ? 'unstar' : 'star') }}
                className={`mt-0.5 shrink-0 ${thread.starred ? 'text-amber-400' : 'text-muted opacity-60 hover:opacity-100'}`}>
                <StarIcon filled={thread.starred} width={18} height={18} />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className={`truncate ${thread.unread ? 'font-semibold' : ''}`}>
                    {names.slice(-3).join(', ') || '(no sender)'}
                    {thread.messageCount > 1 && <span className="ml-1 text-xs text-muted">{thread.messageCount}</span>}
                  </span>
                  <time className={`ml-auto shrink-0 text-xs ${thread.unread ? 'font-semibold' : 'text-muted'}`} dateTime={thread.lastMessageAt}>
                    {formatListDate(thread.lastMessageAt)}
                  </time>
                </div>
                <p className={`truncate text-sm ${thread.unread ? 'font-semibold' : ''}`}>{thread.subject || '(no subject)'}</p>
                <p className="truncate text-sm text-muted">{thread.snippet}</p>
              </div>
              {/* Hover actions, like Gmail's row toolbar. */}
              <div className="absolute right-3 top-1/2 hidden -translate-y-1/2 gap-1 rounded-lg bg-surface p-1 shadow group-hover:flex">
                <RowAction label="Archive" onClick={() => props.onAction(thread.id, 'archive')}><ArchiveIcon width={18} height={18} /></RowAction>
                <RowAction label="Delete" onClick={() => props.onAction(thread.id, 'trash')}><TrashIcon width={18} height={18} /></RowAction>
                <RowAction label={thread.unread ? 'Mark as read' : 'Mark as unread'} onClick={() => props.onAction(thread.id, thread.unread ? 'markRead' : 'markUnread')}>
                  {thread.unread ? <MailOpenIcon width={18} height={18} /> : <MailIcon width={18} height={18} />}
                </RowAction>
              </div>
            </li>
          )
        })}
      </ul>
      {hasMore && (
        <div ref={sentinel} className="p-4 text-center text-sm text-muted">
          {props.loadingMore ? 'Loading…' : <button type="button" onClick={onLoadMore} className="hover:underline">Load more</button>}
        </div>
      )}
    </div>
  )
}

function RowAction({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} className="rounded p-1.5 text-muted hover:bg-surface-muted hover:text-foreground"
      onClick={e => { e.stopPropagation(); onClick() }}>
      {children}
    </button>
  )
}
