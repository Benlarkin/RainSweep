import type {
  Account, BulkMessageAction, CleanupFilter, ComposeDraft, MailAddress, MailLabel, MailThread, MailboxAnalysis, MessageMetadata, ThreadPage, UnsubscribeResult,
} from '@/types'
import type { ThreadAction } from '@/managers/mailbox/MailboxRequests'
import type { DraftMode } from '@/managers/composition/CompositionRequests'

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code: string) {
    super(message)
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      ...init,
      headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
      credentials: 'same-origin',
    })
  } catch {
    throw new ApiError('You appear to be offline.', 0, 'offline')
  }

  if (response.status === 401) {
    window.location.href = '/?error=' + encodeURIComponent('Your session ended. Sign in again.')
    throw new ApiError('Signed out', 401, 'unauthenticated')
  }
  if (response.status === 204) return undefined as T

  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const error = typeof body === 'object' && body !== null && 'error' in body ? (body as { error: { message?: string; code?: string } }).error : null
    throw new ApiError(error?.message ?? `Request failed (${response.status})`, response.status, error?.code ?? 'unknown')
  }
  return body as T
}

export interface SendPayload {
  to: string
  cc: string
  bcc: string
  subject: string
  body: string
  threadId: string | null
  inReplyTo: string | null
  references: string[]
  attachments: { filename: string; mimeType: string; data: string }[]
}

/** The browser's only door into the system: HTTP to the Client-layer route handlers. */
export const mailApi = {
  account: () => request<{ account: Account }>('/api/account'),
  labels: () => request<{ labels: MailLabel[] }>('/api/labels'),
  threads: (label: string | null, search: string, pageToken: string | null) => {
    const params = new URLSearchParams()
    if (label) params.set('label', label)
    if (search) params.set('q', search)
    if (pageToken) params.set('pageToken', pageToken)
    return request<ThreadPage>(`/api/threads?${params}`)
  },
  thread: (id: string) => request<{ thread: MailThread }>(`/api/threads/${encodeURIComponent(id)}`),
  updateThread: (id: string, action: ThreadAction) =>
    request<{ threadId: string }>(`/api/threads/${encodeURIComponent(id)}/actions`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    }),
  draft: (messageId: string, mode: DraftMode) => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    return request<{ draft: ComposeDraft }>(
      `/api/messages/${encodeURIComponent(messageId)}/draft?mode=${mode}&tz=${encodeURIComponent(tz)}`,
    )
  },
  send: (payload: SendPayload) =>
    request<{ messageId: string; threadId: string }>('/api/send', { method: 'POST', body: JSON.stringify(payload) }),
  updateThreads: (threadIds: string[], action: ThreadAction) =>
    request<{ updatedIds: string[]; failedIds: string[] }>('/api/threads/actions', {
      method: 'POST',
      body: JSON.stringify({ threadIds, action }),
    }),
  signOut: () => request<void>('/api/auth/signout', { method: 'POST' }),

  // Cleanup
  scan: (scope: 'all' | 'inbox', pageToken: string | null) => {
    const params = new URLSearchParams({ scope })
    if (pageToken) params.set('pageToken', pageToken)
    return request<{ messages: MessageMetadata[]; nextPageToken: string | null; resultSizeEstimate: number }>(`/api/cleanup/scan?${params}`)
  },
  analyze: (messages: MessageMetadata[], filter: CleanupFilter) =>
    request<{ analysis: MailboxAnalysis }>('/api/cleanup/analyze', { method: 'POST', body: JSON.stringify({ messages, filter }) }),
  bulkAction: (messageIds: string[], action: BulkMessageAction) =>
    request<{ updatedCount: number }>('/api/cleanup/actions', { method: 'POST', body: JSON.stringify({ messageIds, action }) }),
  unsubscribe: (messageId: string) =>
    request<{ result: UnsubscribeResult }>('/api/cleanup/unsubscribe', { method: 'POST', body: JSON.stringify({ messageId }) }),
  attachmentUrl: (messageId: string, index: number, inline = false) =>
    `/api/messages/${encodeURIComponent(messageId)}/attachments/${index}${inline ? '?inline=1' : ''}`,
}

export function formatAddresses(addresses: MailAddress[]): string {
  return addresses.map(a => (a.name ? `${a.name} <${a.address}>` : a.address)).join(', ')
}
