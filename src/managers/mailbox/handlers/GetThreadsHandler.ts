import type { IHandler } from '@/common/resolver/IHandler'
import type { IMailAccessor } from '@/accessors/mail/IMailAccessor'
import { LoadThreadPageRequest } from '@/accessors/mail/MailRequests'
import type { ActiveSessionActivity } from '../../shared/ActiveSessionActivity'
import { GetThreadsRequest } from '../MailboxRequests'
import { GetThreadsResponse } from '../MailboxResponses'

export class GetThreadsHandler implements IHandler<GetThreadsRequest> {
  constructor(
    private readonly activeSession: ActiveSessionActivity,
    private readonly mailAccessor: IMailAccessor,
  ) {}

  async handle(request: GetThreadsRequest): Promise<GetThreadsResponse> {
    const active = await this.activeSession.resolve()
    if (!active.ok) return new GetThreadsResponse(request.correlationId, null, active.failure)

    // Searching looks across all mail unless the user narrowed to a label.
    const loaded = await this.mailAccessor.load(new LoadThreadPageRequest(active.session.credentials.accessToken, {
      labelId: request.labelId,
      search: request.search,
      pageToken: request.pageToken,
      pageSize: request.pageSize,
    }))
    return new GetThreadsResponse(request.correlationId, loaded.page, loaded.error)
  }
}
