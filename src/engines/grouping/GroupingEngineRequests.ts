import { RequestBase } from '@/common/RequestBase'
import type { CleanupFilter, MailGroup, MessageMetadata } from '@/types'
import type { GroupMessagesResponse, SummarizeInsightsResponse } from './GroupingEngineResponses'

/** Filters, then groups the same messages every way at once: sender, list, subject, size and age. */
export class GroupMessagesRequest extends RequestBase<GroupMessagesResponse> {
  constructor(
    public readonly messages: MessageMetadata[],
    public readonly filter: CleanupFilter,
    public readonly now: Date = new Date(),
  ) { super() }
}

export class SummarizeInsightsRequest extends RequestBase<SummarizeInsightsResponse> {
  constructor(
    public readonly messages: MessageMetadata[],
    public readonly senderGroups: MailGroup[],
  ) { super() }
}
