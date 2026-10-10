import { ResponseBase, type Failure } from '@/common/ResponseBase'
import type { MailLabel, RawMailMessage, ThreadPage } from '@/types'

export class LoadLabelsResponse extends ResponseBase {
  constructor(correlationId: string, public readonly labels: MailLabel[], error: Failure | null = null) {
    super(correlationId, error)
  }
}

export class LoadThreadPageResponse extends ResponseBase {
  constructor(correlationId: string, public readonly page: ThreadPage | null, error: Failure | null = null) {
    super(correlationId, error)
  }
}

export interface RawThread {
  id: string
  labelIds: string[]
  messages: RawMailMessage[]
}

export class LoadThreadResponse extends ResponseBase {
  constructor(correlationId: string, public readonly thread: RawThread | null, error: Failure | null = null) {
    super(correlationId, error)
  }
}

export class LoadRawMessageResponse extends ResponseBase {
  constructor(correlationId: string, public readonly message: RawMailMessage | null, error: Failure | null = null) {
    super(correlationId, error)
  }
}

export class SendMessageResponse extends ResponseBase {
  constructor(
    correlationId: string,
    public readonly messageId: string | null,
    public readonly threadId: string | null,
    error: Failure | null = null,
  ) {
    super(correlationId, error)
  }
}

export class ThreadStateResponse extends ResponseBase {
  constructor(correlationId: string, public readonly threadId: string, error: Failure | null = null) {
    super(correlationId, error)
  }
}
