import { Base64UrlUtility } from '@/utilities/Base64UrlUtility'
import {
  DEMO_ACCOUNT,
  DEMO_LABELS,
  buildDemoMailbox,
  metadataHeaders,
  rawSource,
  snippetOf,
  type DemoMessage,
} from './demoMailbox'

/**
 * Demo mode's stand-in for Google: a `fetch` that answers the OAuth and Gmail
 * REST endpoints the Accessors call, from an in-memory mailbox. Everything
 * above the HTTP boundary (Accessors, Engines, Managers, UI) runs for real,
 * exactly as it does against Gmail. State lives for the life of the server
 * process and resets on restart.
 */

const GMAIL = 'https://gmail.googleapis.com/gmail/v1/users/me'

interface DemoState { messages: DemoMessage[] }

// Next can load this module more than once per process; keep one mailbox.
const holder = globalThis as typeof globalThis & { __rainsweepDemo?: DemoState }

function state(): DemoState {
  holder.__rainsweepDemo ??= { messages: buildDemoMailbox(Date.now()) }
  return holder.__rainsweepDemo
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const notFound = () => json({ error: { code: 404, message: 'Not found' } }, 404)

export const demoFetch: typeof fetch = async (input, init) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url)
  const method = (init?.method ?? 'GET').toUpperCase()
  const body: unknown = typeof init?.body === 'string' && init.body.startsWith('{') ? JSON.parse(init.body) : null

  if (url.hostname === 'oauth2.googleapis.com') {
    if (url.pathname === '/token') {
      return json({
        access_token: 'demo-access-token',
        refresh_token: 'demo-refresh-token',
        expires_in: 3600,
        scope: 'openid email profile https://www.googleapis.com/auth/gmail.modify',
        token_type: 'Bearer',
      })
    }
    return json({})
  }
  if (url.hostname === 'openidconnect.googleapis.com') {
    return json({ email: DEMO_ACCOUNT.email, name: DEMO_ACCOUNT.name })
  }
  if (url.href.startsWith(GMAIL)) {
    return gmail(method, url.pathname.slice(new URL(GMAIL).pathname.length), url.searchParams, body)
  }
  // One-click unsubscribe POSTs to the sender. Pretend every sender says yes.
  return new Response(null, { status: 200 })
}

function gmail(method: string, path: string, params: URLSearchParams, body: unknown): Response {
  const { messages } = state()
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent)
  const record = isRecord(body) ? body : {}

  if (method === 'GET' && parts[0] === 'labels') {
    if (parts.length === 1) return json({ labels: DEMO_LABELS })
    const label = DEMO_LABELS.find(l => l.id === parts[1])
    if (!label) return notFound()
    const tagged = visible(messages, label.id).filter(m => m.labelIds.includes(label.id))
    return json({
      ...label,
      messagesTotal: tagged.length,
      messagesUnread: tagged.filter(m => m.labelIds.includes('UNREAD')).length,
      threadsTotal: new Set(tagged.map(m => m.threadId)).size,
    })
  }

  if (method === 'GET' && parts[0] === 'threads' && parts.length === 1) {
    const matched = search(messages, params)
    const threadIds = [...new Set(matched.map(m => m.threadId))]
    return json(page(threadIds, params, 'threads'))
  }

  if (method === 'GET' && parts[0] === 'threads') {
    const thread = threadMessages(messages, parts[1])
    if (!thread.length) return notFound()
    const format = params.get('format')
    return json({
      id: parts[1],
      messages: thread.map(m => format === 'minimal'
        ? { id: m.id, threadId: m.threadId, labelIds: m.labelIds }
        : metadata(m)),
    })
  }

  if (method === 'GET' && parts[0] === 'messages' && parts.length === 1) {
    const ids = search(messages, params).map(m => m.id)
    return json(page(ids, params, 'messages'))
  }

  if (method === 'GET' && parts[0] === 'messages') {
    const message = messages.find(m => m.id === parts[1])
    if (!message) return notFound()
    if (params.get('format') === 'raw') {
      return json({ id: message.id, threadId: message.threadId, labelIds: message.labelIds, internalDate: String(message.internalDate), raw: rawSource(message) })
    }
    return json(metadata(message))
  }

  if (method === 'POST' && parts[0] === 'threads' && parts.length === 3) {
    const thread = threadMessages(messages, parts[1])
    if (!thread.length) return notFound()
    const [add, remove] = parts[2] === 'trash' ? [['TRASH'], ['INBOX']]
      : parts[2] === 'untrash' ? [['INBOX'], ['TRASH']]
      : [strings(record.addLabelIds), strings(record.removeLabelIds)]
    thread.forEach(m => relabel(m, add, remove))
    return json({ id: parts[1] })
  }

  if (method === 'POST' && path === '/messages/batchModify') {
    const ids = new Set(strings(record.ids))
    messages.filter(m => ids.has(m.id)).forEach(m => relabel(m, strings(record.addLabelIds), strings(record.removeLabelIds)))
    return new Response(null, { status: 204 })
  }

  if (method === 'POST' && path === '/messages/send') {
    const sent = fromRaw(typeof record.raw === 'string' ? record.raw : '', typeof record.threadId === 'string' ? record.threadId : null)
    messages.unshift(sent)
    return json({ id: sent.id, threadId: sent.threadId, labelIds: sent.labelIds })
  }

  return notFound()
}

