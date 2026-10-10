import { ResponseBase, type Failure } from '@/common/ResponseBase'
import type { AttachmentContent, MailLabel, MailThread, ThreadPage } from '@/types'

export class GetLabelsResponse extends ResponseBase {
  constructor(correlationId: string, public readonly labels: MailLabel[], error: Failure | null = null) {
    super(correlationId, error)
  }
}

export class GetThreadsResponse extends ResponseBase {
  constructor(correlationId: string, public readonly page: ThreadPage | null, error: Failure | null = null) {
    super(correlationId, error)
  }
}

export class GetThreadResponse extends ResponseBase {
  constructor(correlationId: string, public readonly thread: MailThread | null, error: Failure | null = null) {
    super(correlationId, error)
  }
}

export class GetAttachmentResponse extends ResponseBase {
  constructor(correlationId: string, public readonly attachment: AttachmentContent | null, error: Failure | null = null) {
    super(correlationId, error)
  }
}

export class UpdateThreadResponse extends ResponseBase {
  constructor(correlationId: string, public readonly threadId: string, error: Failure | null = null) {
    super(correlationId, error)
  }
}
