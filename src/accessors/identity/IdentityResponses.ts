import { ResponseBase, type Failure } from '@/common/ResponseBase'
import type { Credentials, Session } from '@/types'

export class BuildAuthorizationUrlResponse extends ResponseBase {
  constructor(correlationId: string, public readonly url: string | null, error: Failure | null = null) {
    super(correlationId, error)
  }
}

export class ExchangeAuthorizationCodeResponse extends ResponseBase {
  constructor(correlationId: string, public readonly session: Session | null, error: Failure | null = null) {
    super(correlationId, error)
  }
}

export class RefreshCredentialsResponse extends ResponseBase {
  constructor(correlationId: string, public readonly credentials: Credentials | null, error: Failure | null = null) {
    super(correlationId, error)
  }
}

export class RevokeCredentialsResponse extends ResponseBase {
  constructor(correlationId: string, error: Failure | null = null) {
    super(correlationId, error)
  }
}
