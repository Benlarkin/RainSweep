'use client'

import { useState } from 'react'
import type { BulkMessageAction, GroupingKind, MailGroup } from '@/types'
import { formatBytes, formatListDate } from '@/lib/client/format'
import { ArchiveIcon, MailOpenIcon, TrashIcon, UnsubscribeIcon } from '@/components/ui/Icons'

type SortKey = 'messageCount' | 'totalBytes' | 'unreadCount' | 'newestAt'

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'messageCount', label: 'Most mail' },
  { key: 'totalBytes', label: 'Most space' },
  { key: 'unreadCount', label: 'Most unread' },
  { key: 'newestAt', label: 'Most recent' },
]

const EMPTY: Record<GroupingKind, string> = {
  sender: 'No senders match these filters.',
  list: 'No mailing lists match these filters.',
  subject: 'No repeated subjects match these filters.',
  size: 'No messages match these filters.',
  age: 'No messages match these filters.',
}

interface GroupTableProps {
  kind: GroupingKind
  groups: MailGroup[]
  busy: boolean
  onOpen: (group: MailGroup) => void
  onAction: (groups: MailGroup[], action: BulkMessageAction) => void
  onUnsubscribe: (group: MailGroup) => void
}

export function GroupTable({ kind, groups, busy, onOpen, onAction, onUnsubscribe }: GroupTableProps) {
  // Size and age buckets have a natural order; the rest sort by the user's choice.
  const sortable = kind !== 'size' && kind !== 'age'
  const [sort, setSort] = useState<SortKey>('messageCount')
  const [checked, setChecked] = useState<Set<string>>(new Set())

  const sorted = sortable
    ? [...groups].sort((a, b) => (sort === 'newestAt' ? b.newestAt.localeCompare(a.newestAt) : b[sort] - a[sort]))
    : groups
  const visibleChecked = sorted.filter(g => checked.has(g.id))
  const allChecked = sorted.length > 0 && visibleChecked.length === sorted.length

  const toggle = (id: string) => setChecked(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })
  const act = (action: BulkMessageAction) => {
    onAction(visibleChecked, action)
    setChecked(new Set())
  }

  if (groups.length === 0) return <p className="p-8 text-center text-sm text-muted">{EMPTY[kind]}</p>

  const selectedCount = visibleChecked.reduce((n, g) => n + g.messageCount, 0)

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-2 text-sm">
        <input type="checkbox" aria-label="Select all groups" checked={allChecked}
          onChange={() => setChecked(allChecked ? new Set() : new Set(sorted.map(g => g.id)))} />
        {visibleChecked.length > 0 ? (
          <>
            <span className="text-muted">{visibleChecked.length} groups · {selectedCount.toLocaleString()} messages</span>
            <ToolbarButton label="Trash" onClick={() => act('trash')} disabled={busy}><TrashIcon width={16} height={16} /></ToolbarButton>
            <ToolbarButton label="Archive" onClick={() => act('archive')} disabled={busy}><ArchiveIcon width={16} height={16} /></ToolbarButton>
            <ToolbarButton label="Mark read" onClick={() => act('markRead')} disabled={busy}><MailOpenIcon width={16} height={16} /></ToolbarButton>
          </>
        ) : (
          <span className="text-muted">{groups.length.toLocaleString()} groups</span>
        )}
        {sortable && (
          <label className="ml-auto flex items-center gap-2 text-muted">
            Sort
            <select value={sort} onChange={e => setSort(e.target.value as SortKey)}
              className="rounded border border-border bg-surface px-2 py-1 text-foreground">
              {SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </label>
        )}
      </div>

      <ul>
        {sorted.map(group => (
          <li key={group.id} className="flex items-center gap-3 border-b border-border px-4 py-2.5 hover:bg-surface-muted">
            <input type="checkbox" aria-label={`Select ${group.label}`} checked={checked.has(group.id)} onChange={() => toggle(group.id)} />
            <button type="button" onClick={() => onOpen(group)} className="min-w-0 flex-1 text-left">
              <div className="truncate font-medium">{group.label}</div>
              <div className="truncate text-xs text-muted">
                {group.detail ? `${group.detail} · ` : ''}
                {group.messageCount.toLocaleString()} messages
                {group.unreadCount > 0 ? ` · ${group.unreadCount.toLocaleString()} unread` : ''}
                {` · ${formatBytes(group.totalBytes)} · latest ${formatListDate(group.newestAt)}`}
              </div>
            </button>
            <div className="flex shrink-0 items-center gap-1">
              {group.unsubscribe && (
                <ToolbarButton label="Unsubscribe" onClick={() => onUnsubscribe(group)} disabled={busy}>
                  <UnsubscribeIcon width={16} height={16} />
                </ToolbarButton>
              )}
              <ToolbarButton label="Trash all" onClick={() => onAction([group], 'trash')} disabled={busy}><TrashIcon width={16} height={16} /></ToolbarButton>
              <ToolbarButton label="Archive all" onClick={() => onAction([group], 'archive')} disabled={busy}><ArchiveIcon width={16} height={16} /></ToolbarButton>
              {group.unreadCount > 0 && (
                <ToolbarButton label="Mark all read" onClick={() => onAction([group], 'markRead')} disabled={busy}><MailOpenIcon width={16} height={16} /></ToolbarButton>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ToolbarButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} disabled={disabled}
      className="rounded-full p-2 text-muted hover:bg-surface-muted hover:text-foreground disabled:opacity-40">
      {children}
    </button>
  )
}
