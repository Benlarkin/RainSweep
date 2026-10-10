import { ResponseBase, type Failure } from '@/common/ResponseBase'
import type { ComposeDraft } from '@/types'

export class GetComposeDraftResponse extends ResponseBase {
  constructor(correlationId: string, public readonly draft: ComposeDraft | null, error: Failure | null = null) {
    super(correlationId, error)
  }
}

export class SendMailResponse extends ResponseBase {
  constructor(
    correlationId: string,
    public readonly messageId: string | null,
    public readonly threadId: string | null,
    error: Failure | null = null,
  ) {
    super(correlationId, error)
  }
}
