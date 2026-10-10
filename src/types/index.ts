// Provider-neutral domain model. Nothing in here may mention Gmail: the mail
// provider is the most volatile thing in this system and is encapsulated
// entirely behind MailAccessor.

export interface MailAddress {
  name: string | null
  address: string
}

export type SystemLabelId = 'INBOX' | 'STARRED' | 'SENT' | 'DRAFT' | 'SPAM' | 'TRASH' | 'IMPORTANT'

export interface MailLabel {
  id: string
  name: string
  kind: 'system' | 'user'
  unreadCount: number
  totalCount: number
}

export interface ThreadSummary {
  id: string
  subject: string
  snippet: string
  participants: MailAddress[]
  lastMessageAt: string        // ISO-8601
  messageCount: number
  unread: boolean
  starred: boolean
  labelIds: string[]
}

export interface ThreadPage {
  threads: ThreadSummary[]
  nextPageToken: string | null
  resultSizeEstimate: number
}

export interface AttachmentInfo {
  index: number                // position within the message's attachments
  filename: string
  mimeType: string
  size: number
  inline: boolean
}

export interface MailMessage {
  id: string
  threadId: string
  messageIdHeader: string | null   // RFC 5322 Message-ID, used for threading replies
  references: string[]
  from: MailAddress | null
  replyTo: MailAddress[]
  to: MailAddress[]
  cc: MailAddress[]
  subject: string
  date: string                     // ISO-8601
  textBody: string | null
  htmlBody: string | null          // untrusted; render only in a sandboxed frame
  attachments: AttachmentInfo[]
  labelIds: string[]
  unread: boolean
  starred: boolean
}

export interface MailThread {
  id: string
  subject: string
  messages: MailMessage[]
  labelIds: string[]
}

/** A message as it arrives from the provider, before parsing. */
export interface RawMailMessage {
  id: string
  threadId: string
  labelIds: string[]
  unread: boolean
  starred: boolean
  receivedAt: string               // ISO-8601, provider's receive time
  raw: Uint8Array                  // full RFC 5322 message
}

export interface AttachmentContent {
  filename: string
  mimeType: string
  content: Uint8Array
}

export interface Account {
  email: string
  name: string | null
  pictureUrl: string | null
}

export interface Credentials {
  accessToken: string
  refreshToken: string
  expiresAt: number                // epoch ms
}

export interface Session {
  account: Account
  credentials: Credentials
}

export type ComposeMode = 'new' | 'reply' | 'replyAll' | 'forward'

/** What the compose UI is pre-filled with. */
export interface ComposeDraft {
  mode: ComposeMode
  to: MailAddress[]
  cc: MailAddress[]
  subject: string
  body: string
  threadId: string | null
  inReplyTo: string | null
  references: string[]
}

/** A fully-addressed message ready for serialization. */
export interface OutgoingMessage {
  from: MailAddress
  to: MailAddress[]
  cc: MailAddress[]
  bcc: MailAddress[]
  subject: string
  textBody: string
  htmlBody: string | null
  attachments: AttachmentContent[]
  inReplyTo: string | null
  references: string[]
  date: Date
  messageId: string
}
