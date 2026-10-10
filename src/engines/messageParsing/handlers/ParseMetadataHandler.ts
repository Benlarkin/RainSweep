import { decodeWords } from 'postal-mime'
import type { IHandler } from '@/common/resolver/IHandler'
import type { MessageMetadata, RawMessageMetadata } from '@/types'
import { AddressUtility } from '@/utilities/AddressUtility'
import { ParseMetadataRequest } from '../MessageParsingEngineRequests'
import { ParseMetadataResponse } from '../MessageParsingEngineResponses'
import { readListId, readUnsubscribe } from './unsubscribeRules'

export class ParseMetadataHandler implements IHandler<ParseMetadataRequest> {
  async handle(request: ParseMetadataRequest): Promise<ParseMetadataResponse> {
    return new ParseMetadataResponse(request.correlationId, request.messages.map(toMetadata))
  }
}

function toMetadata(raw: RawMessageMetadata): MessageMetadata {
  const h = raw.headers
  const from = AddressUtility.parseList(decode(h['from']))[0] ?? null
  // The provider's receive time can't be forged by the sender, unlike Date:.
  const parsedDate = h['date'] ? new Date(h['date']) : null
  const headerDate = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : null
  const received = Date.parse(raw.receivedAt) > 0 ? raw.receivedAt : null
  return {
    id: raw.id,
    threadId: raw.threadId,
    from: from ? { name: from.name, address: from.address.toLowerCase() } : null,
    subject: decode(h['subject']),
    date: received ?? headerDate ?? raw.receivedAt,
    sizeEstimate: raw.sizeEstimate,
    unread: raw.unread,
    labelIds: raw.labelIds,
    listId: readListId(h['list-id']),
    unsubscribe: readUnsubscribe(h['list-unsubscribe'], h['list-unsubscribe-post']),
  }
}

// Gmail usually decodes RFC 2047 words in metadata, but not always.
function decode(value: string | undefined): string {
  if (!value) return ''
  return value.includes('=?') ? decodeWords(value) : value
}
