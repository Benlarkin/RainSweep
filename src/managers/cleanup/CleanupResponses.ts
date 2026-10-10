import { ResponseBase, type Failure } from '@/common/ResponseBase'
import type { MailboxAnalysis, MessageMetadata, UnsubscribeResult } from '@/types'

export class ScanMailboxResponse extends ResponseBase {
  constructor(
    correlationId: string,
    public readonly messages: MessageMetadata[],
    public readonly nextPageToken: string | null,
    public readonly resultSizeEstimate: number,
    error: Failure | null = null,
  ) {
    super(correlationId, error)
  }
}

export class AnalyzeMailboxResponse extends ResponseBase {
  constructor(correlationId: string, public readonly analysis: MailboxAnalysis | null, error: Failure | null = null) {
    super(correlationId, error)
  }
}

export class ApplyBulkActionResponse extends ResponseBase {
  constructor(correlationId: string, public readonly updatedCount: number, error: Failure | null = null) {
    super(correlationId, error)
  }
}

export class UnsubscribeResponse extends ResponseBase {
  constructor(correlationId: string, public readonly result: UnsubscribeResult | null, error: Failure | null = null) {
    super(correlationId, error)
  }
}