/** Gmail leaves Spam and Trash out of every list unless you ask for them by label. */
function visible(messages: DemoMessage[], labelId: string | null): DemoMessage[] {
  if (labelId === 'TRASH' || labelId === 'SPAM') return messages
  return messages.filter(m => !m.labelIds.includes('TRASH') && !m.labelIds.includes('SPAM'))
}

function search(messages: DemoMessage[], params: URLSearchParams): DemoMessage[] {
  const labelIds = params.getAll('labelIds')
  const terms = (params.get('q') ?? '').toLowerCase().split(/\s+/).filter(Boolean)
  return visible(messages, labelIds[0] ?? null).filter(m =>
    labelIds.every(l => m.labelIds.includes(l)) && terms.every(term => matches(m, term)))
}

function matches(message: DemoMessage, term: string): boolean {
  const [operator, value] = term.includes(':') ? term.split(/:(.*)/) : ['', term]
  switch (operator) {
    case 'is':
      if (value === 'unread') return message.labelIds.includes('UNREAD')
      if (value === 'starred') return message.labelIds.includes('STARRED')
      return true
    case 'in':
      return message.labelIds.includes(value.toUpperCase())
    case 'from':
      return message.from.toLowerCase().includes(value)
    case 'subject':
      return message.subject.toLowerCase().includes(value)
    default:
      return `${message.from} ${message.to} ${message.subject} ${message.text}`.toLowerCase().includes(term)
  }
}

function page(ids: string[], params: URLSearchParams, key: 'threads' | 'messages') {
  const start = Number(params.get('pageToken') ?? 0) || 0
  const size = Number(params.get('maxResults') ?? 100) || 100
  const slice = ids.slice(start, start + size)
  return {
    [key]: slice.map(id => ({ id })),
    resultSizeEstimate: ids.length,
    ...(start + size < ids.length ? { nextPageToken: String(start + size) } : {}),
  }
}

function threadMessages(messages: DemoMessage[], threadId: string): DemoMessage[] {
  return messages.filter(m => m.threadId === threadId).sort((a, b) => a.internalDate - b.internalDate)
}

function metadata(message: DemoMessage) {
  return {
    id: message.id,
    threadId: message.threadId,
    labelIds: message.labelIds,
    snippet: snippetOf(message),
    internalDate: String(message.internalDate),
    sizeEstimate: message.sizeEstimate,
    payload: { headers: metadataHeaders(message) },
  }
}

function relabel(message: DemoMessage, add: string[], remove: string[]): void {
  message.labelIds = [...new Set([...message.labelIds.filter(l => !remove.includes(l)), ...add])]
}

function fromRaw(raw: string, threadId: string | null): DemoMessage {
  const source = raw ? Base64UrlUtility.decodeToString(raw) : ''
  const [head, ...rest] = source.split(/\r?\n\r?\n/)
  const header = (name: string) => head.match(new RegExp(`^${name}:\\s*(.*)$`, 'im'))?.[1]?.trim() ?? ''
  const id = `sent${Date.now().toString(16)}`
  const text = rest.join('\n\n').replace(/^--.*$|^Content-[^\n]*$/gm, '').replace(/<[^>]+>/g, ' ').trim()
  return {
    id,
    threadId: threadId ?? id,
    labelIds: ['SENT'],
    internalDate: Date.now(),
    from: `${DEMO_ACCOUNT.name} <${DEMO_ACCOUNT.email}>`,
    to: header('To'),
    subject: header('Subject'),
    text,
    html: null,
    attachment: null,
    sizeEstimate: source.length,
    listId: null,
    unsubscribeUrl: null,
    raw,
  }
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
