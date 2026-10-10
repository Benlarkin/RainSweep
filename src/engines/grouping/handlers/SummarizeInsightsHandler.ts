import type { IHandler } from '@/common/resolver/IHandler'
import { SummarizeInsightsRequest } from '../GroupingEngineRequests'
import { SummarizeInsightsResponse } from '../GroupingEngineResponses'

const TOP = 10

export class SummarizeInsightsHandler implements IHandler<SummarizeInsightsRequest> {
  async handle(request: SummarizeInsightsRequest): Promise<SummarizeInsightsResponse> {
    const { messages, senderGroups } = request
    const subscriptions = senderGroups.filter(g => g.unsubscribe !== null)

    return new SummarizeInsightsResponse(request.correlationId, {
      messageCount: messages.length,
      unreadCount: messages.filter(m => m.unread).length,
      totalBytes: messages.reduce((sum, m) => sum + m.sizeEstimate, 0),
      subscriptionCount: new Set(messages.filter(m => m.unsubscribe && m.from).map(m => m.from?.address)).size,
      topSenders: senderGroups.slice(0, TOP),
      // Mail you subscribed to but have never opened is the safest thing to leave.
      unopenedSubscriptions: subscriptions
        .filter(g => g.unreadCount === g.messageCount)
        .sort((a, b) => b.messageCount - a.messageCount)
        .slice(0, TOP),
      largestSenders: [...senderGroups].sort((a, b) => b.totalBytes - a.totalBytes).slice(0, TOP),
      oldestMessages: [...messages].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5),
    })
  }
}
