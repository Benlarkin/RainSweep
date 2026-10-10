import type { IHandler } from '@/common/resolver/IHandler'
import type { IMailAccessor } from '@/accessors/mail/IMailAccessor'
import {
  ArchiveThreadRequest,
  MoveThreadToInboxRequest,
  RestoreThreadFromTrashRequest,
  SetThreadReadRequest,
  SetThreadStarredRequest,
  TrashThreadRequest,
} from '@/accessors/mail/MailRequests'
import type { ThreadStateResponse } from '@/accessors/mail/MailResponses'
import type { ActiveSessionActivity } from '../../shared/ActiveSessionActivity'
import { UpdateThreadRequest, type ThreadAction } from '../MailboxRequests'
import { UpdateThreadResponse } from '../MailboxResponses'

export class UpdateThreadHandler implements IHandler<UpdateThreadRequest> {
  constructor(
    private readonly activeSession: ActiveSessionActivity,
    private readonly mailAccessor: IMailAccessor,
  ) {}

  async handle(request: UpdateThreadRequest): Promise<UpdateThreadResponse> {
    const active = await this.activeSession.resolve()
    if (!active.ok) return new UpdateThreadResponse(request.correlationId, request.threadId, active.failure)

    const result = await this.dispatch(active.session.credentials.accessToken, request.threadId, request.action)
    return new UpdateThreadResponse(request.correlationId, request.threadId, result.error)
  }

  private dispatch(token: string, threadId: string, action: ThreadAction): Promise<ThreadStateResponse> {
    switch (action) {
      case 'archive':     return this.mailAccessor.store(new ArchiveThreadRequest(token, threadId))
      case 'moveToInbox': return this.mailAccessor.store(new MoveThreadToInboxRequest(token, threadId))
      case 'trash':       return this.mailAccessor.store(new TrashThreadRequest(token, threadId))
      case 'restore':     return this.mailAccessor.store(new RestoreThreadFromTrashRequest(token, threadId))
      case 'markRead':    return this.mailAccessor.store(new SetThreadReadRequest(token, threadId, true))
      case 'markUnread':  return this.mailAccessor.store(new SetThreadReadRequest(token, threadId, false))
      case 'star':        return this.mailAccessor.store(new SetThreadStarredRequest(token, threadId, true))
      case 'unstar':      return this.mailAccessor.store(new SetThreadStarredRequest(token, threadId, false))
    }
  }
}
