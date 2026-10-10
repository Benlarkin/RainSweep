import type { IHandler } from '@/common/resolver/IHandler'
import { failure } from '@/common/ResponseBase'
import type { IMailAccessor } from '@/accessors/mail/IMailAccessor'
import { ConcurrencyUtility } from '@/utilities/ConcurrencyUtility'
import type { ActiveSessionActivity } from '../../shared/ActiveSessionActivity'
import { MAX_BULK_THREADS, UpdateThreadsRequest } from '../MailboxRequests'
import { UpdateThreadsResponse } from '../MailboxResponses'
import { dispatchThreadAction } from './UpdateThreadHandler'

export class UpdateThreadsHandler implements IHandler<UpdateThreadsRequest> {
  constructor(
    private readonly activeSession: ActiveSessionActivity,
    private readonly mailAccessor: IMailAccessor,
  ) {}

  async handle(request: UpdateThreadsRequest): Promise<UpdateThreadsResponse> {
    const ids = [...new Set(request.threadIds)]
    if (ids.length > MAX_BULK_THREADS) {
      return new UpdateThreadsResponse(request.correlationId, [], ids, failure('invalid_request', `Select at most ${MAX_BULK_THREADS} conversations.`))
    }
    const active = await this.activeSession.resolve()
    if (!active.ok) return new UpdateThreadsResponse(request.correlationId, [], ids, active.failure)
    const token = active.session.credentials.accessToken

    const results = await ConcurrencyUtility.mapWithLimit(ids, 5, id => dispatchThreadAction(this.mailAccessor, token, id, request.action))
    const updated = ids.filter((_, i) => results[i].success)
    const failed = ids.filter((_, i) => !results[i].success)
    const firstError = results.find(r => !r.success)?.error ?? null

    // Partial success is still success; the response lists what didn't change.
    return new UpdateThreadsResponse(request.correlationId, updated, failed, updated.length === 0 ? firstError : null)
  }
}
