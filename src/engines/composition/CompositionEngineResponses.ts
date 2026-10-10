import { ResponseBase, type Failure } from '@/common/ResponseBase'
import type { ComposeDraft, OutgoingMessage } from '@/types'

export class PrepareDraftResponse extends ResponseBase {
  constructor(correlationId: string, public readonly draft: ComposeDraft | null, error: Failure | null = null) {
    super(correlationId, error)
  }
}

export class BuildOutgoingMessageResponse extends ResponseBase {
  constructor(
    correlationId: string,
    public readonly message: OutgoingMessage | null,
    /** RFC 5322 serialization of `message`, ready for the provider. */
    public readonly raw: string | null,
    error: Failure | null = null,
  ) {
    super(correlationId, error)
  }
}
