import { ResponseBase, type Failure } from '@/common/ResponseBase'
import type { AttachmentContent, MailMessage, MessageMetadata } from '@/types'

export class ParseMessageResponse extends ResponseBase {
  constructor(correlationId: string, public readonly message: MailMessage | null, error: Failure | null = null) {
    super(correlationId, error)
  }
}

export class ExtractAttachmentResponse extends ResponseBase {
  constructor(correlationId: string, public readonly attachment: AttachmentContent | null, error: Failure | null = null) {
    super(correlationId, error)
  }
}

export class ParseMetadataResponse extends ResponseBase {
  constructor(correlationId: string, public readonly messages: MessageMetadata[]) {
    super(correlationId, null)
  }
}
