// Shared by the server page and the client app (no 'use client'), so both
// derive the same initial view from the URL.

export interface MailView {
  label: string | null
  search: string
  threadId: string | null
}

export function parseView(params: URLSearchParams): MailView {
  const search = params.get('q') ?? ''
  return {
    label: params.has('label') ? params.get('label') || null : search ? null : 'INBOX',
    search,
    threadId: params.get('thread'),
  }
}
