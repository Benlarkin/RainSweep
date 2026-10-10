import { ResponseBase } from '@/common/ResponseBase'
import type { GroupingKind, InboxInsights, MailGroup, MessageMetadata } from '@/types'

export class GroupMessagesResponse extends ResponseBase {
  constructor(
    correlationId: string,
    /** The messages that passed the filter, newest first. */
    public readonly messages: MessageMetadata[],
    public readonly groups: Record<GroupingKind, MailGroup[]>,
  ) {
    super(correlationId, null)
  }
}

export class SummarizeInsightsResponse extends ResponseBase {
  constructor(correlationId: string, public readonly insights: InboxInsights) {
    super(correlationId, null)
  }
}
