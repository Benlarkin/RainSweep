import type { CleanupFilter, GroupingKind, MailGroup, MessageMetadata } from '@/types'

const DAY_MS = 86_400_000

export const SIZE_BUCKETS: ReadonlyArray<{ key: string; label: string; min: number; max: number; query: string | null }> = [
  { key: '10mb', label: 'Larger than 10 MB', min: 10 * 1024 * 1024, max: Infinity, query: 'larger:10M' },
  { key: '5mb', label: '5 MB to 10 MB', min: 5 * 1024 * 1024, max: 10 * 1024 * 1024, query: 'larger:5M smaller:10M' },
  { key: '1mb', label: '1 MB to 5 MB', min: 1024 * 1024, max: 5 * 1024 * 1024, query: 'larger:1M smaller:5M' },
  { key: '100kb', label: '100 KB to 1 MB', min: 100 * 1024, max: 1024 * 1024, query: 'larger:100K smaller:1M' },
  { key: 'small', label: 'Smaller than 100 KB', min: 0, max: 100 * 1024, query: 'smaller:100K' },
]

export const AGE_BUCKETS: ReadonlyArray<{ key: string; label: string; minDays: number; maxDays: number; query: string | null }> = [
  { key: '5y', label: 'Older than 5 years', minDays: 365 * 5, maxDays: Infinity, query: 'older_than:5y' },
  { key: '3y', label: '3 to 5 years old', minDays: 365 * 3, maxDays: 365 * 5, query: 'older_than:3y newer_than:5y' },
  { key: '1y', label: '1 to 3 years old', minDays: 365, maxDays: 365 * 3, query: 'older_than:1y newer_than:3y' },
  { key: '6m', label: '6 to 12 months old', minDays: 182, maxDays: 365, query: 'older_than:6m newer_than:1y' },
  { key: '30d', label: '1 to 6 months old', minDays: 30, maxDays: 182, query: 'older_than:30d newer_than:6m' },
  { key: 'recent', label: 'Last 30 days', minDays: 0, maxDays: 30, query: 'newer_than:30d' },
]

/** Cap per grouping so the response stays small; groups are sorted largest first. */
export const MAX_GROUPS_PER_KIND = 250

export function passesFilter(message: MessageMetadata, filter: CleanupFilter, now: Date): boolean {
  if (filter.unreadOnly && !message.unread) return false
  if (filter.largerThanBytes !== null && message.sizeEstimate < filter.largerThanBytes) return false
  if (filter.olderThanDays !== null && ageInDays(message, now) < filter.olderThanDays) return false
  return true
}

export function ageInDays(message: MessageMetadata, now: Date): number {
  return (now.getTime() - Date.parse(message.date)) / DAY_MS
}

/**
 * Recurring notifications differ only in numbers ("Order #1182 shipped",
 * "Order #1190 shipped"), so digits collapse to '#'. Reply and forward
 * prefixes are stripped.
 */
export function normalizeSubject(subject: string): string {
  return subject
    .replace(/^\s*((re|fwd?|fw|aw|sv|wg)\s*(\[\d+\])?\s*:\s*)+/i, '')
    .replace(/\d+([.,:/-]\d+)*/g, '#')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Accumulates messages (already sorted newest first) into one group. */
export function buildGroup(
  kind: GroupingKind,
  key: string,
  label: string,
  detail: string | null,
  messages: MessageMetadata[],
  searchQuery: string | null,
): MailGroup {
  const newest = messages[0]
  const oldest = messages[messages.length - 1]
  return {
    id: `${kind}:${key}`,
    kind,
    label,
    detail,
    messageCount: messages.length,
    unreadCount: messages.filter(m => m.unread).length,
    totalBytes: messages.reduce((sum, m) => sum + m.sizeEstimate, 0),
    newestAt: newest.date,
    oldestAt: oldest.date,
    messageIds: messages.map(m => m.id),
    sampleMessageId: (messages.find(m => m.unsubscribe) ?? newest).id,
    unsubscribe: messages.find(m => m.unsubscribe)?.unsubscribe ?? null,
    searchQuery,
  }
}

export function quoteForSearch(value: string): string {
  return /^[\w.@+-]+$/.test(value) ? value : `"${value.replace(/"/g, '')}"`
}
