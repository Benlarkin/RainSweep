import { getContainer } from '@/lib/server/container'
import { badRequest, errorJson, isRecord, okJson, readJson, rejectCrossSite } from '@/lib/server/http'
import { AnalyzeMailboxRequest } from '@/managers/cleanup/CleanupRequests'
import type { CleanupFilter, MailAddress, MessageMetadata, UnsubscribeOptions } from '@/types'

/** Matches the scan cap in the UI, with headroom. */
const MAX_MESSAGES = 10_000

export async function POST(request: Request) {
  const rejected = rejectCrossSite(request)
  if (rejected) return rejected

  const body = await readJson(request)
  if (!isRecord(body) || !Array.isArray(body.messages)) return badRequest('Expected { messages, filter }.')
  if (body.messages.length > MAX_MESSAGES) return badRequest(`At most ${MAX_MESSAGES} messages can be analyzed at once.`)

  const messages = body.messages.map(readMetadata).filter((m): m is MessageMetadata => m !== null)
  const { cleanupManager } = await getContainer()
  const result = await cleanupManager.query(new AnalyzeMailboxRequest(messages, readFilter(body.filter)))
  return result.analysis ? okJson({ analysis: result.analysis }) : errorJson(result)
}

// The client sends back metadata it received from /api/cleanup/scan. It is
// rebuilt field by field so nothing unexpected reaches the engine.

const str = (v: unknown): string | null => (typeof v === 'string' ? v : null)
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

function readAddress(v: unknown): MailAddress | null {
  if (!isRecord(v) || typeof v.address !== 'string') return null
  return { name: str(v.name), address: v.address }
}

function readUnsubscribe(v: unknown): UnsubscribeOptions | null {
  if (!isRecord(v)) return null
  return { oneClick: v.oneClick === true, httpUrl: str(v.httpUrl), mailto: str(v.mailto) }
}

function readMetadata(v: unknown): MessageMetadata | null {
  if (!isRecord(v)) return null
  const id = str(v.id)
  const date = str(v.date)
  if (!id || !date || Number.isNaN(Date.parse(date))) return null
  return {
    id,
    threadId: str(v.threadId) ?? id,
    from: readAddress(v.from),
    subject: str(v.subject) ?? '',
    date,
    sizeEstimate: Math.max(0, num(v.sizeEstimate) ?? 0),
    unread: v.unread === true,
    labelIds: Array.isArray(v.labelIds) ? v.labelIds.filter((l): l is string => typeof l === 'string') : [],
    listId: str(v.listId),
    unsubscribe: readUnsubscribe(v.unsubscribe),
  }
}

function readFilter(v: unknown): CleanupFilter {
  const f = isRecord(v) ? v : {}
  const positive = (x: unknown): number | null => { const n = num(x); return n !== null && n > 0 ? n : null }
  return { olderThanDays: positive(f.olderThanDays), largerThanBytes: positive(f.largerThanBytes), unreadOnly: f.unreadOnly === true }
}
