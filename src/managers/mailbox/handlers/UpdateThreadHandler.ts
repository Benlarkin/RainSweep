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

    const result = await dispatchThreadAction(this.mailAccessor, active.session.credentials.accessToken, request.threadId, request.action)
    return new UpdateThreadResponse(request.correlationId, request.threadId, result.error)
  }
}

/** Maps a conversation action to the accessor's business verb. Shared with UpdateThreadsHandler. */
export function dispatchThreadAction(mailAccessor: IMailAccessor, token: string, threadId: string, action: ThreadAction): Promise<ThreadStateResponse> {
  switch (action) {
    case 'archive':     return mailAccessor.store(new ArchiveThreadRequest(token, threadId))
    case 'moveToInbox': return mailAccessor.store(new MoveThreadToInboxRequest(token, threadId))
    case 'trash':       return mailAccessor.store(new TrashThreadRequest(token, threadId))
    case 'restore':     return mailAccessor.store(new RestoreThreadFromTrashRequest(token, threadId))
    case 'markRead':    return mailAccessor.store(new SetThreadReadRequest(token, threadId, true))
    case 'markUnread':  return mailAccessor.store(new SetThreadReadRequest(token, threadId, false))
    case 'star':        return mailAccessor.store(new SetThreadStarredRequest(token, threadId, true))
    case 'unstar':      return mailAccessor.store(new SetThreadStarredRequest(token, threadId, false))
  }
}
