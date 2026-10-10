import type { IHandler } from '@/common/resolver/IHandler'
import type { IMailAccessor } from '@/accessors/mail/IMailAccessor'
import { LoadLabelsRequest } from '@/accessors/mail/MailRequests'
import type { ActiveSessionActivity } from '../../shared/ActiveSessionActivity'
import { GetLabelsRequest } from '../MailboxRequests'
import { GetLabelsResponse } from '../MailboxResponses'

export class GetLabelsHandler implements IHandler<GetLabelsRequest> {
  constructor(
    private readonly activeSession: ActiveSessionActivity,
    private readonly mailAccessor: IMailAccessor,
  ) {}

  async handle(request: GetLabelsRequest): Promise<GetLabelsResponse> {
    const active = await this.activeSession.resolve()
    if (!active.ok) return new GetLabelsResponse(request.correlationId, [], active.failure)

    const loaded = await this.mailAccessor.load(new LoadLabelsRequest(active.session.credentials.accessToken))
    return new GetLabelsResponse(request.correlationId, loaded.labels, loaded.error)
  }
}
