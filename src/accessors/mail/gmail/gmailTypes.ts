import { isRecord } from './GmailClient'

// Narrowing guards for the slices of Gmail's JSON this app reads. Gmail's
// payloads are external input, so they are checked rather than asserted.

export interface GmailHeader { name: string; value: string }

export interface GmailMessageMeta {
  id: string
  threadId: string
  labelIds: string[]
  snippet: string
  internalDate: string
  sizeEstimate: number
  headers: GmailHeader[]
}

export interface GmailRawMessage {
  id: string
  threadId: string
  labelIds: string[]
  internalDate: string
  raw: string
}

export interface GmailLabel {
  id: string
  name: string
  type: 'system' | 'user'
  messagesUnread: number
  threadsTotal: number
}

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback)
const num = (v: unknown): number => (typeof v === 'number' ? v : 0)
const strArray = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

export function readMessageMeta(value: unknown): GmailMessageMeta | null {
  if (!isRecord(value) || typeof value.id !== 'string') return null
  const payload = isRecord(value.payload) ? value.payload : {}
  const headers = Array.isArray(payload.headers)
    ? payload.headers.filter(isRecord).map(h => ({ name: str(h.name), value: str(h.value) }))
    : []
  return {
    id: value.id,
    threadId: str(value.threadId),
    labelIds: strArray(value.labelIds),
    snippet: str(value.snippet),
    internalDate: str(value.internalDate, '0'),
    sizeEstimate: num(value.sizeEstimate),
    headers,
  }
}

export function readRawMessage(value: unknown): GmailRawMessage | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.raw !== 'string') return null
  return {
    id: value.id,
    threadId: str(value.threadId),
    labelIds: strArray(value.labelIds),
    internalDate: str(value.internalDate, '0'),
    raw: value.raw,
  }
}

export function readLabel(value: unknown): GmailLabel | null {
  if (!isRecord(value) || typeof value.id !== 'string') return null
  return {
    id: value.id,
    name: str(value.name, value.id),
    type: value.type === 'user' ? 'user' : 'system',
    messagesUnread: num(value.messagesUnread),
    threadsTotal: num(value.threadsTotal),
  }
}

export function readIdList(value: unknown, key: string): { ids: string[]; nextPageToken: string | null; resultSizeEstimate: number } {
  if (!isRecord(value)) return { ids: [], nextPageToken: null, resultSizeEstimate: 0 }
  const items = Array.isArray(value[key]) ? value[key] : []
  return {
    ids: items.filter(isRecord).map(t => t.id).filter((id): id is string => typeof id === 'string'),
    nextPageToken: typeof value.nextPageToken === 'string' ? value.nextPageToken : null,
    resultSizeEstimate: num(value.resultSizeEstimate),
  }
}

export function header(headers: GmailHeader[], name: string): string {
  const lower = name.toLowerCase()
  return headers.find(h => h.name.toLowerCase() === lower)?.value ?? ''
}

export function toIso(internalDate: string): string {
  const ms = Number(internalDate)
  return new Date(Number.isFinite(ms) ? ms : 0).toISOString()
}

/** Gmail models read/starred state as labels; the domain models them as flags. */
export const FLAG_LABELS = new Set(['UNREAD', 'STARRED'])
