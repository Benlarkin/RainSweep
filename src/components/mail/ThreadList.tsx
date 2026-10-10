'use client'

import { Fragment, useEffect, useRef } from 'react'
import type { ThreadSummary } from '@/types'
import type { ThreadAction } from '@/managers/mailbox/MailboxRequests'
import { AddressUtility } from '@/utilities/AddressUtility'
import { dayHeading, formatListDate } from '@/lib/client/format'
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
  /** People first: mail from lists and shops folds into a tray after the conversations above it. */
  tray: SweepTray | null
}

export interface SweepTray {
  /** Rows before the tray; the rest (if expanded) follow it. */
  position: number
  count: number
  senders: string[]
  expanded: boolean
  onToggle: () => void
  onSweep: () => void
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
          <li key={i} className="animate-pulse space-y-2 px-6 py-4">
            <div className="h-3.5 w-1/3 bg-surface-muted" />
            <div className="h-3 w-2/3 bg-surface-muted" />
          </li>
        ))}
      </ul>
    )
  }

  if (error && threads.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="italic text-muted">{error}</p>
        <button type="button" onClick={props.onRetry} className="mt-3 font-medium text-accent hover:underline">Try again</button>
      </div>
    )
  }

  if (threads.length === 0) {
    return <p className="p-12 text-center font-display text-lg italic text-muted">{props.emptyMessage}</p>
  }

  const tray = props.tray
  const shown = tray && !tray.expanded ? threads.slice(0, tray.position) : threads

  return (
    <div>
      <ul role="listbox" aria-label="Conversations">
        {shown.map((thread, index) => {
          const selected = thread.id === selectedId
          const checked = props.checkedIds.has(thread.id)
          const selecting = props.checkedIds.size > 0
          const focused = index === focusIndex
          const names = thread.participants.map(AddressUtility.displayName)
          // Bulk rows below the tray start their own run of headings.
          const heading = dayHeading(thread.lastMessageAt)
          const showHeading = index === 0 || index === tray?.position || dayHeading(shown[index - 1].lastMessageAt) !== heading
          return (
            <Fragment key={thread.id}>
              {tray && index === tray.position && <TrayRow tray={tray} />}
              {showHeading && <li role="presentation" className="meta px-6 pb-1.5 pt-4">{heading}</li>}
              <li ref={focused ? focusedRow : undefined} role="option" aria-selected={selected}
                className={`group relative flex cursor-pointer items-start gap-2.5 border-b border-border py-3 pl-3 pr-5 transition ${
                  selected || checked ? 'bg-selected' : focused ? 'bg-surface-muted/70' : 'hover:bg-surface-muted/70'
                }`}
                onClick={() => { props.onFocus(index); if (selecting) props.onToggleChecked(thread.id); else props.onOpen(thread.id) }}>
                {(selected || focused) && <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${selected ? 'bg-marker' : 'bg-border'}`} />}
                <div className="flex w-5 shrink-0 flex-col items-center gap-2 pt-1">
                  <input type="checkbox" checked={checked} aria-label={`Select conversation: ${thread.subject || '(no subject)'}`}
                    onClick={e => e.stopPropagation()} onChange={() => props.onToggleChecked(thread.id)}
                    className={`h-3.5 w-3.5 accent-[var(--accent)] ${selecting || checked ? '' : 'opacity-0 focus:opacity-100 group-hover:opacity-60'}`} />
                  <button type="button" aria-label={thread.starred ? 'Unstar' : 'Star'} aria-pressed={thread.starred}
                    onClick={e => { e.stopPropagation(); props.onAction(thread.id, thread.starred ? 'unstar' : 'star') }}
                    className={thread.starred ? 'text-marker' : 'text-muted opacity-0 focus:opacity-100 group-hover:opacity-60 hover:!opacity-100'}>
                    <StarIcon filled={thread.starred} width={14} height={14} />
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    {thread.unread && <span aria-label="Unread" className="mb-[3px] h-[7px] w-[7px] shrink-0 self-center rounded-full bg-accent" />}
                    <span className={`truncate font-display text-[1.08rem] ${thread.unread ? 'font-semibold' : ''}`}>
                      {names.slice(-3).join(', ') || '(no sender)'}
                    </span>
                    {thread.messageCount > 1 && <span className="shrink-0 font-mono text-[0.68rem] text-muted">×{thread.messageCount}</span>}
                    <time className="meta ml-auto shrink-0" dateTime={thread.lastMessageAt}>
                      {formatListDate(thread.lastMessageAt)}
                    </time>
                  </div>
                  <p className={`truncate text-[1rem] leading-snug ${thread.unread ? 'text-foreground' : 'text-foreground/85'}`}>{thread.subject || '(no subject)'}</p>
                  <p className="truncate text-[0.93rem] italic leading-snug text-muted">{thread.snippet}</p>
                </div>
                {/* Hover actions, like Gmail's row toolbar. */}
                <div className="absolute right-4 top-1/2 hidden -translate-y-1/2 gap-0.5 border border-border bg-letter p-0.5 shadow-sm group-hover:flex">
                  <RowAction label="Archive" onClick={() => props.onAction(thread.id, 'archive')}><ArchiveIcon width={17} height={17} /></RowAction>
                  <RowAction label="Delete" onClick={() => props.onAction(thread.id, 'trash')}><TrashIcon width={17} height={17} /></RowAction>
                  <RowAction label={thread.unread ? 'Mark as read' : 'Mark as unread'} onClick={() => props.onAction(thread.id, thread.unread ? 'markRead' : 'markUnread')}>
                    {thread.unread ? <MailOpenIcon width={17} height={17} /> : <MailIcon width={17} height={17} />}
                  </RowAction>
                </div>
              </li>
            </Fragment>
          )
        })}
        {tray && tray.position >= shown.length && <TrayRow tray={tray} />}
      </ul>
      {hasMore && (
        <div ref={sentinel} className="meta p-5 text-center">
          {props.loadingMore ? 'Loading…' : <button type="button" onClick={onLoadMore} className="hover:text-foreground">Load more</button>}
        </div>
      )}
    </div>
  )
}

function TrayRow({ tray }: { tray: SweepTray }) {
  const named = tray.senders.slice(0, 3)
  const others = tray.count - named.length
  return (
    <li role="presentation" className="mx-5 my-4 flex flex-wrap items-center gap-3 border-[1.5px] border-dashed border-muted/60 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="font-display text-[1.02rem] font-semibold leading-tight">
          {tray.count} from lists &amp; shops {tray.expanded ? 'below' : 'settled below'}
        </p>
        <p className="truncate text-[0.92rem] italic text-muted">
          {named.join(', ')}{others > 0 ? ` and ${others} more` : ''}
        </p>
      </div>
      <button type="button" onClick={tray.onToggle} aria-expanded={tray.expanded} className="meta hover:text-foreground">
        {tray.expanded ? 'Fold away' : 'Show'}
      </button>
      <button type="button" onClick={tray.onSweep}
        className="bg-foreground px-3 py-2 font-mono text-[0.7rem] uppercase tracking-[0.08em] text-background transition hover:opacity-85">
        Sweep all
      </button>
    </li>
  )
}

function RowAction({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} className="p-1.5 text-muted hover:bg-surface-muted hover:text-foreground"
      onClick={e => { e.stopPropagation(); onClick() }}>
      {children}
    </button>
  )
}
