import type { IHandler } from '@/common/resolver/IHandler'
import type { GmailClient } from '../gmail/GmailClient'
import {
  ArchiveMessagesRequest,
  MoveMessagesToInboxRequest,
  RestoreMessagesFromTrashRequest,
  SetMessagesReadRequest,
  TrashMessagesRequest,
} from '../MailRequests'
import { MessagesStateResponse } from '../MailResponses'

/** messages.batchModify accepts at most 1,000 ids per call. */
const BATCH_LIMIT = 1000

/**
 * Applies a label change to any number of messages. Trash is the TRASH
 * label rather than batchDelete, which would erase mail permanently and
 * needs the broader https://mail.google.com/ scope.
 */
async function batchModify(
  gmail: GmailClient, correlationId: string, accessToken: string, ids: string[], add: string[], remove: string[],
): Promise<MessagesStateResponse> {
  const unique = [...new Set(ids)]
  let updated = 0
  for (let i = 0; i < unique.length; i += BATCH_LIMIT) {
    const chunk = unique.slice(i, i + BATCH_LIMIT)
    const result = await gmail.post(accessToken, '/messages/batchModify', { ids: chunk, addLabelIds: add, removeLabelIds: remove })
    if (!result.ok) return new MessagesStateResponse(correlationId, updated, result.failure)
    updated += chunk.length
  }
  return new MessagesStateResponse(correlationId, updated)
}

export class TrashMessagesHandler implements IHandler<TrashMessagesRequest> {
  constructor(private readonly gmail: GmailClient) {}
  handle(r: TrashMessagesRequest): Promise<MessagesStateResponse> {
    return batchModify(this.gmail, r.correlationId, r.accessToken, r.messageIds, ['TRASH'], [])
  }
}

export class RestoreMessagesFromTrashHandler implements IHandler<RestoreMessagesFromTrashRequest> {
  constructor(private readonly gmail: GmailClient) {}
  handle(r: RestoreMessagesFromTrashRequest): Promise<MessagesStateResponse> {
    return batchModify(this.gmail, r.correlationId, r.accessToken, r.messageIds, [], ['TRASH'])
  }
}

export class ArchiveMessagesHandler implements IHandler<ArchiveMessagesRequest> {
  constructor(private readonly gmail: GmailClient) {}
  handle(r: ArchiveMessagesRequest): Promise<MessagesStateResponse> {
    return batchModify(this.gmail, r.correlationId, r.accessToken, r.messageIds, [], ['INBOX'])
  }
}

export class MoveMessagesToInboxHandler implements IHandler<MoveMessagesToInboxRequest> {
  constructor(private readonly gmail: GmailClient) {}
  handle(r: MoveMessagesToInboxRequest): Promise<MessagesStateResponse> {
    return batchModify(this.gmail, r.correlationId, r.accessToken, r.messageIds, ['INBOX'], [])
  }
}

export class SetMessagesReadHandler implements IHandler<SetMessagesReadRequest> {
  constructor(private readonly gmail: GmailClient) {}
  handle(r: SetMessagesReadRequest): Promise<MessagesStateResponse> {
    const [add, remove] = r.read ? [[], ['UNREAD']] : [['UNREAD'], []]
    return batchModify(this.gmail, r.correlationId, r.accessToken, r.messageIds, add, remove)
  }
}
