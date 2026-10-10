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
  unsubscribe: UnsubscribeOptions | null
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

// ── Cleanup ─────────────────────────────────────────────────────────────────

/** How a sender lets you leave their list (RFC 2369 List-Unsubscribe, RFC 8058 one-click). */
export interface UnsubscribeOptions {
  oneClick: boolean          // List-Unsubscribe-Post: List-Unsubscribe=One-Click with an https URL
  httpUrl: string | null
  mailto: string | null
}

/** Headers-only view of a message, as the provider returns it. */
export interface RawMessageMetadata {
  id: string
  threadId: string
  labelIds: string[]
  unread: boolean
  sizeEstimate: number       // bytes
  receivedAt: string         // ISO-8601
  headers: Record<string, string>   // lower-cased names
}

/** Parsed metadata used by the cleanup tools. Never contains a body. */
export interface MessageMetadata {
  id: string
  threadId: string
  from: MailAddress | null
  subject: string
  date: string               // ISO-8601
  sizeEstimate: number
  unread: boolean
  labelIds: string[]
  listId: string | null
  unsubscribe: UnsubscribeOptions | null
}

export type GroupingKind = 'sender' | 'list' | 'subject' | 'size' | 'age'

export interface MailGroup {
  id: string                 // `${kind}:${key}`, stable across scans
  kind: GroupingKind
  label: string
  detail: string | null
  messageCount: number
  unreadCount: number
  totalBytes: number
  newestAt: string
  oldestAt: string
  messageIds: string[]       // newest first
  sampleMessageId: string    // most recent message, used for unsubscribe
  unsubscribe: UnsubscribeOptions | null
  /** A Gmail search that shows this group in the normal mail view, when one exists. */
  searchQuery: string | null
}

export interface CleanupFilter {
  olderThanDays: number | null
  largerThanBytes: number | null
  unreadOnly: boolean
}

export interface InboxInsights {
  messageCount: number
  unreadCount: number
  totalBytes: number
  subscriptionCount: number
  topSenders: MailGroup[]
  unopenedSubscriptions: MailGroup[]
  largestSenders: MailGroup[]
  oldestMessages: MessageMetadata[]
}

export interface MailboxAnalysis {
  filter: CleanupFilter
  groups: Record<GroupingKind, MailGroup[]>
  insights: InboxInsights
}

export type BulkMessageAction = 'trash' | 'restore' | 'archive' | 'moveToInbox' | 'markRead' | 'markUnread'

export type UnsubscribeMethod = 'one-click' | 'mailto' | 'link'

export interface UnsubscribeResult {
  method: UnsubscribeMethod
  /** True when the app finished the unsubscribe itself; false means the user must visit `url`. */
  completed: boolean
  url: string | null
}
