import type { ComposeDraft, ComposeMode } from '@/types'
import { formatAddresses } from '@/lib/client/mailApi'
import type { MailtoFields } from '@/utilities/MailtoUtility'

export interface ComposeState {
  mode: ComposeMode
  to: string
  cc: string
  bcc: string
  subject: string
  body: string
  threadId: string | null
  inReplyTo: string | null
  references: string[]
  attachments: File[]
}

export const DRAFT_STORAGE_KEY = 'mc:compose-draft'

/** Total attachment budget. Hosts cap request bodies (Vercel: 4.5 MB), so keep this modest. */
export const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024

export function emptyCompose(): ComposeState {
  return { mode: 'new', to: '', cc: '', bcc: '', subject: '', body: '', threadId: null, inReplyTo: null, references: [], attachments: [] }
}

export function composeFromDraft(draft: ComposeDraft): ComposeState {
  return {
    mode: draft.mode,
    to: formatAddresses(draft.to),
    cc: formatAddresses(draft.cc),
    bcc: '',
    subject: draft.subject,
    body: draft.body,
    threadId: draft.threadId,
    inReplyTo: draft.inReplyTo,
    references: draft.references,
    attachments: [],
  }
}

export function composeFromMailto(fields: MailtoFields): ComposeState {
  return {
    ...emptyCompose(),
    to: formatAddresses(fields.to),
    cc: formatAddresses(fields.cc),
    bcc: formatAddresses(fields.bcc),
    subject: fields.subject,
    body: fields.body,
  }
}

export function isDirty(state: ComposeState): boolean {
  return Boolean(state.to.trim() || state.subject.trim() || state.body.trim() || state.attachments.length)
}

// Drafts are saved per device for crash/offline safety; attachments aren't.
export function saveLocalDraft(state: ComposeState): void {
  try {
    const { attachments: _files, ...rest } = state
    void _files
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(rest))
  } catch { /* storage unavailable */ }
}

export function loadLocalDraft(): ComposeState | null {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const p = parsed as Partial<ComposeState>
    return { ...emptyCompose(), ...p, attachments: [] }
  } catch {
    return null
  }
}

export function clearLocalDraft(): void {
  try { localStorage.removeItem(DRAFT_STORAGE_KEY) } catch { /* storage unavailable */ }
}

export async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}
