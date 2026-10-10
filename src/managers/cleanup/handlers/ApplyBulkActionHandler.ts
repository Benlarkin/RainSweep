import type { IHandler } from '@/common/resolver/IHandler'
import { failure } from '@/common/ResponseBase'
import type { IMailAccessor } from '@/accessors/mail/IMailAccessor'
import {
  ArchiveMessagesRequest,
  MoveMessagesToInboxRequest,
  RestoreMessagesFromTrashRequest,
  SetMessagesReadRequest,
  TrashMessagesRequest,
} from '@/accessors/mail/MailRequests'
import type { MessagesStateResponse } from '@/accessors/mail/MailResponses'
import type { BulkMessageAction } from '@/types'
import type { ActiveSessionActivity } from '../../shared/ActiveSessionActivity'
import { ApplyBulkActionRequest, BULK_ACTIONS, MAX_BULK_MESSAGES } from '../CleanupRequests'
import { ApplyBulkActionResponse } from '../CleanupResponses'

export class ApplyBulkActionHandler implements IHandler<ApplyBulkActionRequest> {
  constructor(
    private readonly activeSession: ActiveSessionActivity,
    private readonly mailAccessor: IMailAccessor,
  ) {}

  async handle(request: ApplyBulkActionRequest): Promise<ApplyBulkActionResponse> {
    if (!BULK_ACTIONS.includes(request.action)) {
      return new ApplyBulkActionResponse(request.correlationId, 0, failure('invalid_request', 'Unknown action.'))
    }
    if (request.messageIds.length === 0) return new ApplyBulkActionResponse(request.correlationId, 0)
    if (request.messageIds.length > MAX_BULK_MESSAGES) {
      return new ApplyBulkActionResponse(request.correlationId, 0,
        failure('invalid_request', `At most ${MAX_BULK_MESSAGES.toLocaleString('en-US')} messages per action.`))
    }

    const active = await this.activeSession.resolve()
    if (!active.ok) return new ApplyBulkActionResponse(request.correlationId, 0, active.failure)

    const result = await this.dispatch(active.session.credentials.accessToken, request.messageIds, request.action)
    return new ApplyBulkActionResponse(request.correlationId, result.updatedCount, result.error)
  }

  private dispatch(token: string, ids: string[], action: BulkMessageAction): Promise<MessagesStateResponse> {
    switch (action) {
      case 'trash':       return this.mailAccessor.store(new TrashMessagesRequest(token, ids))
      case 'restore':     return this.mailAccessor.store(new RestoreMessagesFromTrashRequest(token, ids))
      case 'archive':     return this.mailAccessor.store(new ArchiveMessagesRequest(token, ids))
      case 'moveToInbox': return this.mailAccessor.store(new MoveMessagesToInboxRequest(token, ids))
      case 'markRead':    return this.mailAccessor.store(new SetMessagesReadRequest(token, ids, true))
      case 'markUnread':  return this.mailAccessor.store(new SetMessagesReadRequest(token, ids, false))
    }
  }
}
