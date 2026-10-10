import type { IHandler } from '@/common/resolver/IHandler'
import type { IGroupingEngine } from '@/engines/grouping/IGroupingEngine'
import { GroupMessagesRequest, SummarizeInsightsRequest } from '@/engines/grouping/GroupingEngineRequests'
import type { ActiveSessionActivity } from '../../shared/ActiveSessionActivity'
import { AnalyzeMailboxRequest } from '../CleanupRequests'
import { AnalyzeMailboxResponse } from '../CleanupResponses'

export class AnalyzeMailboxHandler implements IHandler<AnalyzeMailboxRequest> {
  constructor(
    private readonly activeSession: ActiveSessionActivity,
    private readonly groupingEngine: IGroupingEngine,
  ) {}

  async handle(request: AnalyzeMailboxRequest): Promise<AnalyzeMailboxResponse> {
    // Pure computation, but still only for signed-in users.
    const active = await this.activeSession.resolve()
    if (!active.ok) return new AnalyzeMailboxResponse(request.correlationId, null, active.failure)

    const grouped = await this.groupingEngine.evaluate(new GroupMessagesRequest(request.messages, request.filter))
    const summary = await this.groupingEngine.evaluate(new SummarizeInsightsRequest(grouped.messages, grouped.groups.sender))

    return new AnalyzeMailboxResponse(request.correlationId, {
      filter: request.filter,
      groups: grouped.groups,
      insights: summary.insights,
    })
  }
}
