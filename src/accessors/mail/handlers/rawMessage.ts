import type { RawMailMessage } from '@/types'
import { Base64UrlUtility } from '@/utilities/Base64UrlUtility'
import { FLAG_LABELS, toIso, type GmailRawMessage } from '../gmail/gmailTypes'

export function toRawMailMessage(message: GmailRawMessage): RawMailMessage {
  return {
    id: message.id,
    threadId: message.threadId,
    labelIds: message.labelIds.filter(l => !FLAG_LABELS.has(l)),
    unread: message.labelIds.includes('UNREAD'),
    starred: message.labelIds.includes('STARRED'),
    receivedAt: toIso(message.internalDate),
    raw: Base64UrlUtility.decode(message.raw),
  }
}
