import type { RawMessageMetadata } from '@/types'
import { FLAG_LABELS, toIso, type GmailMessageMeta } from '../gmail/gmailTypes'

export const CLEANUP_HEADERS = ['From', 'Subject', 'Date', 'List-Id', 'List-Unsubscribe', 'List-Unsubscribe-Post']

export function toRawMetadata(meta: GmailMessageMeta): RawMessageMetadata {
  const headers: Record<string, string> = {}
  for (const h of meta.headers) {
    const key = h.name.toLowerCase()
    if (!(key in headers)) headers[key] = h.value
  }
  return {
    id: meta.id,
    threadId: meta.threadId,
    labelIds: meta.labelIds.filter(l => !FLAG_LABELS.has(l)),
    unread: meta.labelIds.includes('UNREAD'),
    sizeEstimate: meta.sizeEstimate,
    receivedAt: toIso(meta.internalDate),
    headers,
  }
}
